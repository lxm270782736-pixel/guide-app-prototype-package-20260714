/**
 * Hardware Store
 * Manages power and driver control state
 */
export type PowerState = 'unknown' | 'off' | 'on';
export type DriverState = 'unknown' | 'inactive' | 'active';
export type CameraDriverState = 'unknown' | 'off' | 'on';
export type LidarDriverState = 'unknown' | 'off' | 'on';
export type SpeakerState = 'unknown' | 'off' | 'on';
export type MicrophoneState = 'unknown' | 'off' | 'on';
export type QuickStartStep = 'idle' | 'powering_on' | 'starting_driver' | 'complete' | 'error';
export interface HardwareState {
    /** Current power state */
    powerState: PowerState;
    /** Current driver state */
    driverState: DriverState;
    /** Whether the driver service is on */
    driverEnabled: boolean;
    /** Whether the robot is motion-ready after SDK wait_for_robot_ready */
    driverReady: boolean;
    /** Whether driver is still starting */
    driverStarting: boolean;
    /** Current camera driver state */
    cameraDriverState: CameraDriverState;
    /** Current lidar driver state */
    lidarDriverState: LidarDriverState;
    /** Current speaker (audio driver) state */
    speakerState: SpeakerState;
    /** Whether the speaker device was found (null = unknown) */
    speakerDeviceFound: boolean | null;
    /** Current microphone state */
    microphoneState: MicrophoneState;
    /** Shared speaker volume (0-100) for settings and top-right sound UI */
    speakerVolume: number;
    /** Loading state for power operations */
    isPowerLoading: boolean;
    /** Loading state for driver operations */
    isDriverLoading: boolean;
    /** Cooldown remaining in seconds after shutdown */
    cooldownRemaining: number;
    /** Whether a quick start sequence is in progress */
    isQuickStarting: boolean;
    /** Current step of the quick start sequence */
    quickStartStep: QuickStartStep;
    /** Battery state of charge (0-100), null if unknown */
    batterySoc: number | null;
    /** Whether /api/robot/status has returned successfully at least once */
    robotStatusReady: boolean;
    /** Monotonic counter incremented on each robot status update */
    robotStatusRevision: number;
    /** Error message */
    error: string | null;
}
export interface HardwareStore extends HardwareState {
    /** Fetch current power/driver state from sdk_server */
    fetchRobotStatus(): Promise<boolean>;
    /** Power on the robot */
    powerOn(): Promise<boolean>;
    /** Power off the robot */
    powerOff(): Promise<boolean>;
    /** Release brake */
    brakeOn(): Promise<boolean>;
    /** Engage brake */
    brakeOff(): Promise<boolean>;
    /** Activate driver */
    driverOn(): Promise<boolean>;
    /** Deactivate driver */
    driverOff(): Promise<boolean>;
    /** One-key start: power on + driver on */
    quickStart(): Promise<boolean>;
    /** Shutdown: driver off + power off + cooldown */
    shutdown(): Promise<boolean>;
    /** Reboot the robot */
    reboot(): Promise<boolean>;
    /** Toggle speaker (audio driver) on/off via Supervisor HTTP API */
    toggleSpeaker(): Promise<boolean>;
    /** Toggle microphone on/off via Supervisor HTTP API */
    toggleMicrophone(): Promise<boolean>;
    /** Toggle camera driver on/off via Supervisor HTTP API */
    toggleCamera(): Promise<boolean>;
    /** Toggle lidar on/off via Supervisor HTTP API */
    toggleLidar(): Promise<boolean>;
    /** Update shared speaker volume locally */
    setSpeakerVolume(level: number): void;
    /** Set error */
    setError(error: string | null): void;
    /** Clear error */
    clearError(): void;
}
export declare const useHardwareStore: import("zustand").UseBoundStore<import("zustand").StoreApi<HardwareStore>>;
export declare function useIsPowerOn(): boolean;
export declare function useIsDriverActive(): boolean;
export declare function useIsDriverReady(): boolean;
export declare function useIsDriverStarting(): boolean;
export declare function useIsCameraDriverOn(): boolean;
export declare function useIsLidarDriverOn(): boolean;
export declare function useHardwareError(): string | null;
export declare function useQuickStartStep(): QuickStartStep;
export declare function useIsQuickStarting(): boolean;
export declare function useIsSpeakerOn(): boolean;
export declare function useSpeakerVolume(): number;
export declare function useIsMicrophoneOn(): boolean;
export declare function useBatterySoc(): number | null;
export declare function useCooldownRemaining(): number;
//# sourceMappingURL=hardwareStore.d.ts.map