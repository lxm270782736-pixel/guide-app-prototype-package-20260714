/**
 * Mode Store
 * Manages robot operating mode state — syncs with Supervisor's 7-mode state machine.
 *
 * Modes: idle | standby | teleop | autonomous | charging | emergency | maintenance
 *
 * Uses Supervisor HTTP API:
 *   GET  /api/mode → current mode info
 *   POST /api/mode → switch mode
 */
import { create } from 'zustand';
import { getRobotHttpClient } from './robotStore';
// ============================================================================
// Valid transitions matrix (mirrors supervisor.py VALID_TRANSITIONS)
// ============================================================================
export const VALID_TRANSITIONS = {
    idle: new Set(['standby', 'maintenance', 'charging']),
    standby: new Set(['idle', 'teleop', 'autonomous', 'maintenance', 'charging']),
    teleop: new Set(['standby', 'idle']),
    autonomous: new Set(['standby', 'idle']),
    charging: new Set(['idle', 'standby']),
    emergency: new Set(['idle', 'standby']),
    maintenance: new Set(['idle', 'standby']),
};
/** EMERGENCY 可从任何模式进入 */
export function canTransition(from, to) {
    if (from === to)
        return false;
    if (to === 'emergency')
        return true;
    return VALID_TRANSITIONS[from]?.has(to) ?? false;
}
// ============================================================================
// All mode values for iteration
// ============================================================================
export const ALL_MODES = [
    'idle',
    'standby',
    'teleop',
    'autonomous',
    'charging',
    'emergency',
    'maintenance',
];
// TODO: i18n — extract labels/descs to packages/i18n when i18n is active
export const MODE_METADATA = [
    {
        key: 'idle',
        label: '待机',
        desc: '上电待机，伺服关闭',
        iconName: 'Moon',
        color: 'text-amber-500',
    },
    {
        key: 'standby',
        label: '就绪',
        desc: '伺服就绪，保持姿态',
        iconName: 'Activity',
        color: 'text-green-500',
    },
    {
        key: 'teleop',
        label: '远程操控',
        desc: 'VR / 遥操控模式',
        iconName: 'Gamepad2',
        color: 'text-blue-500',
    },
    {
        key: 'autonomous',
        label: '自主运行',
        desc: '自主运行 App',
        iconName: 'Cpu',
        color: 'text-purple-500',
    },
    {
        key: 'charging',
        label: '充电',
        desc: '充电模式，限制运动',
        iconName: 'BatteryCharging',
        color: 'text-teal-500',
    },
    {
        key: 'emergency',
        label: '紧急停止',
        desc: '所有运动立即停止',
        iconName: 'AlertTriangle',
        color: 'text-red-500',
    },
    {
        key: 'maintenance',
        label: '维护诊断',
        desc: '所有 Meta 可用，开发调试',
        iconName: 'Wrench',
        color: 'text-gray-500',
    },
];
// ============================================================================
// Mode blocked error parsing
// ============================================================================
/** 从 activate 返回值中解析 mode blocked 信息 */
export function parseModeBlocked(result) {
    const match = result.match(/^blocked by mode '(\w+)'$/);
    if (match) {
        return { blocked: true, mode: match[1] };
    }
    return null;
}
/** 从 launch 错误信息中解析 mode blocked 信息 */
export function parseAppModeBlocked(errorMsg) {
    const match = errorMsg.match(/apps not allowed in mode '(\w+)'/);
    if (match) {
        return { blocked: true, mode: match[1] };
    }
    return null;
}
/** 获取模式中文名 — TODO: i18n */
export function getModeChinese(mode) {
    const meta = MODE_METADATA.find((m) => m.key === mode);
    return meta?.label ?? mode;
}
// ============================================================================
// Store
// ============================================================================
export const useModeStore = create()((set) => ({
    currentMode: 'idle',
    allowedMetas: [],
    appsAllowed: false,
    isSwitching: false,
    lastTransition: null,
    error: null,
    initialized: false,
    async fetchMode() {
        try {
            const client = getRobotHttpClient();
            const info = await client.getMode();
            set({
                currentMode: info.mode,
                allowedMetas: info.allowed_metas,
                appsAllowed: info.apps_allowed,
                initialized: true,
                error: null,
            });
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : '获取运行模式失败';
            set({ error: msg });
        }
    },
    async setMode(target) {
        set({ isSwitching: true, error: null });
        try {
            const client = getRobotHttpClient();
            const result = await client.setMode(target);
            set({
                currentMode: result.mode,
                isSwitching: false,
                lastTransition: result,
            });
            // Fire-and-forget: refresh allowed_metas & apps_allowed.
            // Errors here won't overwrite the successful transition —
            // fetchMode only sets error if initialized is still false.
            useModeStore.getState().fetchMode().catch(() => { });
            return result;
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : '切换模式失败';
            set({ error: msg, isSwitching: false });
            throw err;
        }
    },
    clearError() {
        set({ error: null });
    },
}));
// ============================================================================
// Selector Hooks
// ============================================================================
export function useCurrentMode() {
    return useModeStore((state) => state.currentMode);
}
export function useIsModeSwitching() {
    return useModeStore((state) => state.isSwitching);
}
export function useModeError() {
    return useModeStore((state) => state.error);
}
export function useAppsAllowed() {
    return useModeStore((state) => state.appsAllowed);
}
// NOTE: No auto-fetch on module load.
// Consuming components should call fetchMode() in their own useEffect,
// consistent with appStore / hardwareStore patterns.
//# sourceMappingURL=modeStore.js.map