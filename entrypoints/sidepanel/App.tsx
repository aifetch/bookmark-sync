import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActionBar } from './components/ActionBar';
import { BookmarkTree } from './components/BookmarkTree';
import { ConfirmDialog } from './components/ConfirmDialog';
import { AddBookmarkDialog } from './components/AddBookmarkDialog';
import { EditBookmarkDialog } from './components/EditBookmarkDialog';
import { SettingsPanel } from './components/SettingsPanel';
import { ContextMenu } from './components/ContextMenu';
import { MoveToFolderDialog } from './components/MoveToFolderDialog';
import { SyncStatus } from './components/SyncStatus';
import { TopClickedList, type TopClickedBookmark } from './components/TopClickedList';
import { loadBrowserBookmarks, createBookmark, removeBookmark, moveBookmark, updateBookmark } from '@/lib/bookmark-adapter';
import { findDuplicate } from '@/lib/dedup';
import { loadClickCounts, incrementClickCount, removeClickCounts } from '@/lib/click-counts';
import type { ClickCounts } from '@/lib/click-counts';
import type { BookmarkNode, ConfirmOptions } from '@/lib/types';

type PanelView = 'main' | 'settings';

interface MenuItem {
  label: string;
  action: string;
  variant?: 'danger';
}

export default function App() {
  const [bookmarks, setBookmarks] = useState<BookmarkNode[]>([]);
  const [view, setView] = useState<PanelView>('main');
  const [search, setSearch] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);
  const [confirmResolver, setConfirmResolver] = useState<((v: boolean) => void) | null>(null);
  const [addDialog, setAddDialog] = useState<{ parentId: string; type: 'bookmark' | 'folder' } | null>(null);
  const [editNode, setEditNode] = useState<BookmarkNode | null>(null);
  const [syncMessage, setSyncMessage] = useState('');
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [moveTargetId, setMoveTargetId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'duplicate' | 'error'>('idle');
  const [clickCounts, setClickCounts] = useState<ClickCounts>({});
  const [topClickedCollapsed, setTopClickedCollapsed] = useState(true);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node: BookmarkNode;
    items: MenuItem[];
  } | null>(null);

  const refreshBookmarks = useCallback(async () => {
    const tree = await loadBrowserBookmarks();
    setBookmarks(tree);
  }, []);

  const refreshPanelData = useCallback(async () => {
    const [tree, counts] = await Promise.all([
      loadBrowserBookmarks(),
      loadClickCounts(),
    ]);
    setBookmarks(tree);
    setClickCounts(counts);
  }, []);

  useEffect(() => {
    void refreshPanelData();
    chrome.runtime.sendMessage({ type: 'GET_TOKEN' }, (t) => setToken(t));
    // 恢复 pinnedIds
    chrome.storage.local.get('pinnedIds', (r) => {
      if (r.pinnedIds) setPinnedIds(new Set(r.pinnedIds as string[]));
    });
  }, [refreshPanelData]);

  useEffect(() => {
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        void refreshPanelData();
        refreshTimer = null;
      }, 100);
    };

    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string,
    ) => {
      if (areaName !== 'local') return;

      if (changes.pinnedIds) {
        setPinnedIds(new Set((changes.pinnedIds.newValue as string[] | undefined) ?? []));
      }
      if (changes.clickCounts) {
        setClickCounts((changes.clickCounts.newValue as ClickCounts) ?? {});
      }
    };

    chrome.bookmarks.onCreated.addListener(scheduleRefresh);
    chrome.bookmarks.onRemoved.addListener(scheduleRefresh);
    chrome.bookmarks.onChanged.addListener(scheduleRefresh);
    chrome.bookmarks.onMoved.addListener(scheduleRefresh);
    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      chrome.bookmarks.onCreated.removeListener(scheduleRefresh);
      chrome.bookmarks.onRemoved.removeListener(scheduleRefresh);
      chrome.bookmarks.onChanged.removeListener(scheduleRefresh);
      chrome.bookmarks.onMoved.removeListener(scheduleRefresh);
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [refreshPanelData]);

  const askConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirm(options);
      setConfirmResolver(() => resolve);
    });
  }, []);

  const handleConfirm = useCallback(
    (value: boolean) => {
      setConfirm(null);
      confirmResolver?.(value);
      setConfirmResolver(null);
    },
    [confirmResolver]
  );

  const handleAdd = useCallback(
    async (parentId: string, title: string, url?: string) => {
      if (url) {
        const dup = findDuplicate(bookmarks, url);
        if (dup) {
          const ok = await askConfirm({
            title: '重复书签',
            message: `该 URL 已存在于「${dup.title}」中，是否仍要添加？`,
            confirmText: '仍然添加',
            cancelText: '取消',
            variant: 'warning',
          });
          if (!ok) return;
        }
      }
      await createBookmark(parentId, title, url);
      await refreshBookmarks();
      setAddDialog(null);
    },
    [bookmarks, askConfirm, refreshBookmarks]
  );

  // --- 点击计数 ---
  const handleBookmarkClick = useCallback(async (id: string, url: string) => {
    window.open(url, '_blank');
    const next = await incrementClickCount(id);
    setClickCounts((prev) => ({ ...prev, [id]: next }));
    chrome.runtime.sendMessage({ type: 'SCHEDULE_PUSH' });
  }, []);

  const clearClickCounts = useCallback(async (ids: string[]) => {
    const next = await removeClickCounts(ids);
    setClickCounts(next);
  }, []);

  const hasBookmarks = useCallback((node: BookmarkNode): boolean => {
    if (node.url) return true;
    return (node.children ?? []).some((c) => hasBookmarks(c));
  }, []);

  const handleDelete = useCallback(
    async (node: BookmarkNode) => {
      const isFolder = !node.url;
      if (isFolder && hasBookmarks(node)) {
        await askConfirm({
          title: '无法删除',
          message: `文件夹「${node.title}」中包含书签，请先清空后再删除。`,
          confirmText: '知道了',
          cancelText: undefined,
          variant: 'warning',
        });
        return;
      }
      const ok = await askConfirm({
        title: isFolder ? '删除文件夹' : '删除书签',
        message: isFolder
          ? `确定删除空文件夹「${node.title}」？`
          : `确定删除书签「${node.title}」？`,
        confirmText: '删除',
        variant: 'danger',
      });
      if (!ok) return;
      await removeBookmark(node.id, isFolder);
      if (!isFolder) {
        await clearClickCounts([node.id]);
      }
      await refreshBookmarks();
    },
    [askConfirm, refreshBookmarks, hasBookmarks, clearClickCounts]
  );

  const handleRename = useCallback(
    async (id: string, newTitle: string) => {
      await updateBookmark(id, { title: newTitle });
      await refreshBookmarks();
    },
    [refreshBookmarks]
  );

  const handleMove = useCallback(
    async (id: string, parentId: string, index?: number) => {
      await moveBookmark(id, { parentId, index });
      await refreshBookmarks();
    },
    [refreshBookmarks]
  );

  const handleSync = useCallback(async () => {
    setSyncMessage('同步中...');
    chrome.runtime.sendMessage({ type: 'SYNC' }, (res) => {
      if (res) {
        setSyncMessage(res.message);
        if (res.success) {
          void refreshPanelData();
          // 浏览器书签 API 写入后可能有微小延迟，二次刷新兜底
          setTimeout(() => void refreshPanelData(), 500);
        }
      } else {
        setSyncMessage('同步失败');
      }
    });
  }, [refreshPanelData]);

  const togglePin = useCallback((id: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      chrome.storage.local.set({ pinnedIds: [...next] });
      return next;
    });
  }, []);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, node: BookmarkNode) => {
      e.preventDefault();
      const isPinned = pinnedIds.has(node.id);
      const items: MenuItem[] = [
        { label: isPinned ? '取消置顶' : '置顶', action: isPinned ? 'unpin' : 'pin-to-top' },
        { label: '编辑', action: 'edit' },
      ];
      if (node.url) {
        items.push({ label: '在新标签页打开', action: 'open' });
      }
      if (!node.url) {
        items.push({ label: '添加子文件夹', action: 'add-folder' });
        items.push({ label: '添加子书签', action: 'add-bookmark' });
      }
      items.push({ label: '删除', action: 'delete', variant: 'danger' });
      setContextMenu({ x: e.clientX, y: e.clientY, node, items });
    },
    [pinnedIds]
  );

  const handleContextAction = useCallback(
    async (action: string) => {
      const node = contextMenu?.node;
      setContextMenu(null);
      if (!node) return;

      switch (action) {
        case 'pin-to-top':
          await moveBookmark(node.id, { parentId: node.parentId ?? '1', index: 0 });
          togglePin(node.id);
          await refreshBookmarks();
          break;
        case 'unpin':
          togglePin(node.id);
          break;
        case 'edit':
          setEditNode(node);
          break;
        case 'delete':
          await handleDelete(node);
          break;
        case 'open':
          if (node.url) {
            void handleBookmarkClick(node.id, node.url);
          }
          break;
        case 'add-bookmark':
          setAddDialog({ parentId: node.id, type: 'bookmark' });
          break;
        case 'add-folder':
          setAddDialog({ parentId: node.id, type: 'folder' });
          break;
      }
    },
    [contextMenu, handleDelete, togglePin, refreshBookmarks, handleBookmarkClick]
  );

  const handleEdit = useCallback(
    async (id: string, title: string, url?: string) => {
      const changes: { title: string; url?: string } = { title };
      if (url !== undefined) changes.url = url;
      await updateBookmark(id, changes);
      await refreshBookmarks();
      setEditNode(null);
    },
    [refreshBookmarks]
  );

  const handleSaveToken = useCallback((t: string) => {
    chrome.runtime.sendMessage({ type: 'SET_TOKEN', token: t }, () => {
      setToken(t);
    });
  }, []);

  // --- 批量模式 ---
  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const exitBatchMode = useCallback(() => {
    setBatchMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleBatchMove = useCallback(async (targetFolderId: string) => {
    if (selectedIds.size === 0) return;
    for (const id of selectedIds) {
      await moveBookmark(id, { parentId: targetFolderId });
    }
    await refreshBookmarks();
    exitBatchMode();
    setMoveTargetId(null);
  }, [selectedIds, refreshBookmarks, exitBatchMode]);

  // --- 快捷收录当前页面 ---
  const handleSaveCurrentPage = useCallback(async () => {
    if (saveStatus === 'saving') return;
    try {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (!tab?.url || !tab.url.startsWith('http')) {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 1500);
        return;
      }
      const url = tab.url;
      const title = tab.title || new URL(url).hostname;
      const dup = findDuplicate(bookmarks, url);
      if (dup) {
        setSaveStatus('duplicate');
        setTimeout(() => setSaveStatus('idle'), 2000);
        return;
      }
      setSaveStatus('saving');
      await createBookmark('1', title, url);
      await refreshBookmarks();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 1500);
    }
  }, [bookmarks, saveStatus, refreshBookmarks]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const ok = await askConfirm({
      title: '批量删除',
      message: `确定删除选中的 ${selectedIds.size} 个书签？此操作不可撤销。`,
      confirmText: '删除',
      variant: 'danger',
    });
    if (!ok) return;
    for (const id of selectedIds) {
      await removeBookmark(id, false);
    }
    await clearClickCounts([...selectedIds]);
    await refreshBookmarks();
    exitBatchMode();
  }, [selectedIds, askConfirm, refreshBookmarks, exitBatchMode, clearClickCounts]);

  const filteredBookmarks = useMemo(() => {
    if (!search.trim()) return bookmarks;
    const q = search.toLowerCase();
    return filterTree(bookmarks, q);
  }, [bookmarks, search]);

  const topClickedBookmarks = useMemo(() => {
    return collectTopClickedBookmarks(bookmarks, clickCounts);
  }, [bookmarks, clickCounts]);

  return (
    <div
      className="flex flex-col h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900 text-[13px] select-none"
      onClick={() => contextMenu && setContextMenu(null)}
    >
      {view === 'main' ? (
        <>
          <ActionBar
            onAddBookmark={() => setAddDialog({ parentId: '1', type: 'bookmark' })}
            onAddFolder={() => setAddDialog({ parentId: '1', type: 'folder' })}
            onSync={handleSync}
            onSettings={() => setView('settings')}
            search={search}
            onSearchChange={setSearch}
            batchMode={batchMode}
            selectedCount={selectedIds.size}
            onToggleBatch={() => { if (batchMode) exitBatchMode(); else { setBatchMode(true); setSelectedIds(new Set()); } }}
            onBatchMove={() => setMoveTargetId('__select__')}
            onBatchDelete={handleBatchDelete}
            onSaveCurrentPage={handleSaveCurrentPage}
            saveStatus={saveStatus}
          />
          {!batchMode && (
            <TopClickedList
              items={topClickedBookmarks}
              collapsed={topClickedCollapsed}
              onToggleCollapsed={() => setTopClickedCollapsed((prev) => !prev)}
              onOpenBookmark={(id, url) => {
                void handleBookmarkClick(id, url);
              }}
            />
          )}
          <div className="flex-1 min-h-0 overflow-hidden">
            <BookmarkTree
              data={filteredBookmarks}
              onMove={handleMove}
              onRename={handleRename}
              onContextMenu={handleContextMenu}
              pinnedIds={pinnedIds}
              batchMode={batchMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelected}
              clickCounts={clickCounts}
              onBookmarkClick={handleBookmarkClick}
            />
          </div>
          <SyncStatus message={syncMessage} onSync={handleSync} />
        </>
      ) : (
        <SettingsPanel
          token={token}
          onSaveToken={handleSaveToken}
          onBack={() => setView('main')}
        />
      )}

      {confirm && (
        <ConfirmDialog
          {...confirm}
          onConfirm={() => handleConfirm(true)}
          onCancel={() => handleConfirm(false)}
        />
      )}
      {addDialog && (
        <AddBookmarkDialog
          type={addDialog.type}
          onSubmit={(title, url) => handleAdd(addDialog.parentId, title, url)}
          onCancel={() => setAddDialog(null)}
        />
      )}
      {editNode && (
        <EditBookmarkDialog
          node={editNode}
          onSubmit={handleEdit}
          onCancel={() => setEditNode(null)}
        />
      )}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onAction={handleContextAction}
          onClose={() => setContextMenu(null)}
        />
      )}
      {moveTargetId && (
        <MoveToFolderDialog
          bookmarks={bookmarks}
          excludeIds={selectedIds}
          onSelect={handleBatchMove}
          onCancel={() => setMoveTargetId(null)}
        />
      )}
    </div>
  );
}

function filterTree(nodes: BookmarkNode[], query: string): BookmarkNode[] {
  const result: BookmarkNode[] = [];
  for (const node of nodes) {
    const titleMatch = node.title.toLowerCase().includes(query);
    const urlMatch = node.url?.toLowerCase().includes(query);
    const filteredChildren = node.children ? filterTree(node.children, query) : [];

    if (titleMatch || urlMatch || filteredChildren.length > 0) {
      result.push({ ...node, children: filteredChildren.length > 0 ? filteredChildren : node.children });
    }
  }
  return result;
}

function collectTopClickedBookmarks(nodes: BookmarkNode[], clickCounts: ClickCounts): TopClickedBookmark[] {
  const items: TopClickedBookmark[] = [];

  const visit = (nodeList: BookmarkNode[]) => {
    for (const node of nodeList) {
      if (node.url) {
        const count = clickCounts[node.id] ?? 0;
        if (count > 0) {
          items.push({
            id: node.id,
            title: node.title,
            url: node.url,
            count,
          });
        }
        continue;
      }

      if (node.children?.length) {
        visit(node.children);
      }
    }
  };

  visit(nodes);

  return items
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title))
    .slice(0, 10);
}
