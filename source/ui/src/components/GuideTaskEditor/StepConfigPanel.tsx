/**
 * 右栏：根据当前步骤类型分发渲染对应配置面板。
 *
 * 由于子步骤与主步骤同构（SubStepConfig.step: GuideStep），
 * 同一个 StepConfigPanel 既能编辑主步骤，也能编辑子步骤。
 */

import { Badge, Card, CardContent, CardHeader, CardTitle, Input } from '@astribot/ui';
import {
  ConflictReport,
  GuideStep,
  GuideStepType,
  SubStepConfig,
} from '@/types';
import { WelcomeStepPanel } from './WelcomeStepPanel';
import { POISpeechPanel } from './POISpeechPanel';
import { WaypointPicker } from './WaypointPicker';

interface StepConfigPanelProps {
  step: GuideStep;
  allSteps: GuideStep[];
  onChange: (next: GuideStep) => void;
  report: ConflictReport | null;
  /** 子步骤特有：当前所属子步骤包装；为空表示编辑主步骤 */
  subWrapper?: SubStepConfig | null;
  onSubWrapperChange?: (next: SubStepConfig) => void;
  /** 该子步骤所属父步骤的名字（仅显示用） */
  parentStepName?: string;
}

export function StepConfigPanel({
  step,
  allSteps: _allSteps,
  onChange,
  report,
  subWrapper,
  onSubWrapperChange,
  parentStepName,
}: StepConfigPanelProps) {
  const stepIssues = report?.items.filter((i) => i.stepId === step.id && (subWrapper ? i.subStepId === subWrapper.id : !i.subStepId)) ?? [];
  const isSub = !!subWrapper;

  return (
    <div className="flex flex-col gap-3">
      <Card className="border-border bg-card/80 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">
              {isSub ? '子步骤配置' : '步骤配置'}
            </CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {isSub && parentStepName && (
                <Badge variant="outline" className="text-[10px]">
                  挂在：{parentStepName}
                </Badge>
              )}
              <span>类型：{step.type}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 名称 / 备注 */}
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <label className="text-xs text-muted-foreground">
              步骤名称
              <Input
                className="mt-1"
                value={step.name}
                onChange={(e) => onChange({ ...step, name: e.target.value } as GuideStep)}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              备注
              <Input
                className="mt-1"
                value={step.description ?? ''}
                onChange={(e) => onChange({ ...step, description: e.target.value } as GuideStep)}
              />
            </label>
          </div>

          {/* 校验提示 */}
          {stepIssues.length > 0 && (
            <div className="rounded-md border border-red-400/40 bg-red-500/5 px-3 py-2 text-xs">
              <div className="mb-1 font-medium text-red-400">校验提示</div>
              <ul className="space-y-1 text-red-300/90">
                {stepIssues.map((it, i) => (
                  <li key={i}>
                    <span className="mr-1">{it.severity === 'error' ? '✕' : '⚠'}</span>
                    {it.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 类型分发 */}
          {step.type === GuideStepType.WELCOME && (
            <WelcomeStepPanel step={step} onChange={onChange} />
          )}
          {step.type === GuideStepType.POI_SPEECH && (
            <POISpeechPanel step={step} onChange={onChange} />
          )}
          {step.type === GuideStepType.MOVE && (
            <MoveStepInline step={step} onChange={onChange} />
          )}
          {step.type === GuideStepType.WAIT && (
            <WaitStepInline step={step} onChange={onChange} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== 简单步骤的内联编辑器 ====================

function MoveStepInline({
  step, onChange,
}: {
  step: Extract<GuideStep, { type: GuideStepType.MOVE }>;
  onChange: (next: GuideStep) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_160px]">
      <WaypointPicker
        label="目标点位"
        required
        category="move"
        value={step.config.waypoint}
        onChange={(p) =>
          onChange({
            ...step,
            config: { ...step.config, waypoint: p, heading: step.config.heading ?? p.theta },
          })
        }
      />
      <CoordInput
        label="到点朝向 (rad)"
        value={step.config.heading}
        onChange={(v) => onChange({ ...step, config: { ...step.config, heading: v } })}
      />
    </div>
  );
}

function WaitStepInline({
  step, onChange,
}: {
  step: Extract<GuideStep, { type: GuideStepType.WAIT }>;
  onChange: (next: GuideStep) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <CoordInput
        label="停留时长 (s)"
        value={step.config.durationSec}
        onChange={(v) =>
          onChange({ ...step, config: { ...step.config, durationSec: Math.max(0, v ?? 0) } })
        }
      />
    </div>
  );
}

function CoordInput({
  label, value, onChange,
}: {
  label: string;
  value: number | null;
  onChange: (next: number | null) => void;
}) {
  return (
    <label className="text-xs text-muted-foreground">
      {label}
      <Input
        type="number"
        className="mt-1"
        value={value ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === '' ? null : Number(v));
        }}
      />
    </label>
  );
}
