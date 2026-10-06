import React, { useState } from 'react';
import { InventoryItem } from '../types';
import { getItemByHash, getItemIconUrl, getItemMaxDurability } from '../data/items';
import { X, Trash2, Wrench, Shield, Check, ArrowRightLeft } from 'lucide-react';

interface ItemEditModalProps {
  item: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateItem: (updatedItem: InventoryItem) => void;
  onDeleteItem: (itemId: string) => void;
  onMoveItem: (item: InventoryItem, targetSlot: { x: number; y: number }) => void;
  occupiedSlots: Set<string>;
}

export const ItemEditModal: React.FC<ItemEditModalProps> = ({
  item,
  isOpen,
  onClose,
  onUpdateItem,
  onDeleteItem,
  onMoveItem,
  occupiedSlots,
}) => {
  if (!isOpen || !item) return null;

  const catalog = getItemByHash(item.hash);
  const iconUrl = getItemIconUrl(catalog || { prefab: item.prefab });

  const [stack, setStack] = useState(item.stack);
  const [durability, setDurability] = useState(item.durability);
  const [quality, setQuality] = useState(item.quality);
  const [equipped, setEquipped] = useState(item.equipped);
  const [targetSlotCoord, setTargetSlotCoord] = useState(`${item.gridX},${item.gridY}`);

  const maxDur = getItemMaxDurability({ hash: item.hash, quality }, catalog);
  const maxStack = catalog?.maxStack || 50;

  const handleSave = () => {
    // Check if slot changed
    const [nx, ny] = targetSlotCoord.split(',').map(Number);
    if (nx !== item.gridX || ny !== item.gridY) {
      onMoveItem(item, { x: nx, y: ny });
    }

    onUpdateItem({
      ...item,
      stack: Math.max(1, stack),
      durability: Math.max(0, durability),
      quality,
      equipped,
      gridX: nx,
      gridY: ny,
    });
    onClose();
  };

  const handleRepair = () => {
    setDurability(maxDur);
  };

  const handleMaxStack = () => {
    setStack(maxStack);
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${catalog?.name || 'this item'}?`)) {
      onDeleteItem(item.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-valheim-dark border-2 border-valheim-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-valheim-panel border-b border-valheim-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-valheim font-bold text-valheim-gold text-base tracking-wide">
              Item Inspector & Editor
            </h3>
            <span className="text-xs px-2 py-0.5 rounded bg-valheim-slot border border-valheim-border text-gray-400 font-mono">
              Slot ({item.gridX + 1}, {item.gridY + 1})
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded hover:bg-valheim-slot flex items-center justify-center text-gray-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4">
          {/* Item Banner */}
          <div className="flex items-center gap-3.5 pb-3.5 border-b border-valheim-border/70">
            <div
              className="w-16 h-16 rounded border-2 border-valheim-brass flex items-center justify-center bg-valheim-slot shrink-0 shadow"
              style={{
                backgroundImage: 'url(./ui/item_bkg.png)',
                backgroundSize: 'cover',
              }}
            >
              <img src={iconUrl} alt={catalog?.name || 'Item'} className="w-12 h-12 object-contain drop-shadow" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-valheim font-bold text-valheim-gold text-lg truncate">
                {catalog?.name || item.prefab || 'Unknown Item'}
              </h4>
              <p className="text-xs text-gray-400 font-mono">Prefab: {catalog?.prefab || item.prefab}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] uppercase font-bold text-gray-400 px-2 py-0.5 rounded bg-valheim-panel border border-valheim-border/60">
                  {catalog?.category || 'Item'}
                </span>
                {item.crafterName && (
                  <span className="text-[10px] text-amber-300">
                    Crafted by: {item.crafterName}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stack Quantity */}
          <div>
            <div className="flex justify-between items-center text-xs text-gray-300 mb-1">
              <span className="font-semibold">Quantity / Stack:</span>
              <span className="font-mono text-valheim-gold font-bold">{stack} / {maxStack}</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={1}
                max={Math.max(maxStack, 100)}
                value={stack}
                onChange={(e) => setStack(Number(e.target.value))}
                className="w-full accent-valheim-brass"
              />
              <input
                type="number"
                min={1}
                max={999}
                value={stack}
                onChange={(e) => setStack(Number(e.target.value))}
                className="w-16 px-2 py-1 bg-valheim-slot border border-valheim-border rounded text-center text-xs font-mono text-gray-200"
              />
              <button
                onClick={handleMaxStack}
                className="px-2.5 py-1 rounded bg-valheim-panel hover:bg-valheim-slothover border border-valheim-border text-xs text-gray-300"
              >
                Max
              </button>
            </div>
          </div>

          {/* Durability */}
          <div>
            <div className="flex justify-between items-center text-xs text-gray-300 mb-1">
              <span className="font-semibold">Durability:</span>
              <span className="font-mono text-valheim-gold font-bold">
                {durability.toFixed(0)} / {maxDur}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={maxDur}
                value={durability}
                onChange={(e) => setDurability(Number(e.target.value))}
                className="w-full accent-valheim-brass"
              />
              <button
                onClick={handleRepair}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/80 text-emerald-300 text-xs font-semibold whitespace-nowrap transition"
                title="Repair item to 100% durability"
              >
                <Wrench className="w-3 h-3 text-emerald-400" />
                Repair
              </button>
            </div>
          </div>

          {/* Quality Stars */}
          {catalog?.slotType !== 'ammo' && catalog?.category !== 'materials' && catalog?.category !== 'consumables' && (
            <div>
              <div className="flex justify-between items-center text-xs text-gray-300 mb-1">
                <span className="font-semibold">Quality Level:</span>
                <span className="text-amber-400 font-bold">{'★'.repeat(quality)}</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[1, 2, 3, 4].map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuality(q)}
                    className={`py-1 rounded text-xs font-bold transition border ${
                      quality === q
                        ? 'bg-amber-800 border-amber-400 text-white shadow'
                        : 'bg-valheim-slot border-valheim-border text-gray-400 hover:border-valheim-brass'
                    }`}
                  >
                    Tier {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Equipped Toggle */}
          <div className="flex items-center justify-between p-2.5 rounded bg-valheim-panel/60 border border-valheim-border/80">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-valheim-brass" />
              <span className="text-xs text-gray-200 font-medium">Equipped Status:</span>
            </div>
            <button
              onClick={() => setEquipped(!equipped)}
              className={`px-3 py-1 rounded text-xs font-bold transition border ${
                equipped
                  ? 'bg-amber-900 border-valheim-gold text-valheim-goldlight'
                  : 'bg-valheim-slot border-valheim-border text-gray-400'
              }`}
            >
              {equipped ? 'Equipped (E)' : 'In Backpack'}
            </button>
          </div>

          {/* Slot Coordinate Selector */}
          <div>
            <div className="flex items-center gap-1.5 text-xs text-gray-300 mb-1 font-semibold">
              <ArrowRightLeft className="w-3.5 h-3.5 text-valheim-brass" />
              Move to Slot:
            </div>
            <select
              value={targetSlotCoord}
              onChange={(e) => setTargetSlotCoord(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-valheim-slot border border-valheim-border rounded text-xs text-gray-200 focus:outline-none focus:border-valheim-gold font-mono"
            >
              {Array.from({ length: 4 }).map((_, y) =>
                Array.from({ length: 8 }).map((_, x) => {
                  const coord = `${x},${y}`;
                  const isCurrent = x === item.gridX && y === item.gridY;
                  const isOccupied = occupiedSlots.has(coord);
                  return (
                    <option key={coord} value={coord}>
                      Slot ({x + 1}, {y + 1}) {isCurrent ? '(Current)' : isOccupied ? '(Swap)' : '(Free)'}
                    </option>
                  );
                })
              )}
            </select>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-5 py-3.5 bg-valheim-panel border-t border-valheim-border flex items-center justify-between gap-3">
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-2 rounded bg-red-950/70 hover:bg-red-900 border border-red-700/80 text-red-300 text-xs font-semibold transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Item</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded bg-valheim-slot hover:bg-valheim-slothover border border-valheim-border text-xs text-gray-300 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 rounded bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 border border-valheim-gold text-xs font-valheim font-bold text-white shadow transition"
            >
              <Check className="w-3.5 h-3.5 text-valheim-goldlight" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
