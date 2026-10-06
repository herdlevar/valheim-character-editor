import React, { useState, useEffect } from 'react';
import { parseFchFile, serializeFchFile, setPlayerLocationToBed, setPlayerLocationToDeath, setPlayerLocationToCoords, ValheimCharacter, InventoryItem } from './engine/fchParser';
import { HeaderBar, SteamCharacterInfo } from './components/HeaderBar';
import { CharacterOverview } from './components/CharacterOverview';
import { CharacterPaperDoll } from './components/CharacterPaperDoll';
import { InventoryGrid } from './components/InventoryGrid';
import { ItemSpawnerModal } from './components/ItemSpawnerModal';
import { ItemEditModal } from './components/ItemEditModal';
import { SteamPathModal } from './components/SteamPathModal';
import { LoadoutModal } from './components/LoadoutModal';
import { WorldMapModal } from './components/WorldMapModal';
import { AutoBuilderModal } from './components/AutoBuilderModal';
import { GridPlanterModal } from './components/GridPlanterModal';
import { CatalogItem, LoadoutConfigItem, LoadoutProfile } from './types';
import { getItemByHash, getItemByPrefab, getItemMaxDurability } from './data/items';
import { DEFAULT_LOADOUT_PROFILES } from './data/defaultLoadouts';
import { copyToClipboard } from './utils/clipboard';
import { ShieldCheck, Sparkles, Upload, AlertCircle, RefreshCw } from 'lucide-react';
import {
  LiveGameStatus,
  checkLiveGameStatus,
  applyLiveLoadout,
  setLiveBossBuff,
  setLiveGodMode,
  setLiveNoCostBuilding,
  setLiveGhostMode,
  setLiveFlyMode,
  applyLiveRested,
  teleportLive,
  spawnLiveItem,
  repairAllLive,
  getLiveInventory,
  updateLiveItem,
  deleteLiveItem,
  moveLiveItem,
  setLiveInventory,
} from './services/liveBridge';

