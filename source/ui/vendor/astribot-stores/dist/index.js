/**
 * @astribot/stores
 *
 * Zustand stores for state management
 * Platform-agnostic (works in React and React Native)
 */
export const STORES_VERSION = '0.1.0';
// Auth store
export { useAuthStore, getAccessToken, isAuthenticated, configureCloudApi } from './authStore';
// Network store
export { useNetworkStore, useIsOnline, useIsApMode, useSignalLevel, } from './networkStore';
export { getSignalLevel, selectIsOnline, selectIsApMode, selectSignalLevel, } from './types/network';
// Hardware store
export { useHardwareStore, useIsPowerOn, useIsDriverActive, useIsDriverReady, useIsDriverStarting, useIsCameraDriverOn, useIsLidarDriverOn, useIsSpeakerOn, useSpeakerVolume, useIsMicrophoneOn, useHardwareError, useQuickStartStep, useIsQuickStarting, useBatterySoc, useCooldownRemaining, } from './hardwareStore';
// Robot store (Supervisor SDK client)
export { useRobotStore, getRobotHttpClient, getSSE, onSSEEvent, enableJointStream, useMetaStatus, useIsMetaActive, } from './robotStore';
export { RobotHttpClient, HttpError } from './http-client';
// App store
export { useAppStore } from './appStore';
// Mode store
export { useModeStore, useCurrentMode, useIsModeSwitching, useModeError, useAppsAllowed, canTransition, ALL_MODES, MODE_METADATA, VALID_TRANSITIONS, parseModeBlocked, parseAppModeBlocked, getModeChinese, } from './modeStore';
// Re-export stores (to be implemented)
// export { useControlStore } from './controlStore';
// export { useStreamStore } from './streamStore';
//# sourceMappingURL=index.js.map