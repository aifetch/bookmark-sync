import type { BookmarkNode, SyncPayload, SyncState } from './types';
import { GistClient } from './gist-client';
import { createBookmark, loadBrowserBookmarks } from './bookmark-adapter';
import { normalizeBookmarkUrl } from './dedup';
import {
  loadClickCounts,
  loadClickCountsUpdatedAt,
  saveClickCounts,
  type ClickCounts,
} from './click-counts';

const STORAGE_KEY = 'bookmark-sync-state';
const DEBOUNCE_MS = 5000;
const POST_PUSH_PULL_DELAY_MS = 800;
const POST_PUSH_PULL_MAX_ATTEMPTS = 4;

let uploadTimer: ReturnType<typeof setTimeout> | null = null;

type SyncResult = { success: boolean; message: string };

type FlatBookmark = {
  node: BookmarkNode;
  path: string[];
  normalizedUrl: string;
};

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
export async function pullFromGist(token: string): Promise<SyncResult> {
  const client = new GistClient(token);
  const state = await getSyncState();

  try {
    const { gistId, remoteContent, remoteHash, remotePayload } = await readRemoteState(client, state);
    const localTree = await loadBrowserBookmarks();
    const localClickCounts = await loadClickCounts();
    const localClickCountsUpdatedAt = await loadClickCountsUpdatedAt();

    if (!remoteContent || remoteContent === '{}') {
      if (localTree.length > 0 || Object.keys(localClickCounts).length > 0) {
        await saveSyncState({
          gistId,
          lastSyncTime: Date.now(),
          lastSyncHash: remoteHash,
        });
        return { success: true, message: '远程数据为空，准备回写本地数据' };
      }
      return { success: true, message: '远程数据为空，已跳过' };
    }

    const mergedBookmarks = mergeBookmarksByUrl(localTree, remotePayload.bookmarks);
    const createdCount = await applyMissingBookmarksToBrowser(localTree, mergedBookmarks);
    const refreshedLocalTree = createdCount > 0 ? await loadBrowserBookmarks() : localTree;

    const mergedUrlClickCounts = mergeClickCountsByUrl(
      refreshedLocalTree,
      localClickCounts,
      remotePayload.bookmarks,
      remotePayload.clickCounts,
    );
    const nextLocalClickCounts = materializeClickCounts(refreshedLocalTree, mergedUrlClickCounts);
    const nextClickCountsUpdatedAt = getClickCountsUpdatedAt(
      localClickCountsUpdatedAt,
      remotePayload.clickCountsUpdatedAt,
      mergedUrlClickCounts,
    );

    if (
      !areClickCountsEqual(localClickCounts, nextLocalClickCounts)
      || localClickCountsUpdatedAt !== nextClickCountsUpdatedAt
    ) {
      await saveClickCounts(nextLocalClickCounts, nextClickCountsUpdatedAt);
    }

    await saveSyncState({
      gistId,
      lastSyncTime: Date.now(),
      lastSyncHash: remoteHash,
    });

    return {
      success: true,
      message: createdCount > 0
        ? `同步成功，已导入 ${createdCount} 个书签 (${new Date().toLocaleTimeString()})`
        : `同步成功 (${new Date().toLocaleTimeString()})`,
    };
  } catch (err: any) {
    return { success: false, message: `同步失败: ${err.message}` };
  }
}

/** 推送本地书签与点击计数到 Gist */
export async function pushToGist(token: string): Promise<SyncResult> {
  const client = new GistClient(token);
  const state = await getSyncState();

  try {
    const localTree = await loadBrowserBookmarks();
    const localClickCounts = await loadClickCounts();
    const localClickCountsUpdatedAt = await loadClickCountsUpdatedAt();
    const { gistId, remoteHash, remotePayload } = await readRemoteState(client, state);

    const mergedBookmarks = mergeBookmarksByUrl(localTree, remotePayload.bookmarks);
    const mergedUrlClickCounts = mergeClickCountsByUrl(
      localTree,
      localClickCounts,
      remotePayload.bookmarks,
      remotePayload.clickCounts,
    );
    const nextLocalClickCounts = materializeClickCounts(localTree, mergedUrlClickCounts);
    const payloadClickCounts = materializeClickCounts(mergedBookmarks, mergedUrlClickCounts);
    const nextClickCountsUpdatedAt = getClickCountsUpdatedAt(
      localClickCountsUpdatedAt,
      remotePayload.clickCountsUpdatedAt,
      mergedUrlClickCounts,
    );

    if (
      !areClickCountsEqual(localClickCounts, nextLocalClickCounts)
      || localClickCountsUpdatedAt !== nextClickCountsUpdatedAt
    ) {
      await saveClickCounts(nextLocalClickCounts, nextClickCountsUpdatedAt);
    }

    const payload: SyncPayload = {
      bookmarks: mergedBookmarks,
      clickCounts: payloadClickCounts,
      updatedAt: getMaxTimestamp(mergedBookmarks),
      clickCountsUpdatedAt: nextClickCountsUpdatedAt,
    };

    const newHash = await client.updateGist(gistId, serializePayload(payload));
    await saveSyncState({
      gistId,
      lastSyncTime: Date.now(),
      lastSyncHash: newHash || remoteHash,
    });

    return { success: true, message: `上传成功 (${new Date().toLocaleTimeString()})` };
  } catch (err: any) {
    return { success: false, message: `上传失败: ${err.message}` };
  }
}

