'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestConnection() {
  const [status, setStatus] = useState('Testing...');
  const [details, setDetails] = useState<any>(null);

  useEffect(() => {
    async function testConnection() {
      try {
        console.log('Testing Supabase connection...');
        
        // Test basic connection
        const { data, error } = await supabase
          .from('game_runs')
          .select('id')
          .limit(1);

        if (error) {
          setStatus('Connection Failed');
          setDetails({
            error: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
          });
          console.error('Supabase error:', error);
        } else {
          setStatus('Connection Successful');
          setDetails({
            message: 'Successfully connected to Supabase',
            dataCount: data?.length || 0,
            sampleData: data
          });
          console.log('Supabase connection successful:', data);
        }
      } catch (err) {
        setStatus('Connection Error');
        setDetails({
          error: err instanceof Error ? err.message : 'Unknown error',
          stack: err instanceof Error ? err.stack : null
        });
        console.error('Connection test error:', err);
      }
    }

    testConnection();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Supabase Connection Test</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Status: {status}</h2>
          
          {details && (
            <div className="bg-gray-700 rounded p-4">
              <pre className="text-sm overflow-auto">
                {JSON.stringify(details, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Environment Variables</h2>
          <div className="space-y-2 text-sm">
            <div>
              <strong>NEXT_PUBLIC_SUPABASE_URL:</strong> 
              <span className="ml-2 font-mono">
                {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not Set'}
              </span>
            </div>
            <div>
              <strong>NEXT_PUBLIC_SUPABASE_ANON_KEY:</strong> 
              <span className="ml-2 font-mono">
                {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not Set'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}