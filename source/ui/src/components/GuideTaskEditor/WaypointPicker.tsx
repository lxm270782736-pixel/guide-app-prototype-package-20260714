/**
 * 点位选择器：列表下拉 + 地图预览弹窗
 * 复用真实工程的 MapCanvas + Mock 地图，让配置者点击地图选点。
 */

import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import {
  Badge, Button, cn, Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@astribot/ui';
import { ChevronDown, MapPin } from 'lucide-react';
import type { Pose } from '@/types';
import {
  MOCK_MAP,
  PRESET_WAYPOINTS,
  PresetWaypoint,
  findPresetWaypointId,
} from '@/services/mockMap';

// MapCanvas 内部依赖 ROS 订阅等，仅在地图弹窗打开时才加载
const MapCanvas = lazy(() =>
  import('@/components/common/MapCanvas').then((m) => ({ default: m.MapCanvas })),
);

interface Props {
  value: Pose | null;
  onChange: (next: Pose) => void;
  /** 仅展示对应分类的点位（welcome / speech / move），不传 = 全部 */
  category?: PresetWaypoint['category'];
  label?: string;
  required?: boolean;
}

const CATEGORY_COLOR: Record<PresetWaypoint['category'], string> = {
  welcome: '#22c55e',
  speech: '#f59e0b',
  move: '#38bdf8',
  general: '#94a3b8',
};

export function WaypointPicker({
  value, onChange, category, label = '点位', required,
}: Props) {
  const [listOpen, setListOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!listOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setListOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [listOpen]);

  // 过滤可选点位
  const candidates = category
    ? PRESET_WAYPOINTS.filter((p) => p.category === category || p.category === 'general')
    : PRESET_WAYPOINTS;

  const wpId = findPresetWaypointId(value);
  const wpInfo = PRESET_WAYPOINTS.find((p) => p.id === wpId);

  const pick = (p: PresetWaypoint) => {
    onChange({ x: p.x, y: p.y, theta: p.theta });
    setListOpen(false);
    setMapOpen(false);
  };

  return (
    <div ref={rootRef} className="relative space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {label} {required && <span className="text-red-400">*</span>}
        </span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
          onClick={() => setMapOpen(true)}
        >
          🗺 在地图上选
        </Button>
      </div>

      {/* 下拉触发器 */}
      <button
        type="button"
        onClick={() => setListOpen((v) => !v)}
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-md border bg-background px-3 text-sm transition-colors',
          value ? 'border-border text-foreground' : 'border-yellow-500/60 text-yellow-500',
          listOpen && 'border-primary',
        )}
      >
        <span className="flex items-center gap-2 truncate">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          {value ? (
            <>
              <span className="font-medium">{wpInfo?.name ?? '自定义点位'}</span>
              <span className="text-xs text-muted-foreground">
                ({value.x.toFixed(2)}, {value.y.toFixed(2)})
              </span>
            </>
          ) : (
            <span>点击选择已录制的点位</span>
          )}
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', listOpen && 'rotate-180')} />
      </button>

      {/* 下拉列表 */}
      {listOpen && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-border bg-card shadow-xl">
          <div className="border-b border-border/60 px-3 py-2 text-[11px] text-muted-foreground">
            从已录制的点位中选择
          </div>
          <div className="max-h-60 overflow-y-auto">
            {candidates.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => pick(p)}
                className={cn(
                  'flex w-full items-center justify-between border-b border-border/60 px-3 py-2 text-left text-sm last:border-0 hover:bg-muted/40',
                  wpId === p.id && 'bg-primary/10',
                )}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLOR[p.category] }}
                  />
                  <span className="font-medium text-foreground">{p.name}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {p.category === 'welcome' ? '迎宾' : p.category === 'speech' ? '讲解' : p.category === 'move' ? '移动' : '通用'}
                  </Badge>
                </span>
                <span className="text-xs text-muted-foreground">
                  ({p.x.toFixed(2)}, {p.y.toFixed(2)})
                </span>
              </button>
            ))}
          </div>
          <div className="border-t border-border/60 px-3 py-2 text-[11px] text-muted-foreground">
            需要新点位？请到「点位录制」Tab 录制后回来选择。
          </div>
        </div>
      )}

      {/* 地图预览弹窗 */}
      <Dialog open={mapOpen} onOpenChange={setMapOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>在地图上选择点位</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              <span>图例：</span>
              {(['welcome', 'speech', 'move'] as const).map((c) => (
                <span key={c} className="inline-flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLOR[c] }} />
                  {c === 'welcome' ? '迎宾点位' : c === 'speech' ? '讲解点位' : '导览点位'}
                </span>
              ))}
              <span className="ml-2">地图：{MOCK_MAP.name}（{(MOCK_MAP.width * MOCK_MAP.resolution).toFixed(0)}m × {(MOCK_MAP.height * MOCK_MAP.resolution).toFixed(0)}m）</span>
            </div>

            {/* MapCanvas 渲染 mock 地图 + waypoints */}
            <div className="h-[460px] rounded-lg border border-border overflow-hidden">
              <Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-muted-foreground">地图加载中…</div>}>
                <MapCanvas
                  mapData={MOCK_MAP}
                  waypoints={candidates.map((p) => ({ x: p.x, y: p.y, theta: p.theta }))}
                  waypointLabels={candidates.map((p) => p.name)}
                  waypointColors={candidates.map((p) => CATEGORY_COLOR[p.category])}
                  selectedWaypointIndex={candidates.findIndex((p) => p.id === wpId)}
                  onWaypointClick={(i) => candidates[i] && pick(candidates[i])}
                  showLayerPanel={false}
                  showRobotPose={false}
                  showCoordinateSystem
                  showGrid
                />
              </Suspense>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {candidates.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pick(p)}
                  className={cn(
                    'flex items-center justify-between rounded-md border bg-background/40 px-2.5 py-1.5 text-left',
                    wpId === p.id ? 'border-primary/60 bg-primary/10' : 'border-border/60 hover:border-primary/30',
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_COLOR[p.category] }} />
                    <span className="text-foreground">{p.name}</span>
                  </span>
                  <span className="text-muted-foreground">({p.x.toFixed(1)}, {p.y.toFixed(1)})</span>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
