/**
 * 呼吸感动作模式配置
 *   - 启用开关 + 动作来源 + 播放方式
 *   - 生效规则在文案里说明（行为固定，不暴露字段）
 */

import { Switch } from '@astribot/ui';
import { BreathingActionConfig } from '@/types';

interface Props {
  value: BreathingActionConfig;
  onChange: (next: BreathingActionConfig) => void;
}

const PRESET_ACTIONS = [
  { id: 'breath_chest', name: '胸前呼吸' },
  { id: 'breath_sway', name: '左右轻晃' },
  { id: 'breath_lookaround', name: '左右环视' },
  { id: 'breath_blink', name: '眨眼' },
  { id: 'breath_mini_nod', name: '微点头' },
];

export function BreathingPanel({ value, onChange }: Props) {
  const toggleAction = (id: string) => {
    const has = value.actionIds.includes(id);
    onChange({
      ...value,
      actionIds: has ? value.actionIds.filter((x) => x !== id) : [...value.actionIds, id],
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-border/60 bg-background/40 p-3">
        <Switch
          checked={value.enabled}
          onCheckedChange={(v) => onChange({ ...value, enabled: !!v })}
        />
        <span className="text-sm font-medium text-foreground">启用呼吸感动作</span>
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span>播放方式</span>
          <div className="flex rounded-md bg-muted/40 p-0.5">
            {(['fixed', 'random'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onChange({ ...value, playMode: m })}
                className={`px-2 py-0.5 text-[11px] ${value.playMode === m ? 'rounded bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
              >
                {m === 'fixed' ? '固定动作' : '随机播放'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-md border border-border/60 bg-background/40 p-3">
        <div className="mb-2 text-xs text-muted-foreground">候选呼吸感动作</div>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_ACTIONS.map((a) => {
            const selected = value.actionIds.includes(a.id);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => toggleAction(a.id)}
                className={`rounded-full border px-3 py-1 text-[12px] transition-colors ${
                  selected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground'
                }`}
              >
                {a.name}
              </button>
            );
          })}
        </div>
        {value.playMode === 'fixed' && value.actionIds.length > 1 && (
          <div className="mt-2 text-[11px] text-yellow-400">
            固定动作模式下仅使用列表第一个：{PRESET_ACTIONS.find((a) => a.id === value.actionIds[0])?.name}
          </div>
        )}
      </div>

      <div className="rounded-md border border-dashed border-border/60 bg-muted/10 px-3 py-2 text-[11px] text-muted-foreground">
        生效规则：任务开始且已触发具体步骤后，机器人空档（无移动 / 转向 / 手部动作）时播放；移动、转向或动作开始时自动暂停，结束后回到空档则重新播放。
      </div>
    </div>
  );
}
