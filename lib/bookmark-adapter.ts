import type { BookmarkNode } from './types';

/** 浏览器书签 API 适配层，统一 Chrome/Firefox/Edge 差异 */
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** 将浏览器书签树转为 BookmarkNode[] */
export async function loadBrowserBookmarks(): Promise<BookmarkNode[]> {
  const tree = await browserAPI.bookmarks.getTree();
  if (!tree?.length) return [];

  // 根节点是 "Bookmarks Bar" / "Other Bookmarks" 的父级，直接展开
  const root = tree[0];
  return root.children ? root.children.map(convertNode) : [];
}

function convertNode(node: chrome.bookmarks.BookmarkTreeNode): BookmarkNode {
  const result: BookmarkNode = {
    id: node.id,
    parentId: node.parentId ?? null,
    title: node.title || (node.url ? '' : '未命名文件夹'),
    url: node.url,
    createdAt: node.dateAdded ? node.dateAdded : Date.now(),
    updatedAt: node.dateGroupModified ? node.dateGroupModified : Date.now(),
    order: node.index ?? 0,
  };

  if (node.children) {
    result.children = node.children.map(convertNode);
  }

  return result;
}

/** 创建书签 */
export async function createBookmark(
  parentId: string,
  title: string,
  url?: string
): Promise<BookmarkNode> {
  let normalizedUrl = url?.trim();
  // 无协议头时自动补全，避免 chrome.bookmarks.create 静默失败
  if (normalizedUrl && !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(normalizedUrl)) {
    normalizedUrl = 'https://' + normalizedUrl;
  }
  const result = await browserAPI.bookmarks.create({
    parentId,
    title,
    url: normalizedUrl || undefined,
  });
  return convertNode(result);
}

/** 更新书签 */
export async function updateBookmark(
  id: string,
  changes: { title?: string; url?: string }
): Promise<BookmarkNode> {
  let normalizedChanges = { ...changes };
  if (normalizedChanges.url) {
    const u = normalizedChanges.url.trim();
    if (u && !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(u)) {
      normalizedChanges.url = 'https://' + u;
    }
  }
  const result = await browserAPI.bookmarks.update(id, normalizedChanges);
  return convertNode(result);
}

/** 移动书签 */
export async function moveBookmark(
  id: string,
  destination: { parentId: string; index?: number }
): Promise<BookmarkNode> {
  const result = await browserAPI.bookmarks.move(id, destination);
  return convertNode(result);
}

/** 删除书签（文件夹递归删除） */
export async function removeBookmark(id: string, recursive: boolean = false): Promise<void> {
  if (recursive) {
    await browserAPI.bookmarks.removeTree(id);
  } else {
    await browserAPI.bookmarks.remove(id);
  }
}

/** 获取书签节点（含子节点） */
export async function getBookmarkSubTree(id: string): Promise<BookmarkNode | null> {
  try {
    const nodes = await browserAPI.bookmarks.getSubTree(id);
    return nodes?.length ? convertNode(nodes[0]) : null;
  } catch {
    return null;
  }
}

/** 监听书签变更 */
export function onBookmarkChanged(
  callback: (type: 'created' | 'removed' | 'changed' | 'moved', info: any) => void
) {
  browserAPI.bookmarks.onCreated.addListener((id, node) =>
    callback('created', { id, node })
  );
  browserAPI.bookmarks.onRemoved.addListener((id, removeInfo) =>
    callback('removed', { id, removeInfo })
  );
  browserAPI.bookmarks.onChanged.addListener((id, changeInfo) =>
    callback('changed', { id, changeInfo })
  );
  browserAPI.bookmarks.onMoved.addListener((id, moveInfo) =>
    callback('moved', { id, moveInfo })
  );
}