import React from 'react';

export interface TopClickedBookmark {
  id: string;
  title: string;
  url: string;
  count: number;
}

interface Props {
  items: TopClickedBookmark[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onOpenBookmark: (id: string, url: string) => void;
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

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

export function TopClickedList({ items, collapsed, onToggleCollapsed, onOpenBookmark }: Props) {
  return (
    <section className="border-t border-gray-100 bg-white/85 backdrop-blur-md">
      <button
        type="button"
        onClick={onToggleCollapsed}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50/80 transition-colors"
        title={collapsed ? '展开 Top10' : '折叠 Top10'}
      >
        <span className="flex items-center justify-center w-5 h-5 rounded-md bg-orange-50 text-orange-500">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.39 6.98h7.35l-5.95 4.32 2.27 6.98L12 15.96l-6.06 4.32 2.27-6.98-5.95-4.32h7.35L12 2z" />
          </svg>
        </span>
        <span className="text-xs font-semibold text-gray-700">常用 Top10</span>
        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full leading-none">全局</span>
        <span className="flex-1" />
        <span className="text-[10px] text-gray-400">{items.length} 项</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-gray-400 transition-transform ${collapsed ? '' : 'rotate-180'}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {!collapsed && (
        <div className="max-h-44 overflow-y-auto custom-scrollbar px-2 pb-2">
          {items.length === 0 ? (
            <div className="px-2 py-3 text-[12px] text-gray-400 text-center">
              点击书签后会生成 Top10
            </div>
          ) : (
            <div className="space-y-1">
              {items.map((item, index) => {
                const favicon = getFaviconUrl(item.url);
                const hostname = getHostname(item.url);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onOpenBookmark(item.id, item.url)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-gray-50 transition-colors group"
                    title={item.url}
                  >
                    <span className={`w-5 text-center text-[11px] font-semibold ${index < 3 ? 'text-orange-500' : 'text-gray-400'}`}>
                      {index + 1}
                    </span>
                    <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                      {favicon ? (
                        <img src={favicon} width="14" height="14" className="rounded-sm" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span className="min-w-0 flex-1 flex flex-col gap-0.5">
                      <span className="truncate text-[12px] text-gray-700 group-hover:text-gray-900">{item.title || hostname || item.url}</span>
                      {hostname && <span className="truncate text-[10px] text-gray-400">{hostname}</span>}
                    </span>
                    <span className="flex-shrink-0 text-[10px] font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full leading-none">
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}