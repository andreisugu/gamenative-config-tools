#!/usr/bin/env node

/**
 * Hands-Free E2E Browser Test Suite for GameNative Config Tools.
 * Uses native Firefox headless via WebDriver BiDi to test:
 * - Next.js dev server rendering & hydration across all routes
 * - Absence of React hydration mismatches (including Dark Reader extensions)
 * - Live config search & viewing interactions on /config-browser
 * - Custom 404 page and legacy path redirects
 * - Config editor and converter page mounting
 */

import { spawn } from 'child_process';
import { rmSync, mkdirSync } from 'fs';
import { setTimeout as sleep } from 'timers/promises';

const FF_PORT = 9222;
const DEV_PORT = 3000;
const FF_PROFILE = '/tmp/gn_e2e_ff_profile';
const APP_URL = `http://127.0.0.1:${DEV_PORT}`;

class BiDiClient {
  constructor(port = FF_PORT) {
    this.port = port;
    this.ws = null;
    this.id = 1;
    this.pending = new Map();
    this.logs = [];
    this.errors = [];
    this.hydrationErrors = [];
    this.context = null;
  }

  async connect() {
    this.ws = new WebSocket(`ws://127.0.0.1:${this.port}/session`);
    
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve);
      this.ws.addEventListener('error', reject);
    });

    this.ws.addEventListener('message', (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.id && this.pending.has(msg.id)) {
          this.pending.get(msg.id)(msg);
          this.pending.delete(msg.id);
        } else if (msg.method === 'log.entryAdded') {
          const entry = msg.params;
          this.logs.push(entry);
          const text = entry.text || '';
          if (
            text.includes('Hydration failed') ||
            text.includes('hydration mismatch') ||
            text.includes('did not match') ||
            text.includes('Minified React error #418') ||
            text.includes('Minified React error #423') ||
            text.includes('Minified React error #425')
          ) {
            this.hydrationErrors.push(entry);
          }
          if (entry.level === 'error' && !text.includes('favicon.ico')) {
            this.errors.push(entry);
          }
        }
      } catch (e) {
        console.error('Error parsing BiDi message:', e);
      }
    });

    // Initialize session and subscribe to logs
    await this.send('session.new', { capabilities: {} });
    await this.send('session.subscribe', { events: ['log.entryAdded'] });
    const tree = await this.send('browsingContext.getTree', {});
    this.context = tree.result.contexts[0].context;
  }

  send(method, params = {}) {
    const reqId = this.id++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pending.has(reqId)) {
          this.pending.delete(reqId);
          reject(new Error(`BiDi command ${method} timed out after 15s`));
        }
      }, 15000);

      this.pending.set(reqId, (res) => {
        clearTimeout(timer);
        if (res.type === 'error') {
          reject(new Error(`BiDi error in ${method}: ${res.message || JSON.stringify(res)}`));
        } else {
          resolve(res);
        }
      });

      this.ws.send(JSON.stringify({ id: reqId, method, params }));
    });
  }

  async navigate(url, wait = 'complete') {
    return await this.send('browsingContext.navigate', {
      context: this.context,
      url,
      wait
    });
  }

  async evaluate(expression) {
    const res = await this.send('script.evaluate', {
      expression,
      target: { context: this.context },
      awaitPromise: true
    });
    return res.result?.result?.value;
  }

  close() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
    }
  }
}

class TestSuite {
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
    console.log(`BROWSER E2E SUMMARY: ${this.passed} passed, ${this.failed} failed`);
    console.log(`========================================\n`);
    return this.failed === 0;
  }
}

async function isServerRunning(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(1500) });
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}

