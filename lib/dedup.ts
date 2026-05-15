import type { BookmarkNode } from './types';

/** 标准化 URL：去除末尾斜杠和 hash，保留并排序查询参数 */
export function normalizeBookmarkUrl(url: string): string {
  try {
    const u = new URL(url);
    let normalized = `${u.protocol}//${u.host}${u.pathname}`.replace(/\/+$/, '');
    if (u.search) {
      const params = Array.from(u.searchParams.entries()).sort(([a], [b]) => a.localeCompare(b));
      normalized += '?' + params.map(([k, v]) => `${k}=${v}`).join('&');
    }
    return normalized.toLowerCase();
  } catch {
    return url.toLowerCase().replace(/\/+$/, '');
  }
}

/** 检查 URL 是否已存在于书签树中，返回已存在的节点（如果重复） */
export function findDuplicate(
  tree: BookmarkNode[],
  url: string,
  excludeId?: string
): BookmarkNode | null {
  if (!url) return null;
  const normalizedUrl = normalizeBookmarkUrl(url);

  function search(nodes: BookmarkNode[]): BookmarkNode | null {
    for (const node of nodes) {
      if (
        node.url &&
        normalizeBookmarkUrl(node.url) === normalizedUrl &&
        node.id !== excludeId
      ) {
        return node;
      }
      if (node.children) {
        const found = search(node.children);
        if (found) return found;
      }
    }
    return null;
  }

  return search(tree);
}

/** 收集树中所有重复 URL 的书签 */
export function findAllDuplicates(tree: BookmarkNode[]): Map<string, BookmarkNode[]> {
  const urlMap = new Map<string, BookmarkNode[]>();

  function collect(nodes: BookmarkNode[]) {
    for (const node of nodes) {
      if (node.url) {
        const key = normalizeBookmarkUrl(node.url);
        const arr = urlMap.get(key) ?? [];
        arr.push(node);
        urlMap.set(key, arr);
      }
      if (node.children) collect(node.children);
    }
  }

  collect(tree);

  for (const [key, nodes] of urlMap) {
    if (nodes.length <= 1) urlMap.delete(key);
  }
  return urlMap;
}