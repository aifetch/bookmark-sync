# Bookmark Sync

浏览器书签同步管理扩展。通过 GitHub Gist 双向同步书签，树形展示，支持拖拽排序。

## 功能

- 树形展示书签，虚拟滚动，支持大量数据
- 拖拽排序/移动书签和文件夹
- URL 去重检测，重复书签弹窗提示
- GitHub Gist 双向同步（自动防抖上传 + 手动同步）
- 破坏性操作二次确认
- 搜索过滤
- 右键上下文菜单
- 支持 Chrome / Firefox / Edge

## 技术栈

- WXT（跨浏览器扩展框架）
- React 18 + TypeScript
- react-arborist（虚拟化树组件）
- Tailwind CSS
- GitHub Gist API

## 开发

```bash
# 安装依赖
npm install

# Chrome 开发模式
npm run dev

# Firefox 开发模式
npm run dev:firefox
```

在浏览器中加载 `.output/chrome-mv3` 或 `.output/firefox-mv2` 目录。

## 构建

```bash
# Chrome
npm run build

# Firefox
npm run build:firefox

# 打包 zip
npm run zip
npm run zip:firefox
```

## 使用

1. 打开扩展 Side Panel（点击工具栏图标）
2. 进入设置，填入 GitHub Personal Access Token（仅需 `gist` 权限）
3. 点击"同步"即可将书签数据同步到 GitHub Gist

## 目录结构

```
entrypoints/
  background.ts          # Service Worker，处理消息和同步
  sidepanel/             # Side Panel UI
    App.tsx              # 主应用
    components/          # UI 组件
lib/
  types.ts               # 类型定义
  gist-client.ts         # GitHub Gist API 封装
  bookmark-adapter.ts    # 浏览器书签 API 适配层
  sync-engine.ts         # 双向同步引擎
  dedup.ts               # 去重逻辑
```

## 部署

- **Chrome Web Store**: `npm run zip` 生成 `.output/chrome-mv3.zip`，提交到开发者控制台
- **Firefox Add-ons**: `npm run zip:firefox` 生成 `.output/firefox-mv2.zip`，提交到 AMO
- **Edge Add-ons**: 使用 Chrome 产物提交到 Microsoft Partner Center
- **本地开发**: 浏览器"加载已解压的扩展"指向 `.output/chrome-mv3` 或 `.output/firefox-mv2`

## 安全

GitHub Token 存储在 `browser.storage.local`，仅 Background Service Worker 访问，不暴露给 content script。