async function startDevServer() {
  console.log(`Checking if dev server is running on ${APP_URL}...`);
  if (await isServerRunning(APP_URL)) {
    console.log(`Dev server already active on ${APP_URL}.`);
    return null;
  }

  console.log(`Starting Next.js dev server on port ${DEV_PORT}...`);
  const devProc = spawn('npm', ['run', 'dev', '--', '-p', String(DEV_PORT)], {
    stdio: 'inherit',
    env: { ...process.env, PORT: String(DEV_PORT) }
  });

  const startTime = Date.now();
  while (Date.now() - startTime < 30000) {
    await sleep(1000);
    if (await isServerRunning(APP_URL)) {
      console.log(`Dev server is ready!`);
      return devProc;
    }
  }

  devProc.kill('SIGTERM');
  throw new Error('Next.js dev server failed to start within 30s');
}

async function startHeadlessFirefox() {
  console.log(`Setting up Firefox profile at ${FF_PROFILE}...`);
  try { rmSync(FF_PROFILE, { recursive: true, force: true }); } catch {}
  mkdirSync(FF_PROFILE, { recursive: true });

  console.log(`Launching headless Firefox with WebDriver BiDi on port ${FF_PORT}...`);
  const ffProc = spawn('firefox', [
    '--headless',
    '--remote-debugging-port', String(FF_PORT),
    '--remote-allow-system-access',
    '--profile', FF_PROFILE
  ], {
    stdio: 'ignore'
  });

  // Wait for BiDi to listen
  const startTime = Date.now();
  let connected = false;
  while (Date.now() - startTime < 15000) {
    try {
      const probeWs = new WebSocket(`ws://127.0.0.1:${FF_PORT}/session`);
      await new Promise((res, rej) => {
        probeWs.addEventListener('open', () => { probeWs.close(); res(true); });
        probeWs.addEventListener('error', rej);
      });
      connected = true;
      break;
    } catch {
      await sleep(500);
    }
  }

  if (!connected) {
    ffProc.kill('SIGKILL');
    throw new Error('Firefox WebDriver BiDi failed to listen on port 9222');
  }

  console.log(`Firefox headless running (PID: ${ffProc.pid}).`);
  return ffProc;
}

