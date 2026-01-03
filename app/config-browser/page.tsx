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

async function getConfigs(): Promise<GameConfig[]> {
  try {
    const { data, error } = await supabase
      .from('game_runs')
      .select(GAME_RUNS_QUERY)
      .order('rating', { ascending: false })
      .order('avg_fps', { ascending: false })
      .limit(100); // Increased limit to get more data

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

export default async function ConfigSearchPage() {
  const configs = await getConfigs();

  return <ConfigBrowserClient configs={configs} />;
}
