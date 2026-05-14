import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Tree, NodeApi } from 'react-arborist';
import type { BookmarkNode } from '@/lib/types';
import type { ClickCounts } from '@/lib/click-counts';
import { heatLevel, heatBgClass, heatBadgeClass } from '@/lib/click-counts';

interface Props {
  data: BookmarkNode[];
  onMove: (id: string, parentId: string, index?: number) => void;
  onRename: (id: string, newTitle: string) => void;
  onContextMenu: (e: React.MouseEvent, node: BookmarkNode) => void;
  pinnedIds: Set<string>;
  batchMode: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  clickCounts: ClickCounts;
  onBookmarkClick: (id: string, url: string) => void;
}

interface TreeDataItem {
  id: string;
  name: string;
  url?: string;
  childCount?: number;
  children?: TreeDataItem[];
}

function countBookmarks(node: BookmarkNode): number {
  if (node.url) return 1;
  return (node.children ?? []).reduce((sum, c) => sum + countBookmarks(c), 0);
}

function flattenToTreeData(nodes: BookmarkNode[]): TreeDataItem[] {
  return nodes.map((n) => ({
    id: n.id,
    name: n.title || (n.url ? '' : '未命名文件夹'),
    url: n.url,
    childCount: !n.url ? countBookmarks(n) : undefined,
    children: n.children ? flattenToTreeData(n.children) : undefined,
  }));
}

function buildNodeMap(nodes: BookmarkNode[], map = new Map<string, BookmarkNode>()): Map<string, BookmarkNode> {
  for (const n of nodes) {
    map.set(n.id, n);
    if (n.children) buildNodeMap(n.children, map);
  }
  return map;
}

function getFaviconUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol === 'http:' || u.protocol === 'https:') {
      return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=16`;
    }
    return null;
  } catch {
    return null;
  }
}

export function BookmarkTree({ data, onMove, onRename, onContextMenu, pinnedIds, batchMode, selectedIds, onToggleSelect, clickCounts, onBookmarkClick }: Props) {
  const treeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [treeHeight, setTreeHeight] = useState(0);
  const treeData = useMemo(() => flattenToTreeData(data), [data]);
  const nodeMap = useMemo(() => buildNodeMap(data), [data]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateHeight = () => setTreeHeight(container.clientHeight);
    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  const handleMove = useCallback(
    (args: { dragIds: string[]; parentId: string | null; index: number }) => {
      const id = args.dragIds[0];
      if (!id) return;
      const parentId = args.parentId ?? '1';
      onMove(id, parentId, args.index);
    },
    [onMove]
  );

  const handleRename = useCallback(
    (args: { id: string; name: string }) => {
      onRename(args.id, args.name);
    },
    [onRename]
  );

  const NodeRenderer = useCallback(({ node, style, dragHandle }: {
    node: NodeApi<TreeDataItem>;
    style: React.CSSProperties;
    dragHandle?: (el: HTMLElement | null) => void;
  }) => {
    const isFolder = !node.data.url;
    const isPinned = pinnedIds.has(node.data.id);
    const favicon = !isFolder && node.data.url ? getFaviconUrl(node.data.url) : null;
    const isChecked = selectedIds.has(node.data.id);
    const clickCount = !isFolder ? (clickCounts[node.data.id] ?? 0) : 0;
    const level = heatLevel(clickCount);
    const heatBg = !isFolder && level > 0 ? heatBgClass(level) : '';

    const handleCtx = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const bmNode = nodeMap.get(node.data.id);
      if (bmNode) onContextMenu(e, bmNode);
    };

    const handleCheck = (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleSelect(node.data.id);
    };

    return (
      <div
        ref={dragHandle}
        style={style}
        className={`tree-node flex items-center gap-2 px-2 py-1 cursor-pointer rounded-md group
          ${node.isSelected
            ? 'bg-blue-50 border-l-2 border-blue-400'
            : 'border-l-2 border-transparent'
          }
          ${node.isDragging ? 'opacity-40' : ''}
          ${isChecked ? 'bg-blue-50/50' : ''}
          ${isPinned ? 'bg-gradient-to-r from-amber-50/80 to-transparent' : ''}
          ${heatBg}
          hover:bg-gray-50/80`}
        onClick={(e) => {
          if (batchMode) {
            if (isFolder) {
              node.toggle();
            } else {
              onToggleSelect(node.data.id);
            }
            return;
          }
          if (node.isLeaf && node.data.url) {
            onBookmarkClick(node.data.id, node.data.url);
          } else {
            node.toggle();
          }
        }}
        onContextMenu={handleCtx}
      >
        {/* 批量勾选 */}
        {batchMode && (
          <span
            className="w-4 h-4 flex-shrink-0 flex items-center justify-center"
            onClick={handleCheck}
          >
            <span className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-all duration-100
              ${isChecked
                ? 'bg-blue-500 border-blue-500'
                : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              {isChecked && (
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </span>
          </span>
        )}
        {/* 图标 */}
        <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
          {isFolder ? (
            node.isOpen ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 10h20" stroke="#f59e0b" strokeWidth="1" opacity="0.4" />
                <path d="M9 14h6M12 11v6" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" fill="#fde68a" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )
          ) : favicon ? (
            <img src={favicon} width="14" height="14" className="rounded-sm" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>

        {/* 名称 + 子项数量 */}
        <span className="truncate flex-1 text-[13px] leading-tight flex items-center gap-1" title={node.data.name}>
          <span className="truncate">{node.data.name}</span>
          {isFolder && node.data.childCount != null && node.data.childCount > 0 && (
            <span className="text-[10px] text-gray-400 flex-shrink-0 bg-gray-100 px-1.5 py-0.5 rounded-full leading-none">
              {node.data.childCount}
            </span>
          )}
        </span>

        {/* 置顶标识 */}
        {isPinned && (
          <span className="flex-shrink-0 flex items-center" title="已置顶">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="#f59e0b" opacity="0.8">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </span>
        )}

        {/* URL 域名 */}
        {node.data.url && (
          <span className="text-[10px] text-gray-400 truncate max-w-[70px] opacity-0 group-hover:opacity-100 transition-opacity duration-150" title={node.data.url}>
            {(() => { try { return new URL(node.data.url).hostname; } catch { return ''; } })()}
          </span>
        )}

        {/* 点击计数徽章 */}
        {!isFolder && clickCount > 0 && (
          <span className={`text-[10px] flex-shrink-0 px-1.5 py-0.5 rounded-full leading-none font-medium ${heatBadgeClass(level)}`}
            title={`点击 ${clickCount} 次`}>
            {clickCount}
          </span>
        )}
      </div>
    );
  }, [onContextMenu, nodeMap, pinnedIds, batchMode, selectedIds, onToggleSelect, clickCounts, onBookmarkClick]);

  if (treeData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm gap-2">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
        <span>暂无书签数据</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full overflow-hidden custom-scrollbar">
      {treeHeight > 0 && (
        <Tree
          ref={treeRef}
          data={treeData}
          openByDefault={false}
          width="100%"
          height={treeHeight}
          indent={18}
          rowHeight={30}
          overscanCount={10}
          onMove={handleMove}
          onRename={handleRename}
        >
          {NodeRenderer}
        </Tree>
      )}
    </div>
  );
}