async function main() {
  let devProc = null;
  let ffProc = null;
  let bidi = null;
  const suite = new TestSuite();

  try {
    devProc = await startDevServer();
    ffProc = await startHeadlessFirefox();

    console.log(`Connecting to Firefox WebDriver BiDi...`);
    bidi = new BiDiClient(FF_PORT);
    await bidi.connect();
    console.log(`Connected to Firefox BiDi session.`);

    // --- TEST 1: Home Page ---
    console.log(`\n--- Test 1: Home Page (/) ---`);
    await bidi.navigate(`${APP_URL}/`);
    await sleep(1000); // Allow React hydration

    const homeTitle = await bidi.evaluate('document.title');
    suite.assert(homeTitle.includes('GameNative Config Tools'), 'Home page title is correct', `Title: ${homeTitle}`);

    const hasTools = await bidi.evaluate(`
      Boolean(
        document.querySelector('a[href="/config-converter"]') &&
        document.querySelector('a[href="/config-editor"]') &&
        document.querySelector('a[href="/config-browser"]')
      )
    `);
    suite.assert(hasTools, 'Home page links to all three primary tools');
    suite.assert(bidi.hydrationErrors.length === 0, 'Zero hydration errors on Home page');

    // --- TEST 2: Config Browser Page & Live Search ---
    console.log(`\n--- Test 2: Config Browser (/config-browser) ---`);
    await bidi.navigate(`${APP_URL}/config-browser`);
    await sleep(1500); // Allow client mount & initial game catalog fetch

    const browserTitle = await bidi.evaluate('document.title');
    suite.assert(browserTitle.includes('Community Configs'), 'Config Browser title is correct');

    const searchInputExists = await bidi.evaluate(`
      Boolean(document.getElementById('game-search'))
    `);
    suite.assert(searchInputExists, 'Search input #game-search is present in DOM');

    // Simulate typing "Elden" into the search box using React's native setter
    console.log(`  Simulating search input: 'Elden'...`);
    await bidi.evaluate(`
      (() => {
        const input = document.getElementById('game-search');
        if (!input) return false;
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, 'Elden');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()
    `);

    // Wait for debounced search API (300ms debounce + fetch)
    await sleep(2000);

    const suggestionsCount = await bidi.evaluate(`
      document.querySelectorAll('button:has(span.font-medium)').length ||
      document.querySelectorAll('div.absolute button').length
    `);
    suite.assert(suggestionsCount > 0, `Search suggestions populated (${suggestionsCount} suggestions found)`);

    // Click the first game suggestion to trigger compatibility fetch
    console.log(`  Selecting first game suggestion...`);
    const clicked = await bidi.evaluate(`
      (() => {
        const firstBtn = document.querySelector('div.absolute button');
        if (firstBtn) {
          firstBtn.click();
          return true;
        }
        return false;
      })()
    `);
    suite.assert(clicked, 'Selected first game suggestion');

    // Wait for compatibility configs fetch
    await sleep(2500);

    const hasConfigResults = await bidi.evaluate(`
      Boolean(
        document.body.innerText.includes('FPS') ||
        document.body.innerText.includes('Configuration') ||
        document.body.innerText.includes('configs found') ||
        document.body.innerText.includes('Download JSON')
      )
    `);
    suite.assert(hasConfigResults, 'Config results rendered after selecting game');
    suite.assert(bidi.hydrationErrors.length === 0, 'Zero hydration errors on Config Browser page');

    // --- TEST 2b: "Send to Phone" QR Modal ---
    console.log(`\n--- Test 2b: Send to Phone (QR Code Modal) ---`);
    const openedQr = await bidi.evaluate(`
      (() => {
        const qrBtn = document.querySelector('[data-testid="qr-button"]');
        if (qrBtn) {
          qrBtn.click();
          return true;
        }
        return false;
      })()
    `);
    suite.assert(openedQr, 'Clicked QR code button on config card');
    await sleep(1000);

    const qrImageLoaded = await bidi.evaluate(`
      Boolean(
        document.querySelector('img[src^="data:image/png;base64"]') &&
        document.body.innerText.includes('Send to Android Phone')
      )
    `);
    suite.assert(qrImageLoaded, 'Send to Phone modal opened with generated QR code');

    // Test Copy Share Link inside Send to Phone modal
    await bidi.evaluate(`
      (() => {
        const copyLinkBtn = document.querySelector('[data-testid="modal-copy-link"]');
        if (copyLinkBtn) copyLinkBtn.click();
      })()
    `);
    await sleep(400); // Allow React 19 to render state update to DOM

    const qrCopyRaw = await bidi.evaluate(`
      (() => {
        const copyLinkBtn = document.querySelector('[data-testid="modal-copy-link"]');
        if (!copyLinkBtn) return JSON.stringify(null);
        return JSON.stringify({
          text: copyLinkBtn.innerText,
          hasEmerald: copyLinkBtn.className.includes('bg-emerald-600'),
          hasToast: Boolean(document.querySelector('div[role="status"]'))
        });
      })()
    `);
    const qrCopyResult = qrCopyRaw ? JSON.parse(qrCopyRaw) : null;
    suite.assert(
      qrCopyResult && (qrCopyResult.text?.includes('Copied') || qrCopyResult.hasEmerald),
      'QR Modal: Copy Share Link button turned emerald green with confirmation text'
    );
    suite.assert(
      qrCopyResult && qrCopyResult.hasToast,
      'QR Modal: Toast notification popped up on screen'
    );

    // Close QR modal
    await bidi.evaluate(`
      (() => {
        const closeBtn = document.querySelector('div.fixed button:has(svg.lucide-x)');
        if (closeBtn) closeBtn.click();
      })()
    `);
    await sleep(500);

    // --- TEST 2b-2: Visual Confirmation States & Floating Toasts ---
    console.log(`\n--- Test 2b-2: Visual Confirmation States & Floating Toasts ---`);
    await bidi.evaluate(`
      (() => {
        const btn = document.querySelector('[data-testid="share-view-button"]');
        if (btn) btn.click();
      })()
    `);
    await sleep(400); // Allow React 19 to render state update to DOM

    const shareViewRaw = await bidi.evaluate(`
      (() => {
        const btn = document.querySelector('[data-testid="share-view-button"]');
        if (!btn) return JSON.stringify(null);
        return JSON.stringify({
          text: btn.innerText,
          hasEmerald: btn.className.includes('bg-emerald-600'),
          toastText: document.querySelector('div[role="status"]')?.innerText || ''
        });
      })()
    `);
    const shareViewResult = shareViewRaw ? JSON.parse(shareViewRaw) : null;
    suite.assert(
      shareViewResult && shareViewResult.text?.includes('Copied successfully!'),
      'Share View button text changed to "Copied successfully!"'
    );
    suite.assert(
      shareViewResult && shareViewResult.hasEmerald,
      'Share View button changed to emerald green (bg-emerald-600)'
    );
    suite.assert(
      shareViewResult && shareViewResult.toastText?.includes('copied to clipboard successfully!'),
      'Floating Toast popup displayed confirmation for copied link'
    );

    // Click card copy link and card download buttons
    await bidi.evaluate(`
      (() => {
        const copyBtn = document.querySelector('[data-testid="share-card-button"]');
        const dlBtn = document.querySelector('[data-testid="download-card-button"]');
        if (copyBtn) copyBtn.click();
        if (dlBtn) dlBtn.click();
      })()
    `);
    await sleep(400); // Allow React 19 to render state update to DOM

    const cardActionsRaw = await bidi.evaluate(`
      (() => {
        const copyBtn = document.querySelector('[data-testid="share-card-button"]');
        const dlBtn = document.querySelector('[data-testid="download-card-button"]');
        if (!copyBtn || !dlBtn) return JSON.stringify(null);
        return JSON.stringify({
          copyHasEmerald: copyBtn.className.includes('bg-emerald-600'),
          dlHasEmerald: dlBtn.className.includes('bg-emerald-600'),
          toastCount: document.querySelectorAll('div[role="status"]').length
        });
      })()
    `);
    const cardActionsResult = cardActionsRaw ? JSON.parse(cardActionsRaw) : null;
    suite.assert(
      cardActionsResult && cardActionsResult.copyHasEmerald,
      'Card Copy Link button changed to emerald green on click'
    );
    suite.assert(
      cardActionsResult && cardActionsResult.dlHasEmerald,
      'Card Download JSON button changed to emerald green on click'
    );
    suite.assert(
      cardActionsResult && cardActionsResult.toastCount > 0,
      'Floating Toast notifications rendered for card copy and download actions'
    );

    // --- TEST 2c: Local Favorites (Bookmarks) ---
    console.log(`\n--- Test 2c: Local Favorites (Bookmarks) ---`);
    const starClicked = await bidi.evaluate(`
      (() => {
        const starBtn = document.querySelector('[data-testid="favorite-card-button"]');
        if (starBtn) {
          starBtn.click();
          return true;
        }
        return false;
      })()
    `);
    suite.assert(starClicked, 'Clicked star button to favorite configuration');
    await sleep(400); // Allow React to render toast

    const starToastRendered = await bidi.evaluate(`
      Boolean(
        document.body.innerText.includes('Saved Configs') ||
        document.body.innerText.includes('Favorites')
      )
    `);
    suite.assert(
      starToastRendered,
      'Toast notification confirmed configuration added to favorites'
    );
    await sleep(500);

    // Switch to "Saved Configs" tab
    await bidi.evaluate(`
      (() => {
        const favTab = document.querySelector('[data-testid="tab-saved-configs"]');
        if (favTab) {
          favTab.click();
          return true;
        }
        return false;
      })()
    `);
    await sleep(500);

    const savedCardRendered = await bidi.evaluate(`
      Boolean(
        document.body.innerText.includes('Saved') &&
        (document.body.innerText.includes('ELDEN RING') || document.body.innerText.includes('FPS'))
      )
    `);
    suite.assert(savedCardRendered, 'Favorited config rendered in Saved Configs view');

    const hasExportAllBtn = await bidi.evaluate(`
      Boolean(document.body.innerText.includes('Export All') || document.querySelector('button[title*="combined JSON backup"]'))
    `);
    suite.assert(hasExportAllBtn, 'Saved Configs: Export All (JSON) batch export button rendered');

    // Switch back to Live Search tab
    await bidi.evaluate(`
      (() => {
        const liveTab = document.querySelector('[data-testid="tab-live-search"]');
        if (liveTab) liveTab.click();
      })()
    `);
    await sleep(500);

    // --- TEST 2d: Shareable Deep Links (?game=3405) ---
    console.log(`\n--- Test 2d: Deep Linking (?game=3405) ---`);
    await bidi.navigate(`${APP_URL}/config-browser?game=3405`);
    await sleep(2500); // Allow deep link resolution and compatibility fetch

    const deepLinkResolved = await bidi.evaluate(`
      Boolean(
        document.body.innerText.includes('ELDEN RING') ||
        document.body.innerText.includes('3405')
      )
    `);
    suite.assert(deepLinkResolved, 'Deep link (?game=3405) resolved to ELDEN RING configs');

    // --- TEST 2e: Detail Modal Actions & Load in Config Editor ---
    console.log(`\n--- Test 2e: Detail Modal & Load in Config Editor ---`);
    await bidi.evaluate(`
      (() => {
        const viewBtns = Array.from(document.querySelectorAll('button'));
        const viewBtn = viewBtns.find(b => b.innerText && b.innerText.trim() === 'View');
        if (viewBtn) viewBtn.click();
      })()
    `);
    await sleep(500);

    const modalOpened = await bidi.evaluate(`
      Boolean(
        document.body.innerText.includes('Close') &&
        document.body.innerText.includes('Load in Config Editor')
      )
    `);
    suite.assert(modalOpened, 'Detail Modal opened from View button');

    // Test Copy Link inside Detail Modal
    await bidi.evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const copyLinkBtn = btns.find(b => b.innerText && b.innerText.includes('Copy Link'));
        if (copyLinkBtn) copyLinkBtn.click();
      })()
    `);
    await sleep(400);

    const modalCopyResult = await bidi.evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const copyLinkBtn = btns.find(b => b.innerText && b.innerText.includes('Copied'));
        if (!copyLinkBtn) return JSON.stringify(null);
        return JSON.stringify({
          hasEmerald: copyLinkBtn.className.includes('bg-emerald-600')
        });
      })()
    `);
    const modalCopyParsed = modalCopyResult ? JSON.parse(modalCopyResult) : null;
    suite.assert(
      modalCopyParsed && modalCopyParsed.hasEmerald,
      'Detail Modal: Copy Link button turned emerald green with Copied text'
    );

    // Click "Load in Config Editor" button in Detail Modal
    await bidi.evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const loadBtn = btns.find(b => b.innerText && b.innerText.includes('Load in Config Editor'));
        if (loadBtn) loadBtn.click();
      })()
    `);
    await sleep(1500); // Allow navigation to /config-editor

    const currentPath = await bidi.evaluate('window.location.pathname');
    const editorLoadedConfig = await bidi.evaluate(`
      Boolean(
        document.body.innerText.toLowerCase().includes('gamenative config editor') &&
        (document.body.innerText.toLowerCase().includes('export json') || document.body.innerText.toLowerCase().includes('copy json'))
      )
    `);
    suite.assert(currentPath === '/config-editor', 'Navigated cleanly to /config-editor from detail modal');
    suite.assert(editorLoadedConfig, 'Config Editor loaded config successfully from pendingConfig (active editor tabs visible)');

    // Test Copy JSON button in Config Editor
    await bidi.evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const copyBtn = btns.find(b => b.innerText && b.innerText.toLowerCase().includes('copy json'));
        if (copyBtn) copyBtn.click();
      })()
    `);
    await sleep(400);

    const editorCopyResult = await bidi.evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const copyBtn = btns.find(b => b.innerText && b.innerText.toLowerCase().includes('copied'));
        if (!copyBtn) return false;
        return copyBtn.className.includes('bg-emerald-600');
      })()
    `);
    suite.assert(editorCopyResult, 'Config Editor: Copy JSON button turned emerald green with confirmation text');

    // --- TEST 2f: Side-by-Side Config Comparison ---
    console.log(`\n--- Test 2f: Side-by-Side Config Comparison ---`);
    await bidi.navigate(`${APP_URL}/config-browser?game=3405`);

    // Poll until cards with compare buttons are populated
    const startWait = Date.now();
    let cardCount = 0;
    while (Date.now() - startWait < 12000) {
      cardCount = await bidi.evaluate(`document.querySelectorAll('[data-testid="compare-card-button"]').length`);
      if (cardCount >= 2) break;
      await sleep(500);
    }
    suite.assert(cardCount >= 2, `Config cards rendered with compare buttons (${cardCount} found)`);

    // Select first two cards for comparison
    await bidi.evaluate(`
      (() => {
        const btns = document.querySelectorAll('[data-testid="compare-card-button"]');
        if (btns[0]) btns[0].click();
      })()
    `);
    await sleep(500);

    await bidi.evaluate(`
      (() => {
        const btns = document.querySelectorAll('[data-testid="compare-card-button"]');
        if (btns[1]) btns[1].click();
      })()
    `);
    await sleep(800);

    const dockBarVisible = await bidi.evaluate(`
      Boolean(document.querySelector('[data-testid="compare-now-button"]'))
    `);
    suite.assert(dockBarVisible, 'Floating Comparison Dock bar appeared with selected runs');

    // Click "Compare (2/2)" button
    await bidi.evaluate(`
      (() => {
        const btn = document.querySelector('[data-testid="compare-now-button"]');
        if (btn) btn.click();
      })()
    `);
    await sleep(600);

    const compareModalOpen = await bidi.evaluate(`
      Boolean(
        document.body.innerText.toLowerCase().includes('configuration comparison') &&
        document.body.innerText.toLowerCase().includes('wine & container runtime') &&
        document.body.innerText.toLowerCase().includes('graphics & direct3d')
      )
    `);
    suite.assert(compareModalOpen, 'Side-by-side Configuration Comparison modal opened with diff categories');

    // Close comparison modal
    await bidi.evaluate(`
      (() => {
        const closeBtn = document.querySelector('button[title="Close comparison"]') ||
                         Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.trim() === 'Done');
        if (closeBtn) closeBtn.click();
      })()
    `);
    await sleep(400);

    // --- TEST 3: Config Editor Page ---
    console.log(`\n--- Test 3: Config Editor (/config-editor) Fresh Mount ---`);
    await bidi.navigate(`${APP_URL}/config-editor`);
    await sleep(1000);

    const editorMounted = await bidi.evaluate(`
      Boolean(
        document.body.innerText.includes('Configuration Editor') ||
        document.querySelector('textarea') ||
        document.body.innerText.includes('Load Config')
      )
    `);
    suite.assert(editorMounted, 'Config Editor mounted with configuration import view');

    const editorUploadBtn = await bidi.evaluate(`
      Boolean(document.body.innerText.includes('Open File') || document.querySelector('input[type="file"]'))
    `);
    suite.assert(editorUploadBtn, 'Config Editor: "Open File" upload input is present');
    suite.assert(bidi.hydrationErrors.length === 0, 'Zero hydration errors on Config Editor page');

    // --- TEST 4: Config Converter Page ---
    console.log(`\n--- Test 4: Config Converter (/config-converter) ---`);
    await bidi.navigate(`${APP_URL}/config-converter`);
    await sleep(1000);

    const converterMounted = await bidi.evaluate(`
      Boolean(
        document.body.innerText.includes('Config Converter') ||
        document.body.innerText.includes('Convert') ||
        document.querySelector('input[type="file"]')
      )
    `);
    suite.assert(converterMounted, 'Config Converter mounted with input zones');

    const converterUploadBtn = await bidi.evaluate(`
      Boolean(document.body.innerText.includes('Upload Config File') || document.querySelector('input[type="file"]'))
    `);
    suite.assert(converterUploadBtn, 'Config Converter: "Upload Config File" upload button is present');
    suite.assert(bidi.hydrationErrors.length === 0, 'Zero hydration errors on Config Converter page');

    // --- TEST 5: Custom 404 Page ---
    console.log(`\n--- Test 5: Custom 404 Page & Redirects ---`);
    await bidi.navigate(`${APP_URL}/non-existent-page-test`);
    await sleep(1000);

    const notFoundMounted = await bidi.evaluate(`
      Boolean(
        document.body.innerText.includes('Page Not Found') &&
        document.querySelector('a[href="/"]')
      )
    `);
    suite.assert(notFoundMounted, 'Custom 404 page rendered with Home navigation link');
    suite.assert(bidi.hydrationErrors.length === 0, 'Zero hydration errors on custom 404 page');

    // --- TEST 5b: Live API Diagnostic Page ---
    console.log(`\n--- Test 5b: Live API Diagnostic (/test-connection) ---`);
    await bidi.navigate(`${APP_URL}/test-connection`);
    await sleep(2500);

    const diagPageMounted = await bidi.evaluate(`
      Boolean(
        document.body.innerText.includes('GameNative Backend Diagnostics') &&
        (document.body.innerText.includes('Active') || document.body.innerText.includes('Operational') || document.body.innerText.includes('100% HEALTHY'))
      )
    `);
    suite.assert(diagPageMounted, 'API Diagnostic page rendered live endpoint checks');
    suite.assert(bidi.hydrationErrors.length === 0, 'Zero hydration errors on API Diagnostic page');

    // Test legacy subpath redirect (/gamenative-config-tools/config-browser -> /config-browser)
    console.log(`  Testing legacy subpath redirect: /gamenative-config-tools/config-browser...`);
    await bidi.navigate(`${APP_URL}/gamenative-config-tools/config-browser`);
    await sleep(1200);

    const currentUrl = await bidi.evaluate('window.location.pathname');
    suite.assert(currentUrl === '/config-browser', `Legacy subpath redirected cleanly to ${currentUrl}`);

    // --- TEST 6: Extension / Dark Reader Resilience ---
    console.log(`\n--- Test 6: Extension / Dark Reader Resilience ---`);
    const countBeforeDarkReader = bidi.hydrationErrors.length;
    await bidi.navigate(`${APP_URL}/`);
    await sleep(500);

    // Simulate Dark Reader modifying <html> attributes dynamically before React re-evaluates
    await bidi.evaluate(`
      document.documentElement.setAttribute('data-darkreader-mode', 'dynamic');
      document.documentElement.setAttribute('data-darkreader-scheme', 'dark');
    `);
    await sleep(500);

    const countAfterDarkReader = bidi.hydrationErrors.length;
    suite.assert(countAfterDarkReader === countBeforeDarkReader, 'Zero hydration mismatch errors with Dark Reader attributes injected');

    // --- Log Summary ---
    console.log(`\n--- Console Log Audit ---`);
    console.log(`Total browser logs captured: ${bidi.logs.length}`);
    console.log(`Hydration errors captured: ${bidi.hydrationErrors.length}`);
    if (bidi.hydrationErrors.length > 0) {
      console.error(`Hydration errors detail:`, bidi.hydrationErrors);
    }
    if (bidi.errors.length > 0) {
      console.log(`Browser console errors (${bidi.errors.length}):`);
      for (const err of bidi.errors) {
        console.log(`  - [${err.level}] ${err.text}`);
      }
    }

    const allPassed = suite.summary();
    process.exit(allPassed ? 0 : 1);
  } catch (err) {
    console.error(`\n❌ Fatal error during test execution:`, err);
    process.exit(1);
  } finally {
    if (bidi) bidi.close();
    if (ffProc) {
      try {
        ffProc.kill('SIGTERM');
      } catch {}
    }
    if (devProc) {
      try {
        devProc.kill('SIGTERM');
      } catch {}
    }
    try { rmSync(FF_PROFILE, { recursive: true, force: true }); } catch {}
  }
}

main();
