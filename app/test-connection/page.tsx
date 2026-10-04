'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Activity,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Server,
  Database,
  Search,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { searchGames, getDevices, getCompatibility } from '@/lib/api';

interface EndpointResult {
  name: string;
  url: string;
  status: 'pending' | 'ok' | 'error';
  latencyMs: number;
  summary: string;
  details?: any;
  error?: string;
}

export default function TestConnectionPage() {
  const [loading, setLoading] = useState(true);
  const [endpoints, setEndpoints] = useState<EndpointResult[]>([
    {
      name: 'Game Search Endpoint',
      url: 'https://api.gamenative.app/api/games?name=Elden',
      status: 'pending',
      latencyMs: 0,
      summary: 'Testing game search query...',
    },
    {
      name: 'Device & GPU Catalog',
      url: 'https://api.gamenative.app/api/devices',
      status: 'pending',
      latencyMs: 0,
      summary: 'Testing device list fetch...',
    },
    {
      name: 'Compatibility Configurations',
      url: 'https://api.gamenative.app/api/compatibility?gameId=3405',
      status: 'pending',
      latencyMs: 0,
      summary: 'Testing configuration runs query...',
    },
  ]);

  const runDiagnostics = async () => {
    setLoading(true);

    const updated: EndpointResult[] = [
      {
        name: 'Game Search Endpoint',
        url: 'https://api.gamenative.app/api/games?name=Elden',
        status: 'pending',
        latencyMs: 0,
        summary: 'Querying...',
      },
      {
        name: 'Device & GPU Catalog',
        url: 'https://api.gamenative.app/api/devices',
        status: 'pending',
        latencyMs: 0,
        summary: 'Querying...',
      },
      {
        name: 'Compatibility Configurations',
        url: 'https://api.gamenative.app/api/compatibility?gameId=3405',
        status: 'pending',
        latencyMs: 0,
        summary: 'Querying...',
      },
    ];
    setEndpoints([...updated]);

    // 1. Test Game Search
    const t0 = performance.now();
    try {
      const games = await searchGames('Elden');
      const t1 = performance.now();
      updated[0] = {
        name: 'Game Search Endpoint',
        url: 'https://api.gamenative.app/api/games?name=Elden',
        status: 'ok',
        latencyMs: Math.round(t1 - t0),
        summary: `Successfully retrieved ${games.length} matching games`,
        details: games.slice(0, 3),
      };
    } catch (e: any) {
      updated[0] = {
        name: 'Game Search Endpoint',
        url: 'https://api.gamenative.app/api/games?name=Elden',
        status: 'error',
        latencyMs: Math.round(performance.now() - t0),
        summary: 'Failed to query games',
        error: e.message,
      };
    }
    setEndpoints([...updated]);

    // 2. Test Device Catalog
    const t2 = performance.now();
    try {
      const devices = await getDevices();
      const t3 = performance.now();
      const gpuCount = new Set(devices.map((d) => d.gpu).filter(Boolean)).size;
      updated[1] = {
        name: 'Device & GPU Catalog',
        url: 'https://api.gamenative.app/api/devices',
        status: 'ok',
        latencyMs: Math.round(t3 - t2),
        summary: `Loaded ${devices.length} verified devices (${gpuCount} distinct GPUs)`,
        details: devices.slice(0, 2),
      };
    } catch (e: any) {
      updated[1] = {
        name: 'Device & GPU Catalog',
        url: 'https://api.gamenative.app/api/devices',
        status: 'error',
        latencyMs: Math.round(performance.now() - t2),
        summary: 'Failed to load device catalog',
        error: e.message,
      };
    }
    setEndpoints([...updated]);

    // 3. Test Compatibility Query
    const t4 = performance.now();
    try {
      const comp = await getCompatibility({ gameId: 3405, limit: 3 });
      const t5 = performance.now();
      updated[2] = {
        name: 'Compatibility Configurations',
        url: 'https://api.gamenative.app/api/compatibility?gameId=3405',
        status: 'ok',
        latencyMs: Math.round(t5 - t4),
        summary: `Found ${comp.total} total reports for ELDEN RING (${comp.runs.length} sample runs returned)`,
        details: comp.runs.map((r) => ({
          id: r.id,
          rating: r.rating,
          avgFps: r.avgFps,
          model: r.device?.model,
          gpu: r.device?.gpu,
        })),
      };
    } catch (e: any) {
      updated[2] = {
        name: 'Compatibility Configurations',
        url: 'https://api.gamenative.app/api/compatibility?gameId=3405',
        status: 'error',
        latencyMs: Math.round(performance.now() - t4),
        summary: 'Failed to load compatibility reports',
        error: e.message,
      };
    }
    setEndpoints([...updated]);
    setLoading(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const allPassed = endpoints.every((e) => e.status === 'ok');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-gray-100 p-4 sm:p-8 selection:bg-cyan-500 selection:text-white">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-800 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
                <Activity className="h-5 w-5" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                GameNative Backend Diagnostics
              </h1>
            </div>
            <p className="text-gray-400 text-xs sm:text-sm">
              Live health monitor and latency checks for official worker endpoints at{' '}
              <code className="bg-gray-800 px-1.5 py-0.5 rounded text-cyan-300 font-mono text-xs">
                api.gamenative.app
              </code>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={runDiagnostics}
              disabled={loading}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-cyan-900/20 transition active:scale-95 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Testing...' : 'Re-test All'}</span>
            </button>

            <Link
              href="/config-browser"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <span>Config Browser</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Global Status Banner */}
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
            loading
              ? 'bg-amber-950/20 border-amber-800/40 text-amber-200'
              : allPassed
              ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
              : 'bg-red-950/20 border-red-800/40 text-red-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {loading ? (
              <RefreshCw className="h-5 w-5 text-amber-400 animate-spin" />
            ) : allPassed ? (
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            ) : (
              <XCircle className="h-5 w-5 text-red-400" />
            )}
            <div>
              <div className="font-bold text-sm">
                {loading
                  ? 'Testing Backend Latency & Responses...'
                  : allPassed
                  ? 'All GameNative API Endpoints Operational'
                  : 'Connectivity Issues Detected'}
              </div>
              <p className="text-xs opacity-80">
                {loading
                  ? 'Measuring ping and response payload schemas...'
                  : allPassed
                  ? 'Cloudflare edge workers are responding with expected JSON contracts.'
                  : 'One or more queries encountered errors or network timeouts.'}
              </p>
            </div>
          </div>

          {!loading && allPassed && (
            <span className="hidden sm:inline-block px-3 py-1 bg-emerald-950 border border-emerald-700/60 text-emerald-300 font-mono text-xs rounded-full font-bold">
              100% HEALTHY
            </span>
          )}
        </div>

        {/* Endpoints Grid */}
        <div className="grid grid-cols-1 gap-4">
          {endpoints.map((ep, idx) => {
            const isOk = ep.status === 'ok';
            const isPending = ep.status === 'pending';

            return (
              <div
                key={idx}
                className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-3 hover:border-gray-700 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {idx === 0 && <Search className="h-4 w-4 text-cyan-400" />}
                    {idx === 1 && <Database className="h-4 w-4 text-blue-400" />}
                    {idx === 2 && <Server className="h-4 w-4 text-purple-400" />}
                    <h3 className="font-bold text-sm text-gray-200">{ep.name}</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {ep.latencyMs > 0 && (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700">
                        {ep.latencyMs} ms
                      </span>
                    )}

                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1 ${
                        isPending
                          ? 'bg-amber-950/80 text-amber-300 border border-amber-800/50'
                          : isOk
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'
                          : 'bg-red-950 text-red-300 border border-red-800/50'
                      }`}
                    >
                      {isPending ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : isOk ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      <span>{isPending ? 'Testing' : isOk ? 'Active' : 'Offline'}</span>
                    </span>
                  </div>
                </div>

                <div className="font-mono text-xs text-gray-500 truncate" title={ep.url}>
                  {ep.url}
                </div>

                <p className="text-xs text-gray-300">{ep.summary}</p>

                {ep.error && (
                  <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs font-mono">
                    {ep.error}
                  </div>
                )}

                {ep.details && (
                  <details className="mt-2 group">
                    <summary className="text-[11px] text-gray-400 group-hover:text-cyan-400 cursor-pointer font-semibold transition">
                      View Response Snapshot
                    </summary>
                    <pre className="mt-2 p-3 rounded-xl bg-gray-950 border border-gray-800 font-mono text-[11px] text-cyan-300 overflow-x-auto max-h-48">
                      {JSON.stringify(ep.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}