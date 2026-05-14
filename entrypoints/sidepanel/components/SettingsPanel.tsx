import { useState } from 'react';

interface Props {
  token: string | null;
  onSaveToken: (token: string) => void;
  onBack: () => void;
}

export function SettingsPanel({ token, onSaveToken, onBack }: Props) {
  const [inputToken, setInputToken] = useState(token ?? '');

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors duration-150"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          返回
        </button>
        <h2 className="font-semibold text-gray-800">设置</h2>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar p-5 space-y-6">
        {/* Token 配置 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </svg>
            </span>
            <div>
              <label className="block text-sm font-medium text-gray-800">
                GitHub Personal Access Token
              </label>
              <p className="text-[11px] text-gray-400">
                需要 gist 权限。仅存储在浏览器本地。
              </p>
            </div>
          </div>
          <input
            type="password"
            value={inputToken}
            onChange={(e) => setInputToken(e.target.value)}
            placeholder="ghp_xxxxxxxx"
            className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg font-mono
              focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
              placeholder:text-gray-300 transition-all duration-150"
          />
          <button
            onClick={() => onSaveToken(inputToken)}
            disabled={!inputToken.trim()}
            className="btn-base px-4 py-1.5 text-sm text-white bg-gradient-to-b from-blue-500 to-blue-600
              rounded-lg shadow-sm shadow-blue-500/20 hover:from-blue-600 hover:to-blue-700
              disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            保存 Token
          </button>
          {token && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Token 已配置
            </div>
          )}
        </div>

        {/* 关于 */}
        <div className="border-t border-gray-100 pt-5 space-y-2">
          <h3 className="text-sm font-medium text-gray-700">关于</h3>
          <div className="text-xs text-gray-400 space-y-1">
            <p>Bookmark Sync v1.0.1</p>
            <p>数据存储在 GitHub Gist，浏览器扩展通过 GitHub API 双向同步书签。</p>
          </div>
        </div>
      </div>
    </div>
  );
}