const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

async function generateGpus() {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Fetch GPUs from database (fallback only)
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

    fs.writeFileSync('./public/gpus.json', JSON.stringify(uniqueGpus, null, 2));
    console.log(`Generated gpus.json with ${uniqueGpus.length} GPUs`);
  } catch (error) {
    console.error('Error generating GPUs:', error);
    process.exit(1);
  }
}

generateGpus();