export const App: React.FC = () => {
  const [character, setCharacter] = useState<ValheimCharacter | null>(null);
  const [gridRows, setGridRows] = useState(4);
  const [liveStatus, setLiveStatus] = useState<LiveGameStatus | null>(null);
  const [isGodMode, setIsGodMode] = useState<boolean>(false);
  const [isNoCostBuilding, setIsNoCostBuilding] = useState<boolean>(false);
  const [isGhostMode, setIsGhostMode] = useState<boolean>(false);
  const [isFlyMode, setIsFlyMode] = useState<boolean>(false);
  const [isRested, setIsRested] = useState<boolean>(false);
  const [restedTime, setRestedTime] = useState<number>(0);
  const [isWorldMapOpen, setIsWorldMapOpen] = useState<boolean>(false);
  const [isAutoBuilderOpen, setIsAutoBuilderOpen] = useState<boolean>(false);
  const [isGridPlanterOpen, setIsGridPlanterOpen] = useState<boolean>(false);
  const [originalBackupBytes, setOriginalBackupBytes] = useState<Uint8Array | null>(null);
  const [originalFileName, setOriginalFileName] = useState<string>('character.fch');

  // Sync godMode, noPlacementCost, ghostMode, flyMode & rested state whenever liveStatus is updated
  useEffect(() => {
    if (liveStatus?.godMode !== undefined) {
      setIsGodMode(liveStatus.godMode);
    }
    if (liveStatus?.noPlacementCost !== undefined) {
      setIsNoCostBuilding(liveStatus.noPlacementCost);
    }
    if (liveStatus?.ghostMode !== undefined) {
      setIsGhostMode(liveStatus.ghostMode);
    }
    if (liveStatus?.flyMode !== undefined) {
      setIsFlyMode(liveStatus.flyMode);
    }
    if (liveStatus?.isRested !== undefined) {
      setIsRested(liveStatus.isRested);
    }
    if (liveStatus?.restedTime !== undefined) {
      setRestedTime(liveStatus.restedTime);
    }
  }, [liveStatus]);

  // Poll live game status every 3.5 seconds
  useEffect(() => {
    let isMounted = true;
    const pollStatus = async () => {
      try {
        const status = await checkLiveGameStatus();
        if (isMounted) setLiveStatus(status);
      } catch {
        if (isMounted) setLiveStatus(null);
      }
    };

    pollStatus();
    const timer = setInterval(pollStatus, 3500);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  const [steamCharacters, setSteamCharacters] = useState<SteamCharacterInfo[]>([]);
  const [steamDir, setSteamDir] = useState<string>('');
  const [isSavingToGame, setIsSavingToGame] = useState(false);

  const [selectedItemForEdit, setSelectedItemForEdit] = useState<InventoryItem | null>(null);
  const [isSpawnerOpen, setIsSpawnerOpen] = useState(false);
  const [spawnerTargetSlot, setSpawnerTargetSlot] = useState<{ x: number; y: number } | null>(null);
  const [isSteamPathOpen, setIsSteamPathOpen] = useState(false);
  const [isLoadoutOpen, setIsLoadoutOpen] = useState(false);

  // Multiple Named Loadout Profiles
  const [loadoutProfiles, setLoadoutProfiles] = useState<LoadoutProfile[]>(() => {
    try {
      const savedProfiles = localStorage.getItem('valheimLoadoutProfiles');
      if (savedProfiles) {
        const parsed = JSON.parse(savedProfiles);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      // Migrate legacy single loadout if exists
      const legacySaved = localStorage.getItem('valheimLoadout');
      if (legacySaved) {
        const parsedLegacy = JSON.parse(legacySaved);
        if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
          return [
            {
              id: 'my_custom_loadout',
              name: 'My Custom Loadout',
              description: 'Migrated from previous loadout setup.',
              items: parsedLegacy,
            },
            ...DEFAULT_LOADOUT_PROFILES,
          ];
        }
      }
      return DEFAULT_LOADOUT_PROFILES;
    } catch {
      return DEFAULT_LOADOUT_PROFILES;
    }
  });

  const [activeProfileId, setActiveProfileId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem('valheimActiveLoadoutId');
      return savedId || 'melee_berserker';
    } catch {
      return 'melee_berserker';
    }
  });

  const activeLoadout =
    loadoutProfiles.find((p) => p.id === activeProfileId) ||
    loadoutProfiles[0] ||
    DEFAULT_LOADOUT_PROFILES[0];

  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Show auto-expiring toast notification
  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Refresh Steam character list from local disk (Electron) or local server
  const refreshSteamCharacters = async (): Promise<SteamCharacterInfo[]> => {
    try {
      if (window.electronAPI?.isElectron) {
        const data = await window.electronAPI.listCharacters();
        const chars = data.characters || [];
        setSteamCharacters(chars);
        setSteamDir(data.dir || '');
        return chars;
      }

      const res = await fetch('/api/list-characters');
      if (res.ok) {
        const data = await res.json();
        const chars = data.characters || [];
        setSteamCharacters(chars);
        setSteamDir(data.dir || '');
        return chars;
      }
    } catch (err) {
      console.warn('Could not query Steam characters:', err);
    }
    return [];
  };

  // Load Steam character directly from PC
  const handleLoadSteamCharacter = async (filename: string) => {
    try {
      showToast(`Loading character ${filename}...`, 'info');
      let bytes: Uint8Array;

      if (window.electronAPI?.isElectron) {
        const dataBase64 = await window.electronAPI.loadCharacter(filename);
        const binaryStr = atob(dataBase64);
        bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
      } else {
        const res = await fetch(`/api/load-character?file=${encodeURIComponent(filename)}`);
        if (!res.ok) throw new Error(`Could not load character file: ${res.statusText}`);
        const arrayBuffer = await res.arrayBuffer();
        bytes = new Uint8Array(arrayBuffer);
      }

      const parsed = await parseFchFile(bytes);
      for (const item of parsed.items) {
        const cat = getItemByHash(item.hash);
        if (cat) item.prefab = cat.prefab;
      }

      const maxRow = parsed.items.reduce((max, item) => Math.max(max, item.gridY + 1), 4);
      setGridRows(Math.min(6, Math.max(4, maxRow)));
      setCharacter(parsed);
      setOriginalBackupBytes(bytes);
      setOriginalFileName(filename);
      showToast(`Loaded ${parsed.playerName} from ${filename}!`, 'success');
    } catch (e: any) {
      console.error(e);
      showToast(`Failed to load Steam character: ${e.message}`, 'error');
    }
  };

  // Initialize: attempt to load from local Steam folder first, fallback to demo knut.fch
  useEffect(() => {
    const init = async () => {
      const chars = await refreshSteamCharacters();
      if (chars && chars.length > 0) {
        // Find most recently modified character, default to knut.fch if available
        const knutChar = chars.find((c) => c.filename.toLowerCase() === 'knut.fch');
        const target = knutChar || [...chars].sort((a, b) => b.modified - a.modified)[0];
        await handleLoadSteamCharacter(target.filename);
      } else {
        await loadSampleSave('knut.fch');
      }
    };
    init();
  }, []);

  const loadSampleSave = async (filename: string) => {
    try {
      showToast(`Loading demo save ${filename}...`, 'info');
      const res = await fetch(`/samples/${filename}`);
      if (!res.ok) throw new Error(`Could not fetch sample /samples/${filename}`);
      const arrayBuffer = await res.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      const parsed = await parseFchFile(bytes);
      // Map item prefabs from database
      for (const item of parsed.items) {
        const cat = getItemByHash(item.hash);
        if (cat) item.prefab = cat.prefab;
      }

      const maxRow = parsed.items.reduce((max, item) => Math.max(max, item.gridY + 1), 4);
      setGridRows(Math.min(6, Math.max(4, maxRow)));
      setCharacter(parsed);
      setOriginalBackupBytes(bytes);
      setOriginalFileName(filename);
      showToast(`Successfully loaded character ${parsed.playerName}!`, 'success');
    } catch (e: any) {
      console.error(e);
      showToast(`Failed to load ${filename}: ${e.message}`, 'error');
    }
  };

  // Smart file picker: uses native Electron file dialog or browser fallback
  const handleTriggerUpload = async () => {
    if (window.electronAPI?.isElectron) {
      try {
        const res = await window.electronAPI.browseFile();
        if (res.canceled || !res.dataBase64 || !res.filename) return;

        const binaryStr = atob(res.dataBase64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        const parsed = await parseFchFile(bytes);
        for (const item of parsed.items) {
          const cat = getItemByHash(item.hash);
          if (cat) item.prefab = cat.prefab;
        }

        const maxRow = parsed.items.reduce((max, item) => Math.max(max, item.gridY + 1), 4);
      setGridRows(Math.min(6, Math.max(4, maxRow)));
      setCharacter(parsed);
        setOriginalBackupBytes(bytes);
        setOriginalFileName(res.filename);
        showToast(`Loaded ${parsed.playerName} from ${res.filename}!`, 'success');
        return;
      } catch (err: any) {
        showToast(`Could not open file: ${err.message}`, 'error');
        return;
      }
    }

    const steamCloudPath = 'C:\\Program Files (x86)\\Steam\\userdata\\1622853\\892970\\remote\\characters';
    const copied = await copyToClipboard(steamCloudPath);
    if (copied) {
      showToast('📋 Steam Cloud save path copied to clipboard! (Ctrl+V in file dialog)', 'info');
    }

    if ('showOpenFilePicker' in window) {
      try {
        const [fileHandle] = await (window as any).showOpenFilePicker({
          id: 'valheim-steam-cloud-saves',
          types: [
            {
              description: 'Valheim Character Save (*.fch)',
              accept: {
                'application/octet-stream': ['.fch'],
              },
            },
          ],
          excludeAcceptAllOption: false,
          multiple: false,
        });
        const file = await fileHandle.getFile();
        await handleFileUpload(file);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return; // User cancelled
      }
    }

    // Fallback to standard input
    const input = document.querySelector('header input[type="file"]') as HTMLInputElement;
    input?.click();
  };

  const handleFileUpload = async (file: File) => {
    try {
      showToast(`Reading ${file.name}...`, 'info');
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      const parsed = await parseFchFile(bytes);
      for (const item of parsed.items) {
        const cat = getItemByHash(item.hash);
        if (cat) item.prefab = cat.prefab;
      }

      const maxRow = parsed.items.reduce((max, item) => Math.max(max, item.gridY + 1), 4);
      setGridRows(Math.min(6, Math.max(4, maxRow)));
      setCharacter(parsed);
      setOriginalBackupBytes(bytes);
      setOriginalFileName(file.name);
      showToast(`Loaded ${parsed.playerName} from ${file.name}! Initial safety backup saved.`, 'success');
    } catch (e: any) {
      console.error(e);
      showToast(`Failed to parse file: ${e.message}`, 'error');
    }
  };

  // Find first empty slot in 8x4 grid
  const findFirstEmptySlot = (): { x: number; y: number } | null => {
    if (!character) return null;
    const occupied = new Set(character.items.map((i) => `${i.gridX},${i.gridY}`));
    for (let y = 0; y < gridRows; y++) {
      for (let x = 0; x < 8; x++) {
        if (!occupied.has(`${x},${y}`)) {
          return { x, y };
        }
      }
    }
    return null;
  };

  // Spawns new item into inventory
  const handleSpawnItem = (
    catalogItem: CatalogItem,
    options: { stack: number; quality: number },
    targetSlot?: { x: number; y: number }
  ) => {
    if (!character) return;

    let slot = targetSlot;
    if (!slot) {
      slot = findFirstEmptySlot() || undefined;
    }

    if (!slot) {
      showToast('Inventory is full! Delete an item or move an item first.', 'error');
      return;
    }

    // Check if slot is occupied; if so, find another or prompt
    const isOccupied = character.items.some((i) => i.gridX === slot!.x && i.gridY === slot!.y);
    if (isOccupied) {
      const altSlot = findFirstEmptySlot();
      if (!altSlot) {
        showToast('Inventory is full! Cannot add item.', 'error');
        return;
      }
      slot = altSlot;
    }

    const spawnMaxDur = getItemMaxDurability(
      { hash: catalogItem.hash, quality: options.quality },
      catalogItem
    );

    const newItem: InventoryItem = {
      id: `spawn-${catalogItem.prefab}-${Date.now()}-${Math.random()}`,
      prefab: catalogItem.prefab,
      hash: catalogItem.hash,
      gridX: slot.x,
      gridY: slot.y,
      stack: options.stack,
      durability: spawnMaxDur,
      maxDurability: spawnMaxDur,
      quality: options.quality,
      variant: 0,
      equipped: false,
      pickedUp: true,
      crafterID: 0n,
      crafterName: '',
      customData: {},
      cheated: 0, // Keep 0 to protect achievement eligibility
      worldLevel: 0,
    };

    setCharacter({
      ...character,
      items: [...character.items, newItem],
    });

    if (liveStatus?.inGame) {
      spawnLiveItem(catalogItem.prefab, options.stack, options.quality);
      showToast(`⚡ Spawned ${catalogItem.name} (x${options.stack}) live into game and save!`, 'success');
    } else {
      showToast(`Added ${catalogItem.name} (x${options.stack}) to slot (${slot.x + 1}, ${slot.y + 1})!`, 'success');
    }
  };

  // Delete item from inventory
  const handleDeleteItem = async (itemId: string) => {
    if (!character) return;
    const deleted = character.items.find((i) => i.id === itemId);
    const cat = deleted ? getItemByHash(deleted.hash) : undefined;
    setCharacter({
      ...character,
      items: character.items.filter((i) => i.id !== itemId),
    });

    if (liveStatus?.inGame && deleted) {
      await deleteLiveItem({
        prefab: deleted.prefab,
        gridX: deleted.gridX,
        gridY: deleted.gridY,
      });
      showToast(`⚡ Removed ${cat?.name || 'item'} live in-game!`, 'info');
    } else {
      showToast(`Deleted ${cat?.name || 'item'} from inventory.`, 'info');
    }
  };

  // Update item in inventory (e.g. stack, quality, durability)
  const handleUpdateItem = async (updatedItem: InventoryItem) => {
    if (!character) return;
    const cat = getItemByHash(updatedItem.hash);
    setCharacter({
      ...character,
      items: character.items.map((i) => (i.id === updatedItem.id ? updatedItem : i)),
    });

    if (liveStatus?.inGame) {
      const res = await updateLiveItem({
        prefab: updatedItem.prefab,
        gridX: updatedItem.gridX,
        gridY: updatedItem.gridY,
        stack: updatedItem.stack,
        quality: updatedItem.quality,
        durability: updatedItem.durability,
      });

      if (res.success) {
        showToast(`⚡ Updated ${cat?.name || updatedItem.prefab} (x${updatedItem.stack}) live in-game!`, 'success');
      } else {
        showToast(`Updated in editor (Live notice: ${res.error || 'Check game'})`, 'info');
      }
    } else {
      showToast(`Saved changes for ${cat?.name || 'item'}.`, 'success');
    }
  };

  // Move or swap items between slots
  const handleMoveItem = async (sourceItem: InventoryItem, targetSlot: { x: number; y: number }) => {
    if (!character) return;
    const targetItem = character.items.find(
      (i) => i.gridX === targetSlot.x && i.gridY === targetSlot.y && i.id !== sourceItem.id
    );

    let newItems = [...character.items];
    if (targetItem) {
      // Swap slots
      newItems = newItems.map((it) => {
        if (it.id === sourceItem.id) {
          return { ...it, gridX: targetSlot.x, gridY: targetSlot.y };
        }
        if (it.id === targetItem.id) {
          return { ...it, gridX: sourceItem.gridX, gridY: sourceItem.gridY };
        }
        return it;
      });
      showToast(`Swapped item positions.`, 'info');
    } else {
      // Simple move
      newItems = newItems.map((it) => {
        if (it.id === sourceItem.id) {
          return { ...it, gridX: targetSlot.x, gridY: targetSlot.y };
        }
        return it;
      });
    }

    setCharacter({
      ...character,
      items: newItems,
    });

    if (liveStatus?.inGame) {
      await moveLiveItem(sourceItem.gridX, sourceItem.gridY, targetSlot.x, targetSlot.y);
    }
  };

  // Unequip item
  const handleUnequipItem = (item: InventoryItem) => {
    if (!character) return;
    const catalog = getItemByHash(item.hash);
    setCharacter({
      ...character,
      items: character.items.map((it) => (it.id === item.id ? { ...it, equipped: false } : it)),
    });
    showToast(`Unequipped ${catalog?.name || 'item'}.`, 'info');
  };

  // Set player world login location to bed spawn point
  const handleSetLocationToBed = () => {
    if (!character) return;
    const { character: updatedChar, count, spawnPoint } = setPlayerLocationToBed(character);
    if (count === 0) {
      showToast('No claimed bed spawn point found in this save file.', 'info');
      return;
    }
    setCharacter(updatedChar);
    const coordStr = spawnPoint
      ? `(${spawnPoint[0].toFixed(1)}, ${spawnPoint[1].toFixed(1)}, ${spawnPoint[2].toFixed(1)})`
      : '';
    showToast(
      `Login location set to bed ${coordStr}! When you log in, you will appear safely at your bed.`,
      'success'
    );
  };

  // Set player world login location to last death marker / tombstone
  const handleSetLocationToDeath = () => {
    if (!character) return;
    const { character: updatedChar, count, deathPoint } = setPlayerLocationToDeath(character);
    if (count === 0) {
      showToast('No death marker / tombstone location found in this save file.', 'info');
      return;
    }
    setCharacter(updatedChar);
    const coordStr = deathPoint
      ? `(${deathPoint[0].toFixed(1)}, ${deathPoint[1].toFixed(1)}, ${deathPoint[2].toFixed(1)})`
      : '';
    showToast(
      `Login location set to death marker ${coordStr}! Remember to save changes so they take effect.`,
      'success'
    );
  };

  // Toggle in-game invincibility (God Mode)
  const handleToggleGodMode = async () => {
    if (!liveStatus?.inGame) {
      showToast('Invincibility requires an active in-game character connected via Live Bridge.', 'info');
      return;
    }
    const targetState = !isGodMode;
    setIsGodMode(targetState);
    const res = await setLiveGodMode(targetState);
    if (res.success) {
      showToast(
        targetState
          ? '🛡️ Invincibility (God Mode) ACTIVATED! You cannot take damage in Valheim.'
          : '🛡️ Invincibility (God Mode) DEACTIVATED. Standard damage restored.',
        'success'
      );
      if (res.godMode !== undefined) {
        setIsGodMode(res.godMode);
      }
    } else {
      setIsGodMode(!targetState); // Revert on failure
      showToast(`Failed to toggle Invincibility: ${res.error || 'Check game'}`, 'error');
    }
  };

  // Repair all items in inventory and equipment to 100%
  const handleRepairAll = () => {
    if (!character) return;
    let repairedCount = 0;
    const updatedItems = character.items.map((item) => {
      const catalog = getItemByHash(item.hash);
      const isRepairableCategory =
        catalog?.category === 'weapons' ||
        catalog?.category === 'armor' ||
        catalog?.category === 'shields' ||
        catalog?.category === 'tools';

      if (!isRepairableCategory && (!catalog || catalog.maxDurability <= 0)) {
        return item;
      }

      const maxDur = getItemMaxDurability(item, catalog);
      // If durability is below max (with floating tolerance)
      if (item.durability < maxDur - 0.05) {
        repairedCount++;
        return {
          ...item,
          durability: maxDur,
        };
      }
      return item;
    });

    setCharacter({
      ...character,
      items: updatedItems,
    });

    if (liveStatus?.inGame) {
      repairAllLive();
      showToast(`⚡ In-Game and save items repaired to 100% durability!`, 'success');
    } else {
      showToast(
        repairedCount > 0
          ? `Repaired ${repairedCount} item${repairedCount === 1 ? '' : 's'} to 100% durability!`
          : 'All weapons, armor, and tools are already at 100% durability!',
        'success'
      );
    }
  };

  // Toggle in-game No-Cost Building & Crafting
  const handleToggleNoCostBuilding = async () => {
    if (!liveStatus?.inGame) {
      showToast('No-Cost Building requires an active in-game character connected via Live Bridge.', 'info');
      return;
    }
    const targetState = !isNoCostBuilding;
    setIsNoCostBuilding(targetState);
    const res = await setLiveNoCostBuilding(targetState);
    if (res.success) {
      showToast(
        targetState
          ? '🔨 No-Cost Building ACTIVATED! Build and craft with 0 materials in Valheim.'
          : '🔨 No-Cost Building DEACTIVATED. Standard crafting costs restored.',
        'success'
      );
      if (res.noPlacementCost !== undefined) {
        setIsNoCostBuilding(res.noPlacementCost);
      }
    } else {
      setIsNoCostBuilding(!targetState);
      showToast(`Failed to toggle No-Cost Building: ${res.error || 'Check game'}`, 'error');
    }
  };

  // Toggle in-game Ghost Mode (enemies ignore player)
  const handleToggleGhostMode = async () => {
    if (!liveStatus?.inGame) {
      showToast('Ghost Mode requires an active in-game character connected via Live Bridge.', 'info');
      return;
    }
    const targetState = !isGhostMode;
    setIsGhostMode(targetState);
    const res = await setLiveGhostMode(targetState);
    if (res.success) {
      showToast(
        targetState
          ? '👻 Ghost Mode ACTIVATED! Enemies will completely ignore you in Valheim.'
          : '👻 Ghost Mode DEACTIVATED. Standard enemy detection restored.',
        'success'
      );
      if (res.ghostMode !== undefined) {
        setIsGhostMode(res.ghostMode);
      }
    } else {
      setIsGhostMode(!targetState);
      showToast(`Failed to toggle Ghost Mode: ${res.error || 'Check game'}`, 'error');
    }
  };

  // Toggle in-game 3D Fly Mode (No-Clip)
  const handleToggleFlyMode = async () => {
    if (!liveStatus?.inGame) {
      showToast('Fly Mode requires an active in-game character connected via Live Bridge.', 'info');
      return;
    }
    const targetState = !isFlyMode;
    setIsFlyMode(targetState);
    const res = await setLiveFlyMode(targetState, true);
    if (res.success) {
      showToast(
        targetState
          ? '✈ Fly Mode (No-Clip) ACTIVATED! [Space] Up | [Ctrl] Down | [Shift] Fast | [F9] in-game'
          : '✈ Fly Mode DEACTIVATED. Landed safely without fall damage.',
        'success'
      );
      if (res.flyMode !== undefined) {
        setIsFlyMode(res.flyMode);
      }
    } else {
      setIsFlyMode(!targetState);
      showToast(`Failed to toggle Fly Mode: ${res.error || 'Check game'}`, 'error');
    }
  };

  // Apply Instant Rested Buff (25 min - Comfort 18)
  const handleApplyRested = async () => {
    if (!liveStatus?.inGame) {
      showToast('Instant Rested Buff requires an active in-game character connected via Live Bridge.', 'info');
      return;
    }
    const res = await applyLiveRested(1500); // 1500s = 25m
    if (res.success) {
      setIsRested(true);
      setRestedTime(1500);
      showToast('🔥 Rested Buff Applied (25 min - Comfort Level 18)! Double stamina regen & +50% XP.', 'success');
    } else {
      showToast(`Failed to apply Rested Buff: ${res.error || 'Check game'}`, 'error');
    }
  };

  // Set offline custom coordinates in character file
  const handleSetCustomLocation = (x: number, y: number, z: number) => {
    if (!character) return;
    const { character: updatedChar } = setPlayerLocationToCoords(character, x, y, z);
    setCharacter(updatedChar);
  };

  // Save updated loadout profiles list
  const handleSaveLoadoutProfiles = (newProfiles: LoadoutProfile[], activeId?: string) => {
    setLoadoutProfiles(newProfiles);
    localStorage.setItem('valheimLoadoutProfiles', JSON.stringify(newProfiles));
    if (activeId) {
      setActiveProfileId(activeId);
      localStorage.setItem('valheimActiveLoadoutId', activeId);
    }
    showToast('Saved loadout presets!', 'success');
  };

  const handleApplyLoadoutAndSave = async (profileToApply?: LoadoutProfile) => {
    if (!character) return;
    const profile = profileToApply || activeLoadout;
    const itemsToApply = profile?.items || [];

    if (itemsToApply.length === 0) {
      showToast(`Loadout "${profile?.name || 'Current'}" has no items configured!`, 'info');
      setIsLoadoutOpen(true);
      return;
    }

    // Apply associated Guardian Power if specified
    if (profile.bossBuff && profile.bossBuff !== character.guardianPower) {
      setCharacter({ ...character, guardianPower: profile.bossBuff });
      if (liveStatus?.inGame) {
        setLiveBossBuff(profile.bossBuff);
      }
    }

    // If live game is active with BepInEx bridge, push directly into live bags
    if (liveStatus?.inGame) {
      const liveItems = itemsToApply
        .map((c) => {
          const cat = getItemByHash(c.hash);
          return cat ? { prefab: cat.prefab, amount: c.amount, quality: 1 } : null;
        })
        .filter(Boolean) as Array<{ prefab: string; amount: number; quality: number }>;

      try {
        const liveRes = await applyLiveLoadout(liveItems, true);
        if (liveRes.success) {
          showToast(`⚡ Live Loadout "${profile.name}" applied in-game! (${liveRes.addedCount || 0} items added, ${liveRes.repairedCount || 0} repaired)`, 'success');
        }
      } catch (e: any) {
        console.error('Error applying live loadout:', e);
      }
    }

    let newItems = [...character.items];
    let changesMade = false;

    // Helper to find empty slot
    const findEmptySlot = (current: InventoryItem[]) => {
      const occupied = new Set(current.map((i) => `${i.gridX},${i.gridY}`));
      for (let y = 0; y < gridRows; y++) {
        for (let x = 0; x < 8; x++) {
          if (!occupied.has(`${x},${y}`)) return { x, y };
        }
      }
      return null;
    };

    // Apply loadout
    for (const config of itemsToApply) {
      const catalogItem = getItemByHash(config.hash);
      if (!catalogItem) continue;

      const currentTotal = newItems.filter((i) => i.hash === config.hash).reduce((sum, item) => sum + item.stack, 0);
      let needed = config.amount - currentTotal;

      if (needed > 0) {
        changesMade = true;

        // Top off existing stacks
        for (const item of newItems) {
          if (needed <= 0) break;
          if (item.hash === config.hash && item.stack < catalogItem.maxStack) {
            const space = catalogItem.maxStack - item.stack;
            const toAdd = Math.min(space, needed);
            item.stack += toAdd;
            needed -= toAdd;
          }
        }

        // Spawn new items
        while (needed > 0) {
          const emptySlot = findEmptySlot(newItems);
          if (!emptySlot) {
            showToast(`Inventory is full! Could not add all items for "${profile.name}".`, 'info');
            break;
          }

          const amount = Math.min(catalogItem.maxStack, needed);
          const spawnMaxDur = getItemMaxDurability({ hash: catalogItem.hash, quality: 1 }, catalogItem);

          newItems.push({
            id: `spawn-${catalogItem.prefab}-${Date.now()}-${Math.random()}`,
            prefab: catalogItem.prefab,
            hash: catalogItem.hash,
            gridX: emptySlot.x,
            gridY: emptySlot.y,
            stack: amount,
            durability: spawnMaxDur,
            maxDurability: spawnMaxDur,
            quality: 1,
            variant: 0,
            equipped: false,
            pickedUp: true,
            crafterID: 0n,
            crafterName: '',
            customData: {},
            cheated: 0,
            worldLevel: 0,
          });
          needed -= amount;
        }
      }
    }

    // Repair All
    let repairedCount = 0;
    newItems = newItems.map((item) => {
      const catalog = getItemByHash(item.hash);
      const isRepairableCategory =
        catalog?.category === 'weapons' ||
        catalog?.category === 'armor' ||
        catalog?.category === 'shields' ||
        catalog?.category === 'tools';
      if (!isRepairableCategory && (!catalog || catalog.maxDurability <= 0)) return item;

      const maxDur = getItemMaxDurability(item, catalog);
      if (item.durability < maxDur - 0.05) {
        repairedCount++;
        return { ...item, durability: maxDur };
      }
      return item;
    });

    if (changesMade || repairedCount > 0) {
      if (!liveStatus?.inGame) {
        showToast(`Applied "${profile.name}" (Added missing items) & Repaired ${repairedCount} items! Saving...`, 'success');
      }
      const updatedChar = {
        ...character,
        guardianPower: profile.bossBuff || character.guardianPower,
        items: newItems,
      };
      setCharacter(updatedChar);

      // Delay slightly to let React render state, then save
      setTimeout(() => {
        handleSaveToGame(updatedChar);
      }, 100);
    } else {
      if (!liveStatus?.inGame) {
        showToast(`Inventory already matches "${profile.name}" and is fully repaired. Saving...`, 'info');
      }
      handleSaveToGame(character);
    }
  };

  // Sync inventory directly from running Valheim game via BepInEx Live Bridge
  const handleSyncFromGame = async () => {
    if (!liveStatus?.online) {
      showToast(
        'Live Bridge not connected! If Valheim was already running when BepInEx was installed, please restart Valheim once so Windows can load the mod.',
        'info'
      );
      return;
    }

    if (!liveStatus.inGame) {
      showToast(
        'Valheim is running, but you are at the character select menu. Log into your world first to sync live!',
        'info'
      );
      return;
    }

    try {
      const items = await getLiveInventory();
      if (!items || items.length === 0) {
        showToast('Live inventory is empty or could not be read.', 'info');
        return;
      }

      // If no character loaded yet, attempt to find matching Steam save or load demo template
      let baseChar = character;
      if (!baseChar) {
        const matching = steamCharacters.find(
          (sc) => sc.name.toLowerCase() === (liveStatus.playerName || '').toLowerCase()
        );
        if (matching) {
          try {
            await handleLoadSteamCharacter(matching.filename);
            showToast(`Loaded ${matching.name}.fch and synced live items!`, 'success');
            return;
          } catch {}
        }

        try {
          const res = await fetch('./samples/knut.fch');
          if (res.ok) {
            const buf = await res.arrayBuffer();
            baseChar = await parseFchFile(new Uint8Array(buf));
            baseChar.playerName = liveStatus.playerName || 'Viking';
          }
        } catch {}
      }

      if (!baseChar) {
        showToast('Please load a character save file first to act as a template.', 'info');
        return;
      }

      const updatedItems: InventoryItem[] = items.map((li, idx) => {
        const cat = getItemByPrefab(li.prefab);
        return {
          id: `live-${li.prefab}-${idx}-${Date.now()}`,
          prefab: li.prefab,
          hash: cat?.hash || 0,
          gridX: li.gridX,
          gridY: li.gridY,
          stack: li.stack,
          durability: li.durability,
          maxDurability: li.maxDurability,
          quality: li.quality,
          variant: 0,
          equipped: li.equipped,
          pickedUp: true,
          crafterID: 0n,
          crafterName: '',
          customData: {},
          cheated: 0,
          worldLevel: 0,
        };
      });

      const updatedChar = {
        ...baseChar,
        playerName: liveStatus.playerName || baseChar.playerName,
        items: updatedItems,
        guardianPower: liveStatus.guardianPower || baseChar.guardianPower,
        hp: liveStatus.health || baseChar.hp,
        stamina: liveStatus.stamina || baseChar.stamina,
      };

      const maxRow = updatedItems.reduce((max, item) => Math.max(max, item.gridY + 1), 4);
      setGridRows(Math.min(6, Math.max(4, maxRow)));
      setCharacter(updatedChar);
      showToast(`📥 Synced ${updatedItems.length} items from live game (${liveStatus.playerName})!`, 'success');
    } catch (e: any) {
      showToast(`Failed to sync from live game: ${e.message}`, 'error');
    }
  };

  // Download safety backup of initial uploaded file
  const handleDownloadBackup = () => {
    if (!originalBackupBytes) {
      showToast('No original backup available.', 'error');
      return;
    }
    const blob = new Blob([originalBackupBytes as BlobPart], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const base = originalFileName.replace('.fch', '');
    a.href = url;
    a.download = `${base}_safety_backup.fch`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Downloaded safety backup as ${base}_safety_backup.fch!`, 'success');
  };

  // Save directly to the local Steam game folder
  const handleSaveToGame = async (optionalCharOrEvent?: ValheimCharacter | any) => {
    const charToSave = (optionalCharOrEvent && optionalCharOrEvent.items) ? optionalCharOrEvent : character;
    if (!charToSave) return;
    try {
      setIsSavingToGame(true);
      showToast('Packing character save with SHA-512 and saving directly to Valheim...', 'info');
      const serializedBytes = await serializeFchFile(charToSave);

      // Convert Uint8Array to base64 via FileReader
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result as string;
          resolve(res.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(new Blob([serializedBytes as BlobPart]));
      });

      const targetFile = originalFileName.endsWith('.fch') ? originalFileName : `${originalFileName}.fch`;

      let result: { success: boolean; targetPath?: string; backupName?: string; error?: string };

      if (window.electronAPI?.isElectron) {
        result = await window.electronAPI.saveCharacter(targetFile, base64Data);
      } else {
        const res = await fetch('/api/save-character', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: targetFile,
            dataBase64: base64Data,
          }),
        });
        result = await res.json();
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to write save file');
      }

      // If game is live, push inventory into running game memory simultaneously
      if (liveStatus?.inGame) {
        try {
          await setLiveInventory(
            charToSave.items.map((i: InventoryItem) => ({
              prefab: i.prefab,
              stack: i.stack,
              quality: i.quality,
              variant: i.variant,
              durability: i.durability,
              gridX: i.gridX,
              gridY: i.gridY,
              equipped: i.equipped,
            }))
          );
        } catch (err) {
          console.warn('Could not sync full inventory to live game:', err);
        }
      }

      await refreshSteamCharacters();

      const backupMsg = result.backupName ? ` (Auto-backup created: ${result.backupName})` : '';
      if (liveStatus?.inGame) {
        showToast(
          `⚡ Synced live to your active game AND saved to disk!${backupMsg}`,
          'success'
        );
      } else {
        showToast(
          `⚡ Successfully saved directly to Valheim!${backupMsg} Launch Valheim to play with your updated character!`,
          'success'
        );
      }
    } catch (e: any) {
      console.error(e);
      showToast(`Failed to save directly to Valheim: ${e.message}`, 'error');
    } finally {
      setIsSavingToGame(false);
    }
  };

  // Open Steam Cloud save directory in Windows Explorer
  const handleOpenSteamFolder = async () => {
    if (window.electronAPI?.isElectron) {
      try {
        const res = await window.electronAPI.openSteamFolder();
        showToast(`Opened Steam folder in Explorer: ${res.dir}`, 'info');
      } catch (err: any) {
        showToast(`Could not open folder: ${err.message}`, 'error');
      }
    } else {
      setIsSteamPathOpen(true);
    }
  };

  // Save and download modified character .fch to Gaming PC
  const handleDownloadModified = async () => {
    if (!character) return;
    try {
      setIsSaving(true);
      showToast('Repacking character save file with SHA-512 checksum...', 'info');
      const serializedBytes = await serializeFchFile(character);

      const blob = new Blob([serializedBytes as BlobPart], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = originalFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Automatically copy Steam Cloud save folder path to clipboard
      const steamCloudPath = 'C:\\Program Files (x86)\\Steam\\userdata\\1622853\\892970\\remote\\characters';
      const copied = await copyToClipboard(steamCloudPath);
      if (copied) {
        showToast(`Downloaded ${originalFileName}! Steam folder path copied to clipboard.`, 'success');
      } else {
        showToast(`Downloaded ${originalFileName}!`, 'success');
      }
      // Open the save location guide modal to help the user drop it in
      setIsSteamPathOpen(true);
    } catch (e: any) {
      console.error(e);
      showToast(`Failed to serialize character save: ${e.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Drag and drop file directly onto browser window
  const handleWindowDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.fch')) {
      handleFileUpload(file);
    }
  };

  const occupiedSlots = new Set(character?.items.map((i) => `${i.gridX},${i.gridY}`) || []);

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleWindowDrop}
      className="min-h-screen flex flex-col bg-valheim-bg font-sans pb-12"
      style={{
        backgroundImage: 'radial-gradient(ellipse at 50% 0%, #20242a 0%, #111315 70%)',
      }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-2xl border text-sm font-medium ${
              toastMessage.type === 'success'
                ? 'bg-emerald-950 border-emerald-500 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                : toastMessage.type === 'error'
                ? 'bg-red-950 border-red-500 text-red-200'
                : 'bg-valheim-dark border-valheim-gold text-valheim-goldlight'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-valheim-gold" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Top Header Bar */}
      <HeaderBar
        onFileUpload={handleFileUpload}
        onTriggerUpload={handleTriggerUpload}
        onLoadSample={loadSampleSave}
        onLoadSteamCharacter={handleLoadSteamCharacter}
        steamCharacters={steamCharacters}
        steamDir={steamDir}
        onSaveToGame={handleSaveToGame}
        onDownloadModified={handleDownloadModified}
        onDownloadBackup={handleDownloadBackup}
        onOpenSteamPath={() => setIsSteamPathOpen(true)}
        onOpenSteamFolder={handleOpenSteamFolder}
        characterLoaded={!!character}
        characterName={character?.playerName}
        currentFileName={originalFileName}
        isSaving={isSaving}
        isSavingToGame={isSavingToGame}
        onApplyLoadout={handleApplyLoadoutAndSave}
        onOpenLoadoutConfig={() => setIsLoadoutOpen(true)}
        liveStatus={liveStatus}
        onSyncFromGame={handleSyncFromGame}
        isGodMode={isGodMode}
        onToggleGodMode={handleToggleGodMode}
        isNoCostBuilding={isNoCostBuilding}
        onToggleNoCostBuilding={handleToggleNoCostBuilding}
        isGhostMode={isGhostMode}
        onToggleGhostMode={handleToggleGhostMode}
        isFlyMode={isFlyMode}
        onToggleFlyMode={handleToggleFlyMode}
        onOpenWorldMap={() => setIsWorldMapOpen(true)}
        onOpenAutoBuilder={() => setIsAutoBuilderOpen(true)}
        onOpenGridPlanter={() => setIsGridPlanterOpen(true)}
        activeLoadoutName={activeLoadout?.name}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        {character ? (
          <>
            {/* Character Vitals & Stats Card */}
            <CharacterOverview
              character={character}
              onSetLocationToBed={handleSetLocationToBed}
              onSetLocationToDeath={handleSetLocationToDeath}
              onChangeGuardianPower={(power) => {
                setCharacter({ ...character, guardianPower: power });
                if (liveStatus?.inGame) {
                  setLiveBossBuff(power);
                  showToast(`⚡ Live Guardian Power updated to ${power.replace('GP_', '')}!`, 'success');
                }
              }}
              isGodMode={isGodMode}
              onToggleGodMode={handleToggleGodMode}
              isNoCostBuilding={isNoCostBuilding}
              onToggleNoCostBuilding={handleToggleNoCostBuilding}
              isGhostMode={isGhostMode}
              onToggleGhostMode={handleToggleGhostMode}
              isFlyMode={isFlyMode}
              onToggleFlyMode={handleToggleFlyMode}
              isRested={isRested}
              restedTime={restedTime}
              onApplyRested={handleApplyRested}
              onOpenWorldMap={() => setIsWorldMapOpen(true)}
              onOpenAutoBuilder={() => setIsAutoBuilderOpen(true)}
              onOpenGridPlanter={() => setIsGridPlanterOpen(true)}
            />

            {/* Two-Column Grid: Equipment Paper Doll (Left) & 8x4 Inventory Grid (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Equipment Paper Doll */}
              <div className="lg:col-span-5">
                <CharacterPaperDoll
                  appearance={character.appearance}
                  items={character.items}
                  playerName={character.playerName}
                  onSelectItem={(item) => setSelectedItemForEdit(item)}
                  onUnequipItem={handleUnequipItem}
                />
              </div>

              {/* Right Column: Inventory Grid */}
              <div className="lg:col-span-7">
                <InventoryGrid
                  items={character.items}
                  gridRows={gridRows}
                  onGridRowsChange={setGridRows}
                  onSelectItem={(item) => setSelectedItemForEdit(item)}
                  onOpenSpawner={(slot) => {
                    setSpawnerTargetSlot(slot || null);
                    setIsSpawnerOpen(true);
                  }}
                  onMoveItem={handleMoveItem}
                  onRepairAll={handleRepairAll}
                />
              </div>
            </div>
          </>
        ) : (
          /* Empty State / Upload Prompt */
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center my-12 border-2 border-dashed border-valheim-border/80 rounded-2xl bg-valheim-dark/40 max-w-2xl mx-auto">
            <img
              src="./ui/walknut_bw.png"
              alt="Valheim"
              className="w-16 h-16 opacity-50 mb-4 invert"
            />
            <h3 className="font-valheim font-bold text-valheim-gold text-2xl tracking-wide mb-2">
              Upload Valheim Character Save (.fch)
            </h3>
            <p className="text-sm text-gray-400 max-w-md mb-6">
              Drag and drop your character save file anywhere on this page, or click below to browse.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={handleSyncFromGame}
                className="flex items-center gap-2 px-5 py-2.5 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/80 text-sm text-emerald-200 font-valheim font-semibold transition shadow hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] active:scale-95"
              >
                <RefreshCw className="w-4 h-4 text-emerald-400" />
                <span>{liveStatus?.inGame ? `Sync Live (${liveStatus.playerName})` : 'Sync from Live Game'}</span>
              </button>
              <button
                onClick={() => loadSampleSave('knut.fch')}
                className="px-4 py-2.5 rounded bg-valheim-panel hover:bg-valheim-slothover border border-valheim-border text-sm text-gray-200 font-valheim font-semibold transition"
              >
                Load Demo (Knut.fch)
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Item Spawner Modal */}
      <ItemSpawnerModal
        isOpen={isSpawnerOpen}
        onClose={() => {
          setIsSpawnerOpen(false);
          setSpawnerTargetSlot(null);
        }}
        onSpawnItem={handleSpawnItem}
        targetSlot={spawnerTargetSlot}
      />

      {/* Item Edit Modal */}
      <ItemEditModal
        item={selectedItemForEdit}
        isOpen={!!selectedItemForEdit}
        onClose={() => setSelectedItemForEdit(null)}
        onUpdateItem={handleUpdateItem}
        onDeleteItem={handleDeleteItem}
        onMoveItem={handleMoveItem}
        occupiedSlots={occupiedSlots}
      />

      {/* Loadout Presets & Config Modal */}
      <LoadoutModal
        isOpen={isLoadoutOpen}
        onClose={() => setIsLoadoutOpen(false)}
        profiles={loadoutProfiles}
        activeProfileId={activeProfileId}
        onSelectProfile={(id) => {
          setActiveProfileId(id);
          localStorage.setItem('valheimActiveLoadoutId', id);
        }}
        onSaveProfiles={handleSaveLoadoutProfiles}
        onApplyProfile={(profile) => handleApplyLoadoutAndSave(profile)}
        characterItems={character?.items}
      />

      {/* Steam Directory Helper Modal */}
      <SteamPathModal
        isOpen={isSteamPathOpen}
        onClose={() => setIsSteamPathOpen(false)}
      />

      {/* World Map & Pin Explorer Modal */}
      <WorldMapModal
        isOpen={isWorldMapOpen}
        onClose={() => setIsWorldMapOpen(false)}
        character={character}
        liveStatus={liveStatus}
        onSetLocationToBed={handleSetLocationToBed}
        onSetLocationToDeath={handleSetLocationToDeath}
        onSetCustomLocation={handleSetCustomLocation}
        showToast={showToast}
      />

      {/* Auto-Builder & Blueprints Modal */}
      <AutoBuilderModal
        isOpen={isAutoBuilderOpen}
        onClose={() => setIsAutoBuilderOpen(false)}
        liveStatus={liveStatus}
        isNoCostBuilding={isNoCostBuilding}
        onToggleNoCostBuilding={handleToggleNoCostBuilding}
        isFlyMode={isFlyMode}
        onToggleFlyMode={handleToggleFlyMode}
        showToast={showToast}
      />

      {/* Grid Planter & Farming Suite Modal */}
      <GridPlanterModal
        isOpen={isGridPlanterOpen}
        onClose={() => setIsGridPlanterOpen(false)}
        liveStatus={liveStatus}
        isNoCostBuilding={isNoCostBuilding}
        showToast={showToast}
      />
    </div>
  );
};
