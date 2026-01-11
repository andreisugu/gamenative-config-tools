# Cached Configs Browser

This page provides a browser for cached game configurations stored locally, working independently from the Supabase database.

## Overview

The Cached Configs Browser is similar to the Config Browser, but instead of querying Supabase for community configurations, it loads configurations from a local JSON file (`/public/cached-configs.json`). This allows for offline browsing of pre-loaded configurations.

## Features

- **Local Data Source**: Loads configs from `/public/cached-configs.json` instead of Supabase
- **Same UI/UX**: Provides the same filtering, sorting, and browsing experience as Config Browser
- **Autocomplete Search**: Search by game name, GPU, or device with autocomplete suggestions
- **Sorting Options**: Sort by newest, oldest, rating, or FPS
- **Pagination**: Browse through large sets of cached configurations
- **Config Actions**: Load configs into the editor or download as JSON

## Data Structure

The cached configs are stored in `/public/cached-configs.json` with the following structure:

```json
[
  {
    "id": 1,
    "rating": 5,
    "avg_fps": 60,
    "notes": "Excellent performance on high settings.",
    "configs": {
      "containerVariant": "default",
      "graphicsDriver": "vulkan",
      "screenSize": "1920x1080"
    },
    "created_at": "2024-01-15T10:30:00Z",
    "app_version": "1.2.0",
    "tags": ["high-performance", "tested"],
    "session_length_sec": 3600,
    "game": {
      "id": 1,
      "name": "Example Game 1"
    },
    "device": {
      "id": 1,
      "model": "Samsung Galaxy S23",
      "gpu": "Adreno 740",
      "android_ver": "14"
    }
  }
]
```

## Future Enhancement: SQLite Database Support

While currently using JSON for data storage, the implementation is designed to be easily adaptable to use a SQLite database when available. The data structure and querying logic can be updated to work with SQLite without changing the UI components.

### Potential SQLite Integration

When an SQLite database becomes available:

1. Replace the JSON fetch in `CachedConfigBrowserClient.tsx` with SQLite queries
2. Use a library like `sql.js` for browser-based SQLite support
3. Store the database file (e.g., `cached-configs.db`) in the `/public` folder
4. Update the fetch logic to query the database instead of loading JSON

Example SQLite query structure:
```sql
SELECT * FROM game_runs 
WHERE game_name LIKE '%search%' 
AND device_gpu LIKE '%gpu%'
ORDER BY created_at DESC
LIMIT 15 OFFSET 0;
```

## Usage

1. Navigate to `/cached-configs-browser`
2. Use the search filters to find specific configurations
3. Click the search button to apply filters
4. View results in a card-based grid layout
5. Click "Load Config" to open in the Config Editor
6. Click "Download JSON" to save the configuration file

## Updating Cached Configs

To update the cached configurations:

1. Edit `/public/cached-configs.json`
2. Follow the data structure format above
3. Rebuild the site or refresh in development mode
4. The new configs will be available immediately
