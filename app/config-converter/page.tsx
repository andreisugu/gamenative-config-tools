'use client';

import { useState, useRef, useEffect } from 'react';

// TypeScript interface for the Config object
interface Config {
  [key: string]: string | number | boolean | object | null | undefined;
  controllerEmulationBindings?: { [key: string]: string };
}

interface ExportData {
  version: number;
  exportedFrom: string;
  timestamp: number;
  containerName: string;
  config: Config;
}

const BUTTON_INDEX_MAP: { [key: string]: string } = {
  "A": "0", "B": "1", "X": "2", "Y": "3",
  "L1": "4", "R1": "5", "SELECT": "6", "START": "7",
  "MENU": "8", "L2": "9", "R2": "10", "L3": "11",
  "R3": "12", "DPAD UP": "13", "DPAD DOWN": "14",
  "DPAD LEFT": "15", "DPAD RIGHT": "16"
};

const BUTTON_KEYS = new Set(Object.keys(BUTTON_INDEX_MAP));

const EXCLUDED_KEYS = new Set([
  "avg fps", "session length sec", "appVersion", 
  "imgVersion", "config changed", "discord support prompt shown", 
  "profileId"
]);

const STRING_ONLY_KEYS = new Set([
  "wineVersion", "box86Version", "box64Version", "fexcoreVersion", 
  "graphicsDriverVersion", "graphicsDriverConfig", "dxwrapperConfig", "id"
]);

const STEAM_ID_PREFIX = "STEAM_";
const NUMERIC_APP_ID_PATTERN = /^\d+$/;

const KNOWN_KEYS = new Set([
  "id", "name", "drives", "lc all", "cpuList", "envVars", "showFPS", 
  "useDRI3", "emulator", "execArgs", "forceDlc", "language", "rcfileId", 
  "dxwrapper", "extraData", "profileId", "appVersion", "imgVersion", 
  "audioDriver", "box64Version", "desktopTheme", "wincomponents", 
  "config changed", "fexcoreVersion", "graphicsDriver", "sharpnessLevel", 
  "sharpnessEffect", "sharpnessDenoise", "startupSelection", "graphicsDriverAdreno",
  "lastInstalledMainWrapper", "discord support prompt shown", "inputType", 
  "steamType", "wow64Mode", "screenSize", "box64Preset", "box86Preset", 
  "installPath", "wineVersion", "box86Version", "cpuListWoW64", "useLegacyDRM", 
  "fexcorePreset", "midiSoundFont", "executablePath", "needsUnpacking", 
  "dxwrapperConfig", "launchRealSteam", "sessionMetadata", "avg fps", 
  "session length sec", "touchscreenMode", "containerVariant", "dinputMapperType", 
  "sdlControllerAPI", "allowSteamUpdates", "controllerMapping", "disableMouseInput", 
  "primaryController", "emulateKeyboardMouse", "graphicsDriverConfig", 
  "graphicsDriverVersion", "controllerEmulationBindings"
]);

function parseValue(value: string, key: string): string | number | boolean | object | null {
  const trimmedValue = value.trim();
  
  // Handle drives: remove all whitespace per spec
  if (key === "drives") {
    return trimmedValue.replace(/\s+/g, '');
  }
  
  // Handle extraData and sessionMetadata: parse as JSON objects
  if (key === "extraData" || key === "sessionMetadata") {
    if (trimmedValue === "" || trimmedValue === "null") {
      return null;
    }
    try {
      return JSON.parse(trimmedValue);
    } catch (e) {
      return null;
    }
  }
  
  // Skip conversion for version-related keys
  if (key && STRING_ONLY_KEYS.has(key)) {
    return trimmedValue;
  }
  
  // Convert "true" to boolean true
  if (trimmedValue === 'true') {
    return true;
  }
  
  // Convert "false" to boolean false
  if (trimmedValue === 'false') {
    return false;
  }
  
  // Check if it's a number
  if (/^-?\d+(\.\d+)?$/.test(trimmedValue)) {
    const numValue = Number(trimmedValue);
    if (!isNaN(numValue) && isFinite(numValue)) {
      return numValue;
    }
  }
  
  return trimmedValue;
}

