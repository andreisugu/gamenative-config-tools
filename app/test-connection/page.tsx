'use client';

import { useState, useEffect } from 'react';
import { searchGames, getDevices, getCompatibility } from '@/lib/api';

export default function TestConnection() {
  const [status, setStatus] = useState('Testing...');
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function testApi() {
      const log: any = {};
      try {
        console.log('Testing api.gamenative.app...');

        // 1. Search games
        try {
          const games = await searchGames('Elden');
          log.gamesSearch = {
            status: 'OK',
            count: games.length,
            sample: games.slice(0, 3),
          };
        } catch (e: any) {
          log.gamesSearch = { status: 'FAILED', error: e.message };
        }

        // 2. Fetch devices
        try {
          const devices = await getDevices();
          log.devices = {
            status: 'OK',
            count: devices.length,
            sample: devices.slice(0, 2),
          };
        } catch (e: any) {
          log.devices = { status: 'FAILED', error: e.message };
        }

        // 3. Fetch compatibility runs for Elden Ring (ID: 3405)
        try {
          const comp = await getCompatibility({ gameId: 3405, limit: 3 });
          log.compatibility = {
            status: 'OK',
            total: comp.total,
            runsCount: comp.runs.length,
            sampleRunId: comp.runs[0]?.id,
          };
        } catch (e: any) {
          log.compatibility = { status: 'FAILED', error: e.message };
        }

        setStatus('All tests complete');
        setResults(log);
      } catch (err: any) {
        setStatus('Test Error');
        setResults({ fatal: err.message });
      } finally {
        setLoading(false);
      }
    }

    testApi();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-cyan-400">GameNative API Diagnostic</h1>
        <p className="text-gray-400 text-sm">
          Tests real-time connectivity to the live GameNative worker backend (api.gamenative.app).
        </p>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <div
              className={`w-3 h-3 rounded-full ${
                loading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
              }`}
            />
            <h2 className="text-lg font-semibold">{status}</h2>
          </div>

          <pre className="bg-gray-900 p-4 rounded-lg text-xs font-mono text-cyan-300 overflow-auto max-h-96">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}