/**
 * 导览任务编排主页面（PRD v1.6）
 *
 * 布局（参考原型）：
 *   ┌── 顶栏：返回 / 标题 / Tab切换（任务编辑｜任务下发）/ 编辑操作
 *   ├── [任务编辑] 3栏: 任务列表(180px) | 步骤列表(1fr) | 右侧抽屉(430px)
 *   └── [任务下发] DispatchPage：地图 | 运行控制台
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { Badge, Button, cn } from '@astribot/ui';
import type { ConflictReport, GuideStep, GuideTask } from '@/types';
import { createDefaultGuideTask } from '@/types';
import { guideStorage } from '@/services/guideStorage';
import { validateGuideTask } from './utils/validate';
import { StepList } from './StepList';
import { StepConfigPanel } from './StepConfigPanel';
import { VoiceInteractionPanel } from './VoiceInteractionPanel';
import { BreathingPanel } from './BreathingPanel';
import { DispatchPage } from './DispatchPage';

type PageTab = 'edit' | 'dispatch';
type DrawerMode = 'step' | 'voice' | 'breathing';

export function GuideTaskEditor() {
  const navigate = useNavigate();

  // ── 数据层 ──
  const [tasks, setTasks] = useState<GuideTask[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string>('');

  // ── 编辑层 ──
  const [pageTab, setPageTab] = useState<PageTab>('edit');
  const [activeStepId, setActiveStepId] = useState<string>('');
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('step');
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

  // ── 任务级操作 ──
  function updateTask(next: GuideTask) {
    setTasks((prev) => prev.map((t) => (t.id === next.id ? next : t)));
  }
  function updateStep(next: GuideStep) {
    if (!activeTask) return;
    updateTask({ ...activeTask, steps: activeTask.steps.map((s) => (s.id === next.id ? next : s)) });
  }
  function handleAddStep(step: GuideStep) {
    if (!activeTask) return;
    updateTask({ ...activeTask, steps: [...activeTask.steps, step] });
    setActiveStepId(step.id);
    setDrawerMode('step');
  }
  function handleDeleteStep(id: string) {
    if (!activeTask) return;
    updateTask({ ...activeTask, steps: activeTask.steps.filter((s) => s.id !== id) });
    if (activeStepId === id) setActiveStepId('');
  }
  function handleMoveStep(id: string, dir: -1 | 1) {
    if (!activeTask) return;
    const idx = activeTask.steps.findIndex((s) => s.id === id);
    const tgt = idx + dir;
    if (idx < 0 || tgt < 0 || tgt >= activeTask.steps.length) return;
    const next = [...activeTask.steps];
    [next[idx], next[tgt]] = [next[tgt], next[idx]];
    updateTask({ ...activeTask, steps: next });
  }
  function handleCreateTask() {
    const t = createDefaultGuideTask(`新导览任务 ${tasks.length + 1}`);
    const next = [...tasks, t];
    setTasks(next);
    guideStorage.saveAll(next);
    setActiveTaskId(t.id);
    setActiveStepId('');
  }
  function handleSave() {
    if (!activeTask) return;
    guideStorage.saveTask(activeTask);
  }
  function handlePublish() {
    if (!activeTask) return;
    const r = validateGuideTask(activeTask);
    setReport(r);
    if (!r.ok) return;
    updateTask(guideStorage.publishTask(activeTask));
  }

  if (!activeTask) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-sm text-muted-foreground">
        <p>暂无导览任务</p>
        <Button variant="outline" onClick={() => navigate('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回首页
        </Button>
      </div>
    );
  }

  // ── 抽屉标题 ──
  const drawerTitle =
    drawerMode === 'voice' ? '语音交互配置' :
    drawerMode === 'breathing' ? '呼吸感动作配置' :
    activeStep ? `${activeStep.name} 配置` : '请选择步骤';

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">

      {/* ── 顶栏 ── */}
      <div className="flex h-[56px] shrink-0 items-center gap-3 border-b border-border px-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          返回
        </Button>
        <div>
          <span className="text-base font-semibold text-foreground">导览任务编排</span>
          <span className="ml-2 text-xs text-muted-foreground">PRD v1.6</span>
        </div>

        {/* Tab 切换 */}
        <div className="ml-2 flex rounded-md border border-border bg-muted/30 p-0.5">
          {(['edit', 'dispatch'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setPageTab(tab)}
              className={cn(
                'h-7 rounded px-4 text-sm transition-colors',
                pageTab === tab
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab === 'edit' ? '任务编辑' : '任务下发'}
            </button>
          ))}
        </div>

        {/* 编辑操作（仅编辑 Tab 显示） */}
        {pageTab === 'edit' && (
          <div className="ml-auto flex items-center gap-2">
            {activeTask.published && (
              <Badge className="bg-green-500/15 text-green-400">已发布</Badge>
            )}
            <Button size="sm" variant="outline" onClick={handleSave}>保存</Button>
            <Button size="sm" onClick={handlePublish}>发布并下发</Button>
          </div>
        )}
      </div>

      {/* ── 任务编辑页 ── */}
      {pageTab === 'edit' && (
        <div
          className="min-h-0 flex-1 gap-0"
          style={{ display: 'grid', gridTemplateColumns: '180px 1fr 430px' }}
        >
          {/* 左栏：任务列表 */}
          <div className="flex flex-col border-r border-border">
            <div className="border-b border-border/60 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              任务管理
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2 space-y-1">
              {tasks.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { setActiveTaskId(t.id); setActiveStepId(''); setDrawerMode('step'); }}
                  className={cn(
                    'w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                    t.id === activeTaskId
                      ? 'border-primary/50 bg-primary/10 text-foreground'
                      : 'border-border/50 bg-card/40 text-muted-foreground hover:border-primary/30',
                  )}
                >
                  <div className="font-medium truncate">
                    {t.published ? '★ ' : '☆ '}{t.name}
                  </div>
                  <div className="text-[11px] mt-0.5 text-muted-foreground">
                    {t.published ? '已发布' : '草稿'}
                  </div>
                </button>
              ))}
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={handleCreateTask}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                新建任务
              </Button>
            </div>

            {/* 任务级配置入口 */}
            <div className="border-t border-border/60 p-2 space-y-1">
              <button
                type="button"
                onClick={() => { setDrawerMode('voice'); setActiveStepId(''); }}
                className={cn(
                  'w-full rounded-md border px-3 py-1.5 text-left text-xs transition-colors',
                  drawerMode === 'voice'
                    ? 'border-primary/50 bg-primary/10 text-foreground'
                    : 'border-border/50 text-muted-foreground hover:border-primary/30',
                )}
              >
                🎤 语音交互配置
              </button>
              <button
                type="button"
                onClick={() => { setDrawerMode('breathing'); setActiveStepId(''); }}
                className={cn(
                  'w-full rounded-md border px-3 py-1.5 text-left text-xs transition-colors',
                  drawerMode === 'breathing'
                    ? 'border-primary/50 bg-primary/10 text-foreground'
                    : 'border-border/50 text-muted-foreground hover:border-primary/30',
                )}
              >
                💨 呼吸感动作配置
              </button>
            </div>
          </div>

          {/* 中栏：步骤列表 */}
          <div className="flex min-h-0 flex-col border-r border-border">
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-border/60 px-4">
              <span className="text-sm font-semibold">{activeTask.name}</span>
              <span className="text-xs text-muted-foreground">{activeTask.steps.length} 步骤</span>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <StepList
                steps={activeTask.steps}
                activeStepId={activeStepId}
                onSelect={(id) => { setActiveStepId(id); setDrawerMode('step'); }}
                onAdd={handleAddStep}
                onDelete={handleDeleteStep}
                onMove={handleMoveStep}
                onAddSub={() => {}}
                onDeleteSub={() => {}}
                onMoveSub={() => {}}
                report={report}
              />
            </div>
          </div>

          {/* 右栏：配置抽屉 */}
          <div className="flex min-h-0 flex-col">
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-border/60 px-4">
              <span className="text-sm font-medium text-foreground truncate">{drawerTitle}</span>
              {drawerMode === 'step' && activeStep && (
                <Badge variant="secondary" className="text-[11px]">主步骤</Badge>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {drawerMode === 'voice' && (
                <VoiceInteractionPanel
                  value={activeTask.voice}
                  steps={activeTask.steps}
                  onChange={(voice) => updateTask({ ...activeTask, voice })}
                />
              )}
              {drawerMode === 'breathing' && (
                <BreathingPanel
                  value={activeTask.breathing}
                  onChange={(breathing) => updateTask({ ...activeTask, breathing })}
                />
              )}
              {drawerMode === 'step' && activeStep && (
                <StepConfigPanel
                  step={activeStep}
                  allSteps={activeTask.steps}
                  onChange={updateStep}
                  report={report}
                />
              )}
              {drawerMode === 'step' && !activeStep && (
                <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-muted-foreground">
                  在左侧步骤列表中选择一个步骤
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 任务下发页 ── */}
      {pageTab === 'dispatch' && (
        <DispatchPage
          tasks={tasks}
          activeTask={activeTask}
          onSwitchTask={(id) => setActiveTaskId(id)}
        />
      )}
    </div>
  );
}

export default GuideTaskEditor;
