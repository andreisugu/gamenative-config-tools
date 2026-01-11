import initSqlJs, { Database } from 'sql.js';
import { APP_CONFIG } from './appConfig';

let sqlPromise: Promise<any> | null = null;
let dbInstance: Database | null = null;

export interface GameConfig {
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

export interface FilterSnapshot {
  games: Array<{ id: number; name: string }>;
  gpus: string[];
  devices: Array<{ name: string; model: string }>;
  updatedAt: string;
}

// Initialize SQL.js once
async function initSQL() {
  if (!sqlPromise) {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || APP_CONFIG.BASE_PATH;
    sqlPromise = initSqlJs({
      locateFile: (file) => `${basePath}/${file}`
    });
  }
  return sqlPromise;
}

// Load and cache the database
async function loadDatabase(basePath: string = ''): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  const SQL = await initSQL();
  const dbPath = basePath ? `${basePath}/cached-configs.sqlite` : '/cached-configs.sqlite';
  const response = await fetch(dbPath);
  
  if (!response.ok) {
    throw new Error(`Failed to load SQLite database: ${response.status}`);
  }
  
  const buffer = await response.arrayBuffer();
  dbInstance = new SQL.Database(new Uint8Array(buffer));
  
  if (!dbInstance) {
    throw new Error('Failed to initialize database');
  }
  
  return dbInstance;
}

// Build a configs object from the flattened row data
function buildConfigsObject(row: any): any {
  const configs: any = {};
  
  // Extract all configs_* columns and build nested object
  const configColumns = [
    'id', 'name', 'drives', 'lc_all', 'cpuList', 'envVars', 'showFPS', 'execArgs',
    'language', 'rcfileId', 'dxwrapper', 'inputType', 'steamType', 'wow64Mode',
    'screenSize', 'audioDriver', 'box64Preset', 'box86Preset', 'installPath',
    'box64Version', 'box86Version', 'cpuListWoW64', 'desktopTheme', 'midiSoundFont',
    'wincomponents', 'executablePath', 'graphicsDriver', 'needsUnpacking',
    'dxwrapperConfig', 'launchRealSteam', 'dinputMapperType', 'sdlControllerAPI',
    'startupSelection', 'controllerMapping', 'disableMouseInput', 'primaryController',
    'emulateKeyboardMouse', 'graphicsDriverVersion', 'touchscreenMode',
    'allowSteamUpdates', 'graphicsDriverConfig', 'useDRI3', 'emulator', 'forceDlc',
    'wineVersion', 'useLegacyDRM', 'fexcorePreset', 'fexcoreVersion',
    'containerVariant'
  ];
  
  for (const col of configColumns) {
    const key = `configs_${col}`;
    if (row[key] !== null && row[key] !== undefined) {
      configs[col] = row[key];
    }
  }
  
  // Handle extraData nested object
  const extraData: any = {};
  const extraDataColumns = [
    'dxwrapper', 'appVersion', 'imgVersion', 'audioDriver', 'desktopTheme',
    'wincomponents', 'config_changed', 'graphicsDriver', 'startupSelection',
    'emulateKeyboardMouse', 'discord_support_prompt_shown', 'graphicsDriverAdreno',
    'box64Version', 'fexcoreVersion', 'sharpnessLevel', 'sharpnessEffect',
    'sharpnessDenoise', 'lastInstalledMainWrapper', 'profileId', 'wineprefixNeedsUpdate'
  ];
  
  for (const col of extraDataColumns) {
    const key = `configs_extraData_${col}`;
    if (row[key] !== null && row[key] !== undefined) {
      extraData[col] = row[key];
    }
  }
  
  // Handle controller emulation bindings
  const controllerBindings: any = {};
  const buttons = ['A', 'B', 'X', 'Y', 'L1', 'L2', 'L3', 'R1', 'R2', 'R3', 'START', 'SELECT', 
                   'DPAD_UP', 'DPAD_DOWN', 'DPAD_LEFT', 'DPAD_RIGHT'];
  
  for (const button of buttons) {
    const key = `configs_controllerEmulationBindings_${button}`;
    if (row[key] !== null && row[key] !== undefined) {
      controllerBindings[button] = row[key];
    }
    
    // Also check extraData version
    const extraKey = `configs_extraData_controllerEmulationBindings_${button}`;
    if (row[extraKey] !== null && row[extraKey] !== undefined) {
      extraData[`controllerEmulationBindings_${button}`] = row[extraKey];
    }
  }
  
  if (Object.keys(controllerBindings).length > 0) {
    configs.controllerEmulationBindings = controllerBindings;
  }
  
  if (Object.keys(extraData).length > 0) {
    configs.extraData = extraData;
  }
  
  // Handle sessionMetadata
  if (row.configs_sessionMetadata_avg_fps !== null || row.configs_sessionMetadata_session_length_sec !== null) {
    configs.sessionMetadata = {
      avg_fps: row.configs_sessionMetadata_avg_fps,
      session_length_sec: row.configs_sessionMetadata_session_length_sec
    };
  }
  
  return configs;
}

