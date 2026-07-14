/**
 * 历史保留文件：旧版子步骤编辑器（基于 TaskConfig 的实现）。
 *
 * 新版 PRD v1.6 的子步骤改为与主步骤同构（SubStepConfig.step: GuideStep），
 * 子步骤的添加/排序/编辑直接在 StepList + 右抽屉 StepConfigPanel 中完成，
 * 不再使用本组件。文件保留以兼容历史导入；当前为透明壳。
 */

import type { GuideStep } from '@/types';

interface Props {
  step: GuideStep;
  onChange: (next: GuideStep) => void;
  allSteps: GuideStep[];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function SubStepEditor(_props: Props) {
  return null;
}

export default SubStepEditor;
