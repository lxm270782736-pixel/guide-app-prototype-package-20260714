/**
 * 导览任务编排类型定义（623 版本，对应 PRD v0.7 / v1.6）
 *
 * 子步骤数据模型：
 * - SubStepConfig.step 直接嵌套一个 GuideStep（与主步骤同构），
 *   外层 SubStepConfig 只负责执行模式 / 起止时间 / 启用开关。
 */

import type { Pose } from './index';

// ==================== 主步骤类型 ====================

export enum GuideStepType {
  /** 主动迎宾（F01） */
  WELCOME = 'welcome',
  /** 定点讲解（F03） */
  POI_SPEECH = 'poi_speech',
  /** 移动到点位（导览中通用步骤） */
  MOVE = 'move',
  /** 等待 / 停留 */
  WAIT = 'wait',
  /** 通用动作组合（仅作为容器） */
  COMPOSITE = 'composite',

  // —— 以下沿用项目原有的 TaskType，作为子步骤可选类型 ——
  /** 拍照 */
  PHOTO = 'photo',
  /** 执行预设轨迹 */
  TRAJECTORY = 'trajectory',
  /** 环境扫描 */
  SCAN = 'scan',
  /** 目标检测 */
  INSPECT = 'inspect',
  /** 播放声音 / 语音 */
  SOUND = 'sound',
  /** 屏幕显示信息 */
  DISPLAY = 'display',
  /** 信号灯 */
  SIGNAL = 'signal',
  /** 拾取物体 */
  PICKUP = 'pickup',
  /** 放置物体 */
  PLACE = 'place',
  /** 充电 */
  CHARGE = 'charge',
}

export const GUIDE_STEP_LABELS: Record<GuideStepType, string> = {
  [GuideStepType.WELCOME]: '主动迎宾',
  [GuideStepType.POI_SPEECH]: '定点讲解',
  [GuideStepType.MOVE]: '移动',
  [GuideStepType.WAIT]: '等待',
  [GuideStepType.COMPOSITE]: '组合步骤',
  [GuideStepType.PHOTO]: '拍照',
  [GuideStepType.TRAJECTORY]: '执行轨迹',
  [GuideStepType.SCAN]: '环境扫描',
  [GuideStepType.INSPECT]: '目标检测',
  [GuideStepType.SOUND]: '播放声音',
  [GuideStepType.DISPLAY]: '屏幕显示',
  [GuideStepType.SIGNAL]: '信号灯',
  [GuideStepType.PICKUP]: '拾取',
  [GuideStepType.PLACE]: '放置',
  [GuideStepType.CHARGE]: '充电',
};

// ==================== F01 主动迎宾配置 ====================

/** 一条迎宾话术绑定一组动作 */
export interface WelcomePrompt {
  id: string;
  text: string;
  actionIds: string[];
  /** 多动作播放方式 */
  actionPlayMode: 'fixed' | 'random';
  /** 生成的音频时长（秒），null 表示未生成 */
  audioDuration?: number | null;
}

export interface WelcomeStepConfig {
  /** 迎宾点位（必填）*/
  waypoint: Pose | null;
  /** 待命朝向（角度，弧度）*/
  standbyHeading: number | null;
  /** 触发距离（m），范围 0.5-3，默认 1.5 */
  triggerDistance: number;
  /** 迎宾话术列表（至少 1 条） */
  prompts: WelcomePrompt[];
  /** 冷却时间（秒），默认 5 */
  cooldownSec: number;
}

// ==================== F03 定点讲解配置 ====================

export interface POISpeechInterruptConfig {
  /** 最大对话轮次 */
  maxRounds: number;
  /** 最大对话时长（秒） */
  maxDurationSec: number;
  /** 结束提示语 */
  endingPrompt: string;
}

export type POISpeechResumeStrategy = 'continue' | 'skip' | 'stay';

