/**
 * 定点讲解步骤配置面板
 *   - 讲解稿 ≤500 字 + 模拟生成音频 + 试听
 *   - 等待开始时间（默认 0s）
 */

import { useRef, useState } from 'react';
import { Badge, Button, Input, cn } from '@astribot/ui';
import { Loader2, Pause, Play, Wand2 } from 'lucide-react';
import {
  GuideStep,
  GuideStepType,
  SCRIPT_MAX_CHARS,
} from '@/types';

interface Props {
  step: Extract<GuideStep, { type: GuideStepType.POI_SPEECH }>;
  onChange: (next: GuideStep) => void;
}

/** 极简 TTS 时长估算：中文按 ~4 字/秒，最低 1s */
function estimateAudioDuration(text: string): number {
  if (!text.trim()) return 0;
  return Math.max(1, Math.round(text.length / 4));
}

export function POISpeechPanel({ step, onChange }: Props) {
  const cfg = step.config;
  const [playing, setPlaying] = useState(false);
  const [playProgress, setPlayProgress] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(false);
  const timerRef = useRef<number | null>(null);

  const setCfg = (patch: Partial<typeof cfg>) =>
    onChange({ ...step, config: { ...cfg, ...patch } });

  const wordCount = cfg.script.length;
  const overLimit = wordCount > SCRIPT_MAX_CHARS;

  const handleStop = () => {
    if (timerRef.current !== null) cancelAnimationFrame(timerRef.current);
    setPlaying(false);
    setPlayProgress(0);
  };

  const handleGenerate = async () => {
    handleStop();
    setGenerating(true);
    setGenError(false);
    try {
      await new Promise<void>((resolve, reject) => {
        setTimeout(() => {
          if (Math.random() < 0.1) reject(new Error('TTS 服务暂时不可用'));
          else resolve();
        }, 800 + Math.random() * 400);
      });
      const dur = estimateAudioDuration(cfg.script);
      setCfg({ audioDuration: dur });
      setPlayProgress(0);
    } catch {
      setGenError(true);
      setTimeout(() => setGenError(false), 3000);
    } finally {
      setGenerating(false);
    }
  };

  const handlePlay = () => {
    if (!cfg.audioDuration) return;
    setPlaying(true);
    setPlayProgress(0);
    const start = performance.now();
    const dur = cfg.audioDuration * 1000;
    const tick = (now: number) => {
      const elapsed = now - start;
      const ratio = Math.min(1, elapsed / dur);
      setPlayProgress(ratio);
      if (ratio < 1) {
        timerRef.current = window.requestAnimationFrame(tick);
      } else {
        setPlaying(false);
      }
    };
    timerRef.current = window.requestAnimationFrame(tick);
  };

  return (
    <div className="space-y-4 rounded-lg border border-border/60 bg-muted/10 p-3">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        定点讲解
      </div>

      {/* 讲解稿 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>讲解稿（≤ {SCRIPT_MAX_CHARS} 字）</span>
          <span className={overLimit ? 'text-red-400' : ''}>{wordCount} / {SCRIPT_MAX_CHARS}</span>
        </div>
        <textarea
          rows={6}
          className="w-full resize-y rounded-md border border-border bg-background/40 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none"
          placeholder="录入展点讲解内容，系统将根据文本生成讲解音频..."
          value={cfg.script}
          onChange={(e) => setCfg({ script: e.target.value })}
        />
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={handleGenerate}
            disabled={!cfg.script.trim() || overLimit || generating}
            className={cn(genError && 'border-2 border-red-400 ring-2 ring-red-400/40')}
          >
            {generating ? (
              <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> 生成中…</>
            ) : (
              <><Wand2 className="mr-1 h-3.5 w-3.5" /> 生成讲解音频</>
            )}
          </Button>
          {cfg.audioDuration ? (
            <>
              <Button size="sm" variant="outline" onClick={playing ? handleStop : handlePlay}>
                {playing ? <Pause className="mr-1 h-3.5 w-3.5" /> : <Play className="mr-1 h-3.5 w-3.5" />}
                {playing ? '停止试听' : '试听'}
              </Button>
              <Badge variant="secondary">{cfg.audioDuration}s</Badge>
            </>
          ) : !generating && !genError ? (
            <span className="text-[11px] text-muted-foreground">点击"生成讲解音频"得到时长</span>
          ) : null}
          {genError && (
            <span className="text-[11px] text-red-400">生成失败，请重试</span>
          )}
        </div>
        {cfg.audioDuration ? (
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-[width] duration-75"
              style={{ width: `${Math.round(playProgress * 100)}%` }}
            />
          </div>
        ) : null}
      </div>

      {/* 播放控制：进入步骤后等待时间（F03-3） */}
      <fieldset className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <NumberField
          label="进入步骤后等待 (s)"
          value={cfg.startDelaySec}
          onChange={(v) => setCfg({ startDelaySec: Math.max(0, v ?? 0) })}
          min={0}
        />
      </fieldset>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  readOnly,
}: {
  label: string;
  value: number | null;
  onChange: (next: number | null) => void;
  min?: number;
  readOnly?: boolean;
}) {
  return (
    <label className="text-xs text-muted-foreground">
      {label}
      <Input
        type="number"
        min={min}
        readOnly={readOnly}
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
