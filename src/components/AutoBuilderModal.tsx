import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Hammer,
  Upload,
  RotateCw,
  Zap,
  RotateCcw,
  Sparkles,
  Info,
  Check,
  FileCode,
  Layers,
  Shield,
  Box,
  Trash2,
  Copy,
  ExternalLink,
  Crosshair,
  Plane,
  Mountain,
  Camera,
  Eye,
} from 'lucide-react';
import {
  Blueprint,
  DEFAULT_PRESET_BLUEPRINTS,
  parseAnyBlueprint,
} from '../utils/blueprintParser';
import {
  LiveGameStatus,
  buildBlueprintLive,
  undoLastBuildLive,
  setLiveNoCostBuilding,
  spawnLiveItem,
  syncToPlanBuildLive,
  armBlueprintLive,
  disarmBlueprintLive,
  getBuilderStateLive,
  terraformLive,
  captureBlueprintLive,
} from '../services/liveBridge';
import { BlueprintViewer3D } from './BlueprintViewer3D';

interface AutoBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  liveStatus: LiveGameStatus | null;
  isNoCostBuilding?: boolean;
  onToggleNoCostBuilding?: () => void;
  isFlyMode?: boolean;
  onToggleFlyMode?: () => void;
  showToast?: (text: string, type?: 'success' | 'info' | 'error') => void;
}

