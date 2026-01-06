'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Download } from 'lucide-react';

export default function AdminPage() {
  const [isLoading, setIsLoading] = useState(false);

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