function convertToJSON(inputText: string): Config {
  const lines = inputText.split('\n').filter(line => line.trim() !== '');
  
  if (lines.length === 0) {
    throw new Error('Input is empty. Please provide key-value pairs.');
  }
  
  const config: Config = {};
  const bindings: { [key: string]: string } = {};
  let i = 0;
  
  while (i < lines.length) {
    const currentLine = lines[i].trim();
    
    // Skip "Configs" header if accidentally copied
    if (currentLine.toLowerCase() === 'configs') {
      i++;
      continue;
    }
    
    // Check if current line is a button key
    if (BUTTON_KEYS.has(currentLine)) {
      const buttonKey = currentLine;
      const buttonIndex = BUTTON_INDEX_MAP[buttonKey];
      
      if (buttonIndex === undefined) {
        i++;
        continue;
      }
      
      const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : undefined;
      const nextLineIsKnownKey = nextLine !== undefined && KNOWN_KEYS.has(nextLine);
      const nextLineIsButtonKey = nextLine !== undefined && BUTTON_KEYS.has(nextLine);
      
      if (nextLine === undefined || nextLineIsKnownKey || nextLineIsButtonKey) {
        bindings[buttonIndex] = "";
        i++;
      } else {
        bindings[buttonIndex] = String(parseValue(nextLine, buttonKey));
        i += 2;
      }
    }
    // Check if current line is a known key
    else if (KNOWN_KEYS.has(currentLine)) {
      const key = currentLine;
      
      if (EXCLUDED_KEYS.has(key)) {
        const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : undefined;
        const nextLineIsKnownKey = nextLine !== undefined && KNOWN_KEYS.has(nextLine);
        const nextLineIsButtonKey = nextLine !== undefined && BUTTON_KEYS.has(nextLine);
        
        if (nextLine === undefined || nextLineIsKnownKey || nextLineIsButtonKey) {
          i++;
        } else {
          i += 2;
        }
      } else {
        let configKey = key;
        if (key === "lc all") {
          configKey = "lc_all";
        }
        
        const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : undefined;
        const nextLineIsKnownKey = nextLine !== undefined && KNOWN_KEYS.has(nextLine);
        const nextLineIsButtonKey = nextLine !== undefined && BUTTON_KEYS.has(nextLine);
        
        if (nextLine === undefined || nextLineIsKnownKey || nextLineIsButtonKey) {
          config[configKey] = parseValue("", key);
          i++;
        } else {
          config[configKey] = parseValue(nextLine, key);
          i += 2;
        }
      }
    } else {
      throw new Error(`Unknown key "${currentLine}" at position ${i + 1}.`);
    }
  }
  
  // Add bindings to config if any were collected
  if (Object.keys(bindings).length > 0) {
    config.controllerEmulationBindings = bindings;
  }
  
  return config;
}

