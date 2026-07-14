/**
 * 保存 / 发布前的冲突校验
 * 校验维度：
 *   1) 必填项（迎宾点位、待命朝向、迎宾话术、讲解稿等）
 *   2) 数值范围（触发距离 0.5–3、讲解稿 ≤500、冷却时间 ≥0）
 *   3) 子步骤同时执行时的控制权冲突（底盘移动 / 转向 / 动作执行器）
 *   4) 子步骤时间窗重叠
 *
 * 子步骤现在与主步骤同构（SubStepConfig.step: GuideStep），所有必填校验对子步骤递归生效。
 */

import {
  ConflictItem,
  ConflictReport,
  GuideStep,
  GuideStepType,
  GuideTask,
  SCRIPT_MAX_CHARS,
  SubStepConfig,
  TRIGGER_DISTANCE_MAX,
  TRIGGER_DISTANCE_MIN,
} from '@/types';

/** 控制权占用通道：底盘平移 / 旋转 / 上肢动作执行器 / 语音 */
type ControlChannel = 'chassis' | 'rotation' | 'actuator' | 'voice';

/** 主步骤类型→占用通道映射 */
const STEP_CHANNELS: Record<GuideStepType, ControlChannel[]> = {
  [GuideStepType.WELCOME]: ['rotation', 'actuator', 'voice'],   // 转向人脸 + 动作 + 话术
  [GuideStepType.POI_SPEECH]: ['voice'],                        // 讲解音频
  [GuideStepType.MOVE]: ['chassis', 'rotation'],                // 底盘移动
  [GuideStepType.WAIT]: [],                                     // 纯等待
  [GuideStepType.COMPOSITE]: [],                                // 容器步骤
  [GuideStepType.PHOTO]: [],                                    // 拍照不占执行通道
  [GuideStepType.TRAJECTORY]: ['actuator'],                     // 上肢轨迹
  [GuideStepType.SCAN]: ['rotation'],                           // 旋转扫描
  [GuideStepType.INSPECT]: [],                                  // 视觉检测
  [GuideStepType.SOUND]: ['voice'],                             // 占用语音输出
  [GuideStepType.DISPLAY]: [],                                  // 屏幕
  [GuideStepType.SIGNAL]: [],                                   // 信号灯
  [GuideStepType.PICKUP]: ['actuator', 'rotation'],             // 抓取
  [GuideStepType.PLACE]: ['actuator', 'rotation'],              // 放置
  [GuideStepType.CHARGE]: ['chassis'],                          // 回充
};

function getChannels(sub: SubStepConfig): ControlChannel[] {
  return STEP_CHANNELS[sub.step.type] ?? [];
}

function estimateDuration(sub: SubStepConfig): number {
  if (sub.durationOverrideSec && sub.durationOverrideSec > 0) return sub.durationOverrideSec;
  // 等待步骤直接读时长，讲解步骤读音频时长，其余按 1s 估算
  if (sub.step.type === GuideStepType.WAIT) return sub.step.config.durationSec || 1;
  if (sub.step.type === GuideStepType.POI_SPEECH) return sub.step.config.audioDuration || 1;
  return 1;
}

