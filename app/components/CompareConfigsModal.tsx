'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  ArrowLeftRight,
  ExternalLink,
  Download,
  Check,
  Cpu,
  Monitor,
  Gamepad2,
  Zap,
  Layers,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';
import { CompatibilityRun } from '@/lib/types';
import { downloadConfigJson } from '@/lib/api';

interface CompareConfigsModalProps {
  isOpen: boolean;
  onClose: () => void;
  runs: CompatibilityRun[];
  gameName?: string;
  onLoadInEditor: (run: CompatibilityRun, gameName?: string) => void;
}

interface ParameterRow {
  label: string;
  category: string;
  getValue: (run: CompatibilityRun) => string | boolean | number | null | undefined;
}

const COMPARISON_ROWS: ParameterRow[] = [
  // ── Performance & Device ──────────────────────────────────────────
  {
    category: 'Performance & Device',
    label: 'Avg FPS',
    getValue: (r) => (r.avgFps != null ? `${r.avgFps} FPS` : 'N/A'),
  },
  {
    category: 'Performance & Device',
    label: 'Rating',
    getValue: (r) => (r.rating != null ? `${r.rating} / 5` : 'N/A'),
  },
  {
    category: 'Performance & Device',
    label: 'Device Model',
    getValue: (r) => r.device?.model || (r as any).deviceModel || 'Unknown Device',
  },
  {
    category: 'Performance & Device',
    label: 'GPU',
    getValue: (r) => r.device?.gpu || (r as any).deviceGpu || 'Unknown GPU',
  },
  {
    category: 'Performance & Device',
    label: 'SoC / Processor',
    getValue: (r) => r.device?.soc || 'N/A',
  },
  {
    category: 'Performance & Device',
    label: 'Android Version',
    getValue: (r) => (r.device?.androidVer ? `Android ${r.device.androidVer}` : 'N/A'),
  },

  // ── Engine & Wine Runtime ─────────────────────────────────────────
  {
    category: 'Wine & Container Runtime',
    label: 'Emulator Engine',
    getValue: (r) => r.configs?.emulator || 'Wine / Native',
  },
  {
    category: 'Wine & Container Runtime',
    label: 'Wine Version',
    getValue: (r) =>
      r.configs?.wineVersion ||
      r.configs?.extraData?.appliedWineVersion ||
      'Default Wine',
  },
  {
    category: 'Wine & Container Runtime',
    label: 'Container Variant',
    getValue: (r) =>
      r.configs?.containerVariant ||
      r.configs?.extraData?.appliedContainerVariant ||
      'glibc',
  },
  {
    category: 'Wine & Container Runtime',
    label: 'Steam Integration',
    getValue: (r) => r.configs?.steamType || 'normal',
  },
  {
    category: 'Wine & Container Runtime',
    label: 'Screen Resolution',
    getValue: (r) => r.configs?.screenSize || 'Default',
  },
  {
    category: 'Wine & Container Runtime',
    label: 'Audio Driver',
    getValue: (r) => r.configs?.audioDriver || r.configs?.extraData?.audioDriver || 'Default',
  },
  {
    category: 'Wine & Container Runtime',
    label: 'Locale / Language',
    getValue: (r) => r.configs?.lc_all || r.configs?.language || 'en_US.UTF-8',
  },

  // ── Graphics & Direct3D ───────────────────────────────────────────
  {
    category: 'Graphics & Direct3D',
    label: 'DirectX Wrapper (DXVK/VKD3D)',
    getValue: (r) => r.configs?.dxwrapper || r.configs?.extraData?.dxwrapper || 'dxvk',
  },
  {
    category: 'Graphics & Direct3D',
    label: 'Graphics Driver',
    getValue: (r) =>
      r.configs?.graphicsDriver ||
      r.configs?.extraData?.graphicsDriver ||
      'Turnip / System',
  },
  {
    category: 'Graphics & Direct3D',
    label: 'Video Memory Size',
    getValue: (r) => r.configs?.videoMemorySize || '2048 MB',
  },
  {
    category: 'Graphics & Direct3D',
    label: 'Off-Screen Rendering',
    getValue: (r) => r.configs?.offScreenRenderingMode || 'fbo',
  },
  {
    category: 'Graphics & Direct3D',
    label: 'CSMT',
    getValue: (r) => (r.configs?.csmt === false ? 'Disabled' : 'Enabled'),
  },
  {
    category: 'Graphics & Direct3D',
    label: 'Strict Shader Math',
    getValue: (r) => (r.configs?.strictShaderMath ? 'Enabled' : 'Disabled'),
  },

  // ── Emulation & CPU ───────────────────────────────────────────────
  {
    category: 'Emulation & CPU',
    label: 'Box64 Version',
    getValue: (r) => r.configs?.box64Version || r.configs?.extraData?.box64Version || 'Default',
  },
  {
    category: 'Emulation & CPU',
    label: 'Box64 Preset',
    getValue: (r) => r.configs?.box64Preset || 'Default',
  },
  {
    category: 'Emulation & CPU',
    label: 'FEX-Emu Version',
    getValue: (r) => r.configs?.fexcoreVersion || r.configs?.extraData?.fexcoreVersion || 'N/A',
  },
  {
    category: 'Emulation & CPU',
    label: 'FEX-Emu Preset',
    getValue: (r) => r.configs?.fexcorePreset || r.configs?.extraData?.fexcorePreset || 'N/A',
  },
  {
    category: 'Emulation & CPU',
    label: 'CPU Affinity (Cores)',
    getValue: (r) => r.configs?.cpuList || 'All Cores (unrestricted)',
  },
  {
    category: 'Emulation & CPU',
    label: 'WoW64 Mode',
    getValue: (r) => (r.configs?.wow64Mode ? 'Enabled' : 'Disabled'),
  },

  // ── Environment & Additional ──────────────────────────────────────
  {
    category: 'Environment & Advanced',
    label: 'Environment Variables',
    getValue: (r) => {
      const env = r.configs?.envVars;
      if (!env) return 'None';
      const count = env.trim().split(/\s+/).length;
      return `${count} variables defined`;
    },
  },
  {
    category: 'Environment & Advanced',
    label: 'Windows Components',
    getValue: (r) => r.configs?.wincomponents || r.configs?.extraData?.wincomponents || 'Default',
  },
  {
    category: 'Environment & Advanced',
    label: 'Drives Mapping',
    getValue: (r) => r.configs?.drives || 'Default (C:, D:)',
  },
];

