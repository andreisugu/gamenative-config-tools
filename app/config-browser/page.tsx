import { Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import ConfigBrowserClient from './ConfigBrowserClient';

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

// Supabase raw return type (joins return arrays)
interface SupabaseGameRun {
  id: number;
  rating: number;
  avg_fps: number;
  notes: string | null;
  configs: any;
  created_at: string;
  game: Array<{ name: string }>;
  device: Array<{ model: string; gpu: string; android_ver: string }>;
}

// Query string for fetching game runs with related game and device data
const GAME_RUNS_QUERY = 'id,rating,avg_fps,notes,configs,created_at,game:games!inner(name),device:devices(model,gpu,android_ver)';

// Maximum number of configs to return from server query
// Limit set to prevent excessive data transfer and maintain performance
const SERVER_QUERY_LIMIT = 100;

async function getConfigs(searchQuery?: string, gpuFilter?: string): Promise<GameConfig[]> {
  try {
    let query = supabase
      .from('game_runs')
      .select(GAME_RUNS_QUERY)
      .order('rating', { ascending: false })
      .order('avg_fps', { ascending: false });

    // Apply server-side filtering for game name
    // Limit input length to prevent abuse
    const trimmedSearch = searchQuery?.trim().slice(0, 100);
    if (trimmedSearch) {
      query = query.ilike('games.name', `%${trimmedSearch}%`);
    }

    // Apply server-side filtering for GPU
    // Limit input length to prevent abuse
    const trimmedGpu = gpuFilter?.trim().slice(0, 100);
    if (trimmedGpu) {
      query = query.ilike('devices.gpu', `%${trimmedGpu}%`);
    }

    // Limit to SERVER_QUERY_LIMIT after filtering
    query = query.limit(SERVER_QUERY_LIMIT);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching configs:', error);
      return [];
    }

    if (!data) {
      return [];
    }

    // Transform the data to match our interface
    const transformedData: GameConfig[] = (data as SupabaseGameRun[] || []).map(item => ({
      id: item.id,
      rating: item.rating,
      avg_fps: item.avg_fps,
      notes: item.notes,
      configs: item.configs,
      created_at: item.created_at,
      game: item.game && item.game.length > 0 ? { name: item.game[0].name } : null,
      device: item.device && item.device.length > 0 ? {
        model: item.device[0].model,
        gpu: item.device[0].gpu,
        android_ver: item.device[0].android_ver
      } : null
    }));

    return transformedData;
  } catch (error) {
    console.error('Exception fetching configs:', error);
    return [];
  }
}

export default async function ConfigSearchPage({
  searchParams,
}: {
  searchParams: { search?: string; gpu?: string };
}) {
  const configs = await getConfigs(searchParams.search, searchParams.gpu);

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-slate-950 to-cyan-950 flex items-center justify-center">
        <div className="text-slate-400 text-lg">Loading...</div>
      </div>
    }>
      <ConfigBrowserClient configs={configs} initialSearch={searchParams.search} initialGpu={searchParams.gpu} />
    </Suspense>
  );
}
