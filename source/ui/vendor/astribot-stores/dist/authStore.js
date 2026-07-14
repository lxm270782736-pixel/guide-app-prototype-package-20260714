/**
 * Authentication store using Zustand
 * Platform-agnostic - works in React and React Native
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createCloudClient, withAuth, } from '@astribot/cloud-client';
// Token refresh buffer (1 minute before expiry)
const REFRESH_BUFFER_MS = 60 * 1000;
// Admin unlock rate limiting
const MAX_ADMIN_ATTEMPTS = 3;
const ADMIN_LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes
// Cloud client instance (lazily initialized)
let cloudClient = null;
let cloudApiUrl = null;
/**
 * Configure the Cloud API URL.
 * Must be called before using auth functions.
 */
export function configureCloudApi(url) {
    cloudApiUrl = url;
    // Reset client so it gets recreated with new URL
    cloudClient = null;
}
function getCloudClient() {
    if (!cloudClient) {
        const baseUrl = cloudApiUrl ?? 'http://localhost:8090';
        cloudClient = createCloudClient({ baseUrl });
    }
    return cloudClient;
}
/**
 * Map cloud API errors to AuthError.
 */
function mapError(err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    // Map common error patterns to codes
    if (message.includes('invalid credentials') || message.includes('UNAUTHENTICATED')) {
        return { code: 'INVALID_CREDENTIALS', message: 'Invalid email/phone or password' };
    }
    if (message.includes('verification')) {
        return { code: 'INVALID_VERIFICATION_CODE', message: 'Invalid verification code' };
    }
    if (message.includes('already exists') || message.includes('ALREADY_EXISTS')) {
        return { code: 'USER_ALREADY_EXISTS', message: 'Account already exists' };
    }
    if (message.includes('password')) {
        return { code: 'WEAK_PASSWORD', message: 'Password does not meet requirements' };
    }
    if (message.includes('rate') || message.includes('RESOURCE_EXHAUSTED')) {
        return { code: 'RATE_LIMITED', message: 'Too many attempts. Please wait.' };
    }
    if (message.includes('network') || message.includes('fetch')) {
        return { code: 'NETWORK_ERROR', message: 'Network error. Check your connection.' };
    }
    if (message.includes('expired') || message.includes('token')) {
        return { code: 'SESSION_EXPIRED', message: 'Session expired. Please log in again.' };
    }
    if (message.includes('admin key')) {
        return { code: 'ADMIN_KEY_INVALID', message: 'Invalid admin key' };
    }
    if (message.includes('activation code') || message.includes('invalid_activation_code')) {
        return { code: 'ROBOT_ACTIVATION_INVALID', message: 'Invalid or already-used activation code' };
    }
    return { code: 'UNKNOWN', message };
}
/**
 * Initial auth state
 */
const initialState = {
    user: null,
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    isAdmin: false,
    robotSerial: null,
    isLoading: false,
    isInitialized: false,
    error: null,
    displacedSession: null,
    adminUnlockAttempts: 0,
    adminUnlockLockedUntil: null,
};
/**
 * Auth store with persistence
 */
