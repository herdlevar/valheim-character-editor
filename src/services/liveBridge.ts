/**
 * Client service to communicate with the in-game ValheimLiveBridge BepInEx plugin.
 */

export interface LiveGameStatus {
  online: boolean;
  inGame: boolean;
  playerName?: string;
  guardianPower?: string;
  guardianCooldown?: number;
  health?: number;
  maxHealth?: number;
  stamina?: number;
  godMode?: boolean;
  oneHitKill?: boolean;
  ghostMode?: boolean;
  flyMode?: boolean;
  noPlacementCost?: boolean;
  isRested?: boolean;
  restedTime?: number;
  itemsCount?: number;
  position?: { x: number; y: number; z: number };
  haveSpawnPoint?: boolean;
  spawnPoint?: { x: number; y: number; z: number };
  haveDeathPoint?: boolean;
  deathPoint?: { x: number; y: number; z: number };
  message?: string;
}

export interface LivePin {
  name: string;
  type: number;
  typeName: string;
  checked: boolean;
  pos: { x: number; y: number; z: number };
}

export interface LiveInventoryItem {
  prefab: string;
  name: string;
  stack: number;
  maxStack: number;
  quality: number;
  durability: number;
  maxDurability: number;
  gridX: number;
  gridY: number;
  equipped: boolean;
}

const BRIDGE_DIRECT_URL = 'http://127.0.0.1:8765';

async function fetchBridge(subPath: string, options: RequestInit = {}): Promise<Response> {
  // First try direct connection to localhost:8765
  try {
    const isImage = subPath.includes('texture');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), isImage ? 15000 : 2500);
    const directRes = await fetch(`${BRIDGE_DIRECT_URL}/api/${subPath}`, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (directRes.ok) return directRes;
  } catch {
    // Fall through to Node proxy
  }

  // Fallback through Express server proxy /api/live/*
  return fetch(`/api/live/${subPath}`, options);
}

export async function checkLiveGameStatus(): Promise<LiveGameStatus> {
  try {
    const res = await fetchBridge('status');
    if (!res.ok) {
      return { online: false, inGame: false };
    }
    return await res.json();
  } catch {
    return { online: false, inGame: false };
  }
}

