/** 书签点击次数管理，存储在 chrome.storage.local */

export type ClickCounts = Record<string, number>;

const CLICK_COUNTS_KEY = 'clickCounts';
const CLICK_COUNTS_UPDATED_AT_KEY = 'clickCountsUpdatedAt';

export async function loadClickCounts(): Promise<ClickCounts> {
  return new Promise((resolve) => {
    chrome.storage.local.get(CLICK_COUNTS_KEY, (r) => {
      resolve((r[CLICK_COUNTS_KEY] as ClickCounts) ?? {});
    });
  });
}

export async function loadClickCountsUpdatedAt(): Promise<number> {
  return new Promise((resolve) => {
    chrome.storage.local.get(CLICK_COUNTS_UPDATED_AT_KEY, (r) => {
      resolve((r[CLICK_COUNTS_UPDATED_AT_KEY] as number) ?? 0);
    });
  });
}

export async function incrementClickCount(id: string): Promise<number> {
  const counts = await loadClickCounts();
  const next = (counts[id] ?? 0) + 1;
  counts[id] = next;
  chrome.storage.local.set({
    [CLICK_COUNTS_KEY]: counts,
    [CLICK_COUNTS_UPDATED_AT_KEY]: Date.now(),
  });
  return next;
}

export async function saveClickCounts(counts: ClickCounts, updatedAt: number = Date.now()): Promise<void> {
  chrome.storage.local.set({
    [CLICK_COUNTS_KEY]: counts,
    [CLICK_COUNTS_UPDATED_AT_KEY]: updatedAt,
  });
}

export async function removeClickCounts(ids: string[]): Promise<ClickCounts> {
  const counts = await loadClickCounts();
  let changed = false;

  for (const id of ids) {
    if (id in counts) {
      delete counts[id];
      changed = true;
    }
  }

  if (changed) {
    chrome.storage.local.set({
      [CLICK_COUNTS_KEY]: counts,
      [CLICK_COUNTS_UPDATED_AT_KEY]: Date.now(),
    });
  }

  return counts;
}

/** 根据点击次数返回热度等级 0-4 */
export function heatLevel(count: number | undefined): number {
  if (!count || count <= 0) return 0;
  if (count <= 3) return 1;
  if (count <= 8) return 2;
  if (count <= 15) return 3;
  return 4;
}

/** 热度对应的背景色 class */
export function heatBgClass(level: number): string {
  switch (level) {
    case 1: return 'bg-green-50/60';
    case 2: return 'bg-yellow-50/70';
    case 3: return 'bg-orange-50/80';
    case 4: return 'bg-red-50/80';
    default: return '';
  }
}

/** 热度计数徽章颜色 class */
export function heatBadgeClass(level: number): string {
  switch (level) {
    case 1: return 'text-green-600 bg-green-100';
    case 2: return 'text-yellow-600 bg-yellow-100';
    case 3: return 'text-orange-600 bg-orange-100';
    case 4: return 'text-red-600 bg-red-100';
    default: return 'text-gray-500 bg-gray-100';
  }
}