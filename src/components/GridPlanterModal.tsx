import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Sprout,
  Shovel,
  Sparkles,
  RotateCw,
  Undo2,
  Wheat,
  Trees,
  Check,
  AlertCircle,
  RefreshCw,
  Plus,
  Scissors,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  LiveGameStatus,
  plantCropGridLive,
  harvestCropsLive,
  getFarmStatusLive,
  spawnLiveItem,
  undoLastBuildLive,
  FarmStatusResult,
} from '../services/liveBridge';

export interface CropDefinition {
  id: string;
  name: string;
  category: 'Vegetables' | 'Seed Multipliers' | 'Grains & Special' | 'Ashlands' | 'Forestry Trees';
  prefab: string;
  seedItem: string;
  defaultSpacing: number;
  biome: string;
  needsCultivate: boolean;
  icon: string;
  description: string;
}

export const CROPS_CATALOG: CropDefinition[] = [
  // Vegetables
  {
    id: 'carrot',
    name: 'Carrots',
    category: 'Vegetables',
    prefab: 'Sapling_Carrot',
    seedItem: 'CarrotSeeds',
    defaultSpacing: 0.85,
    biome: 'Black Forest+',
    needsCultivate: true,
    icon: './icons/carrot.png',
    description: 'Crisp orange root vegetable. Essential for Carrot Soup and boar taming.',
  },
  {
    id: 'turnip',
    name: 'Turnips',
    category: 'Vegetables',
    prefab: 'Sapling_Turnip',
    seedItem: 'TurnipSeeds',
    defaultSpacing: 0.85,
    biome: 'Swamp+',
    needsCultivate: true,
    icon: './icons/turnip.png',
    description: 'Swamp root vegetable used for high-tier Turnip Stew.',
  },
  {
    id: 'onion',
    name: 'Onions',
    category: 'Vegetables',
    prefab: 'Sapling_Onion',
    seedItem: 'OnionSeeds',
    defaultSpacing: 0.85,
    biome: 'Mountain+',
    needsCultivate: true,
    icon: './icons/onion.png',
    description: 'High stamina vegetable found in Mountain chests. Key for Onion Soup.',
  },

  // Seed Multipliers
  {
    id: 'seedcarrot',
    name: 'Seed Carrots',
    category: 'Seed Multipliers',
    prefab: 'Sapling_SeedCarrot',
    seedItem: 'Carrot',
    defaultSpacing: 0.85,
    biome: 'Black Forest+',
    needsCultivate: true,
    icon: './icons/seedcarrot.png',
    description: 'Plants 1 mature Carrot to grow 3 Carrot Seeds.',
  },
  {
    id: 'seedturnip',
    name: 'Seed Turnips',
    category: 'Seed Multipliers',
    prefab: 'Sapling_SeedTurnip',
    seedItem: 'Turnip',
    defaultSpacing: 0.85,
    biome: 'Swamp+',
    needsCultivate: true,
    icon: './icons/seedturnip.png',
    description: 'Plants 1 mature Turnip to produce 3 Turnip Seeds.',
  },
  {
    id: 'seedonion',
    name: 'Seed Onions',
    category: 'Seed Multipliers',
    prefab: 'Sapling_SeedOnion',
    seedItem: 'Onion',
    defaultSpacing: 0.85,
    biome: 'Mountain+',
    needsCultivate: true,
    icon: './icons/onionseeds.png',
    description: 'Plants 1 mature Onion to produce 3 Onion Seeds.',
  },

  // Grains & Special
  {
    id: 'barley',
    name: 'Barley',
    category: 'Grains & Special',
    prefab: 'Barley',
    seedItem: 'Barley',
    defaultSpacing: 0.85,
    biome: 'Plains',
    needsCultivate: true,
    icon: './icons/barley.png',
    description: 'Golden Plains grain used for flour, breads, and barley wine.',
  },
  {
    id: 'flax',
    name: 'Flax',
    category: 'Grains & Special',
    prefab: 'Flax',
    seedItem: 'Flax',
    defaultSpacing: 0.85,
    biome: 'Plains',
    needsCultivate: true,
    icon: './icons/flax.png',
    description: 'Blue-flowered stalk spun into linen thread for high-end gear.',
  },
  {
    id: 'jotunpuffs',
    name: 'Jotun Puffs',
    category: 'Grains & Special',
    prefab: 'Sapling_Mushroom_JotunPuffs',
    seedItem: 'MushroomJotunPuffs',
    defaultSpacing: 1.0,
    biome: 'Mistlands',
    needsCultivate: true,
    icon: './icons/mushroomjotunpuffs.png',
    description: 'Giant culinary fungi found deep in the foggy Mistlands.',
  },
  {
    id: 'magecap',
    name: 'Magecap',
    category: 'Grains & Special',
    prefab: 'Sapling_Magecap',
    seedItem: 'MushroomMagecap',
    defaultSpacing: 1.0,
    biome: 'Mistlands',
    needsCultivate: true,
    icon: './icons/mushroommagecap.png',
    description: 'Luminescent blue mushroom essential for brewing magical Eitr food.',
  },

  // Ashlands
  {
    id: 'fiddlehead',
    name: 'Fiddlehead',
    category: 'Ashlands',
    prefab: 'Sapling_Fiddlehead',
    seedItem: 'Fiddlehead',
    defaultSpacing: 1.0,
    biome: 'Ashlands',
    needsCultivate: true,
    icon: './icons/kaleseeds.png',
    description: 'Curled fern from the scorching volcanic Ashlands.',
  },
  {
    id: 'smokepuff',
    name: 'Smoke Puff',
    category: 'Ashlands',
    prefab: 'Sapling_SmokePuff',
    seedItem: 'SmokePuff',
    defaultSpacing: 1.0,
    biome: 'Ashlands',
    needsCultivate: true,
    icon: './icons/poteitrseeds.png',
    description: 'Fiery spore-bearing mushroom that thrives in scorched earth.',
  },
  {
    id: 'vineberry',
    name: 'Vineberry',
    category: 'Ashlands',
    prefab: 'Sapling_Vineberry',
    seedItem: 'Vineberry',
    defaultSpacing: 1.0,
    biome: 'Ashlands',
    needsCultivate: true,
    icon: './icons/vineberryseeds.png',
    description: 'Juicy fiery vine berry used for celestial Ashlands banquets.',
  },

  // Forestry Trees
  {
    id: 'beech',
    name: 'Beech Trees',
    category: 'Forestry Trees',
    prefab: 'Sapling_Beech',
    seedItem: 'BeechSeeds',
    defaultSpacing: 2.5,
    biome: 'Meadows',
    needsCultivate: false,
    icon: './icons/beechseeds.png',
    description: 'Stately broadleaf tree providing abundant basic wood.',
  },
  {
    id: 'birch',
    name: 'Birch Trees',
    category: 'Forestry Trees',
    prefab: 'Sapling_Birch',
    seedItem: 'BirchSeeds',
    defaultSpacing: 2.5,
    biome: 'Meadows / Plains',
    needsCultivate: false,
    icon: './icons/birchseeds.png',
    description: 'White-bark hardwood tree; essential sustainable source of Fine Wood.',
  },
  {
    id: 'pine',
    name: 'Pine Trees',
    category: 'Forestry Trees',
    prefab: 'Sapling_Pine',
    seedItem: 'PineCone',
    defaultSpacing: 3.0,
    biome: 'Black Forest',
    needsCultivate: false,
    icon: './icons/pinecone.png',
    description: 'Towering conifer; yields high volumes of Core Wood for log building.',
  },
  {
    id: 'fir',
    name: 'Fir Trees',
    category: 'Forestry Trees',
    prefab: 'Sapling_Fir',
    seedItem: 'FirCone',
    defaultSpacing: 2.5,
    biome: 'Black Forest / Mountain',
    needsCultivate: false,
    icon: './icons/fircone.png',
    description: 'Rugged evergreen tree suited for steep slopes and perimeter forestry.',
  },
  {
    id: 'oak',
    name: 'Oak Trees',
    category: 'Forestry Trees',
    prefab: 'Sapling_Oak',
    seedItem: 'Acorn',
    defaultSpacing: 3.5,
    biome: 'Meadows',
    needsCultivate: false,
    icon: './icons/acorn.png',
    description: 'Colossal ancient oak providing massive amounts of Fine Wood.',
  },
];

