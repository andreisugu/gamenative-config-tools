import { Suspense } from 'react';
import ConfigBrowserClient from './ConfigBrowserClient';

export const metadata = {
  title: 'Community Configs | GameNative',
  description: 'Browse and download high-performance game configurations shared by the community.',
};

export default function ConfigSearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-slate-700 border-t-cyan-500 rounded-full animate-spin mb-4"></div>
          <div className="text-slate-400 text-lg font-medium animate-pulse">Loading configurations...</div>
        </div>
      </div>
    }>
      <ConfigBrowserClient />
    </Suspense>
  );
}