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

The cached configs are now loaded from `/public/cached-configs.sqlite`, a SQLite database file that contains all configuration data in a denormalized format. The database includes:

- **data table**: Contains all game configurations with flattened config fields
- **games table**: Lookup table mapping game_id to game names
- **devices table**: Lookup table mapping device_id to device information

The sql.js library is used to query the SQLite database directly in the browser, providing:
- Fast querying and filtering of 3,345+ configurations
- Offline access without requiring large JSON files
- Efficient storage (4.8MB database vs larger JSON files)

## Usage

1. Navigate to `/cached-configs-browser`
2. Use the search filters to find specific configurations
3. Click the search button to apply filters
4. View results in a card-based grid layout
5. Click "Load Config" to open in the Config Editor
6. Click "Download JSON" to save the configuration file

## Updating Cached Configs

The cached configurations are stored in the SQLite database at `/public/cached-configs.sqlite`. To update:

1. Run the data export script to download data from Supabase (requires network access)
2. Run the lookup population script to add game/device names to the database
3. The updated database file will be automatically included in the next build

Scripts available in `/scripts`:
- `download-database.js` - Downloads data from Supabase
- `populate-lookups.js` - Populates game/device lookup tables
