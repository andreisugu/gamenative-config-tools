const fs = require('fs');

// Polyfill fetch for Node.js < 18
if (!globalThis.fetch) {
  const { default: fetch } = require('node-fetch');
  globalThis.fetch = fetch;
}

async function combineFilters() {
  try {
    // Read individual JSON files from public folder
    let games = [];
    let devices = [];
    let gpus = [];

    // Read games.json if it exists
    try {
      const gamesData = JSON.parse(fs.readFileSync('./public/games.json', 'utf8'));
      games = Array.isArray(gamesData) ? gamesData : [];
      console.log(`Loaded ${games.length} games from games.json`);
    } catch (e) {
      console.log('No games.json found, skipping...');
    }

    // Read devices.json if it exists
    try {
      const devicesData = JSON.parse(fs.readFileSync('./public/devices.json', 'utf8'));
      devices = Array.isArray(devicesData) ? devicesData : [];
      console.log(`Loaded ${devices.length} devices from devices.json`);
    } catch (e) {
      console.log('No devices.json found, skipping...');
    }

    // Read gpus.json if it exists
    try {
      const gpusData = JSON.parse(fs.readFileSync('./public/gpus.json', 'utf8'));
      gpus = Array.isArray(gpusData) ? gpusData : [];
      console.log(`Loaded ${gpus.length} GPUs from gpus.json`);
    } catch (e) {
      console.log('No gpus.json found, skipping...');
    }

    // Fetch Steam games
    let steamGames = [];
    try {
      const steamResponse = await fetch('https://raw.githubusercontent.com/jsnli/steamappidlist/master/data/games_appid.json');
      if (!steamResponse.ok) throw new Error(`Steam API returned ${steamResponse.status}`);
      const steamData = await steamResponse.json();
      
      steamGames = steamData
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
      
      console.log(`Fetched ${steamGames.length} Steam games`);
    } catch (e) {
      console.log('Failed to fetch Steam games, using fallback only:', e.message);
    }

    // Fetch Google Play devices
    let playDevices = [];
    try {
      const csvResponse = await fetch('http://storage.googleapis.com/play_public/supported_devices.csv');
      if (!csvResponse.ok) throw new Error(`Google Play API returned ${csvResponse.status}`);
      const csvText = await csvResponse.text();
      
      const csvLines = csvText.split('\n').slice(1);
      playDevices = csvLines
        .filter(line => line.trim())
        .map(line => {
          const cleanLine = line.replace(/\0/g, '').replace(/"/g, '');
          const parts = cleanLine.split(',');
          if (parts.length < 4) return null;
          
          const retailBranding = parts[0]?.trim() || '';
          const marketingName = parts[1]?.trim() || '';
          const model = parts[3]?.trim() || '';
          
          if (!retailBranding || !model) return null;
          
          return {
            name: `${retailBranding} ${marketingName}`.trim(),
            model: `${retailBranding} ${model}`.trim()
          };
        })
        .filter(d => d && d.name && d.model && d.name.length > 3);
      
      console.log(`Fetched ${playDevices.length} Google Play devices`);
    } catch (e) {
      console.log('Failed to fetch Google Play devices, using fallback only:', e.message);
    }

    // Combine games (Steam + fallback, deduplicated)
    const steamGameNames = new Set(steamGames.map(g => g.name));
    const uniqueFallbackGames = games.filter(g => !steamGameNames.has(g.name));
    const combinedGames = [...steamGames, ...uniqueFallbackGames];

    // Combine devices (Google Play + fallback, deduplicated)
    const playDeviceNames = new Set(playDevices.map(d => d.name));
    const playDeviceModels = new Set(playDevices.map(d => d.model));
    const uniqueFallbackDevices = devices.filter(d => 
      !playDeviceNames.has(d.name) && !playDeviceModels.has(d.model || d.name)
    );
    const combinedDevices = [...playDevices, ...uniqueFallbackDevices];

    // Create final filters.json
    const filterData = {
      games: combinedGames,
      devices: combinedDevices,
      gpus: gpus,
      updatedAt: new Date().toISOString()
    };

    fs.writeFileSync('./public/filters.json', JSON.stringify(filterData));
    console.log(`\nGenerated filters.json:`);
    console.log(`- ${combinedGames.length} games (${steamGames.length} Steam + ${uniqueFallbackGames.length} fallback)`);
    console.log(`- ${combinedDevices.length} devices (${playDevices.length} Google Play + ${uniqueFallbackDevices.length} fallback)`);
    console.log(`- ${gpus.length} GPUs (fallback only)`);
  } catch (error) {
    console.error('Error combining filters:', error);
    process.exit(1);
  }
}

combineFilters();