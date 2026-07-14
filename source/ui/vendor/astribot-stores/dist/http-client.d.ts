/**
 * Astribot HTTP 客户端 -- 通过 Supervisor HTTP API 进行生命周期管理与 Meta 代理调用。
 */
import type { MetaStatus } from "./types.js";
type LifecycleActionResult = {
    result?: string;
};
export declare class HttpError extends Error {
    status: number;
    data?: unknown;
    stage?: string;
    constructor(status: number, message: string, data?: unknown);
}
export declare class RobotHttpClient {
    private baseUrl;
    /**
     * @param baseUrl - Supervisor HTTP 基础 URL，如 "http://localhost:8080"
     */
    constructor(baseUrl: string);
    /** 获取所有 Meta 状态 */
    getStatus(): Promise<MetaStatus[]>;
    /** 激活单个 Meta */
    activateMeta(meta: string): Promise<LifecycleActionResult>;
    /** 停用单个 Meta */
    deactivateMeta(meta: string): Promise<LifecycleActionResult>;
    /** 配置单个 Meta */
    configureMeta(meta: string, config?: Record<string, unknown>): Promise<LifecycleActionResult>;
    /** 关闭单个 Meta */
    shutdownMeta(meta: string): Promise<LifecycleActionResult>;
    /** 调用 Meta 代理方法 */
    callMeta<T = unknown>(metaName: string, method: string, kwargs?: Record<string, unknown>): Promise<T>;
    /** 调用 Release API */
    callRelease<T = unknown>(method: string, kwargs?: Record<string, unknown>): Promise<T>;
    /** GET /api/robot/<path> */
    robotGet<T = unknown>(path: string): Promise<T>;
    /** POST /api/robot/<path> with optional body */
    robotPost<T = unknown>(path: string, body?: Record<string, unknown>): Promise<T>;
    /** Stop chassis motion immediately */
    stopChassis<T = unknown>(): Promise<T>;
    /** 重启机器人主机（透传到 astribot_master_gateway 的 reboot_host 服务） */
    rebootHost(): Promise<{
        success?: boolean;
        steps?: string[];
        message?: string;
    }>;
    /** 关闭机器人主机（透传到 astribot_master_gateway 的 shutdown_host 服务） */
    shutdownHost(): Promise<{
        success?: boolean;
        steps?: string[];
        message?: string;
    }>;
    /** 获取当前机器人运行模式 */
    getMode(): Promise<{
        mode: string;
        allowed_metas: string[] | "all";
        apps_allowed: boolean;
    }>;
    /** 切换机器人运行模式 */
    setMode(mode: string): Promise<{
        mode: string;
        deactivated: string[];
        apps_stopped: string[];
    }>;
    /** 连接 WiFi（AP 模式下 gateway 先 enable_wifi 再 connect_wifi） */
    networkConnect(payload: {
        ssid: string;
        password?: string;
        timeout_sec?: number;
    }): Promise<{
        success: boolean;
        ip_address: string;
        error_code: string;
        error_message: string;
    }>;
    /** 重置网络为 AP 模式 */
    networkResetToAp(): Promise<{
        success: boolean;
        ap_ssid: string;
        ap_ip: string;
        error_message: string;
    }>;
    /** 获取等待本机确认的 OTA 更新 */
    getPendingOta(): Promise<{
        pending: boolean;
        task_uuid?: string;
        device_id?: string;
        bom_id?: string;
        message?: string;
        created_at?: string;
        policy?: string;
        status?: string;
        runner_task_id?: string;
        progress?: number;
        updated_at?: string;
        error?: string;
    }>;
    /** 清除等待确认的 OTA 更新提示 */
    dismissPendingOta(taskUuid?: string | null): Promise<{
        ok: boolean;
        pending: boolean;
        event_id?: string;
        error?: string;
    }>;
    /** 确认等待中的 OTA 更新提示 */
    acceptPendingOta(taskUuid?: string | null): Promise<{
        ok: boolean;
        pending: boolean;
        event_id?: string;
        bom_id?: string;
        error?: string;
    }>;
    /** 切换机器人运动控制模式（透传到 master_gateway -> astribot_web_server） */
    setMotionState(mode: string): Promise<{
        ok: boolean;
        mode: string;
        upstream?: unknown;
    }>;
    /** 校验运行模式管理密码，失败时抛出 HttpError(403) */
    verifyAdminPassword(password: string): Promise<void>;
    /** 获取当前运动控制模式 */
    getMotionState(): Promise<{
        ok: boolean;
        mode: "safe" | "professional" | "extremity" | "unknown";
        inconsistent?: boolean;
        module_modes?: Record<string, string>;
    }>;
    /** 获取音频配置（系统提示音开关 + 语言） */
    getAudioState(): Promise<{
        language: "zh" | "en";
        mute: boolean;
    }>;
    /** 更新音频配置 */
    setAudioState(payload: {
        language?: "zh" | "en";
        mute: boolean;
    }): Promise<{
        ok: boolean;
        language: "zh" | "en";
        mute: boolean;
    }>;
    getSpeakerVolume(): Promise<{
        ok: boolean;
        level: number;
    }>;
    setSpeakerVolume(payload: {
        level: number;
    }): Promise<{
        ok: boolean;
        level: number;
    }>;
    /** 启动日志打包任务 */
    startLogPackage(rangeDays: number | "all"): Promise<{
        ok: boolean;
        job_id: string;
        status: "running";
    }>;
    /** 查询日志打包任务状态 */
    getLogPackageStatus(jobId: string): Promise<{
        job_id: string;
        status: "running" | "done" | "failed";
        range_days: number | null;
        file_name?: string;
        file_path?: string;
        file_count?: number;
        error?: string;
    }>;
    /** 下载日志打包结果 */
    downloadLogPackage(jobId: string): Promise<Blob>;
    private get;
    private post;
    private getBlob;
}
export {};
//# sourceMappingURL=http-client.d.ts.map