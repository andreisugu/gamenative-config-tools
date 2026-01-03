'use client';

import { useState, useMemo } from 'react';
import { Search, Star, Zap } from 'lucide-react';
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

export default function ConfigBrowserClient({ configs }: ConfigBrowserClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const filteredConfigs = useMemo(() => {
    if (!searchQuery.trim()) return configs;
    
    const query = searchQuery.toLowerCase();
    return configs.filter(config => 
      config.game?.name?.toLowerCase().includes(query)
    );
  }, [configs, searchQuery]);

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
      console.error('Failed to save config to localStorage:', error);
      // Fallback: log to console
      console.log('Config data:', exportData);
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
          
          {/* Search Bar */}
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" size={20} />
            <input
              type="text"
              placeholder="Search games..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-900/50 backdrop-blur-md border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
            />
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 text-slate-400 text-sm">
          Showing {filteredConfigs.length} {filteredConfigs.length === 1 ? 'config' : 'configs'}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredConfigs.length === 0 ? (
            <div className="col-span-full text-center py-16">
              <p className="text-slate-500 text-lg">No configs found matching your search.</p>
            </div>
          ) : (
            filteredConfigs.map((config) => (
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
