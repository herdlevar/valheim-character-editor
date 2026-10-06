import { BlueprintPieceData } from '../services/liveBridge';

export interface BlueprintMaterialCost {
  name: string;
  amount: number;
  icon?: string;
}

export interface Blueprint {
  id: string;
  name: string;
  author: string;
  description: string;
  category: 'Viking' | 'Defense' | 'Workshop' | 'Portal' | 'Harbor' | 'Custom' | string;
  pieces: BlueprintPieceData[];
  totalPieces: number;
  materials: BlueprintMaterialCost[];
}

// Maps Valheim building prefabs (both official piece_* and community names) to resource ingredients
const PREFAB_COST_MAP: Record<string, { [resource: string]: number }> = {
  // Wood Walls & Structures
  piece_woodwall: { Wood: 2 },
  woodwall: { Wood: 2 },
  piece_woodwallhalf: { Wood: 1 },
  woodwall_half: { Wood: 1 },
  piece_woodwallquarter: { Wood: 1 },
  piece_woodwallroof: { Wood: 2 },
  piece_woodwallroof45: { Wood: 2 },
  piece_woodwallrooftop: { Wood: 2 },
  piece_woodwallrooftop45: { Wood: 2 },

  // Wood Floors
  piece_woodfloor2x2: { Wood: 2 },
  piece_woodfloor: { Wood: 2 },
  woodfloor: { Wood: 2 },
  wood_floor: { Wood: 2 },
  woodfloor2x2: { Wood: 2 },
  piece_woodfloor1x1: { Wood: 1 },
  piece_woodfloor_1x1: { Wood: 1 },
  wood_floor_1x1: { Wood: 1 },

  // Wood Roofs
  wood_roof_45: { Wood: 2 },
  piece_woodroof45: { Wood: 2 },
  woodroof45: { Wood: 2 },
  roof_wood_45: { Wood: 2 },
  wood_roof_top_45: { Wood: 2 },
  piece_woodrooftop45: { Wood: 2 },
  woodrooftop45: { Wood: 2 },
  roof_wood_ridge_45: { Wood: 2 },
  wood_roof_26: { Wood: 2 },
  piece_woodroof26: { Wood: 2 },
  woodroof26: { Wood: 2 },
  roof_wood_26: { Wood: 2 },
  wood_roof_top: { Wood: 2 },
  piece_woodrooftop: { Wood: 2 },
  woodrooftop: { Wood: 2 },
  roof_wood_ridge_26: { Wood: 2 },
  wood_roof_ocorner_45: { Wood: 2 },
  wood_roof_icorner_45: { Wood: 2 },
  wood_roof_ocorner: { Wood: 2 },
  wood_roof_icorner: { Wood: 2 },
  piece_woodroofocorner45: { Wood: 2 },
  piece_woodrooficorner45: { Wood: 2 },
  piece_woodroofocorner: { Wood: 2 },
  piece_woodrooficorner: { Wood: 2 },

  // Doors & Stairs
  piece_wooddoor: { Wood: 4 },
  wood_door: { Wood: 4 },
  piece_woodstair: { Wood: 2 },
  wood_stairs: { Wood: 2 },
  piece_sharpstakes: { Wood: 6, 'Core Wood': 4 },

  // Beams & Poles
  piece_woodbeam2: { Wood: 2 },
  piece_woodbeam1: { Wood: 1 },
  piece_woodbeam26: { Wood: 2 },
  piece_woodbeam45: { Wood: 2 },
  piece_woodbeam: { Wood: 2 },
  wood_beam: { Wood: 2 },
  wood_beam_1: { Wood: 1 },
  piece_woodpole: { Wood: 1 },
  piece_woodpole2: { Wood: 2 },
  wood_pole: { Wood: 1 },
  wood_pole2: { Wood: 2 },
  piece_logbeam4: { 'Core Wood': 2 },
  piece_logpole4: { 'Core Wood': 2 },
  piece_logbeam2: { 'Core Wood': 1 },
  piece_logpole2: { 'Core Wood': 1 },
  piece_logbeam_4: { 'Core Wood': 2 },
  piece_logpole_4: { 'Core Wood': 2 },
  piece_logbeam_2: { 'Core Wood': 1 },
  piece_logpole_2: { 'Core Wood': 1 },
  wood_pole_log_4: { 'Core Wood': 2 },
  wood_pole_log: { 'Core Wood': 1 },
  logpole4: { 'Core Wood': 2 },
  logpole2: { 'Core Wood': 1 },

  // Stone Structures
  piece_stonewall4x2: { Stone: 6 },
  piece_stone_wall_4x2: { Stone: 6 },
  stone_wall_4x2: { Stone: 6 },
  stonewall4x2: { Stone: 6 },
  piece_stonewall2x1: { Stone: 3 },
  piece_stone_wall_2x1: { Stone: 3 },
  stone_wall_2x1: { Stone: 3 },
  stonewall2x1: { Stone: 3 },
  piece_stonewall1x1: { Stone: 2 },
  piece_stone_wall_1x1: { Stone: 2 },
  stone_wall_1x1: { Stone: 2 },
  stonewall1x1: { Stone: 2 },
  piece_stonearch: { Stone: 4 },
  piece_stone_arch: { Stone: 4 },
  stone_arch: { Stone: 4 },
  stonearch: { Stone: 4 },
  piece_stonefloor2x2: { Stone: 6 },
  piece_stone_floor_2x2: { Stone: 6 },
  stone_floor_2x2: { Stone: 6 },
  stonefloor2x2: { Stone: 6 },
  piece_stonefloor4x4: { Stone: 12 },
  stone_floor_4x4: { Stone: 12 },
  piece_stonestair: { Stone: 8 },
  piece_stone_stairs: { Stone: 8 },
  stone_stair: { Stone: 8 },
  stonestair: { Stone: 8 },
  piece_stonepillar: { Stone: 5 },
  stone_pillar: { Stone: 5 },
  stonepillar: { Stone: 5 },

  // Crafting Stations
  piece_workbench: { Wood: 10 },
  piece_forge: { Stone: 4, Copper: 6, Wood: 10, Coal: 4 },
  forge: { Stone: 4, Copper: 6, Wood: 10, Coal: 4 },
  piece_smelter: { Stone: 20, 'Surtling Core': 5 },
  smelter: { Stone: 20, 'Surtling Core': 5 },
  piece_charcoalkiln: { Stone: 20, 'Surtling Core': 5 },
  charcoal_kiln: { Stone: 20, 'Surtling Core': 5 },
  charcoalkiln: { Stone: 20, 'Surtling Core': 5 },
  piece_stonecutter: { Wood: 10, Iron: 2, Stone: 4 },

  // Hearth & Fire
  piece_hearth: { Stone: 15, 'Surtling Core': 2 },
  hearth: { Stone: 15, 'Surtling Core': 2 },
  piece_firepit: { Stone: 5, Wood: 2 },
  fire_pit: { Stone: 5, Wood: 2 },
  piece_bonfire: { 'Ancient Bark': 5, 'Core Wood': 5, 'Fine Wood': 5, 'Surtling Core': 1 },
  piece_firepit_iron: { Iron: 2, Coal: 2 },

  // Furniture & Amenities
  piece_portal: { 'Fine Wood': 20, 'Greydwarf Eye': 10, 'Surtling Core': 2 },
  portal_wood: { 'Fine Wood': 20, 'Greydwarf Eye': 10, 'Surtling Core': 2 },
  portal: { 'Fine Wood': 20, 'Greydwarf Eye': 10, 'Surtling Core': 2 },
  piece_fermenter: { 'Fine Wood': 30, Bronze: 5, Resin: 10 },
  fermenter: { 'Fine Wood': 30, Bronze: 5, Resin: 10 },
  piece_bed: { Wood: 8 },
  piece_bed02: { 'Fine Wood': 40, 'Deer Hide': 4, 'Wolf Pelt': 4, Feathers: 10, Iron: 1 },
  bed: { Wood: 8 },
  piece_chair: { 'Fine Wood': 4 },
  chair: { 'Fine Wood': 4 },
  piece_table: { 'Fine Wood': 6 },
  table: { 'Fine Wood': 6 },
  piece_chestwood: { Wood: 10 },
  piece_chest_wood: { Wood: 10 },
  wood_chest: { Wood: 10 },
  chest: { Wood: 10 },
  piece_chest: { 'Fine Wood': 10, Iron: 2 },
  piece_chestblackmetal: { 'Fine Wood': 10, 'Black Metal': 2, 'Tar': 2 },
  piece_chest_blackmetal: { 'Fine Wood': 10, 'Black Metal': 2, 'Tar': 2 },
  piece_groundtorchwood: { Wood: 2, Resin: 2 },
  piece_groundtorch_wood: { Wood: 2, Resin: 2 },
  piece_groundtorchgreen: { 'Fine Wood': 2, 'Guck': 2, 'Core Wood': 2 },
  piece_groundtorch_green: { 'Fine Wood': 2, 'Guck': 2, 'Core Wood': 2 },
  piece_groundtorchblue: { 'Fine Wood': 2, 'Black Core': 1, 'Core Wood': 2 },
  piece_groundtorch_blue: { 'Fine Wood': 2, 'Black Core': 1, 'Core Wood': 2 },
  piece_groundtorch: { Iron: 2, Coal: 2 },
  standing_iron_torch: { Iron: 2, Coal: 2 },
};

