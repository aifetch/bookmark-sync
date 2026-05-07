import React, { useState } from 'react';

interface Props {
  type: 'bookmark' | 'folder';
  onSubmit: (title: string, url?: string) => void;
  onCancel: () => void;
}

export function AddBookmarkDialog({ type, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (type === 'bookmark' && !url.trim()) return;
    onSubmit(title.trim(), type === 'bookmark' ? url.trim() : undefined);
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
          <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-blue-50">
            {type === 'folder' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            )}
          </span>
          <h3 className="font-semibold text-gray-800 text-[15px]">
            {type === 'folder' ? '新建文件夹' : '新建书签'}
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
              placeholder={type === 'folder' ? '输入文件夹名称' : '输入书签名称'}
              className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                placeholder:text-gray-300 transition-all duration-150"
              autoFocus
            />
          </div>
          {type === 'bookmark' && (
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
            添加
          </button>
        </div>
      </form>
    </div>
  );
}