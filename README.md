# Bookmark Sync

English | [简体中文](./README.zh-CN.md)

Bookmark Sync is a browser bookmark manager and bookmark sync extension for Chrome, Edge, and Firefox. It supports GitHub Gist bookmark sync, bookmark tree view, drag-and-drop sorting, duplicate bookmark detection, bookmark backup, and side panel bookmark management.

## Search Keywords

`bookmark sync` `bookmark manager` `browser bookmark manager` `chrome extension` `edge extension` `firefox extension` `github gist sync` `bookmark backup` `bookmark tree` `side panel` `duplicate bookmark finder` `cross-browser bookmark sync` `书签同步` `书签管理` `浏览器书签管理` `GitHub Gist 同步` `书签备份` `侧边栏插件`

## Features

- Tree view for bookmarks with virtual scrolling for large datasets
- Drag-and-drop sorting and moving for bookmarks and folders
- Duplicate URL detection with confirmation dialog
- Two-way GitHub Gist sync with automatic debounced upload and manual sync
- Confirmation for destructive operations
- Search and filtering
- Right-click context menu
- Support for Chrome, Firefox, and Edge

## Tech Stack

- WXT for cross-browser extension development
- React 18 + TypeScript
- `react-arborist` for virtualized tree rendering
- Tailwind CSS
- GitHub Gist API

## Development

```bash
# Install dependencies
npm install

# Chrome development
npm run dev

# Firefox development
npm run dev:firefox
```

Load `.output/chrome-mv3` or `.output/firefox-mv2` in your browser.

## Build

```bash
# Chrome
npm run build

# Firefox
npm run build:firefox

# Zip packages
npm run zip
npm run zip:firefox
```

## Usage

1. Open the extension side panel from the browser toolbar.
2. Go to Settings and paste a GitHub Personal Access Token with the `gist` scope.
3. Click `Sync` to synchronize bookmark data to GitHub Gist.

## Project Structure

```text
entrypoints/
  background.ts          # Service Worker for messaging and sync
  sidepanel/             # Side panel UI
    App.tsx              # Main app
    components/          # UI components
lib/
  types.ts               # Type definitions
  gist-client.ts         # GitHub Gist API wrapper
  bookmark-adapter.ts    # Browser bookmarks API adapter
  sync-engine.ts         # Two-way sync engine
  dedup.ts               # Duplicate detection logic
```

## Distribution

- **Chrome Web Store**: run `npm run zip` and submit `.output/chrome-mv3.zip`
- **Firefox Add-ons**: run `npm run zip:firefox` and submit `.output/firefox-mv2.zip`
- **Edge Add-ons**: submit the Chrome build to Microsoft Partner Center
- **Local development**: load the unpacked extension from `.output/chrome-mv3` or `.output/firefox-mv2`

## Security

The GitHub token is stored in `browser.storage.local`. It is only accessed by the background service worker and is not exposed to content scripts.
