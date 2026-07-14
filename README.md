# 导览 App 一期配置台原型项目包

本项目包对应 GitHub Pages 原型：

https://lxm270782736-pixel.github.io/guide-app-prototype-package-20260714/

本地静态原型入口：`prototype/index.html`

## 内容

- `prototype/`: 已构建的离线静态原型，可用浏览器直接打开 `index.html`
- `source/ui/src/`: 原型源码
- `source/ui/src/types/guide.ts`: 类型定义
- `source/ui/src/components/GuideTaskEditor/`: 导览任务编辑、配置和下发页面
- `source/ui/src/services/guideSeed.ts`: 模拟数据
- `source/ui/package.json`: 构建配置
- `PRD_SNIPPET.md`: 可直接粘贴到 PRD 的项目包说明

## 主要功能文件

- `src/types/guide.ts`
- `src/components/GuideTaskEditor/WelcomeStepPanel.tsx`
- `src/components/GuideTaskEditor/POISpeechPanel.tsx`
- `src/components/GuideTaskEditor/StepList.tsx`
- `src/components/GuideTaskEditor/StepConfigPanel.tsx`
- `src/components/GuideTaskEditor/DispatchPage.tsx`
- `src/components/GuideTaskEditor/utils/validate.ts`
- `src/services/guideSeed.ts`
- `src/components/RoomPatrol/index.tsx`

## 说明

`prototype/` 是本次归档的离线参考版本，不依赖公网链接。源码包不包含 `node_modules`，如需重新构建，请在 `source/ui` 下执行 `npm install` 和 `npm run build:standalone`。
