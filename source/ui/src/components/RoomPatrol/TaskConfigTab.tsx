/**
 * 任务编排 Tab
 * 子步骤与主步骤同构，可点选切换右抽屉配置。
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Badge, Button, cn } from '@astribot/ui';
import { Plus } from 'lucide-react';
import type { ConflictReport, GuideStep, GuideTask, SubStepConfig } from '@/types';
import { createDefaultGuideTask } from '@/types';
import { guideStorage } from '@/services/guideStorage';
import { validateGuideTask } from '@/components/GuideTaskEditor/utils/validate';
import { StepList } from '@/components/GuideTaskEditor/StepList';
import { StepConfigPanel } from '@/components/GuideTaskEditor/StepConfigPanel';

interface TaskConfigTabProps {
  /** 发布成功后回调，外层切到"任务下发"Tab */
  onPublished?: (taskId: string) => void;
}

export const TaskConfigTab: React.FC<TaskConfigTabProps> = ({ onPublished }) => {
  const [tasks, setTasks] = useState<GuideTask[]>([]);
  const [activeTaskId, setActiveTaskId] = useState('');
  const [activeStepId, setActiveStepId] = useState('');
  const [activeSubStepId, setActiveSubStepId] = useState('');
  const [report, setReport] = useState<ConflictReport | null>(null);

  useEffect(() => {
    const loaded = guideStorage.loadTasks();
    setTasks(loaded);
    if (loaded.length > 0) setActiveTaskId(loaded[0].id);
  }, []);

  const activeTask = useMemo(
    () => tasks.find((t) => t.id === activeTaskId) ?? null,
    [tasks, activeTaskId],
  );
  const activeStep = useMemo<GuideStep | null>(
    () => activeTask?.steps.find((s) => s.id === activeStepId) ?? null,
    [activeTask, activeStepId],
  );
  const activeSubStep = useMemo<SubStepConfig | null>(
    () =>
      activeStep && activeSubStepId
        ? activeStep.subSteps.find((s) => s.id === activeSubStepId) ?? null
        : null,
    [activeStep, activeSubStepId],
  );

  // ── 任务级 ──
  const updateTask = (next: GuideTask) =>
    setTasks((prev) => prev.map((t) => (t.id === next.id ? next : t)));

  // ── 主步骤 ──
  const updateStep = (next: GuideStep) => {
    if (!activeTask) return;
    updateTask({ ...activeTask, steps: activeTask.steps.map((s) => (s.id === next.id ? next : s)) });
  };
  const handleAddStep = (step: GuideStep) => {
    if (!activeTask) return;
    updateTask({ ...activeTask, steps: [...activeTask.steps, step] });
    setActiveStepId(step.id);
    setActiveSubStepId('');
  };
  const handleDeleteStep = (id: string) => {
    if (!activeTask) return;
    updateTask({ ...activeTask, steps: activeTask.steps.filter((s) => s.id !== id) });
    if (activeStepId === id) { setActiveStepId(''); setActiveSubStepId(''); }
  };
  const handleMoveStep = (id: string, dir: -1 | 1) => {
    if (!activeTask) return;
    const idx = activeTask.steps.findIndex((s) => s.id === id);
    const tgt = idx + dir;
    if (idx < 0 || tgt < 0 || tgt >= activeTask.steps.length) return;
    const next = [...activeTask.steps];
    [next[idx], next[tgt]] = [next[tgt], next[idx]];
    updateTask({ ...activeTask, steps: next });
  };

  // ── 子步骤 ──
  const handleAddSub = (parentId: string, sub: SubStepConfig) => {
    if (!activeTask) return;
    updateTask({
      ...activeTask,
      steps: activeTask.steps.map((s) =>
        s.id === parentId ? { ...s, subSteps: [...s.subSteps, sub] } : s
      ),
    });
    setActiveStepId(parentId);
    setActiveSubStepId(sub.id);
  };
  const handleDeleteSub = (parentId: string, subId: string) => {
    if (!activeTask) return;
    updateTask({
      ...activeTask,
      steps: activeTask.steps.map((s) =>
        s.id === parentId ? { ...s, subSteps: s.subSteps.filter((x) => x.id !== subId) } : s
      ),
    });
    if (activeSubStepId === subId) setActiveSubStepId('');
  };
  const handleMoveSub = (parentId: string, subId: string, dir: -1 | 1) => {
    if (!activeTask) return;
    updateTask({
      ...activeTask,
      steps: activeTask.steps.map((s) => {
        if (s.id !== parentId) return s;
        const idx = s.subSteps.findIndex((x) => x.id === subId);
        const tgt = idx + dir;
        if (idx < 0 || tgt < 0 || tgt >= s.subSteps.length) return s;
        const next = [...s.subSteps];
        [next[idx], next[tgt]] = [next[tgt], next[idx]];
        return { ...s, subSteps: next };
      }),
    });
  };
  /** 子步骤内部 step 变化（同构面板回写） */
  const updateSubStep = (nextInner: GuideStep) => {
    if (!activeStep || !activeSubStep) return;
    const nextSub: SubStepConfig = { ...activeSubStep, step: nextInner };
    updateStep({
      ...activeStep,
      subSteps: activeStep.subSteps.map((s) => (s.id === activeSubStep.id ? nextSub : s)),
    });
  };
  /** 子步骤包装属性（执行方式/时间）变化 */
  const updateSubWrapper = (nextSub: SubStepConfig) => {
    if (!activeStep) return;
    updateStep({
      ...activeStep,
      subSteps: activeStep.subSteps.map((s) => (s.id === nextSub.id ? nextSub : s)),
    });
  };

  // ── 顶部操作 ──
  const handleSave = () => { if (activeTask) guideStorage.saveTask(activeTask); };
  const handlePublish = () => {
    if (!activeTask) return;
    // 发布前自动校验，错误时提示但仍允许下发（演示用，方便预览体验）
    const r = validateGuideTask(activeTask);
    setReport(r);
    const published = guideStorage.publishTask(activeTask);
    updateTask(published);
    onPublished?.(published.id);
  };
  const handleCreateTask = () => {
    const t = createDefaultGuideTask(`导览任务 ${tasks.length + 1}`);
    const next = [...tasks, t];
    setTasks(next);
    guideStorage.saveAll(next);
    setActiveTaskId(t.id);
    setActiveStepId('');
    setActiveSubStepId('');
  };

  // ── 抽屉标题 ──
  const drawerTitle =
    activeSubStep ? `${activeSubStep.step.name}（子步骤）配置` :
    activeStep ? `${activeStep.name} 配置` :
    '请选择步骤';

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* 操作栏 */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border/60 px-4 py-2">
        {activeTask?.published && (
          <Badge className="bg-green-500/15 text-green-400">已发布</Badge>
        )}
        <span className="text-sm font-medium text-foreground">{activeTask?.name ?? '—'}</span>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleSave}>保存</Button>
          <Button size="sm" onClick={handlePublish}>发布并下发</Button>
        </div>
      </div>

      {/* 三栏主体 */}
      <div
        className="min-h-0 flex-1"
        style={{ display: 'grid', gridTemplateColumns: '180px 1fr 430px' }}
      >
        {/* 左：任务列表 */}
        <div className="flex flex-col border-r border-border">
          <div className="border-b border-border/60 px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            任务列表
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2 space-y-1">
            {tasks.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setActiveTaskId(t.id);
                  setActiveStepId('');
                  setActiveSubStepId('');
                }}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                  t.id === activeTaskId
                    ? 'border-primary/50 bg-primary/10 text-foreground'
                    : 'border-border/50 bg-card/40 text-muted-foreground hover:border-primary/30',
                )}
              >
                <div className="font-medium truncate">{t.published ? '★ ' : '☆ '}{t.name}</div>
                <div className="text-[11px] text-muted-foreground">{t.published ? '已发布' : '草稿'}</div>
              </button>
            ))}
            <Button size="sm" variant="outline" className="w-full" onClick={handleCreateTask}>
              <Plus className="mr-1 h-3.5 w-3.5" />新建任务
            </Button>
          </div>
        </div>

        {/* 中：步骤列表 */}
        <div className="flex min-h-0 flex-col border-r border-border">
          <div className="flex h-11 shrink-0 items-center justify-between border-b border-border/60 px-4">
            <span className="text-sm font-semibold">{activeTask?.name ?? '—'}</span>
            <span className="text-xs text-muted-foreground">{activeTask?.steps.length ?? 0} 步骤</span>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {activeTask ? (
              <StepList
                steps={activeTask.steps}
                activeStepId={activeStepId}
                activeSubStepId={activeSubStepId}
                onSelect={(stepId, subId) => {
                  setActiveStepId(stepId);
                  setActiveSubStepId(subId ?? '');
                }}
                onAdd={handleAddStep}
                onDelete={handleDeleteStep}
                onMove={handleMoveStep}
                onAddSub={handleAddSub}
                onDeleteSub={handleDeleteSub}
                onMoveSub={handleMoveSub}
                report={report}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                请先在左侧选择或新建任务
              </div>
            )}
          </div>
        </div>

        {/* 右：配置抽屉 */}
        <div className="flex min-h-0 flex-col">
          <div className="flex h-11 shrink-0 items-center border-b border-border/60 px-4">
            <span className="truncate text-sm font-medium">{drawerTitle}</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {activeSubStep && activeStep && (
              <StepConfigPanel
                step={activeSubStep.step}
                allSteps={activeTask?.steps ?? []}
                onChange={updateSubStep}
                report={report}
                subWrapper={activeSubStep}
                onSubWrapperChange={updateSubWrapper}
                parentStepName={activeStep.name}
              />
            )}
            {!activeSubStep && activeStep && (
              <StepConfigPanel
                step={activeStep}
                allSteps={activeTask?.steps ?? []}
                onChange={updateStep}
                report={report}
              />
            )}
            {!activeStep && (
              <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-muted-foreground">
                在中间步骤列表中选择一个步骤或子步骤
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
