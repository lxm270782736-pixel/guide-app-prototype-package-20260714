/**
 * 主动迎宾步骤配置面板
 *   - 迎宾点位改为点击选择（不手填 X/Y）
 *   - 动作改为「已选 chip + 添加动作下拉」
 *   - 话术支持生成音频 / 试听
 */

import { useRef, useState } from 'react';
import { Badge, Button, Input, Switch, cn } from '@astribot/ui';
import { Loader2, Pause, Play, Plus, Trash2, Wand2 } from 'lucide-react';
import {
  DEFAULT_TRIGGER_DISTANCE,
  GuideStep,
  GuideStepType,
  TRIGGER_DISTANCE_MAX,
  TRIGGER_DISTANCE_MIN,
  WelcomePrompt,
  newId,
} from '@/types';
import { WaypointPicker } from './WaypointPicker';

// 预设可选动作（真实工程从素材库拉取）
const ALL_ACTIONS = [
  { id: 'wave',        name: '挥手' },
  { id: 'bow',         name: '点头致意' },
  { id: 'salute',      name: '敬礼' },
  { id: 'open_arms',   name: '张开双臂欢迎' },
  { id: 'thumbs_up',   name: '竖大拇指' },
  { id: 'clap',        name: '鼓掌' },
  { id: 'point_fwd',   name: '伸手指引' },
  { id: 'chest_greet', name: '抚胸致意' },
];

interface Props {
  step: Extract<GuideStep, { type: GuideStepType.WELCOME }>;
  onChange: (next: GuideStep) => void;
}

