import { onBookmarkChanged } from '@/lib/bookmark-adapter';
import { scheduleUpload, syncBoth, pushToGist } from '@/lib/sync-engine';

export default defineBackground(() => {
  const TOKEN_KEY = 'github-token';

  async function getToken(): Promise<string | null> {
    const result = await chrome.storage.local.get(TOKEN_KEY);
    return result[TOKEN_KEY] ?? null;
  }

  // 打开 Side Panel 时自动同步
  chrome.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: true });

  // 监听来自 Side Panel 的消息
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'GET_TOKEN') {
      getToken().then(sendResponse);
      return true;
    }
    if (msg.type === 'SET_TOKEN') {
      chrome.storage.local.set({ [TOKEN_KEY]: msg.token }).then(() => sendResponse({ ok: true }));
      return true;
    }
    if (msg.type === 'SYNC') {
      getToken().then((token) => {
        if (!token) return sendResponse({ success: false, message: '未配置 Token' });
        syncBoth(token).then(sendResponse);
      });
      return true;
    }
    if (msg.type === 'PUSH') {
      getToken().then((token) => {
        if (!token) return sendResponse({ success: false, message: '未配置 Token' });
        pushToGist(token).then(sendResponse);
      });
      return true;
    }
  });

  // 书签变更时防抖上传
  onBookmarkChanged(async () => {
    const token = await getToken();
    if (token) scheduleUpload(token);
  });
});