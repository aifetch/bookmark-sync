interface Props {
  message: string;
  onSync: () => void;
}

export function SyncStatus({ message, onSync }: Props) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5 border-t border-gray-100 bg-white/80 backdrop-blur-md text-xs text-gray-400">
      <div className="flex items-center gap-1.5 truncate flex-1">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${message ? 'bg-blue-400 animate-pulse' : 'bg-green-400'}`} />
        <span className="truncate">{message || '就绪'}</span>
      </div>
      <button
        onClick={onSync}
        className="text-blue-500 hover:text-blue-600 ml-2 whitespace-nowrap font-medium transition-colors duration-150"
      >
        立即同步
      </button>
    </div>
  );
}