export async function applyLiveLoadout(
  items: Array<{ prefab: string; amount: number; quality?: number }>,
  repairAll: boolean = true
): Promise<{ success: boolean; addedCount?: number; repairedCount?: number; error?: string }> {
  try {
    const res = await fetchBridge('apply-loadout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, repairAll }),
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to reach in-game mod' };
  }
}

export async function setLiveBossBuff(power: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetchBridge('set-boss-buff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ power }),
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to reach in-game mod' };
  }
}

export async function spawnLiveItem(
  prefab: string,
  amount: number = 1,
  quality: number = 1
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetchBridge('spawn-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefab, amount, quality }),
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to reach in-game mod' };
  }
}

export async function repairAllLive(): Promise<{ success: boolean; repairedCount?: number; error?: string }> {
  try {
    const res = await fetchBridge('repair-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to reach in-game mod' };
  }
}

export async function getLiveInventory(): Promise<LiveInventoryItem[]> {
  try {
    const res = await fetchBridge('inventory');
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function updateLiveItem(options: {
  prefab: string;
  gridX: number;
  gridY: number;
  stack: number;
  quality?: number;
  durability?: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetchBridge('update-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to update live item' };
  }
}

export async function deleteLiveItem(options: {
  prefab: string;
  gridX: number;
  gridY: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetchBridge('delete-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to delete live item' };
  }
}

export async function moveLiveItem(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetchBridge('move-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromX, fromY, toX, toY }),
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to move live item' };
  }
}

export async function setLiveInventory(
  items: Array<{
    prefab: string;
    stack: number;
    quality: number;
    variant: number;
    durability: number;
    gridX: number;
    gridY: number;
    equipped: boolean;
  }>
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const res = await fetchBridge('set-inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to push full inventory' };
  }
}

export async function setLiveGodMode(enabled?: boolean): Promise<{ success: boolean; godMode?: boolean; error?: string }> {
  try {
    const res = await fetchBridge('set-god-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enabled !== undefined ? { enabled } : {}),
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to toggle invincibility' };
  }
}

export async function setLiveOneHitKill(enabled?: boolean): Promise<{ success: boolean; oneHitKill?: boolean; error?: string }> {
  try {
    const res = await fetchBridge('set-one-hit-kill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enabled !== undefined ? { enabled } : {}),
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to toggle one-hit kill' };
  }
}

export async function setLiveNoCostBuilding(enabled?: boolean): Promise<{ success: boolean; noPlacementCost?: boolean; error?: string }> {
  try {
    const res = await fetchBridge('set-no-cost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enabled !== undefined ? { enabled } : {}),
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to toggle no-cost building' };
  }
}

export async function setLiveGhostMode(enabled?: boolean): Promise<{ success: boolean; ghostMode?: boolean; error?: string }> {
  try {
    const res = await fetchBridge('set-ghost-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enabled !== undefined ? { enabled } : {}),
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to toggle ghost mode' };
  }
}

export async function setLiveFlyMode(
  enabled?: boolean,
  noclip: boolean = true
): Promise<{ success: boolean; flyMode?: boolean; noclip?: boolean; error?: string }> {
  try {
    const res = await fetchBridge('set-fly-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enabled !== undefined ? { enabled, noclip } : { noclip }),
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to toggle fly mode' };
  }
}

export async function applyLiveRested(durationSeconds: number = 1500): Promise<{ success: boolean; duration?: number; isRested?: boolean; error?: string }> {
  try {
    const res = await fetchBridge('apply-rested', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration: durationSeconds }),
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to apply rested buff' };
  }
}

export async function teleportLive(x: number, y: number, z: number): Promise<{ success: boolean; x?: number; y?: number; z?: number; error?: string }> {
  try {
    const res = await fetchBridge('teleport', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x, y, z }),
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to teleport player' };
  }
}

export async function getLivePins(): Promise<LivePin[]> {
  try {
    const res = await fetchBridge('pins');
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function getLiveMapTextureBlob(): Promise<Blob | null> {
  try {
    const res = await fetchBridge('map-texture');
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
}

export async function getLiveFogTextureBlob(): Promise<Blob | null> {
  try {
    const res = await fetchBridge('fog-texture');
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
}

export function getMapTextureProxyUrl(): string {
  return '/api/live/map-texture';
}

export interface BlueprintPieceData {
  prefab: string;
  x: number;
  y: number;
  z: number;
  rx?: number;
  ry?: number;
  rz?: number;
  rw?: number;
}

export interface BuildBlueprintOptions {
  name: string;
  pieces: BlueprintPieceData[];
  rotationY?: number;
  heightOffset?: number;
  distanceInFront?: number;
  usePlayerPos?: boolean;
  originX?: number;
  originY?: number;
  originZ?: number;
  autoTerraform?: boolean;
  margin?: number;
}

export interface TerraformOptions {
  armed?: boolean;
  pieces?: BlueprintPieceData[];
  name?: string;
  rotationY?: number;
  heightOffset?: number;
  distanceInFront?: number;
  usePlayerPos?: boolean;
  originX?: number;
  originY?: number;
  originZ?: number;
  radius?: number;
  targetY?: number;
  square?: boolean;
  margin?: number;
}

export async function terraformLive(
  options: TerraformOptions = {}
): Promise<{ success: boolean; zonesModified?: number; error?: string }> {
  try {
    const res = await fetchBridge('terraform', {
      method: 'POST',
      body: JSON.stringify(options),
    });
    if (!res.ok) {
      return { success: false, error: `Live bridge returned ${res.status}` };
    }
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to terraform ground' };
  }
}

export async function buildBlueprintLive(
  options: BuildBlueprintOptions
): Promise<{ success: boolean; placedCount?: number; totalPieces?: number; error?: string }> {
  try {
    const res = await fetchBridge('build-blueprint', {
      method: 'POST',
      body: JSON.stringify(options),
    });
    if (!res.ok) {
      return { success: false, error: `Live bridge returned ${res.status}` };
    }
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to auto-build blueprint' };
  }
}

export async function undoLastBuildLive(): Promise<{ success: boolean; undoneCount?: number; error?: string }> {
  try {
    const res = await fetchBridge('undo-build', {
      method: 'POST',
    });
    if (!res.ok) {
      return { success: false, error: `Live bridge returned ${res.status}` };
    }
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to undo build' };
  }
}

export async function armBlueprintLive(
  options: BuildBlueprintOptions
): Promise<{ success: boolean; name?: string; piecesCount?: number; error?: string }> {
  try {
    const res = await fetchBridge('arm-blueprint', {
      method: 'POST',
      body: JSON.stringify(options),
    });
    if (!res.ok) {
      return { success: false, error: `Live bridge returned ${res.status}` };
    }
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to arm blueprint placement' };
  }
}

export async function disarmBlueprintLive(): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetchBridge('disarm-blueprint', {
      method: 'POST',
    });
    if (!res.ok) {
      return { success: false, error: `Live bridge returned ${res.status}` };
    }
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to disarm blueprint placement' };
  }
}

export interface CaptureBlueprintOptions {
  radius?: number;
  name?: string;
  saveToDisk?: boolean;
  x?: number;
  y?: number;
  z?: number;
}

export interface CaptureBlueprintResult {
  success: boolean;
  name?: string;
  piecesCount?: number;
  radius?: number;
  savedPath?: string;
  pieces?: BlueprintPieceData[];
  pieceCounts?: Record<string, number>;
  rawBlueprint?: string;
  error?: string;
}

export async function captureBlueprintLive(
  options: CaptureBlueprintOptions = {}
): Promise<CaptureBlueprintResult> {
  try {
    const res = await fetchBridge('capture-blueprint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    if (!res.ok) {
      return { success: false, error: `Live bridge returned ${res.status}` };
    }
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to capture blueprint from Valheim' };
  }
}

export async function getBuilderStateLive(): Promise<{
  isArmed: boolean;
  name?: string;
  rotationY?: number;
  heightOffset?: number;
  autoTerraform?: boolean;
} | null> {
  try {
    const res = await fetchBridge('builder-state');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}


export interface PlanBuildStatus {
  installed: boolean;
  blueprintCount: number;
  path: string;
}

export async function getPlanBuildStatusLive(): Promise<PlanBuildStatus | null> {
  try {
    const res = await fetchBridge('planbuild/status');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function syncToPlanBuildLive(payload: {
  name: string;
  author?: string;
  description?: string;
  category?: string;
  rawContent?: string;
  pieces?: BlueprintPieceData[];
}): Promise<{ success: boolean; name?: string; filePath?: string; error?: string }> {
  // 1. Try in-game bridge first (shows center-screen banner in Valheim and reloads PlanBuild)
  try {
    const res = await fetchBridge('planbuild/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) return data;
    }
  } catch {}

  // 2. Fallback to Vite server endpoint (works even if Valheim is closed)
  try {
    const fallbackContent = payload.rawContent || formatPlanBuildFile(payload);
    const res = await fetch('/api/planbuild-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: payload.name, content: fallbackContent }),
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to sync to PlanBuild' };
  }
}

const CANONICAL_PREFAB_MAP: Record<string, string> = {
  // Wood floors
  woodfloor: 'wood_floor',
  piece_woodfloor: 'wood_floor',
  woodfloor2x2: 'wood_floor',
  piece_woodfloor2x2: 'wood_floor',
  wood_floor_2x2: 'wood_floor',
  piece_woodfloor_2x2: 'wood_floor',
  woodfloor1x1: 'wood_floor_1x1',
  piece_woodfloor1x1: 'wood_floor_1x1',
  wood_floor_1x1: 'wood_floor_1x1',
  piece_woodfloor_1x1: 'wood_floor_1x1',
  // Walls
  piece_woodwall: 'woodwall',
  woodwall: 'woodwall',
  wood_wall: 'woodwall',
  piece_woodwallhalf: 'wood_wall_half',
  woodwall_half: 'wood_wall_half',
  woodwallhalf: 'wood_wall_half',
  piece_woodwallquarter: 'wood_wall_quarter',
  woodwall_quarter: 'wood_wall_quarter',
  woodwallquarter: 'wood_wall_quarter',
  piece_woodwallroof: 'wood_wall_roof',
  woodwall_roof: 'wood_wall_roof',
  piece_woodwallroof45: 'wood_wall_roof_45',
  woodwall_roof_45: 'wood_wall_roof_45',
  piece_woodwallrooftop: 'wood_wall_roof_top',
  woodwall_roof_top: 'wood_wall_roof_top',
  piece_woodwallrooftop45: 'wood_wall_roof_top_45',
  woodwall_roof_top_45: 'wood_wall_roof_top_45',
  // Doors & Stairs
  piece_wooddoor: 'wood_door',
  wood_door: 'wood_door',
  wooddoor: 'wood_door',
  piece_woodstair: 'wood_stairs',
  woodstair: 'wood_stairs',
  wood_stairs: 'wood_stairs',
  piece_woodstairs: 'wood_stairs',
  // Roofs 45
  piece_woodroof45: 'wood_roof_45',
  woodroof45: 'wood_roof_45',
  wood_roof_45: 'wood_roof_45',
  roof_wood_45: 'wood_roof_45',
  piece_woodrooftop45: 'wood_roof_top_45',
  woodrooftop45: 'wood_roof_top_45',
  wood_roof_top_45: 'wood_roof_top_45',
  wood_roof_ridge_45: 'wood_roof_top_45',
  roof_wood_ridge_45: 'wood_roof_top_45',
  piece_woodroofocorner45: 'wood_roof_ocorner_45',
  piece_woodrooficorner45: 'wood_roof_icorner_45',
  wood_roof_ocorner_45: 'wood_roof_ocorner_45',
  wood_roof_icorner_45: 'wood_roof_icorner_45',
  // Roofs 26
  piece_woodroof26: 'wood_roof_26',
  woodroof26: 'wood_roof_26',
  wood_roof_26: 'wood_roof_26',
  roof_wood_26: 'wood_roof_26',
  piece_woodrooftop: 'wood_roof_top',
  woodrooftop: 'wood_roof_top',
  wood_roof_top: 'wood_roof_top',
  wood_roof_ridge_26: 'wood_roof_top',
  roof_wood_ridge_26: 'wood_roof_top',
  piece_woodroofocorner: 'wood_roof_ocorner',
  piece_woodrooficorner: 'wood_roof_icorner',
  wood_roof_ocorner: 'wood_roof_ocorner',
  wood_roof_icorner: 'wood_roof_icorner',
  // Beams & Poles
  piece_woodbeam2: 'woodbeam2',
  woodbeam2: 'woodbeam2',
  piece_woodbeam1: 'woodbeam1',
  woodbeam1: 'woodbeam1',
  piece_woodbeam26: 'woodbeam26',
  woodbeam26: 'woodbeam26',
  piece_woodbeam45: 'woodbeam45',
  woodbeam45: 'woodbeam45',
  piece_woodpole: 'woodpole',
  woodpole: 'woodpole',
  piece_woodpole2: 'woodpole2',
  woodpole2: 'woodpole2',
  piece_logbeam4: 'logbeam4',
  logbeam4: 'logbeam4',
  piece_logbeam2: 'logbeam2',
  logbeam2: 'logbeam2',
  piece_logpole4: 'logpole4',
  logpole4: 'logpole4',
  piece_logpole2: 'logpole2',
  logpole2: 'logpole2',
  // Stone
  piece_stonefloor2x2: 'stone_floor_2x2',
  stonefloor2x2: 'stone_floor_2x2',
  stone_floor_2x2: 'stone_floor_2x2',
  piece_stonefloor4x4: 'stone_floor_4x4',
  stonefloor4x4: 'stone_floor_4x4',
  stone_floor_4x4: 'stone_floor_4x4',
  piece_stonewall2x1: 'stone_wall_2x1',
  stonewall2x1: 'stone_wall_2x1',
  stone_wall_2x1: 'stone_wall_2x1',
  piece_stonewall4x2: 'stone_wall_4x2',
  stonewall4x2: 'stone_wall_4x2',
  stone_wall_4x2: 'stone_wall_4x2',
  piece_stonewall1x1: 'stone_wall_1x1',
  stonewall1x1: 'stone_wall_1x1',
  piece_stonearch: 'piece_stonearch',
  stonearch: 'piece_stonearch',
  stone_arch: 'piece_stonearch',
  piece_stone_arch: 'piece_stonearch',
  piece_stonestair: 'stonestair',
  stonestair: 'stonestair',
  piece_stonestairs: 'stonestair',
  stone_stairs: 'stonestair',
  piece_stonepillar: 'stonepillar',
  stonepillar: 'stonepillar',
  // Hearth & Fire
  piece_hearth: 'hearth',
  hearth: 'hearth',
  piece_firepit: 'fire_pit',
  fire_pit: 'fire_pit',
  firepit: 'fire_pit',
  piece_bonfire: 'bonfire',
  bonfire: 'bonfire',
  // Stations & Utilities
  piece_workbench: 'piece_workbench',
  workbench: 'piece_workbench',
  piece_forge: 'forge',
  forge: 'forge',
  piece_smelter: 'smelter',
  smelter: 'smelter',
  piece_blastfurnace: 'blastfurnace',
  blastfurnace: 'blastfurnace',
  piece_fermenter: 'fermenter',
  fermenter: 'fermenter',
  piece_charcoalkiln: 'charcoalkiln',
  charcoalkiln: 'charcoalkiln',
  piece_stonecutter: 'piece_stonecutter',
  stonecutter: 'piece_stonecutter',
  // Furniture & Lights
  piece_bed: 'bed',
  bed: 'bed',
  piece_bed02: 'bed02',
  bed02: 'bed02',
  piece_chair: 'chair',
  chair: 'chair',
  piece_table: 'table',
  table: 'table',
  piece_table_round: 'piece_table_round',
  piece_table_oak: 'piece_table_oak',
  piece_chestwood: 'piece_chestwood',
  wood_chest: 'piece_chestwood',
  chest_wood: 'piece_chestwood',
  piece_chest: 'piece_chest',
  iron_chest: 'piece_chest',
  piece_groundtorch_wood: 'piece_groundtorch_wood',
  piece_groundtorchwood: 'piece_groundtorch_wood',
  standing_wood_torch: 'piece_groundtorch_wood',
  piece_groundtorch: 'piece_groundtorch',
  standing_iron_torch: 'piece_groundtorch',
  piece_groundtorchgreen: 'piece_groundtorchgreen',
  piece_groundtorchblue: 'piece_groundtorchblue',
  piece_portal: 'portal',
  portal: 'portal',
};

function formatPlanBuildFile(p: {
  name: string;
  author?: string;
  description?: string;
  category?: string;
  pieces?: BlueprintPieceData[];
}): string {
  const lines: string[] = [];
  lines.push(`#Name:${p.name}`);
  lines.push(`#Creator:${p.author || 'Antigravity'}`);
  lines.push(`#Description:"${(p.description || '').replace(/"/g, '\\"')}"`);
  lines.push(`#Category:${p.category || 'Blueprints'}`);
  lines.push('#SnapPoints');
  lines.push('#Pieces');

  if (p.pieces) {
    for (const piece of p.pieces) {
      let raw = piece.prefab.replace(/\(Clone\)/gi, '').trim();
      const lower = raw.toLowerCase();
      const name = CANONICAL_PREFAB_MAP[lower] || raw;
      const cat = p.category || 'Building';
      const x = (piece.x || 0).toFixed(4);
      const y = (piece.y || 0).toFixed(4);
      const z = (piece.z || 0).toFixed(4);
      const rx = (piece.rx || 0).toFixed(6);
      const ry = (piece.ry || 0).toFixed(6);
      const rz = (piece.rz || 0).toFixed(6);
      const rw = (piece.rw ?? 1).toFixed(6);
      lines.push(`${name};${cat};${x};${y};${z};${rx};${ry};${rz};${rw};""`);
    }
  }
  return lines.join('\n');
}

export async function getPlanBuildBlueprintsListLive(): Promise<Array<{ name: string; file: string; format: string }>> {
  try {
    const res = await fetchBridge('planbuild/list');
    if (!res.ok) return [];
    const data = await res.json();
    return data.blueprints || [];
  } catch {
    return [];
  }
}

export interface PlantCropGridOptions {
  crop: string;
  rows?: number;
  cols?: number;
  spacing?: number;
  autoCultivate?: boolean;
  consumeSeeds?: boolean;
  instantMature?: boolean;
  originX?: number;
  originZ?: number;
  rotationY?: number;
}

export interface PlantCropGridResult {
  success: boolean;
  plantedCount?: number;
  totalRequested?: number;
  crop?: string;
  seedItem?: string;
  remainingSeeds?: number;
  error?: string;
}

export interface HarvestCropsResult {
  success: boolean;
  harvestedCount?: number;
  items?: Record<string, number>;
  error?: string;
}

export interface FarmStatusResult {
  success: boolean;
  seeds?: Record<string, number>;
  nearbyGrowing?: number;
  nearbyRipe?: number;
  error?: string;
}

export async function plantCropGridLive(options: PlantCropGridOptions): Promise<PlantCropGridResult> {
  try {
    const res = await fetchBridge('plant-grid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to plant crop grid' };
  }
}

export async function harvestCropsLive(radius: number = 15): Promise<HarvestCropsResult> {
  try {
    const res = await fetchBridge('harvest-crops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ radius }),
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to harvest nearby crops' };
  }
}

export async function getFarmStatusLive(): Promise<FarmStatusResult> {
  try {
    const res = await fetchBridge('farm-status');
    if (!res.ok) {
      return { success: false, error: 'Failed to fetch farm status' };
    }
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to communicate with game bridge' };
  }
}