export function WelcomeStepPanel({ step, onChange }: Props) {
  const cfg = step.config;
  const setCfg = (patch: Partial<typeof cfg>) => onChange({ ...step, config: { ...cfg, ...patch } });

  // Prompt helpers
  const addPrompt = () =>
    setCfg({ prompts: [...cfg.prompts, { id: newId('prompt'), text: '', actionIds: [], actionPlayMode: 'random', audioDuration: null }] });
  const removePrompt = (id: string) => setCfg({ prompts: cfg.prompts.filter((p) => p.id !== id) });
  const updatePrompt = (id: string, patch: Partial<WelcomePrompt>) =>
    setCfg({ prompts: cfg.prompts.map((p) => (p.id === id ? { ...p, ...patch } : p)) });

  return (
    <div className="space-y-4 rounded-lg border border-border/60 bg-muted/10 p-3">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">主动迎宾</div>

      {/* 迎宾点位（点击选择 / 地图选） */}
      <WaypointPicker
        label="迎宾点位"
        required
        category="welcome"
        value={cfg.waypoint}
        onChange={(p) => setCfg({ waypoint: p })}
      />

      {/* 触发距离 */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>触发距离（{TRIGGER_DISTANCE_MIN}–{TRIGGER_DISTANCE_MAX} m）</span>
          <Badge variant="secondary">{cfg.triggerDistance.toFixed(2)} m</Badge>
        </div>
        <input
          type="range"
          min={TRIGGER_DISTANCE_MIN}
          max={TRIGGER_DISTANCE_MAX}
          step={0.1}
          value={cfg.triggerDistance}
          onChange={(e) => setCfg({ triggerDistance: Number(e.target.value) })}
          className="w-full accent-primary"
        />
        <div className="text-[11px] text-muted-foreground">
          默认 {DEFAULT_TRIGGER_DISTANCE} m。识别人脸后立即转向并触发迎宾，识别完成后自动回到待命朝向。
        </div>
      </div>

      {/* 迎宾话术 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">迎宾话术（随机播放一条）</span>
          <Button size="sm" variant="outline" onClick={addPrompt}>
            <Plus className="mr-1 h-3.5 w-3.5" />添加话术
          </Button>
        </div>
        {cfg.prompts.map((p, idx) => (
          <PromptRow
            key={p.id}
            prompt={p}
            index={idx}
            canDelete={cfg.prompts.length > 1}
            onChange={(patch) => updatePrompt(p.id, patch)}
            onDelete={() => removePrompt(p.id)}
          />
        ))}
      </div>

      {/* 冷却时间 */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="text-xs text-muted-foreground">
          冷却时间 (s)
          <Input
            type="number"
            min={0}
            className="mt-1"
            value={cfg.cooldownSec}
            onChange={(e) => setCfg({ cooldownSec: Math.max(0, Number(e.target.value) || 0) })}
          />
        </label>
        <div className="flex items-center gap-2 rounded-md border border-dashed border-border/60 bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
          <Switch checked disabled />
          <span>迎宾完成 / 被语音交互打断后自动进入冷却（行为固定）</span>
        </div>
      </div>
    </div>
  );
}

// ── 单条话术行：文本 + 生成音频/试听 + 动作绑定 ──
function PromptRow({
  prompt,
  index,
  canDelete,
  onChange,
  onDelete,
}: {
  prompt: WelcomePrompt;
  index: number;
  canDelete: boolean;
  onChange: (patch: Partial<WelcomePrompt>) => void;
  onDelete: () => void;
}) {
  const [actionOpen, setActionOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(false);
  const rafRef = useRef<number | null>(null);

  const selected = ALL_ACTIONS.filter((a) => prompt.actionIds.includes(a.id));
  const remaining = ALL_ACTIONS.filter((a) => !prompt.actionIds.includes(a.id));

  const stopPlay = () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    setPlaying(false);
    setProgress(0);
  };
  const handleGenerate = async () => {
    stopPlay();
    setGenerating(true);
    setGenError(false);
    try {
      await new Promise<void>((resolve, reject) => {
        setTimeout(() => {
          if (Math.random() < 0.1) reject(new Error('TTS 服务暂时不可用'));
          else resolve();
        }, 800 + Math.random() * 400);
      });
      onChange({ audioDuration: Math.max(1, Math.round(prompt.text.length / 4)), text: prompt.text });
    } catch {
      setGenError(true);
      setTimeout(() => setGenError(false), 3000);
    } finally {
      setGenerating(false);
    }
  };
  const handlePlay = () => {
    if (!prompt.audioDuration) return;
    setPlaying(true);
    setProgress(0);
    const start = performance.now();
    const dur = prompt.audioDuration * 1000;
    const tick = (now: number) => {
      const r = Math.min(1, (now - start) / dur);
      setProgress(r);
      if (r < 1) rafRef.current = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const removeAction = (id: string) =>
    onChange({ actionIds: prompt.actionIds.filter((x) => x !== id) });
  // F01-4：每条话术只能绑定一个动作，新选会替换旧的
  const addAction = (id: string) => {
    onChange({ actionIds: [id] });
    setActionOpen(false);
  };

  return (
    <div
      className="rounded-md border border-border/60 bg-background/40 p-3 space-y-2"
      onClick={() => actionOpen && setActionOpen(false)}
    >
      {/* 文本行 */}
      <div className="flex items-center gap-2">
        <Badge variant="outline">话术 {index + 1}</Badge>
        <Input
          className="flex-1"
          placeholder="例如：欢迎来到展厅，我是讲解机器人小星"
          value={prompt.text}
          onChange={(e) => onChange({ text: e.target.value, audioDuration: null })}
        />
        <Button variant="ghost" size="icon" className="text-red-400" onClick={onDelete} disabled={!canDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* 生成音频 / 试听 */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          onClick={handleGenerate}
          disabled={!prompt.text.trim() || generating}
          className={cn(genError && 'border-2 border-red-400 ring-2 ring-red-400/40')}
        >
          {generating ? (
            <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />生成中…</>
          ) : (
            <><Wand2 className="mr-1 h-3.5 w-3.5" />生成音频</>
          )}
        </Button>
        {prompt.audioDuration ? (
          <>
            <Button size="sm" variant="outline" onClick={playing ? stopPlay : handlePlay}>
              {playing
                ? <><Pause className="mr-1 h-3.5 w-3.5" />停止</>
                : <><Play className="mr-1 h-3.5 w-3.5" />试听</>}
            </Button>
            <Badge variant="secondary">{prompt.audioDuration}s</Badge>
          </>
        ) : !generating && !genError ? (
          <span className="text-[11px] text-muted-foreground">编辑话术后点"生成音频"得到时长</span>
        ) : null}
        {genError && (
          <span className="text-[11px] text-red-400">生成失败，请重试</span>
        )}
        {prompt.audioDuration ? (
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/60">
            <div
              className="h-full bg-primary transition-[width] duration-75"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        ) : null}
      </div>

      {/* 动作绑定（每条话术绑定一个动作） */}
      <div className="space-y-1.5">
        <div className="text-[11px] text-muted-foreground">绑定动作</div>

        <div className="flex flex-wrap items-center gap-1.5">
          {selected.length === 0 && (
            <span className="text-[11px] text-muted-foreground">尚未绑定动作</span>
          )}
          {selected.map((a) => (
            <span
              key={a.id}
              className="inline-flex items-center gap-1 rounded-full border border-primary/50 bg-primary/10 pl-2.5 pr-1 py-0.5 text-[11px] text-primary"
            >
              {a.name}
              <button
                type="button"
                onClick={() => removeAction(a.id)}
                className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full hover:bg-primary/20"
              >
                ✕
              </button>
            </span>
          ))}

          {/* + 添加动作（仅在未绑定时可用） */}
          {selected.length === 0 && (
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                disabled={remaining.length === 0}
                onClick={() => setActionOpen((v) => !v)}
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-3 w-3" />添加动作
              </button>
              {actionOpen && remaining.length > 0 && (
                <div className="absolute left-0 top-7 z-30 w-44 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
                  <div className="border-b border-border/60 px-3 py-1.5 text-[11px] text-muted-foreground">
                    选择要绑定的动作
                  </div>
                  {remaining.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => addAction(a.id)}
                      className="flex w-full items-center gap-2 border-b border-border/60 px-3 py-1.5 text-left text-[12px] text-foreground last:border-0 hover:bg-muted/30"
                    >
                      🤖 {a.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
