const fs = require('fs');

async function generateGames() {
  try {
    // Fetch Steam games from GitHub repo
    const steamResponse = await fetch('https://raw.githubusercontent.com/jsnli/steamappidlist/master/data/games_appid.json');
    
    if (!steamResponse.ok) {
      throw new Error(`GitHub Steam list returned ${steamResponse.status}`);
    }
    
    const steamGames = await steamResponse.json();
    
    // Filter and clean Steam games
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

    // This script only generates Steam games for GitHub Actions
    // The combine script will merge with fallback data
    console.log(`Generated ${filteredGames.length} Steam games`);
  } catch (error) {
    console.error('Error generating games:', error);
    process.exit(1);
  }
}

generateGames();