export function calculateMaterials(pieces: BlueprintPieceData[]): BlueprintMaterialCost[] {
  const totals: Record<string, number> = {};

  for (const piece of pieces) {
    const key = piece.prefab.toLowerCase().trim();
    const costs = PREFAB_COST_MAP[key] || { Wood: 2 }; // Default 2 wood fallback
    for (const [mat, amount] of Object.entries(costs)) {
      totals[mat] = (totals[mat] || 0) + amount;
    }
  }

  return Object.entries(totals)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Parses a .blueprint or .vbuild file matching official PlanBuild & BuildShare specifications
 */
export function parseVBuild(content: string, defaultName: string = 'Imported Structure'): Blueprint {
  const lines = content.split(/\r?\n/);
  let name = defaultName.replace(/\.[^/.]+$/, '');
  let author = 'Community Creator';
  let description = 'Imported Valheim blueprint.';
  let category = 'Custom';
  const pieces: BlueprintPieceData[] = [];

  let state: 'metadata' | 'pieces' | 'snappoints' | 'terrain' | 'skip' = 'pieces';

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // PlanBuild Section Headers
    if (line.startsWith('#Name:')) {
      name = line.substring(6).trim() || name;
      continue;
    }
    if (line.startsWith('#Creator:') || line.startsWith('#Author:')) {
      const idx = line.indexOf(':');
      author = line.substring(idx + 1).trim() || author;
      continue;
    }
    if (line.startsWith('#Description:')) {
      let desc = line.substring(13).trim();
      if (desc.startsWith('"') && desc.endsWith('"')) {
        try {
          desc = JSON.parse(desc);
        } catch {}
      }
      description = desc || description;
      continue;
    }
    if (line.startsWith('#Category:')) {
      category = line.substring(10).trim() || category;
      continue;
    }
    if (line === '#Pieces') {
      state = 'pieces';
      continue;
    }
    if (line === '#SnapPoints') {
      state = 'snappoints';
      continue;
    }
    if (line === '#Terrain') {
      state = 'terrain';
      continue;
    }
    if (line.startsWith('#')) {
      // Unknown header section (e.g. #TerrainHeight in InfinityHammer), skip until next known header
      state = 'skip';
      continue;
    }

    if (state !== 'pieces') {
      continue;
    }

    // 1. PlanBuild format: Semicolon delimited
    // Format: name;category;posX;posY;posZ;rotX;rotY;rotZ;rotW;additionalText;scaleX;scaleY;scaleZ
    if (line.includes(';')) {
      const parts = line.split(';');
      if (parts.length >= 5) {
        let prefab = parts[0].split('(')[0].trim();
        if (!prefab || !isNaN(Number(prefab))) continue;

        // Strip any category text if present
        const posX = parseFloat(parts[2]?.replace(',', '.')) || 0;
        const posY = parseFloat(parts[3]?.replace(',', '.')) || 0;
        const posZ = parseFloat(parts[4]?.replace(',', '.')) || 0;
        const rotX = parts.length > 5 ? (parseFloat(parts[5]?.replace(',', '.')) || 0) : 0;
        const rotY = parts.length > 6 ? (parseFloat(parts[6]?.replace(',', '.')) || 0) : 0;
        const rotZ = parts.length > 7 ? (parseFloat(parts[7]?.replace(',', '.')) || 0) : 0;
        const rotW = parts.length > 8 ? (parseFloat(parts[8]?.replace(',', '.')) || 1) : 1;

        pieces.push({ prefab, x: posX, y: posY, z: posZ, rx: rotX, ry: rotY, rz: rotZ, rw: rotW });
        continue;
      }
    }

    // 2. BuildShare format: Space delimited
    // Format: name rotX rotY rotZ rotW posX posY posZ
    const tokens = line.split(/\s+/).filter(Boolean);
    if (tokens.length >= 8) {
      const prefab = tokens[0].split('(')[0].trim();
      if (!prefab) continue;

      // In official BuildShare (.vbuild):
      // tokens[1..4] = rotX, rotY, rotZ, rotW (normalized quaternion)
      // tokens[5..7] = posX, posY, posZ
      const rotX = parseFloat(tokens[1].replace(',', '.')) || 0;
      const rotY = parseFloat(tokens[2].replace(',', '.')) || 0;
      const rotZ = parseFloat(tokens[3].replace(',', '.')) || 0;
      const rotW = parseFloat(tokens[4].replace(',', '.')) || 1;
      const posX = parseFloat(tokens[5].replace(',', '.')) || 0;
      const posY = parseFloat(tokens[6].replace(',', '.')) || 0;
      const posZ = parseFloat(tokens[7].replace(',', '.')) || 0;

      pieces.push({ prefab, x: posX, y: posY, z: posZ, rx: rotX, ry: rotY, rz: rotZ, rw: rotW });
      continue;
    }

    // 3. Fallback: Generic comma/space format (prefab posX posY posZ [rotX rotY rotZ rotW])
    const commaTokens = line.split(/[,\s]+/).filter(Boolean);
    if (commaTokens.length >= 4) {
      const prefab = commaTokens[0].split('(')[0].trim();
      if (!prefab) continue;

      const posX = parseFloat(commaTokens[1]) || 0;
      const posY = parseFloat(commaTokens[2]) || 0;
      const posZ = parseFloat(commaTokens[3]) || 0;
      const rotX = commaTokens.length > 4 ? parseFloat(commaTokens[4]) || 0 : 0;
      const ry = commaTokens.length > 5 ? parseFloat(commaTokens[5]) || 0 : 0;
      const rz = commaTokens.length > 6 ? parseFloat(commaTokens[6]) || 0 : 0;
      const rw = commaTokens.length > 7 ? parseFloat(commaTokens[7]) || 1 : 1;

      pieces.push({ prefab, x: posX, y: posY, z: posZ, rx: rotX, ry, rz, rw });
    }
  }

  return {
    id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name,
    author,
    description,
    category,
    pieces,
    totalPieces: pieces.length,
    materials: calculateMaterials(pieces),
  };
}

