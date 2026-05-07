import React, { useState } from 'react';
import type { BookmarkNode } from '@/lib/types';

interface Props {
  node: BookmarkNode;
  onSubmit: (id: string, title: string, url?: string) => void;
  onCancel: () => void;
}

export function EditBookmarkDialog({ node, onSubmit, onCancel }: Props) {
  const isFolder = !node.url;
  const [title, setTitle] = useState(node.title);
  const [url, setUrl] = useState(node.url ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (!isFolder && !url.trim()) return;
    onSubmit(node.id, title.trim(), isFolder ? undefined : url.trim());
  };

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <form
        onSubmit={handleSubmit}
        className="modal-content bg-white rounded-2xl shadow-2xl w-[300px] overflow-hidden"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)' }}
      >
        {/* 标题栏 */}
        <div className="flex items-center gap-2.5 px-5 pt-4 pb-2">
          <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </span>
          <h3 className="font-semibold text-gray-800 text-[15px]">
            {isFolder ? '编辑文件夹' : '编辑书签'}
          </h3>
        </div>

        {/* 表单 */}
        <div className="px-5 pb-4 space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">名称</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isFolder ? '输入文件夹名称' : '输入书签名称'}
              className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                placeholder:text-gray-300 transition-all duration-150"
              autoFocus
            />
          </div>
          {!isFolder && (
            <div>
              <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">地址</label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="输入 URL 或任意标识"
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                  placeholder:text-gray-300 transition-all duration-150"
              />
            </div>
          )}
        </div>

        {/* 按钮行 */}
        <div className="flex justify-end gap-2 px-5 py-3 bg-gray-50/60 border-t border-gray-100">
          <button
            type="button"
            onClick={onCancel}
            className="btn-base px-4 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg"
          >
            取消
          </button>
          <button
            type="submit"
            className="btn-base px-4 py-1.5 text-sm text-white bg-gradient-to-b from-blue-500 to-blue-600
              rounded-lg shadow-sm shadow-blue-500/20 hover:from-blue-600 hover:to-blue-700"
          >
            保存
          </button>
        </div>
      </form>
    </div>
  );
}