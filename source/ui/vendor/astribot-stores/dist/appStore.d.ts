/**
 * App Store
 * Manages application registry, active app state, and per-app SSE connections.
 */
export interface AppManifest {
    id: string;
    name: string;
    description: string;
    icon: string;
    port: number;
    requiredMetas?: string[];
    /** "tsx" = co-located React component, "html" = raw HTML served by app (iframe) */
    uiType?: 'tsx' | 'html';
}
export interface AppState {
    apps: AppManifest[];
    activeAppId: string | null;
    appStates: Record<string, Record<string, unknown>>;
    runningAppIds: string[];
    launchedPorts: Record<string, number>;
    isLoading: boolean;
    isLaunching: boolean;
    error: string | null;
}
export interface AppStore extends AppState {
    fetchApps(): Promise<void>;
    launchApp(appId: string): Promise<void>;
    stopApp(appId: string): Promise<void>;
    fetchRunningApps(): Promise<void>;
    openApp(appId: string): void;
    closeApp(): void;
    getAppBaseUrl(appId: string): string | null;
    connectAppSSE(appId: string): void;
    disconnectAppSSE(appId: string): void;
    callAppApi<T = unknown>(appId: string, method: string, path: string, body?: unknown): Promise<T>;
}
export declare const useAppStore: import("zustand").UseBoundStore<import("zustand").StoreApi<AppStore>>;
//# sourceMappingURL=appStore.d.ts.map