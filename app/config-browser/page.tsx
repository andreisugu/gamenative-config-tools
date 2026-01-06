import { Suspense } from 'react';
import ConfigBrowserClient from './ConfigBrowserClient';

export default async function ConfigSearchPage({
  searchParams,
}: {
  searchParams: { search?: string; gpu?: string };
}) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-slate-400 text-lg">Loading...</div>
      </div>
    }>
      <ConfigBrowserClient initialSearch={searchParams.search} initialGpu={searchParams.gpu} />
    </Suspense>
  );
}
