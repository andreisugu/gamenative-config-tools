'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    Settings,
    Monitor,
    Cpu,
    Gamepad2,
    Wine,
    Layers,
    Terminal,
    HardDrive,
    Zap,
    ChevronRight,
    Plus,
    Trash2,
    FileCode,
    Download,
    Upload,
    RefreshCw,
    Lock,
    ExternalLink,
    Fingerprint,
    X,
    Sparkles,
    AlertTriangle,
    Info,
    FolderOpen,
} from 'lucide-react';
import { copyToClipboard } from '@/lib/clipboard';

// --- TYPES ---

type ContainerVariant = 'glibc' | 'bionic';
type SteamType = 'normal' | 'light' | 'ultralight';

interface ContainerConfig {
    id: string;
    name: string;
    containerName: string; // Top-level container name
    containerVariant: ContainerVariant;
    wineVersion: string;
    executablePath: string;
    execArgs: string;
    language: string;
    screenSize: string;
    audioDriver: string;
    showFPS: boolean;
    forceDlc: boolean;
    useLegacyDRM: boolean;
    launchRealSteam: boolean;
    allowSteamUpdates: boolean;
    steamType: SteamType;
    graphicsDriver: string;
    graphicsDriverVersion: string;
    graphicsDriverConfig: string;
    dxwrapper: string;
    dxwrapperConfig: string;
    useDRI3: boolean;
    sharpnessEffect: string;
    sharpnessLevel: number;
    sharpnessDenoise: number;
    emulator: string;
    box64Version: string;
    box64Preset: string;
    box86Version: string;
    box86Preset: string;
    fexcoreVersion: string;
    fexcorePreset: string;
    sdlControllerAPI: boolean;
    enableXInput: boolean;
    enableDInput: boolean;
    dinputMapperType: number;
    disableMouseInput: boolean;
    touchscreenMode: boolean;
    videoPciDeviceID: number;
    offScreenRenderingMode: string;
    videoMemorySize: string;
    csmt: boolean;
    strictShaderMath: boolean;
    mouseWarpOverride: string;
    wincomponents: string;
    envVars: string;
    drives: string;
    startupSelection: number;
    cpuList: string;
    cpuListWoW64: string;
    wow64Mode: boolean;
    [key: string]: any;
}

// --- UTILITIES ---

const parseKV = (str: any): Record<string, string> => {
    if (!str) return {};
    if (typeof str === 'object' && str !== null) return str as Record<string, string>;
    if (typeof str !== 'string') return {};
    const obj: Record<string, string> = {};
    str.split(',').forEach(pair => {
        const idx = pair.indexOf('=');
        if (idx !== -1) {
            const key = pair.substring(0, idx).trim();
            const val = pair.substring(idx + 1).trim();
            if (key) obj[key] = val;
        }
    });
    return obj;
};

const stringifyKV = (obj: Record<string, string>): string => {
    return Object.entries(obj).map(([k, v]) => `${k}=${v}`).join(',');
};

const parseEnv = (str: string) => {
    if (!str) return [];
    return str.split(' ').filter(p => p.includes('=')).map(p => {
        const [name, ...val] = p.split('=');
        return { name, value: val.join('=') };
    });
};

const stringifyEnv = (arr: { name: string; value: string }[]) => {
    return arr.map(v => `${v.name}=${v.value}`).join(' ');
};

const parseDrives = (str: string) => {
    if (!str) return [];
    const result: { letter: string; path: string }[] = [];
    let index = str.indexOf(':');
    while (index !== -1) {
        const letter = str[index - 1];
        const nextIndex = str.indexOf(':', index + 1);
        const path = str.substring(index + 1, nextIndex !== -1 ? nextIndex - 1 : str.length);
        result.push({ letter, path });
        index = nextIndex;
    }
    return result;
};

const stringifyDrives = (arr: { letter: string; path: string }[]) => {
    return arr.map(d => `${d.letter}:${d.path}`).join('');
};

// Component to render JSON with syntax highlighting
function JsonHighlight({ json }: { json: string }) {
  const highlightJson = (jsonString: string) => {
    // Split JSON into lines for processing
    const lines = jsonString.split('\n');
    
    return lines.map((line, lineIndex) => {
      const parts: React.JSX.Element[] = [];
      let processed = false;

      // Check for keys (property names)
      const keyMatch = /"([^"]+)":\s*/.exec(line);
      if (keyMatch) {
        const keyStart = keyMatch.index;
        const keyEnd = keyStart + keyMatch[0].length;
        
        // Add text before key
        if (keyStart > 0) {
          parts.push(<span key={`${lineIndex}-pre`}>{line.substring(0, keyStart)}</span>);
        }
        
        // Add colored key
        parts.push(
          <span key={`${lineIndex}-key`} className="text-cyan-400">
            {keyMatch[0].substring(0, keyMatch[0].indexOf(':') + 1)}
          </span>
        );
        
        // Process the value part
        const valuePart = line.substring(keyEnd);
        
        // String values
        if (valuePart.match(/^\s*".*"[,}]?$/)) {
          const stringMatch = /^\s*(".*?")/g.exec(valuePart);
          if (stringMatch) {
            parts.push(<span key={`${lineIndex}-ws`}>{valuePart.substring(0, stringMatch.index)}</span>);
            parts.push(
              <span key={`${lineIndex}-str`} className="text-green-400">
                {stringMatch[1]}
              </span>
            );
            parts.push(<span key={`${lineIndex}-end`}>{valuePart.substring(stringMatch.index + stringMatch[1].length)}</span>);
            processed = true;
          }
        }
        // Boolean values
        else if (valuePart.match(/^\s*(true|false)/)) {
          const boolMatch = /^\s*(true|false)/g.exec(valuePart);
          if (boolMatch) {
            parts.push(<span key={`${lineIndex}-ws`}>{valuePart.substring(0, boolMatch.index)}</span>);
            parts.push(
              <span key={`${lineIndex}-bool`} className="text-orange-400">
                {boolMatch[1]}
              </span>
            );
            parts.push(<span key={`${lineIndex}-end`}>{valuePart.substring(boolMatch.index + boolMatch[1].length)}</span>);
            processed = true;
          }
        }
        // Number values
        else if (valuePart.match(/^\s*-?\d+(?:\.\d+)?/)) {
          const numMatch = /^\s*(-?\d+(?:\.\d+)?)/g.exec(valuePart);
          if (numMatch) {
            parts.push(<span key={`${lineIndex}-ws`}>{valuePart.substring(0, numMatch.index)}</span>);
            parts.push(
              <span key={`${lineIndex}-num`} className="text-yellow-400">
                {numMatch[1]}
              </span>
            );
            parts.push(<span key={`${lineIndex}-end`}>{valuePart.substring(numMatch.index + numMatch[1].length)}</span>);
            processed = true;
          }
        }
        // Null values
        else if (valuePart.match(/^\s*null/)) {
          const nullMatch = /^\s*(null)/g.exec(valuePart);
          if (nullMatch) {
            parts.push(<span key={`${lineIndex}-ws`}>{valuePart.substring(0, nullMatch.index)}</span>);
            parts.push(
              <span key={`${lineIndex}-null`} className="text-purple-400">
                {nullMatch[1]}
              </span>
            );
            parts.push(<span key={`${lineIndex}-end`}>{valuePart.substring(nullMatch.index + nullMatch[1].length)}</span>);
            processed = true;
          }
        }
        
        if (!processed) {
          parts.push(<span key={`${lineIndex}-val`}>{valuePart}</span>);
        }
      } else {
        // Line without key-value (brackets, braces, etc.)
        parts.push(<span key={`${lineIndex}-plain`} className="text-slate-600">{line}</span>);
      }

      return (
        <div key={lineIndex}>
          {parts}
        </div>
      );
    });
  };

  return <>{highlightJson(json)}</>;
}

