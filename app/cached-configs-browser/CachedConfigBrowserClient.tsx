'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, Star, Zap, ChevronLeft, ChevronRight, Cpu, Filter, Download, X, ChevronDown, Smartphone } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { fetchAllConfigs, fetchFilterSnapshot } from '@/lib/sqliteHelper';
import { APP_CONFIG } from '@/lib/appConfig';

// --- Types ---

interface GameConfig {
  id: number;
  rating: number;
  avg_fps: number;
  notes: string | null;
  configs: any;
  created_at: string;
  app_version: string | null;
  tags: any[] | null;
  session_length_sec: number | null;
  configs_id: number | null;
  configs_executablePath: string | null;
  game: {
    id: number;
    name: string;
  } | null;
  device: {
    id: number;
    model: string;
    gpu: string;
    android_ver: string;
  } | null;
}

interface GameSuggestion {
  id: number;
  name: string;
}

interface GpuSuggestion {
  gpu: string;
}

interface DeviceSuggestion {
  name: string;
  model: string;
}

interface FilterSnapshot {
  games: GameSuggestion[];
  gpus: string[];
  devices: DeviceSuggestion[];
  updatedAt: string;
}

type SortOption = 'newest' | 'oldest' | 'rating_desc' | 'rating_asc' | 'fps_desc' | 'fps_asc';

// --- Constants ---

const ITEMS_PER_PAGE = 15;
const SUGGESTION_DEBOUNCE_MS = 250;
const SUGGESTION_LIMIT = 15;

