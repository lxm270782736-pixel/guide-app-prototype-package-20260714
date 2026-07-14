/**
 * App Store
 * Manages application registry, active app state, and per-app SSE connections.
 */
import { create } from 'zustand';
import { useRobotStore } from './robotStore';
import { parseAppModeBlocked, getModeChinese } from './modeStore';
function normalizeAppManifest(app) {
    return {
        ...app,
        requiredMetas: Array.isArray(app.requiredMetas) ? app.requiredMetas : [],
    };
}
// ============================================================================
// Dev fallback
// ============================================================================
const DEV_APPS = [
    {
        id: 'com.astribot.app.teleoperation',
        name: '遥操作',
        description: 'Teleoperation app with camera streaming, VR control, and data collection',
        icon: 'gamepad',
        port: 12400,
        requiredMetas: ['camera', 'vr_driver', 'remote_control'],
        uiType: 'tsx',
    },
    {
        id: 'com.astribot.app.audio-demo',
        name: '录放音演示',
        description: '使用麦克风录音并用扬声器播放',
        icon: 'mic',
        port: 12300,
        requiredMetas: ['microphone', 'speaker'],
        uiType: 'tsx',
    },
];
// ============================================================================
// SSE connections (module-level, outside React)
// ============================================================================
const appEventSources = {};
// ============================================================================
// Store
// ============================================================================
export const useAppStore = create()((set, get) => ({
    apps: [],
    activeAppId: null,
    appStates: {},
    runningAppIds: [],
    launchedPorts: {},
    isLoading: false,
    isLaunching: false,
    error: null,
    async fetchApps() {
        set({ isLoading: true, error: null });
        try {
            const { supervisorUrl } = useRobotStore.getState();
            const res = await fetch(`${supervisorUrl}/api/apps`);
            if (!res.ok)
                throw new Error(`HTTP ${res.status}`);
            const apps = (await res.json()).map(normalizeAppManifest);
            set({ apps, isLoading: false });
        }
        catch {
            // Fallback to dev apps
            set({ apps: DEV_APPS, isLoading: false });
        }
    },
    async launchApp(appId) {
        set({ isLaunching: true, error: null });
        try {
            const { supervisorUrl } = useRobotStore.getState();
            const res = await fetch(`${supervisorUrl}/api/app/launch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ app_id: appId }),
            });
            if (!res.ok) {
                const text = await res.text().catch(() => '');
                const blocked = parseAppModeBlocked(text);
                if (blocked) {
                    const msg = `${getModeChinese(blocked.mode)}模式下不允许启动 App，请先切换到允许应用运行的模式`;
                    set({ isLaunching: false, error: msg });
                    throw new Error(msg);
                }
                throw new Error(`Launch failed (${res.status}): ${text}`);
            }
            let launchPort;
            let launchedAppId;
            try {
                const payload = (await res.json());
                if (typeof payload.port === 'number' && Number.isFinite(payload.port)) {
                    launchPort = payload.port;
                }
                if (typeof payload.app_id === 'string' && payload.app_id.length > 0) {
                    launchedAppId = payload.app_id;
                }
                else if (typeof payload.id === 'string' && payload.id.length > 0) {
                    launchedAppId = payload.id;
                }
            }
            catch {
                // ignore parse error: launch response body is optional for store state
            }
            // Add to running list
            set((state) => ({
                launchedPorts: typeof launchPort === 'number'
                    ? {
                        ...state.launchedPorts,
                        ...(launchedAppId ? { [launchedAppId]: launchPort } : {}),
                        [appId]: launchPort,
                    }
                    : state.launchedPorts,
                apps: state.apps.map((app) => {
                    if (app.id !== appId)
                        return app;
                    // Prefer manifest/config port; only fallback to launch-time assigned port.
                    if (typeof app.port === 'number' && Number.isFinite(app.port))
                        return app;
                    if (typeof launchPort !== 'number')
                        return app;
                    return { ...app, port: launchPort };
                }),
                isLaunching: false,
                runningAppIds: state.runningAppIds.includes(appId)
                    ? state.runningAppIds
                    : [...state.runningAppIds, appId],
            }));
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to launch app';
            set({ isLaunching: false, error: msg });
            throw err;
        }
    },
    async stopApp(appId) {
        try {
            const { supervisorUrl } = useRobotStore.getState();
            const res = await fetch(`${supervisorUrl}/api/app/stop`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ app_id: appId }),
            });
            if (!res.ok) {
                const text = await res.text().catch(() => '');
                throw new Error(`Stop failed (${res.status}): ${text}`);
            }
            set((state) => ({
                runningAppIds: state.runningAppIds.filter((id) => id !== appId),
            }));
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to stop app';
            set({ error: msg });
        }
    },
    async fetchRunningApps() {
        try {
            const { supervisorUrl } = useRobotStore.getState();
            const res = await fetch(`${supervisorUrl}/api/app/running`);
            if (!res.ok)
                throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const ids = Array.isArray(data)
                ? data.map((a) => a.app_id ?? a.id ?? '')
                    .filter(Boolean)
                : [];
            set({ runningAppIds: ids });
        }
        catch {
            // ignore — running list is best-effort
        }
    },
    openApp(appId) {
        set({ activeAppId: appId });
    },
    closeApp() {
        const { activeAppId } = get();
        if (activeAppId) {
            get().disconnectAppSSE(activeAppId);
        }
        set({ activeAppId: null });
    },
    getAppBaseUrl(appId) {
        const app = get().apps.find((a) => a.id === appId);
        if (!app)
            return null;
        const launchPort = get().launchedPorts[appId];
        const port = typeof app.port === 'number' && Number.isFinite(app.port)
            ? app.port
            : launchPort;
        if (typeof port !== 'number' || !Number.isFinite(port))
            return null;
        let origin = typeof window !== 'undefined' ? window.location.origin : '';
        // Electron prod uses app:// protocol — use robot URL
        if (!origin.startsWith('http')) {
            origin = 'https://192.168.0.10';
        }
        return `${origin}/app/${port}`;
    },
    connectAppSSE(appId) {
        // Close existing connection for this app
        if (appEventSources[appId]) {
            appEventSources[appId].close();
            delete appEventSources[appId];
        }
        const baseUrl = get().getAppBaseUrl(appId);
        if (!baseUrl)
            return;
        const es = new EventSource(`${baseUrl}/api/state`);
        es.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                set((state) => ({
                    appStates: { ...state.appStates, [appId]: data },
                }));
            }
            catch {
                // ignore parse errors
            }
        };
        es.onerror = () => {
            // SSE will auto-reconnect per spec
        };
        appEventSources[appId] = es;
    },
    disconnectAppSSE(appId) {
        if (appEventSources[appId]) {
            appEventSources[appId].close();
            delete appEventSources[appId];
        }
        set((state) => {
            const next = { ...state.appStates };
            delete next[appId];
            return { appStates: next };
        });
    },
    async callAppApi(appId, method, path, body) {
        const baseUrl = get().getAppBaseUrl(appId);
        if (!baseUrl)
            throw new Error(`App ${appId} not found`);
        const res = await fetch(`${baseUrl}${path}`, {
            method,
            headers: body ? { 'Content-Type': 'application/json' } : undefined,
            body: body ? JSON.stringify(body) : undefined,
        });
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(`App API error ${res.status}: ${text}`);
        }
        return res.json();
    },
}));
//# sourceMappingURL=appStore.js.map