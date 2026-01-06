'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, Star, Zap, ChevronLeft, ChevronRight, Cpu, Filter, Download, X, ChevronDown } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// --- Types ---

interface GameConfig {
  id: number;
  rating: number;
  avg_fps: number;
  notes: string | null;
  configs: any;
  created_at: string;
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

interface SupabaseGameRun {
  id: number;
  rating: number;
  avg_fps: number;
  notes: string | null;
  configs: any;
  created_at: string;
  games: { id: number; name: string } | null;
  devices: { id: number; model: string; gpu: string; android_ver: string } | null;
}

interface GameSuggestion {
  id: number;
  name: string;
}

interface GpuSuggestion {
  gpu: string;
}

type SortOption = 'newest' | 'rating_desc' | 'fps_desc' | 'fps_asc';

interface ConfigBrowserClientProps {
  initialSearch?: string;
  initialGpu?: string;
}

// --- Constants ---

const ITEMS_PER_PAGE = 15;
const DEBOUNCE_MS = 300;
const GAME_RUNS_QUERY = 'id,rating,avg_fps,notes,configs,created_at,games!inner(id,name),devices!inner(id,model,gpu,android_ver)';

// --- Helper Hook: useDebounce ---
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function ConfigBrowserClient({ initialSearch, initialGpu }: ConfigBrowserClientProps) {
  // --- State ---
  const [configs, setConfigs] = useState<GameConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState(initialSearch || '');
  const [selectedGame, setSelectedGame] = useState<GameSuggestion | null>(null);
  const [gpuFilter, setGpuFilter] = useState(initialGpu || '');
  const [selectedGpu, setSelectedGpu] = useState<GpuSuggestion | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  
  // Autocomplete State
  const [suggestions, setSuggestions] = useState<GameSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingGames, setIsSearchingGames] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  // GPU Autocomplete State
  const [gpuSuggestions, setGpuSuggestions] = useState<GpuSuggestion[]>([]);
  const [showGpuSuggestions, setShowGpuSuggestions] = useState(false);
  const [isSearchingGpus, setIsSearchingGpus] = useState(false);
  const gpuWrapperRef = useRef<HTMLDivElement>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const debouncedSearchTerm = useDebounce(searchTerm, DEBOUNCE_MS);
  const debouncedGpu = useDebounce(gpuFilter, DEBOUNCE_MS);

