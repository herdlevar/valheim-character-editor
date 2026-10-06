import React, { useState } from 'react';
import { InventoryItem } from '../types';
import { getItemByHash, getItemIconUrl, getItemMaxDurability } from '../data/items';
import { Plus, Sparkles, Weight, Wrench } from 'lucide-react';

interface InventoryGridProps {
  items: InventoryItem[];
  gridRows: number;
  onGridRowsChange: (rows: number) => void;
  onSelectItem: (item: InventoryItem) => void;
  onOpenSpawner: (targetSlot?: { x: number; y: number }) => void;
  onMoveItem: (sourceItem: InventoryItem, targetSlot: { x: number; y: number }) => void;
  onRepairAll?: () => void;
}

export const InventoryGrid: React.FC<InventoryGridProps> = ({
  items,
  gridRows,
  onGridRowsChange,
  onSelectItem,
  onOpenSpawner,
  onMoveItem,
  onRepairAll,
}) => {
  const [draggedItem, setDraggedItem] = useState<InventoryItem | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<{ x: number; y: number } | null>(null);

  // Total slots: 8 columns x N rows
  const COLS = 8;
  const ROWS = gridRows;

  // Map items by grid coordinates: "x,y"
  const itemMap = new Map<string, InventoryItem>();
  for (const item of items) {
    itemMap.set(`${item.gridX},${item.gridY}`, item);
  }

  // Calculate total weight
  let totalWeight = 0;
  for (const item of items) {
    const catalog = getItemByHash(item.hash);
    const weightPer = catalog?.weight ?? 2.0;
    totalWeight += weightPer * item.stack;
  }

  const handleDragStart = (e: React.DragEvent, item: InventoryItem) => {
    setDraggedItem(item);
    e.dataTransfer.setData('text/plain', item.id);
  };

  const handleDragOver = (e: React.DragEvent, x: number, y: number) => {
    e.preventDefault();
    setDragOverSlot({ x, y });
  };

  const handleDrop = (e: React.DragEvent, targetX: number, targetY: number) => {
    e.preventDefault();
    setDragOverSlot(null);
    if (draggedItem) {
      onMoveItem(draggedItem, { x: targetX, y: targetY });
      setDraggedItem(null);
    }
  };

  return (
    <div className="bg-valheim-panel/90 border border-valheim-border rounded-lg p-4 sm:p-5 shadow-valheim relative">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-valheim-border/80 pb-3 mb-4">
        <div className="flex items-center gap-3">
          <h3 className="font-valheim font-bold text-valheim-gold text-lg tracking-wider">
            Inventory
          </h3>
          <span className="text-xs px-2.5 py-0.5 rounded bg-valheim-dark border border-valheim-border text-gray-300 font-mono">
            {items.length} / {COLS * ROWS} Slots
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Weight className="w-3.5 h-3.5 text-valheim-brass" />
            <span className="font-mono text-gray-300">{totalWeight.toFixed(1)}</span> / 300
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Rows Selector */}
          <div className="flex items-center gap-1.5 mr-2">
            <span className="text-xs text-gray-400">Rows:</span>
            <select
              value={gridRows}
              onChange={(e) => onGridRowsChange(parseInt(e.target.value, 10))}
              className="bg-valheim-dark border border-valheim-border text-xs text-gray-300 rounded px-1.5 py-1 focus:outline-none focus:border-valheim-gold"
            >
              <option value={4}>4 (Base)</option>
              <option value={5}>5 (Wider Pockets)</option>
              <option value={6}>6 (Deeper Pockets)</option>
            </select>
          </div>

          {/* Repair All Button */}
          {onRepairAll && (
            <button
              onClick={onRepairAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-600/70 text-emerald-300 text-xs font-valheim font-semibold transition shadow hover:shadow-[0_0_12px_rgba(16,185,129,0.3)] active:scale-95"
              title="Repair all weapons, armor, tools, and shields to 100% durability"
            >
              <Wrench className="w-3.5 h-3.5 text-emerald-400" />
              <span>Repair All</span>
            </button>
          )}

          {/* Add Item Spawner Button */}
          <button
            onClick={() => onOpenSpawner()}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded bg-gradient-to-r from-valheim-wood via-amber-900/60 to-valheim-wood hover:from-amber-800 hover:to-amber-900 border border-valheim-brass text-valheim-goldlight text-xs font-valheim font-bold transition shadow hover:shadow-glow active:scale-95"
          >
            <Plus className="w-4 h-4 text-valheim-gold" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* 8x4 Grid Container */}
      <div className="flex justify-center overflow-x-auto pb-2">
        <div className="grid grid-cols-8 gap-1.5 sm:gap-2 select-none min-w-[540px]">
          {Array.from({ length: ROWS }).map((_, y) =>
            Array.from({ length: COLS }).map((_, x) => {
              const item = itemMap.get(`${x},${y}`);
              const catalog = item ? getItemByHash(item.hash) : undefined;
              const iconUrl = catalog ? getItemIconUrl(catalog) : undefined;
              const isHotbar = y === 0;
              const isOver = dragOverSlot?.x === x && dragOverSlot?.y === y;

              // Durability percentage (0..100)
              const maxDur = item ? getItemMaxDurability(item, catalog) : (catalog?.maxDurability || 100);
              const durPercent = item ? Math.min(100, Math.max(0, (item.durability / maxDur) * 100)) : 100;
              const durColor =
                durPercent > 50
                  ? 'bg-emerald-500'
                  : durPercent > 20
                  ? 'bg-amber-500'
                  : 'bg-red-500';

              return (
                <div
                  key={`${x}-${y}`}
                  onDragOver={(e) => handleDragOver(e, x, y)}
                  onDrop={(e) => handleDrop(e, x, y)}
                  onClick={() => {
                    if (item) {
                      onSelectItem(item);
                    } else {
                      onOpenSpawner({ x, y });
                    }
                  }}
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded border relative flex items-center justify-center transition group cursor-pointer ${
                    isOver
                      ? 'border-valheim-gold bg-amber-900/40 shadow-glow scale-105 z-10'
                      : item
                      ? 'border-valheim-border hover:border-valheim-gold bg-valheim-slot hover:bg-valheim-slothover shadow'
                      : 'border-valheim-border/40 hover:border-valheim-brass/80 bg-valheim-slot/40 hover:bg-valheim-slot/80'
                  }`}
                  style={{
                    backgroundImage: 'url(./ui/item_bkg.png)',
                    backgroundSize: 'cover',
                  }}
                  title={
                    item
                      ? `${catalog?.name || 'Item'} (Durability: ${item.durability}/${maxDur}, Stack: ${item.stack})\nClick to inspect / edit`
                      : `Slot (${x + 1}, ${y + 1})\nClick to add item here`
                  }
                  draggable={!!item}
                  onDragStart={(e) => item && handleDragStart(e, item)}
                >
                  {/* Hotbar Number for Row 1 */}
                  {isHotbar && (
                    <span className="absolute top-0.5 right-1 text-[9px] font-mono text-gray-500 font-bold pointer-events-none">
                      {x + 1}
                    </span>
                  )}

                  {/* Empty Slot Hover Indicator */}
                  {!item && (
                    <div className="opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                      <Plus className="w-5 h-5 text-valheim-gold/70" />
                    </div>
                  )}

                  {/* Item Content */}
                  {item && (
                    <>
                      {/* Item Icon */}
                      <img
                        src={iconUrl}
                        alt={catalog?.name || 'Item'}
                        className="w-10 h-10 sm:w-11 sm:h-11 object-contain drop-shadow transition group-hover:scale-105 pointer-events-none"
                      />

                      {/* Equipped Marker "E" */}
                      {item.equipped && (
                        <span className="absolute top-0.5 right-1 text-[10px] font-bold text-valheim-gold font-valheim drop-shadow">
                          E
                        </span>
                      )}

                      {/* Quality Stars */}
                      {item.quality > 1 && (
                        <span className="absolute top-0.5 left-1 text-[9px] text-amber-400 font-bold leading-none drop-shadow">
                          {'★'.repeat(item.quality)}
                        </span>
                      )}

                      {/* Stack Badge */}
                      {item.stack > 1 && (
                        <span className="absolute bottom-1 right-1 text-[10px] sm:text-[11px] font-bold bg-black/85 px-1 rounded text-gray-100 font-mono leading-tight shadow">
                          {item.stack}
                        </span>
                      )}

                      {/* Durability Bar */}
                      {catalog?.maxDurability && catalog.maxDurability > 0 && (
                        <div className="absolute bottom-0 left-1 right-1 h-1 bg-black/80 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${durColor} transition-all`}
                            style={{ width: `${durPercent}%` }}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Grid Controls Hint */}
      <div className="mt-3 pt-2 border-t border-valheim-border/60 flex flex-wrap items-center justify-between text-xs text-gray-400">
        <div>
          <span className="text-valheim-gold/80 font-medium">Tips:</span> Drag & drop items to reorganize slots &bull; Click any item to edit, repair, or delete &bull; Click empty slot to spawn
        </div>
        <div className="text-[11px] text-gray-500 font-mono">
          Slots 1–8 correspond to keyboard hotbar
        </div>
      </div>
    </div>
  );
};