interface GridPlanterModalProps {
  isOpen: boolean;
  onClose: () => void;
  liveStatus: LiveGameStatus | null;
  isNoCostBuilding?: boolean;
  showToast?: (text: string, type?: 'success' | 'info' | 'error') => void;
}

export const GridPlanterModal: React.FC<GridPlanterModalProps> = ({
  isOpen,
  onClose,
  liveStatus,
  isNoCostBuilding = false,
  showToast = () => {},
}) => {
  const [selectedCropId, setSelectedCropId] = useState<string>('carrot');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [rows, setRows] = useState<number>(5);
  const [cols, setCols] = useState<number>(5);
  const [spacing, setSpacing] = useState<number>(0.85);
  const [autoCultivate, setAutoCultivate] = useState<boolean>(true);
  const [consumeSeeds, setConsumeSeeds] = useState<boolean>(true);
  const [instantMature, setInstantMature] = useState<boolean>(false);
  const [harvestRadius, setHarvestRadius] = useState<number>(15);

  const [farmStatus, setFarmStatus] = useState<FarmStatusResult | null>(null);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState<boolean>(false);
  const [isPlanting, setIsPlanting] = useState<boolean>(false);
  const [isHarvesting, setIsHarvesting] = useState<boolean>(false);
  const [isUndoing, setIsUndoing] = useState<boolean>(false);
  const [isSpawningSeeds, setIsSpawningSeeds] = useState<boolean>(false);

  const selectedCrop = useMemo(() => {
    return CROPS_CATALOG.find((c) => c.id === selectedCropId) || CROPS_CATALOG[0];
  }, [selectedCropId]);

  // Adjust spacing automatically when user selects a different crop category (e.g. Trees vs Crops)
  const handleSelectCrop = (crop: CropDefinition) => {
    setSelectedCropId(crop.id);
    setSpacing(crop.defaultSpacing);
  };

  // Fetch Farm Status from game
  const refreshFarmStatus = async () => {
    if (!liveStatus?.inGame) return;
    setIsRefreshingStatus(true);
    try {
      const res = await getFarmStatusLive();
      if (res.success) {
        setFarmStatus(res);
      }
    } catch {
      // Ignored
    } finally {
      setIsRefreshingStatus(false);
    }
  };

  useEffect(() => {
    if (isOpen && liveStatus?.inGame) {
      refreshFarmStatus();
    }
  }, [isOpen, liveStatus?.inGame]);

  if (!isOpen) return null;

  const totalCropsCount = rows * cols;
  const currentSeedCount = farmStatus?.seeds?.[selectedCrop.seedItem] ?? 0;
  const isFreeBuildActive = isNoCostBuilding || liveStatus?.noPlacementCost;
  const missingSeeds = Math.max(0, totalCropsCount - currentSeedCount);

  // Field dimensions in meters
  const fieldWidth = ((cols - 1) * spacing).toFixed(1);
  const fieldHeight = ((rows - 1) * spacing).toFixed(1);

  const categories = ['All', 'Vegetables', 'Seed Multipliers', 'Grains & Special', 'Ashlands', 'Forestry Trees'];
  const filteredCrops = activeCategory === 'All'
    ? CROPS_CATALOG
    : CROPS_CATALOG.filter((c) => c.category === activeCategory);

  const handlePlantGrid = async () => {
    if (!liveStatus?.inGame) {
      showToast('Game is not running or player is not loaded.', 'error');
      return;
    }

    if (consumeSeeds && !isFreeBuildActive && currentSeedCount < 1) {
      showToast(`You have 0 ${selectedCrop.seedItem} in your inventory!`, 'error');
      return;
    }

    setIsPlanting(true);
    try {
      const result = await plantCropGridLive({
        crop: selectedCrop.id,
        rows,
        cols,
        spacing,
        autoCultivate,
        consumeSeeds,
        instantMature,
      });

      if (result.success) {
        showToast(
          `Planted ${result.plantedCount} ${result.crop} in a ${rows}x${cols} grid! [F8 to Undo]`,
          'success'
        );
        refreshFarmStatus();
      } else {
        showToast(result.error || 'Failed to plant crop grid.', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Error communicating with game.', 'error');
    } finally {
      setIsPlanting(false);
    }
  };

  const handleHarvestNearby = async () => {
    if (!liveStatus?.inGame) {
      showToast('Game is not running or player is not loaded.', 'error');
      return;
    }

    setIsHarvesting(true);
    try {
      const result = await harvestCropsLive(harvestRadius);
      if (result.success) {
        if (result.harvestedCount && result.harvestedCount > 0) {
          const itemsList = Object.entries(result.items || {})
            .map(([name, count]) => `${count}x ${name}`)
            .join(', ');
          showToast(
            `Harvested ${result.harvestedCount} crops (${itemsList || 'Items gathered'})!`,
            'success'
          );
        } else {
          showToast(`No ripe crops found within ${harvestRadius}m.`, 'info');
        }
        refreshFarmStatus();
      } else {
        showToast(result.error || 'Failed to harvest crops.', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Error harvesting crops.', 'error');
    } finally {
      setIsHarvesting(false);
    }
  };

  const handleUndo = async () => {
    setIsUndoing(true);
    try {
      const result = await undoLastBuildLive();
      if (result.success) {
        showToast(`Undid last planted grid (${result.undoneCount} pieces removed).`, 'success');
        refreshFarmStatus();
      } else {
        showToast(result.error || 'Failed to undo planted grid.', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Error undoing grid.', 'error');
    } finally {
      setIsUndoing(false);
    }
  };

  const handleSpawnSeeds = async () => {
    const amountToSpawn = missingSeeds > 0 ? missingSeeds : totalCropsCount;
    setIsSpawningSeeds(true);
    try {
      const res = await spawnLiveItem(selectedCrop.seedItem, amountToSpawn, 1);
      if (res.success) {
        showToast(`Spawned ${amountToSpawn}x ${selectedCrop.seedItem} into your inventory!`, 'success');
        refreshFarmStatus();
      } else {
        showToast(res.error || 'Failed to spawn seeds.', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Error spawning seeds.', 'error');
    } finally {
      setIsSpawningSeeds(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-valheim-dark border border-valheim-brass rounded-lg shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-valheim-border bg-valheim-panel/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-950/80 border border-emerald-500/60 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.35)]">
              <Sprout className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-valheim font-bold text-valheim-gold flex items-center gap-2">
                  Grid Planter & Crop Studio
                </h2>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 font-mono">
                  Valheim Live
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Precision matrix crop planting, auto-soil cultivation, and mass harvesting suite.
              </p>
            </div>
          </div>

          {/* Live Status & Close */}
          <div className="flex items-center gap-3">
            {liveStatus?.inGame ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded bg-emerald-950/60 border border-emerald-600/50 text-emerald-300 text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Player: {liveStatus.playerName}</span>
                {liveStatus.position && (
                  <span className="text-gray-400">
                    ({liveStatus.position.x.toFixed(0)}, {liveStatus.position.z.toFixed(0)})
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-amber-950/60 border border-amber-600/50 text-amber-300 text-xs">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Game not running</span>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-valheim-slothover rounded transition"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Farm Status & Quick Action Banner */}
        <div className="px-5 py-2.5 bg-valheim-slot border-b border-valheim-border/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">Nearby Growing:</span>
              <span className="font-bold text-amber-300 font-mono">
                {farmStatus?.nearbyGrowing ?? '—'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">Nearby Ripe to Harvest:</span>
              <span className="font-bold text-emerald-300 font-mono">
                {farmStatus?.nearbyRipe ?? '—'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">Selected Seed in Bag:</span>
              <span
                className={`font-bold font-mono px-2 py-0.5 rounded ${
                  isFreeBuildActive
                    ? 'text-cyan-300 bg-cyan-950/60 border border-cyan-700/50'
                    : currentSeedCount >= totalCropsCount
                    ? 'text-emerald-300 bg-emerald-950/60 border border-emerald-700/50'
                    : currentSeedCount > 0
                    ? 'text-amber-300 bg-amber-950/60 border border-amber-700/50'
                    : 'text-red-300 bg-red-950/60 border border-red-700/50'
                }`}
              >
                {isFreeBuildActive ? '∞ Free Build' : `${currentSeedCount}x ${selectedCrop.seedItem}`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refreshFarmStatus}
              disabled={isRefreshingStatus}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-valheim-panel border border-valheim-border hover:border-valheim-brass text-gray-300 text-xs transition"
              title="Refresh nearby crops and seed bag counts"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshingStatus ? 'animate-spin text-valheim-gold' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleHarvestNearby}
              disabled={isHarvesting || !liveStatus?.inGame}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-amber-950/80 hover:bg-amber-900 border border-amber-500/70 text-amber-200 font-valheim font-semibold text-xs shadow transition active:scale-95 disabled:opacity-50"
              title="Harvest all mature crops within 15m radius (In-game hotkey: [F10])"
            >
              <Scissors className="w-3.5 h-3.5 text-amber-400" />
              <span>{isHarvesting ? 'Harvesting...' : 'Harvest Nearby [F10]'}</span>
            </button>
          </div>
        </div>

        {/* Modal Main Body: 2-Column Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Column: Crop Selection Cards */}
          <div className="w-full md:w-5/12 lg:w-4/12 border-r border-valheim-border flex flex-col bg-valheim-dark/95">
            {/* Category Filter Pills */}
            <div className="p-3 border-b border-valheim-border flex gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2.5 py-1 rounded-full font-valheim font-semibold whitespace-nowrap transition ${
                    activeCategory === cat
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/80 shadow'
                      : 'bg-valheim-panel text-gray-400 hover:text-gray-200 border border-valheim-border/60'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Crops List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredCrops.map((crop) => {
                const isSelected = crop.id === selectedCropId;
                const seedCount = farmStatus?.seeds?.[crop.seedItem] ?? 0;
                return (
                  <div
                    key={crop.id}
                    onClick={() => handleSelectCrop(crop)}
                    className={`p-2.5 rounded-lg border transition cursor-pointer flex items-center gap-3 ${
                      isSelected
                        ? 'bg-emerald-950/60 border-emerald-400 text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                        : 'bg-valheim-panel/60 hover:bg-valheim-panel border-valheim-border/70 text-gray-300'
                    }`}
                  >
                    <div className="w-11 h-11 rounded bg-black/40 border border-valheim-border/80 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                      <img
                        src={crop.icon}
                        alt={crop.name}
                        className="w-full h-full object-contain drop-shadow"
                        onError={(e) => {
                          // Fallback to generic icon if image fails
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-valheim font-bold text-sm truncate">{crop.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 border border-valheim-border/60 text-gray-400 font-mono">
                          {crop.biome}
                        </span>
                      </div>

                      <div className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                        <span>Requires: {crop.seedItem}</span>
                        {farmStatus?.seeds && (
                          <span
                            className={`font-mono text-[10px] px-1.5 rounded ${
                              seedCount > 0
                                ? 'text-emerald-400 bg-emerald-950/70'
                                : 'text-gray-500 bg-black/30'
                            }`}
                          >
                            {seedCount} in bag
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Crop Summary footer */}
            <div className="p-3 border-t border-valheim-border bg-valheim-slot text-xs space-y-1">
              <div className="flex justify-between items-center text-gray-300">
                <span className="font-valheim font-bold text-valheim-gold">{selectedCrop.name}</span>
                <span className="text-[11px] text-gray-400">Rec. Spacing: {selectedCrop.defaultSpacing}m</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-tight">{selectedCrop.description}</p>
            </div>
          </div>

          {/* Right Column: Grid Configuration & 2D Live Visualizer */}
          <div className="w-full md:w-7/12 lg:w-8/12 flex flex-col overflow-y-auto p-4 sm:p-6 space-y-5 bg-valheim-panel/40">
            {/* Dimensions & Quick Presets */}
            <div className="bg-valheim-panel border border-valheim-border/90 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs uppercase tracking-wider font-bold text-valheim-gold flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>Grid Dimensions</span>
                </label>
                <div className="flex items-center gap-1.5">
                  {[
                    { label: '3x3', r: 3, c: 3 },
                    { label: '5x5', r: 5, c: 5 },
                    { label: '5x10', r: 5, c: 10 },
                    { label: '10x10', r: 10, c: 10 },
                    { label: '15x15', r: 15, c: 15 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => {
                        setRows(preset.r);
                        setCols(preset.c);
                      }}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border transition ${
                        rows === preset.r && cols === preset.c
                          ? 'bg-emerald-950 border-emerald-500 text-emerald-200'
                          : 'bg-valheim-dark border-valheim-border/60 text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Rows */}
                <div>
                  <div className="flex justify-between text-xs text-gray-300 mb-1">
                    <span>Rows (Depth):</span>
                    <span className="font-mono font-bold text-emerald-300">{rows}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={25}
                    value={rows}
                    onChange={(e) => setRows(parseInt(e.target.value) || 1)}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Columns */}
                <div>
                  <div className="flex justify-between text-xs text-gray-300 mb-1">
                    <span>Columns (Width):</span>
                    <span className="font-mono font-bold text-emerald-300">{cols}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={25}
                    value={cols}
                    onChange={(e) => setCols(parseInt(e.target.value) || 1)}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Spacing Slider */}
              <div className="pt-2 border-t border-valheim-border/60">
                <div className="flex items-center justify-between text-xs text-gray-300 mb-1">
                  <span>Plant Spacing:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-emerald-300">{spacing.toFixed(2)}m</span>
                    {spacing !== selectedCrop.defaultSpacing && (
                      <button
                        onClick={() => setSpacing(selectedCrop.defaultSpacing)}
                        className="text-[10px] text-valheim-gold hover:underline"
                      >
                        Reset ({selectedCrop.defaultSpacing}m)
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={4.5}
                  step={0.05}
                  value={spacing}
                  onChange={(e) => setSpacing(parseFloat(e.target.value) || 0.85)}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
                  <span>0.5m (Dense)</span>
                  <span>Rec: {selectedCrop.defaultSpacing}m</span>
                  <span>4.5m (Sparse / Trees)</span>
                </div>
              </div>
            </div>

            {/* 2D Field Visualizer Canvas */}
            <div className="bg-valheim-dark border border-valheim-border/90 rounded-lg p-4 flex flex-col items-center justify-center relative min-h-[220px]">
              <div className="absolute top-2 left-3 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                Field Blueprint ({fieldWidth}m × {fieldHeight}m)
              </div>
              <div className="absolute top-2 right-3 text-[10px] font-mono text-emerald-400">
                {totalCropsCount} Total Crops
              </div>

              {/* Render dynamic mini grid dots */}
              <div
                className="grid gap-1.5 p-4 max-w-full max-h-[160px] overflow-auto items-center justify-center"
                style={{
                  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                  width: `${Math.min(360, Math.max(120, cols * 24))}px`,
                }}
              >
                {Array.from({ length: Math.min(100, totalCropsCount) }).map((_, i) => (
                  <div
                    key={i}
                    className="w-4 h-4 rounded-full bg-emerald-900/70 border border-emerald-500/80 flex items-center justify-center shadow-sm"
                    title={`Plant #${i + 1}`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                  </div>
                ))}
              </div>

              {totalCropsCount > 100 && (
                <div className="text-[10px] text-gray-500 mt-1">
                  (Preview truncated to first 100 plants; full {totalCropsCount} will be planted)
                </div>
              )}
            </div>

            {/* Planting Options & Cheats */}
            <div className="bg-valheim-panel border border-valheim-border/90 rounded-lg p-4 space-y-3 text-xs">
              <label className="text-[10px] uppercase tracking-wider font-bold text-valheim-gold block">
                Field Settings & Automation
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Auto Cultivate */}
                <label className="flex items-start gap-2.5 p-2 rounded bg-valheim-dark/70 border border-valheim-border/60 cursor-pointer hover:border-emerald-500/50 transition">
                  <input
                    type="checkbox"
                    checked={autoCultivate}
                    onChange={(e) => setAutoCultivate(e.target.checked)}
                    className="mt-0.5 accent-emerald-500 rounded"
                  />
                  <div>
                    <span className="font-semibold text-gray-200 block">Auto-Cultivate Soil</span>
                    <span className="text-[11px] text-gray-400">
                      Tills and prepares farmland under the entire grid automatically.
                    </span>
                  </div>
                </label>

                {/* Consume Seeds */}
                <label className="flex items-start gap-2.5 p-2 rounded bg-valheim-dark/70 border border-valheim-border/60 cursor-pointer hover:border-emerald-500/50 transition">
                  <input
                    type="checkbox"
                    checked={consumeSeeds}
                    onChange={(e) => setConsumeSeeds(e.target.checked)}
                    className="mt-0.5 accent-emerald-500 rounded"
                  />
                  <div>
                    <span className="font-semibold text-gray-200 block">
                      Consume Seeds {isFreeBuildActive && '(Bypassed)'}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {isFreeBuildActive
                        ? 'Free Build / No Cost is ON. 0 seeds will be consumed!'
                        : 'Deducts 1 seed per plant from your inventory.'}
                    </span>
                  </div>
                </label>

                {/* Instant Mature */}
                <label className="flex items-start gap-2.5 p-2 rounded bg-valheim-dark/70 border border-valheim-border/60 cursor-pointer hover:border-emerald-500/50 transition sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={instantMature}
                    onChange={(e) => setInstantMature(e.target.checked)}
                    className="mt-0.5 accent-emerald-500 rounded"
                  />
                  <div>
                    <span className="font-semibold text-amber-300 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Instant Maturation (Creative / Instant Grow)</span>
                    </span>
                    <span className="text-[11px] text-gray-400">
                      Force plants to instantly mature upon placement so they are ready for harvest immediately.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Missing Seeds Helper Banner */}
            {!isFreeBuildActive && consumeSeeds && missingSeeds > 0 && (
              <div className="p-3 rounded-lg bg-amber-950/60 border border-amber-600/60 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    You need <strong className="text-amber-200 font-mono">{missingSeeds}</strong> more{' '}
                    <strong>{selectedCrop.seedItem}</strong> to complete this {rows}x{cols} grid.
                  </span>
                </div>
                <button
                  onClick={handleSpawnSeeds}
                  disabled={isSpawningSeeds || !liveStatus?.inGame}
                  className="flex items-center gap-1 px-3 py-1 rounded bg-amber-900/80 hover:bg-amber-800 border border-amber-500 text-amber-100 font-valheim font-semibold text-xs whitespace-nowrap transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isSpawningSeeds ? 'Spawning...' : `Spawn ${missingSeeds} Seeds`}</span>
                </button>
              </div>
            )}

            {/* Bottom Actions Bar */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleUndo}
                  disabled={isUndoing || !liveStatus?.inGame}
                  className="flex items-center gap-1.5 px-3 py-2 rounded bg-valheim-dark hover:bg-valheim-panel border border-valheim-border hover:border-valheim-brass text-gray-300 font-valheim text-xs transition disabled:opacity-50"
                  title="Undo the last planted grid (In-game hotkey: [F8])"
                >
                  <Undo2 className="w-3.5 h-3.5 text-valheim-gold" />
                  <span>{isUndoing ? 'Undoing...' : 'Undo Grid [F8]'}</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded bg-valheim-dark border border-valheim-border hover:border-gray-500 text-gray-300 text-xs font-valheim transition"
                >
                  Cancel
                </button>

                <button
                  onClick={handlePlantGrid}
                  disabled={isPlanting || !liveStatus?.inGame}
                  className="flex items-center gap-2 px-5 py-2 rounded bg-emerald-900/90 hover:bg-emerald-800 border border-emerald-400 text-emerald-100 font-valheim font-bold text-sm shadow-[0_0_15px_rgba(16,185,129,0.35)] transition active:scale-95 disabled:opacity-50"
                >
                  <Sprout className={`w-4 h-4 text-emerald-300 ${isPlanting ? 'animate-bounce' : ''}`} />
                  <span>{isPlanting ? 'Planting Crops...' : `Plant ${totalCropsCount} ${selectedCrop.name}`}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
