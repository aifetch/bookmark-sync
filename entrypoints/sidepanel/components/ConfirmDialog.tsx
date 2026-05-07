import React from 'react';
import type { ConfirmOptions } from '@/lib/types';

interface Props extends Omit<ConfirmOptions, 'cancelText'> {
  cancelText?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const variantConfig: Record<string, { icon: JSX.Element; btnClass: string }> = {
  danger: {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
    btnClass: 'from-red-500 to-red-600 shadow-red-500/20 hover:from-red-600 hover:to-red-700',
  },
  warning: {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    btnClass: 'from-amber-500 to-amber-600 shadow-amber-500/20 hover:from-amber-600 hover:to-amber-700',
  },
  info: {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
    btnClass: 'from-blue-500 to-blue-600 shadow-blue-500/20 hover:from-blue-600 hover:to-blue-700',
  },
};

export function ConfirmDialog({
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  variant = 'info',
  onConfirm,
  onCancel,
}: Props) {
  const cfg = variantConfig[variant] ?? variantConfig.info;

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && cancelText) onCancel(); }}
    >
      <div
        className="modal-content bg-white rounded-2xl shadow-2xl w-[280px] overflow-hidden"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)' }}
      >
        <div className="flex flex-col items-center px-6 pt-5 pb-3 text-center">
          <span className="mb-3">{cfg.icon}</span>
          <h3 className="font-semibold text-gray-800 text-[15px] mb-1.5">{title}</h3>
          <p className="text-sm text-gray-500 leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-2 px-5 py-3 bg-gray-50/60 border-t border-gray-100">
          {cancelText && (
            <button
              onClick={onCancel}
              className="btn-base flex-1 px-4 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`btn-base flex-1 px-4 py-1.5 text-sm text-white bg-gradient-to-b rounded-lg shadow-sm ${cfg.btnClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}