/**
 * Universal blueprint parser supporting .vbuild, .blueprint (JSON or text)
 */
export function parseAnyBlueprint(content: string, fileName?: string): Blueprint {
  const trimmed = content.trim();

  // Try parsing as JSON first (PlanBuild JSON format)
  if (trimmed.startsWith('{')) {
    try {
      const json = JSON.parse(trimmed);
      const name = json.name || json.Name || fileName?.replace(/\.[^/.]+$/, '') || 'Custom Blueprint';
      const author = json.author || json.Author || json.creator || 'Community Creator';
      const description = json.description || json.Description || 'Imported PlanBuild JSON blueprint.';
      const category = json.category || json.Category || 'Custom';
      const rawPieces = json.pieces || json.Pieces || [];

      const pieces: BlueprintPieceData[] = [];
      for (const p of rawPieces) {
        let prefab = p.prefab || p.name || p.Prefab || p.Name;
        if (!prefab) continue;
        if (typeof prefab === 'string') {
          prefab = prefab.split('(')[0].trim();
          if (prefab.includes(';')) {
            prefab = prefab.split(';')[0].trim();
          }
        }
        const x = p.x ?? p.posX ?? p.PosX ?? 0;
        const y = p.y ?? p.posY ?? p.PosY ?? 0;
        const z = p.z ?? p.posZ ?? p.PosZ ?? 0;
        const rx = p.rx ?? p.rotX ?? p.RotX ?? 0;
        const ry = p.ry ?? p.rotY ?? p.RotY ?? 0;
        const rz = p.rz ?? p.rotZ ?? p.RotZ ?? 0;
        const rw = p.rw ?? p.rotW ?? p.RotW ?? 1;
        pieces.push({ prefab, x, y, z, rx, ry, rz, rw });
      }

      return {
        id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name,
        author,
        description,
        category,
        pieces,
        totalPieces: pieces.length,
        materials: calculateMaterials(pieces),
      };
    } catch {
      // Fall through to text line parser
    }
  }

  // Parse as .blueprint / .vbuild text format
  return parseVBuild(content, fileName);
}

// ==========================================
// BUILT-IN CURATED VALHEIM PRESET BLUEPRINTS
// ==========================================

