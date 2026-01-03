'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, Star, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

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

interface ConfigBrowserClientProps {
  configs: GameConfig[];
}

const ITEMS_PER_PAGE = 15;

export default function ConfigBrowserClient({ configs }: ConfigBrowserClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [gpuFilter, setGpuFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();

  const filteredConfigs = useMemo(() => {
    let filtered = configs;
    
    // Filter by game name
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(config => 
        config.game?.name?.toLowerCase().includes(query)
      );
    }
    
    // Filter by GPU
    if (gpuFilter.trim()) {
      const gpu = gpuFilter.toLowerCase();
      filtered = filtered.filter(config =>
        config.device?.gpu?.toLowerCase().includes(gpu)
      );
    }
    
    return filtered;
  }, [configs, searchQuery, gpuFilter]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredConfigs.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedConfigs = filteredConfigs.slice(startIndex, endIndex);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-slate-950 to-cyan-950">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400 mb-4 tracking-tight">
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
                className="w-full pl-12 pr-4 py-4 bg-slate-900/50 backdrop-blur-md border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
              />
            </div>
            
            {/* GPU Filter */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" size={20} />
              <input
                type="text"
                placeholder="Filter by GPU (e.g., Adreno 750)..."
                value={gpuFilter}
                onChange={(e) => setGpuFilter(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-900/50 backdrop-blur-md border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Results Count and Pagination Info */}
        <div className="mb-4 flex items-center justify-between text-slate-400 text-sm">
          <div>
            Showing {paginatedConfigs.length > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, filteredConfigs.length)} of {filteredConfigs.length} {filteredConfigs.length === 1 ? 'config' : 'configs'}
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
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                // Show first page, last page, current page, and pages around current
                const showPage = page === 1 || 
                                page === totalPages || 
                                Math.abs(page - currentPage) <= 1;
                
                // Show ellipsis
                if (!showPage) {
                  if (page === currentPage - 2 || page === currentPage + 2) {
                    return (
                      <span key={`ellipsis-${page}`} className="px-3 py-2 text-slate-500">
                        ...
                      </span>
                    );
                  }
                  return null;
                }

                return (
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
              })}
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
      </div>
    </div>
  );
}