// Transform SQLite row to GameConfig format
function transformRow(row: any): GameConfig {
  const configs = buildConfigsObject(row);
  
  // Parse tags if present
  let tags = null;
  if (row.tags) {
    try {
      const parsed = JSON.parse(row.tags);
      tags = Array.isArray(parsed) ? parsed : null;
    } catch (e) {
      tags = null;
    }
  }
  
  // Parse numeric fields
  const avgFps = row.avg_fps !== null && row.avg_fps !== '' ? parseFloat(row.avg_fps) : 0;
  const sessionLength = row.session_length_sec !== null && row.session_length_sec !== '' ? parseFloat(row.session_length_sec) : null;
  
  return {
    id: row.id,
    rating: row.rating || 0,
    avg_fps: avgFps,
    notes: row.notes,
    configs: configs,
    created_at: row.created_at,
    app_version: row.configs_extraData_appVersion || null,
    tags: tags,
    session_length_sec: sessionLength,
    configs_id: row.configs_id || null,
    configs_executablePath: row.configs_executablePath || null,
    game: row.game_name ? {
      id: row.game_id,
      name: row.game_name
    } : null,
    device: row.device_model ? {
      id: row.device_id,
      model: row.device_model,
      gpu: row.device_gpu || '',
      android_ver: row.device_android_ver || ''
    } : null
  };
}

// Fetch all configs from SQLite database
export async function fetchAllConfigs(basePath: string = ''): Promise<GameConfig[]> {
  const db = await loadDatabase(basePath);
  
  // Query all data with joins to games and devices tables
  const query = `
    SELECT 
      d.*,
      g.name as game_name,
      dev.model as device_model,
      dev.gpu as device_gpu,
      dev.android_ver as device_android_ver
    FROM data d
    LEFT JOIN games g ON d.game_id = g.id
    LEFT JOIN devices dev ON d.device_id = dev.id
  `;
  
  const result = db.exec(query);
  
  if (result.length === 0) {
    return [];
  }
  
  const columns = result[0].columns;
  const values = result[0].values;
  
  // Transform rows to GameConfig objects
  const configs: GameConfig[] = [];
  for (const valueRow of values) {
    const row: any = {};
    columns.forEach((col, i) => {
      row[col] = valueRow[i];
    });
    
    configs.push(transformRow(row));
  }
  
  return configs;
}

// Fetch filter snapshot data from SQLite database
export async function fetchFilterSnapshot(basePath: string = ''): Promise<FilterSnapshot> {
  const db = await loadDatabase(basePath);
  
  // Get all games
  const gamesResult = db.exec('SELECT id, name FROM games ORDER BY name');
  const games = gamesResult.length > 0 
    ? gamesResult[0].values.map(row => ({ id: row[0] as number, name: row[1] as string }))
    : [];
  
  // Get unique GPUs from devices
  const gpusResult = db.exec('SELECT DISTINCT gpu FROM devices WHERE gpu IS NOT NULL AND gpu != "" AND gpu != "Unknown" ORDER BY gpu');
  const gpus = gpusResult.length > 0 
    ? gpusResult[0].values.map(row => row[0] as string)
    : [];
  
  // Get unique devices
  const devicesResult = db.exec('SELECT DISTINCT name, model FROM devices WHERE model IS NOT NULL ORDER BY name');
  const devices = devicesResult.length > 0 
    ? devicesResult[0].values.map(row => ({ name: row[0] as string || row[1] as string, model: row[1] as string }))
    : [];
  
  return {
    games,
    gpus,
    devices,
    updatedAt: new Date().toISOString()
  };
}

// Close the database connection
export function closeDatabase() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
