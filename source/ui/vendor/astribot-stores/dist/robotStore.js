/**
 * Robot Store
 * 管理与 Supervisor 的连接（HTTP），提供 SDK 客户端单例。
 * 通过 SSE 订阅 Meta 状态推送。
 */
import { create } from 'zustand';
import { RobotHttpClient } from './http-client';
// ============================================================================
// 默认 URL
// ============================================================================
const SUPERVISOR_URL_STORAGE_KEY = 'astribot.supervisor_url';
const LOCAL_AUTH_TAB_TOKEN_KEY = 'astribot.local_auth.tab_token.v1';
const LOCAL_AUTH_SESSION_KEY = 'astribot.local_auth.session_logged_in.v1';
function maskToken(token) {
    if (!token)
        return '-';
    return token.slice(0, 8);
}
function isDevServerOrigin(url) {
    try {
        const u = new URL(url);
        const host = u.hostname;
        const port = u.port;
        return ((host === 'localhost' || host === '127.0.0.1') &&
            (port === '5173' || port === '5174' || port === '4173' || port === '4174'));
    }
    catch {
        return false;
    }
}
function sanitizeSupervisorUrl(url) {
    if (!url)
        return null;
    return isDevServerOrigin(url) ? null : url;
}
function readStoredSupervisorUrl() {
    if (typeof window === 'undefined')
        return null;
    try {
        // 暂时不读取 localStorage，强制使用代理配置
        // return sanitizeSupervisorUrl(localStorage.getItem(SUPERVISOR_URL_STORAGE_KEY));
        return null;
    }
    catch {
        return null;
    }
}
function readEnvSupervisorUrl() {
    try {
        const env = import.meta.env;
        return sanitizeSupervisorUrl(env?.VITE_SUPERVISOR_URL || null);
    }
    catch {
        return null;
    }
}
function is_dev_environment() {
    if (typeof window === 'undefined')
        return false;
    try {
        const host = window.location.hostname;
        return host === 'localhost' || host === '127.0.0.1';
    }
    catch {
        return false;
    }
}
function defaultSupervisorUrl() {
    const envUrl = readEnvSupervisorUrl();
    if (envUrl)
        return envUrl;
    const stored = readStoredSupervisorUrl();
    if (stored)
        return stored;
    // 开发环境（localhost）使用空字符串，请求走 Vite 代理
    // 生产环境（nginx）使用当前页面的 origin，因为 nginx 和 supervisor 在同一台机器
    if (is_dev_environment()) {
        return '';
    }
    return typeof window !== 'undefined' ? window.location.origin : '';
}
// ============================================================================
// Store
// ============================================================================
const initialUrl = defaultSupervisorUrl();
// 调试：打印实际使用的 URL
console.log('[RobotStore] initialUrl:', initialUrl);
console.log('[RobotStore] full initialUrl type:', typeof initialUrl);
// 强制清除可能存储的旧 URL
if (typeof window !== 'undefined') {
    try {
        localStorage.removeItem(SUPERVISOR_URL_STORAGE_KEY);
    }
    catch {
        // 忽略错误
    }
}
export const useRobotStore = create()((set) => ({
    supervisorUrl: initialUrl,
    httpClient: new RobotHttpClient(initialUrl),
    metaStatuses: [],
    sseConnected: false,
    setSupervisorUrl(url) {
        try {
            if (typeof window !== 'undefined') {
                localStorage.setItem(SUPERVISOR_URL_STORAGE_KEY, url);
            }
        }
        catch {
            // ignore localStorage errors
        }
        set({
            supervisorUrl: url,
            httpClient: new RobotHttpClient(url),
        });
        // 重连 SSE
        disconnectSSE();
        connectSSE();
    },
}));
// ============================================================================
// 便捷访问器
// ============================================================================
/** 获取 HTTP 客户端单例（不触发 React 重渲染） */
export function getRobotHttpClient() {
    return useRobotStore.getState().httpClient;
}
// ============================================================================
// SSE 状态订阅
// ============================================================================
/** Shared SSE connection — other stores can add listeners via onSSEEvent() */
let eventSource = null;
let reconnectTimer = null;
let wantJoints = false;
const sseListeners = new Map();
function isPlainObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function areMetaStatusesEqual(a, b) {
    if (a.length !== b.length)
        return false;
    for (let i = 0; i < a.length; i += 1) {
        const left = a[i];
        const right = b[i];
        if (left === right)
            continue;
        if (!isPlainObject(left) || !isPlainObject(right))
            return false;
        const leftKeys = Object.keys(left);
        const rightKeys = Object.keys(right);
        if (leftKeys.length !== rightKeys.length)
            return false;
        for (const key of leftKeys) {
            if (!(key in right))
                return false;
            if (left[key] !== right[key]) {
                return false;
            }
        }
    }
    return true;
}
function mergeMetaStatusesWithPrevious(previous, incoming) {
    const prevByName = new Map();
    for (const item of previous) {
        if (!isPlainObject(item))
            continue;
        const name = item.name;
        if (typeof name === 'string' && name)
            prevByName.set(name, item);
    }
    const merged = [];
    const seen = new Set();
    for (const item of incoming) {
        if (!isPlainObject(item))
            continue;
        const name = item.name;
        if (typeof name !== 'string' || !name)
            continue;
        merged.push(item);
        seen.add(name);
    }
    for (const [name, prev] of prevByName.entries()) {
        if (!seen.has(name))
            merged.push(prev);
    }
    return merged;
}
function buildSSEUrl() {
    const base_url = useRobotStore.getState().supervisorUrl;
    const query = new URLSearchParams();
    if (wantJoints)
        query.set('joints', '1');
    let token = '';
    if (typeof window !== 'undefined') {
        token = sessionStorage.getItem(LOCAL_AUTH_TAB_TOKEN_KEY) || '';
        if (token)
            query.set('tab_token', token);
    }
    const path = query.toString() ? `/api/stream?${query.toString()}` : '/api/stream';
    console.info('[RobotStore] buildSSEUrl:', {
        wantJoints,
        hasTabToken: Boolean(token),
        tabToken: maskToken(token),
        path,
    });
    return base_url ? `${base_url}${path}` : path;
}
function connectSSE() {
    if (typeof window === 'undefined')
        return;
    const tabToken = sessionStorage.getItem(LOCAL_AUTH_TAB_TOKEN_KEY) || '';
    const sessionLoggedIn = sessionStorage.getItem(LOCAL_AUTH_SESSION_KEY) === '1';
    if (!tabToken) {
        console.info('[RobotStore] skip connectSSE: tab_token missing', { sessionLoggedIn });
        useRobotStore.setState({ sseConnected: false });
        return;
    }
    // Close existing connection before reconnecting
    if (eventSource) {
        eventSource.close();
        eventSource = null;
    }
    try {
        const sseUrl = buildSSEUrl();
        console.info('[RobotStore] connectSSE opening:', sseUrl);
        eventSource = new EventSource(sseUrl);
        eventSource.addEventListener('status', (event) => {
            try {
                const parsed = JSON.parse(event.data);
                if (parsed === null)
                    return;
                const statuses = Array.isArray(parsed) ? parsed : [];
                const prevStatuses = useRobotStore.getState().metaStatuses;
                const mergedStatuses = mergeMetaStatusesWithPrevious(prevStatuses, statuses);
                const statusChanged = !areMetaStatusesEqual(prevStatuses, mergedStatuses);
                if (statusChanged) {
                    useRobotStore.setState({ metaStatuses: mergedStatuses, sseConnected: true });
                }
                else if (!useRobotStore.getState().sseConnected) {
                    useRobotStore.setState({ sseConnected: true });
                }
            }
            catch {
                // ignore parse errors
            }
        });
        eventSource.onopen = () => {
            useRobotStore.setState({ sseConnected: true });
        };
        for (const [eventName, listeners] of sseListeners.entries()) {
            for (const listener of listeners) {
                eventSource.addEventListener(eventName, listener);
            }
        }
        eventSource.onerror = () => {
            console.info('[RobotStore] SSE error, scheduling reconnect in 5s');
            useRobotStore.setState({ sseConnected: false });
            eventSource?.close();
            eventSource = null;
            if (!reconnectTimer) {
                reconnectTimer = setTimeout(() => {
                    reconnectTimer = null;
                    connectSSE();
                }, 5000);
            }
        };
    }
    catch {
        // EventSource construction failed
    }
}
function disconnectSSE() {
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
    if (eventSource) {
        eventSource.close();
        eventSource = null;
    }
    // Preserve last known statuses during transient SSE disconnect/reconnect
    // to avoid UI flicker caused by brief empty-state windows.
    useRobotStore.setState({ sseConnected: false });
}
/** Enable/disable joint streaming. Reconnects SSE with updated query param. */
export function enableJointStream(enable) {
    if (wantJoints === enable)
        return;
    wantJoints = enable;
    connectSSE();
}
/** Get the shared EventSource for adding listeners from other stores */
export function getSSE() {
    return eventSource;
}
/** Register a listener on the shared SSE. Retries if SSE not yet connected. */
export function onSSEEvent(event, handler) {
    const listener = ((e) => handler(e.data));
    let listeners = sseListeners.get(event);
    if (!listeners) {
        listeners = new Set();
        sseListeners.set(event, listeners);
    }
    listeners.add(listener);
    if (eventSource)
        eventSource.addEventListener(event, listener);
    return () => {
        eventSource?.removeEventListener(event, listener);
        const listenersForEvent = sseListeners.get(event);
        if (!listenersForEvent)
            return;
        listenersForEvent.delete(listener);
        if (listenersForEvent.size === 0) {
            sseListeners.delete(event);
        }
    };
}
// 启动 SSE 连接
connectSSE();
// Reconnect SSE when local-auth tab token changes (login/logout/displaced).
if (typeof window !== 'undefined') {
    window.addEventListener('local-auth-changed', () => {
        console.info('[RobotStore] local-auth-changed received, reconnect SSE');
        connectSSE();
    });
}
// ============================================================================
// Meta 状态选择器
// ============================================================================
/** 获取指定 Meta 的状态 */
export function useMetaStatus(metaName) {
    return useRobotStore((state) => (Array.isArray(state.metaStatuses) ? state.metaStatuses : []).find((m) => m.name === metaName));
}
/** 判断指定 Meta 是否处于 active 状态 */
export function useIsMetaActive(metaName) {
    return useRobotStore((state) => (Array.isArray(state.metaStatuses) ? state.metaStatuses : []).some((m) => m.name === metaName && m.state === 'active'));
}
//# sourceMappingURL=robotStore.js.map