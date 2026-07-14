/**
 * 任务下发 Tab
 * 复用 GuideTaskEditor 的 DispatchPage，嵌入 RoomPatrol 的"任务下发"Tab。
 */

import React, { useEffect, useMemo, useState } from 'react';
import type { GuideTask } from '@/types';
import { guideStorage } from '@/services/guideStorage';
import { DispatchPage } from '@/components/GuideTaskEditor/DispatchPage';

export const TaskDispatchTab: React.FC = () => {
  const [tasks, setTasks] = useState<GuideTask[]>([]);
  const [activeTaskId, setActiveTaskId] = useState('');

  useEffect(() => {
    const loaded = guideStorage.loadTasks();
    setTasks(loaded);
    if (loaded.length > 0) setActiveTaskId(loaded[0].id);
  }, []);

  const activeTask = useMemo(
    () => tasks.find((t) => t.id === activeTaskId) ?? null,
    [tasks, activeTaskId],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <DispatchPage
        tasks={tasks}
        activeTask={activeTask}
        onSwitchTask={(id) => setActiveTaskId(id)}
      />
    </div>
  );
};
