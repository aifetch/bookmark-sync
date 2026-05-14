import type { BookmarkNode, SyncPayload, SyncState } from './types';
import { GistClient } from './gist-client';
import { loadBrowserBookmarks } from './bookmark-adapter';
import {
  loadClickCounts,
  loadClickCountsUpdatedAt,
  saveClickCounts,
  type ClickCounts,
} from './click-counts';

const STORAGE_KEY = 'bookmark-sync-state';
const DEBOUNCE_MS = 5000;

let uploadTimer: ReturnType<typeof setTimeout> | null = null;

/** 从本地存储读取同步状态 */
export async function getSyncState(): Promise<SyncState> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] ?? { gistId: null, lastSyncTime: 0, lastSyncHash: '' };
}

/** 保存同步状态 */
async function saveSyncState(state: SyncState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

/** 从 Gist 拉取并合并到浏览器 */
export async function pullFromGist(token: string): Promise<{ success: boolean; message: string }> {
  const client = new GistClient(token);
  const state = await getSyncState();

  try {
    let gistId = state.gistId;
    let remoteContent: string | null;
    let remoteHash: string;

    if (gistId) {
      const gist = await client.fetchGist(gistId);
      const file = gist.files['bookmark-tree.json'];
      remoteContent = file?.content ?? null;
      remoteHash = gist.history?.[0]?.version ?? '';
    } else {
      const result = await client.getOrCreateGist();
      gistId = result.gistId;
      remoteContent = result.content;
      remoteHash = result.hash;
    }

    const localTree = await loadBrowserBookmarks();
    const localClickCounts = await loadClickCounts();

    if (!remoteContent || remoteContent === '{}') {
      if (localTree.length > 0 || Object.keys(localClickCounts).length > 0) {
        return await pushToGist(token);
      }
      return { success: true, message: '远程数据为空，已跳过' };
    }

    const remotePayload = deserializePayload(remoteContent);
    const localClickCountsUpdatedAt = await loadClickCountsUpdatedAt();

    if (remotePayload.clickCountsUpdatedAt > localClickCountsUpdatedAt) {
      await saveClickCounts(remotePayload.clickCounts, remotePayload.clickCountsUpdatedAt);
    }

    await saveSyncState({
      gistId,
      lastSyncTime: Date.now(),
      lastSyncHash: remoteHash,
    });

    return { success: true, message: `同步成功 (${new Date().toLocaleTimeString()})` };
  } catch (err: any) {
    return { success: false, message: `同步失败: ${err.message}` };
  }
}

/** 推送本地书签与点击计数到 Gist */
export async function pushToGist(token: string): Promise<{ success: boolean; message: string }> {
  const client = new GistClient(token);
  const state = await getSyncState();

  try {
    const localTree = await loadBrowserBookmarks();
    const localTreeUpdatedAt = getMaxTimestamp(localTree);
    const localClickCounts = await loadClickCounts();
    const localClickCountsUpdatedAt = await loadClickCountsUpdatedAt();

    let gistId = state.gistId;
    let remoteContent: string | null = null;

    if (gistId) {
      const gist = await client.fetchGist(gistId);
      const file = gist.files['bookmark-tree.json'];
      remoteContent = file?.content ?? null;
    } else {
      const result = await client.getOrCreateGist();
      gistId = result.gistId;
      remoteContent = result.content;
    }

    const remotePayload = remoteContent ? deserializePayload(remoteContent) : emptyPayload();

    const useLocalBookmarks = localTreeUpdatedAt >= remotePayload.updatedAt;
    const useLocalClickCounts = localClickCountsUpdatedAt >= remotePayload.clickCountsUpdatedAt;

    const payload: SyncPayload = {
      bookmarks: useLocalBookmarks ? localTree : remotePayload.bookmarks,
      clickCounts: useLocalClickCounts ? localClickCounts : remotePayload.clickCounts,
      updatedAt: useLocalBookmarks ? localTreeUpdatedAt : remotePayload.updatedAt,
      clickCountsUpdatedAt: useLocalClickCounts
        ? localClickCountsUpdatedAt
        : remotePayload.clickCountsUpdatedAt,
    };

    const newHash = await client.updateGist(gistId, serializePayload(payload));
    await saveSyncState({
      gistId,
      lastSyncTime: Date.now(),
      lastSyncHash: newHash,
    });

    return { success: true, message: `上传成功 (${new Date().toLocaleTimeString()})` };
  } catch (err: any) {
    return { success: false, message: `上传失败: ${err.message}` };
  }
}

/** 双向同步：先拉取再推送 */
export async function syncBoth(token: string): Promise<{ success: boolean; message: string }> {
  const pullResult = await pullFromGist(token);
  if (!pullResult.success) return pullResult;

  return pushToGist(token);
}

/** 防抖上传：本地数据变更后延迟上传 */
export function scheduleUpload(token: string): void {
  if (uploadTimer) clearTimeout(uploadTimer);
  uploadTimer = setTimeout(() => {
    pushToGist(token).catch(() => {});
    uploadTimer = null;
  }, DEBOUNCE_MS);
}

function serializePayload(payload: SyncPayload): string {
  return JSON.stringify(payload, null, 2);
}

function deserializePayload(content: string): SyncPayload {
  try {
    const parsed = JSON.parse(content) as unknown;

    if (Array.isArray(parsed)) {
      const bookmarks = parsed as BookmarkNode[];
      return {
        bookmarks,
        clickCounts: {},
        updatedAt: getMaxTimestamp(bookmarks),
        clickCountsUpdatedAt: 0,
      };
    }

    if (isRecord(parsed) && Array.isArray(parsed.bookmarks)) {
      const bookmarks = parsed.bookmarks as BookmarkNode[];
      return {
        bookmarks,
        clickCounts: normalizeClickCounts(parsed.clickCounts),
        updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : getMaxTimestamp(bookmarks),
        clickCountsUpdatedAt: typeof parsed.clickCountsUpdatedAt === 'number'
          ? parsed.clickCountsUpdatedAt
          : 0,
      };
    }
  } catch {
    // ignore invalid payload and fall back to empty payload
  }

  return emptyPayload();
}

function normalizeClickCounts(value: unknown): ClickCounts {
  if (!isRecord(value)) return {};

  const result: ClickCounts = {};
  for (const [id, rawCount] of Object.entries(value)) {
    const count = typeof rawCount === 'number' ? rawCount : Number(rawCount);
    if (Number.isFinite(count) && count > 0) {
      result[id] = count;
    }
  }

  return result;
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function emptyPayload(): SyncPayload {
  return {
    bookmarks: [],
    clickCounts: {},
    updatedAt: 0,
    clickCountsUpdatedAt: 0,
  };
}

/** 获取树中最大的 updatedAt 时间戳 */
function getMaxTimestamp(nodes: BookmarkNode[]): number {
  let max = 0;

  function walk(list: BookmarkNode[]) {
    for (const n of list) {
      if (n.updatedAt > max) max = n.updatedAt;
      if (n.children) walk(n.children);
    }
  }

  walk(nodes);
  return max;
}