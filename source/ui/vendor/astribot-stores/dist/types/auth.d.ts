/**
 * Authentication types for authStore
 */
import type { User } from '@astribot/cloud-client';
/**
 * Authentication error codes
 */
export type AuthErrorCode = 'INVALID_CREDENTIALS' | 'INVALID_VERIFICATION_CODE' | 'USER_ALREADY_EXISTS' | 'WEAK_PASSWORD' | 'RATE_LIMITED' | 'NETWORK_ERROR' | 'SESSION_EXPIRED' | 'ADMIN_KEY_INVALID' | 'ADMIN_KEY_LOCKED' | 'ROBOT_ACTIVATION_INVALID' | 'SESSION_DISPLACED' | 'UNKNOWN';
/**
 * Structured error for UI display
 */
export interface AuthError {
    code: AuthErrorCode;
    message: string;
    field?: string;
}
/**
 * Information about an existing session that will be displaced
 */
export interface DisplacedSession {
    userId: string;
    userName: string;
    loginTime: number;
}
/**
 * Registration parameters
 */
export interface RegisterParams {
    credential: {
        type: 'email';
        value: string;
    } | {
        type: 'phone';
        value: string;
    };
    verificationCode: string;
    password: string;
    displayName: string;
}
/**
 * Auth state managed by Zustand
 */
export interface AuthState {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    expiresAt: number | null;
    isAdmin: boolean;
    robotSerial: string | null;
    isLoading: boolean;
    isInitialized: boolean;
    error: AuthError | null;
    displacedSession: DisplacedSession | null;
    adminUnlockAttempts: number;
    adminUnlockLockedUntil: number | null;
}
/**
 * Auth store actions
 */
export interface AuthActions {
    login(credential: string, password: string, robotSerial: string): Promise<void>;
    loginForce(credential: string, password: string, robotSerial: string): Promise<void>;
    register(params: RegisterParams, robotSerial: string): Promise<void>;
    logout(): Promise<void>;
    sendVerificationCode(credential: string, type: 'email' | 'phone', purpose?: 'register' | 'reset_password' | 'login'): Promise<{
        success: boolean;
        expiresInSeconds: number;
        message: string;
    }>;
    refreshTokenIfNeeded(): Promise<boolean>;
    clearAuth(): void;
    unlockAdmin(machineAdminKey: string): Promise<void>;
    resetAdminLockout(): void;
    setError(error: AuthError | null): void;
    setRobotSerial(serial: string): void;
    clearDisplacedSession(): void;
    initialize(): Promise<void>;
}
/**
 * Complete auth store type
 */
export type AuthStore = AuthState & AuthActions;
//# sourceMappingURL=auth.d.ts.map