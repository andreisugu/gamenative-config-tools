import type {
  CompatibilityParams,
  CompatibilityResponse,
  CompatibilityRun,
  Device,
  DevicesResponse,
  GameNativeExport,
  GamesSearchResponse,
  GameSuggestion,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.gamenative.app';

export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({
      error: { code: 'NETWORK_ERROR', message: `HTTP ${res.status}: ${res.statusText}` },
    }));

    const code = errorBody?.error?.code || `HTTP_${res.status}`;
    const message = errorBody?.error?.message || errorBody?.message || `Request failed with status ${res.status}`;
    throw new ApiError(code, message);
  }

  return res.json() as Promise<T>;
}

/**
 * Searches games by name prefix/substring.
 * @param query Game name search string (min length 2)
 * @param signal Optional AbortSignal for request cancellation
 */
export async function searchGames(query: string, signal?: AbortSignal): Promise<GameSuggestion[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }
  const data = await apiFetch<GamesSearchResponse>(
    `/api/games/search?q=${encodeURIComponent(query.trim())}`,
    { signal }
  );
  return data.games || [];
}

/**
 * Fetches the entire device catalog with models, GPUs, and Android versions.
 * @param signal Optional AbortSignal
 */
export async function getDevices(signal?: AbortSignal): Promise<Device[]> {
  const data = await apiFetch<DevicesResponse>('/api/devices', { signal });
  return data.devices || [];
}

/**
 * Queries community compatibility runs and configs for a specific game.
 * Note: gameId is required by the API.
 * @param params Query parameters (gameId, deviceId, gpu, ratingMin, sort, dir, page, limit)
 * @param signal Optional AbortSignal
 */
export async function getCompatibility(
  params: CompatibilityParams,
  signal?: AbortSignal
): Promise<CompatibilityResponse> {
  if (!params.gameId) {
    return { runs: [], total: 0 };
  }

  const qs = new URLSearchParams();
  qs.set('gameId', String(params.gameId));

  if (params.deviceId != null) qs.set('deviceId', String(params.deviceId));
  if (params.gpu && params.gpu.trim()) qs.set('gpu', params.gpu.trim());
  if (params.ratingMin != null) qs.set('ratingMin', String(params.ratingMin));
  if (params.sort) qs.set('sort', params.sort);
  if (params.dir) qs.set('dir', params.dir);
  if (params.page != null) {
    // GameNative API expects 0-indexed page (page=0 is first page)
    const apiPage = Math.max(0, params.page > 0 ? params.page - 1 : params.page);
    qs.set('page', String(apiPage));
  }
  if (params.limit != null) qs.set('limit', String(params.limit));

  return apiFetch<CompatibilityResponse>(`/api/compatibility?${qs.toString()}`, { signal });
}

/**
 * Formats a compatibility run's configuration into the Android GameNative
 * Import/Export JSON schema.
 */
export function formatGameNativeExport(
  run: CompatibilityRun,
  fallbackGameName?: string
): GameNativeExport {
  const containerName =
    fallbackGameName?.trim() ||
    run.game?.name?.trim() ||
    run.gameName?.trim() ||
    `GameNative-${run.id}`;

  return {
    version: 1,
    exportedFrom: 'GameNative Config Tools',
    timestamp: Date.now(),
    containerName,
    config: run.configs || {},
  };
}

/**
 * Initiates a browser download of the run's config as a clean JSON file.
 */
export function downloadConfigJson(run: CompatibilityRun, fallbackGameName?: string): void {
  if (typeof window === 'undefined') return;

  const exportData = formatGameNativeExport(run, fallbackGameName);
  const json = JSON.stringify(exportData, null, 2);

  const safeName = exportData.containerName
    .replace(/[^a-zA-Z0-9_\-]+/g, '_')
    .replace(/^_+|_+$/g, '');

  const filename = `${safeName || 'config'}-gamenative.json`;
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
