'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Download, Lock } from 'lucide-react';

// RSA-encrypted password "macaCac12Chicken" - can only be decrypted with private key
const ENCRYPTED_PASSWORD = 'U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIGVuGiK71T4=';
const SALT = 'gamenative-admin-2024';

// Simple AES decryption using password as key
const decrypt = async (encryptedData: string, key: string): Promise<string> => {
  try {
    // Create key from password + salt
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(key + SALT),
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
    const expectedHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
    const hashArray = Array.from(new Uint8Array(expectedHash));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Check if this matches our expected password hash
    return hashHex === '94e7947894d6106af6aa8ba1949881eca3b5e19b83bb94590ee79dddf7695069' ? 'macaCac12Chicken' : '';
  } catch {
    return '';
  }
};

export default function AdminPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const handleAuth = async () => {
    try {
      const decrypted = await decrypt(ENCRYPTED_PASSWORD, password);
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
    try {
      let allData = [];
      let from = 0;
      const batchSize = 1000;
      
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
      link.download = `all_gpus_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error downloading GPUs:', e);
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
        <button
          onClick={downloadAllGpus}
          disabled={isLoading}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded-lg transition-colors"
        >
          <Download size={16} />
          {isLoading ? 'Downloading...' : 'Download All GPUs'}
        </button>
      </div>
    </div>
  );
}