import rawItems from './valheimItems.json';
import { CatalogItem } from '../types';

export const VALHEIM_ITEMS: CatalogItem[] = rawItems as CatalogItem[];

// Fast lookup by prefab
export const ITEMS_BY_PREFAB = new Map<string, CatalogItem>();
// Fast lookup by hash
export const ITEMS_BY_HASH = new Map<number, CatalogItem>();

for (const item of VALHEIM_ITEMS) {
  ITEMS_BY_PREFAB.set(item.prefab, item);
  ITEMS_BY_HASH.set(item.hash, item);
}

export function getItemByHash(hash: number): CatalogItem | undefined {
  return ITEMS_BY_HASH.get(hash);
}

export function getItemByPrefab(prefab: string): CatalogItem | undefined {
  return ITEMS_BY_PREFAB.get(prefab);
}

export function getItemIconUrl(item?: { icon?: string; prefab?: string; category?: string }): string {
  if (item?.icon) {
    return `./icons/${item.icon}`;
  }
  // Category fallbacks
  const cat = item?.category?.toLowerCase() || '';
  if (cat === 'weapons') return './icons/SwordIron.png';
  if (cat === 'armor') return './icons/ArmorLeatherChest.png';
  if (cat === 'shields') return './icons/shield_wood0.png';
  if (cat === 'tools') return './icons/hammer.png';
  if (cat === 'consumables') return './icons/meat_cooked.png';
  if (cat === 'materials') return './icons/wood.png';
  if (cat === 'trophies') return './icons/TrophyBoar.png';
  if (cat === 'valuables') return './icons/coins.png';
  return './icons/walknut_bw.png';
}

/**
 * Calculates the exact maximum durability of an item based on its prefab, quality level,
 * and base catalog statistics according to Valheim's ItemDrop engine mechanics.
 */
export function getItemMaxDurability(
  item: { hash: number; quality?: number; durability?: number },
  catalog?: CatalogItem
): number {
  const cat = catalog || getItemByHash(item.hash);
  if (!cat) return 100;

  // Items without durability (food, materials, mead, arrows, trophies, coins)
  if (!cat.maxDurability || cat.maxDurability <= 0) {
    return 100;
  }

  const quality = Math.max(1, item.quality || 1);
  const baseDurability = cat.maxDurability;

  // Valheim ItemDrop.cs durabilityPerLevel scaling:
  // - Hoe: +200 / upgrade level (base 200 -> lv4 = 800)
  // - Hammer & Cultivator: +100 / upgrade level (base 100 -> lv4 = 400)
  // - Armor (chests, legs, helms, capes): 0 per level for light/medium, or fixed base
  // - All weapons, shields, tools (Pickaxes, Axes, Swords, Maces, Bows, etc.): +50 / upgrade level
  let durPerLevel = 50;
  const prefabLower = cat.prefab?.toLowerCase() || '';
  const catType = cat.category?.toLowerCase() || '';

  if (prefabLower === 'hoe') {
    durPerLevel = 200;
  } else if (prefabLower === 'hammer' || prefabLower === 'cultivator') {
    durPerLevel = 100;
  } else if (catType === 'armor') {
    durPerLevel = 0;
  }

  const calculatedMax = baseDurability + (quality - 1) * durPerLevel;
  return calculatedMax;
}