/** 双向同步：先拉取本地缺失，再将并集回写远端 */
export async function syncBoth(token: string): Promise<SyncResult> {
  const pullResult = await pullFromGist(token);
  if (!pullResult.success) return pullResult;

  const pushResult = await pushToGist(token);
  if (!pushResult.success) return pushResult;

  const pushedState = await getSyncState();
  const settlePullResult = await waitForPeerSync(token, pushedState);
  if (settlePullResult && !settlePullResult.success) return settlePullResult;

  const finalPullResult = settlePullResult ?? await pullFromGist(token);
  if (!finalPullResult.success) return finalPullResult;

  return {
    success: true,
    message: finalPullResult.message.includes('已导入')
      ? `${finalPullResult.message}，并已完成收敛检查`
      : pullResult.message.includes('已导入')
        ? `${pullResult.message}，并已回写远程`
        : pushResult.message,
  };
}

/** 防抖上传：本地数据变更后延迟上传 */
export function scheduleUpload(token: string): void {
  if (uploadTimer) clearTimeout(uploadTimer);
  uploadTimer = setTimeout(() => {
    pushToGist(token).catch(() => {});
    uploadTimer = null;
  }, DEBOUNCE_MS);
}

async function readRemoteState(
  client: GistClient,
  state: SyncState,
): Promise<{ gistId: string; remoteContent: string | null; remoteHash: string; remotePayload: SyncPayload }> {
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

  return {
    gistId,
    remoteContent,
    remoteHash,
    remotePayload: remoteContent ? deserializePayload(remoteContent) : emptyPayload(),
  };
}

