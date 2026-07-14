/**
 * Astribot HTTP 客户端 -- 通过 Supervisor HTTP API 进行生命周期管理与 Meta 代理调用。
 */
export class HttpError extends Error {
    status;
    data;
    stage;
    constructor(status, message, data) {
        super(message);
        this.name = 'HttpError';
        this.status = status;
        this.data = data;
        if (data && typeof data === 'object' && 'stage' in data) {
            this.stage = typeof data.stage === 'string' ? data.stage : undefined;
        }
    }
}
export class RobotHttpClient {
    baseUrl;
    /**
     * @param baseUrl - Supervisor HTTP 基础 URL，如 "http://localhost:8080"
     */
    constructor(baseUrl) {
        this.baseUrl = baseUrl.replace(/\/+$/, "");
    }
    // -------------------------------------------------------------------
    // 生命周期方法
    // -------------------------------------------------------------------
    /** 获取所有 Meta 状态 */
    async getStatus() {
        return this.post("/api/lifecycle/status");
    }
    /** 激活单个 Meta */
    async activateMeta(meta) {
        return this.post("/api/lifecycle/activate", { meta });
    }
    /** 停用单个 Meta */
    async deactivateMeta(meta) {
        return this.post("/api/lifecycle/deactivate", { meta });
    }
    /** 配置单个 Meta */
    async configureMeta(meta, config) {
        return this.post("/api/lifecycle/configure", { meta, config });
    }
    /** 关闭单个 Meta */
    async shutdownMeta(meta) {
        return this.post("/api/lifecycle/shutdown", { meta });
    }
    // -------------------------------------------------------------------
    // Meta 代理方法
    // -------------------------------------------------------------------
    /** 调用 Meta 代理方法 */
    async callMeta(metaName, method, kwargs) {
        const result = await this.post(`/api/meta/${metaName}/${method}`, kwargs);
        return result.result;
    }
    /** 调用 Release API */
    async callRelease(method, kwargs) {
        const result = await this.post(`/api/release/${method}`, kwargs);
        return result.result;
    }
    // -------------------------------------------------------------------
    // Direct SDK robot control
    // -------------------------------------------------------------------
    /** GET /api/robot/<path> */
    async robotGet(path) {
        return this.get(`/api/robot/${path}`);
    }
    /** POST /api/robot/<path> with optional body */
    async robotPost(path, body) {
        return this.post(`/api/robot/${path}`, body);
    }
    /** Stop chassis motion immediately */
    async stopChassis() {
        return this.post('/api/robot/stop_chassis');
    }
    /** 重启机器人主机（透传到 astribot_master_gateway 的 reboot_host 服务） */
    async rebootHost() {
        return this.post("/api/robot/reboot");
    }
    /** 关闭机器人主机（透传到 astribot_master_gateway 的 shutdown_host 服务） */
    async shutdownHost() {
        return this.post("/api/robot/shutdown_host");
    }
    // -------------------------------------------------------------------
    // Robot mode
    // -------------------------------------------------------------------
    /** 获取当前机器人运行模式 */
    async getMode() {
        return this.get("/api/mode");
    }
    /** 切换机器人运行模式 */
    async setMode(mode) {
        return this.post("/api/mode", { mode });
    }
    /** 连接 WiFi（AP 模式下 gateway 先 enable_wifi 再 connect_wifi） */
    async networkConnect(payload) {
        return this.post('/api/network/connect', payload);
    }
    /** 重置网络为 AP 模式 */
    async networkResetToAp() {
        return this.post('/api/network/reset_to_ap');
    }
    /** 获取等待本机确认的 OTA 更新 */
    async getPendingOta() {
        return this.get("/api/ota/pending");
    }
    /** 清除等待确认的 OTA 更新提示 */
    async dismissPendingOta(taskUuid) {
        return this.post("/api/ota/dismiss", taskUuid ? { task_uuid: taskUuid } : undefined);
    }
    /** 确认等待中的 OTA 更新提示 */
    async acceptPendingOta(taskUuid) {
        return this.post("/api/ota/accept", taskUuid ? { task_uuid: taskUuid } : undefined);
    }
    /** 切换机器人运动控制模式（透传到 master_gateway -> astribot_web_server） */
    async setMotionState(mode) {
        return this.post("/api/robot/motion_state", { mode });
    }
    /** 校验运行模式管理密码，失败时抛出 HttpError(403) */
    async verifyAdminPassword(password) {
        await this.post("/api/robot/verify_admin_password", { password });
    }
    /** 获取当前运动控制模式 */
    async getMotionState() {
        return this.get("/api/robot/motion_state");
    }
    // -------------------------------------------------------------------
    // Settings
    // -------------------------------------------------------------------
    /** 获取音频配置（系统提示音开关 + 语言） */
    async getAudioState() {
        return this.get("/api/settings/audio");
    }
    /** 更新音频配置 */
    async setAudioState(payload) {
        return this.post("/api/settings/audio", payload);
    }
    async getSpeakerVolume() {
        return this.get("/api/settings/speaker/volume");
    }
    async setSpeakerVolume(payload) {
        return this.post("/api/settings/speaker/volume", payload);
    }
    /** 启动日志打包任务 */
    async startLogPackage(rangeDays) {
        return this.post("/api/settings/logs/package", { range_days: rangeDays });
    }
    /** 查询日志打包任务状态 */
    async getLogPackageStatus(jobId) {
        return this.get(`/api/settings/logs/package/${jobId}`);
    }
    /** 下载日志打包结果 */
    async downloadLogPackage(jobId) {
        return this.getBlob(`/api/settings/logs/package/${jobId}/download`);
    }
    // -------------------------------------------------------------------
    // 内部
    // -------------------------------------------------------------------
    async get(path) {
        const url = this.baseUrl ? `${this.baseUrl}${path}` : path;
        console.log('[RobotHttpClient] GET request URL:', url);
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new HttpError(response.status, err.error ?? `HTTP ${response.status}`, err);
        }
        return response.json();
    }
    async post(path, body) {
        const url = this.baseUrl ? `${this.baseUrl}${path}` : path;
        console.log('[RobotHttpClient] POST request URL:', url);
        const response = await fetch(url, {
            method: "POST",
            cache: "no-store",
            headers: { "Content-Type": "application/json" },
            body: body ? JSON.stringify(body) : undefined,
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new HttpError(response.status, err.error ?? `HTTP ${response.status}`, err);
        }
        return response.json();
    }
    async getBlob(path) {
        const url = this.baseUrl ? `${this.baseUrl}${path}` : path;
        const response = await fetch(url);
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error ?? `HTTP ${response.status}`);
        }
        return response.blob();
    }
}
//# sourceMappingURL=http-client.js.map