'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Star, Zap, ChevronLeft, ChevronRight, Cpu } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface GameConfig {
  id: number;
  rating: number;
  avg_fps: number;
  notes: string | null;
  configs: any;
  created_at: string;
  game: {
    name: string;
  } | null;
  device: {
    model: string;
    gpu: string;
    android_ver: string;
  } | null;
}

// Supabase raw return type (joins return arrays)
interface SupabaseGameRun {
  id: number;
  rating: number;
  avg_fps: number;
  notes: string | null;
  configs: any;
  created_at: string;
  game: Array<{ name: string }>;
  device: Array<{ model: string; gpu: string; android_ver: string }>;
}

interface ConfigBrowserClientProps {
  initialSearch?: string;
  initialGpu?: string;
}

const ITEMS_PER_PAGE = 15;
const SEARCH_DEBOUNCE_MS = 500;
// Query string for fetching game runs with related game and device data
const GAME_RUNS_QUERY = 'id,rating,avg_fps,notes,configs,created_at,game:games!inner(name),device:devices(model,gpu,android_ver)';
// Maximum number of configs to return from server query
// Limit set to prevent excessive data transfer and maintain performance
const SERVER_QUERY_LIMIT = 100;

export default function ConfigBrowserClient({ initialSearch, initialGpu }: ConfigBrowserClientProps) {
  const [configs, setConfigs] = useState<GameConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearch || '');
  const [gpuFilter, setGpuFilter] = useState(initialGpu || '');
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Fetch configs from Supabase based on search parameters
  const fetchConfigs = useCallback(async (search?: string, gpu?: string) => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('game_runs')
        .select(GAME_RUNS_QUERY)
        .order('rating', { ascending: false })
        .order('avg_fps', { ascending: false });

      // Apply server-side filtering for game name
      // Limit input length to prevent abuse
      const trimmedSearch = search?.trim().slice(0, 100);
      if (trimmedSearch) {
        query = query.ilike('game.name', `%${trimmedSearch}%`);
      }

      // Apply server-side filtering for GPU
      // Limit input length to prevent abuse
      const trimmedGpu = gpu?.trim().slice(0, 100);
      if (trimmedGpu) {
        query = query.ilike('device.gpu', `%${trimmedGpu}%`);
      }

      // Limit to SERVER_QUERY_LIMIT after filtering
      query = query.limit(SERVER_QUERY_LIMIT);

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching configs:', error);
        setConfigs([]);
        return;
      }

      if (!data) {
        setConfigs([]);
        return;
      }

      // Transform the data to match our interface
      const transformedData: GameConfig[] = (data as SupabaseGameRun[] || []).map(item => ({
        id: item.id,
        rating: item.rating,
        avg_fps: item.avg_fps,
        notes: item.notes,
        configs: item.configs,
        created_at: item.created_at,
        game: item.game && item.game.length > 0 ? { name: item.game[0].name } : null,
        device: item.device && item.device.length > 0 ? {
          model: item.device[0].model,
          gpu: item.device[0].gpu,
          android_ver: item.device[0].android_ver
        } : null
      }));

      setConfigs(transformedData);
    } catch (error) {
      console.error('Exception fetching configs:', error);
      setConfigs([]);
    } finally {
      setIsLoading(false);
    }
  }, []); // No dependencies - function is stable and doesn't use any external values

  // Fetch configs on mount with initial parameters
  useEffect(() => {
    fetchConfigs(initialSearch, initialGpu);
  }, [fetchConfigs, initialSearch, initialGpu]);

  // Update URL and fetch configs when search changes (with debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      
      if (searchQuery) {
        params.set('search', searchQuery);
      } else {
        params.delete('search');
      }
      
      if (gpuFilter) {
        params.set('gpu', gpuFilter);
      } else {
        params.delete('gpu');
      }
      
      const queryString = params.toString();
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.replace(newUrl);

      // Fetch new data with updated filters
      fetchConfigs(searchQuery, gpuFilter);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchQuery, gpuFilter, router, searchParams, pathname, fetchConfigs]);

  // Calculate pagination (memoized to avoid recalculation on unrelated state changes)
  const { totalPages, startIndex, endIndex, paginatedConfigs } = useMemo(() => {
    const total = Math.ceil(configs.length / ITEMS_PER_PAGE);
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const paginated = configs.slice(start, end);
    
    return {
      totalPages: total,
      startIndex: start,
      endIndex: end,
      paginatedConfigs: paginated
    };
  }, [configs.length, currentPage, configs]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, gpuFilter]);

  const handleOpenInEditor = (config: GameConfig) => {
    // Save config to localStorage
    const exportData = {
      version: 1,
      exportedFrom: "CommunityBrowser",
      timestamp: Date.now(),
      containerName: config.game?.name || "Community Config",
      config: config.configs
    };
    
    try {
      localStorage.setItem('pendingConfig', JSON.stringify(exportData));
      // Redirect to editor
      router.push('/config-editor');
    } catch (error) {
      // Silently fail - localStorage might be full or disabled
      console.error('Failed to save config to localStorage:', error);
    }
  };

  // Generate pagination buttons with ellipsis (memoized for performance)
  const renderPageButtons = useCallback(() => {
    const pages = [];
    let lastPage = 0;
    
    for (let page = 1; page <= totalPages; page++) {
      // Show first page, last page, current page, and pages around current
      const showPage = page === 1 || 
                      page === totalPages || 
                      Math.abs(page - currentPage) <= 1;
      
      if (showPage) {
        // Add ellipsis if there's a gap
        if (lastPage > 0 && page - lastPage > 1) {
          pages.push(
            <span key={`ellipsis-before-${page}`} className="px-3 py-2 text-slate-500">
              ...
            </span>
          );
        }
        
        pages.push(
          <button
            key={page}
            onClick={() => setCurrentPage(page)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              currentPage === page
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
                : 'bg-slate-900/50 border border-slate-700/50 text-slate-300 hover:bg-slate-800/50'
            }`}
          >
            {page}
          </button>
        );
        
        lastPage = page;
      }
    }
    
    return pages;
  }, [totalPages, currentPage]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-black protected-gradient-title mb-4 tracking-tight leading-tight">
            Community Configs
          </h1>
          <p className="text-slate-400 text-sm mb-6">
            Browse high-rated community configurations from GameNative
          </p>
          
          {/* Search Bars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
            {/* Game Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" size={20} />
              <input
                type="text"
                placeholder="Search games..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={isLoading}
                className="w-full pl-12 pr-4 py-4 bg-slate-900/50 backdrop-blur-md border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all disabled:opacity-50"
              />
            </div>
            
            {/* GPU Filter */}
            <div className="relative">
              <Cpu className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" size={20} />
              <input
                type="text"
                placeholder="Filter by GPU..."
                value={gpuFilter}
                onChange={(e) => setGpuFilter(e.target.value)}
                disabled={isLoading}
                className="w-full pl-12 pr-4 py-4 bg-slate-900/50 backdrop-blur-md border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mb-4"></div>
            <p className="text-slate-400 text-lg">Loading configurations...</p>
          </div>
        ) : (
          <>
            {/* Results Count and Pagination Info */}
            <div className="mb-4 flex items-center justify-between text-slate-400 text-sm">
              <div>
                Showing {paginatedConfigs.length > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, configs.length)} of {configs.length} {configs.length === 1 ? 'config' : 'configs'}
              </div>
              {totalPages > 1 && (
                <div>
                  Page {currentPage} of {totalPages}
                </div>
              )}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedConfigs.length === 0 ? (
                <div className="col-span-full text-center py-16">
                  <p className="text-slate-500 text-lg">No configs found matching your search.</p>
                </div>
              ) : (
                paginatedConfigs.map((config) => (
                  <div
                    key={config.id}
                    className="group relative bg-slate-900/30 backdrop-blur-md border border-slate-700/50 rounded-xl p-6 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10"
                  >
                    {/* Card Content */}
                    <div className="space-y-4">
                      {/* Title */}
                      <h3 className="text-xl font-bold text-white truncate">
                        {config.game?.name || 'Unknown Game'}
                      </h3>

                      {/* Stats */}
                      <div className="flex items-center gap-3">
                        {/* FPS Badge */}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg">
                          <Zap size={14} className="text-white" />
                          <span className="text-sm font-bold text-white">
                            {config.avg_fps} FPS
                          </span>
                        </div>

                        {/* Star Rating */}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-yellow-600 rounded-lg">
                          <Star size={14} className="text-white fill-white" />
                          <span className="text-sm font-bold text-white">
                            {config.rating}/5
                          </span>
                        </div>
                      </div>

                      {/* Device Info */}
                      {config.device && (
                        <div className="space-y-1">
                          <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">
                            Device
                          </p>
                          <p className="text-sm text-slate-300">
                            {config.device.model} • {config.device.gpu}
                          </p>
                          {config.device.android_ver && (
                            <p className="text-xs text-slate-500">
                              Android {config.device.android_ver}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Notes (if available) */}
                      {config.notes && (
                        <p className="text-sm text-slate-400 line-clamp-2">
                          {config.notes}
                        </p>
                      )}

                      {/* Action Button */}
                      <button
                        onClick={() => handleOpenInEditor(config)}
                        className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-cyan-500/25"
                      >
                        Open in Editor
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                {/* Previous Button */}
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800/50 transition-all flex items-center gap-2"
                >
                  <ChevronLeft size={20} />
                  Previous
                </button>

                {/* Page Numbers */}
                <div className="flex gap-2">
                  {renderPageButtons()}
                </div>

                {/* Next Button */}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800/50 transition-all flex items-center gap-2"
                >
                  Next
                  <ChevronRight size={20} />
                </button>
              </div>
            )}

            {/* Empty State for no configs at all */}
            {configs.length === 0 && (
              <div className="text-center py-16">
                <p className="text-slate-500 text-lg">No community configs available at this time.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
