import React from 'react';
import { InventoryItem, CharacterAppearance } from '../types';
import { getItemByHash, getItemIconUrl } from '../data/items';
import { Shield, Sparkles, Crosshair, Shirt, Footprints, HardHat, Compass, Award, Feather, Zap } from 'lucide-react';

interface CharacterPaperDollProps {
  appearance: CharacterAppearance;
  items: InventoryItem[];
  playerName: string;
  onSelectItem: (item: InventoryItem) => void;
  onUnequipItem: (item: InventoryItem) => void;
}

export const CharacterPaperDoll: React.FC<CharacterPaperDollProps> = ({
  appearance,
  items,
  playerName,
  onSelectItem,
  onUnequipItem,
}) => {
  // Find equipped items
  const equippedItems = items.filter((it) => it.equipped);

  let helmet: InventoryItem | undefined;
  let chest: InventoryItem | undefined;
  let legs: InventoryItem | undefined;
  let cape: InventoryItem | undefined;
  let utility: InventoryItem | undefined;
  let weapon: InventoryItem | undefined;
  let shield: InventoryItem | undefined;
  let ammo: InventoryItem | undefined;

  for (const it of equippedItems) {
    const catalog = getItemByHash(it.hash);
    const prefabLower = (catalog?.prefab || '').toLowerCase();
    const cat = (catalog?.category || '').toLowerCase();

    if (prefabLower.includes('helmet') || catalog?.slotType === 'helmet') {
      helmet = it;
    } else if (prefabLower.includes('chest') || prefabLower.includes('tunic') || catalog?.slotType === 'chest') {
      chest = it;
    } else if (prefabLower.includes('legs') || prefabLower.includes('pants') || catalog?.slotType === 'legs') {
      legs = it;
    } else if (prefabLower.includes('cape') || catalog?.slotType === 'cape') {
      cape = it;
    } else if (prefabLower.includes('belt') || prefabLower.includes('wishbone') || catalog?.slotType === 'utility') {
      utility = it;
    } else if (prefabLower.includes('arrow') || prefabLower.includes('bolt') || catalog?.slotType === 'ammo') {
      ammo = it;
    } else if (prefabLower.includes('shield') || cat === 'shields' || catalog?.slotType === 'shield') {
      shield = it;
    } else {
      if (!weapon) {
        weapon = it;
      }
    }
  }

  // Calculate Armor Rating from equipped armor
  let totalArmor = 0;
  const armorValues: Record<string, number> = {
    // Root armor
    helmetroot: 8,
    armorrootchest: 8,
    armorrootlegs: 8,
    // Troll armor
    helmettrollhide: 6,
    armortrollhidechest: 6,
    armortrollhidelegs: 6,
    capetrollhide: 1,
    // Bronze armor
    helmetbronze: 8,
    armorbronzechest: 8,
    armorbronzelegs: 8,
    // Iron armor
    helmetiron: 14,
    armorironchest: 14,
    armorironlegs: 14,
    // Wolf armor
    helmetdrake: 20,
    armorwolfchest: 20,
    armorwolflegs: 20,
    capewolf: 1,
    // Padded armor
    helmetpadded: 26,
    armorpaddedchest: 26,
    armorpaddedlegs: 26,
    capelinen: 1,
    // Carapace armor
    helmetcarapace: 32,
    armorcarapacechest: 32,
    armorcarapacelegs: 32,
    capefeather: 1,
    // Flametal armor
    helmetflametal: 36,
    armorflametalchest: 36,
    armorflametallegs: 36,
    capeasksvin: 1,
    // Leather / Rags
    helmetleather: 2,
    armorleatherchest: 2,
    armorleatherlegs: 2,
    capedeerhide: 1,
    armorragschest: 1,
    armorragslegs: 1,
  };

  const getArmorOf = (it?: InventoryItem) => {
    if (!it) return 0;
    const catalog = getItemByHash(it.hash);
    const key = (catalog?.prefab || '').toLowerCase();
    const base = armorValues[key] || (catalog?.category === 'armor' ? 6 : 0);
    // Add +2 armor per quality tier above 1
    return base + (it.quality - 1) * 2;
  };

  totalArmor += getArmorOf(helmet);
  totalArmor += getArmorOf(chest);
  totalArmor += getArmorOf(legs);
  totalArmor += getArmorOf(cape);

  // Check Set Bonus
  let setBonusText: string | null = null;
  const equippedPrefabs = new Set(
    [helmet, chest, legs, cape]
      .filter(Boolean)
      .map((it) => (getItemByHash(it!.hash)?.prefab || '').toLowerCase())
  );

  if (
    equippedPrefabs.has('helmetroot') &&
    equippedPrefabs.has('armorrootchest') &&
    equippedPrefabs.has('armorrootlegs')
  ) {
    setBonusText = 'Root Set: Bow skill +15 & Pierce Resistance';
  } else if (
    equippedPrefabs.has('helmettrollhide') &&
    equippedPrefabs.has('armortrollhidechest') &&
    equippedPrefabs.has('armortrollhidelegs') &&
    equippedPrefabs.has('capetrollhide')
  ) {
    setBonusText = 'Troll Set: Sneak skill +25%';
  } else if (
    equippedPrefabs.has('helmetfenring') &&
    equippedPrefabs.has('armorfenringchest') &&
    equippedPrefabs.has('armorfenringlegs')
  ) {
    setBonusText = 'Fenris Set: Move speed +9% & Fire Resistance';
  }

  // Convert RGB floats (0..1) to CSS rgb string for swatch display
  const skinR = Math.min(255, Math.max(0, Math.round(appearance.skinColor[0] * 255)));
  const skinG = Math.min(255, Math.max(0, Math.round(appearance.skinColor[1] * 255)));
  const skinB = Math.min(255, Math.max(0, Math.round(appearance.skinColor[2] * 255)));
  const skinCss = `rgb(${skinR}, ${skinG}, ${skinB})`;

  const hairR = Math.min(255, Math.max(0, Math.round(appearance.hairColor[0] * 255)));
  const hairG = Math.min(255, Math.max(0, Math.round(appearance.hairColor[1] * 255)));
  const hairB = Math.min(255, Math.max(0, Math.round(appearance.hairColor[2] * 255)));
  const hairCss = `rgb(${hairR}, ${hairG}, ${hairB})`;

  const renderSlot = (
    label: string,
    slotItem?: InventoryItem,
    slotIcon?: React.ReactNode,
    placeholderName?: string
  ) => {
    const catalog = slotItem ? getItemByHash(slotItem.hash) : undefined;
    const iconUrl = catalog ? getItemIconUrl(catalog) : undefined;
    const maxDur = catalog?.maxDurability || 100;
    const durPercent = slotItem ? Math.min(100, Math.max(0, (slotItem.durability / maxDur) * 100)) : 100;
    const durColor = durPercent > 50 ? 'bg-emerald-500' : durPercent > 20 ? 'bg-amber-500' : 'bg-red-500';

    return (
      <div className="flex flex-col items-center">
        <span className="text-[10px] font-valheim font-semibold text-valheim-gold/80 uppercase tracking-wider mb-1">
          {label}
        </span>
        <div
          onClick={() => slotItem && onSelectItem(slotItem)}
          className={`w-14 h-14 sm:w-16 sm:h-16 rounded border relative flex items-center justify-center transition group select-none ${
            slotItem
              ? 'bg-valheim-slot border-valheim-brass hover:border-valheim-gold hover:shadow-glow cursor-pointer'
              : 'bg-valheim-slot/60 border-valheim-border/60 text-gray-600'
          }`}
          style={{
            backgroundImage: 'url(./ui/item_bkg.png)',
            backgroundSize: 'cover',
          }}
          title={
            slotItem
              ? `${catalog?.name || 'Equipped Item'}\nDurability: ${slotItem.durability}/${maxDur}\nClick to inspect / edit`
              : `Empty ${label} Slot`
          }
        >
          {slotItem && iconUrl ? (
            <>
              <img
                src={iconUrl}
                alt={catalog?.name || 'Equipped'}
                className="w-10 h-10 sm:w-12 sm:h-12 object-contain drop-shadow"
              />
              {/* Stack badge if > 1 */}
              {slotItem.stack > 1 && (
                <span className="absolute bottom-1 right-1 text-[10px] font-bold bg-black/85 px-1 rounded text-white font-mono leading-tight">
                  {slotItem.stack}
                </span>
              )}
              {/* Quality stars */}
              {slotItem.quality > 1 && (
                <span className="absolute top-0.5 left-1 text-[9px] text-amber-400 font-bold drop-shadow">
                  {'★'.repeat(slotItem.quality)}
                </span>
              )}
              {/* Durability bar */}
              <div className="absolute bottom-0 left-1 right-1 h-1 bg-black/80 rounded-full overflow-hidden">
                <div className={`h-full ${durColor}`} style={{ width: `${durPercent}%` }} />
              </div>
              {/* Unequip quick action button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUnequipItem(slotItem);
                }}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-900 border border-red-500 text-white text-[9px] font-bold items-center justify-center hidden group-hover:flex shadow"
                title="Unequip item"
              >
                ✕
              </button>
            </>
          ) : (
            <div className="opacity-30 flex flex-col items-center">
              {slotIcon}
              <span className="text-[9px] mt-0.5">{placeholderName}</span>
            </div>
          )}
        </div>
        <div className="text-[11px] text-gray-300 font-medium text-center truncate max-w-[70px] mt-1">
          {catalog?.name || <span className="text-gray-500 italic">Empty</span>}
        </div>
      </div>
    );
  };

  const weaponCatalog = weapon ? getItemByHash(weapon.hash) : undefined;
  const shieldCatalog = shield ? getItemByHash(shield.hash) : undefined;
  const utilityCatalog = utility ? getItemByHash(utility.hash) : undefined;

  return (
    <div className="bg-valheim-panel/90 border border-valheim-border rounded-lg p-4 sm:p-5 shadow-valheim flex flex-col items-center relative">
      {/* Header */}
      <div className="w-full flex items-center justify-between border-b border-valheim-border/80 pb-3 mb-4">
        <div>
          <h3 className="font-valheim font-bold text-valheim-gold text-lg tracking-wider flex items-center gap-2">
            <Shield className="w-5 h-5 text-valheim-brass" />
            Viking Equipment & Armory
          </h3>
          <p className="text-xs text-gray-400 font-sans">
            Equipped gear, armor ratings & loadout for <span className="text-valheim-goldlight font-semibold">{playerName}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Armor Rating Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-valheim-dark border border-amber-700/70 shadow">
            <Shield className="w-4 h-4 text-valheim-gold" />
            <div className="text-right">
              <span className="text-[9px] uppercase font-bold text-gray-400 block leading-none">Armor</span>
              <span className="text-sm font-bold font-mono text-valheim-gold leading-none">{totalArmor}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Armory Layout: Left Slots + Center Viking Crest Altar + Right Slots */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center w-full max-w-2xl py-1">
        {/* Left Column: Helmet, Chest, Cape, Utility (3 cols) */}
        <div className="md:col-span-3 flex md:flex-col justify-around gap-2.5 sm:gap-3">
          {renderSlot('Helmet', helmet, <HardHat className="w-5 h-5" />, 'Head')}
          {renderSlot('Chest', chest, <Shirt className="w-5 h-5" />, 'Torso')}
          {renderSlot('Cape', cape, <Compass className="w-5 h-5" />, 'Back')}
          {renderSlot('Utility', utility, <Sparkles className="w-5 h-5" />, 'Belt')}
        </div>

        {/* Center: Viking Armory Altar & Combat Stats (6 cols) */}
        <div className="md:col-span-6 flex flex-col items-center justify-center p-4 rounded-xl bg-gradient-to-b from-valheim-dark via-valheim-slot to-valheim-dark border border-valheim-border shadow-valheim text-center relative overflow-hidden">
          {/* Background Runestone Emblem */}
          <img
            src="./ui/walknut_bw.png"
            alt=""
            className="w-28 h-28 opacity-10 absolute center pointer-events-none invert"
          />

          {/* Character Identity Banner */}
          <div className="z-10 mb-3">
            <h4 className="font-valheim font-bold text-xl text-valheim-gold tracking-wide drop-shadow flex items-center justify-center gap-2">
              {playerName}
            </h4>
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1">
              <span className="text-[10px] px-2 py-0.5 rounded bg-valheim-panel border border-valheim-border text-gray-300 font-semibold uppercase tracking-wider">
                {appearance.modelIndex === 0 ? '♂ Male Viking' : '♀ Shieldmaiden'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-valheim-panel border border-valheim-border text-gray-400">
                {appearance.hair || 'Hair'}
              </span>
              {appearance.beard && appearance.beard !== 'none' && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-valheim-panel border border-valheim-border text-gray-400">
                  {appearance.beard}
                </span>
              )}
            </div>

            {/* Color Swatches */}
            <div className="flex items-center justify-center gap-3 mt-2 text-[10px] text-gray-400">
              <div className="flex items-center gap-1">
                <span>Skin:</span>
                <span
                  className="w-3.5 h-3.5 rounded-full border border-black/60 shadow-inner"
                  style={{ backgroundColor: skinCss }}
                  title="Skin Tone"
                />
              </div>
              <div className="flex items-center gap-1">
                <span>Hair:</span>
                <span
                  className="w-3.5 h-3.5 rounded-full border border-black/60 shadow-inner"
                  style={{ backgroundColor: hairCss }}
                  title="Hair & Beard Color"
                />
              </div>
            </div>
          </div>

          {/* Active Set Bonus Banner */}
          {setBonusText && (
            <div className="z-10 w-full mb-3 px-2.5 py-1.5 rounded bg-emerald-950/70 border border-emerald-600/70 text-emerald-300 text-[11px] font-semibold flex items-center justify-center gap-1.5 shadow">
              <Award className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{setBonusText}</span>
            </div>
          )}

          {/* Megingjord Carry Weight Badge */}
          {utilityCatalog?.prefab === 'BeltStrength' && (
            <div className="z-10 w-full mb-3 px-2.5 py-1 rounded bg-amber-950/60 border border-amber-600/60 text-amber-300 text-[11px] font-medium flex items-center justify-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-valheim-stamina shrink-0" />
              <span>Megingjord: +150 Carry Weight (Max: 450)</span>
            </div>
          )}

          {/* Combat Loadout Breakdown */}
          <div className="z-10 w-full space-y-1.5 text-left text-xs bg-valheim-dark/90 p-3 rounded-lg border border-valheim-border/80">
            <div className="flex justify-between items-center text-gray-300">
              <span className="text-gray-400 flex items-center gap-1">
                <Crosshair className="w-3.5 h-3.5 text-amber-500" /> Weapon:
              </span>
              <span className="font-semibold text-valheim-goldlight truncate max-w-[140px]">
                {weaponCatalog?.name || <span className="text-gray-500 font-normal italic">Unarmed</span>}
              </span>
            </div>

            <div className="flex justify-between items-center text-gray-300">
              <span className="text-gray-400 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-blue-400" /> Shield:
              </span>
              <span className="font-semibold text-valheim-goldlight truncate max-w-[140px]">
                {shieldCatalog?.name || <span className="text-gray-500 font-normal italic">None</span>}
              </span>
            </div>

            <div className="flex justify-between items-center text-gray-300">
              <span className="text-gray-400 flex items-center gap-1">
                <Feather className="w-3.5 h-3.5 text-emerald-400" /> Ammo:
              </span>
              <span className="font-semibold text-valheim-goldlight truncate max-w-[140px]">
                {ammo ? `${getItemByHash(ammo.hash)?.name} (${ammo.stack})` : <span className="text-gray-500 font-normal italic">None</span>}
              </span>
            </div>

            <div className="pt-1.5 mt-1 border-t border-valheim-border/60 flex justify-between items-center">
              <span className="text-gray-400 font-semibold">Total Armor Value:</span>
              <span className="font-mono text-sm font-bold text-valheim-gold">{totalArmor}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Weapon, Shield, Legs, Ammo (3 cols) */}
        <div className="md:col-span-3 flex md:flex-col justify-around gap-2.5 sm:gap-3">
          {renderSlot('Weapon', weapon, <Crosshair className="w-5 h-5" />, 'Main Hand')}
          {renderSlot('Shield', shield, <Shield className="w-5 h-5" />, 'Off Hand')}
          {renderSlot('Legs', legs, <Footprints className="w-5 h-5" />, 'Legs')}
          {renderSlot('Ammo', ammo, <Crosshair className="w-5 h-5 rotate-45" />, 'Ammo')}
        </div>
      </div>
    </div>
  );
};
