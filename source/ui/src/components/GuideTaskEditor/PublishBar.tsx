/**
 * 顶栏
 */

import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Compass,
  PlayCircle,
  Plus,
  Rocket,
  ScrollText,
  ShieldAlert,
} from 'lucide-react';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@astribot/ui';
import { ConflictReport, GuideTask } from '@/types';
import { summarizeReport } from './utils/validate';

interface Props {
  tasks: GuideTask[];
  activeTaskId: string;
  onSwitchTask: (id: string) => void;
  onCreateTask: () => void;
  onTaskRename: (name: string) => void;
  onSave: () => void;
  onValidate: () => ConflictReport;
  onPublish: () => void;
  onBack?: () => void;
  published: boolean;
  report: ConflictReport | null;
}

export function PublishBar({
  tasks,
  activeTaskId,
  onSwitchTask,
  onCreateTask,
  onTaskRename,
  onSave,
  onValidate,
  onPublish,
  onBack,
  published,
  report,
}: Props) {
  const active = tasks.find((t) => t.id === activeTaskId);
  const [showReport, setShowReport] = useState(false);
  const [stage, setStage] = useState<'idle' | 'arriving' | 'standby' | 'guiding'>('idle');

  useEffect(() => {
    if (report && (!report.ok || report.items.length > 0)) setShowReport(true);
  }, [report]);

  const handleArrive = () => {
    setStage('arriving');
    window.setTimeout(() => setStage('standby'), 1200);
  };

  const handleStartGuide = () => {
    if (stage === 'standby') setStage('guiding');
  };

  const handleStopGuide = () => setStage('standby');

  return (
    <div className="rounded-xl border border-border bg-card/80 px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-1 h-4 w-4" /> 返回
          </Button>
        )}
        <span className="text-sm font-medium text-foreground">导览任务编排</span>
        <Badge variant="outline">PRD v0.7 · 623 演示版</Badge>

        <div className="ml-2 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">当前任务</span>
          <select
            className="rounded-md border border-border bg-background px-2 py-1 text-xs"
            value={activeTaskId}
            onChange={(e) => onSwitchTask(e.target.value)}
          >
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.published ? '（已发布）' : '（草稿）'}
              </option>
            ))}
          </select>
          {active && (
            <Input
              className="w-48"
              value={active.name}
              onChange={(e) => onTaskRename(e.target.value)}
              placeholder="任务名"
            />
          )}
          <Button variant="ghost" size="sm" onClick={onCreateTask} title="新建任务">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={onSave}>
            <ScrollText className="mr-1 h-3.5 w-3.5" /> 保存
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onValidate();
              setShowReport(true);
            }}
          >
            <ShieldAlert className="mr-1 h-3.5 w-3.5" /> 校验冲突
          </Button>
          <Button size="sm" onClick={onPublish}>
            <Rocket className="mr-1 h-3.5 w-3.5" /> 发布并下发
          </Button>
        </div>
      </div>

      {/* 下发后操作区：前往开始点位 + 开始导览 */}
      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-md border border-dashed border-border/60 bg-muted/10 px-3 py-2 text-xs">
        <Badge variant="secondary">导览前就位</Badge>
        <span className="text-muted-foreground">
          状态：
          <span className="ml-1 font-medium text-foreground">{stageLabel(stage, published)}</span>
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!published || stage === 'guiding' || stage === 'arriving'}
            onClick={handleArrive}
          >
            <Compass className="mr-1 h-3.5 w-3.5" />
            前往开始点位
          </Button>
          <Button
            size="sm"
            disabled={stage !== 'standby'}
            onClick={handleStartGuide}
          >
            <PlayCircle className="mr-1 h-3.5 w-3.5" />
            开始导览
          </Button>
          {stage === 'guiding' && (
            <Button size="sm" variant="ghost" onClick={handleStopGuide}>
              结束导览
            </Button>
          )}
        </div>
      </div>

      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <span className="flex items-center gap-2">
                {report?.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <ShieldAlert className="h-4 w-4 text-red-400" />}
                {report ? summarizeReport(report) : '请先点击"校验冲突"'}
              </span>
            </DialogTitle>
            <DialogDescription>
              校验范围：底盘移动 / 转向 / 动作执行器冲突、子步骤时间窗重叠、必填项缺失
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto">
            {report && report.items.length > 0 ? (
              <ul className="space-y-1.5 text-sm">
                {report.items.map((it, i) => (
                  <li
                    key={i}
                    className={`rounded-md border px-2 py-1.5 ${
                      it.severity === 'error'
                        ? 'border-red-400/40 bg-red-500/5 text-red-300'
                        : 'border-yellow-400/40 bg-yellow-500/5 text-yellow-300'
                    }`}
                  >
                    <span className="mr-2 font-medium">
                      {it.severity === 'error' ? '✕ 错误' : '⚠ 提示'}
                    </span>
                    {it.message}
                    <span className="ml-2 text-[10px] uppercase opacity-70">{it.code}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">无冲突，可以发布</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReport(false)}>
              关闭
            </Button>
            <Button onClick={onPublish} disabled={!report?.ok}>
              确认发布
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function stageLabel(stage: 'idle' | 'arriving' | 'standby' | 'guiding', published: boolean) {
  if (!published) return '尚未发布';
  switch (stage) {
    case 'idle':
      return '空闲（未触发"前往开始点位"）';
    case 'arriving':
      return '正在前往开始点位…';
    case 'standby':
      return '已在开始点位待命';
    case 'guiding':
      return '导览进行中';
  }
}