function validateStep(step: GuideStep, isSub = false): ConflictItem[] {
  const items: ConflictItem[] = [];
  const label = isSub ? '子步骤' : '步骤';

  switch (step.type) {
    case GuideStepType.WELCOME: {
      const cfg = step.config;
      if (!cfg.waypoint) {
        items.push({
          severity: 'error', stepId: step.id, code: 'missing_waypoint',
          message: `${label}「${step.name}」未设置迎宾点位`,
        });
      }
      if (cfg.triggerDistance < TRIGGER_DISTANCE_MIN || cfg.triggerDistance > TRIGGER_DISTANCE_MAX) {
        items.push({
          severity: 'error', stepId: step.id, code: 'invalid_trigger_distance',
          message: `${label}「${step.name}」触发距离需在 ${TRIGGER_DISTANCE_MIN}–${TRIGGER_DISTANCE_MAX}m 之间`,
        });
      }
      if (cfg.cooldownSec < 0) {
        items.push({
          severity: 'error', stepId: step.id, code: 'invalid_cooldown',
          message: `${label}「${step.name}」冷却时间不可为负`,
        });
      }
      if (!cfg.prompts || cfg.prompts.length === 0 || cfg.prompts.every((p) => !p.text.trim())) {
        items.push({
          severity: 'error', stepId: step.id, code: 'missing_prompt',
          message: `${label}「${step.name}」至少需要一条非空迎宾话术`,
        });
      }
      break;
    }
    case GuideStepType.POI_SPEECH: {
      const cfg = step.config;
      if (!cfg.script.trim()) {
        items.push({
          severity: 'error', stepId: step.id, code: 'missing_prompt',
          message: `${label}「${step.name}」讲解稿不能为空`,
        });
      } else if (cfg.script.length > SCRIPT_MAX_CHARS) {
        items.push({
          severity: 'error', stepId: step.id, code: 'script_too_long',
          message: `${label}「${step.name}」讲解稿超出 ${SCRIPT_MAX_CHARS} 字上限（当前 ${cfg.script.length}）`,
        });
      }
      if (!cfg.waypoint && !isSub) {
        items.push({
          severity: 'warning', stepId: step.id, code: 'missing_waypoint',
          message: `${label}「${step.name}」未设置讲解点位（建议补全）`,
        });
      }
      break;
    }
    case GuideStepType.MOVE: {
      if (!step.config.waypoint) {
        items.push({
          severity: 'error', stepId: step.id, code: 'missing_waypoint',
          message: `${label}「${step.name}」未设置目标点位`,
        });
      }
      break;
    }
    default:
      break;
  }

  // 子步骤递归 + 时间窗冲突
  items.push(...validateSubSteps(step));
  return items;
}

function validateSubSteps(step: GuideStep): ConflictItem[] {
  const items: ConflictItem[] = [];
  const enabled = step.subSteps.filter((s) => s.enabled);
  if (enabled.length === 0) return items;

  // 1) 子步骤自身必填项校验（递归）
  enabled.forEach((sub) => {
    items.push(...validateStep(sub.step, true).map((it) => ({ ...it, subStepId: sub.id })));
  });

  // 2) 计算每个子步骤的开始 / 结束时间
  const timeline: Array<{ sub: SubStepConfig; start: number; end: number }> = [];
  let seqCursor = 0;
  for (const sub of enabled) {
    const dur = estimateDuration(sub);
    if (sub.executionMode === 'parallel') {
      const start = sub.startOffsetSec;
      timeline.push({ sub, start, end: start + dur });
    } else {
      const start = seqCursor + sub.startOffsetSec;
      const end = start + dur;
      timeline.push({ sub, start, end });
      seqCursor = end;
    }
  }

  // 3) 两两比较：时间重叠 + 通道冲突
  for (let i = 0; i < timeline.length; i++) {
    for (let j = i + 1; j < timeline.length; j++) {
      const a = timeline[i];
      const b = timeline[j];
      const overlap = Math.max(a.start, b.start) < Math.min(a.end, b.end);
      if (!overlap) continue;
      const sharedChannels = getChannels(a.sub).filter((c) => getChannels(b.sub).includes(c));
      if (sharedChannels.length === 0) continue;
      sharedChannels.forEach((ch) => {
        const code: ConflictItem['code'] =
          ch === 'chassis' ? 'chassis_conflict'
          : ch === 'rotation' ? 'rotation_conflict'
          : ch === 'actuator' ? 'actuator_conflict'
          : 'substep_overlap';
        items.push({
          severity: 'error',
          stepId: step.id,
          subStepId: b.sub.id,
          code,
          message: `「${step.name}」子步骤同时占用${channelLabel(ch)}：${a.sub.step.name} ↔ ${b.sub.step.name}`,
        });
      });
    }
  }
  return items;
}

function channelLabel(ch: ControlChannel): string {
  switch (ch) {
    case 'chassis': return '底盘移动';
    case 'rotation': return '底盘转向';
    case 'actuator': return '动作执行器';
    case 'voice': return '语音';
  }
}

export function validateGuideTask(task: GuideTask): ConflictReport {
  const items: ConflictItem[] = [];
  task.steps.forEach((step) => items.push(...validateStep(step)));
  const ok = items.every((i) => i.severity !== 'error');
  return { ok, items };
}

export function summarizeReport(report: ConflictReport): string {
  if (report.items.length === 0) return '校验通过，无冲突';
  const errs = report.items.filter((i) => i.severity === 'error').length;
  const warns = report.items.filter((i) => i.severity === 'warning').length;
  return `校验完成：${errs} 项错误 / ${warns} 项提示`;
}
