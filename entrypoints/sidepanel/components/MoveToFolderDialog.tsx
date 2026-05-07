import React, { useMemo, useState } from 'react';
import type { BookmarkNode } from '@/lib/types';

interface Props {
  bookmarks: BookmarkNode[];
  excludeIds: Set<string>;
  onSelect: (folderId: string) => void;
  onCancel: () => void;
}

interface FolderItem {
  id: string;
  title: string;
  depth: number;
  childCount: number;
}

function collectFolders(nodes: BookmarkNode[], excludeIds: Set<string>, depth = 0): FolderItem[] {
  const result: FolderItem[] = [];
  for (const node of nodes) {
    if (node.url) continue; // 只保留文件夹
    if (excludeIds.has(node.id)) continue; // 排除被选中的
    const childCount = countDirectBookmarks(node);
    result.push({ id: node.id, title: node.title || '未命名文件夹', depth, childCount });
    if (node.children) {
      result.push(...collectFolders(node.children, excludeIds, depth + 1));
    }
  }
  return result;
}

function countDirectBookmarks(node: BookmarkNode): number {
  if (!node.children) return 0;
  return node.children.filter((c) => c.url).length;
}

export function MoveToFolderDialog({ bookmarks, excludeIds, onSelect, onCancel }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const folders = useMemo(() => collectFolders(bookmarks, excludeIds), [bookmarks, excludeIds]);

  return (
    <div
      className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="modal-content bg-white rounded-2xl shadow-2xl w-[300px] max-h-[400px] flex flex-col overflow-hidden"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)' }}
      >
        {/* 标题 */}
        <div className="px-5 pt-4 pb-2">
          <div className="flex items-center gap-2 mb-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <h3 className="font-semibold text-gray-800 text-[15px]">移动到文件夹</h3>
          </div>
          <p className="text-xs text-gray-400">选择目标文件夹</p>
        </div>

        {/* 根目录选项 */}
        <div className="flex-1 overflow-auto custom-scrollbar px-2 py-1 min-h-0">
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-100
              ${hoveredId === '__root__'
                ? 'bg-blue-50 border border-blue-200'
                : 'hover:bg-gray-50 border border-transparent'
              }`}
            onMouseEnter={() => setHoveredId('__root__')}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => onSelect('1')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span className="text-[13px] text-gray-600">根目录</span>
          </div>

          {folders.map((folder) => (
            <div
              key={folder.id}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-100
                ${hoveredId === folder.id
                  ? 'bg-blue-50 border border-blue-200'
                  : 'hover:bg-gray-50 border border-transparent'
                }`}
              style={{ paddingLeft: `${12 + folder.depth * 16}px` }}
              onMouseEnter={() => setHoveredId(folder.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onSelect(folder.id)}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#fde68a" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <span className="text-[13px] text-gray-700 truncate flex-1">{folder.title}</span>
              {folder.childCount > 0 && (
                <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full leading-none">
                  {folder.childCount}
                </span>
              )}
            </div>
          ))}

          {folders.length === 0 && (
            <div className="text-center text-gray-400 text-xs py-6">暂无可用的文件夹</div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex gap-2 px-4 py-3 bg-gray-50/60 border-t border-gray-100">
          <button
            onClick={onCancel}
            className="btn-base flex-1 px-4 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}