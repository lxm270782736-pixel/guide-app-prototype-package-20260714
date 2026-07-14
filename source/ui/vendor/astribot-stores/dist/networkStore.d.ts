/**
 * Network store using Zustand
 * 通过 Supervisor HTTP API 管理 WiFi 配置、网络状态和连接状态
 */
import type { NetworkStore } from './types/network';
/**
 * Network store - 通过 Supervisor HTTP API 与 network meta 通信
 */
export declare const useNetworkStore: import("zustand").UseBoundStore<import("zustand").StoreApi<NetworkStore>>;
export declare function useIsOnline(): boolean;
export declare function useIsApMode(): boolean;
export declare function useSignalLevel(): import(".").SignalLevel;
//# sourceMappingURL=networkStore.d.ts.map