/**
 * Network state types for Zustand store
 */
/** 网络模式 */
export type NetworkMode = 'ap_mode' | 'wifi' | 'off';
/** WiFi 安全协议 */
export type SecurityType = 'open' | 'wpa' | 'wpa2' | 'wpa3';
/** 连接错误码（后端可返回任意字符串） */
export type ConnectionErrorCode = string;
/**
 * Current network connection state
 */
export interface NetworkStatus {
    /** Current network mode */
    mode: NetworkMode;
    /** Connected WiFi network name (null if AP mode) */
    ssid: string | null;
    /** Signal strength 0-100 (0 if AP mode) */
    signalStrength: number;
    /** Current IP address */
    ipAddress: string | null;
    /** WiFi adapter MAC address */
    macAddress: string;
    /** AP mode hotspot SSID (e.g., "Astribot-A1B2") */
    apSsid: string;
    /** Whether internet is reachable */
    isOnline: boolean;
}
/**
 * Discovered WiFi network from scan results
 */
export interface WiFiNetwork {
    /** Network name */
    ssid: string;
    /** Signal strength 0-100 */
    signalStrength: number;
    /** Security protocol */
    securityType: SecurityType;
    /** Whether password is needed */
    requiresPassword: boolean;
    /** Whether currently connected to this network */
    isConnected: boolean;
}
/**
 * User-provided WiFi connection credentials
 */
export interface NetworkCredentials {
    /** Network to connect to */
    ssid: string;
    /** WiFi password (empty for open networks) */
    password: string;
}
/**
 * Result of a WiFi connection attempt
 */
export interface ConnectionResult {
    /** Whether connection succeeded */
    success: boolean;
    /** Error code if failed */
    errorCode: ConnectionErrorCode | null;
    /** Human-readable error message */
    errorMessage: string | null;
    /** Assigned IP if successful */
    ipAddress: string | null;
}
/**
 * Result of AP mode reset
 */
export interface ResetToApResult {
    /** Whether reset succeeded */
    success: boolean;
    /** AP hotspot name to connect to */
    apSsid: string | null;
    /** IP address in AP mode (192.168.4.1) */
    apIp: string | null;
    /** Error message if failed */
    errorMessage: string | null;
}
/** Signal strength level classification */
export type SignalLevel = 'strong' | 'medium' | 'weak' | 'none';
/**
 * Get signal level from signal strength percentage
 * - Strong: > 70
 * - Medium: 30-70
 * - Weak: 1-29
 * - None: 0 or disconnected
 */
export declare function getSignalLevel(signalStrength: number): SignalLevel;
/**
 * Network store state
 */
export interface NetworkState {
    /** Current network status from robot */
    status: NetworkStatus | null;
    /** Loading state for initial status fetch */
    isLoading: boolean;
    /** General error message */
    error: string | null;
    /** Available networks from last scan */
    availableNetworks: WiFiNetwork[];
    /** Whether a scan is in progress */
    isScanning: boolean;
    /** Timestamp of last successful scan */
    lastScanTime: number | null;
    /** Whether a connection attempt is in progress */
    isConnecting: boolean;
    /** Result of last connection attempt (if failed) */
    connectionError: ConnectionResult | null;
}
/**
 * Network store actions
 */
export interface NetworkActions {
    /** Subscribe to network status updates, returns unsubscribe function */
    subscribeToStatus: () => () => void;
    /** Fetch initial network status via service call */
    fetchInitialStatus: () => Promise<void>;
    /** Scan for available WiFi networks */
    scanNetworks: () => Promise<WiFiNetwork[]>;
    /** Connect to a WiFi network */
    connectToNetwork: (credentials: NetworkCredentials) => Promise<ConnectionResult>;
    /** Disconnect from current WiFi network */
    disconnectFromNetwork: () => Promise<void>;
    /** Enable WiFi: exit AP mode and let NetworkManager reconnect */
    enableWifi: () => Promise<{
        success: boolean;
        errorMessage: string | null;
    }>;
    /** Reset network to AP mode (admin only) */
    resetToApMode: () => Promise<ResetToApResult>;
    /** Update network status */
    setStatus: (status: NetworkStatus) => void;
    /** Set error message */
    setError: (error: string | null) => void;
    /** Clear connection error */
    clearConnectionError: () => void;
}
/**
 * Combined network store type
 */
export type NetworkStore = NetworkState & NetworkActions;
/**
 * Check if robot is online (has internet connectivity)
 */
export declare function selectIsOnline(state: NetworkState): boolean;
/**
 * Check if robot is in AP mode
 */
export declare function selectIsApMode(state: NetworkState): boolean;
/**
 * Get current signal level
 */
export declare function selectSignalLevel(state: NetworkState): SignalLevel;
//# sourceMappingURL=network.d.ts.map