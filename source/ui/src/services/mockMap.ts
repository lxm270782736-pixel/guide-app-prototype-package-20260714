/**
 * Mock 地图数据 + 预设点位（演示用，真实工程从后端 / 点位录制页拉取）
 *
 * 地图：200×160 栅格 · 0.1m/px = 20m × 16m 展厅平面
 *   - 外墙：4 边的栅格列设为占据
 *   - 内部隔断：模拟 2 个展厅分区的隔墙
 *   - 中央通道与展点周围：空闲
 *
 * 点位：5 个常用迎宾 / 讲解点，坐标以"地图原点 (0,0)"为参考。
 */

import type { MapData } from '@/types';

// ===================== 栅格生成 =====================

const WIDTH = 200;
const HEIGHT = 160;
const RESOLUTION = 0.1; // 米 / 像素
// 原点取展厅左下角；x 轴向右、y 轴向上
const ORIGIN = { x: -2.0, y: -4.0, orientation: 0 };

function buildOccupancyGrid(): number[] {
  // -1 = 未知 / 0 = 空闲 / 100 = 占据
  const data = new Array<number>(WIDTH * HEIGHT).fill(0);
  const idx = (x: number, y: number) => y * WIDTH + x;

  // 1) 外墙：四边 3 像素厚
  for (let i = 0; i < WIDTH; i++) {
    for (let t = 0; t < 3; t++) {
      data[idx(i, t)] = 100;                  // 底
      data[idx(i, HEIGHT - 1 - t)] = 100;     // 顶
    }
  }
  for (let j = 0; j < HEIGHT; j++) {
    for (let t = 0; t < 3; t++) {
      data[idx(t, j)] = 100;                  // 左
      data[idx(WIDTH - 1 - t, j)] = 100;      // 右
    }
  }

  // 2) 内部隔墙 1：竖向，把展厅切成左右两区，但留一个走道
  //    位置在 x = 80（地图坐标），y 从 30 到 130，第 y=70..90 为走道开口
  for (let j = 30; j < HEIGHT - 30; j++) {
    if (j >= 70 && j < 90) continue; // 通道开口
    for (let t = 0; t < 2; t++) {
      data[idx(80 + t, j)] = 100;
    }
  }

  // 3) 内部隔墙 2：右半区水平隔墙，把右半区切成两个展厅
  //    位置在 y = 80，x 从 82 到 160，留一个开口在 x=120..140
  for (let i = 82; i < WIDTH - 30; i++) {
    if (i >= 120 && i < 140) continue;
    for (let t = 0; t < 2; t++) {
      data[idx(i, 80 + t)] = 100;
    }
  }

  // 4) 几个柱子 / 展品占位（4×4 占据块）
  const obstacles: Array<[number, number]> = [
    [40, 50],   // 接待区柱
    [40, 110],  // 左厅展品 1
    [60, 130],  // 左厅展品 2
    [120, 40],  // 二号厅展品 1
    [150, 110], // 一号厅展品 2
  ];
  for (const [cx, cy] of obstacles) {
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        const x = cx + dx, y = cy + dy;
        if (x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT) data[idx(x, y)] = 100;
      }
    }
  }

  return data;
}

/** Mock 地图，结构与真实 MapData 完全一致，可直接喂给 MapCanvas */
export const MOCK_MAP: MapData = {
  id: 'mock_exhibition_hall',
  name: '示例：星尘展厅',
  createdAt: '2026-06-21T00:00:00.000Z',
  thumbnail: '',
  width: WIDTH,
  height: HEIGHT,
  resolution: RESOLUTION,
  origin: ORIGIN,
  data: buildOccupancyGrid(),
  localOnly: true,
};

// ===================== 预设点位（与地图坐标对齐） =====================

export interface PresetWaypoint {
  id: string;
  name: string;
  /** 用途分类：用于在地图上配色 / 过滤 */
  category: 'welcome' | 'speech' | 'move' | 'general';
  x: number;
  y: number;
  theta: number;
}

export const PRESET_WAYPOINTS: PresetWaypoint[] = [
  { id: 'wp_entrance',  name: '展厅入口',     category: 'welcome', x: 0.0,  y: -2.5, theta: 0 },
  { id: 'wp_reception', name: '接待台',       category: 'welcome', x: 1.0,  y: 0.0,  theta: Math.PI / 2 },
  { id: 'wp_corridor',  name: '中央通道',     category: 'move',    x: 6.0,  y: 4.0,  theta: 0 },
  { id: 'wp_hall1',     name: '一号厅展品 A', category: 'speech',  x: 13.0, y: 7.0,  theta: -Math.PI / 2 },
  { id: 'wp_hall1_b',   name: '一号厅展品 B', category: 'speech',  x: 15.0, y: 7.0,  theta: -Math.PI / 2 },
  { id: 'wp_hall2_a',   name: '二号厅展品 C', category: 'speech',  x: 12.0, y: 0.5,  theta: Math.PI / 2 },
  { id: 'wp_vip',       name: 'VIP 接待区',   category: 'welcome', x: 4.0,  y: -2.0, theta: -Math.PI / 2 },
];

/** 根据坐标反查 preset id（容差 1e-3 米） */
export function findPresetWaypointId(wp: { x: number; y: number } | null | undefined): string {
  if (!wp) return '';
  return (
    PRESET_WAYPOINTS.find(
      (p) => Math.abs(p.x - wp.x) < 1e-3 && Math.abs(p.y - wp.y) < 1e-3,
    )?.id ?? ''
  );
}

/** 按 id 取点位 */
export function getPresetWaypoint(id: string): PresetWaypoint | undefined {
  return PRESET_WAYPOINTS.find((p) => p.id === id);
}
