/**
 * Network store using Zustand
 * 通过 Supervisor HTTP API 管理 WiFi 配置、网络状态和连接状态
 */
import { create } from 'zustand';
import { getSignalLevel } from './types/network';
import { getRobotHttpClient, onSSEEvent } from './robotStore';
// ============================================================================
// Transform functions (Meta snake_case -> client camelCase)
// ============================================================================
function transformNetworkStatus(data) {
    return {
        mode: data.mode,
        ssid: data.ssid || null,
        signalStrength: data.signal_strength,
        ipAddress: data.ip_address || null,
        macAddress: data.mac_address || '',
        apSsid: data.ap_ssid || '',
        isOnline: data.is_online,
    };
}
// ============================================================================
// Initial state
// ============================================================================
const initialState = {
    status: null,
    isLoading: false,
    error: null,
    availableNetworks: [],
    isScanning: false,
    lastScanTime: null,
    isConnecting: false,
    connectionError: null,
};
// ============================================================================
// SSE 订阅（via shared EventSource from robotStore）
// ============================================================================
let unsubSSE = null;
function connectNetworkSSE() {
    if (unsubSSE)
        return;
    unsubSSE = onSSEEvent('network', (data) => {
        try {
            const parsed = JSON.parse(data);
            const status = transformNetworkStatus(parsed);
            useNetworkStore.setState({ status, isLoading: false, error: null });
        }
        catch { /* ignore */ }
    });
}
function disconnectNetworkSSE() {
    if (unsubSSE) {
        unsubSSE();
        unsubSSE = null;
    }
}
// ============================================================================
// Store
// ============================================================================
/**
 * Network store - 通过 Supervisor HTTP API 与 network meta 通信
 */
export const useNetworkStore = create()((set, get) => ({
    ...initialState,
    /**
     * 订阅网络状态更新（启动 SSE）
     * 返回取消订阅函数
     */
    subscribeToStatus() {
        connectNetworkSSE();
        return () => disconnectNetworkSSE();
    },
    /**
     * 通过 HTTP API 获取网络状态
     */
    async fetchInitialStatus() {
        try {
            const client = getRobotHttpClient();
            const data = await client.callMeta('network', 'get_network_status');
            const status = transformNetworkStatus(data);
            set({ status, isLoading: false, error: null });
        }
        catch (err) {
            set({
                isLoading: false,
                error: err instanceof Error ? err.message : '获取网络状态失败',
            });
        }
    },
    /**
     * 扫描可用 WiFi 网络
     */
    async scanNetworks() {
        const { status } = get();
        set({ isScanning: true, error: null });
        try {
            const client = getRobotHttpClient();
            const data = await client.callMeta('network', 'scan_wifi', { timeout_sec: 10 });
            if (!data.success) {
                throw new Error(data.error_message || '扫描失败');
            }
            const networks = data.networks.map((n) => ({
                ssid: n.ssid,
                signalStrength: n.signal_strength,
                securityType: n.security_type,
                requiresPassword: n.requires_password,
                isConnected: status?.ssid === n.ssid,
            }));
            networks.sort((a, b) => b.signalStrength - a.signalStrength);
            set({
                availableNetworks: networks,
                isScanning: false,
                lastScanTime: Date.now(),
            });
            return networks;
        }
        catch (err) {
            set({
                isScanning: false,
                error: err instanceof Error ? err.message : '扫描失败',
            });
            throw err;
        }
    },
    /**
     * 连接到 WiFi 网络
     * AP 模式下 gateway 会先调用 enable_wifi（~15s）再 connect_wifi（~5s）
     */
    async connectToNetwork(credentials) {
        set({ isConnecting: true, connectionError: null, error: null });
        try {
            const client = getRobotHttpClient();
            const data = await client.networkConnect({
                ssid: credentials.ssid,
                password: credentials.password,
                timeout_sec: 30,
            });
            const result = {
                success: data.success,
                errorCode: data.error_code || null,
                errorMessage: data.error_message || null,
                ipAddress: data.ip_address || null,
            };
            if (!result.success) {
                set({ isConnecting: false, connectionError: result });
            }
            else {
                set({ isConnecting: false, connectionError: null });
            }
            return result;
        }
        catch (err) {
            const result = {
                success: false,
                errorCode: null,
                errorMessage: err instanceof Error ? err.message : '连接失败',
                ipAddress: null,
            };
            set({ isConnecting: false, connectionError: result });
            throw err;
        }
    },
    /**
     * 开启 WiFi：退出 AP 模式，让 NetworkManager 自动重连
     */
    async enableWifi() {
        set({ isLoading: true, error: null });
        try {
            const client = getRobotHttpClient();
            const data = await client.callMeta('network', 'enable_wifi');
            set({ isLoading: false });
            return {
                success: data.success,
                errorMessage: data.error_message || null,
            };
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : '开启 WiFi 失败';
            set({ isLoading: false, error: msg });
            return { success: false, errorMessage: msg };
        }
    },
    /**
     * 断开当前 WiFi 连接（关闭 WiFi 无线电）
     */
    async disconnectFromNetwork() {
        set({ isLoading: true, error: null });
        try {
            const client = getRobotHttpClient();
            const data = await client.callMeta('network', 'turn_off_wifi');
            if (!data.success) {
                throw new Error(data.error_message || '断开失败');
            }
            set({ isLoading: false });
        }
        catch (err) {
            set({
                isLoading: false,
                error: err instanceof Error ? err.message : '断开失败',
            });
            throw err;
        }
    },
    /**
     * 重置为 AP 模式（~7s）
     */
    async resetToApMode() {
        set({ isLoading: true, error: null });
        try {
            const client = getRobotHttpClient();
            const data = await client.networkResetToAp();
            const result = {
                success: data.success,
                apSsid: data.ap_ssid || null,
                apIp: data.ap_ip || null,
                errorMessage: data.error_message || null,
            };
            if (!result.success) {
                set({
                    isLoading: false,
                    error: result.errorMessage || '重置失败',
                });
            }
            else {
                set({ isLoading: false });
            }
            return result;
        }
        catch (err) {
            const result = {
                success: false,
                apSsid: null,
                apIp: null,
                errorMessage: err instanceof Error ? err.message : '重置失败',
            };
            set({
                isLoading: false,
                error: result.errorMessage,
            });
            throw err;
        }
    },
    setStatus(status) {
        set({ status });
    },
    setError(error) {
        set({ error });
    },
    clearConnectionError() {
        set({ connectionError: null });
    },
}));
// ============================================================================
// 自动订阅：模块加载时启动 SSE
// ============================================================================
connectNetworkSSE();
// ============================================================================
// Selector hooks
// ============================================================================
export function useIsOnline() {
    return useNetworkStore((state) => state.status?.isOnline ?? false);
}
export function useIsApMode() {
    return useNetworkStore((state) => state.status?.mode === 'ap_mode');
}
export function useSignalLevel() {
    return useNetworkStore((state) => {
        if (!state.status || state.status.mode !== 'wifi') {
            return 'none';
        }
        return getSignalLevel(state.status.signalStrength);
    });
}
//# sourceMappingURL=networkStore.js.map