export const AutoBuilderModal: React.FC<AutoBuilderModalProps> = ({
  isOpen,
  onClose,
  liveStatus,
  isNoCostBuilding = false,
  onToggleNoCostBuilding,
  isFlyMode = false,
  onToggleFlyMode,
  showToast = () => {},
}) => {
  const [blueprints, setBlueprints] = useState<Blueprint[]>(DEFAULT_PRESET_BLUEPRINTS);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<string>(DEFAULT_PRESET_BLUEPRINTS[0].id);
  const [activeTab, setActiveTab] = useState<'presets' | 'upload' | 'paste' | 'capture'>('presets');
  const [viewing3D, setViewing3D] = useState<boolean>(false);

  // Capture Structure Settings
  const [captureRadius, setCaptureRadius] = useState<number>(15);
  const [captureName, setCaptureName] = useState<string>('');
  const [captureSaveToDisk, setCaptureSaveToDisk] = useState<boolean>(true);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  
  // Placement settings
  const [rotationY, setRotationY] = useState<number>(0);
  const [heightOffset, setHeightOffset] = useState<number>(0);
  const [distanceInFront, setDistanceInFront] = useState<number>(4);
  const [isBuilding, setIsBuilding] = useState<boolean>(false);
  const [isUndoing, setIsUndoing] = useState<boolean>(false);
  const [pasteContent, setPasteContent] = useState<string>('');
  const [hasBuiltRecent, setHasBuiltRecent] = useState<boolean>(false);
  const [isSyncingPlanBuild, setIsSyncingPlanBuild] = useState<boolean>(false);
  const [autoTerraform, setAutoTerraform] = useState<boolean>(true);
  const [isTerraforming, setIsTerraforming] = useState<boolean>(false);
  const [isArmed, setIsArmed] = useState<boolean>(false);
  const [isArming, setIsArming] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen && liveStatus?.inGame) {
      getBuilderStateLive()
        .then((state) => {
          if (state && state.isArmed) {
            setIsArmed(true);
            if (state.rotationY !== undefined) setRotationY(state.rotationY);
            if (state.heightOffset !== undefined) setHeightOffset(state.heightOffset);
            if (state.autoTerraform !== undefined) setAutoTerraform(state.autoTerraform);
          } else {
            setIsArmed(false);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, liveStatus?.inGame]);

  if (!isOpen) return null;

  const selectedBlueprint =
    blueprints.find((b) => b.id === selectedBlueprintId) || blueprints[0];


  // Handle file upload (.vbuild or .blueprint)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        try {
          const bp = parseAnyBlueprint(content, file.name);
          if (bp.pieces.length === 0) {
            showToast('No valid pieces found in blueprint file.', 'error');
            return;
          }
          setBlueprints((prev) => [bp, ...prev]);
          setSelectedBlueprintId(bp.id);
          setActiveTab('presets');
          showToast(`Imported "${bp.name}" with ${bp.totalPieces} pieces!`, 'success');
        } catch (err: any) {
          showToast(`Failed to parse blueprint: ${err.message}`, 'error');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Handle paste blueprint text
  const handlePasteSubmit = () => {
    if (!pasteContent.trim()) {
      showToast('Please paste blueprint text or JSON first.', 'info');
      return;
    }
    try {
      const bp = parseAnyBlueprint(pasteContent, 'Pasted Blueprint');
      if (bp.pieces.length === 0) {
        showToast('Could not find building pieces in pasted text.', 'error');
        return;
      }
      setBlueprints((prev) => [bp, ...prev]);
      setSelectedBlueprintId(bp.id);
      setActiveTab('presets');
      setPasteContent('');
      showToast(`Added "${bp.name}" with ${bp.totalPieces} pieces!`, 'success');
    } catch (err: any) {
      showToast(`Failed to parse blueprint: ${err.message}`, 'error');
    }
  };

  // Execute Auto-Build in-game
  const handleExecuteBuild = async () => {
    if (!liveStatus?.inGame) {
      showToast('Valheim must be running in a game world to auto-build.', 'info');
      return;
    }

    if (!selectedBlueprint || selectedBlueprint.pieces.length === 0) {
      showToast('Selected blueprint has no pieces.', 'error');
      return;
    }

    setIsBuilding(true);
    showToast(`Constructing ${selectedBlueprint.name} (${selectedBlueprint.totalPieces} pieces)...`, 'info');

    try {
      const res = await buildBlueprintLive({
        name: selectedBlueprint.name,
        pieces: selectedBlueprint.pieces,
        rotationY,
        heightOffset,
        distanceInFront,
        usePlayerPos: true,
        autoTerraform,
      });

      if (res.success) {
        setHasBuiltRecent(true);
        showToast(
          `⚡ Auto-Built "${selectedBlueprint.name}" (${res.placedCount} pieces placed in-game)!`,
          'success'
        );
      } else {
        showToast(`Build failed: ${res.error || 'Check Valheim'}`, 'error');
      }
    } catch (err: any) {
      showToast(`Build error: ${err.message}`, 'error');
    } finally {
      setIsBuilding(false);
    }
  };

  // Sync / Export to PlanBuild
  const handleSyncToPlanBuild = async () => {
    if (!selectedBlueprint || selectedBlueprint.pieces.length === 0) {
      showToast('Selected blueprint has no pieces.', 'error');
      return;
    }

    setIsSyncingPlanBuild(true);
    showToast(`Syncing "${selectedBlueprint.name}" to PlanBuild...`, 'info');

    try {
      const res = await syncToPlanBuildLive({
        name: selectedBlueprint.name,
        author: selectedBlueprint.author,
        description: selectedBlueprint.description,
        category: selectedBlueprint.category,
        pieces: selectedBlueprint.pieces,
      });

      if (res.success) {
        showToast(`⚡ Saved "${selectedBlueprint.name}" to PlanBuild! Equip your Blueprint Rune in-game.`, 'success');
      } else {
        showToast(`Failed to sync: ${res.error || 'Check game folder'}`, 'error');
      }
    } catch (err: any) {
      showToast(`Sync error: ${err.message}`, 'error');
    } finally {
      setIsSyncingPlanBuild(false);
    }
  };

  // Undo Last Build
  const handleUndoBuild = async () => {
    if (!liveStatus?.inGame) {
      showToast('Connect in-game to undo builds.', 'info');
      return;
    }

    setIsUndoing(true);
    try {
      const res = await undoLastBuildLive();
      if (res.success) {
        setHasBuiltRecent(false);
        showToast(`↩️ Removed ${res.undoneCount || 0} pieces from recent auto-build!`, 'success');
      } else {
        showToast(`Undo failed: ${res.error || 'No recent build found'}`, 'error');
      }
    } catch (err: any) {
      showToast(`Undo error: ${err.message}`, 'error');
    } finally {
      setIsUndoing(false);
    }
  };

  // Capture structure live from in-game world
  const handleCaptureStructure = async () => {
    if (!liveStatus?.inGame) {
      showToast('Valheim must be running in a game world to capture structures.', 'info');
      return;
    }

    setIsCapturing(true);
    const finalName = captureName.trim() || `Capture_${new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)}`;
    showToast(`Scanning world for structures within ${captureRadius}m radius...`, 'info');

    try {
      const res = await captureBlueprintLive({
        radius: captureRadius,
        name: finalName,
        saveToDisk: captureSaveToDisk,
      });

      if (res.success && res.rawBlueprint) {
        const bp = parseAnyBlueprint(res.rawBlueprint, res.name || finalName);
        if (res.pieces && res.pieces.length > 0) {
          bp.pieces = res.pieces;
          bp.totalPieces = res.pieces.length;
        }
        setBlueprints((prev) => [bp, ...prev]);
        setSelectedBlueprintId(bp.id);
        setActiveTab('presets');
        showToast(
          `★ Captured "${bp.name}" with ${bp.totalPieces} pieces! Saved to PlanBuild/blueprints.`,
          'success'
        );
        setViewing3D(true);
      } else {
        showToast(`Capture failed: ${res.error || 'No building pieces found in radius'}`, 'error');
      }
    } catch (err: any) {
      showToast(`Capture error: ${err.message}`, 'error');
    } finally {
      setIsCapturing(false);
    }
  };

  // Flatten / Terraform ground under the structure
  const handleTerraformGround = async () => {
    if (!liveStatus?.inGame) {
      showToast('Valheim must be running in a game world to terraform ground.', 'info');
      return;
    }
    if (!selectedBlueprint || selectedBlueprint.pieces.length === 0) {
      showToast('Selected blueprint has no pieces.', 'error');
      return;
    }

    setIsTerraforming(true);
    showToast(`Leveling & flattening ground under ${selectedBlueprint.name}...`, 'info');

    try {
      const res = await terraformLive({
        armed: isArmed,
        pieces: selectedBlueprint.pieces,
        rotationY,
        heightOffset,
        distanceInFront,
        usePlayerPos: true,
      });

      if (res.success) {
        showToast(
          `★ Ground Leveled & Cleared (${res.zonesModified || 1} terrain zones updated in-game)!`,
          'success'
        );
      } else {
        showToast(`Terraforming failed: ${res.error || 'Check Valheim'}`, 'error');
      }
    } catch (err: any) {
      showToast(`Terraforming error: ${err.message}`, 'error');
    } finally {
      setIsTerraforming(false);
    }
  };

  // Arm Placement Mode (Aim with crosshair, drop with [G])
  const handleArmPlacement = async () => {
    if (!liveStatus?.inGame) {
      showToast('Valheim must be running in a game world to arm placement.', 'info');
      return;
    }
    if (!selectedBlueprint || selectedBlueprint.pieces.length === 0) {
      showToast('Selected blueprint has no pieces.', 'error');
      return;
    }

    setIsArming(true);
    try {
      const res = await armBlueprintLive({
        name: selectedBlueprint.name,
        pieces: selectedBlueprint.pieces,
        rotationY,
        heightOffset,
        autoTerraform,
      });

      if (res.success) {
        setIsArmed(true);
        showToast(
          `🎯 Placement Mode ARMED! Aim your crosshair in Valheim and press [G] or [Middle Click] to place!`,
          'success'
        );
      } else {
        showToast(`Failed to arm: ${res.error || 'Check Valheim'}`, 'error');
      }
    } catch (err: any) {
      showToast(`Error arming: ${err.message}`, 'error');
    } finally {
      setIsArming(false);
    }
  };

  // Disarm Placement Mode
  const handleDisarmPlacement = async () => {
    try {
      await disarmBlueprintLive();
      setIsArmed(false);
      showToast('Placement mode disarmed / cancelled.', 'info');
    } catch {}
  };


  // Spawn missing materials into player inventory
  const handleSpawnMaterials = async () => {
    if (!liveStatus?.inGame) {
      showToast('Connect in-game to spawn materials.', 'info');
      return;
    }
    if (!selectedBlueprint) return;

    showToast(`Adding crafting materials for ${selectedBlueprint.name} to inventory...`, 'info');
    let spawned = 0;
    for (const mat of selectedBlueprint.materials) {
      // Map display name to prefab
      let prefab = 'Wood';
      if (mat.name === 'Wood') prefab = 'Wood';
      else if (mat.name === 'Stone') prefab = 'Stone';
      else if (mat.name === 'Core Wood') prefab = 'RoundLog';
      else if (mat.name === 'Fine Wood') prefab = 'FineWood';
      else if (mat.name === 'Iron') prefab = 'Iron';
      else if (mat.name === 'Copper') prefab = 'Copper';
      else if (mat.name === 'Surtling Core') prefab = 'SurtlingCore';
      else if (mat.name === 'Greydwarf Eye') prefab = 'GreydwarfEye';
      else if (mat.name === 'Coal') prefab = 'Coal';

      await spawnLiveItem(prefab, mat.amount);
      spawned += mat.amount;
    }
    showToast(`⚡ Added ${spawned} materials to your Viking inventory!`, 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in-50">
      <div className="bg-valheim-dark border border-valheim-border rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-valheim-border bg-valheim-panel/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-amber-950/80 border border-valheim-brass flex items-center justify-center text-valheim-gold">
              <Hammer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-valheim font-bold text-valheim-gold tracking-wide">
                  Auto-Builder & Blueprints
                </h2>
                {liveStatus?.inGame ? (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/80 text-emerald-300 text-[11px] font-semibold">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    LIVE: {liveStatus.playerName}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-valheim-slot border border-valheim-border text-gray-400 text-[11px]">
                    Offline File Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">
                Load community builds (.vbuild / .blueprint) or presets and auto-construct them live in Valheim.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {liveStatus?.inGame && onToggleFlyMode && (
              <button
                onClick={onToggleFlyMode}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition cursor-pointer ${
                  isFlyMode
                    ? 'bg-sky-950/90 hover:bg-sky-900 border border-sky-400 text-sky-200 shadow-[0_0_12px_rgba(56,189,248,0.45)]'
                    : 'bg-valheim-panel/90 hover:bg-valheim-slothover border border-valheim-border hover:border-valheim-brass text-gray-300'
                }`}
                title="Fly freely through walls to inspect elevation, roofs, and aim crosshair (Hotkey: [F9] in-game)"
              >
                <Plane className={`w-3.5 h-3.5 ${isFlyMode ? 'text-sky-300 animate-pulse' : 'text-gray-400'}`} />
                <span>{isFlyMode ? 'Fly (No-Clip): ON' : 'Fly (No-Clip) [F9]'}</span>
              </button>
            )}
            {liveStatus?.inGame && (
              <button
                onClick={handleUndoBuild}
                disabled={isUndoing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-950/80 hover:bg-red-900 border border-red-700 text-red-200 text-xs font-semibold transition"
                title="Undo the last placed blueprint (Hotkeys: [F8] or [Ctrl+Z] in-game)"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isUndoing ? 'animate-spin' : ''}`} />
                <span>Undo Last Build [F8]</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded hover:bg-valheim-slothover flex items-center justify-center text-gray-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: Sidebar (Left) + Inspector / Controls (Right) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Column: Blueprints Library & Import */}
          <div className="w-full md:w-80 bg-valheim-panel/60 border-r border-valheim-border/80 flex flex-col shrink-0">
            {/* Tabs */}
            <div className="flex border-b border-valheim-border/60 bg-valheim-dark/40">
              <button
                onClick={() => setActiveTab('presets')}
                className={`flex-1 py-2 text-xs font-valheim font-semibold transition ${
                  activeTab === 'presets'
                    ? 'border-b-2 border-valheim-brass text-valheim-gold bg-valheim-panel/60'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Presets ({blueprints.length})
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex-1 py-2 text-xs font-valheim font-semibold transition ${
                  activeTab === 'upload'
                    ? 'border-b-2 border-valheim-brass text-valheim-gold bg-valheim-panel/60'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Import File
              </button>
              <button
                onClick={() => setActiveTab('paste')}
                className={`flex-1 py-2 text-xs font-valheim font-semibold transition ${
                  activeTab === 'paste'
                    ? 'border-b-2 border-valheim-brass text-valheim-gold bg-valheim-panel/60'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Paste Code
              </button>
              <button
                onClick={() => setActiveTab('capture')}
                className={`flex-1 py-2 text-xs font-valheim font-semibold transition flex items-center justify-center gap-1 ${
                  activeTab === 'capture'
                    ? 'border-b-2 border-valheim-brass text-valheim-gold bg-valheim-panel/60'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                title="Capture live player-built structure directly from in-game world"
              >
                <Camera className="w-3 h-3 text-amber-400" />
                <span>Capture</span>
              </button>
            </div>

            {/* Tab 1: Presets & Custom List */}
            {activeTab === 'presets' && (
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {blueprints.map((bp) => {
                  const isSelected = bp.id === selectedBlueprintId;
                  return (
                    <div
                      key={bp.id}
                      onClick={() => setSelectedBlueprintId(bp.id)}
                      className={`p-3 rounded-lg border transition cursor-pointer ${
                        isSelected
                          ? 'bg-amber-950/70 border-valheim-brass text-valheim-gold shadow'
                          : 'bg-valheim-dark/60 hover:bg-valheim-dark border-valheim-border/60 text-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold font-valheim truncate">{bp.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-valheim-slot border border-valheim-border/60 text-gray-400 shrink-0">
                          {bp.totalPieces} pcs
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-400 truncate mt-0.5">{bp.description}</div>
                      <div className="flex items-center justify-between text-[10px] text-amber-500/80 mt-2">
                        <span>By {bp.author}</span>
                        <span className="uppercase tracking-wider font-mono text-[9px] text-gray-400">{bp.category}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tab 2: Upload File */}
            {activeTab === 'upload' && (
              <div className="flex-1 p-4 flex flex-col justify-center items-center text-center">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".vbuild,.blueprint,.json"
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-valheim-border hover:border-valheim-brass rounded-xl p-8 cursor-pointer transition bg-valheim-dark/40 hover:bg-valheim-dark flex flex-col items-center justify-center gap-3 group"
                >
                  <div className="w-12 h-12 rounded-full bg-valheim-panel border border-valheim-border group-hover:border-valheim-brass flex items-center justify-center text-valheim-gold transition">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-200">Click to Select Blueprint</div>
                    <div className="text-[11px] text-gray-400 mt-1">
                      Supports <span className="text-amber-400">.vbuild</span> (BuildShare) and{' '}
                      <span className="text-amber-400">.blueprint</span> (PlanBuild)
                    </div>
                  </div>
                </div>

                <div className="mt-6 text-left text-[11px] text-gray-400 bg-valheim-dark/60 p-3 rounded border border-valheim-border/60">
                  <div className="font-semibold text-valheim-goldlight mb-1 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-valheim-gold" />
                    <span>Where to get blueprints:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-gray-400 mb-3">
                    <li>
                      <span className="text-gray-200">Valheimians:</span> 2,500+ community builds with photos & downloads.
                    </li>
                    <li>
                      <span className="text-gray-200">NexusMods:</span> Blueprints tag (PlanBuild / BuildShare).
                    </li>
                    <li>
                      <span className="text-gray-200">Reddit:</span> r/ValheimBuilds showcase threads.
                    </li>
                  </ul>
                  <a
                    href="https://www.valheimians.com/builds/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded bg-amber-950/70 hover:bg-amber-900 border border-valheim-brass/60 text-valheim-gold text-xs font-semibold transition"
                  >
                    <span>Browse Valheimians Builds</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}

            {/* Tab 3: Paste Code */}
            {activeTab === 'paste' && (
              <div className="flex-1 p-3 flex flex-col gap-2">
                <textarea
                  value={pasteContent}
                  onChange={(e) => setPasteContent(e.target.value)}
                  placeholder="Paste .vbuild text or PlanBuild JSON content here..."
                  className="flex-1 w-full bg-valheim-dark border border-valheim-border rounded p-2.5 text-xs text-gray-200 font-mono focus:outline-none focus:border-valheim-brass resize-none"
                />
                <button
                  onClick={handlePasteSubmit}
                  className="w-full py-2 rounded bg-amber-950 hover:bg-amber-900 border border-valheim-brass text-valheim-gold font-valheim font-semibold text-xs transition"
                >
                  Parse & Load Blueprint
                </button>
                <a
                  href="https://www.valheimians.com/builds/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1 text-[11px] text-valheim-gold/80 hover:text-valheim-gold transition mt-1"
                >
                  <span>Need builds? Find thousands on Valheimians.com</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Tab 4: Capture In-Game Structure */}
            {activeTab === 'capture' && (
              <div className="flex-1 p-3.5 flex flex-col gap-3.5 overflow-y-auto">
                <div className="flex items-center gap-2.5 p-2.5 bg-amber-950/40 border border-amber-800/60 rounded-xl">
                  <Camera className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-amber-300">Live Structure Capture</div>
                    <div className="text-[11px] text-amber-400/80">Scan & save in-game buildings to .blueprint</div>
                  </div>
                </div>

                {/* In-Game Hotkey Tip */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-[11px] text-slate-300 space-y-1">
                  <div className="font-semibold text-cyan-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Quick Capture Hotkey: [F7]
                  </div>
                  <p className="text-slate-400">
                    You can also look at any building in Valheim and press <span className="font-mono text-cyan-300 bg-slate-900 px-1 py-0.5 rounded font-bold">[F7]</span> to instantly capture it!
                  </p>
                </div>

                {/* Capture Radius */}
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-300 mb-1">
                    <span>Capture Radius:</span>
                    <span className="font-mono text-valheim-gold font-bold">{captureRadius}m</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="1"
                    value={captureRadius}
                    onChange={(e) => setCaptureRadius(Number(e.target.value))}
                    className="w-full accent-amber-500 h-1.5 bg-valheim-dark rounded cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
                    <span>5m (Small hut)</span>
                    <span>25m (Fortress)</span>
                    <span>50m (Village)</span>
                  </div>
                </div>

                {/* Custom Blueprint Name */}
                <div>
                  <label className="block text-xs text-gray-300 mb-1">Structure Name:</label>
                  <input
                    type="text"
                    value={captureName}
                    onChange={(e) => setCaptureName(e.target.value)}
                    placeholder="e.g. Mountain Longhouse"
                    className="w-full bg-valheim-dark border border-valheim-border rounded px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-valheim-brass"
                  />
                </div>

                {/* Save to disk checkbox */}
                <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300">
                  <input
                    type="checkbox"
                    checked={captureSaveToDisk}
                    onChange={(e) => setCaptureSaveToDisk(e.target.checked)}
                    className="rounded border-valheim-border text-amber-600 focus:ring-0 focus:ring-offset-0 bg-valheim-dark"
                  />
                  <span>Save to PlanBuild/blueprints folder</span>
                </label>

                {/* Capture Button */}
                <button
                  onClick={handleCaptureStructure}
                  disabled={isCapturing || !liveStatus?.inGame}
                  className={`w-full py-2.5 rounded-lg border font-valheim font-semibold text-xs transition flex items-center justify-center gap-2 shadow-lg ${
                    liveStatus?.inGame
                      ? 'bg-amber-600 hover:bg-amber-500 border-amber-400 text-white cursor-pointer'
                      : 'bg-valheim-slot border-valheim-border text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Camera className={`w-4 h-4 ${isCapturing ? 'animate-pulse' : ''}`} />
                  <span>{isCapturing ? 'Capturing Structure...' : 'Capture Structure [Live]'}</span>
                </button>

                {!liveStatus?.inGame && (
                  <div className="text-[11px] text-center text-amber-500/80 bg-amber-950/20 border border-amber-900/40 rounded p-2">
                    Valheim must be running in-game to capture buildings.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Blueprint Inspector, Materials & Placement */}
          <div className="flex-1 flex flex-col overflow-y-auto p-5 bg-valheim-dark/30">
            {/* Blueprint Overview Banner */}
            <div className="bg-valheim-panel/80 border border-valheim-border rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-valheim font-bold text-valheim-gold">
                    {selectedBlueprint.name}
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-amber-950 border border-valheim-brass/60 text-valheim-goldlight text-[10px] uppercase font-mono">
                    {selectedBlueprint.category}
                  </span>
                </div>
                <p className="text-xs text-gray-300 mt-1">{selectedBlueprint.description}</p>
                <div className="text-[11px] text-gray-400 mt-1">
                  Creator: <span className="text-gray-200 font-medium">{selectedBlueprint.author}</span> &bull; Total Pieces:{' '}
                  <span className="text-amber-400 font-bold">{selectedBlueprint.totalPieces}</span>
                </div>
              </div>

              {/* Free Build Mode Quick Badge & 3D Inspector Button */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setViewing3D(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition border bg-amber-950/80 hover:bg-amber-900 border-valheim-brass text-valheim-gold shadow cursor-pointer"
                  title="Inspect this blueprint in full interactive 3D WebGL (Layer-by-layer slicing, explode view, piece breakdown)"
                >
                  <Eye className="w-3.5 h-3.5 text-valheim-gold" />
                  <span>3D Web Inspector</span>
                </button>
                {onToggleNoCostBuilding && (
                  <button
                    onClick={onToggleNoCostBuilding}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition border ${
                      isNoCostBuilding
                        ? 'bg-cyan-950 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                        : 'bg-valheim-dark border-valheim-border text-gray-400 hover:text-gray-200'
                    }`}
                    title="Toggle Free Build / No Cost in Valheim"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Free Build: {isNoCostBuilding ? 'ON' : 'OFF'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Materials Breakdown */}
            <div className="mt-4 bg-valheim-panel/60 border border-valheim-border/80 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-valheim font-bold text-valheim-goldlight uppercase tracking-wider flex items-center gap-1.5">
                  <Box className="w-4 h-4 text-valheim-gold" />
                  <span>Required Building Materials</span>
                </span>
                {liveStatus?.inGame && (
                  <button
                    onClick={handleSpawnMaterials}
                    className="text-xs text-amber-300 hover:text-amber-200 flex items-center gap-1 transition"
                    title="Add all required building materials to your Viking inventory"
                  >
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span>+ Add Materials to Inventory</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {selectedBlueprint.materials.map((mat) => (
                  <div
                    key={mat.name}
                    className="bg-valheim-dark/80 border border-valheim-border/60 rounded-lg p-2.5 flex items-center justify-between"
                  >
                    <span className="text-xs text-gray-300 font-medium truncate">{mat.name}</span>
                    <span className="text-xs font-mono font-bold text-valheim-gold shrink-0">
                      {mat.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Placement Adjustments */}
            <div className="mt-4 bg-valheim-panel/60 border border-valheim-border/80 rounded-xl p-4">
              <span className="text-xs font-valheim font-bold text-valheim-goldlight uppercase tracking-wider block mb-3">
                Placement Orientation & Elevation
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                {/* Rotation */}
                <div>
                  <div className="text-gray-400 mb-1.5 flex items-center justify-between">
                    <span>Rotation Facing:</span>
                    <span className="font-mono text-valheim-gold font-bold">{rotationY}&deg;</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[0, 90, 180, 270].map((deg) => (
                      <button
                        key={deg}
                        onClick={() => setRotationY(deg)}
                        className={`flex-1 py-1 rounded text-xs font-mono transition border ${
                          rotationY === deg
                            ? 'bg-amber-950 border-valheim-brass text-valheim-gold'
                            : 'bg-valheim-dark border-valheim-border text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        {deg}&deg;
                      </button>
                    ))}
                  </div>
                </div>

                {/* Distance in front */}
                <div>
                  <div className="text-gray-400 mb-1.5 flex items-center justify-between">
                    <span>Distance in Front:</span>
                    <span className="font-mono text-valheim-gold font-bold">{distanceInFront}m</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="15"
                    step="1"
                    value={distanceInFront}
                    onChange={(e) => setDistanceInFront(parseInt(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Height Offset */}
                <div>
                  <div className="text-gray-400 mb-1.5 flex items-center justify-between">
                    <span>Terrain Elevation:</span>
                    <span className="font-mono text-valheim-gold font-bold">
                      {heightOffset > 0 ? `+${heightOffset}` : heightOffset}m
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-3"
                    max="6"
                    step="0.5"
                    value={heightOffset}
                    onChange={(e) => setHeightOffset(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Terraforming & Site Preparation Controls */}
              <div className="mt-3 pt-3 border-t border-valheim-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs text-gray-200">
                  <input
                    type="checkbox"
                    checked={autoTerraform}
                    onChange={(e) => setAutoTerraform(e.target.checked)}
                    className="w-4 h-4 rounded border-valheim-border bg-valheim-dark text-amber-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <div className="flex flex-col">
                    <span className="font-semibold text-valheim-gold flex items-center gap-1.5">
                      <Mountain className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Auto-Terraform Ground Under Structure</span>
                    </span>
                    <span className="text-[11px] text-gray-400">
                      Flattens slopes, cuts hills clipping through floors, raises ground under foundation, and clears grass
                    </span>
                  </div>
                </label>

                {liveStatus?.inGame && (
                  <button
                    onClick={handleTerraformGround}
                    disabled={isTerraforming}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/80 text-emerald-200 text-xs font-semibold transition shrink-0 self-start sm:self-auto cursor-pointer shadow hover:border-emerald-400 active:scale-95"
                    title="Level the terrain right now under your crosshair or current preview (In-game hotkey: [T])"
                  >
                    <Mountain className={`w-3.5 h-3.5 text-emerald-400 ${isTerraforming ? 'animate-spin' : ''}`} />
                    <span>{isTerraforming ? 'Leveling Ground...' : 'Flatten Site Now [T]'}</span>
                  </button>
                )}
              </div>

              <div className="text-[11px] text-gray-400 mt-3 flex items-center gap-1.5 bg-valheim-dark/40 p-2 rounded border border-valheim-border/40">
                <Info className="w-3.5 h-3.5 text-valheim-gold shrink-0" />
                <span>
                  Preset placement values are applied when instant building or arming. You can also fine-tune rotation, height, and terraforming directly in-game using keyboard hotkeys!
                </span>
              </div>
            </div>

            {/* In-Game Interactive 3D Hologram Controls Card */}
            <div className="mt-4 bg-gradient-to-r from-cyan-950/40 via-valheim-panel/80 to-teal-950/40 border border-cyan-500/60 rounded-xl p-4 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-valheim font-bold text-cyan-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>Real-Time 3D Hologram Preview & Placement</span>
                </span>
                {isArmed ? (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950 border border-cyan-400 text-cyan-200 text-[11px] font-bold animate-pulse shadow-[0_0_12px_rgba(6,182,212,0.6)]">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                    3D HOLOGRAM ACTIVE IN GAME
                  </span>
                ) : (
                  <span className="text-[11px] text-gray-400">
                    Works on any server (Dedicated, Vanilla, or Local)
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-200 mb-3">
                Click <strong className="text-cyan-300">3D Hologram Preview</strong> to project a real-time translucent ghost of the structure right at your crosshair in Valheim. Rotate with mouse wheel, adjust elevation, and click to place!
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                <div className="bg-valheim-dark/90 border border-cyan-500/40 rounded p-2 flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-400 text-cyan-200 font-mono font-bold text-[10px] shrink-0">
                    [Left Click] / [G]
                  </kbd>
                  <span className="text-gray-200 font-medium truncate">Build Structure</span>
                </div>
                <div className="bg-valheim-dark/90 border border-valheim-border/60 rounded p-2 flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 rounded bg-valheim-panel border border-valheim-border text-valheim-gold font-mono font-bold text-[10px] shrink-0">
                    [Scroll Wheel]
                  </kbd>
                  <span className="text-gray-300 truncate">Rotate 22.5&deg;</span>
                </div>
                <div className="bg-valheim-dark/90 border border-valheim-border/60 rounded p-2 flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 rounded bg-valheim-panel border border-valheim-border text-valheim-gold font-mono font-bold text-[10px] shrink-0">
                    [Ctrl + Scroll]
                  </kbd>
                  <span className="text-gray-300 truncate">Elevation &plusmn;0.25m</span>
                </div>
                <div className="bg-valheim-dark/90 border border-valheim-border/60 rounded p-2 flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 rounded bg-valheim-panel border border-valheim-border text-red-300 font-mono font-bold text-[10px] shrink-0">
                    [Right Click] / [Esc]
                  </kbd>
                  <span className="text-gray-300 truncate">Cancel Preview</span>
                </div>
                <div className="bg-valheim-dark/90 border border-valheim-border/60 rounded p-2 flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-400 text-emerald-300 font-mono font-bold text-[10px] shrink-0">
                    [T]
                  </kbd>
                  <span className="text-gray-300 truncate">Toggle Auto-Flatten</span>
                </div>
                <div className="bg-valheim-dark/90 border border-valheim-border/60 rounded p-2 flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 rounded bg-valheim-panel border border-valheim-border text-red-400 font-mono font-bold text-[10px] shrink-0">
                    [Ctrl + Z] / [F8]
                  </kbd>
                  <span className="text-gray-300 truncate">Instant Undo</span>
                </div>
                <div className="bg-valheim-dark/90 border border-valheim-border/60 rounded p-2 flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 rounded bg-valheim-panel border border-valheim-border text-gray-300 font-mono font-bold text-[10px] shrink-0">
                    [Q]
                  </kbd>
                  <span className="text-gray-300 truncate">Reset Rot / Height</span>
                </div>
                <div className="bg-valheim-dark/90 border border-valheim-border/60 rounded p-2 flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 rounded bg-valheim-panel border border-valheim-border text-cyan-300 font-mono font-bold text-[10px] shrink-0">
                    [F6]
                  </kbd>
                  <span className="text-gray-300 truncate">Cycle Blueprints</span>
                </div>
                <div className="bg-valheim-dark/90 border border-valheim-border/60 rounded p-2 flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 rounded bg-valheim-panel border border-valheim-border text-sky-300 font-mono font-bold text-[10px] shrink-0">
                    [F9]
                  </kbd>
                  <span className="text-gray-300 truncate">Fly (No-Clip)</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-auto pt-6 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-gray-400">
                {liveStatus?.inGame ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Ready to build live in world
                  </span>
                ) : (
                  <span className="text-amber-400">
                    Connect live in-game to auto-construct this blueprint
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {liveStatus?.inGame && (
                  <button
                    onClick={handleUndoBuild}
                    disabled={isUndoing}
                    className="flex items-center gap-1.5 px-3 py-2 rounded bg-red-950/80 hover:bg-red-900 border border-red-700 text-xs text-red-200 font-semibold transition"
                    title="Undo the last placed blueprint (Hotkeys: [F8] or [Ctrl+Z] in-game)"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isUndoing ? 'animate-spin' : ''}`} />
                    <span>Undo Build [F8]</span>
                  </button>
                )}

                {isArmed && (
                  <button
                    onClick={handleDisarmPlacement}
                    className="px-3 py-2 rounded bg-valheim-panel hover:bg-valheim-slothover border border-valheim-border text-xs text-gray-300 font-semibold transition"
                    title="Cancel armed placement mode"
                  >
                    Disarm [Esc]
                  </button>
                )}

                <button
                  onClick={() => setViewing3D(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-valheim-panel/90 hover:bg-valheim-slothover border border-valheim-border hover:border-valheim-brass text-valheim-gold font-valheim font-semibold text-xs transition shadow cursor-pointer active:scale-95"
                  title="Inspect this blueprint in 3D WebGL (Layer slicing, explode view, piece breakdown)"
                >
                  <Eye className="w-3.5 h-3.5 text-valheim-gold" />
                  <span>3D View</span>
                </button>

                <button
                  onClick={handleSyncToPlanBuild}
                  disabled={isSyncingPlanBuild || !selectedBlueprint}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600 text-emerald-200 font-valheim font-semibold text-xs transition shadow cursor-pointer active:scale-95 disabled:opacity-50"
                  title="Export this blueprint file to Valheim config folder for [F6] in-game cycling"
                >
                  <Layers className={`w-3.5 h-3.5 text-emerald-400 ${isSyncingPlanBuild ? 'animate-spin' : ''}`} />
                  <span>{isSyncingPlanBuild ? 'Syncing...' : 'Save to Disk'}</span>
                </button>

                <button
                  onClick={handleArmPlacement}
                  disabled={isArming || !liveStatus?.inGame}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border font-valheim font-bold text-xs tracking-wider transition shadow-lg active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    isArmed
                      ? 'bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                      : 'bg-cyan-950 hover:bg-cyan-900 border-cyan-500 text-cyan-200'
                  }`}
                  title="Projects a real-time 3D translucent hologram at your crosshair in Valheim! Rotate with mouse wheel, adjust elevation, and click to place!"
                >
                  <Crosshair className={`w-4 h-4 text-cyan-300 ${isArming ? 'animate-spin' : ''}`} />
                  <span>{isArmed ? 'Hologram Active! (Click to Place)' : '3D Hologram Preview'}</span>
                </button>

                <button
                  onClick={handleExecuteBuild}
                  disabled={isBuilding || !liveStatus?.inGame}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed border border-valheim-brass text-valheim-dark font-valheim font-bold text-xs tracking-wider transition shadow-lg active:scale-95 cursor-pointer"
                  title="Instantly place blueprint in front of your character"
                >
                  <Hammer className={`w-4 h-4 ${isBuilding ? 'animate-bounce' : ''}`} />
                  <span>{isBuilding ? 'Building...' : 'Instant Build'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive 3D WebGL Blueprint Viewer Modal */}
      {viewing3D && selectedBlueprint && (
        <BlueprintViewer3D
          blueprintName={selectedBlueprint.name}
          pieces={selectedBlueprint.pieces}
          author={selectedBlueprint.author}
          description={selectedBlueprint.description}
          category={selectedBlueprint.category}
          onClose={() => setViewing3D(false)}
          onArm={
            liveStatus?.inGame
              ? () => {
                  setViewing3D(false);
                  handleArmPlacement();
                }
              : undefined
          }
          onBuild={
            liveStatus?.inGame
              ? () => {
                  setViewing3D(false);
                  handleExecuteBuild();
                }
              : undefined
          }
        />
      )}
    </div>
  );
};