function createVikingLonghousePieces(): BlueprintPieceData[] {
  const pieces: BlueprintPieceData[] = [];

  // Floor grid: 4 x 8 meters (2x4 pieces of 2x2 wood floor)
  for (let x = -3; x <= 3; x += 2) {
    for (let z = -5; z <= 5; z += 2) {
      pieces.push({ prefab: 'woodfloor2x2', x, y: 0, z, rx: 0, ry: 0, rz: 0, rw: 1 });
    }
  }

  // Walls along the length (North and South sides: z = -6 and z = 6)
  for (let z = -5; z <= 5; z += 2) {
    // West wall (x = -4)
    pieces.push({ prefab: 'woodwall', x: -4, y: 1, z, rx: 0, ry: 0.7071, rz: 0, rw: 0.7071 });
    pieces.push({ prefab: 'woodwall', x: -4, y: 3, z, rx: 0, ry: 0.7071, rz: 0, rw: 0.7071 });

    // East wall (x = 4)
    pieces.push({ prefab: 'woodwall', x: 4, y: 1, z, rx: 0, ry: -0.7071, rz: 0, rw: 0.7071 });
    pieces.push({ prefab: 'woodwall', x: 4, y: 3, z, rx: 0, ry: -0.7071, rz: 0, rw: 0.7071 });
  }

  // Back wall (z = -6)
  for (let x = -3; x <= 3; x += 2) {
    pieces.push({ prefab: 'woodwall', x, y: 1, z: -6, rx: 0, ry: 0, rz: 0, rw: 1 });
    pieces.push({ prefab: 'woodwall', x, y: 3, z: -6, rx: 0, ry: 0, rz: 0, rw: 1 });
  }

  // Front wall with door framing (z = 6) - 8m facade fully sealed with door
  pieces.push({ prefab: 'woodwall', x: -3, y: 1, z: 6, rx: 0, ry: 1, rz: 0, rw: 0 });
  pieces.push({ prefab: 'woodwall', x: -3, y: 3, z: 6, rx: 0, ry: 1, rz: 0, rw: 0 });
  pieces.push({ prefab: 'wood_door', x: -1, y: 0, z: 6, rx: 0, ry: 1, rz: 0, rw: 0 });
  pieces.push({ prefab: 'woodwall', x: -1, y: 3, z: 6, rx: 0, ry: 1, rz: 0, rw: 0 });
  pieces.push({ prefab: 'woodwall', x: 1, y: 1, z: 6, rx: 0, ry: 1, rz: 0, rw: 0 });
  pieces.push({ prefab: 'woodwall', x: 1, y: 3, z: 6, rx: 0, ry: 1, rz: 0, rw: 0 });
  pieces.push({ prefab: 'woodwall', x: 3, y: 1, z: 6, rx: 0, ry: 1, rz: 0, rw: 0 });
  pieces.push({ prefab: 'woodwall', x: 3, y: 3, z: 6, rx: 0, ry: 1, rz: 0, rw: 0 });

  // 45 degree pitched roof (fully closed: 2 tiers on West, 2 tiers on East, ridge cap at peak)
  for (let z = -5; z <= 5; z += 2) {
    // West slope (eaves at wall x = -4, rises to center x = 0)
    pieces.push({ prefab: 'wood_roof_45', x: -3, y: 5, z, rx: 0, ry: -0.7071, rz: 0, rw: 0.7071 });
    pieces.push({ prefab: 'wood_roof_45', x: -1, y: 7, z, rx: 0, ry: -0.7071, rz: 0, rw: 0.7071 });

    // East slope (eaves at wall x = 4, rises to center x = 0)
    pieces.push({ prefab: 'wood_roof_45', x: 3, y: 5, z, rx: 0, ry: 0.7071, rz: 0, rw: 0.7071 });
    pieces.push({ prefab: 'wood_roof_45', x: 1, y: 7, z, rx: 0, ry: 0.7071, rz: 0, rw: 0.7071 });

    // Ridge cap along center spine at x = 0, y = 8
    pieces.push({ prefab: 'wood_roof_top_45', x: 0, y: 8, z, rx: 0, ry: 0.7071, rz: 0, rw: 0.7071 });
  }

  // Interior: Central Stone Hearth, Bed, Crafting table & Chests
  pieces.push({ prefab: 'hearth', x: 0, y: 0.1, z: 0, rx: 0, ry: 0, rz: 0, rw: 1 });
  pieces.push({ prefab: 'bed', x: -2.5, y: 0.1, z: -4, rx: 0, ry: 0.7071, rz: 0, rw: 0.7071 });
  pieces.push({ prefab: 'piece_chest_wood', x: -2.5, y: 0.1, z: -2, rx: 0, ry: 0.7071, rz: 0, rw: 0.7071 });
  pieces.push({ prefab: 'piece_workbench', x: 2.5, y: 0.1, z: -4, rx: 0, ry: -0.7071, rz: 0, rw: 0.7071 });
  pieces.push({ prefab: 'piece_groundtorch_wood', x: -1.5, y: 0.1, z: 4.5, rx: 0, ry: 0, rz: 0, rw: 1 });
  pieces.push({ prefab: 'piece_groundtorch_wood', x: 1.5, y: 0.1, z: 4.5, rx: 0, ry: 0, rz: 0, rw: 1 });

  return pieces;
}

function createPortalHubPieces(): BlueprintPieceData[] {
  const pieces: BlueprintPieceData[] = [];

  // Central Octagonal stone platform
  for (let x = -2; x <= 2; x += 2) {
    for (let z = -2; z <= 2; z += 2) {
      pieces.push({ prefab: 'stonefloor2x2', x, y: 0, z, rx: 0, ry: 0, rz: 0, rw: 1 });
    }
  }

  // 6 Portal Bays in a circular radial hub
  const angles = [0, 60, 120, 180, 240, 300];
  angles.forEach((deg) => {
    const rad = (deg * Math.PI) / 180;
    const px = Math.sin(rad) * 4.5;
    const pz = Math.cos(rad) * 4.5;

    // Portal facing inward
    const yawHalfRad = ((deg + 180) * Math.PI) / 360;
    pieces.push({
      prefab: 'portal_wood',
      x: px,
      y: 0,
      z: pz,
      rx: 0,
      ry: Math.sin(yawHalfRad),
      rz: 0,
      rw: Math.cos(yawHalfRad),
    });

    // Decorative Runic pillars
    pieces.push({
      prefab: 'wood_pole_log_4',
      x: px * 1.25,
      y: 0,
      z: pz * 1.25,
      rx: 0,
      ry: 0,
      rz: 0,
      rw: 1,
    });

    // Glowing green torches
    pieces.push({
      prefab: 'piece_groundtorch_green',
      x: Math.sin(((deg + 30) * Math.PI) / 180) * 3.5,
      y: 0,
      z: Math.cos(((deg + 30) * Math.PI) / 180) * 3.5,
      rx: 0,
      ry: 0,
      rz: 0,
      rw: 1,
    });
  });

  return pieces;
}

