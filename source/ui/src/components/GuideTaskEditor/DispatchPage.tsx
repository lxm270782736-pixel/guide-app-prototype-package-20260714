/**
 * 任务下发 / 运行管控（一期范围：F07）
 *
 * F07-1 子步骤状态显示：当前主步骤、当前子步骤直接在任务预览中高亮
 * F07-2 语音交互状态显示：进入语音交互后在当前子步骤行显示"语音交互中"徽章
 * F07-3 跳过当前子步骤：当前子步骤行内的跳过按钮
 * F07-4 跳过当前语音交互：当前子步骤行内的跳过语音交互按钮
 */

import { useEffect, useMemo, useState } from 'react';
import { Badge, Button } from '@astribot/ui';
import { ChevronRight, MapPin, Mic, Play, SkipForward, X } from 'lucide-react';
import type { GuideStep, GuideTask, SubStepConfig } from '@/types';
import { GUIDE_STEP_LABELS } from '@/types';

interface DispatchPageProps {
  tasks: GuideTask[];
  activeTask: GuideTask | null;
  onSwitchTask: (id: string) => void;
}

type RunStatus = 'idle' | 'running' | 'finished';

interface RunSnapshot {
  status: RunStatus;
  mainIdx: number;
  subId: string;
  voiceActive: boolean;
}

function defaultRun(): RunSnapshot {
  return { status: 'idle', mainIdx: 0, subId: '', voiceActive: false };
}

