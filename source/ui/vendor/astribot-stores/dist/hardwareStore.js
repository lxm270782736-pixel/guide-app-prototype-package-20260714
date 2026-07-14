/**
 * Hardware Store
 * Manages power and driver control state
 */
import { create } from 'zustand';
import { getRobotHttpClient, useRobotStore, onSSEEvent } from './robotStore';
import { parseModeBlocked, getModeChinese } from './modeStore';
function resolveDriverReady(status, driverOn) {
    // Newer gateways may omit driver_ready and only expose powered_on/driver_on.
    // In that contract, treat driver_on as the ready signal for the frontend.
    return status.driver_ready ?? driverOn;
}
function parseBatterySoc(raw) {
    if (raw == null)
        return null;
    const value = typeof raw === 'number'
        ? raw
        : typeof raw === 'string'
            ? Number.parseFloat(raw)
            : Number.NaN;
    if (!Number.isFinite(value))
        return null;
    return Math.max(0, Math.min(100, value));
}
function pickRobotStatusPayload(rawStatus) {
    // Some gateways wrap robot_status payload as { data: { ... } }.
    if (rawStatus.data &&
        typeof rawStatus.data === 'object' &&
        !Array.isArray(rawStatus.data)) {
        return rawStatus.data;
    }
    return rawStatus;
}
function isRobotActionFailed(result) {
    return !!result && typeof result === 'object' && 'success' in result && result.success === false;
}
async function robotPostAllowBusinessFailure(path, body) {
    // Some gateways may reply with non-2xx HTTP while still returning a business payload
    // like { success: false, message: ... }. Prefer surfacing that payload.
    const client = getRobotHttpClient();
    try {
        return await client.robotPost(path, body);
    }
    catch (err) {
        if (err && typeof err === 'object' && 'data' in err) {
            const data = err.data;
            if (data && typeof data === 'object' && 'success' in data) {
                return data;
            }
        }
        throw err;
    }
}
// ============================================================================
// Store
// ============================================================================
let cooldownIntervalId = null;
function speakerStateFromMetaStatuses(metaStatuses) {
    const speaker = Array.isArray(metaStatuses) ? metaStatuses.find((m) => m.name === 'speaker') : undefined;
    if (speaker?.state === 'active')
        return 'on';
    if (speaker?.state === 'inactive')
        return 'off';
    return 'unknown';
}
function speakerDeviceFoundFromMetaStatuses(metaStatuses) {
    const speaker = Array.isArray(metaStatuses) ? metaStatuses.find((m) => m.name === 'speaker') : undefined;
    const df = speaker?.device_found;
    return typeof df === 'boolean' ? df : null;
}
function waitForHardwareState(predicate, timeoutMs = 8000) {
    return new Promise((resolve) => {
        if (predicate(useHardwareStore.getState())) {
            resolve(true);
            return;
        }
        let settled = false;
        let unsubscribe = null;
        const timer = setTimeout(() => {
            if (settled)
                return;
            settled = true;
            unsubscribe?.();
            resolve(false);
        }, timeoutMs);
        unsubscribe = useHardwareStore.subscribe(() => {
            if (settled || !predicate(useHardwareStore.getState()))
                return;
            settled = true;
            clearTimeout(timer);
            unsubscribe?.();
            resolve(true);
        });
    });
}
export const useHardwareStore = create()((set, get) => ({
    powerState: 'unknown',
    driverState: 'unknown',
    driverEnabled: false,
    driverReady: false,
    driverStarting: false,
    cameraDriverState: 'unknown',
    lidarDriverState: 'unknown',
    speakerState: speakerStateFromMetaStatuses(useRobotStore.getState().metaStatuses),
    speakerDeviceFound: speakerDeviceFoundFromMetaStatuses(useRobotStore.getState().metaStatuses),
    microphoneState: 'unknown',
    speakerVolume: 100,
    batterySoc: null,
    robotStatusReady: false,
    robotStatusRevision: 0,
    isPowerLoading: false,
    isDriverLoading: false,
    cooldownRemaining: 0,
    isQuickStarting: false,
    quickStartStep: 'idle',
    error: null,
    async fetchRobotStatus() {
        try {
            const client = getRobotHttpClient();
            const rawStatus = await client.robotGet('status');
            const status = pickRobotStatusPayload(rawStatus);
            const currentBatterySoc = get().batterySoc;
            const driverOn = status.driver_on ?? false;
            const driverReady = resolveDriverReady(status, driverOn);
            const driverStarting = ((status.driver_starting ?? false) || (driverOn && !driverReady));
            const parsedSoc = parseBatterySoc(status.battery_soc ?? status.batterySoc);
            set({
                powerState: status.powered_on ? 'on' : 'off',
                driverEnabled: driverOn,
                driverReady,
                driverStarting,
                driverState: driverReady ? 'active' : 'inactive',
                batterySoc: parsedSoc ?? currentBatterySoc,
                robotStatusReady: true,
                robotStatusRevision: get().robotStatusRevision + 1,
            });
            return true;
        }
        catch {
            // not available yet — leave state as unknown
            set({ robotStatusReady: false });
            return false;
        }
    },
    async powerOn() {
        if (get().cooldownRemaining > 0) {
            set({ error: '关机冷却中，请稍候' });
            return false;
        }
        set({ isPowerLoading: true, error: null });
        try {
            const result = await robotPostAllowBusinessFailure('power_on');
            if (isRobotActionFailed(result)) {
                set({ error: '开启电机失败', isPowerLoading: false });
                return false;
            }
            console.log('[Hardware] Power on success');
            set({ powerState: 'on', isPowerLoading: false });
            return true;
        }
        catch (err) {
            set({ error: '开启电机失败', isPowerLoading: false });
            console.error('[Hardware] Power on error:', err);
            return false;
        }
    },
    async powerOff() {
        set({ isPowerLoading: true, error: null });
        try {
            const client = getRobotHttpClient();
            await client.robotPost('power_off');
            console.log('[Hardware] Power off success');
            if (cooldownIntervalId !== null) {
                clearInterval(cooldownIntervalId);
            }
            set({
                powerState: 'off',
                driverState: 'inactive',
                driverEnabled: false,
                driverReady: false,
                driverStarting: false,
                cooldownRemaining: 10,
                isPowerLoading: false,
            });
            cooldownIntervalId = setInterval(() => {
                const remaining = useHardwareStore.getState().cooldownRemaining;
                if (remaining <= 1) {
                    if (cooldownIntervalId !== null) {
                        clearInterval(cooldownIntervalId);
                        cooldownIntervalId = null;
                    }
                    useHardwareStore.setState({ cooldownRemaining: 0 });
                    console.log('[Hardware] Cooldown complete');
                }
                else {
                    useHardwareStore.setState({ cooldownRemaining: remaining - 1 });
                }
            }, 1000);
            return true;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : '下电失败';
            set({ error: message, isPowerLoading: false });
            console.error('[Hardware] Power off error:', err);
            return false;
        }
    },
    async brakeOn() {
        set({ isPowerLoading: true, error: null });
        try {
            const client = getRobotHttpClient();
            await client.robotPost('brake_on');
            console.log('[Hardware] Brake on (release) success');
            set({ isPowerLoading: false });
            return true;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : '开抱闸失败';
            set({ error: message, isPowerLoading: false });
            console.error('[Hardware] Brake on error:', err);
            return false;
        }
    },
    async brakeOff() {
        set({ isPowerLoading: true, error: null });
        try {
            const client = getRobotHttpClient();
            await client.robotPost('brake_off');
            console.log('[Hardware] Brake off (engage) success');
            set({ isPowerLoading: false });
            return true;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : '关抱闸失败';
            set({ error: message, isPowerLoading: false });
            console.error('[Hardware] Brake off error:', err);
            return false;
        }
    },
    async driverOn() {
        set({ isDriverLoading: true, error: null });
        try {
            const result = await robotPostAllowBusinessFailure('driver_on');
            if (isRobotActionFailed(result)) {
                set({ error: '开启驱动失败', isDriverLoading: false });
                return false;
            }
            console.log('[Hardware] Driver on success');
            set({ isDriverLoading: false });
            return true;
        }
        catch (err) {
            set({ error: '开启驱动失败', isDriverLoading: false });
            console.error('[Hardware] Driver on error:', err);
            return false;
        }
    },
    async driverOff() {
        set({ isDriverLoading: true, error: null });
        try {
            const client = getRobotHttpClient();
            await client.robotPost('driver_off');
            console.log('[Hardware] Driver off success');
            set({
                driverState: 'inactive',
                driverEnabled: false,
                driverReady: false,
                driverStarting: false,
                isDriverLoading: false,
            });
            return true;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : '下驱动失败';
            set({ error: message, isDriverLoading: false });
            console.error('[Hardware] Driver off error:', err);
            return false;
        }
    },
    async quickStart() {
        if (get().cooldownRemaining > 0) {
            set({ error: '关机冷却中，请稍候' });
            return false;
        }
        set({ isQuickStarting: true, quickStartStep: 'powering_on', error: null });
        const powerSuccess = await get().powerOn();
        if (!powerSuccess) {
            set({ quickStartStep: 'error', isQuickStarting: false });
            setTimeout(() => set({ quickStartStep: 'idle' }), 1000);
            return false;
        }
        // Small delay between power and driver
        await new Promise((resolve) => setTimeout(resolve, 500));
        set({ quickStartStep: 'starting_driver' });
        const driverSuccess = await get().driverOn();
        if (!driverSuccess) {
            set({ quickStartStep: 'error', isQuickStarting: false });
            setTimeout(() => set({ quickStartStep: 'idle' }), 1000);
            return false;
        }
        console.log('[Hardware] Quick start complete');
        set({ quickStartStep: 'complete', isQuickStarting: false });
        setTimeout(() => set({ quickStartStep: 'idle' }), 1000);
        return true;
    },
    async shutdown() {
        // Step 1: driver off
        const revisionBeforeShutdown = get().robotStatusRevision;
        const driverSuccess = await get().driverOff();
        if (!driverSuccess)
            return false;
        const driverConfirmed = await waitForHardwareState((state) => state.robotStatusRevision > revisionBeforeShutdown &&
            state.driverEnabled === false &&
            state.driverState === 'inactive' &&
            state.driverReady === false);
        if (!driverConfirmed) {
            set({ error: '等待驱动状态确认超时，请稍后重试' });
            return false;
        }
        // Step 2: power off
        const powerSuccess = await get().powerOff();
        if (!powerSuccess)
            return false;
        // Step 3: start 10s cooldown timer
        console.log('[Hardware] Shutdown complete, starting 10s cooldown');
        set({ cooldownRemaining: 10 });
        // Clear any existing cooldown interval
        if (cooldownIntervalId !== null) {
            clearInterval(cooldownIntervalId);
        }
        cooldownIntervalId = setInterval(() => {
            const remaining = useHardwareStore.getState().cooldownRemaining;
            if (remaining <= 1) {
                if (cooldownIntervalId !== null) {
                    clearInterval(cooldownIntervalId);
                    cooldownIntervalId = null;
                }
                useHardwareStore.setState({ cooldownRemaining: 0 });
                console.log('[Hardware] Cooldown complete');
            }
            else {
                useHardwareStore.setState({ cooldownRemaining: remaining - 1 });
            }
        }, 1000);
        return true;
    },
    async reboot() {
        set({ isPowerLoading: true, error: null });
        try {
            const client = getRobotHttpClient();
            await client.rebootHost();
            console.log('[Hardware] Reboot requested');
            set({
                powerState: 'off',
                driverState: 'inactive',
                driverEnabled: false,
                driverReady: false,
                driverStarting: false,
                isPowerLoading: false,
            });
            return true;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : '重启失败';
            set({ error: message, isPowerLoading: false });
            console.error('[Hardware] Reboot error:', err);
            return false;
        }
    },
    async toggleSpeaker() {
        const currentlyOn = useRobotStore.getState().metaStatuses
            .some((m) => m.name === 'speaker' && m.state === 'active');
        set({ error: null });
        try {
            const client = getRobotHttpClient();
            if (currentlyOn) {
                await client.deactivateMeta('speaker');
            }
            else {
                const result = await client.activateMeta('speaker');
                const blocked = parseModeBlocked(result.result ?? '');
                if (blocked) {
                    set({ error: `${getModeChinese(blocked.mode)}模式下不允许激活扬声器，请先切换到合适的运行模式` });
                    return false;
                }
            }
            set({ speakerState: currentlyOn ? 'off' : 'on' });
            console.log(`[Hardware] Speaker ${currentlyOn ? 'deactivated' : 'activated'}`);
            return true;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : '扬声器操作失败';
            set({ error: message });
            console.error('[Hardware] Speaker toggle error:', err);
            return false;
        }
    },
    async toggleMicrophone() {
        const currentlyOn = useRobotStore.getState().metaStatuses
            .some((m) => m.name === 'microphone' && m.state === 'active');
        set({ error: null });
        try {
            const client = getRobotHttpClient();
            if (currentlyOn) {
                await client.deactivateMeta('microphone');
            }
            else {
                const result = await client.activateMeta('microphone');
                const blocked = parseModeBlocked(result.result ?? '');
                if (blocked) {
                    set({ error: `${getModeChinese(blocked.mode)}模式下不允许激活麦克风，请先切换到合适的运行模式` });
                    return false;
                }
            }
            set({ microphoneState: currentlyOn ? 'off' : 'on' });
            console.log(`[Hardware] Microphone ${currentlyOn ? 'deactivated' : 'activated'}`);
            return true;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : '麦克风操作失败';
            set({ error: message });
            console.error('[Hardware] Microphone toggle error:', err);
            return false;
        }
    },
    async toggleCamera() {
        const currentlyActive = useRobotStore.getState().metaStatuses
            .some((m) => m.name === 'camera' && m.state === 'active');
        set({ error: null });
        try {
            const client = getRobotHttpClient();
            if (currentlyActive) {
                await client.deactivateMeta('camera');
            }
            else {
                const result = await client.activateMeta('camera');
                const blocked = parseModeBlocked(result.result ?? '');
                if (blocked) {
                    set({ error: `${getModeChinese(blocked.mode)}模式下不允许激活相机，请先切换到合适的运行模式` });
                    return false;
                }
            }
            const newState = currentlyActive ? 'inactive' : 'active';
            const statuses = useRobotStore.getState().metaStatuses.map((m) => m.name === 'camera' ? { ...m, state: newState } : m);
            useRobotStore.setState({ metaStatuses: statuses });
            console.log(`[Hardware] Camera ${currentlyActive ? 'deactivated' : 'activated'}`);
            return true;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : '相机操作失败';
            set({ error: message });
            console.error('[Hardware] Camera toggle error:', err);
            return false;
        }
    },
    async toggleLidar() {
        const currentlyActive = useRobotStore.getState().metaStatuses
            .some((m) => m.name === 'lidar' && m.state === 'active');
        set({ error: null });
        try {
            const client = getRobotHttpClient();
            if (currentlyActive) {
                await client.deactivateMeta('lidar');
            }
            else {
                const result = await client.activateMeta('lidar');
                const blocked = parseModeBlocked(result.result ?? '');
                if (blocked) {
                    set({ error: `${getModeChinese(blocked.mode)}模式下不允许激活雷达，请先切换到合适的运行模式` });
                    return false;
                }
            }
            const newState = currentlyActive ? 'inactive' : 'active';
            const statuses = useRobotStore.getState().metaStatuses.map((m) => m.name === 'lidar' ? { ...m, state: newState } : m);
            useRobotStore.setState({ metaStatuses: statuses });
            console.log(`[Hardware] Lidar ${currentlyActive ? 'deactivated' : 'activated'}`);
            return true;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : '雷达操作失败';
            set({ error: message });
            console.error('[Hardware] Lidar toggle error:', err);
            return false;
        }
    },
    setSpeakerVolume(level) {
        const clamped = Math.max(0, Math.min(100, level));
        set({ speakerVolume: clamped });
    },
    setError(error) {
        set({ error });
    },
    clearError() {
        set({ error: null });
    },
}));
// ============================================================================
// Sync hardware state from SSE events
// ============================================================================
// Sync speaker/mic/camera from meta statuses
useRobotStore.subscribe((state) => {
    const metaStatuses = Array.isArray(state.metaStatuses) ? state.metaStatuses : [];
    const speaker = metaStatuses.find((m) => m.name === 'speaker');
    const mic = metaStatuses.find((m) => m.name === 'microphone');
    const camera = metaStatuses.find((m) => m.name === 'camera');
    const lidar = metaStatuses.find((m) => m.name === 'lidar');
    const hw = useHardwareStore.getState();
    const mapMetaState = (metaState, fallback) => {
        if (metaState === 'active')
            return 'on';
        if (metaState === 'inactive')
            return 'off';
        return fallback;
    };
    // Keep previous state when speaker is missing from the frame (null/missing payload).
    let newSpeaker = hw.speakerState;
    let newSpeakerDeviceFound = hw.speakerDeviceFound;
    if (speaker) {
        newSpeaker = mapMetaState(speaker.state, hw.speakerState);
        const df = speaker.device_found;
        if (typeof df === 'boolean') {
            newSpeakerDeviceFound = df;
        }
    }
    const newMic = mic
        ? mapMetaState(mic.state, hw.microphoneState)
        : hw.microphoneState;
    const newCamera = camera
        ? mapMetaState(camera.state, hw.cameraDriverState)
        : hw.cameraDriverState;
    const newLidar = lidar
        ? mapMetaState(lidar.state, hw.lidarDriverState)
        : hw.lidarDriverState;
    const updates = {};
    if (newSpeaker !== hw.speakerState)
        updates.speakerState = newSpeaker;
    if (newSpeakerDeviceFound !== hw.speakerDeviceFound)
        updates.speakerDeviceFound = newSpeakerDeviceFound;
    if (newMic !== hw.microphoneState)
        updates.microphoneState = newMic;
    if (newCamera !== hw.cameraDriverState)
        updates.cameraDriverState = newCamera;
    if (newLidar !== hw.lidarDriverState)
        updates.lidarDriverState = newLidar;
    if (Object.keys(updates).length > 0) {
        useHardwareStore.setState(updates);
    }
});
// Sync power/driver/battery from robot_status SSE event (direct SDK)
onSSEEvent('robot_status', (data) => {
    try {
        const rawStatus = JSON.parse(data);
        const status = pickRobotStatusPayload(rawStatus);
        const hw = useHardwareStore.getState();
        const updates = {};
        const hasPoweredOn = typeof status.powered_on === 'boolean';
        const hasDriverOn = typeof status.driver_on === 'boolean';
        const hasDriverReady = typeof status.driver_ready === 'boolean';
        const hasDriverStarting = typeof status.driver_starting === 'boolean';
        const parsedSoc = parseBatterySoc(status.battery_soc ?? status.batterySoc);
        const newPower = hasPoweredOn
            ? (status.powered_on ? 'on' : 'off')
            : hw.powerState;
        const newDriverOn = hasDriverOn ? status.driver_on : hw.driverEnabled;
        const newDriverReady = hasDriverReady
            ? resolveDriverReady(status, newDriverOn)
            : hw.driverReady;
        const newDriverStarting = hasDriverStarting
            ? ((status.driver_starting ?? false) || (newDriverOn && !newDriverReady))
            : hw.driverStarting;
        const newDriver = newDriverReady ? 'active' : 'inactive';
        if (hasPoweredOn && newPower !== hw.powerState && !hw.isPowerLoading)
            updates.powerState = newPower;
        if (hasDriverOn && newDriverOn !== hw.driverEnabled)
            updates.driverEnabled = newDriverOn;
        if (hasDriverReady && newDriverReady !== hw.driverReady)
            updates.driverReady = newDriverReady;
        if ((hasDriverStarting || hasDriverOn || hasDriverReady) && newDriverStarting !== hw.driverStarting) {
            updates.driverStarting = newDriverStarting;
        }
        if ((hasDriverOn || hasDriverReady) && newDriver !== hw.driverState && !hw.isDriverLoading) {
            updates.driverState = newDriver;
        }
        if (parsedSoc != null && parsedSoc !== hw.batterySoc) {
            updates.batterySoc = parsedSoc;
        }
        if (!hw.robotStatusReady) {
            updates.robotStatusReady = true;
        }
        updates.robotStatusRevision = hw.robotStatusRevision + 1;
        if (Object.keys(updates).length > 0) {
            useHardwareStore.setState(updates);
        }
    }
    catch {
        // ignore parse errors
    }
});
// Fetch robot status from sdk_server on startup
useHardwareStore.getState().fetchRobotStatus();
// ============================================================================
// Selector Hooks
// ============================================================================
export function useIsPowerOn() {
    return useHardwareStore((state) => state.powerState === 'on');
}
export function useIsDriverActive() {
    return useHardwareStore((state) => state.driverState === 'active');
}
export function useIsDriverReady() {
    return useHardwareStore((state) => state.driverReady);
}
export function useIsDriverStarting() {
    return useHardwareStore((state) => state.driverStarting);
}
export function useIsCameraDriverOn() {
    return useHardwareStore((state) => state.cameraDriverState === 'on');
}
export function useIsLidarDriverOn() {
    return useHardwareStore((state) => state.lidarDriverState === 'on');
}
export function useHardwareError() {
    return useHardwareStore((state) => state.error);
}
export function useQuickStartStep() {
    return useHardwareStore((state) => state.quickStartStep);
}
export function useIsQuickStarting() {
    return useHardwareStore((state) => state.isQuickStarting);
}
export function useIsSpeakerOn() {
    return useRobotStore((state) => (Array.isArray(state.metaStatuses) ? state.metaStatuses : []).some((m) => m.name === 'speaker' && m.state === 'active'));
}
export function useSpeakerVolume() {
    return useHardwareStore((state) => state.speakerVolume);
}
export function useIsMicrophoneOn() {
    return useHardwareStore((state) => state.microphoneState === 'on');
}
export function useBatterySoc() {
    return useHardwareStore((state) => state.batterySoc);
}
export function useCooldownRemaining() {
    return useHardwareStore((state) => state.cooldownRemaining);
}
//# sourceMappingURL=hardwareStore.js.map