/**
 * 步骤列表（PRD v1.6 任务编排）
 *
 * 交互：
 *   - 头部「+ 添加步骤」按钮 → 点击展开下拉，从 4 种 PRD 类型中选
 *   - 每条主步骤右侧「+ 子步骤」按钮 → 点击展开下拉，类型完全同主步骤
 *   - 子步骤在主步骤下方缩进平铺展示，可点选、可删除、可上下移动
 *   - 选中的主/子步骤通过 onSelect(stepId, subStepId?) 回传
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Activity, Camera, ChevronDown, ChevronUp, Eye, Lightbulb, MapPin, MessageSquare,
  Mic, Monitor, MoveDown, MoveUp, Pause, Plug, Plus, Radar, Trash2, UserCheck,
} from 'lucide-react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, cn } from '@astribot/ui';
import {
  ConflictReport,
  GuideStep,
  GUIDE_STEP_LABELS,
  GuideStepType,
  STEP_FACTORIES,
  SubStepConfig,
  createSubStep,
} from '@/types';

interface StepListProps {
  steps: GuideStep[];
  activeStepId: string;
  /** 当选中的是某个主步骤下的子步骤时传入子步骤 id */
  activeSubStepId?: string;
  /** subStepId 为空表示选主步骤 */
  onSelect: (stepId: string, subStepId?: string) => void;
  onAdd: (step: GuideStep) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  /** 子步骤增删/排序 */
  onAddSub: (parentStepId: string, sub: SubStepConfig) => void;
  onDeleteSub: (parentStepId: string, subStepId: string) => void;
  onMoveSub: (parentStepId: string, subStepId: string, direction: -1 | 1) => void;
  report: ConflictReport | null;
}

const STEP_ICONS: Record<GuideStepType, ReactNode> = {
  [GuideStepType.WELCOME]: <UserCheck className="h-4 w-4" />,
  [GuideStepType.POI_SPEECH]: <MessageSquare className="h-4 w-4" />,
  [GuideStepType.MOVE]: <MapPin className="h-4 w-4" />,
  [GuideStepType.WAIT]: <Pause className="h-4 w-4" />,
  [GuideStepType.COMPOSITE]: <Plus className="h-4 w-4" />,
  [GuideStepType.PHOTO]: <Camera className="h-4 w-4" />,
  [GuideStepType.TRAJECTORY]: <Activity className="h-4 w-4" />,
  [GuideStepType.SCAN]: <Radar className="h-4 w-4" />,
  [GuideStepType.INSPECT]: <Eye className="h-4 w-4" />,
  [GuideStepType.SOUND]: <Mic className="h-4 w-4" />,
  [GuideStepType.DISPLAY]: <Monitor className="h-4 w-4" />,
  [GuideStepType.SIGNAL]: <Lightbulb className="h-4 w-4" />,
  [GuideStepType.PICKUP]: <MoveUp className="h-4 w-4" />,
  [GuideStepType.PLACE]: <MoveDown className="h-4 w-4" />,
  [GuideStepType.CHARGE]: <Plug className="h-4 w-4" />,
};

/** 主步骤可添加类型：覆盖一期 PRD 范围 + 项目原有任务类型 */
const MAIN_ADDABLE_TYPES: GuideStepType[] = [
  GuideStepType.WELCOME,
  GuideStepType.POI_SPEECH,
  GuideStepType.MOVE,
  GuideStepType.WAIT,
  GuideStepType.PHOTO,
  GuideStepType.TRAJECTORY,
  GuideStepType.SCAN,
  GuideStepType.INSPECT,
  GuideStepType.SOUND,
  GuideStepType.DISPLAY,
  GuideStepType.SIGNAL,
  GuideStepType.PICKUP,
  GuideStepType.PLACE,
  GuideStepType.CHARGE,
];

/** 子步骤可添加类型：与主步骤一致 */
const SUB_ADDABLE_TYPES: GuideStepType[] = [
  GuideStepType.POI_SPEECH,
  GuideStepType.MOVE,
  GuideStepType.WAIT,
  GuideStepType.PHOTO,
  GuideStepType.TRAJECTORY,
  GuideStepType.SCAN,
  GuideStepType.INSPECT,
  GuideStepType.SOUND,
  GuideStepType.DISPLAY,
  GuideStepType.SIGNAL,
  GuideStepType.PICKUP,
  GuideStepType.PLACE,
  GuideStepType.CHARGE,
];

// ===================== 下拉菜单（添加步骤 / 添加子步骤） =====================