// --- PRESET HELPERS ---

// Preset options with display labels and internal values (all caps)
const BOX64_BOX86_PRESETS = [
    { value: 'STABILITY', label: 'Stability' },
    { value: 'COMPATIBILITY', label: 'Compatibility' },
    { value: 'INTERMEDIATE', label: 'Intermediate' },
    { value: 'PERFORMANCE', label: 'Performance' },
    { value: 'UNITY', label: 'Unity' },
    { value: 'UNITY MONO BLEEDING EDGE', label: 'Unity Mono Bleeding Edge' }
];

const FEXCORE_PRESETS = [
    { value: 'STABILITY', label: 'Stability' },
    { value: 'COMPATIBILITY', label: 'Compatibility' },
    { value: 'INTERMEDIATE', label: 'Intermediate' },
    { value: 'PERFORMANCE', label: 'Performance' }
];

// --- STANDARDIZED UI COMPONENTS ---

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-slate-950 rounded-xl border border-slate-800 shadow-2xl ${className}`}>
    {children}
    </div>
);

const RowWrapper = ({ children, label, description, disabled }: any) => (
    <div className={`flex flex-col py-3 border-b border-slate-900 last:border-0 gap-0.5 ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
    <div className="flex items-center gap-2">
    <span className="text-sm font-bold text-slate-100 uppercase tracking-tight">{label}</span>
    {disabled && <Lock size={12} className="text-slate-600" />}
    </div>
    {description && <p className="text-[10px] text-slate-600 uppercase font-bold tracking-wider">{description}</p>}
    <div className="mt-0">
    {children}
    </div>
    </div>
);

const Toggle = ({ checked, onChange, label, description, disabled }: any) => (
    <RowWrapper label={label} description={description} disabled={disabled}>
    <button
    onClick={() => !disabled && onChange(!checked)}
    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-all focus:outline-none ${
        checked ? 'bg-blue-600' : 'bg-slate-800'
    } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
    >
    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
    </button>
    </RowWrapper>
);

const Select = ({ value, onChange, options, label, description, disabled }: any) => (
    <RowWrapper label={label} description={description} disabled={disabled}>
    <select
    value={value}
    disabled={disabled}
    onChange={(e) => onChange(e.target.value)}
    className="w-full bg-transparent text-slate-400 text-xs font-bold outline-none cursor-pointer appearance-none hover:text-blue-400 focus:text-blue-400 transition-colors"
    >
    {options.map((opt: any) => {
        const val = typeof opt === 'string' ? opt : opt.value;
        const lbl = typeof opt === 'string' ? opt : opt.label;
        return <option key={val} value={val} className="bg-slate-900 text-slate-100 font-sans">{lbl}</option>;
    })}
    </select>
    </RowWrapper>
);

const InputField = ({ value, onChange, label, description, placeholder, disabled }: any) => (
    <RowWrapper label={label} description={description} disabled={disabled}>
    <input
    value={value}
    disabled={disabled}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className="w-full bg-transparent text-slate-400 text-xs font-medium outline-none placeholder:text-slate-800 hover:text-blue-400 focus:text-blue-400 transition-colors"
    />
    </RowWrapper>
);

const CPUGrid = ({ selected, onChange, totalCores = 8, label, description }: any) => {
    const cores = (selected || "").split(',').filter((x: string) => x !== '').map(Number);
    const toggleCore = (id: number) => {
        let newCores = cores.includes(id) ? cores.filter((c: number) => c !== id) : [...cores, id];
        onChange(newCores.sort((a: number, b: number) => a - b).join(','));
    };

    return (
        <div className="py-5 border-b border-slate-900 last:border-0">
        <div className="mb-3">
        <span className="text-sm font-bold text-slate-100 uppercase tracking-tight">{label}</span>
        {description && <p className="text-[10px] text-slate-600 uppercase font-bold mt-1 tracking-wider">{description}</p>}
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {Array.from({ length: totalCores }).map((_, i) => (
            <button
            key={i}
            onClick={() => toggleCore(i)}
            className={`p-3 rounded-lg border text-[10px] font-black transition-all flex flex-col items-center gap-1 ${
                cores.includes(i)
                ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20'
                : 'bg-transparent border-slate-900 text-slate-600 hover:border-slate-800'
            }`}
            >
            <span className="opacity-50 text-[7px] uppercase tracking-tighter">Core</span>
            {i}
            </button>
        ))}
        </div>
        <div className="mt-4 flex gap-4">
        <button onClick={() => onChange(Array.from({length: totalCores}, (_, i) => i).join(','))} className="text-[10px] uppercase font-black text-blue-500 hover:text-blue-400 tracking-widest">All</button>
        <button onClick={() => onChange("")} className="text-[10px] uppercase font-black text-slate-600 hover:text-slate-400 tracking-widest">None</button>
        </div>
        </div>
    );
};

