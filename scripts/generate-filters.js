const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function generate() {
  try {
    // Run all generators and combine results
    console.log('Generating all filters...');
    
    // Steam games from GitHub repo
    const steamResponse = await fetch('https://raw.githubusercontent.com/jsnli/steamappidlist/master/data/games_appid.json');
    
    if (!steamResponse.ok) {
      throw new Error(`GitHub Steam list returned ${steamResponse.status}`);
    }
    
    const steamGames = await steamResponse.json();
    const filteredGames = steamGames
      .filter(app => {
        const name = app.name.toLowerCase();
        return !name.includes('dlc') && 
               !name.includes('soundtrack') && 
               !name.includes('demo') && 
               !name.includes('trailer') && 
               !name.includes('beta') && 
               !name.includes('test') && 
               name.length > 2;
      })
      .map(app => ({ id: app.appid, name: app.name }))
      .slice(0, 50000);
    
    // GPUs from generated file or fallback to Supabase
    let gpus = [];
    try {
      const gpuFileResponse = await fetch('./public/gpus.json');
      if (gpuFileResponse.ok) {
        gpus = await gpuFileResponse.json();
        console.log('Using GPUs from public/gpus.json file');
      } else {
        throw new Error('public/gpus.json not found');
      }
    } catch {
      console.log('Falling back to Supabase for GPUs');
      const { data: devices } = await supabase.from('devices').select('gpu');
      gpus = [...new Set((devices || []).map(d => d.gpu).filter(Boolean))];
    }
    
    // Devices from Google Play CSV
    const csvResponse = await fetch('http://storage.googleapis.com/play_public/supported_devices.csv');
    const csvText = await csvResponse.text();
    const csvLines = csvText.split('\n').slice(1);
    const playDevices = csvLines
      .filter(line => line.trim())
      .map(line => {
        const cleanLine = line.replace(/\0/g, '').replace(/"/g, '');
        const parts = cleanLine.split(',');
        if (parts.length < 4) return null;
        
        const retailBranding = parts[0]?.trim() || '';
        const marketingName = parts[1]?.trim() || '';
        const device = parts[2]?.trim() || '';
        const model = parts[3]?.trim() || '';
        
        if (!retailBranding || !model) return null;
        
        return {
          name: `${retailBranding} ${marketingName}`.trim(),
          model: `${retailBranding} ${model}`.trim()
        };
      })
      .filter(d => d && d.name && d.model && d.name.length > 3);

    const filterData = {
      games: filteredGames,
      gpus: gpus,
      devices: playDevices,
      updatedAt: new Date().toISOString()
    };

    fs.writeFileSync('./public/filters.json', JSON.stringify(filterData));
    console.log('All filters generated successfully!');
    console.log(`Generated ${filterData.games.length} games, ${filterData.gpus.length} GPUs, ${filterData.devices.length} devices`);
  } catch (error) {
    console.error('Error generating filters:', error);
    process.exit(1);
  }
}

generate();