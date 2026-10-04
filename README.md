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
| [🔄 **Config Converter**](https://andreisugu.github.io/gamenative-config-tools/config-converter) | Convert raw text to JSON |
| [✏️ **Config Editor**](https://andreisugu.github.io/gamenative-config-tools/config-editor) | Edit configurations visually |
| [🔍 **Config Browser**](https://andreisugu.github.io/gamenative-config-tools/config-browser) | Browse community configs |

## 📑 Table of Contents

- [The Problem](#-the-problem)
- [The Solution](#-the-solution)
- [Features](#-features)
- [Getting Started](#-getting-started)
- [Detailed Usage](#-detailed-usage)
- [Technical Details](#-technical-details)
- [Community & Support](#-community--support)
- [License](#-license)

---

## 🚨 The Problem

GameNative/Winlator users share game configurations (FPS, drivers, environment variables) in community databases, but there's a disconnect:

- **Database:** Perfect settings in raw text format
- **App:** Manual entry required, one setting at a time
- **Result:** Typos, frustration, and wasted time

**Stop typing. Start playing.**

## ✅ The Solution

Three complementary web tools to streamline your GameNative configuration workflow:

| Tool | Purpose |
|------|---------|
| **🔄 Config Converter** | Converts raw text from community reports into clean, importable JSON files |
| **✏️ Config Editor** | Visual editor for fine-tuning configurations across 10 organized categories |
| **🔍 Config Browser** | Search community configurations with intelligent caching and filtering |

---

## ✨ Features

<details>
<summary><strong>🔄 Config Converter</strong></summary>

* **Intelligent Parsing:** Handles dense raw text where keys and values are packed without spacing
* **Smart Type Inference:** Auto-converts `true`/`false` to booleans and numeric strings to numbers
* **Complex Data Handling:** Detects and parses nested JSON in fields like `extraData` and `sessionMetadata`
* **Data Normalization:** Fixes property naming inconsistencies (e.g., `lc all` → `lc_all`)
* **Junk Filtration:** Strips useless runtime metadata (e.g., `avg fps`, `session length`)
* **Android-Ready:** Outputs the exact structure required by GameNative Import/Export

</details>

<details>
<summary><strong>✏️ Config Editor</strong></summary>

* **Visual Interface:** Intuitive, organized UI for all configuration settings
* **10 Organized Categories:** General, Graphics, Emulation, Controller, Wine, Components, Environment, Drives, Advanced, and Hidden
* **Real-Time Validation:** Visual feedback and smart defaults ensure valid configurations
* **Import/Export:** Load existing configs, modify, and export updated versions
* **Cross-Tool Integration:** Seamlessly switch between Converter and Editor

</details>

<details>
<summary><strong>🔍 Config Browser</strong></summary>

* **Live Community Search:** Fast, debounced typeahead connected directly to `api.gamenative.app`
* **Real-time Filtering:** Filter by tested hardware GPU, star rating, and custom sorting
* **Rich Preview:** View ratings, FPS, device models, notes, and container specifications
* **Seamless Integration:** Load directly into Config Editor or download as Android-ready JSON
* **Zero Bloat:** No massive database dumps or heavy client-side databases

</details>

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
