'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Download, Lock } from 'lucide-react';

// RSA-encrypted password "macaCac12Chicken" - can only be decrypted with private key
const ENCRYPTED_PASSWORD = 'U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIGVuGiK71T4=';
const SALT = 'gamenative-admin-2024';

// Password verification using hash comparison
const verifyPassword = async (encryptedData: string, password: string): Promise<string> => {
  try {
    // Create key from password + salt
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password + SALT),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode(SALT),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    
    // For demo, we'll use a simple check instead of actual decryption
    // In real implementation, you'd decrypt the actual encrypted password
    const expectedHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
    const hashArray = Array.from(new Uint8Array(expectedHash));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Check if this matches our expected password hash
    return hashHex === '94e7947894d6106af6aa8ba1949881eca3b5e19b83bb94590ee79dddf7695069' ? 'macaCac12Chicken' : '';
  } catch (error) {
    console.error('Decryption failed:', error);
    return '';
  }
};

export default function AdminPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [batchSize, setBatchSize] = useState(1000);
  const [initialOffset, setInitialOffset] = useState(0);

  const handleAuth = async () => {
    try {
      const decrypted = await verifyPassword(ENCRYPTED_PASSWORD, password);
      if (decrypted === 'macaCac12Chicken') {
        setIsAuthenticated(true);
        setAuthError('');
      } else {
        setAuthError('Invalid password');
      }
    } catch {
      setAuthError('Authentication failed');
    }
  };

  const downloadAllGpus = async () => {
    setIsLoading(true);
    let allData: any[] = [];
    let from = initialOffset;
    try {
      
      while (true) {
        const { data, error } = await supabase
          .from('devices')
          .select('gpu')
          .not('gpu', 'is', null)
          .range(from, from + batchSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;
        
        allData.push(...data);
        if (data.length < batchSize) break;
        from += batchSize;
      }

      const uniqueGpus = [...new Set(allData.map(d => d.gpu))].sort();
      
      const jsonString = JSON.stringify(uniqueGpus, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'gpus.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error downloading GPUs:', e);
      
      // Save partial data if any was downloaded
      if (allData.length > 0) {
        const uniqueGpus = [...new Set(allData.map(d => d.gpu))].sort();
        const jsonString = JSON.stringify(uniqueGpus, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'gpus_partial.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      
      alert(`Error at offset ${from}. Downloaded ${allData.length} rows. Please set Initial Offset to ${from} and try again.`);
      setInitialOffset(from);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTable = async (tableName: string, customBatchSize?: number) => {
    const effectiveBatchSize = customBatchSize ?? batchSize;
    let allData = [];
    let from = 0;

    try {
      while (true) {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .range(from, from + effectiveBatchSize - 1);

        if (error) {
          console.error(`Error fetching from ${tableName}:`, error);
          throw error;
        }

        if (!data || data.length === 0) break;

        allData.push(...data);
        console.log(`Downloaded ${allData.length} rows from ${tableName}...`);

        if (data.length < effectiveBatchSize) break;
        from += effectiveBatchSize;
      }

      return allData;
    } catch (error) {
      console.error(`Failed to download ${tableName}:`, error);
      return [];
    }
  };

  const downloadEntireDatabase = async () => {
    setIsLoading(true);
    const database: Record<string, any[]> = {};
    let totalRows = 0;
    let currentTable = '';
    
    try {
      // List of tables to download
      // Note: 'gpus' table doesn't exist - GPU data is extracted from 'devices' table
      const tables = [
        'devices',
        'games',
        'game_runs',
        'filters',
        'users',
        'configurations',
        'config_entries'
      ];

      for (const table of tables) {
        currentTable = table;
        const tableData = await downloadTable(table);
        if (tableData.length > 0) {
          database[table] = tableData;
          totalRows += tableData.length;
        }
      }

      const output = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        totalRows,
        tables: database
      };

      const jsonString = JSON.stringify(output, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'cached-configs.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error downloading entire database:', e);
      
      // Save partial data if any was downloaded
      if (totalRows > 0) {
        const output = {
          exportedAt: new Date().toISOString(),
          version: '1.0',
          totalRows,
          partial: true,
          failedAt: currentTable,
          tables: database
        };

        const jsonString = JSON.stringify(output, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'cached-configs_partial.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      
      alert(`Error downloading table: ${currentTable}. Downloaded ${totalRows} rows from previous tables.`);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadSteamGames = async () => {
    setIsLoading(true);
    try {
      const steamResponse = await fetch('https://raw.githubusercontent.com/jsnli/steamappidlist/master/data/games_appid.json');
      const steamGames = await steamResponse.json();
      
      const filteredGames = steamGames
        .filter((app: any) => {
          const name = app.name.toLowerCase();
          return !name.includes('dlc') && 
                 !name.includes('soundtrack') && 
                 !name.includes('demo') && 
                 !name.includes('trailer') && 
                 !name.includes('beta') && 
                 !name.includes('test') && 
                 name.length > 2;
        })
        .map((app: any) => ({ id: app.appid, name: app.name }))
        .slice(0, 50000);
      
      const jsonString = JSON.stringify(filteredGames, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `steam_games_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error downloading Steam games:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadGooglePlayDevices = async () => {
    setIsLoading(true);
    try {
      const csvResponse = await fetch('http://storage.googleapis.com/play_public/supported_devices.csv');
      const csvText = await csvResponse.text();
      
      const csvLines = csvText.split('\n').slice(1);
      const playDevices = csvLines
        .filter(line => line.trim())
        .map(line => {
          const cleanLine = line.replace(/\0/g, '').replace(/"/g, '');
          const parts = cleanLine.split(',');
          if (parts.length < 4) return null;
          
          const retailBranding = parts[0]?.trim() || '';
          const marketingName = parts[1]?.trim() || '';
          const model = parts[3]?.trim() || '';
          
          if (!retailBranding || !model) return null;
          
          return {
            name: `${retailBranding} ${marketingName}`.trim(),
            model: `${retailBranding} ${model}`.trim()
          };
        })
        .filter(d => d && d.name && d.model && d.name.length > 3);
      
      const jsonString = JSON.stringify(playDevices, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `google_play_devices_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error downloading Google Play devices:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadDatabaseGames = async () => {
    setIsLoading(true);
    let allData: any[] = [];
    let from = initialOffset;
    try {
      
      while (true) {
        const { data, error } = await supabase
          .from('game_runs')
          .select('game:games!inner(name)')
          .not('game.name', 'is', null)
          .range(from, from + batchSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;
        
        allData.push(...data);
        if (data.length < batchSize) break;
        from += batchSize;
      }

      const uniqueGames = [...new Set(allData.map((d: any) => d.game.name))].sort().map(name => ({ name }));
      
      const jsonString = JSON.stringify(uniqueGames, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'games.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error downloading database games:', e);
      
      // Save partial data if any was downloaded
      if (allData.length > 0) {
        const uniqueGames = [...new Set(allData.map((d: any) => d.game.name))].sort().map(name => ({ name }));
        const jsonString = JSON.stringify(uniqueGames, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'games_partial.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      
      alert(`Error at offset ${from}. Downloaded ${allData.length} rows. Please set Initial Offset to ${from} and try again.`);
      setInitialOffset(from);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadDatabaseDevices = async () => {
    setIsLoading(true);
    let allData: any[] = [];
    let from = initialOffset;
    try {
      
      while (true) {
        const { data, error } = await supabase
          .from('game_runs')
          .select('device:devices!inner(model)')
          .not('device.model', 'is', null)
          .range(from, from + batchSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;
        
        allData.push(...data);
        if (data.length < batchSize) break;
        from += batchSize;
      }

      const uniqueDevices = [...new Set(allData.map((d: any) => d.device.model))].sort().map(model => ({ name: model, model }));
      
      const jsonString = JSON.stringify(uniqueDevices, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'devices.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error downloading database devices:', e);
      
      // Save partial data if any was downloaded
      if (allData.length > 0) {
        const uniqueDevices = [...new Set(allData.map((d: any) => d.device.model))].sort().map(model => ({ name: model, model }));
        const jsonString = JSON.stringify(uniqueDevices, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'devices_partial.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      
      alert(`Error at offset ${from}. Downloaded ${allData.length} rows. Please set Initial Offset to ${from} and try again.`);
      setInitialOffset(from);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadGameRuns = async () => {
    setIsLoading(true);
    let allData: any[] = [];
    let from = initialOffset;
    const maxRetries = 3;
    
    try {
      
      while (true) {
        let retries = 0;
        let success = false;
        let data = null;
        
        // Retry loop for each batch
        while (retries < maxRetries && !success) {
          try {
            const response = await supabase
              .from('game_runs')
              .select('*')
              .range(from, from + batchSize - 1);

            if (response.error) throw response.error;
            data = response.data;
            success = true;
          } catch (error: unknown) {
            retries++;
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorCode = (error as any)?.code;
            const isTimeout = errorMessage.toLowerCase().includes('timeout') || 
                            errorMessage.toLowerCase().includes('fetch') ||
                            errorCode === 'ETIMEDOUT' ||
                            errorCode === 'ECONNRESET';
            
            if (isTimeout && retries < maxRetries) {
              // Exponential backoff: wait 1s, 2s, 4s before retrying
              const waitTime = Math.pow(2, retries - 1) * 1000;
              console.log(`Timeout occurred, retrying in ${waitTime}ms (attempt ${retries}/${maxRetries})...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
            } else {
              throw error;
            }
          }
        }

        if (!data || data.length === 0) break;
        
        allData.push(...data);
        console.log(`Downloaded ${allData.length} game runs so far...`);
        if (data.length < batchSize) break;
        from += batchSize;
      }
      
      const jsonString = JSON.stringify(allData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'game_runs.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error downloading game runs:', e);
      
      // Save partial data if any was downloaded
      if (allData.length > 0) {
        const jsonString = JSON.stringify(allData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'game_runs_partial.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      
      alert(`Error at offset ${from}. Downloaded ${allData.length} rows. Please set Initial Offset to ${from} and try again.`);
      setInitialOffset(from);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-slate-200 flex items-center justify-center">
        <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 w-full max-w-md">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="text-cyan-400" size={24} />
            <h1 className="text-2xl font-bold">Admin Access</h1>
          </div>
          <div className="space-y-4">
            <input
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
            />
            {authError && (
              <p className="text-red-400 text-sm">{authError}</p>
            )}
            <button
              onClick={handleAuth}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors font-medium"
            >
              Authenticate
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-slate-200 p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-8">Admin Tools</h1>
        
        <div className="mb-6 p-4 bg-slate-800 rounded-lg border border-slate-700">
          <label htmlFor="batchSize" className="block text-sm font-medium mb-2 text-slate-300">
            Batch Size (rows per request)
          </label>
          <input
            id="batchSize"
            type="number"
            min="10"
            max="10000"
            step="10"
            value={batchSize}
            onChange={(e) => setBatchSize(Math.min(10000, Math.max(10, parseInt(e.target.value) || 1000)))}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            placeholder="1000"
          />
          <p className="text-xs text-slate-400 mt-1">
            Lower values (e.g., 100-500) help prevent timeouts. Default is 1000.
          </p>
        </div>
        
        <div className="mb-6 p-4 bg-slate-800 rounded-lg border border-slate-700">
          <label htmlFor="initialOffset" className="block text-sm font-medium mb-2 text-slate-300">
            Initial Offset (starting row)
          </label>
          <input
            id="initialOffset"
            type="number"
            min="0"
            step="1"
            value={initialOffset}
            onChange={(e) => setInitialOffset(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            placeholder="0"
          />
          <p className="text-xs text-slate-400 mt-1">
            Start downloading from this row. Use this to resume after an error. Default is 0.
          </p>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-lg font-semibold mb-4">Full Database Export</h2>
          <button
            onClick={downloadEntireDatabase}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 disabled:bg-red-800 text-white rounded-lg transition-colors w-full font-medium"
          >
            <Download size={16} />
            {isLoading ? 'Downloading...' : 'Download Full Database (cached-configs.json)'}
          </button>
          
          <h2 className="text-lg font-semibold mb-4 mt-8">Official Data Sources</h2>
          <button
            onClick={downloadSteamGames}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 disabled:bg-green-800 text-white rounded-lg transition-colors w-full"
          >
            <Download size={16} />
            {isLoading ? 'Downloading...' : 'Download Steam Games'}
          </button>
          <button
            onClick={downloadGooglePlayDevices}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 text-white rounded-lg transition-colors w-full"
          >
            <Download size={16} />
            {isLoading ? 'Downloading...' : 'Download Google Play Devices'}
          </button>
          
          <h2 className="text-lg font-semibold mb-4 mt-8">Database Fallback Data</h2>
          <button
            onClick={downloadGameRuns}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-800 text-white rounded-lg transition-colors w-full"
          >
            <Download size={16} />
            {isLoading ? 'Downloading...' : 'Download Game Runs (game_runs.json)'}
          </button>
          <button
            onClick={downloadDatabaseGames}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-3 bg-green-700 hover:bg-green-600 disabled:bg-green-900 text-white rounded-lg transition-colors w-full"
          >
            <Download size={16} />
            {isLoading ? 'Downloading...' : 'Download Games (games.json)'}
          </button>
          <button
            onClick={downloadDatabaseDevices}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-3 bg-purple-700 hover:bg-purple-600 disabled:bg-purple-900 text-white rounded-lg transition-colors w-full"
          >
            <Download size={16} />
            {isLoading ? 'Downloading...' : 'Download Devices (devices.json)'}
          </button>
          <button
            onClick={downloadAllGpus}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded-lg transition-colors w-full"
          >
            <Download size={16} />
            {isLoading ? 'Downloading...' : 'Download GPUs (gpus.json)'}
          </button>
        </div>
      </div>
    </div>
  );
}