function createWatchtowerPieces(): BlueprintPieceData[] {
  const pieces: BlueprintPieceData[] = [];

  // Stone base (4x4m)
  pieces.push({ prefab: 'stonefloor2x2', x: -1, y: 0, z: -1, rx: 0, ry: 0, rz: 0, rw: 1 });
  pieces.push({ prefab: 'stonefloor2x2', x: 1, y: 0, z: -1, rx: 0, ry: 0, rz: 0, rw: 1 });
  pieces.push({ prefab: 'stonefloor2x2', x: -1, y: 0, z: 1, rx: 0, ry: 0, rz: 0, rw: 1 });
  pieces.push({ prefab: 'stonefloor2x2', x: 1, y: 0, z: 1, rx: 0, ry: 0, rz: 0, rw: 1 });

  // 3 Levels of stone walls
  for (let lvl = 0; lvl < 3; lvl++) {
    const y = lvl * 2 + 1;
    // South wall
    pieces.push({ prefab: 'stonewall4x2', x: 0, y, z: 2, rx: 0, ry: 0, rz: 0, rw: 1 });
    // North wall
    pieces.push({ prefab: 'stonewall4x2', x: 0, y, z: -2, rx: 0, ry: 1, rz: 0, rw: 0 });
    // West wall
    pieces.push({ prefab: 'stonewall4x2', x: -2, y, z: 0, rx: 0, ry: 0.7071, rz: 0, rw: 0.7071 });
    // East wall
    pieces.push({ prefab: 'stonewall4x2', x: 2, y, z: 0, rx: 0, ry: -0.7071, rz: 0, rw: 0.7071 });
  }

  // Top observation wooden battlement deck at y = 6
  pieces.push({ prefab: 'woodfloor2x2', x: -1, y: 6, z: -1, rx: 0, ry: 0, rz: 0, rw: 1 });
  pieces.push({ prefab: 'woodfloor2x2', x: 1, y: 6, z: -1, rx: 0, ry: 0, rz: 0, rw: 1 });
  pieces.push({ prefab: 'woodfloor2x2', x: -1, y: 6, z: 1, rx: 0, ry: 0, rz: 0, rw: 1 });
  pieces.push({ prefab: 'woodfloor2x2', x: 1, y: 6, z: 1, rx: 0, ry: 0, rz: 0, rw: 1 });

  // Battlement railings
  pieces.push({ prefab: 'woodwallhalf', x: 0, y: 7, z: 2, rx: 0, ry: 0, rz: 0, rw: 1 });
  pieces.push({ prefab: 'woodwallhalf', x: 0, y: 7, z: -2, rx: 0, ry: 1, rz: 0, rw: 0 });
  pieces.push({ prefab: 'woodwallhalf', x: -2, y: 7, z: 0, rx: 0, ry: 0.7071, rz: 0, rw: 0.7071 });
  pieces.push({ prefab: 'woodwallhalf', x: 2, y: 7, z: 0, rx: 0, ry: -0.7071, rz: 0, rw: 0.7071 });

  // Full 4m roof cap across entire observation deck
  for (const z of [-1, 1]) {
    pieces.push({ prefab: 'wood_roof_45', x: -1, y: 8, z, rx: 0, ry: -0.7071, rz: 0, rw: 0.7071 });
    pieces.push({ prefab: 'wood_roof_45', x: 1, y: 8, z, rx: 0, ry: 0.7071, rz: 0, rw: 0.7071 });
    pieces.push({ prefab: 'wood_roof_top_45', x: 0, y: 9, z, rx: 0, ry: 0.7071, rz: 0, rw: 0.7071 });
  }
  pieces.push({ prefab: 'piece_groundtorch', x: 1.5, y: 6, z: 1.5, rx: 0, ry: 0, rz: 0, rw: 1 });

  return pieces;
}

function createBlacksmithWorkshopPieces(): BlueprintPieceData[] {
  const pieces: BlueprintPieceData[] = [];

  // Stone flooring 6x6
  for (let x = -2; x <= 2; x += 2) {
    for (let z = -2; z <= 2; z += 2) {
      pieces.push({ prefab: 'stonefloor2x2', x, y: 0, z, rx: 0, ry: 0, rz: 0, rw: 1 });
    }
  }

  // Smelter and Charcoal Kiln back-to-back with dedicated stone chimneys
  pieces.push({ prefab: 'smelter', x: -2, y: 0.1, z: 2, rx: 0, ry: 0, rz: 0, rw: 1 });
  pieces.push({ prefab: 'charcoal_kiln', x: 2, y: 0.1, z: 2, rx: 0, ry: 0, rz: 0, rw: 1 });

  // Main Blacksmith Forge and Workbench
  pieces.push({ prefab: 'forge', x: 0, y: 0.1, z: -2, rx: 0, ry: 1, rz: 0, rw: 0 });
  pieces.push({ prefab: 'piece_workbench', x: -2, y: 0.1, z: -2, rx: 0, ry: 1, rz: 0, rw: 0 });
  pieces.push({ prefab: 'piece_chest_wood', x: 2, y: 0.1, z: -2, rx: 0, ry: 1, rz: 0, rw: 0 });

  // Half walls & Open forge workshop rafters
  pieces.push({ prefab: 'wood_pole_log_4', x: -3, y: 0, z: -3, rx: 0, ry: 0, rz: 0, rw: 1 });
  pieces.push({ prefab: 'wood_pole_log_4', x: 3, y: 0, z: -3, rx: 0, ry: 0, rz: 0, rw: 1 });
  pieces.push({ prefab: 'wood_pole_log_4', x: -3, y: 0, z: 3, rx: 0, ry: 0, rz: 0, rw: 1 });
  pieces.push({ prefab: 'wood_pole_log_4', x: 3, y: 0, z: 3, rx: 0, ry: 0, rz: 0, rw: 1 });

  // Full 6m roof canopy protecting entire workshop from rain
  for (let z = -2; z <= 2; z += 2) {
    pieces.push({ prefab: 'wood_roof', x: -1.5, y: 4, z, rx: 0, ry: -0.7071, rz: 0, rw: 0.7071 });
    pieces.push({ prefab: 'wood_roof', x: 1.5, y: 4, z, rx: 0, ry: 0.7071, rz: 0, rw: 0.7071 });
    pieces.push({ prefab: 'wood_roof_top', x: 0, y: 4.5, z, rx: 0, ry: 0.7071, rz: 0, rw: 0.7071 });
  }

  return pieces;
}

const VIKING_LONGHOUSE_PIECES = createVikingLonghousePieces();
const PORTAL_HUB_PIECES = createPortalHubPieces();
const WATCHTOWER_PIECES = createWatchtowerPieces();
const WORKSHOP_PIECES = createBlacksmithWorkshopPieces();

