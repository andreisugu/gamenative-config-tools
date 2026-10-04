'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Search,
  Star,
  Zap,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Filter,
  Download,
  X,
  ExternalLink,
  Smartphone,
  Eye,
  Check,
  Layers,
  ArrowUpDown,
  RefreshCw,
  Sliders,
  Share2,
  Trash2,
  QrCode,
  Copy,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  searchGames,
  getDevices,
  getCompatibility,
  formatGameNativeExport,
  downloadConfigJson,
} from '@/lib/api';
import type {
  CompatibilityRun,
  Device,
  GameSuggestion,
} from '@/lib/types';
import {
  getSavedConfigs,
  toggleSaveConfig,
  isConfigSaved,
  onFavoritesChange,
  clearAllSavedConfigs,
  type SavedConfigItem,
} from '@/lib/favorites';
import SendToPhoneModal from '@/app/components/SendToPhoneModal';
import Toast, { type ToastMessage } from '@/app/components/Toast';

const ITEMS_PER_PAGE = 15;
const DEBOUNCE_MS = 250;

type SortOption = 'newest' | 'oldest' | 'rating_desc' | 'rating_asc' | 'fps_desc' | 'fps_asc';

export default function ConfigBrowserClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Mode: 'search' vs 'favorites'
  const [activeTab, setActiveTab] = useState<'search' | 'favorites'>(
    searchParams.get('tab') === 'favorites' ? 'favorites' : 'search'
  );

  // Search & Game Selection
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGame, setSelectedGame] = useState<GameSuggestion | null>(null);
  const [suggestions, setSuggestions] = useState<GameSuggestion[]>([]);
  const [isSearchingGames, setIsSearchingGames] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  // Filters
  const [gpuFilter, setGpuFilter] = useState(searchParams.get('gpu') || '');
  const [ratingMin, setRatingMin] = useState<number | null>(
    searchParams.get('rating') ? Number(searchParams.get('rating')) : null
  );
  const [sortOption, setSortOption] = useState<SortOption>(
    (searchParams.get('sort') as SortOption) || 'newest'
  );

  // Devices catalog for GPU suggestions
  const [devices, setDevices] = useState<Device[]>([]);
  const [gpuSuggestions, setGpuSuggestions] = useState<string[]>([]);
  const [showGpuSuggestions, setShowGpuSuggestions] = useState(false);
  const gpuBoxRef = useRef<HTMLDivElement>(null);

  // Results & Pagination
  const [runs, setRuns] = useState<CompatibilityRun[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(
    searchParams.get('page') ? Number(searchParams.get('page')) : 1
  );
  const [isLoadingRuns, setIsLoadingRuns] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Favorites state
  const [savedConfigs, setSavedConfigs] = useState<SavedConfigItem[]>([]);
  const [savedSearchQuery, setSavedSearchQuery] = useState('');
  const [savedRunIds, setSavedRunIds] = useState<Set<number>>(new Set());

  // Modal inspection & Mobile QR Share
  const [activeModalRun, setActiveModalRun] = useState<CompatibilityRun | null>(null);
  const [phoneModalRun, setPhoneModalRun] = useState<{
    run: CompatibilityRun;
    gameName?: string;
  } | null>(null);

  // Confirmation feedback states
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [downloadedRunId, setDownloadedRunId] = useState<number | null>(null);
  const [copiedCardRunId, setCopiedCardRunId] = useState<number | null>(null);
  const [modalCopiedRaw, setModalCopiedRaw] = useState(false);
  const [modalDownloaded, setModalDownloaded] = useState(false);
  const [modalCopiedLink, setModalCopiedLink] = useState(false);

  // Toast Helper
  const showToast = useCallback(
    (message: string, type: 'success' | 'info' | 'error' = 'success', title?: string) => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, message, type, title }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Load Favorites & Register Listener ──────────────────────────────
  useEffect(() => {
    const list = getSavedConfigs();
    setSavedConfigs(list);
    setSavedRunIds(new Set(list.map((item) => item.runId)));

    return onFavoritesChange(() => {
      const updated = getSavedConfigs();
      setSavedConfigs(updated);
      setSavedRunIds(new Set(updated.map((item) => item.runId)));
    });
  }, []);

  // ── Load Devices Catalog for GPU filter ─────────────────────────────
  useEffect(() => {
    let cancelled = false;
    getDevices()
      .then((data) => {
        if (!cancelled) {
          setDevices(data);
          const distinctGpus = Array.from(
            new Set(data.map((d) => d.gpu?.trim()).filter(Boolean) as string[])
          ).sort();
          setGpuSuggestions(distinctGpus);
        }
      })
      .catch((err) => {
        console.error('Failed to load device catalogue:', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Deep Link Initializer ──────────────────────────────────────────
  useEffect(() => {
    const gameParam = searchParams.get('game') || searchParams.get('gameId');
    if (!gameParam) return;

    const isNumeric = /^\d+$/.test(gameParam.trim());
    if (isNumeric) {
      const gId = Number(gameParam.trim());
      getCompatibility({ gameId: gId, page: 1, limit: 1 })
        .then((res) => {
          const firstRun = res.runs[0];
          const name =
            searchParams.get('gameName') ||
            firstRun?.game?.name ||
            firstRun?.gameName ||
            `Game #${gId}`;
          setSelectedGame({ id: gId, name });
          setSearchTerm(name);
        })
        .catch((err) => {
          console.error('Failed to resolve game from URL:', err);
        });
    } else if (gameParam.trim().length >= 2) {
      searchGames(gameParam.trim())
        .then((games) => {
          if (games.length > 0) {
            setSelectedGame(games[0]);
            setSearchTerm(games[0].name);
          }
        })
        .catch(console.error);
    }
  }, []);

  // ── Auto-Open Run from URL Parameter ───────────────────────────────
  useEffect(() => {
    const runIdParam = searchParams.get('run');
    if (!runIdParam || runs.length === 0) return;

    const targetRun = runs.find((r) => r.id === Number(runIdParam));
    if (targetRun) {
      setActiveModalRun(targetRun);
    }
  }, [runs, searchParams]);

  // ── Synchronize URL Search Parameters ──────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams();
    if (activeTab === 'favorites') {
      params.set('tab', 'favorites');
    } else {
      if (selectedGame) {
        params.set('game', String(selectedGame.id));
        params.set('gameName', selectedGame.name);
      }
      if (gpuFilter) params.set('gpu', gpuFilter);
      if (ratingMin) params.set('rating', String(ratingMin));
      if (sortOption !== 'newest') params.set('sort', sortOption);
      if (currentPage > 1) params.set('page', String(currentPage));
    }
    if (activeModalRun) {
      params.set('run', String(activeModalRun.id));
    }

    const queryStr = params.toString();
    const targetUrl = queryStr
      ? `${window.location.pathname}?${queryStr}`
      : window.location.pathname;

    window.history.replaceState(null, '', targetUrl);
  }, [
    selectedGame,
    gpuFilter,
    ratingMin,
    sortOption,
    currentPage,
    activeTab,
    activeModalRun,
  ]);

  // ── Debounced Game Search ──────────────────────────────────────────
  useEffect(() => {
    if (selectedGame && selectedGame.name === searchTerm) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (!searchTerm || searchTerm.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingGames(true);
      try {
        const results = await searchGames(searchTerm);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch (err) {
        console.error('Error searching games:', err);
      } finally {
        setIsSearchingGames(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchTerm, selectedGame]);

  // ── Handle outside clicks for autocomplete ─────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
      if (gpuBoxRef.current && !gpuBoxRef.current.contains(e.target as Node)) {
        setShowGpuSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Map Sort Option to API Sort & Dir ──────────────────────────────
  const { sortField, sortDir } = useMemo(() => {
    switch (sortOption) {
      case 'newest':
        return { sortField: 'created_at' as const, sortDir: 'desc' as const };
      case 'oldest':
        return { sortField: 'created_at' as const, sortDir: 'asc' as const };
      case 'rating_desc':
        return { sortField: 'rating' as const, sortDir: 'desc' as const };
      case 'rating_asc':
        return { sortField: 'rating' as const, sortDir: 'asc' as const };
      case 'fps_desc':
        return { sortField: 'avg_fps' as const, sortDir: 'desc' as const };
      case 'fps_asc':
        return { sortField: 'avg_fps' as const, sortDir: 'asc' as const };
    }
  }, [sortOption]);

  // ── Fetch Compatibility Runs from API ──────────────────────────────
  const fetchRuns = useCallback(async () => {
    if (!selectedGame) {
      setRuns([]);
      setTotalCount(0);
      setErrorMessage(null);
      return;
    }

    setIsLoadingRuns(true);
    setErrorMessage(null);

    try {
      const response = await getCompatibility({
        gameId: selectedGame.id,
        gpu: gpuFilter || undefined,
        ratingMin: ratingMin || undefined,
        sort: sortField,
        dir: sortDir,
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      });

      setRuns(response.runs);
      setTotalCount(response.total);
    } catch (err: any) {
      console.error('Error fetching compatibility runs:', err);
      setErrorMessage(err.message || 'Failed to fetch compatibility configurations.');
      setRuns([]);
      setTotalCount(0);
    } finally {
      setIsLoadingRuns(false);
    }
  }, [selectedGame, gpuFilter, ratingMin, sortField, sortDir, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedGame, gpuFilter, ratingMin, sortOption]);

  // Trigger fetch when parameters or page change
  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  // ── Actions & Handlers with Green Confirmation ─────────────────────
  const handleSelectGame = (game: GameSuggestion) => {
    setSelectedGame(game);
    setSearchTerm(game.name);
    setShowSuggestions(false);
  };

  const handleClearGame = () => {
    setSelectedGame(null);
    setSearchTerm('');
    setSuggestions([]);
    setRuns([]);
    setTotalCount(0);
  };

  const handleLoadInEditor = (run: CompatibilityRun, gameName?: string) => {
    const exportData = formatGameNativeExport(run, gameName || selectedGame?.name);
    try {
      localStorage.setItem('pendingConfig', JSON.stringify(exportData));
      router.push('/config-editor');
    } catch (e) {
      console.error('Failed to store pendingConfig:', e);
    }
  };

  const handleCopyRaw = (configs: any) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard?.writeText?.(JSON.stringify(configs, null, 2))?.catch?.(() => {});
      setModalCopiedRaw(true);
      showToast('Raw configuration JSON copied to clipboard successfully!', 'success', 'JSON Copied');
      setTimeout(() => setModalCopiedRaw(false), 2500);
    }
  };

  const handleCopyShareView = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard?.writeText?.(window.location.href)?.catch?.(() => {});
      setCopiedShareLink(true);
      showToast('Browser view link copied to clipboard successfully!', 'success', 'Link Copied');
      setTimeout(() => setCopiedShareLink(false), 2500);
    }
  };

  const handleCopyCardLink = (run: CompatibilityRun, gameName?: string) => {
    if (typeof window === 'undefined') return;
    const gId = run.game?.id || run.gameId || selectedGame?.id || '';
    const shareUrl = `${window.location.origin}${window.location.pathname}?game=${gId}&run=${run.id}`;
    navigator.clipboard?.writeText?.(shareUrl)?.catch?.(() => {});
    setCopiedCardRunId(run.id);
    const title = gameName || run.game?.name || selectedGame?.name || 'Game';
    showToast(`Configuration link for ${title} copied to clipboard successfully!`, 'success', 'Link Copied');
    setTimeout(() => setCopiedCardRunId((curr) => (curr === run.id ? null : curr)), 2500);
  };

  const handleDownloadCard = (run: CompatibilityRun, gameName?: string) => {
    const title = gameName || run.game?.name || selectedGame?.name || 'Game';
    downloadConfigJson(run, title);
    setDownloadedRunId(run.id);
    showToast(`Downloaded ${title} config.json successfully!`, 'success', 'Download Complete');
    setTimeout(() => setDownloadedRunId((curr) => (curr === run.id ? null : curr)), 2500);
  };

  const handleToggleFavorite = (run: CompatibilityRun, gameName?: string) => {
    const title = gameName || run.game?.name || selectedGame?.name || 'Game';
    const nowSaved = toggleSaveConfig(run, title);
    if (nowSaved) {
      showToast(`★ Added ${title} configuration to Saved Configs!`, 'success', 'Saved to Favorites');
    } else {
      showToast(`Removed ${title} configuration from Saved Configs.`, 'info', 'Removed from Favorites');
    }
  };

  const handleModalDownload = (run: CompatibilityRun, gameName?: string) => {
    const title = gameName || run.game?.name || selectedGame?.name || 'Game';
    downloadConfigJson(run, title);
    setModalDownloaded(true);
    showToast(`Downloaded ${title} config.json successfully!`, 'success', 'Download Complete');
    setTimeout(() => setModalDownloaded(false), 2500);
  };

  const handleModalCopyLink = (run: CompatibilityRun, gameName?: string) => {
    if (typeof window === 'undefined') return;
    const gId = run.game?.id || run.gameId || selectedGame?.id || '';
    const shareUrl = `${window.location.origin}${window.location.pathname}?game=${gId}&run=${run.id}`;
    navigator.clipboard?.writeText?.(shareUrl)?.catch?.(() => {});
    setModalCopiedLink(true);
    const title = gameName || run.game?.name || selectedGame?.name || 'Game';
    showToast(`Configuration link for ${title} copied to clipboard successfully!`, 'success', 'Link Copied');
    setTimeout(() => setModalCopiedLink(false), 2500);
  };

  // ── Filtered Favorites for Local View ──────────────────────────────
  const filteredSavedConfigs = useMemo(() => {
    if (!savedSearchQuery.trim()) return savedConfigs;
    const q = savedSearchQuery.toLowerCase();
    return savedConfigs.filter(
      (item) =>
        item.gameName.toLowerCase().includes(q) ||
        (item.run.device?.model && item.run.device.model.toLowerCase().includes(q)) ||
        (item.run.device?.gpu && item.run.device.gpu.toLowerCase().includes(q)) ||
        (item.run.configs?.emulator && item.run.configs.emulator.toLowerCase().includes(q)) ||
        (item.run.configs?.wineVersion && item.run.configs.wineVersion.toLowerCase().includes(q))
    );
  }, [savedConfigs, savedSearchQuery]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500">
              Community Configurations
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Search, customize, and share tested game configurations submitted by the GameNative and Winlator community.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              data-testid="share-view-button"
              onClick={handleCopyShareView}
              title="Copy link to current browser search and filters"
              className={`text-xs px-3.5 py-2 rounded-lg border transition flex items-center gap-1.5 font-semibold ${
                copiedShareLink
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-600/30'
                  : 'bg-gray-800 hover:bg-gray-700 text-cyan-300 border-gray-700'
              }`}
            >
              {copiedShareLink ? <Check className="h-3.5 w-3.5 text-white" /> : <Share2 className="h-3.5 w-3.5" />}
              {copiedShareLink ? 'Copied successfully!' : 'Share View'}
            </button>

            <button
              onClick={() => router.push('/')}
              className="text-xs px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700 transition"
            >
              ← Back to Home
            </button>
          </div>
        </div>

        {/* Tab Switcher: Live Search vs Saved Favorites */}
        <div className="flex rounded-2xl bg-gray-900/80 p-1 border border-gray-800 max-w-md">
          <button
            data-testid="tab-live-search"
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-2 px-4 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 ${
              activeTab === 'search'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Search className="h-4 w-4" />
            Live Search
          </button>
          <button
            data-testid="tab-saved-configs"
            onClick={() => setActiveTab('favorites')}
            className={`flex-1 py-2 px-4 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 ${
              activeTab === 'favorites'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Star className={`h-4 w-4 ${savedConfigs.length > 0 ? 'fill-amber-400 text-amber-400' : ''}`} />
            Saved Configs
            {savedConfigs.length > 0 && (
              <span className="bg-gray-800 text-cyan-300 text-[10px] px-2 py-0.5 rounded-full border border-gray-700 font-mono">
                {savedConfigs.length}
              </span>
            )}
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* VIEW 1: LIVE SEARCH                                            */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            {/* Search & Filter Controls Card */}
            <div className="bg-gray-800/60 backdrop-blur-md p-6 rounded-2xl border border-gray-700 shadow-xl space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Game Search Box */}
                <div className="md:col-span-6 relative" ref={searchBoxRef}>
                  <label htmlFor="game-search" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Game Search <span className="text-cyan-400">*</span>
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-3 h-5 w-5 text-gray-400" />
                    <input
                      id="game-search"
                      type="text"
                      placeholder="Type to search games (e.g. Elden Ring, GTA V, Fallout)..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        if (selectedGame && e.target.value !== selectedGame.name) {
                          setSelectedGame(null);
                        }
                      }}
                      onFocus={() => {
                        if (suggestions.length > 0) setShowSuggestions(true);
                      }}
                      className="w-full pl-10 pr-10 py-2.5 bg-gray-900 border border-gray-700 rounded-xl focus:outline-none focus:border-cyan-500 text-gray-100 placeholder-gray-500 text-sm transition"
                    />
                    {isSearchingGames && (
                      <div className="absolute right-10 top-3">
                        <RefreshCw className="h-4 w-4 text-cyan-400 animate-spin" />
                      </div>
                    )}
                    {searchTerm && (
                      <button
                        onClick={handleClearGame}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Suggestions Dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-30 w-full mt-1.5 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-gray-800">
                      {suggestions.map((game) => (
                        <button
                          key={game.id}
                          onClick={() => handleSelectGame(game)}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-800 text-gray-200 hover:text-cyan-400 transition flex items-center justify-between"
                        >
                          <span className="font-medium">{game.name}</span>
                          <span className="text-xs text-gray-500 bg-gray-800/80 px-2 py-0.5 rounded font-mono">
                            ID: {game.id}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* GPU Filter Box */}
                <div className="md:col-span-3 relative" ref={gpuBoxRef}>
                  <label htmlFor="gpu-filter" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    GPU Architecture
                  </label>
                  <div className="relative">
                    <Cpu className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                    <input
                      id="gpu-filter"
                      type="text"
                      placeholder="e.g. Adreno 750, Mali..."
                      value={gpuFilter}
                      onChange={(e) => setGpuFilter(e.target.value)}
                      onFocus={() => setShowGpuSuggestions(true)}
                      className="w-full pl-9 pr-8 py-2.5 bg-gray-900 border border-gray-700 rounded-xl focus:outline-none focus:border-cyan-500 text-gray-100 placeholder-gray-500 text-sm transition"
                    />
                    {gpuFilter && (
                      <button
                        onClick={() => setGpuFilter('')}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {showGpuSuggestions && gpuSuggestions.length > 0 && (
                    <div className="absolute z-30 w-full mt-1.5 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto divide-y divide-gray-800">
                      {gpuSuggestions
                        .filter((g) => g.toLowerCase().includes(gpuFilter.toLowerCase()))
                        .slice(0, 10)
                        .map((gpu) => (
                          <button
                            key={gpu}
                            onClick={() => {
                              setGpuFilter(gpu);
                              setShowGpuSuggestions(false);
                            }}
                            className="w-full text-left px-3.5 py-2 text-xs hover:bg-gray-800 text-gray-200 hover:text-cyan-400 transition"
                          >
                            {gpu}
                          </button>
                        ))}
                    </div>
                  )}
                </div>

                {/* Minimum Rating Filter */}
                <div className="md:col-span-3">
                  <label htmlFor="rating-filter" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Minimum Rating
                  </label>
                  <div className="relative">
                    <select
                      id="rating-filter"
                      value={ratingMin ?? ''}
                      onChange={(e) => setRatingMin(e.target.value ? Number(e.target.value) : null)}
                      className="w-full py-2.5 px-3 bg-gray-900 border border-gray-700 rounded-xl focus:outline-none focus:border-cyan-500 text-gray-100 text-sm appearance-none transition"
                    >
                      <option value="">Any Rating</option>
                      <option value="5">⭐⭐⭐⭐⭐ (5 Stars)</option>
                      <option value="4">⭐⭐⭐⭐ & above (4+ Stars)</option>
                      <option value="3">⭐⭐⭐ & above (3+ Stars)</option>
                      <option value="2">⭐⭐ & above (2+ Stars)</option>
                      <option value="1">⭐ & above (1+ Star)</option>
                    </select>
                    <div className="pointer-events-none absolute right-3 top-3 text-gray-400 text-xs">
                      ▼
                    </div>
                  </div>
                </div>
              </div>

              {/* Sub-bar: Sort & Results Count */}
              <div className="flex flex-col sm:flex-row justify-between items-center pt-3 border-t border-gray-800/80 gap-3 text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  {selectedGame ? (
                    <span>
                      Showing results for <strong className="text-cyan-400">{selectedGame.name}</strong>
                      {totalCount > 0 && ` (${totalCount} configurations found)`}
                    </span>
                  ) : (
                    <span className="text-yellow-400/90 flex items-center gap-1.5">
                      <Sliders className="h-3.5 w-3.5" />
                      Select a game above to browse community configurations.
                    </span>
                  )}
                </div>

                {/* Sort Dropdown */}
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-3.5 w-3.5 text-gray-500" />
                  <span>Sort by:</span>
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value as SortOption)}
                    disabled={!selectedGame}
                    className="bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1 text-gray-200 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="rating_desc">Highest Rating</option>
                    <option value="rating_asc">Lowest Rating</option>
                    <option value="fps_desc">Highest FPS</option>
                    <option value="fps_asc">Lowest FPS</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Loading Spinner */}
            {isLoadingRuns && (
              <div className="py-20 flex flex-col items-center justify-center space-y-3">
                <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-400 text-sm animate-pulse">Fetching configurations from api.gamenative.app...</p>
              </div>
            )}

            {/* Error Banner */}
            {errorMessage && !isLoadingRuns && (
              <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-xl text-red-200 text-sm flex items-center justify-between">
                <span>{errorMessage}</span>
                <button
                  onClick={() => fetchRuns()}
                  className="px-3 py-1 bg-red-900/60 hover:bg-red-800 rounded text-xs transition"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Empty State / Initial Prompt */}
            {!selectedGame && !isLoadingRuns && (
              <div className="text-center py-20 bg-gray-800/20 border border-dashed border-gray-800 rounded-2xl p-8">
                <div className="w-16 h-16 bg-cyan-950/40 border border-cyan-700/30 rounded-2xl mx-auto flex items-center justify-center text-3xl mb-4">
                  🎮
                </div>
                <h2 className="text-lg font-bold text-gray-200 mb-2">Search for a Game</h2>
                <p className="text-gray-400 text-sm max-w-md mx-auto">
                  Type any game title in the search box above to browse and download tested community configurations directly from the live GameNative database.
                </p>
              </div>
            )}

            {/* Zero Results State */}
            {selectedGame && !isLoadingRuns && runs.length === 0 && !errorMessage && (
              <div className="text-center py-16 bg-gray-800/30 rounded-2xl border border-gray-800 p-8">
                <div className="text-3xl mb-3">🔍</div>
                <h2 className="text-lg font-semibold text-gray-200">No Configurations Found</h2>
                <p className="text-gray-400 text-sm max-w-sm mx-auto mt-1">
                  No reports match your current filters for <strong>{selectedGame.name}</strong>. Try clearing GPU or Rating filters.
                </p>
              </div>
            )}

            {/* Configurations Grid */}
            {!isLoadingRuns && runs.length > 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {runs.map((run) => {
                    const isSaved = savedRunIds.has(run.id);
                    const isDownloaded = downloadedRunId === run.id;
                    const isCopied = copiedCardRunId === run.id;

                    return (
                      <div
                        key={run.id}
                        className="bg-gray-800/40 hover:bg-gray-800/70 border border-gray-700/80 hover:border-cyan-500/50 rounded-2xl p-5 flex flex-col justify-between transition-all shadow-lg hover:shadow-cyan-500/5 group relative"
                      >
                        <div className="space-y-3">
                          {/* Header Row: Rating, FPS & Favorite Star */}
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex items-center gap-1.5">
                              <div className="flex text-amber-400">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${
                                      i < run.rating ? 'fill-amber-400' : 'text-gray-600'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-xs font-bold text-amber-400/90 ml-1">
                                {run.rating}/5
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {run.avgFps != null && (
                                <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-800/40 text-cyan-300 font-mono text-xs font-semibold">
                                  <Zap className="h-3 w-3" />
                                  <span>{run.avgFps} FPS</span>
                                </div>
                              )}

                              {/* Favorite Star Button */}
                              <button
                                data-testid="favorite-card-button"
                                onClick={() => handleToggleFavorite(run)}
                                title={isSaved ? 'Remove from saved configs' : 'Save configuration'}
                                className={`p-1.5 rounded-lg transition ${
                                  isSaved
                                    ? 'text-amber-400 hover:text-amber-300 bg-amber-950/40'
                                    : 'text-gray-500 hover:text-amber-400 hover:bg-gray-800'
                                }`}
                              >
                                <Star className={`h-4 w-4 ${isSaved ? 'fill-amber-400' : ''}`} />
                              </button>
                            </div>
                          </div>

                          {/* Device & Hardware Specs */}
                          <div className="space-y-1.5 pt-1">
                            <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-200 truncate">
                              <Smartphone className="h-4 w-4 text-cyan-400 shrink-0" />
                              <span className="truncate">{run.device?.model || 'Generic Device'}</span>
                            </div>

                            <div className="text-xs text-gray-400 flex flex-wrap gap-2">
                              {run.device?.gpu && (
                                <span className="bg-gray-900/80 px-2 py-0.5 rounded border border-gray-800 font-mono">
                                  {run.device.gpu}
                                </span>
                              )}
                              {run.device?.androidVer && (
                                <span className="bg-gray-900/80 px-2 py-0.5 rounded border border-gray-800">
                                  Android {run.device.androidVer}
                                </span>
                              )}
                              {run.appVersion && (
                                <span className="bg-gray-900/80 px-2 py-0.5 rounded border border-gray-800">
                                  v{run.appVersion}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Tags */}
                          {run.tags && run.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {run.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-teal-950/40 text-teal-300 border border-teal-800/30"
                                >
                                  {tag.replace(/_/g, ' ')}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Notes */}
                          {run.notes && (
                            <p className="text-xs text-gray-400 bg-gray-900/50 p-2.5 rounded-xl border border-gray-800/80 line-clamp-3 italic">
                              "{run.notes}"
                            </p>
                          )}

                          {/* Config Preview Chips */}
                          {run.configs && (
                            <div className="text-[11px] font-mono grid grid-cols-2 gap-1.5 pt-1 bg-gray-900/40 p-2 rounded-xl border border-gray-800/60">
                              {run.configs.emulator && (
                                <div className="truncate text-gray-300">
                                  <span className="text-gray-500">Emu: </span>
                                  {run.configs.emulator}
                                </div>
                              )}
                              {run.configs.wineVersion && (
                                <div className="truncate text-gray-300">
                                  <span className="text-gray-500">Wine: </span>
                                  {run.configs.wineVersion}
                                </div>
                              )}
                              {run.configs.dxwrapper && (
                                <div className="truncate text-gray-300">
                                  <span className="text-gray-500">DX: </span>
                                  {run.configs.dxwrapper}
                                </div>
                              )}
                              {run.configs.screenSize && (
                                <div className="truncate text-gray-300">
                                  <span className="text-gray-500">Res: </span>
                                  {run.configs.screenSize}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Actions Row */}
                        <div className="pt-4 mt-3 border-t border-gray-800/80 flex items-center justify-between gap-1.5">
                          <button
                            onClick={() => setActiveModalRun(run)}
                            className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium rounded-lg transition flex items-center gap-1 border border-gray-700"
                          >
                            <Eye className="h-3.5 w-3.5 text-cyan-400" />
                            View
                          </button>

                          <div className="flex items-center gap-1.5">
                            {/* Copy direct link button */}
                            <button
                              data-testid="share-card-button"
                              onClick={() => handleCopyCardLink(run, selectedGame?.name)}
                              title={isCopied ? 'Link copied successfully!' : 'Copy direct link to this config'}
                              className={`p-1.5 rounded-lg border transition ${
                                isCopied
                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-600/30'
                                  : 'bg-gray-800 hover:bg-cyan-950/80 text-gray-300 hover:text-cyan-400 border-gray-700'
                              }`}
                            >
                              {isCopied ? <Check className="h-4 w-4 text-white" /> : <Copy className="h-4 w-4" />}
                            </button>

                            {/* Send to Phone QR button */}
                            <button
                              data-testid="qr-button"
                              onClick={() => setPhoneModalRun({ run, gameName: selectedGame?.name })}
                              title="Send to Android Phone via QR Code"
                              className="p-1.5 bg-gray-800 hover:bg-cyan-950/80 text-gray-300 hover:text-cyan-400 border border-gray-700 hover:border-cyan-700/60 rounded-lg transition"
                            >
                              <QrCode className="h-4 w-4" />
                            </button>

                            {/* Edit in Visual Editor */}
                            <button
                              onClick={() => handleLoadInEditor(run)}
                              title="Load into visual Config Editor"
                              className="px-2.5 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/50 text-cyan-300 text-xs font-semibold rounded-lg transition flex items-center gap-1"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Edit
                            </button>

                            {/* Download JSON Button */}
                            <button
                              data-testid="download-card-button"
                              onClick={() => handleDownloadCard(run, selectedGame?.name)}
                              title={isDownloaded ? 'Downloaded successfully!' : 'Download Android GameNative config.json'}
                              className={`p-1.5 rounded-lg border transition ${
                                isDownloaded
                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-600/30'
                                  : 'bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/50 text-emerald-300'
                              }`}
                            >
                              {isDownloaded ? <Check className="h-4 w-4 text-white" /> : <Download className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-6 border-t border-gray-800 text-sm text-gray-400">
                    <div>
                      Page <span className="font-semibold text-gray-200">{currentPage}</span> of{' '}
                      <span className="font-semibold text-gray-200">{totalPages}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg border border-gray-700 flex items-center gap-1 text-xs"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </button>

                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                        className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg border border-gray-700 flex items-center gap-1 text-xs"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* VIEW 2: SAVED FAVORITES (OFFLINE & PERSISTED)                  */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'favorites' && (
          <div className="space-y-6">
            {/* Favorites Control Bar */}
            <div className="bg-gray-800/60 backdrop-blur-md p-5 rounded-2xl border border-gray-700 shadow-xl flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter saved configurations..."
                  value={savedSearchQuery}
                  onChange={(e) => setSavedSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-xl focus:outline-none focus:border-cyan-500 text-gray-100 text-xs transition"
                />
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                <span className="text-xs text-gray-400">
                  {filteredSavedConfigs.length} saved configuration{filteredSavedConfigs.length !== 1 ? 's' : ''}
                </span>

                {savedConfigs.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm('Clear all saved configurations from local storage?')) {
                        clearAllSavedConfigs();
                        showToast('All saved configurations have been cleared.', 'info');
                      }
                    }}
                    className="text-xs px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 rounded-lg transition flex items-center gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Empty Favorites State */}
            {savedConfigs.length === 0 && (
              <div className="text-center py-20 bg-gray-800/20 border border-dashed border-gray-800 rounded-2xl p-8 space-y-4">
                <div className="w-16 h-16 bg-amber-950/40 border border-amber-700/30 rounded-2xl mx-auto flex items-center justify-center text-3xl">
                  ⭐
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-200">No Saved Configurations Yet</h2>
                  <p className="text-gray-400 text-sm max-w-md mx-auto mt-1">
                    When browsing live configs, click the star (★) button on any card to bookmark it here for instant offline access and phone transfer.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('search')}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl transition"
                >
                  Browse Community Configs
                </button>
              </div>
            )}

            {/* Saved Configurations Grid */}
            {filteredSavedConfigs.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSavedConfigs.map((item) => {
                  const run = item.run;
                  const isDownloaded = downloadedRunId === run.id;
                  const isCopied = copiedCardRunId === run.id;

                  return (
                    <div
                      key={item.runId}
                      className="bg-gray-800/50 hover:bg-gray-800/80 border border-gray-700 rounded-2xl p-5 flex flex-col justify-between transition-all shadow-lg hover:shadow-cyan-500/5 relative"
                    >
                      <div className="space-y-3">
                        {/* Game Title & Star */}
                        <div className="flex justify-between items-start gap-2 border-b border-gray-800/80 pb-2.5">
                          <div>
                            <h3 className="text-sm font-bold text-cyan-400 truncate max-w-[200px]">
                              {item.gameName}
                            </h3>
                            <span className="text-[10px] text-gray-500 font-mono">
                              Saved {new Date(item.savedAt).toLocaleDateString()}
                            </span>
                          </div>

                          <button
                            onClick={() => handleToggleFavorite(run, item.gameName)}
                            title="Remove from saved configs"
                            className="p-1 text-amber-400 hover:text-red-400 transition"
                          >
                            <Star className="h-4 w-4 fill-amber-400" />
                          </button>
                        </div>

                        {/* Rating & FPS */}
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-1 text-amber-400">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3.5 w-3.5 ${
                                  i < run.rating ? 'fill-amber-400' : 'text-gray-600'
                                }`}
                              />
                            ))}
                            <span className="font-bold ml-1">{run.rating}/5</span>
                          </div>

                          {run.avgFps != null && (
                            <span className="bg-cyan-950/60 border border-cyan-800/40 text-cyan-300 px-2 py-0.5 rounded-full font-mono text-[11px] font-semibold flex items-center gap-1">
                              <Zap className="h-3 w-3" />
                              {run.avgFps} FPS
                            </span>
                          )}
                        </div>

                        {/* Device Info */}
                        <div className="text-xs text-gray-300 flex items-center gap-1.5 truncate">
                          <Smartphone className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                          <span className="truncate">{run.device?.model || 'Generic Device'}</span>
                          {run.device?.gpu && (
                            <span className="text-[10px] bg-gray-900 px-1.5 py-0.5 rounded text-gray-400 font-mono">
                              {run.device.gpu}
                            </span>
                          )}
                        </div>

                        {/* Config Chips */}
                        {run.configs && (
                          <div className="text-[11px] font-mono grid grid-cols-2 gap-1.5 bg-gray-900/60 p-2 rounded-xl border border-gray-800">
                            {run.configs.emulator && (
                              <div className="truncate text-gray-300">
                                <span className="text-gray-500">Emu: </span>
                                {run.configs.emulator}
                              </div>
                            )}
                            {run.configs.wineVersion && (
                              <div className="truncate text-gray-300">
                                <span className="text-gray-500">Wine: </span>
                                {run.configs.wineVersion}
                              </div>
                            )}
                            {run.configs.dxwrapper && (
                              <div className="truncate text-gray-300">
                                <span className="text-gray-500">DX: </span>
                                {run.configs.dxwrapper}
                              </div>
                            )}
                            {run.configs.screenSize && (
                              <div className="truncate text-gray-300">
                                <span className="text-gray-500">Res: </span>
                                {run.configs.screenSize}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="pt-3 mt-3 border-t border-gray-800 flex items-center justify-between gap-1.5">
                        <button
                          onClick={() => setActiveModalRun(run)}
                          className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium rounded-lg transition flex items-center gap-1 border border-gray-700"
                        >
                          <Eye className="h-3.5 w-3.5 text-cyan-400" />
                          View
                        </button>

                        <div className="flex items-center gap-1.5">
                          {/* Copy Link Button */}
                          <button
                            onClick={() => handleCopyCardLink(run, item.gameName)}
                            title={isCopied ? 'Link copied successfully!' : 'Copy direct link to this config'}
                            className={`p-1.5 rounded-lg border transition ${
                              isCopied
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-600/30'
                                : 'bg-gray-800 hover:bg-cyan-950/80 text-gray-300 hover:text-cyan-400 border-gray-700'
                            }`}
                          >
                            {isCopied ? <Check className="h-4 w-4 text-white" /> : <Copy className="h-4 w-4" />}
                          </button>

                          {/* Send to Phone QR */}
                          <button
                            onClick={() => setPhoneModalRun({ run, gameName: item.gameName })}
                            title="Send to Phone via QR Code"
                            className="p-1.5 bg-gray-800 hover:bg-cyan-950/80 text-gray-300 hover:text-cyan-400 border border-gray-700 rounded-lg transition"
                          >
                            <QrCode className="h-4 w-4" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleLoadInEditor(run, item.gameName)}
                            title="Load in visual Config Editor"
                            className="px-2.5 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/50 text-cyan-300 text-xs font-semibold rounded-lg transition flex items-center gap-1"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Edit
                          </button>

                          {/* Download */}
                          <button
                            onClick={() => handleDownloadCard(run, item.gameName)}
                            title={isDownloaded ? 'Downloaded successfully!' : 'Download JSON'}
                            className={`p-1.5 rounded-lg border transition ${
                              isDownloaded
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-600/30'
                                : 'bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/50 text-emerald-300'
                            }`}
                          >
                            {isDownloaded ? <Check className="h-4 w-4 text-white" /> : <Download className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL 1: CONFIG DETAILS INSPECTION                             */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeModalRun && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                  <Layers className="h-5 w-5 text-cyan-400" />
                  Configuration Details
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {selectedGame?.name || activeModalRun.game?.name || `Run #${activeModalRun.id}`} • {activeModalRun.device?.model}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleFavorite(activeModalRun, selectedGame?.name)}
                  title={savedRunIds.has(activeModalRun.id) ? 'Remove from favorites' : 'Save to favorites'}
                  className={`p-1.5 rounded-lg border transition ${
                    savedRunIds.has(activeModalRun.id)
                      ? 'border-amber-700/60 bg-amber-950/40 text-amber-400'
                      : 'border-gray-700 text-gray-400 hover:text-amber-400'
                  }`}
                >
                  <Star className={`h-4 w-4 ${savedRunIds.has(activeModalRun.id) ? 'fill-amber-400' : ''}`} />
                </button>

                <button
                  onClick={() => setActiveModalRun(null)}
                  className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs font-mono text-gray-300">
              {/* Essential Fields */}
              <div className="grid grid-cols-2 gap-3 bg-gray-950 p-3 rounded-xl border border-gray-800">
                <div>
                  <span className="text-gray-500 uppercase text-[10px]">Emulator:</span>
                  <div className="text-gray-200 font-semibold">{activeModalRun.configs?.emulator || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-gray-500 uppercase text-[10px]">Wine Version:</span>
                  <div className="text-gray-200 font-semibold">{activeModalRun.configs?.wineVersion || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-gray-500 uppercase text-[10px]">DirectX Wrapper:</span>
                  <div className="text-gray-200 font-semibold">{activeModalRun.configs?.dxwrapper || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-gray-500 uppercase text-[10px]">Screen Size:</span>
                  <div className="text-gray-200 font-semibold">{activeModalRun.configs?.screenSize || 'N/A'}</div>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500 uppercase text-[10px]">CPU Affinity List:</span>
                  <div className="text-gray-200">{activeModalRun.configs?.cpuList || 'N/A'}</div>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500 uppercase text-[10px]">Environment Variables:</span>
                  <div className="text-gray-200 break-all">{activeModalRun.configs?.envVars || 'None'}</div>
                </div>
              </div>

              {/* ExtraData JSON */}
              {activeModalRun.configs?.extraData && (
                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    Extra Data Settings
                  </div>
                  <pre className="bg-gray-950 p-3 rounded-xl border border-gray-800 overflow-x-auto text-[11px] text-teal-300">
                    {JSON.stringify(activeModalRun.configs.extraData, null, 2)}
                  </pre>
                </div>
              )}

              {/* Full Raw JSON */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Full JSON Payload
                  </span>
                  <button
                    onClick={() => handleCopyRaw(activeModalRun.configs)}
                    className={`text-[11px] font-sans px-3 py-1 rounded-lg border transition flex items-center gap-1.5 font-semibold ${
                      modalCopiedRaw
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-600/30'
                        : 'bg-gray-800 hover:bg-gray-700 text-cyan-400 border-gray-700'
                    }`}
                  >
                    {modalCopiedRaw ? <Check className="h-3.5 w-3.5 text-white" /> : <Copy className="h-3.5 w-3.5" />}
                    {modalCopiedRaw ? 'Copied successfully!' : 'Copy Raw JSON'}
                  </button>
                </div>
                <pre className="bg-gray-950 p-3 rounded-xl border border-gray-800 overflow-x-auto text-[11px] text-gray-300 max-h-48">
                  {JSON.stringify(activeModalRun.configs, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-800 bg-gray-900/50 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPhoneModalRun({ run: activeModalRun, gameName: selectedGame?.name })}
                  className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-cyan-300 border border-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  Send to Phone
                </button>

                <button
                  onClick={() => handleModalCopyLink(activeModalRun, selectedGame?.name)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition ${
                    modalCopiedLink
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-600/30'
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700'
                  }`}
                >
                  {modalCopiedLink ? <Check className="h-3.5 w-3.5 text-white" /> : <Copy className="h-3.5 w-3.5" />}
                  {modalCopiedLink ? 'Copied successfully!' : 'Copy Link'}
                </button>

                <button
                  onClick={() => setActiveModalRun(null)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold transition"
                >
                  Close
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleLoadInEditor(activeModalRun);
                    setActiveModalRun(null);
                  }}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Load in Config Editor
                </button>

                <button
                  onClick={() => handleModalDownload(activeModalRun, selectedGame?.name)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition ${
                    modalDownloaded
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-600/30'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
                  }`}
                >
                  {modalDownloaded ? <Check className="h-3.5 w-3.5 text-white" /> : <Download className="h-3.5 w-3.5" />}
                  {modalDownloaded ? 'Downloaded successfully!' : 'Download JSON'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL 2: SEND TO PHONE VIA QR CODE & WEB SHARE                 */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <SendToPhoneModal
        isOpen={Boolean(phoneModalRun)}
        onClose={() => setPhoneModalRun(null)}
        run={phoneModalRun?.run || null}
        gameName={phoneModalRun?.gameName || selectedGame?.name}
        onToast={showToast}
      />

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* FLOATING TOAST NOTIFICATION CONTAINER                          */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}