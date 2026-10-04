/**
 * Local Favorites / Bookmarks storage manager for GameNative Config Tools.
 * Persists saved configurations to localStorage with event-driven reactivity.
 */

import type { CompatibilityRun } from './types';

const STORAGE_KEY = 'gamenative_favorite_configs';
const CHANGE_EVENT = 'gamenative_favorites_changed';

export interface SavedConfigItem {
  id: string; // `${run.id}`
  runId: number;
  gameId: number;
  gameName: string;
  savedAt: number;
  run: CompatibilityRun;
}

export function getSavedConfigs(): SavedConfigItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to read saved configs:', e);
    return [];
  }
}

export function isConfigSaved(runId: number): boolean {
  const list = getSavedConfigs();
  return list.some((item) => item.runId === runId);
}

export function toggleSaveConfig(run: CompatibilityRun, gameName?: string): boolean {
  if (typeof window === 'undefined') return false;
  const list = getSavedConfigs();
  const existingIdx = list.findIndex((item) => item.runId === run.id);

  let nowSaved = false;
  if (existingIdx >= 0) {
    list.splice(existingIdx, 1);
    nowSaved = false;
  } else {
    const gId = run.game?.id || run.gameId || 0;
    const effectiveGameName =
      gameName ||
      run.game?.name ||
      run.gameName ||
      (gId ? `Game #${gId}` : 'Saved Game');

    list.unshift({
      id: String(run.id),
      runId: run.id,
      gameId: gId,
      gameName: effectiveGameName,
      savedAt: Date.now(),
      run,
    });
    nowSaved = true;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch (e) {
    console.error('Failed to persist saved configs:', e);
  }

  return nowSaved;
}

export function removeSavedConfig(runId: number): void {
  if (typeof window === 'undefined') return;
  const list = getSavedConfigs().filter((item) => item.runId !== runId);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch (e) {
    console.error('Failed to remove saved config:', e);
  }
}

export function clearAllSavedConfigs(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch (e) {
    console.error('Failed to clear saved configs:', e);
  }
}

export function onFavoritesChange(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}
