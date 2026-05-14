# Bookmark Sync

[English](./README.md) | 简体中文

Bookmark Sync 是一个浏览器书签管理与书签同步扩展，支持 Chrome、Edge 和 Firefox。它提供 GitHub Gist 双向同步、书签树展示、拖拽排序、重复书签检测、书签备份以及侧边栏管理能力。

## 搜索关键词

`bookmark sync` `bookmark manager` `browser bookmark manager` `chrome extension` `edge extension` `firefox extension` `github gist sync` `bookmark backup` `bookmark tree` `side panel` `duplicate bookmark finder` `cross-browser bookmark sync` `书签同步` `书签管理` `浏览器书签管理` `GitHub Gist 同步` `书签备份` `侧边栏插件`

## 功能

- 树形展示书签，支持大量数据下的虚拟滚动
- 支持拖拽排序、移动书签和文件夹
- 支持 URL 去重检测和重复提醒
- 支持 GitHub Gist 双向同步，含自动防抖上传与手动同步
- 破坏性操作二次确认
- 搜索过滤
- 右键上下文菜单
- 支持 Chrome / Firefox / Edge

## 技术栈

- WXT 跨浏览器扩展框架
- React 18 + TypeScript
- `react-arborist` 虚拟化树组件
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

1. 从浏览器工具栏打开扩展侧边栏。
2. 进入设置，填入带有 `gist` 权限的 GitHub Personal Access Token。
3. 点击 `Sync` 将书签数据同步到 GitHub Gist。

## 目录结构

```text
entrypoints/
  background.ts          # 处理消息与同步的 Service Worker
  sidepanel/             # 侧边栏 UI
    App.tsx              # 主应用
    components/          # UI 组件
lib/
  types.ts               # 类型定义
  gist-client.ts         # GitHub Gist API 封装
  bookmark-adapter.ts    # 浏览器书签 API 适配层
  sync-engine.ts         # 双向同步引擎
  dedup.ts               # 去重逻辑
```

## 发布

- **Chrome Web Store**：执行 `npm run zip`，提交 `.output/chrome-mv3.zip`
- **Firefox Add-ons**：执行 `npm run zip:firefox`，提交 `.output/firefox-mv2.zip`
- **Edge Add-ons**：将 Chrome 构建产物提交到 Microsoft Partner Center
- **本地开发**：通过“加载已解压的扩展”加载 `.output/chrome-mv3` 或 `.output/firefox-mv2`

## 安全

GitHub Token 存储在 `browser.storage.local` 中，仅由后台 Service Worker 访问，不暴露给 content script。