/**
 * Authentication store using Zustand
 * Platform-agnostic - works in React and React Native
 */
import type { AuthStore } from './types/auth';
/**
 * Configure the Cloud API URL.
 * Must be called before using auth functions.
 */
export declare function configureCloudApi(url: string): void;
/**
 * Auth store with persistence
 */
export declare const useAuthStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<AuthStore>, "persist"> & {
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<AuthStore, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: AuthStore) => void) => () => void;
        onFinishHydration: (fn: (state: AuthStore) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<AuthStore, unknown>>;
    };
}>;
/**
 * Get access token for authenticated requests
 */
export declare function getAccessToken(): string | null;
/**
 * Check if user is authenticated
 */
export declare function isAuthenticated(): boolean;
//# sourceMappingURL=authStore.d.ts.map