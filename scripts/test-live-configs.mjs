#!/usr/bin/env node

/**
 * Hands-free verification test suite for GameNative Config Tools.
 * Tests live API contracts, search typeahead, GPU/rating filtering, sorting,
 * config data extraction, and Android export formatting.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.gamenative.app';

class TestHarness {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.results = [];
  }

  assert(condition, name, details = '') {
    if (condition) {
      this.passed++;
      console.log(`  ✅ [PASS] ${name}`);
      this.results.push({ name, status: 'PASS' });
    } else {
      this.failed++;
      console.error(`  ❌ [FAIL] ${name} ${details ? `(${details})` : ''}`);
      this.results.push({ name, status: 'FAIL', details });
    }
  }

  summary() {
    console.log(`\n========================================`);
    console.log(`TEST SUMMARY: ${this.passed} passed, ${this.failed} failed`);
    console.log(`========================================\n`);
    return this.failed === 0;
  }
}

async function apiFetch(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: 'application/json' }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`API ${res.status}: ${JSON.stringify(err)}`);
  }
  return res.json();
}

function formatGameNativeExport(run, gameName) {
  return {
    version: 1,
    exportedFrom: 'GameNative Config Tools',
    timestamp: Date.now(),
    containerName: gameName || run.game?.name || run.gameName || 'Imported Game',
    config: run.configs || {}
  };
}

async function runTestSuite() {
  const h = new TestHarness();
  console.log('🚀 Running GameNative Hands-Free Test Suite...\n');

  // 1. Search for Games
  console.log('--- Test Group 1: Game Search ---');
  let gamesData;
  try {
    gamesData = await apiFetch('/api/games/search?q=Elden');
    h.assert(Array.isArray(gamesData.games), 'Search response contains games array');
    h.assert(gamesData.games.length > 0, `Search returns results (${gamesData.games.length} games)`);
    const match = gamesData.games.find(g => g.name.toLowerCase().includes('elden ring'));
    h.assert(Boolean(match), `Found matching game: ${match?.name} (ID: ${match?.id})`);
  } catch (e) {
    h.assert(false, 'Search failed', e.message);
  }

  const targetGame = gamesData?.games?.[0] || { id: 3405, name: 'ELDEN RING' };

  // 2. Devices Endpoint
  console.log('\n--- Test Group 2: Devices & GPUs ---');
  let devicesData;
  try {
    devicesData = await apiFetch('/api/devices');
    h.assert(Array.isArray(devicesData.devices), 'Devices response contains devices array');
    h.assert(devicesData.devices.length >= 100, `Device catalog contains entries (${devicesData.devices.length} devices)`);
    const gpus = Array.from(new Set(devicesData.devices.map(d => d.gpu).filter(Boolean)));
    h.assert(gpus.length >= 10, `Extracted ${gpus.length} distinct GPUs`);
  } catch (e) {
    h.assert(false, 'Devices fetch failed', e.message);
  }

  // 3. Compatibility Runs & Pagination
  console.log('\n--- Test Group 3: Compatibility Runs ---');
  let runsData;
  try {
    runsData = await apiFetch(`/api/compatibility?gameId=${targetGame.id}&limit=10`);
    h.assert(Array.isArray(runsData.runs), 'Response contains runs array');
    h.assert(typeof runsData.total === 'number' && runsData.total > 0, `Runs total is reported (${runsData.total})`);
    h.assert(runsData.runs.length > 0, `Received runs for ${targetGame.name}`);
  } catch (e) {
    h.assert(false, 'Basic compatibility query failed', e.message);
  }

  // 4. Filtering and Sorting
  console.log('\n--- Test Group 4: Filtering & Sorting ---');
  try {
    // Rating filter
    const highRated = await apiFetch(`/api/compatibility?gameId=${targetGame.id}&ratingMin=4&limit=5`);
    const allHigh = highRated.runs.every(r => r.rating >= 4);
    h.assert(allHigh, `Rating filter works: all ${highRated.runs.length} runs have rating >= 4`);

    // GPU filter
    const adrenoRuns = await apiFetch(`/api/compatibility?gameId=${targetGame.id}&gpu=Adreno&limit=5`);
    const allAdreno = adrenoRuns.runs.every(r => r.device?.gpu?.toLowerCase().includes('adreno'));
    h.assert(allAdreno, `GPU filter works: all ${adrenoRuns.runs.length} runs have Adreno GPU`);

    // Sorting by rating
    const sortedRating = await apiFetch(`/api/compatibility?gameId=${targetGame.id}&sort=rating&dir=desc&limit=5`);
    let ratingOrderOk = true;
    for (let i = 0; i < sortedRating.runs.length - 1; i++) {
      if (sortedRating.runs[i].rating < sortedRating.runs[i + 1].rating) ratingOrderOk = false;
    }
    h.assert(ratingOrderOk, 'Sorting by rating desc verified');

    // Sorting by avg_fps
    const sortedFps = await apiFetch(`/api/compatibility?gameId=${targetGame.id}&sort=avg_fps&dir=desc&limit=5`);
    let fpsOrderOk = true;
    for (let i = 0; i < sortedFps.runs.length - 1; i++) {
      if ((sortedFps.runs[i].avgFps ?? 0) < (sortedFps.runs[i + 1].avgFps ?? 0)) fpsOrderOk = false;
    }
    h.assert(fpsOrderOk, 'Sorting by avg_fps desc verified');
  } catch (e) {
    h.assert(false, 'Filter/sort queries failed', e.message);
  }

  // 5. Configs Inspection & Export Format
  console.log('\n--- Test Group 5: Configs & GameNative Export ---');
  try {
    const candidateRun = runsData?.runs?.find(r => r.configs && Object.keys(r.configs).length > 5);
    h.assert(Boolean(candidateRun), `Found run with rich container configuration (Run ID: ${candidateRun?.id})`);

    const cfg = candidateRun.configs;
    h.assert(typeof cfg.emulator === 'string' || typeof cfg.wineVersion === 'string', 'Config defines emulator or wineVersion');
    h.assert(typeof cfg.dxwrapper === 'string' || typeof cfg.extraData === 'object', 'Config defines dxwrapper or extraData');

    const exportPayload = formatGameNativeExport(candidateRun, targetGame.name);
    h.assert(exportPayload.version === 1, 'Export JSON has version: 1');
    h.assert(typeof exportPayload.timestamp === 'number', 'Export JSON has timestamp');
    h.assert(Boolean(exportPayload.containerName), 'Export JSON has containerName');
    h.assert(typeof exportPayload.config === 'object', 'Export JSON has config object');
  } catch (e) {
    h.assert(false, 'Config export validation failed', e.message);
  }

  // 6. Contract Enforcement & Error Handling
  console.log('\n--- Test Group 6: Error Handling ---');
  try {
    const missingGameIdRes = await fetch(`${API_BASE}/api/compatibility`);
    h.assert(missingGameIdRes.status === 400, 'API enforces required gameId with HTTP 400');
    const invalidSortRes = await fetch(`${API_BASE}/api/compatibility?gameId=3405&sort=invalid_sort`);
    h.assert(invalidSortRes.status === 400, 'API rejects invalid sort enum with HTTP 400');
  } catch (e) {
    h.assert(false, 'Error handling check failed', e.message);
  }

  const success = h.summary();
  if (!success) {
    process.exit(1);
  }
}

runTestSuite();
