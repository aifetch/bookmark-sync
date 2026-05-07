import type { BookmarkNode, SyncState } from './types';
import { GistClient } from './gist-client';
import { loadBrowserBookmarks } from './bookmark-adapter';

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

    if (!remoteContent || remoteContent === '{}') {
      // Gist 为空，将本地数据推送上去
      const localTree = await loadBrowserBookmarks();
      if (localTree.length > 0) {
        return await pushToGist(token);
      }
      return { success: true, message: '远程数据为空，已跳过' };
    }

    // 简单 last-write-wins：比较时间戳
    const remoteState: SyncState = JSON.parse(remoteContent);
    const localTree = await loadBrowserBookmarks();
    const localTimestamp = getMaxTimestamp(localTree);

    // 解析远程书签数据
    const remoteTree: BookmarkNode[] = remoteState.lastSyncTime > localTimestamp
      ? deserializeTree(remoteContent)
      : localTree;

    // TODO: 更复杂的合并策略可以在这里扩展
    // 目前简单策略：如果远程更新时间更新则使用远程数据

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

/** 推送本地书签到 Gist */
export async function pushToGist(token: string): Promise<{ success: boolean; message: string }> {
  const client = new GistClient(token);
  const state = await getSyncState();

  try {
    const localTree = await loadBrowserBookmarks();
    const content = serializeTree(localTree);

    let gistId = state.gistId;
    if (!gistId) {
      const result = await client.getOrCreateGist();
      gistId = result.gistId;
    }

    const newHash = await client.updateGist(gistId, content);
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

/** 防抖上传：书签变更后延迟上传 */
export function scheduleUpload(token: string): void {
  if (uploadTimer) clearTimeout(uploadTimer);
  uploadTimer = setTimeout(() => {
    pushToGist(token).catch(() => {});
    uploadTimer = null;
  }, DEBOUNCE_MS);
}

/** 序列化书签树 */
function serializeTree(tree: BookmarkNode[]): string {
  return JSON.stringify(tree, null, 2);
}

/** 反序列化 */
function deserializeTree(content: string): BookmarkNode[] {
  try {
    return JSON.parse(content);
  } catch {
    return [];
  }
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