function createFrostpeakTavernPieces(): BlueprintPieceData[] {
  const pieces: BlueprintPieceData[] = [];

  // Raised stone foundation: 6m x 8m (3 x 4 pieces of stonefloor2x2)
  for (let x = -2; x <= 2; x += 2) {
    for (let z = -3; z <= 3; z += 2) {
      pieces.push({ prefab: 'stonefloor2x2', x, y: 0, z, rx: 0, ry: 0, rz: 0, rw: 1 });
    }
  }

  // Stone base perimeter (y = 0)
  for (let z = -3; z <= 3; z += 2) {
    pieces.push({ prefab: 'stonewall2x1', x: -3, y: 0, z, rx: 0, ry: 0.7071, rz: 0, rw: 0.7071 });
    pieces.push({ prefab: 'stonewall2x1', x: 3, y: 0, z, rx: 0, ry: -0.7071, rz: 0, rw: 0.7071 });
  }

  // Wood tavern floor on top of stone foundation (y = 1)
  for (let x = -2; x <= 2; x += 2) {
    for (let z = -3; z <= 3; z += 2) {
      pieces.push({ prefab: 'woodfloor2x2', x, y: 1, z, rx: 0, ry: 0, rz: 0, rw: 1 });
    }
  }

  // Main Lodge Wooden Walls (y = 2 and y = 4)
  // West side (x = -3)
  for (let z = -3; z <= 3; z += 2) {
    pieces.push({ prefab: 'woodwall', x: -3, y: 2, z, rx: 0, ry: 0.7071, rz: 0, rw: 0.7071 });
    pieces.push({ prefab: 'woodwall', x: -3, y: 4, z, rx: 0, ry: 0.7071, rz: 0, rw: 0.7071 });
  }
  // East side (x = 3)
  for (let z = -3; z <= 3; z += 2) {
    pieces.push({ prefab: 'woodwall', x: 3, y: 2, z, rx: 0, ry: -0.7071, rz: 0, rw: 0.7071 });
    pieces.push({ prefab: 'woodwall', x: 3, y: 4, z, rx: 0, ry: -0.7071, rz: 0, rw: 0.7071 });
  }
  // North back wall (z = -4)
  for (let x = -2; x <= 2; x += 2) {
    pieces.push({ prefab: 'woodwall', x, y: 2, z: -4, rx: 0, ry: 0, rz: 0, rw: 1 });
    pieces.push({ prefab: 'woodwall', x, y: 4, z: -4, rx: 0, ry: 0, rz: 0, rw: 1 });
  }
  // South front entrance (z = 4)
  pieces.push({ prefab: 'woodwall', x: -2, y: 2, z: 4, rx: 0, ry: 1, rz: 0, rw: 0 });
  pieces.push({ prefab: 'woodwall', x: -2, y: 4, z: 4, rx: 0, ry: 1, rz: 0, rw: 0 });
  pieces.push({ prefab: 'wooddoor', x: 0, y: 1, z: 4, rx: 0, ry: 1, rz: 0, rw: 0 });
  pieces.push({ prefab: 'woodwall', x: 0, y: 4, z: 4, rx: 0, ry: 1, rz: 0, rw: 0 });
  pieces.push({ prefab: 'woodwall', x: 2, y: 2, z: 4, rx: 0, ry: 1, rz: 0, rw: 0 });
  pieces.push({ prefab: 'woodwall', x: 2, y: 4, z: 4, rx: 0, ry: 1, rz: 0, rw: 0 });

  // 45 Degree Alpine Snow-Shedding Roof (oriented correctly: West slopes down to -X, East slopes down to +X, ridge runs along Z)
  for (let z = -3; z <= 3; z += 2) {
    pieces.push({ prefab: 'wood_roof_45', x: -2, y: 5, z, rx: 0, ry: -0.7071, rz: 0, rw: 0.7071 });
    pieces.push({ prefab: 'wood_roof_45', x: 2, y: 5, z, rx: 0, ry: 0.7071, rz: 0, rw: 0.7071 });
    pieces.push({ prefab: 'wood_roof_top_45', x: 0, y: 7.0, z, rx: 0, ry: 0.7071, rz: 0, rw: 0.7071 });
  }

  // Triangular Gable Walls (seals roof gap at north and south peaks)
  pieces.push({ prefab: 'wood_wall_roof_45', x: -1, y: 5, z: -4, rx: 0, ry: 0, rz: 0, rw: 1 });
  pieces.push({ prefab: 'wood_wall_roof_45', x: 1, y: 5, z: -4, rx: 0, ry: 1, rz: 0, rw: 0 });
  pieces.push({ prefab: 'wood_wall_roof_top_45', x: 0, y: 6, z: -4, rx: 0, ry: 0, rz: 0, rw: 1 });

  pieces.push({ prefab: 'wood_wall_roof_45', x: -1, y: 5, z: 4, rx: 0, ry: 1, rz: 0, rw: 0 });
  pieces.push({ prefab: 'wood_wall_roof_45', x: 1, y: 5, z: 4, rx: 0, ry: 0, rz: 0, rw: 1 });
  pieces.push({ prefab: 'wood_wall_roof_top_45', x: 0, y: 6, z: 4, rx: 0, ry: 1, rz: 0, rw: 0 });

  // Stone Hearth Fireplace & High Alpine Chimney
  pieces.push({ prefab: 'hearth', x: 0, y: 1.1, z: -2, rx: 0, ry: 0, rz: 0, rw: 1 });
  pieces.push({ prefab: 'stonewall2x1', x: 0, y: 4, z: -2.5, rx: 0, ry: 0, rz: 0, rw: 1 });
  pieces.push({ prefab: 'stonewall2x1', x: 0, y: 6, z: -2.5, rx: 0, ry: 0, rz: 0, rw: 1 });

  // Tavern Feast Hall Interior Furnishings
  pieces.push({ prefab: 'piece_table', x: 0, y: 1.1, z: 1, rx: 0, ry: 0.7071, rz: 0, rw: 0.7071 });
  pieces.push({ prefab: 'piece_chair', x: -1.2, y: 1.1, z: 1, rx: 0, ry: 0.7071, rz: 0, rw: 0.7071 });
  pieces.push({ prefab: 'piece_chair', x: 1.2, y: 1.1, z: 1, rx: 0, ry: -0.7071, rz: 0, rw: 0.7071 });
  pieces.push({ prefab: 'fermenter', x: -2, y: 1.1, z: -2, rx: 0, ry: 0.7071, rz: 0, rw: 0.7071 });
  pieces.push({ prefab: 'bed', x: 2, y: 1.1, z: -2, rx: 0, ry: -0.7071, rz: 0, rw: 0.7071 });
  pieces.push({ prefab: 'piece_chest_wood', x: 2, y: 1.1, z: -3.2, rx: 0, ry: -0.7071, rz: 0, rw: 0.7071 });

  // Front Porch Torches & Braziers
  pieces.push({ prefab: 'piece_groundtorch_wood', x: -1.2, y: 1, z: 4.5, rx: 0, ry: 0, rz: 0, rw: 1 });
  pieces.push({ prefab: 'piece_groundtorch_wood', x: 1.2, y: 1, z: 4.5, rx: 0, ry: 0, rz: 0, rw: 1 });
  pieces.push({ prefab: 'piece_groundtorch', x: -1.8, y: 1.1, z: -0.5, rx: 0, ry: 0, rz: 0, rw: 1 });
  pieces.push({ prefab: 'piece_groundtorch', x: 1.8, y: 1.1, z: -0.5, rx: 0, ry: 0, rz: 0, rw: 1 });

  return pieces;
}

