# 🛠️ GameNative Config Tools

> **Complete configuration management for your GameNative emulator.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Status: Active](https://img.shields.io/badge/Status-Active-brightgreen.svg)](https://andreisugu.github.io/gamenative-config-tools/)
[![Platform: Web](https://img.shields.io/badge/Platform-Web-blue.svg)](https://andreisugu.github.io/gamenative-config-tools/)

Built with **Next.js**, **TypeScript**, and **Tailwind CSS** for a modern, type-safe, and responsive experience.

## 🔗 Quick Links

| Tool | Description |
|------|-------------|
| [🏠 **Main Site**](https://andreisugu.github.io/gamenative-config-tools/) | Central hub for all tools |
| [🔍 **Config Browser**](https://andreisugu.github.io/gamenative-config-tools/config-browser) | Browse, compare, and transfer community configs |
| [✏️ **Config Editor**](https://andreisugu.github.io/gamenative-config-tools/config-editor) | Edit configurations visually with smart presets |
| [🔄 **Config Converter**](https://andreisugu.github.io/gamenative-config-tools/config-converter) | Convert raw reports & drag-and-drop JSON |
| [📊 **Live Diagnostics**](https://andreisugu.github.io/gamenative-config-tools/test-connection) | Test API connectivity, latency, and schemas |

## 📑 Table of Contents

- [The Problem](#-the-problem)
- [The Solution](#-the-solution)
- [Features](#-features)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [Getting Started](#-getting-started)
- [Detailed Usage](#-detailed-usage)
- [Technical Details](#-technical-details)
- [Community & Support](#-community--support)
- [License](#-license)

---

## 🚨 The Problem

GameNative/Winlator users share game configurations (FPS, drivers, environment variables) in community databases, but there's a disconnect:

- **Database:** Perfect settings in raw text format or web listings
- **App:** Manual entry required, one setting at a time
- **Result:** Typos, frustration, and wasted time

**Stop typing. Start playing.**

## ✅ The Solution

A unified suite of web tools to streamline your GameNative configuration workflow:

| Tool | Purpose |
|------|---------|
| **🔍 Config Browser** | Search official community configurations, compare side-by-side, send to phone via QR, and bookmark favorites |
| **✏️ Config Editor** | Visual container editor with drag-and-drop file import, 1-click smart hardware presets, and sanity checks |
| **🔄 Config Converter** | Converts raw community report dumps into clean, importable GameNative JSON files |
| **📊 Live Diagnostics** | Real-time endpoint health, latency benchmarking, and schema validation against `api.gamenative.app` |

---

## ✨ Features

<details>
<summary><strong>🔍 Config Browser & Comparison</strong></summary>

* **Live Community Search:** Fast, debounced typeahead connected directly to the official `api.gamenative.app` database
* **Side-by-Side Diff & Comparison:** Select any 2 configurations to compare parameter-by-parameter across 5 categories (Performance, Wine, Graphics, Emulation, Environment) with diff badges and a "Differences Only" toggle
* **Send to Phone (QR Code):** One-click QR code modal to instantly transfer configuration links straight to Android cameras or mobile browsers without cables
* **Shareable Deep Links:** Direct URL parameter linking (`?game=3405&run=723866`) for instant community sharing and forum discussions
* **Saved Configs (Local Favorites):** Bookmark tested configurations with star (★) for instant offline access
* **Batch JSON Export:** Download all favorited configs as a single combined JSON backup bundle
* **Hardware & GPU Filtering:** Filter by tested hardware GPU (Adreno, Mali, Immortalis, etc.), star rating, and custom sorting (`created_at`, `rating`, `avg_fps`)
* **Seamless Integration:** Open any card directly in the visual Config Editor or download as Android-ready `config.json`

</details>

<details>
<summary><strong>✏️ Config Editor & Smart Presets</strong></summary>

* **Visual Interface:** Intuitive, organized UI mirroring GameNative's container setup across 10 categories
* **Drag-and-Drop Import:** Drag `.json` files straight onto the editor or browse via the file picker ("Open File")
* **Smart Hardware Presets:** 1-click presets for *Snapdragon Performance* (Dynarec flags, big cores), *Balanced (Big Cores)*, and *Safe Compatibility*
* **Real-Time Sanity Validation:** Non-blocking warning banners alert you to Box64 SAFE performance drops, unconfigured CPU affinity, or empty executable paths with direct shortcut navigation
* **10 Organized Categories:** General, Graphics, Emulation, Controller, Wine, Components, Environment, Drives, Advanced, and Hidden
* **Import/Export:** Export Android-ready `config.json` with visual copy confirmation and clipboard toast feedback

</details>

<details>
<summary><strong>🔄 Config Converter</strong></summary>

* **Drag-and-Drop Upload:** Drag raw config files directly into the input area or use the file upload selector
* **Intelligent Parsing:** Handles dense raw text where keys and values are packed without spacing
* **Smart Type Inference:** Auto-converts `true`/`false` to booleans and numeric strings to numbers
* **Complex Data Handling:** Detects and parses nested JSON in fields like `extraData` and `sessionMetadata`
* **Data Normalization:** Fixes property naming inconsistencies (e.g., `lc all` → `lc_all`)
* **Junk Filtration:** Strips useless runtime metadata (e.g., `avg fps`, `session length`)
* **Android-Ready:** Outputs the exact container structure required by GameNative Import/Export

</details>

<details>
<summary><strong>📱 PWA & Handheld Optimization</strong></summary>

* **Progressive Web App (PWA):** Installable web application with standalone window support, tailored for Android gaming handhelds (Ayn Odin, Steam Deck, ROG Ally, Retroid Pocket, etc.)
* **Extension & Dark Reader Resilience:** Hardened DOM rendering preventing hydration mismatches from dark mode browser extensions, translation tools, or injected scripts
* **Offline-Ready Favorites:** Cached bookmarks and local storage support ensure your favorited configurations remain accessible without active internet

</details>

<details>
<summary><strong>📊 Live API Diagnostics</strong></summary>

* **Live Latency Benchmark:** Real-time round-trip latency metrics for GameNative API services
* **Schema Validation:** Validates API JSON payloads against strict runtime schemas (Zod)
* **Status Dashboard:** Visual indicator badges for Game Search, Device Catalog, and Compatibility queries

</details>

---

## 🧪 Testing & Quality Assurance

The codebase includes full automated test coverage across live API contracts, browser interaction, and hydration resilience using headless Firefox WebDriver BiDi:

```bash
# Run the complete test suite (API contracts + headless browser E2E)
npm run test:all

# Run live API contract and schema validation suite
npm run test:api

# Run headless Firefox WebDriver BiDi E2E suite
# (Tests autocomplete, QR generation, deep linking, diff comparison, toasts, and extension resilience)
npm run test:e2e
```

---

## 🚀 Getting Started

### Quick Start Guide

1. **Find a configuration:**
   - Visit [GameNative Compatibility List](https://gamenative.app/compatibility/) or [Config Browser](https://andreisugu.github.io/gamenative-config-tools/config-browser)
   - Select a game report and click **"View Config"**
   - Copy all the text

2. **Convert to JSON:**
   - Open [Config Converter](https://andreisugu.github.io/gamenative-config-tools/config-converter)
   - Paste the text and click **"Download Clean Config"**

3. **Optional - Edit settings:**
   - Open [Config Editor](https://andreisugu.github.io/gamenative-config-tools/config-editor)
   - Paste JSON, make changes, and export

4. **Import to GameNative:**
   - Transfer `config.json` to your Android device
   - In GameNative, press on any game → 3 dots → **Import Config**

## 📖 Detailed Usage

<details>
<summary><strong>Converting Raw Configs</strong></summary>

### Step-by-Step

1. **Get Raw Data**
   - Navigate to a GameNative/Winlator config database
   - Click "View" on a config report
   - Copy all the text

2. **Convert to JSON**
   - Open [Config Converter](https://andreisugu.github.io/gamenative-config-tools/config-converter)
   - Paste the raw text
   - Click **"Download Clean Config"**

3. **Import to App**
   - Transfer `config.json` to Android
   - GameNative → Select game → 3 dots → **Import Config**

</details>

<details>
<summary><strong>Editing Existing Configs</strong></summary>

### Step-by-Step

1. **Load Config**
   - Open [Config Editor](https://andreisugu.github.io/gamenative-config-tools/config-editor)
   - Paste JSON (from GameNative export or Converter)
   - Click **"Load Config"**

2. **Make Changes**
   - Navigate tabs: General, Graphics, Emulation, etc.
   - Adjust settings as needed

3. **Export and Import**
   - Click **"Export JSON"**
   - Transfer to Android and import via GameNative

</details>

---

## 🧩 Technical Details

<details>
<summary><strong>Implementation Overview</strong></summary>

Built to support the **Import/Export JSON Schema** from GameNative Android source code.

### Config Converter

**Lookahead Parser:**
- Iterates through raw text line by line
- Uses `KNOWN_KEYS` set to differentiate keys from values
- Nests controller buttons into `controllerEmulationBindings` object

### Config Editor

**Structured Interface:**
- 10 logical categories mirroring in-app "Edit Container" style
- Dynamic form controls based on configuration schema
- Special handling for CPU affinity grids, environment variables, and drive mappings
- Real-time synchronization between related fields (GPU name ↔ renderer)

### Config Browser
 
**Modern API-First Architecture:**

The browser connects directly to the official GameNative worker API (`api.gamenative.app`):
- **Live Search:** Debounced instant query typeahead hitting `/api/games/search`
- **Dynamic Hardware Filters:** Extracted hardware catalog from `/api/devices`
- **Zod-Validated Queries:** Strict pagination, rating minimums, and sorting (`created_at`, `rating`, `avg_fps`)
- **Seamless Integration:** Direct Config Editor loading and JSON export with Android-ready structure
- **Zero Bloat:** Eliminates multi-megabyte JSON snapshots and client-side WebAssembly databases
 
 </details>

---

## 🌍 Community & Support

These tools support the incredible work of GameNative developers and community. Find the official project here:

- 🌐 **Official Website:** [GameNative.app](https://gamenative.app/)
- 📦 **Source Code:** [GameNative GitHub](https://github.com/utkarshdalal/GameNative)
- 💬 **Discord:** [Join the Community](https://discord.gg/2hKv4VfZfE)

### ⚠️ Compatibility Note

These tools generate JSON files compatible with GameNative builds that include **Import/Export PR (#232)**. Update to the latest release if the Import button is unavailable.

---

## 📄 License

MIT License - see [LICENSE](https://opensource.org/licenses/MIT) for details.

---

*Not affiliated with official GameNative development. Built by the community, for the community.*
