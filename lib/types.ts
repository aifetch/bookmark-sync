export interface BookmarkNode {
  id: string;
  parentId: string | null;
  title: string;
  url?: string;
  children?: BookmarkNode[];
  createdAt: number;
  updatedAt: number;
  order: number;
}

export interface SyncState {
  gistId: string | null;
  lastSyncTime: number;
  lastSyncHash: string;
}

export interface SyncPayload {
  bookmarks: BookmarkNode[];
  clickCounts: Record<string, number>;
  clickCountsByUrl?: Record<string, number>;  // URL-based 备用数据
  updatedAt: number;
  clickCountsUpdatedAt: number;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string | null;
  variant?: 'danger' | 'warning' | 'info';
}