/**
 * Robot Store
 * 管理与 Supervisor 的连接（HTTP），提供 SDK 客户端单例。
 * 通过 SSE 订阅 Meta 状态推送。
 */
import { RobotHttpClient } from './http-client';
import type { MetaStatus } from './types';
export interface RobotState {
    /** Supervisor HTTP 基础 URL */
    supervisorUrl: string;
    /** HTTP 客户端单例 */
    httpClient: RobotHttpClient;
    /** 所有 Meta 状态（由 SSE 推送更新） */
    metaStatuses: MetaStatus[];
    /** SSE 连接状态 */
    sseConnected: boolean;
}
export interface RobotStore extends RobotState {
    /** 更新 Supervisor URL 并重建客户端 */
    setSupervisorUrl(url: string): void;
}
export declare const useRobotStore: import("zustand").UseBoundStore<import("zustand").StoreApi<RobotStore>>;
/** 获取 HTTP 客户端单例（不触发 React 重渲染） */
export declare function getRobotHttpClient(): RobotHttpClient;
/** Enable/disable joint streaming. Reconnects SSE with updated query param. */
export declare function enableJointStream(enable: boolean): void;
/** Get the shared EventSource for adding listeners from other stores */
export declare function getSSE(): EventSource | null;
/** Register a listener on the shared SSE. Retries if SSE not yet connected. */
export declare function onSSEEvent(event: string, handler: (data: string) => void): () => void;
/** 获取指定 Meta 的状态 */
export declare function useMetaStatus(metaName: string): MetaStatus | undefined;
/** 判断指定 Meta 是否处于 active 状态 */
export declare function useIsMetaActive(metaName: string): boolean;
//# sourceMappingURL=robotStore.d.ts.map