async function fetchSteamGameName(appId: string): Promise<string | null> {
  try {
    const proxies = [
      `https://api.allorigins.win/raw?url=`,
      `https://corsproxy.io/?`,
    ];
    
    const apiUrl = `https://store.steampowered.com/api/appdetails?appids=${appId}`;
    
    for (const proxy of proxies) {
      try {
        const response = await fetch(proxy + encodeURIComponent(apiUrl));
        if (!response.ok) continue;
        
        const data = await response.json();
        
        if (!data || typeof data !== 'object') {
          console.warn(`Invalid response from proxy ${proxy}`);
          continue;
        }
        
        if (data[appId] && 
            typeof data[appId] === 'object' &&
            data[appId].success === true && 
            data[appId].data && 
            typeof data[appId].data === 'object' &&
            typeof data[appId].data.name === 'string') {
          const gameName = data[appId].data.name;
          const sanitized = gameName
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
          return sanitized;
        }
      } catch (proxyError) {
        console.warn(`Proxy ${proxy} failed:`, proxyError);
        continue;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Failed to fetch Steam game name:', error);
    return null;
  }
}

async function getContainerName(config: Config): Promise<string> {
  let containerName = "Imported Config";
  
  if (config.id && typeof config.id === 'string' && config.id.startsWith(STEAM_ID_PREFIX)) {
    const appId = config.id.slice(STEAM_ID_PREFIX.length);
    
    if (appId && NUMERIC_APP_ID_PATTERN.test(appId)) {
      const gameName = await fetchSteamGameName(appId);
      if (gameName) {
        containerName = gameName;
      }
    }
  }
  
  return containerName;
}

// Component to render JSON with syntax highlighting
function JsonHighlight({ json }: { json: string }) {
  const highlightJson = (jsonString: string) => {
    // Regex patterns for different JSON elements
    const patterns = [
      { pattern: /"([^"]+)":/g, className: 'text-cyan-400' }, // Keys
      { pattern: /:\s*"([^"]*)"/g, className: 'text-green-400' }, // String values
      { pattern: /:\s*(true|false)/g, className: 'text-orange-400' }, // Booleans
      { pattern: /:\s*(-?\d+\.?\d*)/g, className: 'text-yellow-400' }, // Numbers
      { pattern: /:\s*(null)/g, className: 'text-purple-400' }, // Null
    ];

    // Split JSON into lines for processing
    const lines = jsonString.split('\n');
    
    return lines.map((line, lineIndex) => {
      const parts: JSX.Element[] = [];
      let lastIndex = 0;
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
        
        lastIndex = keyEnd;
        
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
        else if (valuePart.match(/^\s*-?\d+\.?\d*/)) {
          const numMatch = /^\s*(-?\d+\.?\d*)/g.exec(valuePart);
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
        parts.push(<span key={`${lineIndex}-plain`} className="text-gray-400">{line}</span>);
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

export default function ConfigConverterPage() {
  const [inputText, setInputText] = useState('');
  const [jsonPreview, setJsonPreview] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [convertSteamId, setConvertSteamId] = useState(false);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleConvert = async () => {
    setError('');
    setSuccess('');
    setIsConverting(true);
    
    try {
      const jsonData = convertToJSON(inputText);
      const containerName = convertSteamId ? await getContainerName(jsonData) : "Imported Config";
      
      const finalOutput: ExportData = {
        version: 1,
        exportedFrom: "GameNative",
        timestamp: Date.now(),
        containerName: containerName,
        config: jsonData
      };
      
      const jsonString = JSON.stringify(finalOutput, null, 2);
      setJsonPreview(jsonString);
      setSuccess('Configuration converted successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during conversion');
      setJsonPreview('');
    } finally {
      setIsConverting(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!jsonPreview) {
      setError('No JSON to copy. Please convert your configuration first.');
      return;
    }
    
    try {
      await navigator.clipboard.writeText(jsonPreview);
      setCopySuccess(true);
      
      // Clear any existing timeout
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      
      // Set new timeout
      copyTimeoutRef.current = setTimeout(() => {
        setCopySuccess(false);
        copyTimeoutRef.current = null;
      }, 2000);
    } catch (err) {
      setError('Failed to copy to clipboard. Please try again.');
      console.error('Copy failed:', err);
    }
  };

  const handleDownload = async () => {
    setError('');
    setSuccess('');
    setIsConverting(true);
    
    try {
      const jsonData = convertToJSON(inputText);
      const containerName = convertSteamId ? await getContainerName(jsonData) : "Imported Config";
      
      const finalOutput: ExportData = {
        version: 1,
        exportedFrom: "GameNative",
        timestamp: Date.now(),
        containerName: containerName,
        config: jsonData
      };
      
      const jsonString = JSON.stringify(finalOutput, null, 2);
      setJsonPreview(jsonString);
      
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'config.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setSuccess('JSON file downloaded successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during conversion');
      setJsonPreview('');
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 protected-gradient-title">
                GameNative Config Converter
              </h1>
              <p className="text-gray-400 text-sm">
                Converts raw configurations into usable game configurations
              </p>
            </div>
            <div className="flex gap-3">
              <a
                href="https://gamenative.app/compatibility/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 protected-button-green text-white font-semibold rounded-lg shadow-lg shadow-green-500/30 transition-all transform hover:scale-105 active:scale-95 whitespace-nowrap"
              >
                Compatibility List
              </a>
              <a
                href="https://diffcheck.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 protected-button-cyan text-white font-semibold rounded-lg shadow-lg shadow-cyan-500/30 transition-all transform hover:scale-105 active:scale-95 whitespace-nowrap"
              >
                DiffCheck.io
              </a>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-gray-800/50 border-l-4 border-cyan-500 p-4 rounded-lg mb-6 backdrop-blur-sm">
          <h3 className="text-cyan-400 font-semibold mb-2">How to use:</h3>
          <p className="text-gray-300 text-sm leading-relaxed">
            Copy the config of the game you want by clicking "View Config" on a report you want and selecting all the text inside the popout. 
            Then paste the text in here and click convert.<br />
            <span className="text-gray-400 text-xs mt-1 inline-block">
              Note: Configuration format is key-value pairs on separate lines (Line N = Key, Line N+1 = Value). 
              Values like <code className="bg-gray-900 px-1 py-0.5 rounded text-orange-400">true</code>/
              <code className="bg-gray-900 px-1 py-0.5 rounded text-orange-400">false</code> will be converted to booleans, 
              and numeric strings will be converted to numbers.
            </span>
          </p>
        </div>

        {/* Main Content - Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Input Section */}
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-cyan-400 mb-2">
              Input Configuration
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="wineVersion&#10;8.0&#10;graphicsDriverAdreno&#10;turnip&#10;showFPS&#10;true&#10;envVars&#10;WINE_DEBUG=warn"
              autoComplete="off"
              className="flex-1 min-h-[500px] p-4 bg-gray-900/80 border-2 border-gray-700 rounded-lg font-mono text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all resize-none backdrop-blur-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleDownload();
                }
              }}
            />
          </div>

          {/* JSON Preview Section */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-cyan-400">
                JSON Preview
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={convertSteamId}
                    onChange={(e) => setConvertSteamId(e.target.checked)}
                    className="w-4 h-4 text-cyan-500 bg-gray-900 border-gray-600 rounded focus:ring-cyan-500 focus:ring-2 cursor-pointer"
                  />
                  <span className="ml-2 text-xs text-gray-300 group-hover:text-gray-100 transition-colors whitespace-nowrap">
                    Convert Steam ID
                  </span>
                </label>
                <button
                  onClick={handleCopyToClipboard}
                  disabled={!jsonPreview}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
                    copySuccess 
                      ? 'bg-green-600 text-white' 
                      : 'protected-button-cyan text-white shadow-md shadow-cyan-500/20'
                  }`}
                  title={jsonPreview ? 'Copy JSON to clipboard' : 'Convert configuration first'}
                >
                  {copySuccess ? '✓ Copied!' : 'Copy to Clipboard'}
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-[500px] max-h-[500px] p-4 bg-gray-900/80 border-2 border-gray-700 rounded-lg overflow-auto backdrop-blur-sm">
              <pre className="font-mono text-sm whitespace-pre-wrap break-words">
                {jsonPreview ? (
                  <JsonHighlight json={jsonPreview} />
                ) : (
                  <span className="text-gray-600">
                    JSON output will appear here after conversion...
                  </span>
                )}
              </pre>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={handleConvert}
            disabled={isConverting}
            className="px-6 py-3 protected-button-cyan text-white font-semibold rounded-lg shadow-lg shadow-cyan-500/30 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isConverting ? 'Converting...' : 'Preview JSON'}
          </button>
          <button
            onClick={handleDownload}
            disabled={isConverting}
            className="px-6 py-3 protected-button-blue-purple text-white font-semibold rounded-lg shadow-lg shadow-blue-500/30 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isConverting ? 'Converting...' : 'Convert & Download'}
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-900/30 border border-red-500 text-red-300 p-4 rounded-lg mb-4 backdrop-blur-sm">
            <span className="font-semibold">Error:</span> {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-900/30 border border-green-500 text-green-300 p-4 rounded-lg backdrop-blur-sm">
            {success}
          </div>
        )}
      </div>
    </div>
  );
}
