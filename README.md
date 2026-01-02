# 🛠️ GameNative Config Converter

> **The missing link between community data and your GameNative emulator.**

Built with **Next.js**, **TypeScript**, and **Tailwind CSS** for a modern, type-safe, and responsive experience.

### 🌐 [**Click Here to Launch the Converter**](https://andreisugu.github.io/gamenative-config-converter/)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Status: Active](https://img.shields.io/badge/Status-Active-brightgreen.svg)](https://andreisugu.github.io/gamenative-config-converter/)
[![Platform: Web](https://img.shields.io/badge/Platform-Web-blue.svg)](https://andreisugu.github.io/gamenative-config-converter/)

---

## 🚨 The Problem

The GameNative/Winlator community is amazing. Users rigorously test games and upload configuration data (FPS, drivers, environment variables) to community databases.

**But there is a disconnect:**

1.  **The Database** contains the perfect settings in raw text format.
2.  **The App** requires you to manually type these settings one by one.
3.  **The Result:** Typos, frustration, and 10 minutes wasted just to crash on launch.

## ✅ The Solution

**GameNative Config Converter** is a single-page web tool that bridges this gap. It takes the "messy" raw text dump from community reports and instantly compiles it into a clean, structured `.json` file that the GameNative app can import directly.

**Stop typing. Start playing.**

---

## ✨ Features

* **Intelligent Parsing:** Handles "dense" raw text where keys and values are packed without spacing.
* **Smart Type Inference:** Automatically detects and converts `true`/`false` to booleans and numeric strings to integers/floats.
* **Complex Data Handling:** Detects and correctly parses nested JSON strings found in fields like `extraData` and `sessionMetadata`.
* **Data Normalization:** Automatically fixes property naming inconsistencies (e.g., converting `lc all` to `lc_all`).
* **Junk Filtration:** Automatically strips out useless runtime metadata (e.g., `avg fps`, `session length`, `profileId`) that clogs up config files.
* **Android-Ready Structure:** Outputs the exact nested JSON structure required by the GameNative Import/Export source code.

---

## 🚀 How to Use

### 1. Get the Raw Data

Go to your preferred GameNative/Winlator config database or spreadsheet. Click "View" on a config report and copy **all** the text.

### 2. Paste & Convert

1.  Open the [GameNative Config Converter](https://andreisugu.github.io/gamenative-config-converter/).
2.  Paste the raw text into the input box.
3.  Click **"Download Clean Config"**.

### 3. Import to App

1.  Transfer the downloaded `config.json` to your Android device.
2.  Open **GameNative**.
3.  Go to the **Containers** tab.
4.  Select **Import Config** and choose your file.

---

## 🧩 Technical Details

This tool was built to support the **Import/Export JSON Schema** defined in the GameNative Android source code.

### The Conversion Logic

The tool performs a "Lookahead" parse:
1. It iterates through the raw text line by line.
2. It checks a strictly defined `KNOWN_KEYS` set to differentiate between a Key and a Value.
3. It gathers individual controller buttons (`A`, `B`, `DPAD UP`) and nests them into a `controllerEmulationBindings` object.

---

## 🌍 Community & Support

This tool is designed to support the incredible work done by the GameNative developers and community. While this converter is an unofficial utility, you can find the official project and community hubs below:

* **Official Website:** [GameNative.app](https://gamenative.app/)
* **Source Code:** [GameNative GitHub Repository](https://github.com/utkarshdalal/GameNative)
* **Discord Community:** [Join the GameNative Discord](https://discord.gg/2hKv4VfZfE)

---

## ⚠️ Compatibility Note

This tool generates JSON files compatible with GameNative builds that include the **Import/Export PR (#232)**. If you are using an older version of the app, you may need to update to the latest release to use the "Import" button.

## 📄 License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).

---

*Not affiliated with the official GameNative development team. Built by the community, for the community.*
