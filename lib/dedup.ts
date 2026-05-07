import type { BookmarkNode } from './types';

/** 检查 URL 是否已存在于书签树中，返回已存在的节点（如果重复） */
export function findDuplicate(
  tree: BookmarkNode[],
  url: string,
  excludeId?: string
): BookmarkNode | null {
  if (!url) return null;
  const normalizedUrl = normalizeUrl(url);

  function search(nodes: BookmarkNode[]): BookmarkNode | null {
    for (const node of nodes) {
      if (
        node.url &&
        normalizeUrl(node.url) === normalizedUrl &&
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

/** 标准化 URL：去除末尾斜杠和 hash */
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    let normalized = `${u.protocol}//${u.host}${u.pathname}`.replace(/\/+$/, '');
    // 保留查询参数但排序
    if (u.search) {
      const params = Array.from(u.searchParams.entries()).sort(([a], [b]) => a.localeCompare(b));
      normalized += '?' + params.map(([k, v]) => `${k}=${v}`).join('&');
    }
    return normalized.toLowerCase();
  } catch {
    return url.toLowerCase().replace(/\/+$/, '');
  }
}

/** 收集树中所有重复 URL 的书签 */
export function findAllDuplicates(tree: BookmarkNode[]): Map<string, BookmarkNode[]> {
  const urlMap = new Map<string, BookmarkNode[]>();

  function collect(nodes: BookmarkNode[]) {
    for (const node of nodes) {
      if (node.url) {
        const key = normalizeUrl(node.url);
        const arr = urlMap.get(key) ?? [];
        arr.push(node);
        urlMap.set(key, arr);
      }
      if (node.children) collect(node.children);
    }
  }

  collect(tree);

  // 只保留重复项
  for (const [key, nodes] of urlMap) {
    if (nodes.length <= 1) urlMap.delete(key);
  }
  return urlMap;
}