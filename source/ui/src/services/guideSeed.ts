/**
 * 演示用初始任务数据 mock（一期：F01/F03/F04/F07）
 * 仅使用：
 *   - 主步骤：主动迎宾(WELCOME) / 定点讲解(POI_SPEECH)
 *   - 子步骤：讲解(POI_SPEECH) / 动作(TRAJECTORY)
 *
 * 版本号变化时 guideStorage 会自动覆盖旧 localStorage。
 */

import { getPresetWaypoint } from './mockMap';
import {
  createDefaultBreathingConfig,
  createDefaultVoiceConfig,
  createPOISpeechStep,
  createSubStep,
  createTrajectoryStep,
  createWelcomeStep,
  GuideStep,
  GuideTask,
} from '@/types';

// 升一期范围相关的 seed 版本，保证旧浏览器数据失效
export const SEED_VERSION = 'guide-seed-v5-phase1';

function ts(daysAgo = 0): string {
  return new Date(Date.now() - daysAgo * 86400_000).toISOString();
}

/** 迎宾步骤：含子步骤（迎宾时执行挥手动作） */
function buildWelcome(): GuideStep {
  const w = createWelcomeStep('入口主动迎宾');
  const wpEntrance = getPresetWaypoint('wp_entrance')!;
  w.config.waypoint = { x: wpEntrance.x, y: wpEntrance.y, theta: wpEntrance.theta };
  w.config.standbyHeading = wpEntrance.theta;
  w.config.triggerDistance = 1.5;
  w.config.cooldownSec = 5;
  w.config.prompts = [
    {
      id: 'p_welcome_1',
      text: '欢迎来到星尘展厅，我是讲解机器人小星，很高兴见到您！',
      actionIds: ['wave'],
      actionPlayMode: 'fixed',
      audioDuration: 6,
    },
    {
      id: 'p_welcome_2',
      text: '您好，欢迎光临！请跟我来一起参观展厅吧。',
      actionIds: ['bow'],
      actionPlayMode: 'fixed',
      audioDuration: 5,
    },
  ];
  // F04 子步骤示例：迎宾完成后接一个挥手动作
  const traj = createTrajectoryStep('挥手动作');
  traj.config = { trajectoryId: 'wave_hi', speed: 0.5, loop: false };
  w.subSteps = [createSubStep(traj, 'parallel')];
  return w;
}

/** 讲解步骤工厂 */
function buildPOI(name: string, wpId: string, script: string, withSubs = false): GuideStep {
  const p = createPOISpeechStep(name);
  const wp = getPresetWaypoint(wpId)!;
  p.config.waypoint = { x: wp.x, y: wp.y, theta: wp.theta };
  p.config.script = script;
  p.config.audioDuration = Math.max(8, Math.round(script.length / 4));
  p.config.startDelaySec = 1;
  p.config.allowInterrupt = true;

  if (withSubs) {
    // F04-2 子步骤示例：讲解 + 动作
    const traj = createTrajectoryStep('讲解配合手势');
    traj.config = { trajectoryId: 'point_forward', speed: 0.5, loop: false };
    const subPOI = createPOISpeechStep('补充讲解');
    subPOI.config.script = '此外，机器人还能通过语音交互响应观众的提问，欢迎大家试试。';
    subPOI.config.audioDuration = 8;
    subPOI.config.startDelaySec = 0;
    p.subSteps = [
      { ...createSubStep(traj, 'parallel'), startOffsetSec: 2, durationOverrideSec: 4 },
      { ...createSubStep(subPOI, 'parallel'), startOffsetSec: 5 },
    ];
  }
  return p;
}

// ===================== 任务 1：完整展厅导览 =====================
function task1FullTour(): GuideTask {
  const welcome = buildWelcome();
  const poiHall1A = buildPOI(
    '一号厅展品 A 讲解',
    'wp_hall1',
    '这件展品是我们展厅的核心展项之一。它展示了机器人在真实场景中的导航、讲解与互动能力，欢迎大家近距离观察。',
    true,
  );
  const poiHall1B = buildPOI(
    '一号厅展品 B 讲解',
    'wp_hall1_b',
    '这是展厅的第二件核心展品，展示了机器人语音交互能力和多模态感知。请观察它如何识别人脸并主动问候。',
  );
  const poiHall2 = buildPOI(
    '二号厅展品 C 讲解',
    'wp_hall2_a',
    '欢迎来到二号厅，这里展示的是机器人在巡检和接待中的应用场景，可以看到它如何在不同环境中适应任务需求。',
  );

  return {
    id: 'task_full_tour',
    name: '完整展厅导览',
    description: '入口迎宾 → 一号厅 2 件展品 → 二号厅 1 件展品',
    steps: [welcome, poiHall1A, poiHall1B, poiHall2],
    voice: createDefaultVoiceConfig(),
    breathing: createDefaultBreathingConfig(),
    createdAt: ts(7),
    updatedAt: ts(0),
    published: true,
  };
}

// ===================== 任务 2：VIP 接待迎宾 =====================
function task2WelcomeOnly(): GuideTask {
  const w = createWelcomeStep('VIP 接待迎宾');
  const wpVip = getPresetWaypoint('wp_vip')!;
  w.config.waypoint = { x: wpVip.x, y: wpVip.y, theta: wpVip.theta };
  w.config.standbyHeading = wpVip.theta;
  w.config.triggerDistance = 2.0;
  w.config.cooldownSec = 8;
  w.config.prompts = [
    {
      id: 'p_vip_1',
      text: '尊敬的贵宾您好，欢迎莅临星尘智能展厅。',
      actionIds: ['salute'],
      actionPlayMode: 'fixed',
      audioDuration: 5,
    },
  ];

  return {
    id: 'task_vip_welcome',
    name: 'VIP 接待迎宾',
    description: '仅在 VIP 接待区进行主动迎宾，触发距离 2m',
    steps: [w],
    voice: createDefaultVoiceConfig(),
    breathing: createDefaultBreathingConfig(),
    createdAt: ts(3),
    updatedAt: ts(1),
    published: true,
  };
}

// ===================== 任务 3：单展品深度讲解（含子步骤演示） =====================
function task3SingleSpot(): GuideTask {
  const poi = buildPOI(
    '展品 A 详细讲解',
    'wp_hall1',
    '欢迎来到星尘展厅的核心展项区。本展项搭载了我们最新的导航与人机交互技术，' +
    '机器人能在真实展厅中主动迎宾、自主讲解、并响应观众的语音提问。',
    true,
  );
  return {
    id: 'task_single_spot',
    name: '单展品深度讲解',
    description: '到点讲解，含「讲解 + 动作」双子步骤一起执行',
    steps: [poi],
    voice: createDefaultVoiceConfig(),
    breathing: createDefaultBreathingConfig(),
    createdAt: ts(2),
    updatedAt: ts(0),
    published: false,
  };
}

export function buildSeedTasks(): GuideTask[] {
  return [task1FullTour(), task2WelcomeOnly(), task3SingleSpot()];
}
