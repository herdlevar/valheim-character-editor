# Valheim Live Companion & Character Studio

<p align="center">
  <img src="public/ui/walknut_bw.png" width="100" height="100" alt="Valheim Emblem" />
</p>

<p align="center">
  <strong>The ultimate companion suite for Valheim: Real-time Character & Inventory Editor, Live Auto-Builder, 3D WebGL Blueprint Viewer, Interactive World Map Teleporter, and Automated Crop Grid Planter.</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#live-bridge-mod">Live Bridge Mod</a> •
  <a href="#hotkeys">In-Game Hotkeys</a> •
  <a href="#architecture">Architecture</a> •
  <a href="SETUP.md">Setup Guide</a> •
  <a href="https://github.com/herdlevar/valheim-character-editor/releases">Releases</a>
</p>

---

## Overview

**Valheim Live Companion** bridges modern web technologies with Valheim via a native BepInEx plugin. You can edit characters offline by reading and writing `.fch` save files with cryptographic SHA-512 verification, **or** connect live to your active game to spawn items, toggle cheats, tele-transport across biomes, construct massive community blueprints, and automate your farming fields in real-time.

---

## ✨ Features

### 1. Character & Inventory Studio
- **Binary `.fch` Parser & Serializer**: Reads and writes character save files natively with full support for the latest Valheim mistlands/ashlands save schemas and SHA-512 integrity checks.
- **Safety Backups**: Automatically exports timestamped `.safety_backup.fch` files before applying modifications.
- **Interactive Equipment Paper Doll**: Inspect and equip weapons, armor, capes, helmets, and utility items with quality and durability levels.
- **Inventory Grid (8×4)**: Drag-and-drop or click to move, stack, split, repair, and delete items.
- **300+ Item Spawner**: Browse catalog with filters for weapons, armor, food, mead, trophies, boss items, and seeds. Inject items directly into your bag.
- **Loadout Profiles**: Save and switch between named loadouts (e.g. *Boss Fighter*, *Farmer*, *Heavy Miner*, *Mage*).
- **Instant Rested Buff**: 1-click apply Comfort Level 18 (25 minutes, +50% XP gain, 2× stamina regeneration).

### 2. Live BepInEx Bridge (Real-Time In-Game Sync)
- **Zero-Latency In-Game Engine**: Local high-speed HTTP bridge (`http://127.0.0.1:8765`) communicates directly with the Valheim game process.
- **Real-Time Cheats**:
  - **Invincibility (God Mode)**: Complete immunity to damage.
  - **Ghost Mode**: Enemies ignore player presence entirely.
  - **Fly Mode (No-Clip)**: Fly freely through terrain and dungeon walls.
  - **No-Cost Free Building**: Construct anything without materials.
- **Sync Live Inventory**: Pull live inventory state straight from running memory into the web app without logging out.

### 3. Live Auto-Builder & Community Blueprints
- **Universal Blueprint Support**: Load `.vbuild` (BuildShare) and `.blueprint` (PlanBuild) formats.
- **Live World Construction**: Build community taverns, castles, bridges, and longhouses directly in your world.
- **Smart Terrain Leveling**: 1-click terraform and flatten the ground under any building footprint using heightmap brushes.
- **Blueprint Capture Tool**: Capture player-built castles and houses directly from the live game world and export them as `.blueprint` files!
- **PlanBuild Integration**: 1-click sync blueprints directly into your PlanBuild folder.
- **Instant Undo (`[F8]`)**: Easily rollback any built structure.

### 4. Interactive 3D WebGL Blueprint Viewer
- **Three.js Powered**: Orbit, pan, zoom, inspect wireframe mode, and view bounding boxes before placing blueprints.
- **Material Differentiation**: Accurate rendering of wood, stone, iron, darkwood, glass, and thatched roof angles.
- **Piece Inspector**: Click individual pieces in 3D to view coordinates, rotation quaternions, and dimensions.

### 5. Interactive World Map & Teleporter
- **Pin Explorer**: View map pins, your active bed spawn location, and your tombstone death marker.
- **1-Click Teleporter**: Instantly teleport player to bed, death tombstone, or custom $(X, Y, Z)$ coordinates.

### 6. Automated Grid Planter & Crop Studio
- **Precision Matrix Planting**: Plant customized $N \times M$ grids (up to $25 \times 25$) of all 18 crops and trees.
  - *Vegetables*: Carrots, Turnips, Onions.
  - *Seed Multipliers*: Seed Carrots, Seed Turnips, Seed Onions.
  - *Grains & Special*: Barley, Flax, Jotun Puffs, Magecap (Eitr magic).
  - *Ashlands*: Fiddlehead, Smoke Puff, Vineberry.
  - *Trees*: Beech, Birch, Pine, Fir, Oak.
- **Auto-Cultivation**: Automatically prepares and tills the soil underneath the crop footprint using Valheim's internal `TerrainComp`.
- **Ground Elevation Snapping**: Downward raycasting and heightmap queries ensure crops naturally align with slopes and hills.
- **Mass Harvester (`[F10]`)**: 1-click or hotkey harvest all ripe crops within 15 meters.

---

## ⌨️ In-Game Hotkeys

| Hotkey | Action | Description |
|---|---|---|
| **`[F8]`** | **Undo Last Build / Grid** | Instantly dismantles the last auto-built blueprint or planted crop grid. |
| **`[F9]`** | **Toggle Fly Mode (No-Clip)** | Fly freely in any direction. `[Space]` = Ascend, `[Ctrl]` = Descend, `[Shift]` = Speed Boost. |
| **`[F10]`** | **Harvest Nearby Crops (15m)** | Automatically gathers all ripe vegetables, grains, and herbs within 15 meters. |

---

## 🚀 Quick Start

### Option A: Web App (Browser)

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
   Open your browser to `http://localhost:3000`.

### Option B: Desktop Electron App

To run as a native desktop application:
```bash
npm run electron
```
Or launch using `launch-app.bat` on Windows.

---

## ⚙️ Live Bridge Mod Installation

The Live Bridge BepInEx plugin enables all live in-game synchronization features.

### Automated 1-Click Install (Windows)

Ensure Valheim is installed via Steam, then run:
```powershell
powershell -ExecutionPolicy Bypass -File .\build_and_install_mod.ps1
```
This automatically locates your Valheim directory, compiles `ValheimLiveBridgePlugin.cs` using the .NET C# compiler, and copies `ValheimLiveBridge.dll` directly to your `BepInEx\plugins\` folder!

*(For manual setup or troubleshooting, see the [SETUP.md](SETUP.md) guide).*

---

## 📦 Releases

Download precompiled standalone binaries, Electron installers, and the BepInEx `ValheimLiveBridge.dll` plugin directly from our [**GitHub Releases**](https://github.com/herdlevar/valheim-character-editor/releases) page.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons.
- **3D Graphics**: Three.js WebGL rendering engine.
- **Desktop Runtime**: Electron.
- **Backend / Proxy**: Node.js & Express.
- **In-Game Mod**: C#, BepInEx 5.x, HarmonyX, Unity 2022 / Valheim engine reflection.
- **Binary Engine**: Custom IEEE 754 float & Little-Endian binary parser with SHA-512 hashing (`js-sha512`).

---

## 🤝 Contributing

Contributions, bug reports, and suggestions are welcome!
1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.

---

<p align="center">
  Built with ⚡ for the Valheim Viking Community. Skål!
</p>
