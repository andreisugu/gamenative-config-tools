# 🛠️ GameNative Config Tools

> **Complete configuration management for your GameNative emulator.**

Built with **Next.js**, **TypeScript**, and **Tailwind CSS** for a modern, type-safe, and responsive experience.

### [**🏠 Main Site**](https://andreisugu.github.io/gamenative-config-tools/) - Central hub for all tools
### 🔄 [**Launch Config Converter**](https://andreisugu.github.io/gamenative-config-tools/config-converter)
### ✏️ [**Launch Config Editor**](https://andreisugu.github.io/gamenative-config-tools/config-editor)
### 🔍 [**Launch Config Browser**](https://andreisugu.github.io/gamenative-config-tools/config-browser)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Status: Active](https://img.shields.io/badge/Status-Active-brightgreen.svg)](https://andreisugu.github.io/gamenative-config-tools/)
[![Platform: Web](https://img.shields.io/badge/Platform-Web-blue.svg)](https://andreisugu.github.io/gamenative-config-tools/)

---

## 🚨 The Problem

The GameNative/Winlator community is amazing. Users rigorously test games and upload configuration data (FPS, drivers, environment variables) to community databases.

**But there is a disconnect:**

1.  **The Database** contains the perfect settings in raw text format.
2.  **The App** requires you to manually type these settings one by one.
3.  **The Result:** Typos, frustration, and 10 minutes wasted just to crash on launch.

## ✅ The Solution

This project provides **three complementary web tools** to streamline your GameNative configuration workflow:

### 🔄 Config Converter
Takes the "messy" raw text dump from community reports and instantly compiles it into a clean, structured `.json` file that the GameNative app can import directly.

### ✏️ Config Editor
A powerful visual editor that lets you fine-tune every aspect of your configuration with an intuitive interface. Edit settings across 10 organized categories including graphics, emulation, controller, and more.

### 🔍 Config Browser
Browse and search through community-submitted game configurations with **intelligent local caching** and **respectful database usage**. Filter by game name, GPU, or device to find optimal settings shared by other users.

**Stop typing. Start playing.**

---

## ✨ Features

### Config Converter
* **Intelligent Parsing:** Handles "dense" raw text where keys and values are packed without spacing.
* **Smart Type Inference:** Automatically detects and converts `true`/`false` to booleans and numeric strings to integers/floats.
* **Complex Data Handling:** Detects and correctly parses nested JSON strings found in fields like `extraData` and `sessionMetadata`.
* **Data Normalization:** Automatically fixes property naming inconsistencies (e.g., converting `lc all` to `lc_all`).
* **Junk Filtration:** Automatically strips out useless runtime metadata (e.g., `avg fps`, `session length`, `profileId`) that clogs up config files.
* **Android-Ready Structure:** Outputs the exact nested JSON structure required by the GameNative Import/Export source code.

### Config Editor
* **Visual Interface:** Edit all configuration settings through an intuitive, organized interface.
* **10 Organized Categories:** Settings grouped into General, Graphics, Emulation, Controller, Wine, Components, Environment, Drives, Advanced, and Hidden sections.
* **Real-Time Validation:** Visual feedback and smart defaults ensure valid configurations.
* **Import/Export:** Load existing JSON configs, make changes, and export updated versions.
* **Cross-Tool Integration:** Seamlessly switch between Converter and Editor as needed.

### Config Browser
* **Local Filter Snapshots:** Pre-generated JSON files provide instant autocomplete suggestions for games, GPUs, and devices without hitting the database.
* **Smart Autocomplete:** Client-side fuzzy matching with debounced search for responsive filter suggestions.
* **Efficient Queries:** Separate count and data queries with proper joins and filtering to minimize database load.
* **Rich Preview:** View configuration details including rating, FPS, device specs, user notes, and app version.
* **Seamless Integration:** Load configurations directly into the Config Editor or download as JSON files.

---

## 🚀 How to Use

### Quick Start: Get a Config from the Community

1. Visit the [**Main Site**](https://andreisugu.github.io/gamenative-config-tools/) to access all tools
2. Go to the [GameNative Compatibility List](https://gamenative.app/compatibility/) or use the [Config Browser](https://andreisugu.github.io/gamenative-config-tools/config-browser)
3. Select a report for the game you want
4. Click **"View Config"**
5. Copy everything inside the popup
6. Paste into the [Config Converter](https://andreisugu.github.io/gamenative-config-tools/config-converter)
7. Convert it and copy the JSON output
8. Paste into the [Config Editor](https://andreisugu.github.io/gamenative-config-tools/config-editor) if you want to make changes, or import directly into GameNative

### Workflow 1: Converting Raw Configs

#### 1. Get the Raw Data
Go to your preferred GameNative/Winlator config database or spreadsheet. Click "View" on a config report and copy **all** the text.

#### 2. Convert to JSON
1.  Open the [Config Converter](https://andreisugu.github.io/gamenative-config-tools/config-converter).
2.  Paste the raw text into the input box.
3.  Click **"Download Clean Config"**.

#### 3. Import to App
1.  Transfer the downloaded `config.json` to your Android device.
2.  Open **GameNative**, press on any game, and press the 3 dots in the upper right corner.
3.  Select **Import Config** and choose your file.

### Workflow 2: Editing Existing Configs

#### 1. Load Your Config
1.  Open the [Config Editor](https://andreisugu.github.io/gamenative-config-tools/config-editor).
2.  Paste your JSON configuration (either exported from GameNative or converted using the Config Converter).
3.  Click **"Load Config"**.

#### 2. Make Changes
Navigate through the organized tabs (General, Graphics, Emulation, etc.) and adjust any settings you need.

#### 3. Export and Import
1.  Click **"Export JSON"** to download your modified configuration.
2.  Transfer to your Android device and import through GameNative as usual.

---

## 🧩 Technical Details

These tools were built to support the **Import/Export JSON Schema** defined in the GameNative Android source code.

### Config Converter Logic

The converter performs a "Lookahead" parse:
1. It iterates through the raw text line by line.
2. It checks a strictly defined `KNOWN_KEYS` set to differentiate between a Key and a Value.
3. It gathers individual controller buttons (`A`, `B`, `DPAD UP`) and nests them into a `controllerEmulationBindings` object.

### Config Editor Architecture

The editor provides a structured interface for modifying configuration JSON:
1. Settings are organized into 10 logical categories for easy navigation, with the first 9 designed to mimic the in-app "Edit Container" style.
2. Form controls are dynamically generated based on the configuration schema.
3. Special handling for complex fields like CPU affinity grids, environment variables, and drive mappings.
4. Real-time synchronization between related fields (e.g., GPU name and renderer) to maintain consistency with the "Edit Container" interface.

### Config Browser Architecture

The browser balances performance with database efficiency:
1. **Local Filter Snapshots:** Pre-generated JSON files containing games, GPUs, and devices for instant autocomplete suggestions.
2. **Client-Side Filtering:** Fuzzy matching and search suggestions processed locally to reduce database queries.
3. **Debounced Input:** 250ms debounce on filter inputs to prevent excessive API calls during typing.
4. **Efficient Queries:** Separate count and data queries with proper Supabase joins and range-based pagination.
5. **Request Cancellation:** AbortController implementation to cancel outdated requests when filters change.
6. **Seamless Integration:** Direct Config Editor loading and JSON export with proper metadata structure.

---

## 🌍 Community & Support

These tools are designed to support the incredible work done by the GameNative developers and community. While these utilities are unofficial, you can find the official project and community hubs below:

* **Official Website:** [GameNative.app](https://gamenative.app/)
* **Source Code:** [GameNative GitHub Repository](https://github.com/utkarshdalal/GameNative)
* **Discord Community:** [Join the GameNative Discord](https://discord.gg/2hKv4VfZfE)

---

## ⚠️ Compatibility Note

These tools generate JSON files compatible with GameNative builds that include the **Import/Export PR (#232)**. If you are using an older version of the app, you may need to update to the latest release to use the "Import" button.

## 📄 License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).

---

*Not affiliated with the official GameNative development team. Built by the community, for the community.*