export interface POISpeechConfig {
  /** 讲解点位 */
  waypoint: Pose | null;
  /** 讲解稿（≤500 字） */
  script: string;
  /** 生成的音频时长（秒），由"生成音频"动作得出 */
  audioDuration: number | null;
  /** 进入步骤后等待开始时间（秒），默认 0 */
  startDelaySec: number;
  /** 是否允许被语音交互打断 */
  allowInterrupt: boolean;
  /** 打断后细则 */
  interruptConfig: POISpeechInterruptConfig;
  /** 对话结束后处理方式 */
  resumeStrategy: POISpeechResumeStrategy;
  /** 续讲前等待时长（秒），固定 1s */
  resumeWaitSec: number;
}

// ==================== F04 子步骤 ====================

export type SubStepExecutionMode = 'parallel' | 'sequence';

export interface SubStepConfig {
  id: string;
  /** 子步骤复用主步骤同构类型（WELCOME/POI_SPEECH/MOVE/WAIT 等） */
  step: GuideStep;
  /** 执行方式（同时 / 依次） */
  executionMode: SubStepExecutionMode;
  /** 相对主步骤的开始时间（秒），sequence 模式下表示相对上一个子步骤结束 */
  startOffsetSec: number;
  /** 期望执行时长（秒），可选，覆盖任务自身时长 */
  durationOverrideSec?: number;
  enabled: boolean;
}

// ==================== F02 任务级语音交互配置 ====================

export type VoiceActiveState = 'welcome' | 'idle' | 'guiding' | 'moving';

export const VOICE_ACTIVE_STATE_LABELS: Record<VoiceActiveState, string> = {
  welcome: '主动迎宾',
  idle: '空闲待机',
  guiding: '导览中（讲解 / 等待）',
  moving: '移动中（本期不生效）',
};

/** 单条语音指令 */
export interface VoiceCommandConfig {
  id: string;
  enabled: boolean;
  /** 指令名称 */
  name: string;
  /** 识别说法（多个） */
  sayings: string[];
  /** 生效状态 */
  activeStates: VoiceActiveState[];
  /** 执行内容描述（pause/resume/jump/say/action 等） */
  action: {
    type: 'pause' | 'resume' | 'jump' | 'say' | 'play_action' | 'custom';
    /** 跳转步骤 id（type=jump） */
    targetStepId?: string;
    /** 播放话术（type=say） */
    text?: string;
    /** 播放动作（type=play_action） */
    actionId?: string;
    /** 自定义描述 */
    custom?: string;
  };
}

export interface VoiceInteractionConfig {
  /** 唤醒词语音交互开关 */
  enabled: boolean;
  /** 结束对话等待时长（秒），默认 5 */
  endWaitSec: number;
  /** 唤醒后回应话术（仅"只说唤醒词"时播放） */
  wakeupReplyText: string;
  /** 唤醒后收音时长（秒），默认 10 */
  recordSec: number;
  /** 唤醒生效状态（移动状态本期固定不生效） */
  activeStates: VoiceActiveState[];
  /** 语音指令开关（任务级） */
  commandsEnabled: boolean;
  /** 语音指令列表 */
  commands: VoiceCommandConfig[];
}

// ==================== F05 呼吸感动作配置 ====================

export interface BreathingActionConfig {
  enabled: boolean;
  /** 备选动作 ID 列表 */
  actionIds: string[];
  /** 播放方式 */
  playMode: 'fixed' | 'random';
}

// ==================== 主步骤聚合 ====================

export interface GuideStepBase {
  id: string;
  type: GuideStepType;
  /** 步骤名称（编辑器内显示） */
  name: string;
  /** 子步骤（F04） */
  subSteps: SubStepConfig[];
  /** 描述（可选） */
  description?: string;
}

export interface WelcomeStep extends GuideStepBase {
  type: GuideStepType.WELCOME;
  config: WelcomeStepConfig;
}

export interface POISpeechStep extends GuideStepBase {
  type: GuideStepType.POI_SPEECH;
  config: POISpeechConfig;
}

export interface MoveStep extends GuideStepBase {
  type: GuideStepType.MOVE;
  config: {
    waypoint: Pose | null;
    /** 到点后朝向（弧度） */
    heading: number | null;
  };
}