// --- SMART PRESETS ---

interface SmartPreset {
    id: string;
    label: string;
    desc: string;
    apply: (prev: ContainerConfig) => ContainerConfig;
}

const SMART_PRESETS: SmartPreset[] = [
    {
        id: 'snapdragon-perf',
        label: 'Snapdragon Performance',
        desc: 'Box64 Performance, 8-core affinity, CSMT enabled, 4GB VRAM',
        apply: (prev) => ({
            ...prev,
            box64Preset: 'PERFORMANCE',
            cpuList: '0,1,2,3,4,5,6,7',
            cpuListWoW64: '0,1,2,3,4,5,6,7',
            csmt: true,
            videoMemorySize: '4096',
            offScreenRenderingMode: 'fbo',
            showFPS: true,
        }),
    },
    {
        id: 'balanced-bigcores',
        label: 'Balanced (Big Cores)',
        desc: 'Box64 Intermediate, Cores 4-7, CSMT enabled, 2GB VRAM',
        apply: (prev) => ({
            ...prev,
            box64Preset: 'INTERMEDIATE',
            cpuList: '4,5,6,7',
            cpuListWoW64: '4,5,6,7',
            csmt: true,
            videoMemorySize: '2048',
            offScreenRenderingMode: 'fbo',
        }),
    },
    {
        id: 'compatibility-safe',
        label: 'Safe Compatibility',
        desc: 'Box64 & Box86 Safe presets, Strict Shader Math, Unrestricted Cores',
        apply: (prev) => ({
            ...prev,
            box64Preset: 'SAFE',
            box86Preset: 'SAFE',
            csmt: false,
            strictShaderMath: true,
            cpuList: '',
            cpuListWoW64: '',
        }),
    },
];

// --- MAIN APP ---