async function waitForPeerSync(token: string, state: SyncState): Promise<SyncResult | null> {
  if (!state.lastSyncHash) {
    await delay(POST_PUSH_PULL_DELAY_MS);
    return pullFromGist(token);
  }

  const client = new GistClient(token);

  for (let attempt = 0; attempt < POST_PUSH_PULL_MAX_ATTEMPTS; attempt += 1) {
    await delay(POST_PUSH_PULL_DELAY_MS);
    const { remoteHash } = await readRemoteState(client, state);

    if (remoteHash && remoteHash !== state.lastSyncHash) {
      return pullFromGist(token);
    }
  }

  return null;
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function emptyPayload(): SyncPayload {
  return {
    bookmarks: [],
    clickCounts: {},
    updatedAt: 0,
    clickCountsUpdatedAt: 0,
  };
}

function mergeBookmarksByUrl(localTree: BookmarkNode[], remoteTree: BookmarkNode[]): BookmarkNode[] {
  const merged = new Map<string, FlatBookmark>();

  for (const entry of flattenBookmarksWithPath(localTree)) {
    merged.set(entry.normalizedUrl, entry);
  }

  for (const entry of flattenBookmarksWithPath(remoteTree)) {
    const existing = merged.get(entry.normalizedUrl);
    merged.set(entry.normalizedUrl, existing ? mergeFlatBookmark(existing, entry) : entry);
  }

  return buildTreeFromFlatBookmarks([...merged.values()]);
}

function flattenBookmarksWithPath(nodes: BookmarkNode[], path: string[] = []): FlatBookmark[] {
  const result: FlatBookmark[] = [];

  for (const node of nodes) {
    if (node.url) {
      result.push({
        node: {
          ...node,
          children: undefined,
        },
        path,
        normalizedUrl: normalizeBookmarkUrl(node.url),
      });
      continue;
    }

    const nextPath = node.title ? [...path, node.title] : path;
    result.push(...flattenBookmarksWithPath(node.children ?? [], nextPath));
  }

  return result;
}

function mergeFlatBookmark(current: FlatBookmark, incoming: FlatBookmark): FlatBookmark {
  const currentScore = current.node.updatedAt || current.node.createdAt || 0;
  const incomingScore = incoming.node.updatedAt || incoming.node.createdAt || 0;
  const preferred = incomingScore > currentScore ? incoming : current;
  const secondary = preferred === current ? incoming : current;

  return {
    normalizedUrl: preferred.normalizedUrl,
    path: preferred.path.length > 0 ? preferred.path : secondary.path,
    node: {
      ...preferred.node,
      title: preferred.node.title || secondary.node.title,
      url: preferred.node.url ?? secondary.node.url,
      createdAt: minPositive(preferred.node.createdAt, secondary.node.createdAt),
      updatedAt: Math.max(preferred.node.updatedAt || 0, secondary.node.updatedAt || 0),
      order: Math.min(preferred.node.order ?? 0, secondary.node.order ?? 0),
      children: undefined,
    },
  };
}

function buildTreeFromFlatBookmarks(entries: FlatBookmark[]): BookmarkNode[] {
  const roots: BookmarkNode[] = [];
  const folderMap = new Map<string, BookmarkNode>();

  for (const entry of entries) {
    const parent = ensureFolderNodes(entry.path, roots, folderMap);
    const bookmarkNode: BookmarkNode = {
      ...entry.node,
      parentId: parent?.id ?? null,
      children: undefined,
    };

    if (parent) {
      parent.children = parent.children ?? [];
      parent.children.push(bookmarkNode);
    } else {
      roots.push(bookmarkNode);
    }
  }

  sortBookmarkNodes(roots);
  return roots;
}

function ensureFolderNodes(
  path: string[],
  roots: BookmarkNode[],
  folderMap: Map<string, BookmarkNode>,
): BookmarkNode | null {
  let parent: BookmarkNode | null = null;
  let currentPath: string[] = [];

  for (const segment of path) {
    if (!segment.trim()) continue;

    currentPath = [...currentPath, segment];
    const key = pathToKey(currentPath);
    let folder = folderMap.get(key);

    if (!folder) {
      folder = {
        id: `folder:${key}`,
        parentId: parent?.id ?? null,
        title: segment,
        createdAt: 0,
        updatedAt: 0,
        order: 0,
        children: [],
      };
      folderMap.set(key, folder);

      if (parent) {
        parent.children = parent.children ?? [];
        parent.children.push(folder);
      } else {
        roots.push(folder);
      }
    }

    parent = folder;
  }

  return parent;
}

function sortBookmarkNodes(nodes: BookmarkNode[]): void {
  nodes.sort((a, b) => {
    const aFolder = !a.url;
    const bFolder = !b.url;
    if (aFolder !== bFolder) return aFolder ? -1 : 1;

    const orderDiff = (a.order ?? 0) - (b.order ?? 0);
    if (orderDiff !== 0) return orderDiff;

    return a.title.localeCompare(b.title, 'zh-CN');
  });

  for (const node of nodes) {
    if (node.children?.length) {
      sortBookmarkNodes(node.children);
    }
  }
}

function mergeClickCountsByUrl(
  localTree: BookmarkNode[],
  localClickCounts: ClickCounts,
  remoteTree: BookmarkNode[],
  remoteClickCounts: ClickCounts,
): Map<string, number> {
  const merged = aggregateClickCountsByUrl(localTree, localClickCounts);

  for (const [url, count] of aggregateClickCountsByUrl(remoteTree, remoteClickCounts)) {
    merged.set(url, Math.max(merged.get(url) ?? 0, count));
  }

  return merged;
}

function aggregateClickCountsByUrl(tree: BookmarkNode[], clickCounts: ClickCounts): Map<string, number> {
  const idToUrl = buildBookmarkIdToUrlMap(tree);
  const result = new Map<string, number>();

  for (const [id, rawCount] of Object.entries(clickCounts)) {
    const url = idToUrl.get(id);
    const count = typeof rawCount === 'number' ? rawCount : Number(rawCount);

    if (!url || !Number.isFinite(count) || count <= 0) continue;
    result.set(url, (result.get(url) ?? 0) + count);
  }

  return result;
}

function buildBookmarkIdToUrlMap(tree: BookmarkNode[]): Map<string, string> {
  const map = new Map<string, string>();

  for (const entry of flattenBookmarksWithPath(tree)) {
    map.set(entry.node.id, entry.normalizedUrl);
  }

  return map;
}

function materializeClickCounts(tree: BookmarkNode[], urlCounts: Map<string, number>): ClickCounts {
  const result: ClickCounts = {};
  const assignedUrls = new Set<string>();

  for (const entry of flattenBookmarksWithPath(tree)) {
    if (assignedUrls.has(entry.normalizedUrl)) continue;

    const count = urlCounts.get(entry.normalizedUrl);
    if (!count || count <= 0) continue;

    result[entry.node.id] = count;
    assignedUrls.add(entry.normalizedUrl);
  }

  return result;
}

function getClickCountsUpdatedAt(
  localUpdatedAt: number,
  remoteUpdatedAt: number,
  mergedUrlClickCounts: Map<string, number>,
): number {
  if (mergedUrlClickCounts.size === 0) return 0;
  return Math.max(localUpdatedAt, remoteUpdatedAt);
}

function areClickCountsEqual(a: ClickCounts, b: ClickCounts): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);

  if (aKeys.length !== bKeys.length) return false;

  for (const key of aKeys) {
    if (a[key] !== b[key]) return false;
  }

  return true;
}

