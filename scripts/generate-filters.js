const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function generate() {
  try {
    // Fetch Steam games from API
    const steamResponse = await fetch('https://api.steampowered.com/ISteamApps/GetAppList/v2/');
    const steamData = await steamResponse.json();
    
    // Filter and clean Steam games
    const steamGames = steamData.applist.apps
      .filter(app => {
        const name = app.name.toLowerCase();
        // Filter out DLC, soundtracks, demos, trailers, etc.
        return !name.includes('dlc') && 
               !name.includes('soundtrack') && 
               !name.includes('demo') && 
               !name.includes('trailer') && 
               !name.includes('beta') && 
               !name.includes('test') && 
               name.length > 2;
      })
      .map(app => ({ id: app.appid, name: app.name }))
      .slice(0, 50000); // Limit for performance
    
    // Fetch distinct GPUs from devices
    const { data: devices } = await supabase.from('devices').select('id, model, gpu');
    
    // Fetch Google Play supported devices CSV
    const csvResponse = await fetch('http://storage.googleapis.com/play_public/supported_devices.csv');
    const csvText = await csvResponse.text();
    
    // Parse CSV and create device entries
    const csvLines = csvText.split('\n').slice(1); // Skip header
    const playDevices = csvLines
      .filter(line => line.trim())
      .map(line => {
        // Clean and split CSV line properly
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
      games: steamGames,
      gpus: [...new Set((devices || []).map(d => d.gpu).filter(Boolean))],
      devices: playDevices,
      updatedAt: new Date().toISOString()
    };

    // Save to the public folder so it's included in the build
    fs.writeFileSync('./public/filters.json', JSON.stringify(filterData));
    console.log('Filters JSON generated successfully!');
    console.log(`Generated ${filterData.games.length} games, ${filterData.gpus.length} GPUs, ${filterData.devices.length} devices`);
  } catch (error) {
    console.error('Error generating filters:', error);
    process.exit(1);
  }
}

generate();