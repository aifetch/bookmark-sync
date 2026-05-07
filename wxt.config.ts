import { defineConfig } from 'wxt';
import react from '@wxt-dev/module-react';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Bookmark Sync',
    description: '双向同步书签管理器 - 树形展示、拖拽排序、GitHub Gist 同步',
    version: '1.0.0',
    permissions: ['bookmarks', 'storage', 'sidePanel', 'tabs'],
    action: {
      default_title: 'Bookmark Sync',
    },
    side_panel: {
      default_path: 'sidepanel/index.html',
    },
  },
});