async function applyMissingBookmarksToBrowser(localTree: BookmarkNode[], mergedBookmarks: BookmarkNode[]): Promise<number> {
  const existingUrls = new Set(flattenBookmarksWithPath(localTree).map((entry) => entry.normalizedUrl));
  const mergedFlat = flattenBookmarksWithPath(mergedBookmarks);
  const topLevelFolders = localTree.filter((node) => !node.url);
  const defaultRoot = topLevelFolders[0] ?? null;
  const folderCache = new Map<string, string>();

  seedExistingFolderCache(localTree, [], folderCache);

  let createdCount = 0;

  for (const entry of mergedFlat) {
    if (existingUrls.has(entry.normalizedUrl)) continue;

    const parentId = await ensureFolderPathOnBrowser(entry.path, topLevelFolders, defaultRoot, folderCache);
    await createBookmark(parentId, entry.node.title, entry.node.url);
    existingUrls.add(entry.normalizedUrl);
    createdCount += 1;
  }

  return createdCount;
}

function seedExistingFolderCache(nodes: BookmarkNode[], path: string[], folderCache: Map<string, string>): void {
  for (const node of nodes) {
    if (node.url) continue;

    const nextPath = [...path, node.title];
    folderCache.set(pathToKey(nextPath), node.id);
    seedExistingFolderCache(node.children ?? [], nextPath, folderCache);
  }
}

async function ensureFolderPathOnBrowser(
  path: string[],
  topLevelFolders: BookmarkNode[],
  defaultRoot: BookmarkNode | null,
  folderCache: Map<string, string>,
): Promise<string> {
  if (path.length === 0) {
    return defaultRoot?.id ?? '1';
  }

  let currentParentId = defaultRoot?.id ?? '1';
  let effectivePath: string[] = [];
  let remainingSegments = [...path];

  if (topLevelFolders.length > 0) {
    const [first, ...rest] = path;
    const exactTopLevel = topLevelFolders.find((node) => node.title === first);

    if (exactTopLevel) {
      currentParentId = exactTopLevel.id;
      effectivePath = [exactTopLevel.title];
      remainingSegments = rest;
    }
  }

  for (const segment of remainingSegments) {
    if (!segment.trim()) continue;

    effectivePath = [...effectivePath, segment];
    const key = pathToKey(effectivePath);
    const existingFolderId = folderCache.get(key);

    if (existingFolderId) {
      currentParentId = existingFolderId;
      continue;
    }

    const folder = await createBookmark(currentParentId, segment);
    folderCache.set(key, folder.id);
    currentParentId = folder.id;
  }

  return currentParentId;
}

function pathToKey(path: string[]): string {
  return path.join(' / ');
}

function minPositive(a: number, b: number): number {
  if (a > 0 && b > 0) return Math.min(a, b);
  return Math.max(a, b);
}

/** 获取树中最大的 updatedAt 时间戳 */
function getMaxTimestamp(nodes: BookmarkNode[]): number {
  let max = 0;

  function walk(list: BookmarkNode[]) {
    for (const node of list) {
      if (node.updatedAt > max) max = node.updatedAt;
      if (node.children) walk(node.children);
    }
  }

  walk(nodes);
  return max;
}