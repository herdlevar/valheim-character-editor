# Installation & Setup Guide

This guide walks you through setting up both the **Valheim Live Companion** web/desktop application and the **ValheimLiveBridge BepInEx Mod**.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Companion App Setup](#companion-app-setup)
   - [Running as Web App](#running-as-web-app)
   - [Running as Desktop App (Electron)](#running-as-desktop-app-electron)
3. [Valheim Live Bridge Mod Setup](#valheim-live-bridge-mod-setup)
   - [Option 1: 1-Click PowerShell Build & Install (Recommended)](#option-1-1-click-powershell-build--install-recommended)
   - [Option 2: Precompiled DLL Installation](#option-2-precompiled-dll-installation)
   - [Option 3: Manual Compilation](#option-3-manual-compilation)
4. [Valheim Save File Locations](#valheim-save-file-locations)
5. [In-Game Hotkeys & Usage](#in-game-hotkeys--usage)
6. [Troubleshooting & FAQ](#troubleshooting--faq)

---

## 1. Prerequisites

- **Valheim**: Installed on Windows via Steam.
- **Node.js**: Version 18.0 or higher ([Download Node.js](https://nodejs.org/)).
- **BepInEx for Valheim (v5.4.2202 or newer)**: Required only if you want real-time in-game synchronization, auto-building, teleporting, or grid planting.
  - If you only want to view/edit `.fch` character files offline, BepInEx is **not** required.

---

## 2. Companion App Setup

### Running as Web App

1. **Clone the repository:**
   ```bash
   git clone https://github.com/herdlevar/valheim-character-editor.git
   cd valheim-character-editor
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the local server:**
   ```bash
   npm start
   ```

4. **Access the app:**
   Open your browser to `http://localhost:3000`.

---

### Running as Desktop App (Electron)

If you prefer a standalone desktop window:
```bash
npm run electron
```
Or simply double-click `launch-app.bat` or `start.bat`.

To build the production app:
```bash
npm run build
npm run electron
```

---

## 3. Valheim Live Bridge Mod Setup

The `ValheimLiveBridgePlugin` is a lightweight BepInEx plugin that listens locally on port `8765` to receive commands from the companion app and execute them safely on the Unity main thread.

### Option 1: 1-Click PowerShell Build & Install (Recommended)

1. Ensure **BepInEx** is installed in your Valheim game folder (typically `D:\SteamLibrary\steamapps\common\Valheim` or `C:\Program Files (x86)\Steam\steamapps\common\Valheim`).
2. Run the included PowerShell script:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\build_and_install_mod.ps1
   ```
3. The script will:
   - Detect your Steam library and Valheim directory.
   - Compile `src/mod/ValheimLiveBridgePlugin.cs` against the game's official managed assemblies.
   - Install `ValheimLiveBridge.dll` directly to your `BepInEx\plugins\` folder.

---

### Option 2: Precompiled DLL Installation

1. Go to the [Releases](https://github.com/herdlevar/valheim-character-editor/releases) page.
2. Download `ValheimLiveBridge.dll`.
3. Copy `ValheimLiveBridge.dll` to:
   ```
   <Valheim Install Directory>\BepInEx\plugins\ValheimLiveBridge.dll
   ```
4. Launch Valheim. You should see a green badge in the top bar of the companion app: `LIVE: <YourCharacterName>`.

---

### Option 3: Manual Compilation

If you wish to compile manually using Microsoft C# Compiler (`csc.exe`):
```powershell
$valheimDir = "D:\SteamLibrary\steamapps\common\Valheim"
$managed = "$valheimDir\valheim_Data\Managed"
$bepInEx = "$valheimDir\BepInEx\core"

& "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe" /target:library `
  /out:"$valheimDir\BepInEx\plugins\ValheimLiveBridge.dll" `
  /reference:"$managed\assembly_valheim.dll","$managed\assembly_guiutils.dll","$managed\UnityEngine.dll","$managed\UnityEngine.CoreModule.dll","$managed\UnityEngine.PhysicsModule.dll","$bepInEx\BepInEx.dll" `
  "src\mod\ValheimLiveBridgePlugin.cs"
```

---

## 4. Valheim Save File Locations

Valheim character saves (`.fch`) are stored in one of two locations depending on whether you use Cloud Saves or Local Saves:

### Steam Cloud Saves (Default)
```
C:\Program Files (x86)\Steam\userdata\<YourSteamID32>\892970\remote\
```
*Note: In the companion app, click the **"Where to Save"** or **"Open Save Folder"** button in the header bar to immediately navigate to this path.*

### Local PC Saves
```
%USERPROFILE%\AppData\LocalLow\IronGate\Valheim\characters_local\
```

---

## 5. In-Game Hotkeys & Usage

When the mod is running in your active world:

| Hotkey | Feature | Details |
|---|---|---|
| **`[F8]`** | **Undo Last Build** | Rolls back the last blueprint placement or crop grid. |
| **`[F9]`** | **Toggle Fly (No-Clip)** | • **Space**: Ascend<br>• **Ctrl**: Descend<br>• **Shift**: Speed Boost<br>• **WASD**: Free movement |
| **`[F10]`** | **Mass Harvest** | Gathers all ripe crops within 15 meters in a single click. |

---

## 6. Troubleshooting & FAQ

### Q: The companion app says "File Mode" or "Live Bridge offline".
- Ensure Valheim is currently running with your character loaded inside a world (not the main menu).
- Make sure BepInEx is installed and `ValheimLiveBridge.dll` exists in `<Valheim>\BepInEx\plugins\`.
- Check if your firewall or antivirus is blocking local port `8765` (bridge only communicates with `127.0.0.1`).

### Q: Do I need to restart Valheim to apply changes?
- **With Live Bridge**: No! Edits, items, blueprints, teleportation, and crop planting happen live in real-time.
- **Without Live Bridge (Offline Save Mode)**: Yes, character files (`.fch`) are loaded into memory when Valheim starts or when you select a character. Modify your save file while at the character select menu or with the game closed.

### Q: Will this corrupt my character save?
- The app automatically creates a timestamped safety backup (e.g. `Character_safety_backup.fch`) whenever you download or save a character.

---

<p align="center">
  Questions or need assistance? Open an issue on our <a href="https://github.com/herdlevar/valheim-character-editor/issues">GitHub Issues</a> tracker.
</p>
