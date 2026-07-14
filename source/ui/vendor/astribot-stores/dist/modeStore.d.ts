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
/** Supervisor 定义的 7 种机器人运行模式 */
export type RobotMode = 'idle' | 'standby' | 'teleop' | 'autonomous' | 'charging' | 'emergency' | 'maintenance';
/** GET /api/mode 响应 */
export interface ModeInfo {
    mode: RobotMode;
    allowed_metas: string[] | 'all';
    apps_allowed: boolean;
}
/** POST /api/mode 成功响应 */
export interface ModeTransitionResult {
    mode: string;
    deactivated: string[];
    apps_stopped: string[];
}
export interface ModeState {
    /** 当前模式 */
    currentMode: RobotMode;
    /** 当前模式允许的 Meta 列表（'all' 表示无限制） */
    allowedMetas: string[] | 'all';
    /** 当前模式是否允许启动 App */
    appsAllowed: boolean;
    /** 是否正在切换模式 */
    isSwitching: boolean;
    /** 最近一次切换的结果 */
    lastTransition: ModeTransitionResult | null;
    /** 错误信息 */
    error: string | null;
    /** 是否已成功获取过模式（区分初始状态和真实 idle） */
    initialized: boolean;
}
export interface ModeStore extends ModeState {
    /** 从 Supervisor 获取当前模式 */
    fetchMode(): Promise<void>;
    /** 切换到目标模式 */
    setMode(target: RobotMode): Promise<ModeTransitionResult>;
    /** 清除错误 */
    clearError(): void;
}
export declare const VALID_TRANSITIONS: Record<RobotMode, Set<RobotMode>>;
/** EMERGENCY 可从任何模式进入 */
export declare function canTransition(from: RobotMode, to: RobotMode): boolean;
export declare const ALL_MODES: RobotMode[];
export interface ModeMetadata {
    key: RobotMode;
    label: string;
    desc: string;
    /** lucide-react icon name */
    iconName: string;
    /** Tailwind color class for the active state */
    color: string;
}
export declare const MODE_METADATA: ModeMetadata[];
/** 从 activate 返回值中解析 mode blocked 信息 */
export declare function parseModeBlocked(result: string): {
    blocked: true;
    mode: string;
} | null;
/** 从 launch 错误信息中解析 mode blocked 信息 */
export declare function parseAppModeBlocked(errorMsg: string): {
    blocked: true;
    mode: string;
} | null;
/** 获取模式中文名 — TODO: i18n */
export declare function getModeChinese(mode: string): string;
export declare const useModeStore: import("zustand").UseBoundStore<import("zustand").StoreApi<ModeStore>>;
export declare function useCurrentMode(): RobotMode;
export declare function useIsModeSwitching(): boolean;
export declare function useModeError(): string | null;
export declare function useAppsAllowed(): boolean;
//# sourceMappingURL=modeStore.d.ts.map