// --- Helper Hook: useDebounce ---
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function CachedConfigBrowserClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  // --- State ---
  const [allConfigs, setAllConfigs] = useState<GameConfig[]>([]);
  const [filteredConfigs, setFilteredConfigs] = useState<GameConfig[]>([]);
  const [displayConfigs, setDisplayConfigs] = useState<GameConfig[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Filters - initialize from URL searchParams
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedGame, setSelectedGame] = useState<GameSuggestion | null>(null);
  const [gpuFilter, setGpuFilter] = useState(searchParams.get('gpu') || '');
  const [selectedGpu, setSelectedGpu] = useState<GpuSuggestion | null>(null);
  const [deviceFilter, setDeviceFilter] = useState(searchParams.get('device') || '');
  const [selectedDevice, setSelectedDevice] = useState<DeviceSuggestion | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  
  // Search trigger state
  const [searchTrigger, setSearchTrigger] = useState(0);
  
  // Committed filter values
  const [committedSearchTerm, setCommittedSearchTerm] = useState(searchParams.get('search') || '');
  const [committedSelectedGame, setCommittedSelectedGame] = useState<GameSuggestion | null>(null);
  const [committedGpuFilter, setCommittedGpuFilter] = useState(searchParams.get('gpu') || '');
  const [committedSelectedGpu, setCommittedSelectedGpu] = useState<GpuSuggestion | null>(null);
  const [committedDeviceFilter, setCommittedDeviceFilter] = useState(searchParams.get('device') || '');
  const [committedSelectedDevice, setCommittedSelectedDevice] = useState<DeviceSuggestion | null>(null);
  
  // Static Filter Snapshot
  const [snapshot, setSnapshot] = useState<FilterSnapshot>({ games: [], gpus: [], devices: [], updatedAt: '' });
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [filtersError, setFiltersError] = useState<string | null>(null);
  
  // Autocomplete State
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  // GPU Autocomplete State
  const [showGpuSuggestions, setShowGpuSuggestions] = useState(false);
  const gpuWrapperRef = useRef<HTMLDivElement>(null);
  
  // Device Autocomplete State
  const [showDeviceSuggestions, setShowDeviceSuggestions] = useState(false);
  const deviceWrapperRef = useRef<HTMLDivElement>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [goToPage, setGoToPage] = useState('');
  
  // Expanded notes state
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());

  // Fast debounce for showing filter suggestions
  const debouncedSearchTermFast = useDebounce(searchTerm, SUGGESTION_DEBOUNCE_MS);
  const debouncedGpuFast = useDebounce(gpuFilter, SUGGESTION_DEBOUNCE_MS);
  const debouncedDeviceFast = useDebounce(deviceFilter, SUGGESTION_DEBOUNCE_MS);

  // --- Load Cached Configs from SQLite ---
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || APP_CONFIG.BASE_PATH;
    
    fetchAllConfigs(basePath)
      .then(data => {
        if (!cancelled) {
          setAllConfigs(data);
          setLoadError(null);
        }
      })
      .catch(error => {
        if (!cancelled) {
          console.error('Error loading cached configs from SQLite:', error);
          setLoadError('Failed to load cached configurations from database');
          setAllConfigs([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    
    return () => {
      cancelled = true;
    };
  }, []);

  // --- Load Static Filter Data from SQLite ---
  useEffect(() => {
    let cancelled = false;
    setFiltersLoading(true);
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || APP_CONFIG.BASE_PATH;
    
    fetchFilterSnapshot(basePath)
      .then(data => {
        if (!cancelled) {
          setSnapshot(data);
          setFiltersError(null);
        }
      })
      .catch(error => {
        if (!cancelled) {
          console.error('Error loading filters from SQLite:', error);
          setFiltersError('Failed to load search filters from database');
          setSnapshot({ games: [], gpus: [], devices: [], updatedAt: '' });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setFiltersLoading(false);
        }
      });
    
    return () => {
      cancelled = true;
    };
  }, []);

  // --- Local Search with useMemo ---
  const gameSuggestions = useMemo(() => {
    if (debouncedSearchTermFast.length < 2 || selectedGame) return [];
    const searchTerm = debouncedSearchTermFast.toLowerCase();
    return snapshot.games
      .filter(g => {
        const name = g.name.toLowerCase();
        const cleanName = name.replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
        const cleanSearch = searchTerm.replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
        
        const searchWords = cleanSearch.split(' ');
        const nameWords = cleanName.split(' ');
        const allWordsMatch = searchWords.every(searchWord => 
          nameWords.some(nameWord => nameWord.includes(searchWord))
        );
        
        return cleanName.includes(cleanSearch) || name.includes(searchTerm) || allWordsMatch;
      })
      .slice(0, SUGGESTION_LIMIT);
  }, [debouncedSearchTermFast, selectedGame, snapshot.games]);

  const gpuSuggestions = useMemo(() => {
    if (debouncedGpuFast.length < 2 || selectedGpu) return [];
    const searchTerm = debouncedGpuFast.toLowerCase();
    return snapshot.gpus
      .filter(gpu => {
        const name = gpu.toLowerCase();
        const cleanName = name.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
        const cleanSearch = searchTerm.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
        
        const searchWords = cleanSearch.split(' ');
        const nameWords = cleanName.split(' ');
        const allWordsMatch = searchWords.every(searchWord => 
          nameWords.some(nameWord => nameWord.includes(searchWord))
        );
        
        return cleanName.includes(cleanSearch) || name.includes(searchTerm) || allWordsMatch;
      })
      .slice(0, SUGGESTION_LIMIT)
      .map(gpu => ({ gpu }));
  }, [debouncedGpuFast, selectedGpu, snapshot.gpus]);

  const deviceSuggestions = useMemo(() => {
    if (debouncedDeviceFast.length < 2 || selectedDevice) return [];
    const searchTerm = debouncedDeviceFast.toLowerCase();
    return snapshot.devices
      .filter(device => {
        const deviceName = device.name.toLowerCase();
        const deviceModel = device.model.toLowerCase();
        
        const cleanDeviceName = deviceName.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
        const cleanDeviceModel = deviceModel.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
        const cleanSearch = searchTerm.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
        
        const searchWords = cleanSearch.split(' ');
        const allWordsMatchName = searchWords.every(searchWord => {
          const regex = new RegExp(`\\b${searchWord}`, 'i');
          return regex.test(cleanDeviceName);
        });
        const allWordsMatchModel = searchWords.every(searchWord => {
          const regex = new RegExp(`\\b${searchWord}`, 'i');
          return regex.test(cleanDeviceModel);
        });
        
        return deviceName.includes(searchTerm) ||
               deviceModel.includes(searchTerm) ||
               cleanDeviceName.includes(cleanSearch) ||
               cleanDeviceModel.includes(cleanSearch) ||
               allWordsMatchName ||
               allWordsMatchModel;
      })
      .slice(0, SUGGESTION_LIMIT);
  }, [debouncedDeviceFast, selectedDevice, snapshot.devices]);

  // --- Show/Hide Suggestions Based on Results ---
  useEffect(() => {
    setShowSuggestions(gameSuggestions.length > 0 && debouncedSearchTermFast.length >= 2 && !selectedGame);
  }, [gameSuggestions.length, debouncedSearchTermFast.length, selectedGame]);

  useEffect(() => {
    setShowGpuSuggestions(gpuSuggestions.length > 0 && debouncedGpuFast.length >= 2 && !selectedGpu);
  }, [gpuSuggestions.length, debouncedGpuFast.length, selectedGpu]);

  useEffect(() => {
    setShowDeviceSuggestions(deviceSuggestions.length > 0 && debouncedDeviceFast.length >= 2 && !selectedDevice);
  }, [deviceSuggestions.length, debouncedDeviceFast.length, selectedDevice]);

  // Handle clicking outside autocomplete
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
      if (gpuWrapperRef.current && !gpuWrapperRef.current.contains(event.target as Node)) {
        setShowGpuSuggestions(false);
      }
      if (deviceWrapperRef.current && !deviceWrapperRef.current.contains(event.target as Node)) {
        setShowDeviceSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- Filter and Sort Configs ---
  const filterAndSortConfigs = useCallback(() => {
    let filtered = [...allConfigs];

    // Filter by Game
    if (committedSelectedGame) {
      filtered = filtered.filter(c => c.game?.name === committedSelectedGame.name);
    } else if (committedSearchTerm) {
      filtered = filtered.filter(c => 
        c.game?.name.toLowerCase().includes(committedSearchTerm.toLowerCase())
      );
    }

    // Filter by GPU
    if (committedSelectedGpu) {
      filtered = filtered.filter(c => c.device?.gpu === committedSelectedGpu.gpu);
    } else if (committedGpuFilter) {
      filtered = filtered.filter(c => 
        c.device?.gpu.toLowerCase().includes(committedGpuFilter.toLowerCase())
      );
    }

    // Filter by Device
    if (committedSelectedDevice) {
      filtered = filtered.filter(c => c.device?.model === committedSelectedDevice.model);
    } else if (committedDeviceFilter) {
      filtered = filtered.filter(c => 
        c.device?.model.toLowerCase().includes(committedDeviceFilter.toLowerCase())
      );
    }

    // Apply sorting
    switch (sortOption) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'rating_desc':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0) || (b.avg_fps || 0) - (a.avg_fps || 0));
        break;
      case 'rating_asc':
        filtered.sort((a, b) => (a.rating || 0) - (b.rating || 0) || (a.avg_fps || 0) - (b.avg_fps || 0));
        break;
      case 'fps_desc':
        filtered.sort((a, b) => (b.avg_fps || 0) - (a.avg_fps || 0) || (b.rating || 0) - (a.rating || 0));
        break;
      case 'fps_asc':
        filtered.sort((a, b) => (a.avg_fps || 0) - (b.avg_fps || 0) || (b.rating || 0) - (a.rating || 0));
        break;
    }

    setFilteredConfigs(filtered);
    setTotalCount(filtered.length);
  }, [allConfigs, committedSearchTerm, committedGpuFilter, committedDeviceFilter, committedSelectedGame, committedSelectedGpu, committedSelectedDevice, sortOption]);

  // Apply filters and sorting when dependencies change
  useEffect(() => {
    filterAndSortConfigs();
    setCurrentPage(1);
  }, [filterAndSortConfigs, searchTrigger, sortOption]);

  // Update display configs based on pagination
  useEffect(() => {
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE;
    setDisplayConfigs(filteredConfigs.slice(from, to));
  }, [filteredConfigs, currentPage]);

  // Update URL Params
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (committedSearchTerm) params.set('search', committedSearchTerm);
    else params.delete('search');
    
    if (committedGpuFilter) params.set('gpu', committedGpuFilter);
    else params.delete('gpu');

    if (committedDeviceFilter) params.set('device', committedDeviceFilter);
    else params.delete('device');

    const newUrl = `${pathname}?${params.toString()}`;
    router.replace(newUrl, { scroll: false });
  }, [committedSearchTerm, committedGpuFilter, committedDeviceFilter, pathname, router, searchParams]);

  // --- Pagination Logic ---
  const totalPages = useMemo(() => {
    return Math.ceil(totalCount / ITEMS_PER_PAGE);
  }, [totalCount]);

  // Generate page numbers for pagination
  const getPageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | 'ellipsis')[] = [];
    
    pages.push(1, 2, 3);
    
    if (currentPage > 5) {
      pages.push('ellipsis');
    }
    
    const start = Math.max(4, currentPage - 1);
    const end = Math.min(totalPages - 3, currentPage + 1);
    
    for (let i = start; i <= end; i++) {
      if (!pages.includes(i)) {
        pages.push(i);
      }
    }
    
    if (currentPage < totalPages - 4) {
      pages.push('ellipsis');
    }
    
    const lastThree = [totalPages - 2, totalPages - 1, totalPages];
    lastThree.forEach(page => {
      if (page > 3 && !pages.includes(page)) {
        pages.push(page);
      }
    });
    
    return pages;
  }, [currentPage, totalPages]);

  // Scroll to top when changing pages
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  // --- Handlers ---

  const handleSearch = () => {
    setCommittedSearchTerm(searchTerm);
    setCommittedSelectedGame(selectedGame);
    setCommittedGpuFilter(gpuFilter);
    setCommittedSelectedGpu(selectedGpu);
    setCommittedDeviceFilter(deviceFilter);
    setCommittedSelectedDevice(selectedDevice);
    setSearchTrigger(prev => prev + 1);
  };

  const handleGameSelect = (game: GameSuggestion) => {
    setSearchTerm(game.name);
    setSelectedGame(game);
    setShowSuggestions(false);
  };

  const clearGameSearch = () => {
    setSearchTerm('');
    setSelectedGame(null);
  };

  const handleGpuSelect = (gpu: GpuSuggestion) => {
    setGpuFilter(gpu.gpu);
    setSelectedGpu(gpu);
    setShowGpuSuggestions(false);
  };

  const clearGpuSearch = () => {
    setGpuFilter('');
    setSelectedGpu(null);
  };

  const handleDeviceSelect = (device: DeviceSuggestion) => {
    setDeviceFilter(device.name);
    setSelectedDevice(device);
    setShowDeviceSuggestions(false);
  };

  const clearDeviceSearch = () => {
    setDeviceFilter('');
    setSelectedDevice(null);
  };

  const handleClearAllFilters = () => {
    clearGameSearch();
    clearGpuSearch();
    clearDeviceSearch();
    handleSearch();
  };

  const handleOpenInEditor = (config: GameConfig) => {
    const exportData = {
      version: 1,
      exportedFrom: "CachedBrowser",
      timestamp: Date.now(),
      containerName: config.game?.name || "Cached Config",
      config: config.configs
    };
    try {
      localStorage.setItem('pendingConfig', JSON.stringify(exportData));
      router.push('/config-editor');
    } catch (e) { console.error(e); }
  };

  const handleDownloadConfig = (config: GameConfig) => {
    const exportData = {
      version: 1,
      exportedFrom: "CachedBrowser",
      timestamp: Date.now(),
      containerName: config.game?.name || "Cached Config",
      config: config.configs
    };
    
    try {
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = `${(config.game?.name || 'config').replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.json`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error downloading config:', e);
    }
  };

  const handleGoToPage = () => {
    const pageNum = parseInt(goToPage);
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
      setGoToPage('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-slate-200 font-sans selection:bg-cyan-500/30">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        
        {/* --- Header Section --- */}
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent mb-4 tracking-tight leading-tight pb-1">
            Cached Configs
          </h1>
          <p className="text-slate-400 text-base md:text-lg max-w-2xl">
            Browse cached game configurations stored locally. These are pre-loaded configs available offline.
          </p>
        </div>

        {/* --- Control Bar (Search, Sort, Filter) --- */}
        <div className="relative md:sticky top-4 z-50 mb-8 bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4 shadow-2xl shadow-black/20">
          <div className="grid grid-cols-1 gap-4">
            
            {/* Filter Row */}
            <div className="grid grid-cols-1 md:grid-cols-14 gap-4">
              
              {/* 1. Game Autocomplete Search */}
              <div className="md:col-span-4 relative" ref={wrapperRef}>
                <div className="relative group">
                  <Search className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 text-slate-500 group-focus-within:text-cyan-400`} size={18} />
                  <input
                    type="text"
                    placeholder="Search game name..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      if (selectedGame) setSelectedGame(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch();
                        setShowSuggestions(false);
                      }
                    }}
                    onFocus={() => {
                      if (gameSuggestions.length > 0) setShowSuggestions(true);
                    }}
                    className="w-full pl-11 pr-10 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:bg-slate-800 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                  />
                  {searchTerm && (
                    <button onClick={clearGameSearch} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-700 rounded-full text-slate-500 hover:text-white transition-colors">
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Suggestions Dropdown */}
                {showSuggestions && gameSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50 max-h-80 overflow-y-auto">
                    <div className="text-xs font-semibold text-slate-500 px-4 py-2 bg-slate-800/80 sticky top-0">SUGGESTED GAMES</div>
                    {gameSuggestions.map((game) => (
                      <button
                        key={game.id}
                        onClick={() => handleGameSelect(game)}
                        className="w-full text-left px-4 py-3 hover:bg-cyan-900/20 text-slate-200 hover:text-cyan-400 transition-colors flex items-center justify-between group"
                      >
                        <span>{game.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. GPU Filter with Autocomplete */}
              <div className="md:col-span-3 relative" ref={gpuWrapperRef}>
                <div className="relative group">
                  <Cpu className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 text-slate-500 group-focus-within:text-purple-400`} size={18} />
                  <input
                    type="text"
                    placeholder="GPU (e.g. Adreno 740)"
                    value={gpuFilter}
                    onChange={(e) => {
                      setGpuFilter(e.target.value);
                      if (selectedGpu) setSelectedGpu(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch();
                        setShowGpuSuggestions(false);
                      }
                    }}
                    onFocus={() => {
                      if (gpuSuggestions.length > 0) setShowGpuSuggestions(true);
                    }}
                    className="w-full pl-11 pr-10 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 focus:bg-slate-800 focus:ring-1 focus:ring-purple-500/20 transition-all"
                  />
                  {gpuFilter && (
                    <button onClick={clearGpuSearch} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-700 rounded-full text-slate-500 hover:text-white transition-colors">
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* GPU Suggestions Dropdown */}
                {showGpuSuggestions && gpuSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-[99999] max-h-80 overflow-y-auto">
                    <div className="text-xs font-semibold text-slate-500 px-4 py-2 bg-slate-800/80 sticky top-0">SUGGESTED GPUs</div>
                    {gpuSuggestions.map((gpu, index) => (
                      <button
                        key={index}
                        onClick={() => handleGpuSelect(gpu)}
                        className="w-full text-left px-4 py-3 hover:bg-purple-900/20 text-slate-200 hover:text-purple-400 transition-colors flex items-center justify-between group"
                      >
                        <span>{gpu.gpu}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Device Filter with Autocomplete */}
              <div className="md:col-span-3 relative" ref={deviceWrapperRef}>
                <div className="relative group">
                  <Smartphone className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 text-slate-500 group-focus-within:text-green-400`} size={18} />
                  <input
                    type="text"
                    placeholder="Device (e.g. Pixel, Galaxy)"
                    value={deviceFilter}
                    onChange={(e) => {
                      setDeviceFilter(e.target.value);
                      if (selectedDevice) setSelectedDevice(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch();
                        setShowDeviceSuggestions(false);
                      }
                    }}
                    onFocus={() => {
                      if (deviceSuggestions.length > 0) setShowDeviceSuggestions(true);
                    }}
                    className="w-full pl-11 pr-10 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50 focus:bg-slate-800 focus:ring-1 focus:ring-green-500/20 transition-all"
                  />
                  {deviceFilter && (
                    <button onClick={clearDeviceSearch} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-700 rounded-full text-slate-500 hover:text-white transition-colors">
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Device Suggestions Dropdown */}
                {showDeviceSuggestions && deviceSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-[99999] max-h-80 overflow-y-auto">
                    <div className="text-xs font-semibold text-slate-500 px-4 py-2 bg-slate-800/80 sticky top-0">SUGGESTED DEVICES</div>
                    {deviceSuggestions.map((device, index) => (
                      <button
                        key={index}
                        onClick={() => handleDeviceSelect(device)}
                        className="w-full text-left px-4 py-3 hover:bg-green-900/20 text-slate-200 hover:text-green-400 transition-colors flex items-center justify-between group"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{device.name.replace(/[<>"'&]/g, '')}</span>
                          <span className="text-xs text-slate-500">{device.model.replace(/[<>"'&]/g, '')}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. Sort Dropdown */}
              <div className="md:col-span-3 relative">
                <div className="relative">
                  <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value as SortOption)}
                    className="w-full pl-11 pr-10 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white appearance-none cursor-pointer focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="rating_desc">Highest Rated</option>
                    <option value="rating_asc">Lowest Rated</option>
                    <option value="fps_desc">Highest FPS</option>
                    <option value="fps_asc">Lowest FPS</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
                </div>
              </div>

              {/* 5. Search Button */}
              <div className="md:col-span-1 flex items-center">
                <button
                  onClick={handleSearch}
                  className="w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-cyan-900/20 hover:shadow-cyan-500/30 active:scale-[0.98]"
                >
                  <Search size={18} />
                </button>
              </div>

            </div>

          </div>
        </div>

        {/* --- Content Area --- */}
        {filtersLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative w-16 h-16">
              <div className="absolute top-0 left-0 w-full h-full border-4 border-slate-700 rounded-full"></div>
              <div className="absolute top-0 left-0 w-full h-full border-4 border-t-cyan-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
            </div>
            <p className="mt-4 text-slate-400 animate-pulse">Loading search filters...</p>
          </div>
        ) : filtersError ? (
          <div className="text-center py-20 bg-red-900/20 rounded-2xl border border-red-700/50">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-800 mb-4">
              <X className="text-red-400" size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Error Loading Filters</h3>
            <p className="text-red-400 max-w-md mx-auto mb-4">{filtersError}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors font-medium"
            >
              Retry
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative w-16 h-16">
              <div className="absolute top-0 left-0 w-full h-full border-4 border-slate-700 rounded-full"></div>
              <div className="absolute top-0 left-0 w-full h-full border-4 border-t-cyan-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
            </div>
            <p className="mt-4 text-slate-400 animate-pulse">Loading cached configurations...</p>
          </div>
        ) : loadError ? (
          <div className="text-center py-20 bg-red-900/20 rounded-2xl border border-red-700/50">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-800 mb-4">
              <X className="text-red-400" size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Error Loading Configs</h3>
            <p className="text-red-400 max-w-md mx-auto mb-4">{loadError}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors font-medium"
            >
              Retry
            </button>
          </div>
        ) : displayConfigs.length === 0 && (!committedSearchTerm && !committedGpuFilter && !committedDeviceFilter && !committedSelectedGame && !committedSelectedGpu && !committedSelectedDevice) ? (
          <div className="text-center py-20 bg-slate-800/30 rounded-2xl border border-slate-700/50 border-dashed">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 mb-4">
              <Search className="text-slate-500" size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Start searching</h3>
            <p className="text-slate-400 max-w-md mx-auto">
              Enter a game name, GPU, or device and click the Search button to discover cached configurations.
            </p>
          </div>
        ) : displayConfigs.length === 0 ? (
          <div className="text-center py-20 bg-slate-800/30 rounded-2xl border border-slate-700/50 border-dashed">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 mb-4">
              <Search className="text-slate-500" size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No results found</h3>
            <p className="text-slate-400 max-w-md mx-auto">
              We couldn't find any cached configs matching your search. Try adjusting filters or searching for a different game.
            </p>
            <button 
              onClick={handleClearAllFilters}
              className="mt-6 px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <>
            {/* Results Count */}
            {(committedSearchTerm || committedGpuFilter || committedDeviceFilter || committedSelectedGame || committedSelectedGpu || committedSelectedDevice) && (
              <div className="flex items-center justify-between mb-4 text-sm px-1">
                <span className="text-slate-400">
                  Found <strong className="text-white">{totalCount}</strong> configurations
                </span>
                <span className="text-slate-500">
                  Page {currentPage} of {totalPages}
                </span>
              </div>
            )}

            {/* Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayConfigs.map((config) => {
                // Helper function to get display name
                const getDisplayName = () => {
                  const gameName = config.game?.name || 'Unknown Game';
                  if (gameName === 'Unknown Game' && config.configs_executablePath) {
                    // Extract filename from path
                    const pathParts = config.configs_executablePath.split(/[/\\]/);
                    return pathParts[pathParts.length - 1] || 'Unknown Game';
                  }
                  return gameName;
                };

                // Helper function to get display GPU
                const getDisplayGpu = () => {
                  const gpu = config.device?.gpu || 'Unknown';
                  if (gpu === 'Unknown' && config.configs_id) {
                    return `STEAM_${config.configs_id}`;
                  }
                  return gpu;
                };

                const displayName = getDisplayName();
                const displayGpu = getDisplayGpu();

                return (
                <div
                  key={config.id}
                  className="group relative bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden hover:bg-slate-800/60 hover:border-cyan-500/30 transition-all duration-300 shadow-lg hover:shadow-cyan-900/10 flex flex-col"
                >
                  {/* Card Header */}
                  <div className="p-5 pb-0">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-bold text-white truncate pr-2 group-hover:text-cyan-400 transition-colors" title={displayName}>
                        {displayName}
                      </h3>
                      {/* Rating Badge */}
                      <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-md">
                        <Star size={12} className="text-amber-500 fill-amber-500" />
                        <span className="text-xs font-bold text-amber-500">{config.rating}</span>
                      </div>
                    </div>
                    
                    {/* Device Info */}
                    <div className="space-y-1 mb-4">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Cpu size={14} className="text-slate-500" />
                        <span className="truncate">
                          {config.device ? `${config.device.model} • ${displayGpu}` : 'Unknown Device'}
                        </span>
                      </div>
                      {config.device?.android_ver && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="ml-6">Android {config.device.android_ver}</span>
                        </div>
                      )}
                      {config.app_version && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="ml-6">App Ver: {config.app_version}</span>
                        </div>
                      )}
                      {config.configs?.containerVariant && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="ml-6">Container: {config.configs.containerVariant}</span>
                        </div>
                      )}
                      {config.configs?.graphicsDriver && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="ml-6">Driver: {config.configs.graphicsDriver}</span>
                        </div>
                      )}
                      {config.configs?.screenSize && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="ml-6">Screen: {config.configs.screenSize}</span>
                        </div>
                      )}
                      {config.tags && Array.isArray(config.tags) && config.tags.length > 0 && (
                        <div className="flex items-start gap-2 text-xs text-slate-500">
                          <span className="ml-6">Tags:</span>
                          <div className="flex flex-wrap gap-1">
                            {config.tags.map((tag, index) => (
                              <span key={index} className="px-2 py-1 bg-slate-700/50 text-slate-300 rounded-md text-xs">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* FPS & Notes Section */}
                  <div className="px-5 py-3 bg-slate-900/30 border-y border-slate-700/30 flex-grow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-md ${
                          config.avg_fps === null || config.avg_fps === 0
                            ? 'bg-slate-700/50 text-slate-500'
                            : config.avg_fps >= 30 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-red-500/20 text-red-400'
                        }`}>
                          <Zap size={14} />
                        </div>
                        <div>
                          <span className={`block text-sm font-bold leading-none ${config.avg_fps === null || config.avg_fps === 0 ? 'text-slate-500' : 'text-slate-200'}`}>
                            {config.avg_fps !== null && config.avg_fps !== 0 ? `${Math.round(config.avg_fps)} FPS` : '--'}
                          </span>
                          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Average</span>
                        </div>
                        {config.session_length_sec && config.session_length_sec > 0 && (
                          <div className="text-center ml-4">
                            <span className="block text-sm font-bold text-slate-200">
                              {Math.round(config.session_length_sec / 60)}m
                            </span>
                            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Playtime</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                           <span className="block text-xs text-slate-500">
                             {new Date(config.created_at).toLocaleString(undefined, { 
                               month: 'short', 
                               day: 'numeric', 
                               year: 'numeric',
                               hour: '2-digit',
                               minute: '2-digit'
                             })}
                           </span>
                        </div>
                      </div>
                    </div>
                    
                    {config.notes ? (
                      <div className="text-sm text-slate-400 italic">
                        <div className={expandedNotes.has(config.id) ? '' : 'line-clamp-2 h-10'}>
                          "{config.notes}"
                        </div>
                        {config.notes.length > 100 && (
                          <button
                            onClick={() => {
                              const newExpanded = new Set(expandedNotes);
                              if (expandedNotes.has(config.id)) {
                                newExpanded.delete(config.id);
                              } else {
                                newExpanded.add(config.id);
                              }
                              setExpandedNotes(newExpanded);
                            }}
                            className="text-cyan-400 hover:text-cyan-300 text-xs mt-1 transition-colors"
                          >
                            {expandedNotes.has(config.id) ? 'Show less' : 'Show more'}
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-600 italic h-10">No notes provided.</p>
                    )}
                  </div>

                  {/* Footer Action */}
                  <div className="p-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenInEditor(config)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-cyan-900/20 group-hover:shadow-cyan-500/20 active:scale-[0.98]"
                      >
                        <Download size={16} />
                        Load Config
                      </button>
                      <button
                        onClick={() => handleDownloadConfig(config)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-purple-900/20 group-hover:shadow-purple-500/20 active:scale-[0.98]"
                      >
                        <Download size={16} />
                        Download JSON
                      </button>
                    </div>
                  </div>
                </div>
              );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-10 flex flex-col items-center gap-4 select-none">
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  
                  <div className="flex gap-1 px-2">
                    {getPageNumbers.map((item, index) => {
                      if (item === 'ellipsis') {
                        return (
                          <span key={`ellipsis-${index}`} className="text-slate-600 px-2 flex items-center">
                            ...
                          </span>
                        );
                      }
                      
                      const page = item as number;
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
                            currentPage === page
                              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/25 scale-110'
                              : 'bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
                
                {/* Go to Page Input */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-400">Go to:</span>
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={goToPage}
                    onChange={(e) => setGoToPage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleGoToPage();
                      }
                    }}
                    className="w-16 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-center focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                    placeholder={currentPage.toString()}
                  />
                  <button
                    onClick={handleGoToPage}
                    disabled={!goToPage || parseInt(goToPage) < 1 || parseInt(goToPage) > totalPages}
                    className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm transition-colors"
                  >
                    Go
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
