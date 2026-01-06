const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function generate() {
  try {
    // Fetch distinct games
    const { data: games } = await supabase.from('games').select('id, name');
    
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
        const [retailBranding, marketingName, device, model] = line.split(',').map(s => s.trim().replace(/"/g, ''));
        return {
          name: `${retailBranding} ${marketingName}`.trim(),
          model: `${retailBranding} ${model}`.trim() // Match database format: Retail Branding + Device Model
        };
      })
      .filter(d => d.name && d.model);

    const filterData = {
      games: games || [],
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