export interface WaitStep extends GuideStepBase {
  type: GuideStepType.WAIT;
  config: {
    durationSec: number;
  };
}

export interface CompositeStep extends GuideStepBase {
  type: GuideStepType.COMPOSITE;
  config: Record<string, never>;
}

// —— 沿用 TaskType 风格的步骤类型（配置项贴近原工程任务参数） ——

export interface PhotoStep extends GuideStepBase {
  type: GuideStepType.PHOTO;
  config: { cameraId: string; resolution: string; format: 'jpg' | 'png'; count: number };
}
export interface TrajectoryStep extends GuideStepBase {
  type: GuideStepType.TRAJECTORY;
  config: { trajectoryId: string; speed: number; loop: boolean };
}
export interface ScanStep extends GuideStepBase {
  type: GuideStepType.SCAN;
  config: { scanType: '3d' | '2d' | 'thermal'; durationSec: number };
}
export interface InspectStep extends GuideStepBase {
  type: GuideStepType.INSPECT;
  config: { targetType: string; confidenceThreshold: number };
}
export interface SoundStep extends GuideStepBase {
  type: GuideStepType.SOUND;
  config: { text: string; volume: number; language: string };
}
export interface DisplayStep extends GuideStepBase {
  type: GuideStepType.DISPLAY;
  config: { message: string; durationSec: number; position: 'top' | 'center' | 'bottom' };
}
export interface SignalStep extends GuideStepBase {
  type: GuideStepType.SIGNAL;
  config: { pattern: 'blink' | 'pulse' | 'solid' | 'off'; color: string; durationSec: number };
}
export interface PickupStep extends GuideStepBase {
  type: GuideStepType.PICKUP;
  config: { objectId: string; graspType: 'top' | 'side' | 'custom' };
}
export interface PlaceStep extends GuideStepBase {
  type: GuideStepType.PLACE;
  config: { location: Pose | null; placeType: 'gentle' | 'normal' | 'drop' };
}
export interface ChargeStep extends GuideStepBase {
  type: GuideStepType.CHARGE;
  config: { targetLevel: number; chargingStationId: string };
}

export type GuideStep =
  | WelcomeStep | POISpeechStep | MoveStep | WaitStep | CompositeStep
  | PhotoStep | TrajectoryStep | ScanStep | InspectStep
  | SoundStep | DisplayStep | SignalStep
  | PickupStep | PlaceStep | ChargeStep;

// ==================== 任务 ====================

export interface GuideTask {
  id: string;
  name: string;
  description?: string;
  steps: GuideStep[];
  voice: VoiceInteractionConfig;
  breathing: BreathingActionConfig;
  createdAt: string;
  updatedAt: string;
  /** 是否已发布（保存 = 草稿，发布 = 下发） */
  published: boolean;
}

// ==================== 校验报告（F06-1） ====================

export type ConflictSeverity = 'error' | 'warning';

export interface ConflictItem {
  severity: ConflictSeverity;
  /** 主步骤 id */
  stepId: string;
  /** 子步骤 id（可选） */
  subStepId?: string;
  code:
    | 'missing_waypoint'
    | 'missing_heading'
    | 'missing_prompt'
    | 'script_too_long'
    | 'chassis_conflict'
    | 'rotation_conflict'
    | 'actuator_conflict'
    | 'substep_overlap'
    | 'invalid_trigger_distance'
    | 'invalid_cooldown';
  message: string;
}

export interface ConflictReport {
  ok: boolean;
  items: ConflictItem[];
}

// ==================== 默认值工厂 ====================

