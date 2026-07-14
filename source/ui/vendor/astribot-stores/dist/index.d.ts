/**
 * @astribot/stores
 *
 * Zustand stores for state management
 * Platform-agnostic (works in React and React Native)
 */
export declare const STORES_VERSION = "0.1.0";
export { useAuthStore, getAccessToken, isAuthenticated, configureCloudApi } from './authStore';
export type { AuthState, AuthActions, AuthStore, AuthError, AuthErrorCode, RegisterParams, DisplacedSession, } from './types/auth';
export { useNetworkStore, useIsOnline, useIsApMode, useSignalLevel, } from './networkStore';
export type { NetworkState, NetworkActions, NetworkStore, NetworkStatus, WiFiNetwork, NetworkCredentials, ConnectionResult, ResetToApResult, SignalLevel, NetworkMode, SecurityType, ConnectionErrorCode, } from './types/network';
export { getSignalLevel, selectIsOnline, selectIsApMode, selectSignalLevel, } from './types/network';
export { useHardwareStore, useIsPowerOn, useIsDriverActive, useIsDriverReady, useIsDriverStarting, useIsCameraDriverOn, useIsLidarDriverOn, useIsSpeakerOn, useSpeakerVolume, useIsMicrophoneOn, useHardwareError, useQuickStartStep, useIsQuickStarting, useBatterySoc, useCooldownRemaining, } from './hardwareStore';
export type { PowerState, DriverState, CameraDriverState, LidarDriverState, SpeakerState, MicrophoneState, QuickStartStep, HardwareState, HardwareStore, } from './hardwareStore';
export { useRobotStore, getRobotHttpClient, getSSE, onSSEEvent, enableJointStream, useMetaStatus, useIsMetaActive, } from './robotStore';
export type { RobotState, RobotStore, } from './robotStore';
export { RobotHttpClient, HttpError } from './http-client';
export type { MetaStatus } from './types';
export { useAppStore } from './appStore';
export type { AppManifest, AppState, AppStore } from './appStore';
export { useModeStore, useCurrentMode, useIsModeSwitching, useModeError, useAppsAllowed, canTransition, ALL_MODES, MODE_METADATA, VALID_TRANSITIONS, parseModeBlocked, parseAppModeBlocked, getModeChinese, } from './modeStore';
export type { RobotMode, ModeInfo, ModeTransitionResult, ModeState, ModeStore, ModeMetadata, } from './modeStore';
//# sourceMappingURL=index.d.ts.map