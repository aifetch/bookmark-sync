import React from 'react';

interface Props {
  onAddBookmark: () => void;
  onAddFolder: () => void;
  onSync: () => void;
  onSettings: () => void;
  search: string;
  onSearchChange: (v: string) => void;
  batchMode: boolean;
  selectedCount: number;
  onToggleBatch: () => void;
  onBatchMove: () => void;
  onBatchDelete: () => void;
  onSaveCurrentPage: () => void;
  saveStatus: 'idle' | 'saving' | 'saved' | 'duplicate' | 'error';
}

export function ActionBar({
  onAddBookmark,
  onAddFolder,
  onSync,
  onSettings,
  search,
  onSearchChange,
  batchMode,
  selectedCount,
  onToggleBatch,
  onBatchMove,
  onBatchDelete,
  onSaveCurrentPage,
  saveStatus,
}: Props) {
  return (
    <div className="flex flex-col gap-2 px-3 py-2.5 border-b border-gray-100 bg-white/80 backdrop-blur-md"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      {/* 搜索行 */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <svg
            className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索书签..."
            className="w-full pl-7 pr-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
              placeholder:text-gray-400 transition-all duration-150"
          />
        </div>
        <button
          onClick={onSync}
          className="btn-base px-2.5 py-1.5 text-xs bg-gradient-to-b from-blue-500 to-blue-600
            text-white rounded-lg shadow-sm shadow-blue-500/20 hover:from-blue-600 hover:to-blue-700"
          title="同步"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
          </svg>
          同步
        </button>
        <button
          onClick={onSettings}
          className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-all duration-150"
          title="设置"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z" />
            <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.116l.094-.318z" />
          </svg>
        </button>
      </div>

      {/* 操作行 */}
      {batchMode ? (
        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleBatch}
            className="btn-base px-2.5 py-1 text-xs text-gray-500 bg-gray-50 border border-gray-200/60
              hover:bg-gray-100"
          >
            取消
          </button>
          <span className="text-[11px] text-gray-400">
            已选 {selectedCount} 项
          </span>
          <div className="flex-1" />
          <button
            onClick={onBatchMove}
            disabled={selectedCount === 0}
            className="btn-base px-2.5 py-1 text-xs text-blue-600 bg-blue-50 border border-blue-200/60
              hover:bg-blue-100 hover:border-blue-300 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            移动到...
          </button>
          <button
            onClick={onBatchDelete}
            disabled={selectedCount === 0}
            className="btn-base px-2.5 py-1 text-xs text-red-500 bg-red-50 border border-red-200/60
              hover:bg-red-100 hover:border-red-300 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            删除
          </button>
        </div>
      ) : (
        <div className="flex gap-1.5">
          <button
            onClick={onSaveCurrentPage}
            disabled={saveStatus === 'saving'}
            className={`btn-base px-2.5 py-1 text-xs rounded-lg transition-all duration-200
              ${saveStatus === 'saved'
                ? 'text-emerald-600 bg-emerald-50 border border-emerald-200/60'
                : saveStatus === 'duplicate'
                ? 'text-amber-600 bg-amber-50 border border-amber-200/60'
                : saveStatus === 'error'
                ? 'text-red-500 bg-red-50 border border-red-200/60'
                : 'text-violet-600 bg-violet-50 border border-violet-200/60 hover:bg-violet-100 hover:border-violet-300'
              } disabled:opacity-50 disabled:cursor-wait`}
            title="收录当前页面"
          >
            {saveStatus === 'saving' ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : saveStatus === 'saved' ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            )}
            {saveStatus === 'saved' ? '已收录' : saveStatus === 'duplicate' ? '已存在' : '收录'}
          </button>

          <button
            onClick={onToggleBatch}
            className="btn-base px-2.5 py-1 text-xs text-gray-500 bg-gray-50 border border-gray-200/60
              hover:bg-gray-100 hover:border-gray-300"
            title="批量操作"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 11 12 14 22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            批量
          </button>
          <button
            onClick={onAddFolder}
            className="btn-base px-2.5 py-1 text-xs text-amber-700 bg-amber-50 border border-amber-200/60
              hover:bg-amber-100 hover:border-amber-300"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            文件夹
          </button>
          <button
            onClick={onAddBookmark}
            className="btn-base px-2.5 py-1 text-xs text-blue-600 bg-blue-50 border border-blue-200/60
              hover:bg-blue-100 hover:border-blue-300"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            书签
          </button>
        </div>
      )}
    </div>
  );
}