function AddStepDropdown({
  label,
  types,
  onPick,
  variant = 'default',
  size = 'sm',
}: {
  label: string;
  types: GuideStepType[];
  onPick: (type: GuideStepType) => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'xs';
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        size={size === 'xs' ? 'sm' : 'sm'}
        variant={variant}
        className={cn(size === 'xs' && 'h-6 px-2 text-[11px]')}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
      >
        <Plus className={cn('mr-1', size === 'xs' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
        {label}
        <ChevronDown className={cn('ml-1', size === 'xs' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
      </Button>

      {open && (
        <div
          className="absolute right-0 top-full z-30 mt-1 max-h-[420px] w-56 overflow-y-auto rounded-lg border border-border bg-card shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {types.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { onPick(t); setOpen(false); }}
              className="flex w-full items-center gap-2 border-b border-border/60 px-3 py-2 text-left text-sm text-foreground last:border-0 hover:bg-muted/40"
            >
              <span className="text-muted-foreground">{STEP_ICONS[t]}</span>
              {GUIDE_STEP_LABELS[t]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ===================== 主组件 =====================

export function StepList({
  steps,
  activeStepId,
  activeSubStepId,
  onSelect,
  onAdd,
  onDelete,
  onMove,
  onAddSub,
  onDeleteSub,
  onMoveSub,
  report,
}: StepListProps) {
  const errorIds = new Set(
    report?.items.filter((i) => i.severity === 'error').map((i) => i.stepId) ?? [],
  );
  const errorSubIds = new Set(
    report?.items.filter((i) => i.severity === 'error' && i.subStepId).map((i) => i.subStepId!) ?? [],
  );

  return (
    <Card className="flex min-h-0 flex-col border-border bg-card/80 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">导览步骤</CardTitle>
          <AddStepDropdown
            label="添加步骤"
            types={MAIN_ADDABLE_TYPES}
            onPick={(t) => onAdd(STEP_FACTORIES[t]())}
          />
        </div>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 overflow-y-auto">
        {steps.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/60 px-4 py-8 text-center text-xs text-muted-foreground">
            暂无步骤，点击右上角"添加步骤"
          </div>
        ) : (
          <div className="space-y-2">
            {steps.map((step, idx) => {
              const isMainActive = step.id === activeStepId && !activeSubStepId;
              const hasError = errorIds.has(step.id);
              return (
                <div key={step.id} className="space-y-1.5">
                  {/* 主步骤卡片 */}
                  <div
                    className={cn(
                      'rounded-lg border bg-background/60 p-3 transition-colors cursor-pointer',
                      isMainActive
                        ? 'border-primary/60 bg-primary/5'
                        : 'border-border/60 hover:border-primary/30',
                      hasError && 'border-red-400/70',
                    )}
                    onClick={() => onSelect(step.id)}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="shrink-0">{idx + 1}</Badge>
                      <div className="text-muted-foreground">{STEP_ICONS[step.type]}</div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-foreground">{step.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {GUIDE_STEP_LABELS[step.type]}
                          {step.subSteps.length > 0 && ` · ${step.subSteps.length} 子步骤`}
                        </div>
                      </div>

                      {/* + 子步骤 */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <AddStepDropdown
                          label="子步骤"
                          variant="outline"
                          size="xs"
                          types={SUB_ADDABLE_TYPES}
                          onPick={(t) => onAddSub(step.id, createSubStep(STEP_FACTORIES[t](), 'parallel'))}
                        />
                      </div>

                      <div className="flex flex-col">
                        <Button
                          type="button" variant="ghost" size="icon" className="h-5 w-5"
                          disabled={idx === 0}
                          onClick={(e) => { e.stopPropagation(); onMove(step.id, -1); }}
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button" variant="ghost" size="icon" className="h-5 w-5"
                          disabled={idx === steps.length - 1}
                          onClick={(e) => { e.stopPropagation(); onMove(step.id, 1); }}
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <Button
                        type="button" variant="ghost" size="icon" className="h-6 w-6 text-red-400"
                        onClick={(e) => { e.stopPropagation(); onDelete(step.id); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {hasError && (
                      <div className="mt-2 text-[11px] text-red-400">⚠ 该步骤存在校验错误</div>
                    )}
                  </div>

                  {/* 子步骤列表（缩进展示） */}
                  {step.subSteps.length > 0 && (
                    <div className="ml-6 space-y-1 border-l border-dashed border-border/60 pl-3">
                      {step.subSteps.map((sub, subIdx) => {
                        const isSubActive = step.id === activeStepId && activeSubStepId === sub.id;
                        const subHasError = errorSubIds.has(sub.id);
                        return (
                          <div
                            key={sub.id}
                            className={cn(
                              'flex items-center gap-2 rounded-md border bg-background/40 px-2.5 py-1.5 text-xs transition-colors cursor-pointer',
                              isSubActive
                                ? 'border-primary/60 bg-primary/10'
                                : 'border-border/40 hover:border-primary/30',
                              subHasError && 'border-red-400/70',
                            )}
                            onClick={(e) => { e.stopPropagation(); onSelect(step.id, sub.id); }}
                          >
                            <Badge variant="outline" className="shrink-0 px-1.5 py-0 text-[10px]">
                              {idx + 1}.{subIdx + 1}
                            </Badge>
                            <span className="shrink-0 text-muted-foreground">
                              {STEP_ICONS[sub.step.type]}
                            </span>
                            <div className="min-w-0 flex-1 truncate">
                              <span className="text-foreground">{sub.step.name}</span>
                              <span className="ml-1.5 text-[10px] text-muted-foreground">
                                {GUIDE_STEP_LABELS[sub.step.type]} · {sub.executionMode === 'parallel' ? '同时' : '依次'}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <Button
                                type="button" variant="ghost" size="icon" className="h-4 w-4"
                                disabled={subIdx === 0}
                                onClick={(e) => { e.stopPropagation(); onMoveSub(step.id, sub.id, -1); }}
                              >
                                <ChevronUp className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button" variant="ghost" size="icon" className="h-4 w-4"
                                disabled={subIdx === step.subSteps.length - 1}
                                onClick={(e) => { e.stopPropagation(); onMoveSub(step.id, sub.id, 1); }}
                              >
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                            </div>
                            <Button
                              type="button" variant="ghost" size="icon" className="h-5 w-5 text-red-400"
                              onClick={(e) => { e.stopPropagation(); onDeleteSub(step.id, sub.id); }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