function createWolfstoneTavernPieces(): BlueprintPieceData[] {
  const pieces: BlueprintPieceData[] = [];

  // Heavy 8m x 8m Stone Fortress Foundation (4x4 stone floor 2x2)
  for (let x = -3; x <= 3; x += 2) {
    for (let z = -3; z <= 3; z += 2) {
      pieces.push({ prefab: 'stonefloor2x2', x, y: 0, z, rx: 0, ry: 0, rz: 0, rw: 1 });
    }
  }

  // Heavy Stone Walls (y = 1 to 3)
  // West & East Walls (x = -4, x = 4)
  for (let z = -2; z <= 2; z += 4) {
    pieces.push({ prefab: 'stonewall4x2', x: -4, y: 1, z, rx: 0, ry: 0.7071, rz: 0, rw: 0.7071 });
    pieces.push({ prefab: 'stonewall4x2', x: -4, y: 3, z, rx: 0, ry: 0.7071, rz: 0, rw: 0.7071 });
    pieces.push({ prefab: 'stonewall4x2', x: 4, y: 1, z, rx: 0, ry: -0.7071, rz: 0, rw: 0.7071 });
    pieces.push({ prefab: 'stonewall4x2', x: 4, y: 3, z, rx: 0, ry: -0.7071, rz: 0, rw: 0.7071 });
  }

  // North Back Wall (z = -4)
  for (let x = -2; x <= 2; x += 4) {
    pieces.push({ prefab: 'stonewall4x2', x, y: 1, z: -4, rx: 0, ry: 0, rz: 0, rw: 1 });
    pieces.push({ prefab: 'stonewall4x2', x, y: 3, z: -4, rx: 0, ry: 0, rz: 0, rw: 1 });
  }

  // South Front Wall with Arched Gate (z = 4, height y = 1 to 5)
  // Left wall section (x = -3, width 2m, height 1 to 5)
  pieces.push({ prefab: 'stonewall2x1', x: -3, y: 1, z: 4, rx: 0, ry: 1, rz: 0, rw: 0 });
  pieces.push({ prefab: 'stonewall2x1', x: -3, y: 2, z: 4, rx: 0, ry: 1, rz: 0, rw: 0 });
  pieces.push({ prefab: 'stonewall2x1', x: -3, y: 3, z: 4, rx: 0, ry: 1, rz: 0, rw: 0 });
  pieces.push({ prefab: 'stonewall2x1', x: -3, y: 4, z: 4, rx: 0, ry: 1, rz: 0, rw: 0 });

  // Left door jamb (x = -1.5, width 1m, height 1 to 5)
  pieces.push({ prefab: 'stonewall1x1', x: -1.5, y: 1, z: 4, rx: 0, ry: 1, rz: 0, rw: 0 });
  pieces.push({ prefab: 'stonewall1x1', x: -1.5, y: 2, z: 4, rx: 0, ry: 1, rz: 0, rw: 0 });
  pieces.push({ prefab: 'stonewall1x1', x: -1.5, y: 3, z: 4, rx: 0, ry: 1, rz: 0, rw: 0 });
  pieces.push({ prefab: 'stonewall1x1', x: -1.5, y: 4, z: 4, rx: 0, ry: 1, rz: 0, rw: 0 });

  // Right door jamb (x = 1.5, width 1m, height 1 to 5)
  pieces.push({ prefab: 'stonewall1x1', x: 1.5, y: 1, z: 4, rx: 0, ry: 1, rz: 0, rw: 0 });
  pieces.push({ prefab: 'stonewall1x1', x: 1.5, y: 2, z: 4, rx: 0, ry: 1, rz: 0, rw: 0 });
  pieces.push({ prefab: 'stonewall1x1', x: 1.5, y: 3, z: 4, rx: 0, ry: 1, rz: 0, rw: 0 });
  pieces.push({ prefab: 'stonewall1x1', x: 1.5, y: 4, z: 4, rx: 0, ry: 1, rz: 0, rw: 0 });

  // Right wall section (x = 3, width 2m, height 1 to 5)
  pieces.push({ prefab: 'stonewall2x1', x: 3, y: 1, z: 4, rx: 0, ry: 1, rz: 0, rw: 0 });
  pieces.push({ prefab: 'stonewall2x1', x: 3, y: 2, z: 4, rx: 0, ry: 1, rz: 0, rw: 0 });
  pieces.push({ prefab: 'stonewall2x1', x: 3, y: 3, z: 4, rx: 0, ry: 1, rz: 0, rw: 0 });
  pieces.push({ prefab: 'stonewall2x1', x: 3, y: 4, z: 4, rx: 0, ry: 1, rz: 0, rw: 0 });

  // Grand Arched Doorway (2m opening from x = -1 to x = 1)
  pieces.push({ prefab: 'stone_arch', x: 0, y: 3, z: 4, rx: 0, ry: 1, rz: 0, rw: 0 });
  pieces.push({ prefab: 'stonewall2x1', x: 0, y: 4, z: 4, rx: 0, ry: 1, rz: 0, rw: 0 });
  pieces.push({ prefab: 'wood_door', x: 0, y: 1, z: 4, rx: 0, ry: 1, rz: 0, rw: 0 });
  pieces.push({ prefab: 'stone_stair', x: 0, y: 0.1, z: 5.2, rx: 0, ry: 1, rz: 0, rw: 0 });

  // Center Roaring Mountain Hearth Pit
  pieces.push({ prefab: 'hearth', x: 0, y: 0.1, z: 0, rx: 0, ry: 0, rz: 0, rw: 1 });

  // Long Feast Tables & Seating
  pieces.push({ prefab: 'piece_table', x: -2, y: 0.1, z: 0, rx: 0, ry: 0.7071, rz: 0, rw: 0.7071 });
  pieces.push({ prefab: 'piece_chair', x: -3.2, y: 0.1, z: 0, rx: 0, ry: 0.7071, rz: 0, rw: 0.7071 });
  pieces.push({ prefab: 'piece_table', x: 2, y: 0.1, z: 0, rx: 0, ry: -0.7071, rz: 0, rw: 0.7071 });
  pieces.push({ prefab: 'piece_chair', x: 3.2, y: 0.1, z: 0, rx: 0, ry: -0.7071, rz: 0, rw: 0.7071 });

  // Brewery Corner: 2 Mead Fermenters
  pieces.push({ prefab: 'fermenter', x: -2.5, y: 0.1, z: -2.5, rx: 0, ry: 0, rz: 0, rw: 1 });
  pieces.push({ prefab: 'fermenter', x: -1, y: 0.1, z: -2.5, rx: 0, ry: 0, rz: 0, rw: 1 });

  // Traveler's Bunk & Locker
  pieces.push({ prefab: 'bed', x: 2.5, y: 0.1, z: -2.5, rx: 0, ry: 0, rz: 0, rw: 1 });
  pieces.push({ prefab: 'piece_chest_wood', x: 1, y: 0.1, z: -2.5, rx: 0, ry: 0, rz: 0, rw: 1 });

  // Rooftop Lookout Battlement Floor sitting flush on 4m walls (y = 4.0)
  for (let x = -3; x <= 3; x += 2) {
    for (let z = -3; z <= 3; z += 2) {
      pieces.push({ prefab: 'woodfloor2x2', x, y: 4, z, rx: 0, ry: 0, rz: 0, rw: 1 });
    }
  }

  // Stone Parapet Battlements on Roof (sitting on y = 4.0 floor, center at y = 4.5)
  for (let z = -3; z <= 3; z += 2) {
    pieces.push({ prefab: 'stonewall1x1', x: -4, y: 4.5, z, rx: 0, ry: 0.7071, rz: 0, rw: 0.7071 });
    pieces.push({ prefab: 'stonewall1x1', x: 4, y: 4.5, z, rx: 0, ry: -0.7071, rz: 0, rw: 0.7071 });
  }
  for (let x = -3; x <= 3; x += 2) {
    pieces.push({ prefab: 'stonewall1x1', x, y: 4.5, z: -4, rx: 0, ry: 0, rz: 0, rw: 1 });
    pieces.push({ prefab: 'stonewall1x1', x, y: 4.5, z: 4, rx: 0, ry: 1, rz: 0, rw: 0 });
  }

  // Iron Braziers on Roof Corners & Front Entrance
  pieces.push({ prefab: 'piece_groundtorch', x: -3.5, y: 5.5, z: -3.5, rx: 0, ry: 0, rz: 0, rw: 1 });
  pieces.push({ prefab: 'piece_groundtorch', x: 3.5, y: 5.5, z: -3.5, rx: 0, ry: 0, rz: 0, rw: 1 });
  pieces.push({ prefab: 'piece_groundtorch', x: -3.5, y: 5.5, z: 3.5, rx: 0, ry: 0, rz: 0, rw: 1 });
  pieces.push({ prefab: 'piece_groundtorch', x: 3.5, y: 5.5, z: 3.5, rx: 0, ry: 0, rz: 0, rw: 1 });
  pieces.push({ prefab: 'piece_groundtorch', x: -1.5, y: 0.1, z: 4.8, rx: 0, ry: 0, rz: 0, rw: 1 });
  pieces.push({ prefab: 'piece_groundtorch', x: 1.5, y: 0.1, z: 4.8, rx: 0, ry: 0, rz: 0, rw: 1 });

  return pieces;
}