export function DispatchPage({ tasks, activeTask, onSwitchTask }: DispatchPageProps) {
  const [run, setRun] = useState<RunSnapshot>(defaultRun);

  useEffect(() => { setRun(defaultRun()); }, [activeTask?.id]);

  const currentMain: GuideStep | null = useMemo(
    () => activeTask?.steps[run.mainIdx] ?? null,
    [activeTask, run.mainIdx],
  );
  const currentSub: SubStepConfig | null = useMemo(() => {
    if (!currentMain || !run.subId) return null;
    return currentMain.subSteps.find((s) => s.id === run.subId) ?? null;
  }, [currentMain, run.subId]);

  const handleStart = () => {
    if (!activeTask?.published) return;
    if ((activeTask.steps.length ?? 0) === 0) return;
    const firstMain = activeTask.steps[0];
    setRun({
      status: 'running',
      mainIdx: 0,
      subId: firstMain.subSteps[0]?.id ?? '',
      voiceActive: false,
    });
  };

  /** F07-3 跳过当前子步骤 */
  const handleSkipSub = () => {
    if (!currentMain || !currentSub) return;
    const idx = currentMain.subSteps.findIndex((s) => s.id === currentSub.id);
    const nextSub = currentMain.subSteps[idx + 1];
    if (nextSub) {
      setRun((r) => ({ ...r, subId: nextSub.id }));
    } else if (activeTask && run.mainIdx + 1 < activeTask.steps.length) {
      const nextMain = activeTask.steps[run.mainIdx + 1];
      setRun({ status: 'running', mainIdx: run.mainIdx + 1, subId: nextMain.subSteps[0]?.id ?? '', voiceActive: false });
    } else {
      setRun((r) => ({ ...r, status: 'finished', voiceActive: false }));
    }
  };

  /** F07-4 跳过当前语音交互 */
  const handleSkipVoice = () => setRun((r) => ({ ...r, voiceActive: false }));
  /** 演示用：模拟进入语音交互 */
  const handleMockVoice = () => setRun((r) => ({ ...r, voiceActive: true }));

  const canStart = !!activeTask?.published && run.status !== 'running';
  const statusBadge =
    run.status === 'running' ? <Badge className="bg-green-500/15 text-green-400">运行中</Badge> :
    run.status === 'finished' ? <Badge className="bg-sky-500/15 text-sky-400">已结束</Badge> :
    <Badge className="bg-secondary text-muted-foreground">未开始</Badge>;

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[1fr_460px] gap-3 p-3">

      {/* 左：地图占位 */}
      <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-muted/5 text-muted-foreground">
        <div className="text-center">
          <MapPin className="mx-auto mb-2 h-8 w-8 opacity-30" />
          <p className="text-sm">地图区域（实机接入后展示机器人实时位置与导览路线）</p>
        </div>
      </div>

      {/* 右：导览控制 + 任务预览 */}
      <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">

        {/* 导览控制：任务选择 + 开始 */}
        <div className="rounded-xl border border-border bg-card/80 p-4 shadow-sm space-y-3">
          <div className="text-sm font-medium">导览控制</div>
          <label className="block text-xs text-muted-foreground">
            选择任务
            <select
              className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
              value={activeTask?.id ?? ''}
              onChange={(e) => onSwitchTask(e.target.value)}
            >
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}{t.published ? '（已发布）' : '（草稿）'}
                </option>
              ))}
            </select>
          </label>

          {!activeTask?.published && (
            <p className="rounded-md border border-yellow-500/40 bg-yellow-500/5 px-3 py-2 text-xs text-yellow-400">
              该任务尚未发布，请先在任务编排页发布后再下发。
            </p>
          )}

          <Button size="sm" className="w-full" disabled={!canStart} onClick={handleStart}>
            <Play className="mr-1 h-3.5 w-3.5" />
            开始导览
          </Button>
        </div>

        {/* 任务预览（含运行状态徽章 + 当前步骤行内的控制开关） */}
        {activeTask && activeTask.steps.length > 0 && (
          <div className="rounded-xl border border-border bg-card/80 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <span className="text-sm font-medium">任务预览</span>
              {statusBadge}
            </div>
            <div className="p-3 space-y-1.5">
              {activeTask.steps.map((s, i) => {
                const isCurrentMain = run.status === 'running' && run.mainIdx === i;
                const noSubFocused = isCurrentMain && !currentSub;
                return (
                  <div key={s.id} className="space-y-1">
                    {/* 主步骤行 */}
                    <div className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs ${
                      isCurrentMain ? 'border-primary/60 bg-primary/5' : 'border-border/50 bg-background/40'
                    }`}>
                      {isCurrentMain && <ChevronRight className="h-3 w-3 shrink-0 text-primary" />}
                      <span className="font-medium text-foreground">{i + 1}. {s.name}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground">{GUIDE_STEP_LABELS[s.type]}</span>
                      {isCurrentMain && (
                        <Badge className="ml-auto bg-green-500/15 text-green-400">执行中</Badge>
                      )}
                    </div>

                    {/* 当前主步骤无子步骤时的占位 */}
                    {noSubFocused && s.subSteps.length === 0 && (
                      <div className="ml-5 rounded-md border border-dashed border-border/60 bg-background/20 px-3 py-1.5 text-[11px] text-muted-foreground">
                        本主步骤无子步骤
                      </div>
                    )}

                    {/* 子步骤行 */}
                    {s.subSteps.map((sub, ci) => {
                      const isCurrentSub = isCurrentMain && run.subId === sub.id;
                      return (
                        <div
                          key={sub.id}
                          className={`ml-5 rounded-md border ${
                            isCurrentSub ? 'border-primary/60 bg-primary/10' : 'border-border/40 bg-background/20'
                          }`}
                        >
                          <div className="flex items-center gap-2 px-3 py-1.5 text-[11px]">
                            {isCurrentSub && <ChevronRight className="h-3 w-3 shrink-0 text-primary" />}
                            <span className="text-foreground">{i + 1}.{ci + 1} {sub.step.name}</span>
                            <span className="text-muted-foreground">·</span>
                            <span className="text-muted-foreground">{GUIDE_STEP_LABELS[sub.step.type]}</span>
                            {isCurrentSub && run.voiceActive && (
                              <Badge className="ml-auto bg-green-500/15 text-green-400">
                                <Mic className="mr-1 h-3 w-3" />
                                语音交互中
                              </Badge>
                            )}
                            {isCurrentSub && !run.voiceActive && (
                              <Badge className="ml-auto bg-green-500/15 text-green-400">执行中</Badge>
                            )}
                          </div>

                          {/* F07-3 / F07-4 当前子步骤行内的控制开关 */}
                          {isCurrentSub && (
                            <div className="flex flex-wrap gap-1.5 border-t border-border/40 bg-background/40 px-3 py-1.5">
                              <Button
                                size="sm" variant="outline" className="h-6 px-2 text-[11px]"
                                onClick={handleSkipSub}
                              >
                                <SkipForward className="mr-1 h-3 w-3" />
                                跳过当前子步骤
                              </Button>
                              {run.voiceActive ? (
                                <Button
                                  size="sm" variant="destructive" className="h-6 px-2 text-[11px]"
                                  onClick={handleSkipVoice}
                                >
                                  <X className="mr-1 h-3 w-3" />
                                  跳过当前语音交互
                                </Button>
                              ) : (
                                <Button
                                  size="sm" variant="ghost" className="h-6 px-2 text-[11px] text-muted-foreground"
                                  onClick={handleMockVoice}
                                >
                                  <Mic className="mr-1 h-3 w-3" />
                                  模拟进入语音交互
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