export const useAuthStore = create()(persist((set, get) => ({
    ...initialState,
    /**
     * Login with email/phone and password
     */
    async login(credential, password, robotSerial) {
        set({ isLoading: true, error: null, displacedSession: null });
        try {
            const client = getCloudClient();
            const { response } = await client.auth.login({
                credential,
                password,
                robotSerial,
            });
            // Convert bigint to number for JS compatibility
            const expiresAt = Number(response.expiresAt) * 1000; // Convert to ms
            client.setAccessToken(response.accessToken);
            set({
                user: response.user,
                accessToken: response.accessToken,
                refreshToken: response.refreshToken,
                expiresAt,
                robotSerial,
                isAdmin: false, // Reset on new login
                isLoading: false,
                error: null,
            });
        }
        catch (err) {
            // TODO: Check for session displacement in error/response
            set({ isLoading: false, error: mapError(err) });
            throw err;
        }
    },
    /**
     * Force login (displacing existing session)
     */
    async loginForce(credential, password, robotSerial) {
        // For now, same as login - server handles force flag
        // TODO: Add force flag to the HTTP contract if needed
        return get().login(credential, password, robotSerial);
    },
    /**
     * Register a new account
     */
    async register(params, robotSerial) {
        set({ isLoading: true, error: null });
        try {
            const client = getCloudClient();
            const { response } = await client.auth.register({
                credential: params.credential.type === 'email'
                    ? { oneofKind: 'email', email: params.credential.value }
                    : { oneofKind: 'phone', phone: params.credential.value },
                verificationCode: params.verificationCode,
                password: params.password,
                displayName: params.displayName,
            });
            const expiresAt = Number(response.expiresAt) * 1000;
            client.setAccessToken(response.accessToken);
            set({
                user: response.user,
                accessToken: response.accessToken,
                refreshToken: response.refreshToken,
                expiresAt,
                robotSerial,
                isAdmin: false,
                isLoading: false,
                error: null,
            });
        }
        catch (err) {
            set({ isLoading: false, error: mapError(err) });
            throw err;
        }
    },
    /**
     * Send verification code for registration
     */
    async sendVerificationCode(credential, type, purpose = 'register') {
        set({ isLoading: true, error: null });
        try {
            const client = getCloudClient();
            // Keep numeric compatibility with the existing cloud-client enum shape.
            const purposeMap = {
                register: 1, // VERIFICATION_PURPOSE_REGISTER
                reset_password: 2, // VERIFICATION_PURPOSE_RESET_PASSWORD
                login: 3, // VERIFICATION_PURPOSE_LOGIN
            };
            const { response } = await client.auth.sendVerificationCode({
                credential: type === 'email'
                    ? { oneofKind: 'email', email: credential }
                    : { oneofKind: 'phone', phone: credential },
                purpose: purposeMap[purpose],
            });
            console.log(`[Auth] Verification code sent to ${type}: ${credential}`);
            console.log(`[Auth] Expires in ${response.expiresInSeconds} seconds`);
            set({ isLoading: false });
            return {
                success: response.success,
                expiresInSeconds: response.expiresInSeconds,
                message: response.message,
            };
        }
        catch (err) {
            set({ isLoading: false, error: mapError(err) });
            throw err;
        }
    },
    /**
     * Logout and clear session
     */
    async logout() {
        const { accessToken } = get();
        set({ isLoading: true });
        try {
            if (accessToken) {
                const client = getCloudClient();
                await client.auth.logout({ accessToken });
                client.setAccessToken(undefined);
            }
        }
        catch {
            // Ignore logout errors - clear state anyway
        }
        set({
            ...initialState,
            isInitialized: true, // Keep initialized
        });
    },
    /**
     * Refresh token if near expiry
     * Returns true if refresh was successful or not needed
     */
    async refreshTokenIfNeeded() {
        const { refreshToken, expiresAt, accessToken } = get();
        // No token to refresh
        if (!refreshToken || !accessToken) {
            return false;
        }
        // Not near expiry yet
        if (expiresAt && Date.now() < expiresAt - REFRESH_BUFFER_MS) {
            return true;
        }
        try {
            const client = getCloudClient();
            const { response } = await client.auth.refreshToken({ refreshToken });
            const newExpiresAt = Number(response.expiresAt) * 1000;
            client.setAccessToken(response.accessToken);
            set({
                accessToken: response.accessToken,
                refreshToken: response.refreshToken,
                expiresAt: newExpiresAt,
            });
            return true;
        }
        catch {
            // Refresh failed - clear auth
            set({
                ...initialState,
                isInitialized: true,
                error: { code: 'SESSION_EXPIRED', message: 'Session expired. Please log in again.' },
            });
            return false;
        }
    },
    /**
     * Clear all auth state
     */
    clearAuth() {
        set({
            ...initialState,
            isInitialized: true,
        });
    },
    /**
     * Unlock admin privileges with machine admin key
     */
    async unlockAdmin(machineAdminKey) {
        const { accessToken, adminUnlockAttempts, adminUnlockLockedUntil } = get();
        // Check if locked out
        if (adminUnlockLockedUntil && Date.now() < adminUnlockLockedUntil) {
            const remainingMs = adminUnlockLockedUntil - Date.now();
            const remainingMin = Math.ceil(remainingMs / 60000);
            set({
                error: {
                    code: 'ADMIN_KEY_LOCKED',
                    message: `Locked out. Try again in ${remainingMin} minute(s).`,
                },
            });
            throw new Error('Admin unlock locked out');
        }
        set({ isLoading: true, error: null });
        try {
            if (!accessToken) {
                throw new Error('Session token is missing');
            }
            const client = getCloudClient();
            client.setAccessToken(accessToken);
            const { response } = await client.auth.activateRobot({ activationCode: machineAdminKey }, withAuth(accessToken));
            set({
                isAdmin: true,
                robotSerial: response.robot.serialNumber,
                isLoading: false,
                adminUnlockAttempts: 0,
                adminUnlockLockedUntil: null,
            });
        }
        catch (err) {
            const newAttempts = adminUnlockAttempts + 1;
            const isLockedOut = newAttempts >= MAX_ADMIN_ATTEMPTS;
            set({
                isLoading: false,
                adminUnlockAttempts: newAttempts,
                adminUnlockLockedUntil: isLockedOut ? Date.now() + ADMIN_LOCKOUT_MS : null,
                error: isLockedOut
                    ? { code: 'ADMIN_KEY_LOCKED', message: 'Too many failed attempts. Locked for 5 minutes.' }
                    : { code: 'ADMIN_KEY_INVALID', message: 'Invalid admin key' },
            });
            throw err;
        }
    },
    /**
     * Reset admin lockout (for testing)
     */
    resetAdminLockout() {
        set({
            adminUnlockAttempts: 0,
            adminUnlockLockedUntil: null,
        });
    },
    /**
     * Set error state
     */
    setError(error) {
        set({ error });
    },
    /**
     * Set robot serial
     */
    setRobotSerial(serial) {
        set({ robotSerial: serial });
    },
    /**
     * Clear displaced session warning
     */
    clearDisplacedSession() {
        set({ displacedSession: null });
    },
    /**
     * Initialize store (hydrate from storage)
     */
    async initialize() {
        // Persist middleware handles hydration automatically
        // This is called after hydration completes
        const { accessToken, refreshToken } = get();
        if (accessToken && refreshToken) {
            // Try to refresh token on init
            await get().refreshTokenIfNeeded();
        }
        set({ isInitialized: true });
    },
}), {
    name: 'astribot:auth',
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        expiresAt: state.expiresAt,
        isAdmin: state.isAdmin,
        robotSerial: state.robotSerial,
    }),
    onRehydrateStorage: () => (_state, error) => {
        if (error) {
            console.error('[Auth] Hydration error:', error);
        }
        // Defer setState to avoid TDZ — useAuthStore isn't assigned yet during create()
        queueMicrotask(() => {
            useAuthStore.setState({ isInitialized: true });
        });
    },
}));
/**
 * Get access token for authenticated requests
 */
export function getAccessToken() {
    return useAuthStore.getState().accessToken;
}
/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
    const { accessToken, expiresAt } = useAuthStore.getState();
    return !!accessToken && (!expiresAt || Date.now() < expiresAt);
}
//# sourceMappingURL=authStore.js.map