export const DEFAULT_TRIGGER_DISTANCE = 1.5;
export const DEFAULT_COOLDOWN_SEC = 5;
export const DEFAULT_VOICE_END_WAIT_SEC = 5;
export const DEFAULT_VOICE_RECORD_SEC = 10;
export const DEFAULT_INTERRUPT_ENDING = '稍等，我们参观完，再给你解答哈';
export const DEFAULT_RESUME_WAIT_SEC = 1;
export const SCRIPT_MAX_CHARS = 500;
export const TRIGGER_DISTANCE_MIN = 0.5;
export const TRIGGER_DISTANCE_MAX = 3;

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`;
}

export function createWelcomeStep(name = '主动迎宾'): WelcomeStep {
  return {
    id: nextId('step'),
    type: GuideStepType.WELCOME,
    name,
    subSteps: [],
    config: {
      waypoint: null,
      standbyHeading: null,
      triggerDistance: DEFAULT_TRIGGER_DISTANCE,
      prompts: [
        {
          id: nextId('prompt'),
          text: '欢迎来到展厅，我是讲解机器人',
          actionIds: [],
          actionPlayMode: 'random',
        },
      ],
      cooldownSec: DEFAULT_COOLDOWN_SEC,
    },
  };
}

export function createPOISpeechStep(name = '定点讲解'): POISpeechStep {
  return {
    id: nextId('step'),
    type: GuideStepType.POI_SPEECH,
    name,
    subSteps: [],
    config: {
      waypoint: null,
      script: '',
      audioDuration: null,
      startDelaySec: 0,
      allowInterrupt: true,
      interruptConfig: {
        maxRounds: 3,
        maxDurationSec: 60,
        endingPrompt: DEFAULT_INTERRUPT_ENDING,
      },
      resumeStrategy: 'continue',
      resumeWaitSec: DEFAULT_RESUME_WAIT_SEC,
    },
  };
}

export function createMoveStep(name = '移动到点位'): MoveStep {
  return {
    id: nextId('step'),
    type: GuideStepType.MOVE,
    name,
    subSteps: [],
    config: { waypoint: null, heading: null },
  };
}

export function createWaitStep(name = '停留等待', durationSec = 3): WaitStep {
  return {
    id: nextId('step'),
    type: GuideStepType.WAIT,
    name,
    subSteps: [],
    config: { durationSec },
  };
}

export function createCompositeStep(name = '组合步骤'): CompositeStep {
  return {
    id: nextId('step'),
    type: GuideStepType.COMPOSITE,
    name,
    subSteps: [],
    config: {},
  };
}

// —— 其余项目原有任务类型工厂 ——
export function createPhotoStep(name = '拍照'): PhotoStep {
  return { id: nextId('step'), type: GuideStepType.PHOTO, name, subSteps: [],
    config: { cameraId: 'default', resolution: '1920x1080', format: 'jpg', count: 1 } };
}
export function createTrajectoryStep(name = '执行轨迹'): TrajectoryStep {
  return { id: nextId('step'), type: GuideStepType.TRAJECTORY, name, subSteps: [],
    config: { trajectoryId: '', speed: 0.5, loop: false } };
}
export function createScanStep(name = '环境扫描'): ScanStep {
  return { id: nextId('step'), type: GuideStepType.SCAN, name, subSteps: [],
    config: { scanType: '3d', durationSec: 5 } };
}
export function createInspectStep(name = '目标检测'): InspectStep {
  return { id: nextId('step'), type: GuideStepType.INSPECT, name, subSteps: [],
    config: { targetType: 'person', confidenceThreshold: 0.7 } };
}
export function createSoundStep(name = '播放声音'): SoundStep {
  return { id: nextId('step'), type: GuideStepType.SOUND, name, subSteps: [],
    config: { text: '', volume: 70, language: 'zh-CN' } };
}
export function createDisplayStep(name = '屏幕显示'): DisplayStep {
  return { id: nextId('step'), type: GuideStepType.DISPLAY, name, subSteps: [],
    config: { message: '', durationSec: 5, position: 'center' } };
}
export function createSignalStep(name = '信号灯'): SignalStep {
  return { id: nextId('step'), type: GuideStepType.SIGNAL, name, subSteps: [],
    config: { pattern: 'blink', color: 'green', durationSec: 3 } };
}
export function createPickupStep(name = '拾取'): PickupStep {
  return { id: nextId('step'), type: GuideStepType.PICKUP, name, subSteps: [],
    config: { objectId: '', graspType: 'top' } };
}
export function createPlaceStep(name = '放置'): PlaceStep {
  return { id: nextId('step'), type: GuideStepType.PLACE, name, subSteps: [],
    config: { location: null, placeType: 'normal' } };
}
export function createChargeStep(name = '充电'): ChargeStep {
  return { id: nextId('step'), type: GuideStepType.CHARGE, name, subSteps: [],
    config: { targetLevel: 90, chargingStationId: '' } };
}

export function createDefaultVoiceConfig(): VoiceInteractionConfig {
  return {
    enabled: true,
    endWaitSec: DEFAULT_VOICE_END_WAIT_SEC,
    wakeupReplyText: '我在',
    recordSec: DEFAULT_VOICE_RECORD_SEC,
    activeStates: ['welcome', 'idle', 'guiding'],
    commandsEnabled: true,
    commands: [],
  };
}

export function createDefaultBreathingConfig(): BreathingActionConfig {
  return { enabled: true, actionIds: [], playMode: 'random' };
}

export function createDefaultGuideTask(name = '新导览任务'): GuideTask {
  const now = new Date().toISOString();
  return {
    id: nextId('task'),
    name,
    description: '',
    steps: [],
    voice: createDefaultVoiceConfig(),
    breathing: createDefaultBreathingConfig(),
    createdAt: now,
    updatedAt: now,
    published: false,
  };
}

export function createSubStep(step: GuideStep, executionMode: SubStepExecutionMode = 'sequence'): SubStepConfig {
  return {
    id: nextId('sub'),
    step,
    executionMode,
    startOffsetSec: 0,
    enabled: true,
  };
}

/** 工厂表：根据类型生成主步骤实例（步骤列表 / 子步骤共用） */
export const STEP_FACTORIES: Record<GuideStepType, () => GuideStep> = {
  [GuideStepType.WELCOME]: () => createWelcomeStep(),
  [GuideStepType.POI_SPEECH]: () => createPOISpeechStep(),
  [GuideStepType.MOVE]: () => createMoveStep(),
  [GuideStepType.WAIT]: () => createWaitStep(),
  [GuideStepType.COMPOSITE]: () => createCompositeStep(),
  [GuideStepType.PHOTO]: () => createPhotoStep(),
  [GuideStepType.TRAJECTORY]: () => createTrajectoryStep(),
  [GuideStepType.SCAN]: () => createScanStep(),
  [GuideStepType.INSPECT]: () => createInspectStep(),
  [GuideStepType.SOUND]: () => createSoundStep(),
  [GuideStepType.DISPLAY]: () => createDisplayStep(),
  [GuideStepType.SIGNAL]: () => createSignalStep(),
  [GuideStepType.PICKUP]: () => createPickupStep(),
  [GuideStepType.PLACE]: () => createPlaceStep(),
  [GuideStepType.CHARGE]: () => createChargeStep(),
};

export const newId = nextId;

// ===================== F07 导览任务运行管控类型 =====================

/** 任务主状态（PRD F07-4） */
export type TaskRunStatus =
  | 'pending_position'   // 待就位（已下发未就位）
  | 'positioned'         // 已就位待开始
  | 'running'            // 运行中
  | 'error'              // 异常中断
  | 'ended';             // 已结束

export const TASK_RUN_STATUS_LABELS: Record<TaskRunStatus, string> = {
  pending_position: '待就位',
  positioned: '已就位待开始',
  running: '运行中',
  error: '异常中断',
  ended: '已结束',
};

export interface TaskRunState {
  status: TaskRunStatus;
  currentStepId: string;
  currentSubStepId: string;
  /** 当前交互状态说明（迎宾中 / 语音交互中 / 讲解中 / 空闲等） */
  interactionLabel: string;
  voiceActive: boolean;
  voiceRound: number;
  voiceMaxRounds: number;
  /** 异常发生的步骤名称（F07-9） */
  errorStepName: string | null;
}

export function createDefaultRunState(): TaskRunState {
  return {
    status: 'pending_position',
    currentStepId: '',
    currentSubStepId: '',
    interactionLabel: '',
    voiceActive: false,
    voiceRound: 0,
    voiceMaxRounds: 3,
    errorStepName: null,
  };
}