export function CompareConfigsModal({
  isOpen,
  onClose,
  runs,
  gameName,
  onLoadInEditor,
}: CompareConfigsModalProps) {
  const [diffsOnly, setDiffsOnly] = useState(false);
  const [downloadedRunId, setDownloadedRunId] = useState<number | null>(null);

  const categories = useMemo(() => {
    return Array.from(new Set(COMPARISON_ROWS.map((r) => r.category)));
  }, []);

  if (!isOpen || runs.length < 2) return null;

  const handleDownload = (run: CompatibilityRun) => {
    downloadConfigJson(run, gameName);
    setDownloadedRunId(run.id);
    setTimeout(() => setDownloadedRunId(null), 2500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Configuration Comparison Modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-hidden animate-in fade-in"
    >
      <div className="relative w-full max-w-5xl bg-gray-950 border border-gray-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800/80 bg-gray-900/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-950/80 border border-cyan-800/60 rounded-xl text-cyan-400">
              <ArrowLeftRight className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Configuration Comparison
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/50">
                  {runs.length} Configs
                </span>
              </h2>
              <p className="text-xs text-gray-400 truncate max-w-md">
                {gameName ? `Comparing configs for ${gameName}` : 'Side-by-side parameter diff'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Diff Toggle */}
            <button
              onClick={() => setDiffsOnly(!diffsOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                diffsOnly
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-gray-200'
              }`}
              title="Toggle to show only parameters where configurations differ"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Differences Only</span>
              {diffsOnly && <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800/80 transition"
              title="Close comparison"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Comparison Content */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-900">
          {/* Top Sticky Run Summary Header */}
          <div className="sticky top-0 z-20 bg-gray-950/95 backdrop-blur-md border-b border-gray-800 grid grid-cols-12 gap-2 p-4 text-xs font-semibold">
            <div className="col-span-4 text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>Parameter</span>
            </div>
            {runs.map((run, idx) => (
              <div
                key={run.id}
                className={`${
                  runs.length === 2 ? 'col-span-4' : 'col-span-3'
                } bg-gray-900/80 border border-gray-800 rounded-xl p-3 flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
                      Config #{idx + 1} (ID: {run.id})
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        (run.rating || 0) >= 4
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'
                          : 'bg-amber-950 text-amber-300 border border-amber-800/50'
                      }`}
                    >
                      ★ {run.rating || 'N/A'}/5
                    </span>
                  </div>
                  <div className="font-bold text-gray-200 text-sm truncate">
                    {run.device?.model || 'Generic Device'}
                  </div>
                  <div className="text-gray-400 text-[11px] truncate">{run.device?.gpu || 'GPU N/A'}</div>
                  {run.avgFps != null && (
                    <div className="text-cyan-400 font-bold text-xs mt-1">
                      {run.avgFps} FPS
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-gray-800/80 flex items-center gap-1.5">
                  <button
                    onClick={() => onLoadInEditor(run, gameName)}
                    className="flex-1 py-1 px-2 bg-cyan-950 hover:bg-cyan-900 border border-cyan-700/50 text-cyan-300 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition"
                    title="Load in visual Config Editor"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDownload(run)}
                    className={`p-1.5 rounded-lg border transition ${
                      downloadedRunId === run.id
                        ? 'bg-emerald-600 text-white border-emerald-400'
                        : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700'
                    }`}
                    title="Download config.json"
                  >
                    {downloadedRunId === run.id ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Categorized Rows */}
          {categories.map((category) => {
            const rowsInCategory = COMPARISON_ROWS.filter((r) => r.category === category);
            const filteredRows = diffsOnly
              ? rowsInCategory.filter((row) => {
                  const values = runs.map((run) => String(row.getValue(run) ?? ''));
                  return new Set(values).size > 1;
                })
              : rowsInCategory;

            if (filteredRows.length === 0) return null;

            return (
              <div key={category} className="p-4">
                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  {category}
                </h3>

                <div className="space-y-1">
                  {filteredRows.map((row) => {
                    const values = runs.map((run) => String(row.getValue(run) ?? ''));
                    const isDiff = new Set(values).size > 1;

                    return (
                      <div
                        key={row.label}
                        className={`grid grid-cols-12 gap-2 p-2 rounded-lg text-xs transition ${
                          isDiff
                            ? 'bg-amber-950/20 border border-amber-800/40'
                            : 'hover:bg-gray-900/50'
                        }`}
                      >
                        <div className="col-span-4 flex items-center gap-1.5 font-medium text-gray-300">
                          {isDiff && (
                            <span
                              className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0"
                              title="Value differs"
                            />
                          )}
                          <span>{row.label}</span>
                        </div>

                        {runs.map((run, i) => {
                          const val = String(row.getValue(run) ?? 'N/A');
                          return (
                            <div
                              key={run.id}
                              className={`${
                                runs.length === 2 ? 'col-span-4' : 'col-span-3'
                              } font-mono truncate ${
                                isDiff
                                  ? 'text-amber-200 font-semibold'
                                  : 'text-gray-400'
                              }`}
                              title={val}
                            >
                              {val}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-800/80 bg-gray-900/60 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span>Amber highlight indicates differing settings</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl text-xs font-semibold transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
