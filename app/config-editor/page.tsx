'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
    Fingerprint
} from 'lucide-react';

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

const parseKV = (str: string): Record<string, string> => {
    if (!str) return {};
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

// --- MAIN APP ---

export default function App() {
    const [rawJson, setRawJson] = useState("");
    const [config, setConfig] = useState<ContainerConfig | null>(null);
    const [activeTab, setActiveTab] = useState('general');
    const [isImporting, setIsImporting] = useState(true);
    const [error, setError] = useState("");

    const converterUrl = "https://andreisugu.github.io/gamenative-config-tools/config-converter";

    useEffect(() => {
        document.documentElement.classList.add('dark');
        document.body.style.backgroundColor = '#020617';
        document.body.style.colorScheme = 'dark';
    }, []);

    const handleImport = () => {
        try {
            const parsed = JSON.parse(rawJson);
            const data = parsed.config || parsed;
            if (!data.id) throw new Error("Invalid configuration.");

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
            <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 selection:bg-blue-600 selection:text-white">
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
            <textarea
            className="w-full h-80 p-6 font-mono text-[11px] bg-slate-950 border border-slate-900 rounded-xl outline-none focus:border-blue-500/50 transition-all resize-none text-slate-400"
            placeholder="Paste Container JSON..."
            value={rawJson}
            onChange={(e) => setRawJson(e.target.value)}
            />
            {error && <div className="text-red-500 text-[10px] font-black uppercase tracking-widest italic">{error}</div>}
            <div className="flex flex-col gap-8">
            <button onClick={handleImport} className="bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-xl transition-all uppercase text-xs tracking-[0.2em] active:scale-95 shadow-xl shadow-blue-900/20">Load Config</button>

            <div className="text-center border-t border-slate-900 pt-8">
            <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest mb-3 italic">Only have a raw config string?</p>
            <a
            href={converterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[10px] text-blue-500 hover:text-blue-400 font-black uppercase tracking-widest transition-colors group"
            >
            Open Config Converter
            <ExternalLink size={12} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
            </div>
            </div>
            </div>
            </Card>
            </div>
        );
    }

    const currentTab = tabs.find(t => t.id === activeTab);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
        <header className="bg-slate-950 border-b border-slate-900 sticky top-0 z-50">
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
        <button onClick={() => setIsImporting(true)} className="p-3 text-slate-600 hover:text-white transition-colors" title="Import JSON"><Upload size={18} /></button>
        <button onClick={handleExport} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 shadow-lg shadow-blue-900/10">Export JSON</button>
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
                <Toggle label="Adrenotools Turnip" checked={(parseKV(config.graphicsDriverConfig).adrenotoolsTurnip ?? '1') === '1'} onChange={(v: any) => updateNestedKV('graphicsDriverConfig', 'adrenotoolsTurnip', v ? '1' : '0')} />
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
                <InputField label="Box64 Version" value={config.box64Version} onChange={(v: any) => updateField('box64Version', v)} />
                <Select label="Box64 Preset" value={config.box64Preset} options={BOX64_BOX86_PRESETS} onChange={(v: any) => updateField('box64Preset', v)} />
                </>
            ) : (
                <>
                <InputField label="FEXCore Version" value={config.fexcoreVersion} onChange={(v: any) => updateField('fexcoreVersion', v)} />
                <Select label="64-bit Emulator" value={config.wineVersion.includes('arm64ec') ? 'FEXCore' : 'Box64'} options={['FEXCore', 'Box64']} disabled={true} />
                <Select label="32-bit Emulator" value={config.emulator} options={['FEXCore', 'Box64']} onChange={(v: any) => updateField('emulator', v)} />
                <InputField label="Box64 Version" value={config.box64Version} onChange={(v: any) => updateField('box64Version', v)} />
                <Select label="Box64 Preset" value={config.box64Preset} options={BOX64_BOX86_PRESETS} onChange={(v: any) => updateField('box64Preset', v)} />
                <Select label="FEXCore Preset" value={config.fexcorePreset} options={FEXCORE_PRESETS} onChange={(v: any) => updateField('fexcorePreset', v)} />
                </>
            )}
            </>
        )}

        {activeTab === 'controller' && config && (
            <>
            <Toggle label="SDL Controller API" checked={config.sdlControllerAPI} onChange={(v: any) => updateField('sdlControllerAPI', v)} />
            <Toggle label="Enable XInput" checked={config.enableXInput} onChange={(v: any) => updateField('enableXInput', v)} />
            <Toggle label="Enable DirectInput" checked={config.enableDInput} onChange={(v: any) => updateField('enableDInput', v)} />
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
            <Toggle label="Enable CSMT" checked={config.csmt} onChange={(v: any) => updateField('csmt', v)} />
            <Toggle label="Strict Shader Math" checked={config.strictShaderMath} onChange={(v: any) => updateField('strictShaderMath', v)} />
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

        <footer className="bg-slate-950 border-t border-slate-900 py-8 px-10 flex justify-between items-center text-[10px] text-slate-800 font-black uppercase tracking-[0.4em]">
        <span>GameNative Editor</span>
        <span className="font-mono text-slate-900">{config?.id}</span>
        </footer>
        </div>
    );
}
