'use client';

import Link from 'next/link';
import { Home, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function NotFound() {
  const [currentPath, setCurrentPath] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      setCurrentPath(pathname);

      // In local development, if a user accesses /gamenative-config-tools/*,
      // seamlessly redirect them to the corresponding root path.
      if (pathname === '/gamenative-config-tools' || pathname === '/gamenative-config-tools/') {
        window.location.replace('/');
      } else if (pathname.startsWith('/gamenative-config-tools/')) {
        const target = pathname.replace('/gamenative-config-tools', '') || '/';
        window.location.replace(target);
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6 bg-gray-800/60 backdrop-blur-md p-8 rounded-2xl border border-gray-700 shadow-2xl">
        <div className="w-16 h-16 bg-cyan-950/60 border border-cyan-800/40 rounded-2xl mx-auto flex items-center justify-center text-3xl">
          🔍
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            Page Not Found
          </h1>
          <p className="text-gray-400 text-sm mt-2">
            The page you requested does not exist or may have been moved.
          </p>
          {currentPath && (
            <p className="text-xs text-gray-500 font-mono mt-1">
              Path: {currentPath}
            </p>
          )}
        </div>

        <div className="pt-2 flex flex-col gap-2">
          <Link
            href="/"
            className="w-full py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition"
          >
            <Home className="h-4 w-4" />
            Go to Home
          </Link>
          <Link
            href="/config-browser"
            className="w-full py-2.5 px-4 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition"
          >
            <Search className="h-4 w-4" />
            Config Browser
          </Link>
        </div>
      </div>
    </div>
  );
}
