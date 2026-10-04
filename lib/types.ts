/**
 * Type definitions for the GameNative Worker API (api.gamenative.app)
 * and GameNative Android Import/Export specifications.
 */

// ── Devices API ───────────────────────────────────────────────────────

export interface Device {
  id: number;
  model: string;
  gpu: string | null;
  androidVer: string | null;
  soc?: string | null;
}

export interface DevicesResponse {
  devices: Device[];
}

// ── Games Search API ──────────────────────────────────────────────────

export interface GameSuggestion {
  id: number;
  name: string;
}

export interface GamesSearchResponse {
  games: GameSuggestion[];
}

// ── Configurations and Runs ───────────────────────────────────────────

export interface GameRunConfigExtraData {
  box64Version?: string;
  fexcoreVersion?: string;
  dxwrapper?: string;
  graphicsDriver?: string;
  audioDriver?: string;
  appVersion?: string;
  imgVersion?: string;
  wincomponents?: string;
  desktopTheme?: string;
  config_changed?: string;
  startupSelection?: string;
  fexcorePreset?: string;
  sharpnessEffect?: string;
  sharpnessLevel?: string;
  sharpnessDenoise?: string;
  appliedWineVersion?: string;
  appliedContainerVariant?: string;
  [key: string]: string | undefined;
}

export interface GameRunConfigs {
  id?: string;
  name?: string;
  drives?: string;
  lc_all?: string;
  cpuList?: string;
  envVars?: string;
  showFPS?: boolean;
  useDRI3?: boolean;
  emulator?: string;
  execArgs?: string;
  forceDlc?: boolean;
  language?: string;
  rcfileId?: number;
  dxwrapper?: string;
  extraData?: GameRunConfigExtraData;
  inputType?: number;
  steamType?: string;
  wow64Mode?: boolean;
  screenSize?: string;
  audioDriver?: string;
  box64Preset?: string;
  box86Preset?: string;
  installPath?: string;
  shooterMode?: boolean;
  unpackFiles?: boolean;
  wineVersion?: string;
  box64Version?: string;
  box86Version?: string;
  configSource?: string;
  cpuListWoW64?: string;
  desktopTheme?: string;
  portraitMode?: boolean;
  sfCompatMode?: boolean;
  useLegacyDRM?: boolean;
  fexcorePreset?: string;
  midiSoundFont?: string;
  suspendPolicy?: string;
  wincomponents?: string;
  graphicsDriver?: string;
  graphicsDriverConfig?: string;
  controllerEmulationBindings?: Record<string, string>;
  [key: string]: any;
}

export interface CompatibilityRun {
  id: number;
  gameId?: number;
  deviceId?: number;
  rating: number;
  avgFps?: number | null;
  tags?: string[] | null;
  notes?: string | null;
  store?: string | null;
  createdAt?: string | null;
  appVersion?: string | null;
  gameName?: string | null;
  game?: {
    id?: number;
    name: string;
  } | null;
  device?: Device | null;
  configs: GameRunConfigs | null;
}

export interface CompatibilityResponse {
  runs: CompatibilityRun[];
  total: number;
  page?: number;
  pageSize?: number;
}

export interface CompatibilityParams {
  gameId?: number;
  deviceId?: number;
  gpu?: string;
  ratingMin?: number;
  sort?: 'created_at' | 'rating' | 'avg_fps';
  dir?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// ── GameNative Export Schema ──────────────────────────────────────────

export interface GameNativeExport {
  version: number;
  exportedFrom: string;
  timestamp: number;
  containerName: string;
  config: GameRunConfigs;
}