const FROSTPEAK_TAVERN_PIECES = createFrostpeakTavernPieces();
const WOLFSTONE_TAVERN_PIECES = createWolfstoneTavernPieces();

export const DEFAULT_PRESET_BLUEPRINTS: Blueprint[] = [
  {
    id: 'preset_frostpeak_tavern',
    name: 'Frostpeak Hearth Tavern',
    author: 'Viking Mountain Architects',
    description: 'Cozy alpine tavern lodge built for snow peaks. Features stone foundation, grand hearth, feast table, brewing corner, and guest bunks.',
    category: 'Viking',
    pieces: FROSTPEAK_TAVERN_PIECES,
    totalPieces: FROSTPEAK_TAVERN_PIECES.length,
    materials: calculateMaterials(FROSTPEAK_TAVERN_PIECES),
  },
  {
    id: 'preset_wolfstone_tavern',
    name: 'Wolfstone Keep & Mead Hall',
    author: 'Nordic Fortress Guild',
    description: 'Heavy fortified mountain tavern with stone arched gate, central hearth pit, mead fermenters, and rooftop drake-watching battlements.',
    category: 'Defense',
    pieces: WOLFSTONE_TAVERN_PIECES,
    totalPieces: WOLFSTONE_TAVERN_PIECES.length,
    materials: calculateMaterials(WOLFSTONE_TAVERN_PIECES),
  },
  {
    id: 'preset_viking_longhouse',
    name: 'Viking Mead Hall & Longhouse',
    author: 'Valheim Architects',
    description: 'Traditional Nordic wooden longhouse with hearth fireplace, bed, rafters, workbench, and double gables.',
    category: 'Viking',
    pieces: VIKING_LONGHOUSE_PIECES,
    totalPieces: VIKING_LONGHOUSE_PIECES.length,
    materials: calculateMaterials(VIKING_LONGHOUSE_PIECES),
  },
  {
    id: 'preset_portal_nexus',
    name: 'Hexagonal Portal Hub',
    author: 'Odin Engineering',
    description: 'Circular waypoint hub with 6 portal bays, central stone courtyard, and green guck torches for all your travel destinations.',
    category: 'Portal',
    pieces: PORTAL_HUB_PIECES,
    totalPieces: PORTAL_HUB_PIECES.length,
    materials: calculateMaterials(PORTAL_HUB_PIECES),
  },
  {
    id: 'preset_watchtower',
    name: 'Fortified Stone Keep & Tower',
    author: 'Viking Builders Guild',
    description: '3-story stone defense keep with battlements, observation deck, arrow slits, and iron torches.',
    category: 'Defense',
    pieces: WATCHTOWER_PIECES,
    totalPieces: WATCHTOWER_PIECES.length,
    materials: calculateMaterials(WATCHTOWER_PIECES),
  },
  {
    id: 'preset_blacksmith_workshop',
    name: 'Master Forge & Smelting Workshop',
    author: 'Svartalfheim Smiths',
    description: 'Complete metalworking outpost featuring smelter, charcoal kiln, reinforced forge, workbench, and iron chests.',
    category: 'Workshop',
    pieces: WORKSHOP_PIECES,
    totalPieces: WORKSHOP_PIECES.length,
    materials: calculateMaterials(WORKSHOP_PIECES),
  },
];
