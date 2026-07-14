/**
 * 任务级语音交互配置
 *   - 唤醒词语音交互开关 + 结束对话等待
 *   - 唤醒后回应话术 + 收音时长
 *   - 语音指令开关 + 单条指令配置（说法 / 执行内容）
 */

import { Button, Input, Switch } from '@astribot/ui';
import { Plus, Trash2 } from 'lucide-react';
import {
  GuideStep,
  newId,
  VoiceCommandConfig,
  VoiceInteractionConfig,
} from '@/types';

interface Props {
  value: VoiceInteractionConfig;
  steps: GuideStep[];
  onChange: (next: VoiceInteractionConfig) => void;
}

const COMMAND_ACTION_TYPES: Array<{ value: VoiceCommandConfig['action']['type']; label: string }> = [
  { value: 'pause', label: '暂停任务' },
  { value: 'resume', label: '继续任务' },
  { value: 'jump', label: '跳转步骤' },
  { value: 'say', label: '播放话术' },
  { value: 'play_action', label: '播放动作' },
  { value: 'custom', label: '自定义' },
];

export function VoiceInteractionPanel({ value, steps, onChange }: Props) {
  const updateCommand = (id: string, patch: Partial<VoiceCommandConfig>) =>
    onChange({
      ...value,
      commands: value.commands.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });

  const addCommand = () =>
    onChange({
      ...value,
      commands: [
        ...value.commands,
        {
          id: newId('cmd'),
          enabled: true,
          name: '新指令',
          sayings: [''],
          activeStates: ['welcome', 'idle'],
          action: { type: 'pause' },
        },
      ],
    });

  const removeCommand = (id: string) =>
    onChange({ ...value, commands: value.commands.filter((c) => c.id !== id) });

  return (
    <div className="space-y-4">
      {/* 总开关 + 结束等待 */}
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-border/60 bg-background/40 p-3">
        <Switch
          checked={value.enabled}
          onCheckedChange={(v) => onChange({ ...value, enabled: !!v })}
        />
        <span className="text-sm font-medium text-foreground">启用唤醒词语音交互</span>
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span>结束对话等待时长 (s)</span>
          <Input
            type="number"
            className="w-24"
            min={1}
            value={value.endWaitSec}
            onChange={(e) => onChange({ ...value, endWaitSec: Math.max(1, Number(e.target.value) || 1) })}
          />
        </div>
      </div>

      {/* 唤醒词响应 */}
      <div className="grid grid-cols-1 gap-3 rounded-md border border-border/60 bg-background/40 p-3 md:grid-cols-3">
        <label className="text-xs text-muted-foreground md:col-span-2">
          唤醒后回应话术（仅"只说唤醒词"场景播放）
          <Input
            className="mt-1"
            placeholder="例：我在"
            value={value.wakeupReplyText}
            onChange={(e) => onChange({ ...value, wakeupReplyText: e.target.value })}
          />
        </label>
        <label className="text-xs text-muted-foreground">
          唤醒后收音时长 (s)
          <Input
            type="number"
            className="mt-1"
            min={1}
            value={value.recordSec}
            onChange={(e) => onChange({ ...value, recordSec: Math.max(1, Number(e.target.value) || 1) })}
          />
        </label>
        <div className="text-[11px] text-muted-foreground md:col-span-3">
          说明：唤醒词文本固定，不在导览 App 配置台编辑；说"唤醒词 + 明确意图"时不播放回应话术。
        </div>
      </div>

      {/* 语音指令 */}
      <div className="rounded-md border border-border/60 bg-background/40 p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Switch
              checked={value.commandsEnabled}
              onCheckedChange={(v) => onChange({ ...value, commandsEnabled: !!v })}
            />
            <span className="text-sm font-medium text-foreground">启用语音指令</span>
          </div>
          <Button size="sm" variant="outline" onClick={addCommand} disabled={!value.commandsEnabled}>
            <Plus className="mr-1 h-3.5 w-3.5" /> 添加指令
          </Button>
        </div>

        {value.commands.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/60 px-4 py-6 text-center text-xs text-muted-foreground">
            尚未配置语音指令。常见示例：暂停 / 继续 / 跳到下一展点 / 播报指定内容
          </div>
        ) : (
          <div className="space-y-2">
            {value.commands.map((cmd) => (
              <CommandRow
                key={cmd.id}
                cmd={cmd}
                steps={steps}
                onChange={(patch) => updateCommand(cmd.id, patch)}
                onRemove={() => removeCommand(cmd.id)}
              />
            ))}
          </div>
        )}

        <div className="mt-3 rounded-md border border-dashed border-border/60 bg-muted/10 px-3 py-2 text-[11px] text-muted-foreground">
          任务影响：迎宾中被语音交互打断 → 进入冷却；讲解中被打断 → 按定点讲解步骤的打断配置处理；移动中不进入语音交互。
        </div>
      </div>
    </div>
  );
}

function CommandRow({
  cmd,
  steps,
  onChange,
  onRemove,
}: {
  cmd: VoiceCommandConfig;
  steps: GuideStep[];
  onChange: (patch: Partial<VoiceCommandConfig>) => void;
  onRemove: () => void;
}) {
  const updateAction = (patch: Partial<VoiceCommandConfig['action']>) =>
    onChange({ action: { ...cmd.action, ...patch } });

  return (
    <div className="rounded-md border border-border/60 bg-card/50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Switch checked={cmd.enabled} onCheckedChange={(v) => onChange({ enabled: !!v })} />
        <Input
          className="w-40"
          value={cmd.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="指令名"
        />
        <select
          className="rounded-md border border-border bg-background px-2 py-1 text-xs"
          value={cmd.action.type}
          onChange={(e) =>
            updateAction({ type: e.target.value as VoiceCommandConfig['action']['type'] })
          }
        >
          {COMMAND_ACTION_TYPES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {cmd.action.type === 'jump' && (
          <select
            className="rounded-md border border-border bg-background px-2 py-1 text-xs"
            value={cmd.action.targetStepId ?? ''}
            onChange={(e) => updateAction({ targetStepId: e.target.value })}
          >
            <option value="">选择目标步骤</option>
            {steps.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
        {cmd.action.type === 'say' && (
          <Input
            className="flex-1"
            placeholder="要播放的话术"
            value={cmd.action.text ?? ''}
            onChange={(e) => updateAction({ text: e.target.value })}
          />
        )}
        {cmd.action.type === 'play_action' && (
          <Input
            className="flex-1"
            placeholder="动作 ID（如 wave）"
            value={cmd.action.actionId ?? ''}
            onChange={(e) => updateAction({ actionId: e.target.value })}
          />
        )}
        {cmd.action.type === 'custom' && (
          <Input
            className="flex-1"
            placeholder="自定义说明"
            value={cmd.action.custom ?? ''}
            onChange={(e) => updateAction({ custom: e.target.value })}
          />
        )}
        <Button variant="ghost" size="icon" className="ml-auto text-red-400" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="mt-2">
        <label className="text-xs text-muted-foreground">
          识别说法（多个用 / 分隔）
          <Input
            className="mt-1"
            placeholder="暂停 / 停一下 / 等等"
            value={cmd.sayings.join(' / ')}
            onChange={(e) =>
              onChange({
                sayings: e.target.value
                  .split('/')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>
      </div>
    </div>
  );
}