  // --- 1. Fetch Game Suggestions (Autocomplete) ---
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!debouncedSearchTerm || selectedGame) {
        setSuggestions([]);
        return;
      }

      setIsSearchingGames(true);
      const { data, error } = await supabase
        .from('games')
        .select('id, name')
        .ilike('name', `%${debouncedSearchTerm}%`)
        .limit(6);

      if (!error && data) {
        setSuggestions(data);
        setShowSuggestions(true);
      }
      setIsSearchingGames(false);
    };

    fetchSuggestions();
  }, [debouncedSearchTerm, selectedGame]);

  // Handle clicking outside autocomplete
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
      if (gpuWrapperRef.current && !gpuWrapperRef.current.contains(event.target as Node)) {
        setShowGpuSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- Fetch GPU Suggestions (Autocomplete) ---
  useEffect(() => {
    const fetchGpuSuggestions = async () => {
      if (!debouncedGpu || selectedGpu) {
        setGpuSuggestions([]);
        return;
      }

      setIsSearchingGpus(true);
      const { data, error } = await supabase
        .from('devices')
        .select('gpu')
        .ilike('gpu', `%${debouncedGpu}%`)
        .limit(10);

      if (!error && data) {
        // Remove duplicates and limit to 6
        const uniqueGpus = Array.from(new Set(data.map(d => d.gpu)))
          .filter(gpu => gpu) // Filter out null/undefined values
          .slice(0, 6)
          .map(gpu => ({ gpu }));
        setGpuSuggestions(uniqueGpus);
        setShowGpuSuggestions(true);
      }
      setIsSearchingGpus(false);
    };

    fetchGpuSuggestions();
  }, [debouncedGpu, selectedGpu]);

  // --- 2. Main Data Fetching ---
  const fetchConfigs = useCallback(async () => {
    setIsLoading(true);
    try {
      // Calculate pagination range
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from('game_runs')
        .select(GAME_RUNS_QUERY, { count: 'exact' });

      // Filter by Game (ID if selected, otherwise fuzzy text search)
      if (selectedGame) {
        query = query.eq('games.id', selectedGame.id);
      } else if (debouncedSearchTerm) {
        query = query.ilike('games.name', `%${debouncedSearchTerm}%`);
      }

      // Filter by GPU (exact match if selected, otherwise fuzzy text search)
      if (selectedGpu) {
        query = query.eq('devices.gpu', selectedGpu.gpu);
      } else if (debouncedGpu) {
        query = query.ilike('devices.gpu', `%${debouncedGpu}%`);
      }

      // Server-side sorting
      switch (sortOption) {
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'rating_desc':
          query = query.order('rating', { ascending: false }).order('avg_fps', { ascending: false });
          break;
        case 'fps_desc':
          query = query.order('avg_fps', { ascending: false }).order('rating', { ascending: false });
          break;
        case 'fps_asc':
          query = query.order('avg_fps', { ascending: true });
          break;
      }

      // Apply pagination
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      // Update total count
      setTotalCount(count || 0);

      // Transform Data
      const transformedData: GameConfig[] = (data as unknown as SupabaseGameRun[] || []).map(item => ({
        id: item.id,
        rating: item.rating,
        avg_fps: item.avg_fps,
        notes: item.notes,
        configs: item.configs,
        created_at: item.created_at,
        game: item.games || null,
        device: item.devices || null
      }));

      setConfigs(transformedData);
    } catch (error) {
      console.error('Error fetching configs:', error);
      setConfigs([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearchTerm, debouncedGpu, selectedGame, selectedGpu, sortOption]);

  // Trigger fetch when dependencies change
  useEffect(() => {
    fetchConfigs();
    setCurrentPage(1); // Reset page on filter change
  }, [fetchConfigs]);

  // Update URL Params (Optional, for sharing links)
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearchTerm) params.set('search', debouncedSearchTerm);
    else params.delete('search');
    
    if (debouncedGpu) params.set('gpu', debouncedGpu);
    else params.delete('gpu');

    const newUrl = `${pathname}?${params.toString()}`;
    router.replace(newUrl, { scroll: false });
  }, [debouncedSearchTerm, debouncedGpu, pathname, router, searchParams]);


  // --- 3. Pagination Logic ---
  const totalPages = useMemo(() => {
    return Math.ceil(totalCount / ITEMS_PER_PAGE);
  }, [totalCount]);

  // Scroll to top when changing pages
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);


  // --- 4. Handlers ---

  const handleGameSelect = (game: GameSuggestion) => {
    setSearchTerm(game.name);
    setSelectedGame(game);
    setShowSuggestions(false);
  };

  const clearGameSearch = () => {
    setSearchTerm('');
    setSelectedGame(null);
    setSuggestions([]);
  };

  const handleGpuSelect = (gpu: GpuSuggestion) => {
    setGpuFilter(gpu.gpu);
    setSelectedGpu(gpu);
    setShowGpuSuggestions(false);
  };

  const clearGpuSearch = () => {
    setGpuFilter('');
    setSelectedGpu(null);
    setGpuSuggestions([]);
  };

  const handleOpenInEditor = (config: GameConfig) => {
    const exportData = {
      version: 1,
      exportedFrom: "CommunityBrowser",
      timestamp: Date.now(),
      containerName: config.game?.name || "Community Config",
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
      exportedFrom: "CommunityBrowser",
      timestamp: Date.now(),
      containerName: config.game?.name || "Community Config",
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-slate-200 font-sans selection:bg-cyan-500/30">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        
        {/* --- Header Section --- */}
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent mb-4 tracking-tight">
            Community Configs
          </h1>
          <p className="text-slate-400 text-base md:text-lg max-w-2xl">
            Discover optimized settings shared by the community. Search by game or GPU to find the perfect setup for your device.
          </p>
        </div>

        {/* --- Control Bar (Search, Sort, Filter) --- */}
        <div className="sticky top-4 z-30 mb-8 bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4 shadow-2xl shadow-black/20">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* 1. Game Autocomplete Search */}
            <div className="md:col-span-5 relative" ref={wrapperRef}>
              <div className="relative group">
                <Search className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${isSearchingGames ? 'text-cyan-400' : 'text-slate-500 group-focus-within:text-cyan-400'}`} size={18} />
                <input
                  type="text"
                  placeholder="Search game name..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (selectedGame) setSelectedGame(null); // Clear ID selection if typing new text
                  }}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowSuggestions(true);
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
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50">
                  <div className="text-xs font-semibold text-slate-500 px-4 py-2 bg-slate-800/80">SUGGESTED GAMES</div>
                  {suggestions.map((game) => (
                    <button
                      key={game.id}
                      onClick={() => handleGameSelect(game)}
                      className="w-full text-left px-4 py-3 hover:bg-cyan-900/20 text-slate-200 hover:text-cyan-400 transition-colors flex items-center justify-between group"
                    >
                      <span>{game.name}</span>
                      <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 2. GPU Filter with Autocomplete */}
            <div className="md:col-span-4 relative" ref={gpuWrapperRef}>
              <div className="relative group">
                <Cpu className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${isSearchingGpus ? 'text-purple-400' : 'text-slate-500 group-focus-within:text-purple-400'}`} size={18} />
                <input
                  type="text"
                  placeholder="GPU (e.g. Adreno 740)"
                  value={gpuFilter}
                  onChange={(e) => {
                    setGpuFilter(e.target.value);
                    if (selectedGpu) setSelectedGpu(null);
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
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50">
                  <div className="text-xs font-semibold text-slate-500 px-4 py-2 bg-slate-800/80">SUGGESTED GPUs</div>
                  {gpuSuggestions.map((gpu, index) => (
                    <button
                      key={index}
                      onClick={() => handleGpuSelect(gpu)}
                      className="w-full text-left px-4 py-3 hover:bg-purple-900/20 text-slate-200 hover:text-purple-400 transition-colors flex items-center justify-between group"
                    >
                      <span>{gpu.gpu}</span>
                      <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Sort Dropdown */}
            <div className="md:col-span-3 relative">
              <div className="relative">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  className="w-full pl-11 pr-10 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white appearance-none cursor-pointer focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                >
                  <option value="newest">Newest First</option>
                  <option value="rating_desc">Highest Rated</option>
                  <option value="fps_desc">Highest FPS</option>
                  <option value="fps_asc">Lowest FPS</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
              </div>
            </div>

          </div>
        </div>

        {/* --- Content Area --- */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative w-16 h-16">
              <div className="absolute top-0 left-0 w-full h-full border-4 border-slate-700 rounded-full"></div>
              <div className="absolute top-0 left-0 w-full h-full border-4 border-t-cyan-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
            </div>
            <p className="mt-4 text-slate-400 animate-pulse">Fetching configurations...</p>
          </div>
        ) : configs.length === 0 ? (
          <div className="text-center py-20 bg-slate-800/30 rounded-2xl border border-slate-700/50 border-dashed">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 mb-4">
              <Search className="text-slate-500" size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No results found</h3>
            <p className="text-slate-400 max-w-md mx-auto">
              We couldn't find any configs matching your search. Try adjusting filters or searching for a different game.
            </p>
            <button 
              onClick={() => { clearGameSearch(); clearGpuSearch(); }}
              className="mt-6 px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <>
            {/* Results Count */}
            <div className="flex items-center justify-between mb-4 text-sm px-1">
              <span className="text-slate-400">
                Found <strong className="text-white">{totalCount}</strong> configurations
              </span>
              <span className="text-slate-500">
                Page {currentPage} of {totalPages}
              </span>
            </div>

            {/* Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {configs.map((config) => (
                <div
                  key={config.id}
                  className="group relative bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden hover:bg-slate-800/60 hover:border-cyan-500/30 transition-all duration-300 shadow-lg hover:shadow-cyan-900/10 flex flex-col"
                >
                  {/* Card Header */}
                  <div className="p-5 pb-0">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-bold text-white truncate pr-2 group-hover:text-cyan-400 transition-colors" title={config.game?.name}>
                        {config.game?.name || 'Unknown Game'}
                      </h3>
                      {/* Rating Badge */}
                      <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-md">
                        <Star size={12} className="text-amber-500 fill-amber-500" />
                        <span className="text-xs font-bold text-amber-500">{config.rating}</span>
                      </div>
                    </div>
                    
                    {/* Device Info */}
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
                      <Cpu size={14} className="text-slate-500" />
                      <span className="truncate">
                        {config.device ? `${config.device.model} • ${config.device.gpu}` : 'Unknown Device'}
                      </span>
                    </div>
                  </div>

                  {/* FPS & Notes Section */}
                  <div className="px-5 py-3 bg-slate-900/30 border-y border-slate-700/30 flex-grow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-md ${config.avg_fps >= 30 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          <Zap size={14} />
                        </div>
                        <div>
                          <span className="block text-sm font-bold text-slate-200 leading-none">{Math.round(config.avg_fps)} FPS</span>
                          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Average</span>
                        </div>
                      </div>
                      <div className="text-right">
                         <span className="block text-xs text-slate-500">
                           {new Date(config.created_at).toLocaleDateString()}
                         </span>
                      </div>
                    </div>
                    
                    {config.notes ? (
                      <p className="text-sm text-slate-400 line-clamp-2 italic h-10">"{config.notes}"</p>
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
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2 select-none">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 hover:text-white transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                
                <div className="flex gap-1 px-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                    .map((page, index, array) => {
                      const prevPage = array[index - 1];
                      return (
                        <div key={page} className="flex items-center">
                          {prevPage && page - prevPage > 1 && <span className="text-slate-600 px-2">...</span>}
                          <button
                            onClick={() => setCurrentPage(page)}
                            className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
                              currentPage === page
                                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/25 scale-110'
                                : 'bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white'
                            }`}
                          >
                            {page}
                          </button>
                        </div>
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
            )}
          </>
        )}
      </div>
    </div>
  );
}
