/**
 * 导览任务本地持久化（623 版本，演示用）
 * - 本期不调后端，所有任务保存在 localStorage
 * - 同步同名 key 的发布快照，模拟"发布即下发"
 * - 通过 SEED_VERSION 控制初始数据；版本升级自动重 seed
 */

import type { GuideTask } from '@/types';
import { buildSeedTasks, SEED_VERSION } from './guideSeed';

const STORAGE_KEY = 'guide_tasks_v623';
const PUBLISHED_KEY = 'guide_tasks_v623_published';
const SEED_VERSION_KEY = 'guide_tasks_v623_seed_version';

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn('[guideStorage] read failed', key, err);
    return fallback;
  }
}

function safeWrite(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('[guideStorage] write failed', key, err);
  }
}

export const guideStorage = {
  loadTasks(): GuideTask[] {
    const currentVersion = safeRead<string>(SEED_VERSION_KEY, '');
    const tasks = safeRead<GuideTask[]>(STORAGE_KEY, []);

    // 版本升级 / 首次进入：用最新 seed 重置
    if (currentVersion !== SEED_VERSION || tasks.length === 0) {
      const seed = buildSeedTasks();
      safeWrite(STORAGE_KEY, seed);
      safeWrite(SEED_VERSION_KEY, SEED_VERSION);
      // 已发布的任务同步进 published 快照
      const snapshots: Record<string, GuideTask> = {};
      seed.filter((t) => t.published).forEach((t) => { snapshots[t.id] = t; });
      safeWrite(PUBLISHED_KEY, snapshots);
      return seed;
    }
    return tasks;
  },

  saveTask(task: GuideTask): void {
    const tasks = guideStorage.loadTasks();
    const idx = tasks.findIndex((t) => t.id === task.id);
    const next = { ...task, updatedAt: new Date().toISOString() };
    if (idx >= 0) {
      tasks[idx] = next;
    } else {
      tasks.push(next);
    }
    safeWrite(STORAGE_KEY, tasks);
  },

  saveAll(tasks: GuideTask[]): void {
    safeWrite(STORAGE_KEY, tasks);
  },

  deleteTask(taskId: string): void {
    const tasks = guideStorage.loadTasks().filter((t) => t.id !== taskId);
    safeWrite(STORAGE_KEY, tasks);
  },

  /** 发布：把任务标记为 published 并写入 published 快照（模拟下发到机器人端） */
  publishTask(task: GuideTask): GuideTask {
    const published: GuideTask = {
      ...task,
      published: true,
      updatedAt: new Date().toISOString(),
    };
    guideStorage.saveTask(published);
    const snapshots = safeRead<Record<string, GuideTask>>(PUBLISHED_KEY, {});
    snapshots[task.id] = published;
    safeWrite(PUBLISHED_KEY, snapshots);
    return published;
  },

  loadPublishedSnapshot(taskId: string): GuideTask | null {
    const snapshots = safeRead<Record<string, GuideTask>>(PUBLISHED_KEY, {});
    return snapshots[taskId] ?? null;
  },
};
