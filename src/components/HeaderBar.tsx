import React, { useRef, useState } from 'react';
import { Download, Upload, ShieldCheck, Shield, Hammer, FolderOpen, RefreshCw, FileText, Zap, ChevronDown, Check, HardDrive, Settings, Swords, Radio, Ghost, Compass, Plane, Sprout } from 'lucide-react';
import { LiveGameStatus } from '../services/liveBridge';

export interface SteamCharacterInfo {
  filename: string;
  name: string;
  size: number;
  modified: number;
}

interface HeaderBarProps {
  onFileUpload: (file: File) => void;
  onTriggerUpload?: () => void;
  onLoadSample: (filename: string) => void;
  onLoadSteamCharacter: (filename: string) => void;
  steamCharacters: SteamCharacterInfo[];
  steamDir?: string;
  onSaveToGame: () => void;
  onDownloadModified: () => void;
  onDownloadBackup: () => void;
  onOpenSteamPath: () => void;
  onOpenSteamFolder?: () => void;
  characterLoaded: boolean;
  characterName?: string;
  currentFileName: string;
  isSaving: boolean;
  isSavingToGame: boolean;
  onApplyLoadout: () => void;
  onOpenLoadoutConfig: () => void;
  liveStatus?: LiveGameStatus | null;
  onSyncFromGame?: () => void;
  isGodMode?: boolean;
  onToggleGodMode?: () => void;
  isNoCostBuilding?: boolean;
  onToggleNoCostBuilding?: () => void;
  isGhostMode?: boolean;
  onToggleGhostMode?: () => void;
  isFlyMode?: boolean;
  onToggleFlyMode?: () => void;
  onOpenWorldMap?: () => void;
  onOpenAutoBuilder?: () => void;
  onOpenGridPlanter?: () => void;
  activeLoadoutName?: string;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  onFileUpload,
  onTriggerUpload,
  onLoadSample,
  onLoadSteamCharacter,
  steamCharacters,
  steamDir,
  onSaveToGame,
  onDownloadModified,
  onDownloadBackup,
  onOpenSteamPath,
  onOpenSteamFolder,
  characterLoaded,
  characterName,
  currentFileName,
  isSaving,
  isSavingToGame,
  onApplyLoadout,
  onOpenLoadoutConfig,
  liveStatus,
  onSyncFromGame,
  isGodMode,
  onToggleGodMode,
  isNoCostBuilding,
  onToggleNoCostBuilding,
  isGhostMode,
  onToggleGhostMode,
  isFlyMode,
  onToggleFlyMode,
  onOpenWorldMap,
  onOpenAutoBuilder,
  onOpenGridPlanter,
  activeLoadoutName,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSteamDropdownOpen, setIsSteamDropdownOpen] = useState(false);
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.isElectron;

  const handleUploadClick = () => {
    if (onTriggerUpload) {
      onTriggerUpload();
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  const formatFileSize = (bytes: number) => {
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const formatDate = (mtimeMs: number) => {
    const date = new Date(mtimeMs);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <header className="border-b border-valheim-border bg-valheim-dark/95 backdrop-blur-md sticky top-0 z-30 shadow-valheim">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-4">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <img
            src="./ui/walknut_bw.png"
            alt="Valheim Emblem"
            className="w-10 h-10 drop-shadow-[0_0_8px_rgba(230,195,100,0.5)] invert brightness-90 shrink-0"
          />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-valheim tracking-wider text-valheim-gold font-bold flex items-center gap-2 drop-shadow">
                VALHEIM
              </h1>
              <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded bg-valheim-panel border border-valheim-brass/50 text-gray-300 font-sans font-normal">
                Character & Inventory Editor
              </span>

              {/* Live BepInEx Game Status Badge */}
              {liveStatus?.inGame ? (
                <span
                  className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-500/80 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.45)]"
                  title="Live BepInEx Bridge Connected! Edits sync directly to your character in real-time."
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="font-valheim font-semibold text-emerald-200">LIVE: {liveStatus.playerName}</span>
                </span>
              ) : liveStatus?.online ? (
                <span
                  className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded bg-amber-950/70 border border-amber-600/60 text-amber-300"
                  title="Valheim is running, currently at main menu."
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>Game in Menu</span>
                </span>
              ) : (
                <span
                  className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded bg-valheim-slot border border-valheim-border text-gray-400"
                  title="Valheim Live Bridge offline. Operating in standard save file mode."
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
                  <span>File Mode</span>
                </span>
              )}

              {currentFileName && (
                <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-valheim-slot border border-valheim-border text-valheim-goldlight">
                  <HardDrive className="w-3 h-3 text-valheim-brass" />
                  {currentFileName}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 font-sans">
              Steam Achievement Safe &bull; Zero Cheats Flag &bull; Auto-Backup
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".fch"
            className="hidden"
          />

          {/* Steam Characters Dropdown (Loads directly from Steam directory) */}
          {steamCharacters && steamCharacters.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setIsSteamDropdownOpen(!isSteamDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-2 rounded bg-valheim-panel hover:bg-valheim-slothover border border-valheim-brass/60 hover:border-valheim-gold text-xs text-gray-200 transition shadow"
                title="Select a character directly from your Steam save directory"
              >
                <HardDrive className="w-3.5 h-3.5 text-valheim-gold" />
                <span className="font-valheim font-semibold text-valheim-goldlight">Steam Saves</span>
                <span className="px-1.5 py-0.2 rounded-full bg-valheim-dark border border-valheim-border text-[10px] font-mono text-valheim-gold">
                  {steamCharacters.length}
                </span>
                <ChevronDown className="w-3 h-3 text-gray-400 ml-0.5" />
              </button>

              {isSteamDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsSteamDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-1 w-64 bg-valheim-dark border border-valheim-border rounded-lg shadow-2xl py-1 z-50 animate-in fade-in-50 zoom-in-95">
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-valheim-brass uppercase tracking-wider border-b border-valheim-border/60 flex items-center justify-between">
                      <span>Steam Save Directory</span>
                      <span className="text-gray-500 font-normal lowercase">{steamCharacters.length} found</span>
                    </div>
                    <div className="max-h-60 overflow-y-auto py-1 divide-y divide-valheim-border/30">
                      {steamCharacters.map((sc) => {
                        const isActive = currentFileName === sc.filename;
                        return (
                          <button
                            key={sc.filename}
                            onClick={() => {
                              onLoadSteamCharacter(sc.filename);
                              setIsSteamDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs transition flex items-center justify-between ${
                              isActive
                                ? 'bg-valheim-panel text-valheim-gold font-semibold'
                                : 'text-gray-200 hover:bg-valheim-panel/70 hover:text-valheim-goldlight'
                            }`}
                          >
                            <div className="flex flex-col truncate">
                              <span className="font-valheim text-sm flex items-center gap-1.5">
                                {sc.name}
                                {isActive && <Check className="w-3 h-3 text-emerald-400" />}
                              </span>
                              <span className="text-[10px] text-gray-400 font-sans">
                                {formatDate(sc.modified)}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-500 font-mono shrink-0 ml-2">
                              {formatFileSize(sc.size)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="border-t border-valheim-border/60 px-3 py-1.5 bg-valheim-panel/40 flex justify-between items-center text-[10px] text-gray-400">
                      <button
                        onClick={() => {
                          setIsSteamDropdownOpen(false);
                          if (onOpenSteamFolder) {
                            onOpenSteamFolder();
                          } else {
                            onOpenSteamPath();
                          }
                        }}
                        className="text-valheim-gold hover:underline flex items-center gap-1"
                      >
                        <FolderOpen className="w-3 h-3" /> {isElectron ? 'Open in Explorer' : 'View Directory'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Sync Live from Game Button (Always visible) */}
          {onSyncFromGame && (
            <button
              onClick={onSyncFromGame}
              className={`flex items-center gap-1.5 px-3 py-2 rounded text-xs font-valheim font-semibold transition shadow active:scale-95 ${
                liveStatus?.inGame
                  ? 'bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-500/80 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.45)] animate-pulse'
                  : 'bg-valheim-panel/80 hover:bg-valheim-slothover border border-valheim-border hover:border-valheim-brass text-gray-200'
              }`}
              title={
                liveStatus?.inGame
                  ? `Pull live character & inventory directly from running game (${liveStatus.playerName})`
                  : 'Sync character live from running Valheim game (Click for setup instructions)'
              }
            >
              <RefreshCw className={`w-3.5 h-3.5 ${liveStatus?.inGame ? 'text-emerald-400' : 'text-valheim-gold'}`} />
              <span>{liveStatus?.inGame ? `Sync from ${liveStatus.playerName}` : 'Sync from Game'}</span>
            </button>
          )}

          {/* Invincibility (God Mode) Toggle */}
          {liveStatus?.inGame && onToggleGodMode && (
            <button
              onClick={onToggleGodMode}
              className={`flex items-center gap-1.5 px-3 py-2 rounded text-xs font-valheim font-semibold transition shadow active:scale-95 cursor-pointer ${
                isGodMode
                  ? 'bg-amber-950/90 hover:bg-amber-900 border border-amber-500/90 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.45)]'
                  : 'bg-valheim-panel/80 hover:bg-valheim-slothover border border-valheim-border hover:border-valheim-brass text-gray-300'
              }`}
              title={
                isGodMode
                  ? 'Invincibility (God Mode) is ON! Click to disable.'
                  : 'Invincibility (God Mode) is OFF. Click to activate in-game invincibility.'
              }
            >
              <Shield className={`w-3.5 h-3.5 ${isGodMode ? 'text-amber-400 fill-amber-400/40 animate-pulse' : 'text-gray-400'}`} />
              <span>{isGodMode ? 'Invincible: ON' : 'Invincibility'}</span>
            </button>
          )}

          {/* No-Cost Building (Creative Crafting) Toggle */}
          {liveStatus?.inGame && onToggleNoCostBuilding && (
            <button
              onClick={onToggleNoCostBuilding}
              className={`flex items-center gap-1.5 px-3 py-2 rounded text-xs font-valheim font-semibold transition shadow active:scale-95 cursor-pointer ${
                isNoCostBuilding
                  ? 'bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.45)]'
                  : 'bg-valheim-panel/80 hover:bg-valheim-slothover border border-valheim-border hover:border-valheim-brass text-gray-300'
              }`}
              title={
                isNoCostBuilding
                  ? 'No-Cost Building is ON! You can build and craft with 0 materials. Click to disable.'
                  : 'No-Cost Building is OFF. Click to build and craft anything without material costs.'
              }
            >
              <Hammer className={`w-3.5 h-3.5 ${isNoCostBuilding ? 'text-cyan-300 animate-pulse' : 'text-gray-400'}`} />
              <span>{isNoCostBuilding ? 'Free Build: ON' : 'Free Build'}</span>
            </button>
          )}

          {/* Ghost Mode Toggle */}
          {liveStatus?.inGame && onToggleGhostMode && (
            <button
              onClick={onToggleGhostMode}
              className={`flex items-center gap-1.5 px-3 py-2 rounded text-xs font-valheim font-semibold transition shadow active:scale-95 cursor-pointer ${
                isGhostMode
                  ? 'bg-purple-950/90 hover:bg-purple-900 border border-purple-400 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.45)]'
                  : 'bg-valheim-panel/80 hover:bg-valheim-slothover border border-valheim-border hover:border-valheim-brass text-gray-300'
              }`}
              title={
                isGhostMode
                  ? 'Ghost Mode is ON! Enemies completely ignore you. Click to disable.'
                  : 'Ghost Mode is OFF. Click so enemies ignore you completely.'
              }
            >
              <Ghost className={`w-3.5 h-3.5 ${isGhostMode ? 'text-purple-300 animate-pulse' : 'text-gray-400'}`} />
              <span>{isGhostMode ? 'Ghost: ON' : 'Ghost Mode'}</span>
            </button>
          )}

          {/* Fly Mode (No-Clip) Toggle */}
          {liveStatus?.inGame && onToggleFlyMode && (
            <button
              onClick={onToggleFlyMode}
              className={`flex items-center gap-1.5 px-3 py-2 rounded text-xs font-valheim font-semibold transition shadow active:scale-95 cursor-pointer ${
                isFlyMode
                  ? 'bg-sky-950/90 hover:bg-sky-900 border border-sky-400 text-sky-200 shadow-[0_0_12px_rgba(56,189,248,0.45)]'
                  : 'bg-valheim-panel/80 hover:bg-valheim-slothover border border-valheim-border hover:border-valheim-brass text-gray-300'
              }`}
              title={
                isFlyMode
                  ? 'Fly Mode (No-Clip) is ON! [Space] Up | [Ctrl] Down | [Shift] Fast | [F9] in-game hotkey. Click to land.'
                  : 'Fly Mode (No-Clip) is OFF. Click or press [F9] in-game to fly freely through walls and inspect your builds.'
              }
            >
              <Plane className={`w-3.5 h-3.5 ${isFlyMode ? 'text-sky-300 animate-pulse' : 'text-gray-400'}`} />
              <span>{isFlyMode ? 'Fly (No-Clip): ON' : 'Fly (No-Clip) [F9]'}</span>
            </button>
          )}

          {/* World Map & Pin Explorer Button */}
          {onOpenWorldMap && (
            <button
              onClick={onOpenWorldMap}
              className="flex items-center gap-1.5 px-3 py-2 rounded bg-valheim-panel/80 hover:bg-valheim-slothover border border-valheim-border hover:border-indigo-400 text-xs font-valheim font-semibold text-indigo-200 transition shadow hover:shadow-[0_0_10px_rgba(99,102,241,0.35)]"
              title="Open interactive World Map, view pins, bed, death tombstone, and 1-click teleport"
            >
              <Compass className="w-3.5 h-3.5 text-indigo-400" />
              <span>World Map</span>
            </button>
          )}

          {/* Auto-Builder & Blueprints Button */}
          {onOpenAutoBuilder && (
            <button
              onClick={onOpenAutoBuilder}
              className="flex items-center gap-1.5 px-3 py-2 rounded bg-valheim-panel/80 hover:bg-valheim-slothover border border-valheim-border hover:border-amber-400 text-xs font-valheim font-semibold text-amber-200 transition shadow hover:shadow-[0_0_10px_rgba(245,158,11,0.35)]"
              title="Open Auto-Builder, load community blueprints (.vbuild / .blueprint), and construct them live in-game"
            >
              <Hammer className="w-3.5 h-3.5 text-amber-400" />
              <span>Auto-Builder</span>
            </button>
          )}

          {/* Grid Planter & Farming Suite Button */}
          {onOpenGridPlanter && (
            <button
              onClick={onOpenGridPlanter}
              className="flex items-center gap-1.5 px-3 py-2 rounded bg-valheim-panel/80 hover:bg-valheim-slothover border border-valheim-border hover:border-emerald-400 text-xs font-valheim font-semibold text-emerald-200 transition shadow hover:shadow-[0_0_10px_rgba(16,185,129,0.35)]"
              title="Open Grid Planter & Crop Studio: mass crop planting, auto-cultivate, and harvesting suite"
            >
              <Sprout className="w-3.5 h-3.5 text-emerald-400" />
              <span>Grid Planter</span>
            </button>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUploadClick}
            className="flex items-center gap-1.5 px-3 py-2 rounded bg-valheim-panel/80 hover:bg-valheim-slothover border border-valheim-border hover:border-valheim-brass text-xs text-gray-200 transition shadow"
            title="Browse PC for any .fch character file"
          >
            <Upload className="w-3.5 h-3.5 text-valheim-gold" />
            <span className="font-valheim font-semibold">Browse .fch</span>
          </button>

          {/* Open Folder / Path Helper */}
          {isElectron ? (
            <button
              onClick={onOpenSteamFolder || onOpenSteamPath}
              className="flex items-center gap-1.5 px-3 py-2 rounded bg-valheim-panel/80 hover:bg-valheim-panel border border-valheim-border hover:border-valheim-brass text-xs text-gray-200 transition shadow"
              title="Open the Steam Cloud save folder directly in Windows Explorer"
            >
              <FolderOpen className="w-3.5 h-3.5 text-valheim-gold" />
              <span className="font-semibold">Open Save Folder</span>
            </button>
          ) : (
            <button
              onClick={onOpenSteamPath}
              className="flex items-center gap-1.5 px-3 py-2 rounded bg-valheim-panel/60 hover:bg-valheim-panel border border-valheim-border hover:border-valheim-brass text-xs text-gray-200 transition"
              title="View exact Steam save folder location and step-by-step instructions"
            >
              <FolderOpen className="w-3.5 h-3.5 text-valheim-gold" />
              <span className="font-semibold">Where to Save</span>
            </button>
          )}

          {/* Save & Download Actions (Enabled when character is loaded) */}
          {characterLoaded && (
            <div className="flex items-center gap-2 ml-1">

              {/* Loadout Config */}
              <div className="flex items-center">
                <button
                  onClick={onApplyLoadout}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-l border border-r-0 text-xs transition shadow ${
                    liveStatus?.inGame
                      ? 'bg-emerald-950/60 hover:bg-emerald-900/80 border-emerald-600/80 text-emerald-200'
                      : 'bg-indigo-900/40 hover:bg-indigo-800/60 border-indigo-700/60 text-indigo-200'
                  }`}
                  title={liveStatus?.inGame ? `Apply ${activeLoadoutName || 'Loadout'} directly into your live game inventory instantly!` : `Apply ${activeLoadoutName || 'Default Loadout'}: Fill missing items and repair everything`}
                >
                  {liveStatus?.inGame ? (
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Swords className="w-3.5 h-3.5 text-indigo-400" />
                  )}
                  <span className="hidden xl:inline font-semibold">
                    {activeLoadoutName ? `Loadout: ${activeLoadoutName}` : (liveStatus?.inGame ? "Live Loadout" : "Apply Loadout")}
                  </span>
                </button>
                <button
                  onClick={onOpenLoadoutConfig}
                  className={`flex items-center justify-center px-2 py-2 rounded-r border text-xs transition shadow ${
                    liveStatus?.inGame
                      ? 'bg-emerald-950/60 hover:bg-emerald-900/80 border-emerald-600/80 text-emerald-200'
                      : 'bg-indigo-900/40 hover:bg-indigo-800/60 border-indigo-700/60 text-indigo-200'
                  }`}
                  title="Configure & Switch Loadout Presets"
                >
                  <Settings className="w-3.5 h-3.5 text-indigo-400" />
                </button>
              </div>

              {/* Pristine Backup Download */}
              <button
                onClick={onDownloadBackup}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded bg-amber-950/40 hover:bg-amber-900/60 border border-amber-700/60 text-xs text-amber-200 transition shadow"
                title="Download pristine backup of the original file before any edits were made"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden xl:inline">Export</span> Backup
              </button>

              {/* Primary: Direct 1-Click Save in Electron vs Browser Download */}
              {isElectron ? (
                <button
                  onClick={onSaveToGame}
                  disabled={isSavingToGame}
                  className="flex items-center gap-2 px-4 py-2 rounded bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 hover:from-emerald-600 hover:to-teal-600 border border-emerald-400 text-white font-valheim font-bold text-xs tracking-wider transition shadow-[0_0_15px_rgba(16,185,129,0.35)] hover:shadow-[0_0_20px_rgba(16,185,129,0.6)] active:scale-95"
                  title={`Save updated ${currentFileName} directly to your Steam Cloud character folder with automatic backup`}
                >
                  {isSavingToGame ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-200" />
                  ) : (
                    <Zap className="w-4 h-4 text-emerald-200" />
                  )}
                  <span>Save Directly to Game</span>
                </button>
              ) : (
                <button
                  onClick={onDownloadModified}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 rounded bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 hover:from-emerald-600 hover:to-teal-600 border border-emerald-400 text-white font-valheim font-bold text-xs tracking-wider transition shadow-[0_0_15px_rgba(16,185,129,0.35)] hover:shadow-[0_0_20px_rgba(16,185,129,0.6)] active:scale-95"
                  title={`Download updated ${currentFileName} to your Gaming PC`}
                >
                  {isSaving ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-200" />
                  ) : (
                    <Download className="w-4 h-4 text-emerald-200" />
                  )}
                  <span>Save Character (.fch)</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