export default function App() {
    const [rawJson, setRawJson] = useState("");
    const [config, setConfig] = useState<ContainerConfig | null>(null);
    const [activeTab, setActiveTab] = useState('general');
    const [isImporting, setIsImporting] = useState(true);
    const [error, setError] = useState("");
    const [showGuide, setShowGuide] = useState(true);
    const [exported, setExported] = useState(false);
    const [copiedJson, setCopiedJson] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [presetFeedback, setPresetFeedback] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const headerFileInputRef = useRef<HTMLInputElement>(null);

    const converterUrl = "/config-converter";

    const handleFileLoad = (file: File) => {
        if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
            setError("Please upload a valid .json container file.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            if (content) {
                setRawJson(content);
                try {
                    const parsed = JSON.parse(content);
                    const data = { ...(parsed.config || parsed) };
                    if (!data.id) {
                        data.id = String(parsed.containerName || 'config');
                    }
                    const containerName = parsed.containerName || data.name || file.name.replace(/\.json$/i, '');

                    if (data.dxwrapperConfig) {
                        try {
                            const dxConfig = parseKV(data.dxwrapperConfig);
                            const syncedValue = dxConfig.gpuName || dxConfig.renderer || "";
                            dxConfig.renderer = syncedValue;
                            dxConfig.gpuName = syncedValue;
                            data.dxwrapperConfig = stringifyKV(dxConfig);
                        } catch {}
                    }

                    setConfig({ ...data, containerName });
                    setIsImporting(false);
                    setRawJson("");
                    setError("");
                } catch {
                    setError("File loaded into editor box. Click Load Config to review.");
                }
            }
        };
        reader.readAsText(file);
    };

    const applyPreset = (preset: SmartPreset) => {
        if (!config) return;
        const updated = preset.apply(config);
        setConfig(updated);
        setPresetFeedback(`Applied "${preset.label}" preset!`);
        setTimeout(() => setPresetFeedback(null), 3000);
    };

    const validationWarnings = useMemo(() => {
        if (!config) return [];
        const warns: { type: 'warning' | 'info'; text: string; tab: string }[] = [];
        if (config.box64Preset === 'SAFE') {
            warns.push({
                type: 'warning',
                text: 'Box64 Preset is set to SAFE. While this improves compatibility for stubborn titles, it severely limits 3D framerates. Switch to PERFORMANCE unless resolving specific crashes.',
                tab: 'emulation',
            });
        }
        if (!config.cpuList || config.cpuList.trim() === '') {
            warns.push({
                type: 'info',
                text: 'No CPU core affinity specified. Wine will schedule threads across all available system cores dynamically.',
                tab: 'advanced',
            });
        }
        if (!config.executablePath || config.executablePath.trim() === '') {
            warns.push({
                type: 'warning',
                text: 'Executable path is empty. Specify the game .exe path (e.g. game.exe) to launch.',
                tab: 'general',
            });
        }
        if (config.wow64Mode && config.box64Preset === 'SAFE') {
            warns.push({
                type: 'warning',
                text: 'WoW64 mode paired with SAFE Box64 preset may trigger high CPU latency.',
                tab: 'emulation',
            });
        }
        return warns;
    }, [config]);

    useEffect(() => {
        document.documentElement.classList.add('dark');
        // Background is now handled by the gradient in the div
        document.body.style.colorScheme = 'dark';
        
        // Check localStorage for guide visibility
        const guideHidden = localStorage.getItem('configEditorGuideHidden');
        if (guideHidden === 'true') {
            setShowGuide(false);
        }

        // Check for pending config from Community Browser
        const pendingConfig = localStorage.getItem('pendingConfig');
        if (pendingConfig) {
            try {
                const parsed = JSON.parse(pendingConfig);
                const data = { ...(parsed.config || parsed) };
                if (!data.id) {
                    data.id = String(parsed.containerName || 'config');
                }
                const containerName = parsed.containerName || data.name || "Community Config";
                
                if (data.dxwrapperConfig) {
                    try {
                        const dxConfig = parseKV(data.dxwrapperConfig);
                        const syncedValue = dxConfig.gpuName || dxConfig.renderer || "";
                        dxConfig.renderer = syncedValue;
                        dxConfig.gpuName = syncedValue;
                        data.dxwrapperConfig = stringifyKV(dxConfig);
                    } catch {}
                }

                setConfig({ ...data, containerName });
                setIsImporting(false);
                localStorage.removeItem('pendingConfig');
            } catch (e) {
                console.error('Failed to load pending config:', e);
                localStorage.removeItem('pendingConfig');
            }
        }
    }, []);

    const handleHideGuide = () => {
        setShowGuide(false);
        localStorage.setItem('configEditorGuideHidden', 'true');
    };

    const handleImport = () => {
        try {
            const parsed = JSON.parse(rawJson);
            const data = { ...(parsed.config || parsed) };
            if (!data.id) {
                data.id = String(parsed.containerName || 'config');
            }

            const containerName = parsed.containerName || data.name || "Imported Config";

            if (data.dxwrapperConfig) {
                const dxConfig = parseKV(data.dxwrapperConfig);
                const syncedValue = dxConfig.gpuName || dxConfig.renderer || "";
                dxConfig.renderer = syncedValue;
                dxConfig.gpuName = syncedValue;
                data.dxwrapperConfig = stringifyKV(dxConfig);
            }

            setConfig({ ...data, containerName });
            setIsImporting(false);
            setRawJson(""); // Clear the input after successful import
            setError("");
        } catch (e: any) {
            setError("Failed to parse JSON.");
        }
    };

    const updateField = (key: string, value: any) => {
        if (!config) return;
        setConfig({ ...config, [key]: value });
    };

    const updateNestedKV = (rootKey: string, subKey: string, value: string) => {
        if (!config) return;
        const current = parseKV(config[rootKey]);
        current[subKey] = value;
        updateField(rootKey, stringifyKV(current));
    };

    const handleExport = () => {
        if (!config) return;
        const { containerName, ...innerConfig } = config;
        const final = {
            version: 1,
            exportedFrom: "WebEditor",
            timestamp: Date.now(),
            containerName: containerName,
            config: innerConfig
        };
        const blob = new Blob([JSON.stringify(final, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${config.id || 'config'}_export.json`;
        a.click();
        setExported(true);
        setTimeout(() => setExported(false), 2500);
    };

    const handleCopyJson = async () => {
        if (!config) return;
        const { containerName, ...innerConfig } = config;
        const final = {
            version: 1,
            exportedFrom: "WebEditor",
            timestamp: Date.now(),
            containerName: containerName,
            config: innerConfig
        };
        await copyToClipboard(JSON.stringify(final, null, 2));
        setCopiedJson(true);
        setTimeout(() => setCopiedJson(false), 2500);
    };

    const tabs = [
        { id: 'general', label: 'General', icon: Settings, desc: "Container identity and basic runtime." },
        { id: 'graphics', label: 'Graphics', icon: Monitor, desc: "Drivers, layers, and visual tweaks." },
        { id: 'emulation', label: 'Emulation', icon: Cpu, desc: "Translation engines and presets." },
        { id: 'controller', label: 'Controller', icon: Gamepad2, desc: "Input APIs and compatibility." },
        { id: 'wine', label: 'Wine', icon: Wine, desc: "Registry and hardware spoofing." },
        { id: 'components', label: 'Win Components', icon: Layers, desc: "Windows DLL implementation overrides." },
        { id: 'environment', label: 'Environment', icon: Terminal, desc: "System-level environment variables." },
        { id: 'drives', label: 'Drives', icon: HardDrive, desc: "Android-to-Windows drive mapping." },
        { id: 'advanced', label: 'Advanced', icon: Zap, desc: "CPU affinity and startup modes." },
        { id: 'hidden', label: 'Hidden', icon: Fingerprint, desc: "Manage identifiers and specialized flags." },
    ];

    if (isImporting) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-slate-100 flex items-center justify-center p-4 selection:bg-blue-600 selection:text-white">
            <Card className="max-w-2xl w-full p-10 bg-slate-900/30">
            <div className="flex items-center gap-5 mb-10">
            <div className="p-4 bg-blue-600 rounded-2xl text-white shadow-2xl shadow-blue-500/20">
            <FileCode size={36} />
            </div>
            <div>
            <h1 className="text-3xl font-black text-white tracking-tight uppercase italic">GameNative</h1>
            <p className="text-slate-600 font-bold text-[10px] uppercase tracking-[0.3em]">Configuration Editor</p>
            </div>
            </div>

            <div className="space-y-6">
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleFileLoad(file);
              }}
              className={`relative transition-all rounded-xl ${
                isDragging ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900 bg-blue-950/20' : ''
              }`}
            >
            <textarea
            className="w-full h-80 p-6 font-mono text-[11px] bg-slate-950 border border-slate-900 rounded-xl outline-none focus:border-blue-500/50 transition-all resize-none"
            placeholder="Paste Container JSON or drag-and-drop a .json file here..."
            value={rawJson}
            onChange={(e) => setRawJson(e.target.value)}
            style={{ 
              caretColor: 'white',
              color: rawJson ? 'transparent' : 'rgb(148 163 184)'
            }}
            />
            {rawJson && (
            <div className="absolute inset-0 p-6 font-mono text-[11px] pointer-events-none overflow-auto rounded-xl">
            <JsonHighlight json={rawJson} />
            </div>
            )}
            </div>
            {error && <div className="text-red-500 text-[10px] font-black uppercase tracking-widest italic">{error}</div>}
            <div className="flex flex-col gap-8">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleImport}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-xl transition-all uppercase text-xs tracking-[0.2em] active:scale-95 shadow-xl shadow-blue-900/20"
              >
                Load Config
              </button>

              <input
                type="file"
                ref={fileInputRef}
                accept=".json,application/json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileLoad(file);
                }}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-black rounded-xl transition-all uppercase text-xs tracking-[0.15em] flex items-center justify-center gap-2 active:scale-95"
              >
                <Upload size={16} />
                Open File
              </button>
            </div>

            {/* Mini Guide */}
            {showGuide && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-4 relative">
            <button
                onClick={handleHideGuide}
                className="absolute top-4 right-4 p-1 text-slate-600 hover:text-slate-400 transition-colors"
                title="Hide this guide"
            >
                <X size={16} />
            </button>
            <h3 className="text-sm font-black text-slate-100 uppercase tracking-tight pr-8">How to Get a Config</h3>
            <ol className="text-[11px] text-slate-400 space-y-2 list-decimal list-inside">
            <li>Go to <a href="https://gamenative.app/compatibility/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">GameNative Compatibility List</a></li>
            <li>Select a report for the game you want</li>
            <li>Click <span className="text-slate-200 font-bold">"View Config"</span></li>
            <li>Copy everything inside the popup</li>
            <li>Paste into the <a href={converterUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">Config Converter</a></li>
            <li>Convert it and copy the JSON output</li>
            <li>Paste the JSON here and click <span className="text-slate-200 font-bold">"Load Config"</span></li>
            </ol>
            </div>
            )}

            </div>
            </div>
            </Card>
            </div>
        );
    }

    const currentTab = tabs.find(t => t.id === activeTab);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
        <header className="bg-gray-900/80 border-b border-slate-900 sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-black italic shadow-lg">GN</div>
        <h1 className="font-black text-white tracking-tighter text-lg uppercase italic">GameNative Config Editor</h1>
        </div>
        <div className="flex gap-1 sm:gap-3">
        <a
        href={converterUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Convert Raw Config"
        className="p-3 text-slate-600 hover:text-blue-400 transition-colors"
        >
        <RefreshCw size={18} />
        </a>
        <input
          type="file"
          ref={headerFileInputRef}
          accept=".json,application/json"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileLoad(file);
          }}
          className="hidden"
        />
        <button
          onClick={() => headerFileInputRef.current?.click()}
          className="p-3 text-slate-600 hover:text-blue-400 transition-colors"
          title="Open config .json file"
        >
          <FolderOpen size={18} />
        </button>
        <button onClick={() => setIsImporting(true)} className="p-3 text-slate-600 hover:text-white transition-colors" title="Import JSON"><Upload size={18} /></button>
        <button
          onClick={handleCopyJson}
          className={`${
            copiedJson
              ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          } text-white px-4 py-2.5 rounded font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 shadow-lg flex items-center gap-1.5`}
          title="Copy configuration JSON to clipboard"
        >
          {copiedJson ? '✓ Copied successfully!' : 'Copy JSON'}
        </button>
        <button
          onClick={handleExport}
          className={`${
            exported
              ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30'
              : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/10'
          } text-white px-6 py-2.5 rounded font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 shadow-lg flex items-center gap-1.5`}
        >
          {exported ? '✓ Exported successfully!' : 'Export JSON'}
        </button>
        </div>
        </div>
        <div className="max-w-7xl mx-auto px-8">
        <nav className="flex overflow-x-auto no-scrollbar scroll-smooth gap-2">
        {tabs.map((tab) => (
            <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-5 border-b-2 text-[10px] font-black uppercase tracking-[0.15em] whitespace-nowrap transition-all ${
                activeTab === tab.id ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-600 hover:text-slate-400'
            }`}
            >
            {tab.label}
            </button>
        ))}
        </nav>
        </div>
        </header>

        <main className="flex-1 p-8 md:p-16 lg:px-24">
        <div className="max-w-4xl mx-auto">

        {/* Quick Presets Bar */}
        <div className="mb-8 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-blue-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Quick Presets:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {SMART_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-blue-600/20 hover:border-blue-500/50 border border-slate-700/60 text-slate-200 hover:text-blue-300 text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                title={p.desc}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Preset Feedback Notification */}
        {presetFeedback && (
          <div className="mb-6 p-3 rounded-xl bg-blue-950/60 border border-blue-500/40 text-blue-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <Sparkles size={14} className="text-blue-400" />
            <span>{presetFeedback}</span>
          </div>
        )}

        {/* Sanity Validation Alerts */}
        {validationWarnings.length > 0 && (
          <div className="mb-8 space-y-2">
            {validationWarnings.map((warn, i) => (
              <div
                key={i}
                className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${
                  warn.type === 'warning'
                    ? 'bg-amber-950/30 border-amber-800/50 text-amber-200'
                    : 'bg-blue-950/30 border-blue-800/50 text-blue-200'
                }`}
              >
                {warn.type === 'warning' ? (
                  <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                ) : (
                  <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="leading-relaxed">{warn.text}</p>
                </div>
                {warn.tab && (
                  <button
                    onClick={() => setActiveTab(warn.tab)}
                    className="text-[10px] uppercase font-black tracking-widest underline opacity-80 hover:opacity-100"
                  >
                    Go to {warn.tab}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mb-12 border-l-2 border-blue-600 pl-6 py-1">
        <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic">{currentTab?.label}</h2>
        <p className="text-slate-600 text-[10px] font-black mt-2 uppercase tracking-[0.2em]">{currentTab?.desc}</p>
        </div>

        <div className="divide-y divide-slate-900">
        {activeTab === 'general' && config && (
            <>
            <Select label="Container Variant" value={config.containerVariant} options={['glibc', 'bionic']} onChange={(v: any) => updateField('containerVariant', v)} />
            <InputField label="Wine Version" value={config.wineVersion} onChange={(v: any) => updateField('wineVersion', v)} />
            <InputField label="Executable Path" value={config.executablePath} onChange={(v: any) => updateField('executablePath', v)} placeholder="e.g. SlayTheSpire.exe" />
            <InputField label="Exec Arguments" value={config.execArgs} onChange={(v: any) => updateField('execArgs', v)} placeholder="-windowed -skipintro" />
            <InputField label="Language" value={config.language} onChange={(v: any) => updateField('language', v)} />
            <InputField label="Screen Size" value={config.screenSize} onChange={(v: any) => updateField('screenSize', v)} />
            <Select label="Audio Driver" value={config.audioDriver || 'pulseaudio'} options={['pulseaudio', 'alsa', 'disabled']} onChange={(v: any) => updateField('audioDriver', v)} />
            <Toggle label="Show FPS" checked={config.showFPS} onChange={(v: any) => updateField('showFPS', v)} />
            <Toggle label="Force DLC" checked={config.forceDlc} onChange={(v: any) => updateField('forceDlc', v)} />
            <Toggle label="Use Legacy DRM" checked={config.useLegacyDRM} onChange={(v: any) => updateField('useLegacyDRM', v)} />
            <Toggle label="Launch Steam Client (Beta)" checked={config.launchRealSteam} onChange={(v: any) => updateField('launchRealSteam', v)} />
            <Select label="Steam Type" value={config.steamType || 'normal'} options={['normal', 'light', 'ultralight']} onChange={(v: any) => updateField('steamType', v)} />
            </>
        )}

        {activeTab === 'graphics' && config && (
            <>
            <Select
            label="Graphics Driver"
            value={config.graphicsDriver}
            options={config.containerVariant === 'glibc' ? [
                { value: 'vortek', label: 'Vortek (Universal)' },
                                                { value: 'turnip', label: 'Turnip (Adreno)' },
                                                { value: 'virgl', label: 'VirGL (Universal)' },
                                                { value: 'adreno', label: 'Adreno (Adreno)' },
                                                { value: 'sd-8-elite', label: 'SD 8 Elite (SD 8 Elite)' }
            ] : ['Wrapper', 'Wrapper-v2', 'Wrapper-leegao', 'Wrapper-legacy']}
            onChange={(v: any) => updateField('graphicsDriver', v)}
            />
            <InputField label="Driver Version" value={config.graphicsDriverVersion || parseKV(config.graphicsDriverConfig).version || ''} onChange={(v: any) => { updateField('graphicsDriverVersion', v); updateNestedKV('graphicsDriverConfig', 'version', v); }} />
            <InputField label="DX Wrapper" value={config.dxwrapper} onChange={(v: any) => updateField('dxwrapper', v)} />
            {config.dxwrapper === 'dxvk' && <InputField label="DXVK Version" value={parseKV(config.dxwrapperConfig).version || ''} onChange={(v: any) => updateNestedKV('dxwrapperConfig', 'version', v)} />}

            {!(config.containerVariant === 'glibc' && (config.graphicsDriver === 'turnip' || config.graphicsDriver === 'virgl')) && (
                <>
                {config.containerVariant === 'glibc' && <Select label="Vulkan Version" value={parseKV(config.graphicsDriverConfig).vulkanVersion || '1.3'} options={['1.0', '1.1', '1.2', '1.3']} onChange={(v: any) => updateNestedKV('graphicsDriverConfig', 'vulkanVersion', v)} />}
                <InputField label="Exposed Extensions" value={parseKV(config.graphicsDriverConfig).exposedDeviceExtensions || 'all'} onChange={(v: any) => updateNestedKV('graphicsDriverConfig', 'exposedDeviceExtensions', v)} />
                {config.containerVariant === 'glibc' && <Select label="Image Cache Size" value={parseKV(config.graphicsDriverConfig).imageCacheSize || '256'} options={['64', '128', '256', '512']} onChange={(v: any) => updateNestedKV('graphicsDriverConfig', 'imageCacheSize', v)} />}
                <Select label="Max Device Memory" value={parseKV(config.graphicsDriverConfig).maxDeviceMemory || '0'} options={[{value: '0', label: 'Unlimited'}, '512', '1024', '2048', '4096', '8192']} onChange={(v: any) => updateNestedKV('graphicsDriverConfig', 'maxDeviceMemory', v)} />
                </>
            )}

            {config.containerVariant === 'bionic' && (
                <>
                <Toggle label="Adrenotools Turnip" description="Unreported by GameNative" checked={(parseKV(config.graphicsDriverConfig).adrenotoolsTurnip ?? '1') === '1'} onChange={(v: any) => updateNestedKV('graphicsDriverConfig', 'adrenotoolsTurnip', v ? '1' : '0')} />
                <Select label="Present Modes" value={parseKV(config.graphicsDriverConfig).presentMode || 'mailbox'} options={['Never', 'mailbox', 'Normal', 'fifo', 'Always', 'immediate', 'relaxed']} onChange={(v: any) => updateNestedKV('graphicsDriverConfig', 'presentMode', v)} />
                <Select label="Memory Resource" value={parseKV(config.graphicsDriverConfig).resourceType || 'ato'} options={[{value: 'ato', label: 'auto'}, 'dmabuf', 'ahb', 'opaque']} onChange={(v: any) => updateNestedKV('graphicsDriverConfig', 'resourceType', v)} />
                <Select label="BCn Emulation" value={parseKV(config.graphicsDriverConfig).bcnEmulation || 'auto'} options={['none', 'partial', 'full', 'auto']} onChange={(v: any) => updateNestedKV('graphicsDriverConfig', 'bcnEmulation', v)} />
                <Select label="BCn Emulation Type" value={parseKV(config.graphicsDriverConfig).bcnEmulationType || 'software'} options={['software']} onChange={(v: any) => updateNestedKV('graphicsDriverConfig', 'bcnEmulationType', v)} />
                <Toggle label="BCn Emulation Cache" checked={parseKV(config.graphicsDriverConfig).bcnEmulationCache === '1'} onChange={(v: any) => updateNestedKV('graphicsDriverConfig', 'bcnEmulationCache', v ? '1' : '0')} />
                <Toggle label="Disable present_wait" checked={parseKV(config.graphicsDriverConfig).disablePresentWait === '1'} onChange={(v: any) => updateNestedKV('graphicsDriverConfig', 'disablePresentWait', v ? '1' : '0')} />
                <Toggle label="Sync Every Frame" checked={parseKV(config.graphicsDriverConfig).syncFrame === '1'} onChange={(v: any) => updateNestedKV('graphicsDriverConfig', 'syncFrame', v ? '1' : '0')} />
                <Select label="Sharpness Boost" value={config.sharpnessEffect || 'None'} options={[{ value: 'None', label: 'None' }, { value: 'CAS', label: 'CAS - Clear/Natural' }, { value: 'DLS', label: 'DLS - Extra Sharp' }]} onChange={(v: any) => updateField('sharpnessEffect', v)} />
                </>
            )}
            <Toggle label="Use DRI3" checked={config.useDRI3} onChange={(v: any) => updateField('useDRI3', v)} />
            </>
        )}

        {activeTab === 'emulation' && config && (
            <>
            {config.containerVariant === 'glibc' ? (
                <>
                <InputField label="Box64 Version" description="Wrongly Reported" value={config.box64Version} onChange={(v: any) => updateField('box64Version', v)} />
                <Select label="Box64 Preset" value={config.box64Preset} options={BOX64_BOX86_PRESETS} onChange={(v: any) => updateField('box64Preset', v)} />
                </>
            ) : (
                <>
                <InputField label="FEXCore Version" value={config.fexcoreVersion} onChange={(v: any) => updateField('fexcoreVersion', v)} />
                <Select label="64-bit Emulator" value={config.wineVersion.includes('arm64ec') ? 'FEXCore' : 'Box64'} options={['FEXCore', 'Box64']} disabled={true} />
                <Select label="32-bit Emulator" value={config.emulator} options={['FEXCore', 'Box64']} onChange={(v: any) => updateField('emulator', v)} />
                <InputField label="Box64 Version" description="Wrongly Reported" value={config.box64Version} onChange={(v: any) => updateField('box64Version', v)} />
                <Select label="Box64 Preset" value={config.box64Preset} options={BOX64_BOX86_PRESETS} onChange={(v: any) => updateField('box64Preset', v)} />
                <Select label="FEXCore Preset" value={config.fexcorePreset} options={FEXCORE_PRESETS} onChange={(v: any) => updateField('fexcorePreset', v)} />
                </>
            )}
            </>
        )}

        {activeTab === 'controller' && config && (
            <>
            <Toggle label="SDL Controller API" checked={config.sdlControllerAPI} onChange={(v: any) => updateField('sdlControllerAPI', v)} />
            <Toggle label="Enable XInput" description="Unreported by GameNative" checked={config.enableXInput} onChange={(v: any) => updateField('enableXInput', v)} />
            <Toggle label="Enable DirectInput" description="Unreported by GameNative" checked={config.enableDInput} onChange={(v: any) => updateField('enableDInput', v)} />
            <Select label="DInput Mapper" value={config.dinputMapperType} options={[{ value: 1, label: 'Standard' }, { value: 2, label: 'XInput Mapper' }]} onChange={(v: any) => updateField('dinputMapperType', parseInt(v))} />
            <Toggle label="Disable Mouse" checked={config.disableMouseInput} onChange={(v: any) => updateField('disableMouseInput', v)} />
            <Toggle label="Touchscreen Mode" checked={config.touchscreenMode} onChange={(v: any) => updateField('touchscreenMode', v)} />
            </>
        )}

        {/* TAB 5: WINE (SYNCED RENDERER & GPU NAME) */}
        {activeTab === 'wine' && config && (
            <>
            <InputField
            label="Renderer"
            value={parseKV(config.dxwrapperConfig).renderer || ''}
            onChange={(v: any) => {
                const c = parseKV(config.dxwrapperConfig);
                c.renderer = v;
                c.gpuName = v;
                updateField('dxwrapperConfig', stringifyKV(c));
            }}
            />
            <InputField
            label="GPU Name"
            value={parseKV(config.dxwrapperConfig).gpuName || ''}
            onChange={(v: any) => {
                const c = parseKV(config.dxwrapperConfig);
                c.renderer = v;
                c.gpuName = v;
                updateField('dxwrapperConfig', stringifyKV(c));
            }}
            />
            <Select label="Offscreen Mode" value={config.offScreenRenderingMode || 'fbo'} options={['fbo', 'backbuffer']} onChange={(v: any) => updateField('offScreenRenderingMode', v)} />
            <Select label="Video Memory" value={config.videoMemorySize || '2048'} options={['32', '64', '128', '256', '512', '1024', '2048', '4096', '6144', '8192', '10240', '12288']} onChange={(v: any) => updateField('videoMemorySize', v)} />
            <Toggle label="Enable CSMT" description="Wrongly Reported" checked={(parseKV(config.dxwrapperConfig).csmt ?? '1') === '1'} onChange={(v: any) => updateNestedKV('dxwrapperConfig', 'csmt', v ? '1' : '0')} />
            <Toggle label="Strict Shader Math" checked={parseKV(config.dxwrapperConfig).strictShaderMath === '1'} onChange={(v: any) => updateNestedKV('dxwrapperConfig', 'strictShaderMath', v ? '1' : '0')} />
            <Select label="Mouse Warp" value={config.mouseWarpOverride || 'disable'} options={['enable', 'disable', 'force']} onChange={(v: any) => updateField('mouseWarpOverride', v)} />
            </>
        )}

        {activeTab === 'components' && config && (
            Object.entries(parseKV(config.wincomponents)).map(([name, val]) => (
                <Select
                key={name}
                label={name}
                value={val}
                options={[{ value: "0", label: "Builtin (Wine)" }, { value: "1", label: "Native (Windows)" }]}
                onChange={(v: string) => { const c = parseKV(config.wincomponents); c[name] = v; updateField('wincomponents', stringifyKV(c)); }}
                />
            ))
        )}

        {activeTab === 'environment' && config && (
            <div className="pt-4 space-y-4">
            {parseEnv(config.envVars).map((env, idx) => (
                <div key={idx} className="flex gap-4 items-center">
                <div className="flex-1 flex flex-col gap-0">
                <input className="bg-transparent text-slate-100 text-sm font-bold uppercase tracking-tighter outline-none" value={env.name} onChange={(e) => { const arr = parseEnv(config.envVars); arr[idx].name = e.target.value; updateField('envVars', stringifyEnv(arr)); }} />
                <input className="bg-transparent text-slate-500 text-[10px] font-mono outline-none" value={env.value} onChange={(e) => { const arr = parseEnv(config.envVars); arr[idx].value = e.target.value; updateField('envVars', stringifyEnv(arr)); }} />
                </div>
                <button onClick={() => { const arr = parseEnv(config.envVars).filter((_, i) => i !== idx); updateField('envVars', stringifyEnv(arr)); }} className="p-2 text-red-900 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                </div>
            ))}
            <button onClick={() => { const arr = [...parseEnv(config.envVars), { name: 'VAR_NAME', value: 'value' }]; updateField('envVars', stringifyEnv(arr)); }} className="flex items-center gap-2 text-[10px] font-black text-blue-500 uppercase tracking-widest mt-8 hover:text-blue-400"><Plus size={14} /> Add New Variable</button>
            </div>
        )}

        {activeTab === 'drives' && config && (
            <div className="pt-4 space-y-6">
            {parseDrives(config.drives).map((drive, idx) => (
                <div key={idx} className="flex gap-4 items-center group">
                <div className="flex-1 flex flex-col gap-0">
                <span className="text-sm font-bold text-slate-100 uppercase italic tracking-tighter">Drive {drive.letter}:</span>
                <input
                className="bg-transparent text-slate-500 text-xs font-mono outline-none hover:text-blue-400 transition-colors"
                value={drive.path}
                onChange={(e) => {
                    const arr = parseDrives(config.drives);
                    arr[idx].path = e.target.value;
                    updateField('drives', stringifyDrives(arr));
                }}
                />
                </div>
                <button
                onClick={() => {
                    const arr = parseDrives(config.drives).filter((_, i) => i !== idx);
                    updateField('drives', stringifyDrives(arr));
                }}
                className="p-2 text-red-900 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                <Trash2 size={16} />
                </button>
                </div>
            ))}
            <button
            onClick={() => {
                const currentDrives = parseDrives(config.drives);
                const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
                const usedLetters = currentDrives.map(d => d.letter.toUpperCase());
                const nextLetter = letters.find(l => !usedLetters.includes(l)) || "Z";

                const arr = [...currentDrives, { letter: nextLetter, path: "/storage/emulated/0/" }];
                updateField('drives', stringifyDrives(arr));
            }}
            className="flex items-center gap-2 text-[10px] font-black text-blue-500 uppercase tracking-widest mt-8 hover:text-blue-400"
            >
            <Plus size={14} />
            Add New Drive
            </button>
            </div>
        )}

        {activeTab === 'advanced' && config && (
            <>
            <Select
            label="Startup Selection"
            value={config.startupSelection}
            options={[
                { value: 0, label: 'Normal (Load all services)' },
                                                { value: 1, label: 'Essential (Load only essential services)' },
                                                { value: 2, label: 'Aggressive (Stop services on startup)' }
            ].filter(opt => config.containerVariant === 'glibc' || opt.value !== 2)}
            onChange={(v: any) => updateField('startupSelection', parseInt(v))}
            />
            <CPUGrid label="Affinity (64-bit)" selected={config.cpuList} onChange={(v: string) => updateField('cpuList', v)} />
            <CPUGrid label="Affinity (WoW64)" selected={config.cpuListWoW64} onChange={(v: string) => updateField('cpuListWoW64', v)} />
            </>
        )}

        {/* TAB 10: HIDDEN */}
        {activeTab === 'hidden' && config && (
            <>
            <InputField
            label="Container Name"
            value={config.containerName || ''}
            onChange={(v: any) => updateField('containerName', v)}
            placeholder="e.g. Imported Config"
            description="Display name for this container configuration."
            />
            <InputField
            label="Container Identifier (ID)"
            value={config.id}
            onChange={(v: any) => updateField('id', v)}
            description="Unique internal ID used for file system paths and reference."
            />
            <InputField
            label="Internal Profile Name"
            value={config.name}
            onChange={(v: any) => updateField('name', v)}
            description="Secondary internal name identifier used by the engine."
            />
            <InputField
            label="MIDI SoundFont Path"
            value={config.midiSoundFont || ''}
            onChange={(v: any) => updateField('midiSoundFont', v)}
            placeholder="/path/to/soundfont.sf2"
            description="Optional path to a custom .sf2 file for MIDI music processing."
            />
            <Toggle
            label="Allow Steam Client Updates"
            checked={config.allowSteamUpdates}
            onChange={(v: any) => updateField('allowSteamUpdates', v)}
            description="Toggle the ability for a real Steam client to pull updates."
            />
            <Select
            label="Sharpness Denoise Level"
            value={config.sharpnessDenoise || '100'}
            options={['0', '25', '50', '75', '100']}
            onChange={(v: any) => updateField('sharpnessDenoise', parseInt(v))}
            description="Denoising intensity used by the sharpness filter boost."
            />
            <InputField
            label="Box86 Version"
            value={config.box86Version || ''}
            onChange={(v: any) => updateField('box86Version', v)}
            placeholder="e.g. 0.3.2"
            description="Version for the 32-bit x86 emulator engine."
            />
            <Select
            label="Box86 Preset"
            value={config.box86Preset || 'COMPATIBILITY'}
            options={BOX64_BOX86_PRESETS.slice(0, 4)}
            onChange={(v: any) => updateField('box86Preset', v)}
            description="Optimization profile for the 32-bit Box86 engine."
            />
            <Toggle
            label="Enable WoW64"
            checked={config.wow64Mode}
            onChange={(v: any) => updateField('wow64Mode', v)}
            description="Enable Windows-on-Windows 64-bit mode for running 32-bit apps on 64-bit Wine."
            />
            </>
        )}
        </div>
        </div>
        </main>

        <footer className="bg-gray-900/80 border-t border-slate-900 py-8 px-10 flex justify-between items-center text-[10px] text-slate-800 font-black uppercase tracking-[0.4em] backdrop-blur-sm">
        <span>GameNative Editor</span>
        <span className="font-mono text-slate-900">{config?.id}</span>
        </footer>
        </div>
    );
}
