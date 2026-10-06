import React, { useState, useMemo } from 'react';
import { VALHEIM_ITEMS, getItemIconUrl } from '../data/items';
import { CatalogItem, ItemCategory } from '../types';
import { Search, X, Plus, Sparkles, Filter } from 'lucide-react';

interface ItemSpawnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSpawnItem: (catalogItem: CatalogItem, options: { stack: number; quality: number }, targetSlot?: { x: number; y: number }) => void;
  targetSlot?: { x: number; y: number } | null;
}

export const ItemSpawnerModal: React.FC<ItemSpawnerModalProps> = ({
  isOpen,
  onClose,
  onSpawnItem,
  targetSlot,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory>('all');
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [spawnStack, setSpawnStack] = useState(1);
  const [spawnQuality, setSpawnQuality] = useState(1);

  const categories: { id: ItemCategory; label: string }[] = [
    { id: 'all', label: 'All Items' },
    { id: 'weapons', label: 'Weapons' },
    { id: 'armor', label: 'Armor' },
    { id: 'shields', label: 'Shields' },
    { id: 'tools', label: 'Tools' },
    { id: 'consumables', label: 'Food & Mead' },
    { id: 'materials', label: 'Materials' },
    { id: 'trophies', label: 'Trophies' },
    { id: 'valuables', label: 'Valuables' },
  ];

  // Filter items
  const filteredItems = useMemo(() => {
    let result = VALHEIM_ITEMS;

    if (selectedCategory !== 'all') {
      result = result.filter((it) => it.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (it) =>
          it.name.toLowerCase().includes(q) ||
          it.prefab.toLowerCase().includes(q) ||
          (it.aliases && it.aliases.some((a) => a.toLowerCase().includes(q)))
      );
    }

    return result;
  }, [selectedCategory, searchQuery]);

  const handleSelectItem = (item: CatalogItem) => {
    setSelectedItem(item);
    setSpawnStack(item.maxStack);
    setSpawnQuality(1);
  };

  const handleSpawn = () => {
    if (selectedItem) {
      onSpawnItem(
        selectedItem,
        { stack: Math.max(1, spawnStack), quality: spawnQuality },
        targetSlot || undefined
      );
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-valheim-dark border-2 border-valheim-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-valheim-panel border-b border-valheim-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-valheim-gold" />
            <h3 className="font-valheim font-bold text-valheim-gold text-lg tracking-wider">
              Valheim Item Spawner
            </h3>
            {targetSlot && (
              <span className="text-xs px-2 py-0.5 rounded bg-valheim-dark border border-valheim-brass/60 text-valheim-goldlight font-mono">
                Target: Slot ({targetSlot.x + 1}, {targetSlot.y + 1})
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded hover:bg-valheim-slot flex items-center justify-center text-gray-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Categories Bar */}
        <div className="p-4 bg-valheim-dark/95 border-b border-valheim-border/70 flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search 1,000+ items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-valheim-slot border border-valheim-border rounded text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-valheim-gold transition font-sans"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
                  selectedCategory === cat.id
                    ? 'bg-valheim-brass text-black font-bold shadow'
                    : 'bg-valheim-panel hover:bg-valheim-slothover text-gray-300 border border-valheim-border/60'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Body: Item Grid + Selection Preview */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-valheim-border">
          {/* Left 2 Cols: Catalog Grid */}
          <div className="md:col-span-2 overflow-y-auto p-4 max-h-[50vh] md:max-h-full">
            <div className="text-xs text-gray-400 mb-2 font-mono">
              Found {filteredItems.length} items
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {filteredItems.map((item) => {
                const isSelected = selectedItem?.prefab === item.prefab;
                const iconUrl = getItemIconUrl(item);

                return (
                  <div
                    key={item.prefab}
                    onClick={() => handleSelectItem(item)}
                    className={`flex items-center gap-2.5 p-2 rounded border cursor-pointer transition select-none ${
                      isSelected
                        ? 'border-valheim-gold bg-amber-950/60 shadow-glow'
                        : 'border-valheim-border/60 bg-valheim-panel/70 hover:border-valheim-brass hover:bg-valheim-slothover'
                    }`}
                  >
                    <div
                      className="w-11 h-11 rounded border border-valheim-border flex items-center justify-center bg-valheim-slot shrink-0"
                      style={{
                        backgroundImage: 'url(./ui/item_bkg.png)',
                        backgroundSize: 'cover',
                      }}
                    >
                      <img
                        src={iconUrl}
                        alt={item.name}
                        className="w-9 h-9 object-contain drop-shadow"
                      />
                    </div>
                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="text-xs font-semibold text-gray-200 truncate" title={item.name}>
                        {item.name}
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono truncate">
                        {item.prefab}
                      </div>
                      <div className="text-[9px] text-valheim-gold/80 mt-0.5">
                        Stack: {item.maxStack}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Col: Selected Item Details & Spawn Settings */}
          <div className="p-5 flex flex-col justify-between bg-valheim-panel/40">
            {selectedItem ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center text-center pb-3 border-b border-valheim-border">
                  <div
                    className="w-20 h-20 rounded-lg border-2 border-valheim-brass flex items-center justify-center bg-valheim-slot shadow-glow mb-2"
                    style={{
                      backgroundImage: 'url(./ui/item_bkg.png)',
                      backgroundSize: 'cover',
                    }}
                  >
                    <img
                      src={getItemIconUrl(selectedItem)}
                      alt={selectedItem.name}
                      className="w-16 h-16 object-contain drop-shadow"
                    />
                  </div>
                  <h4 className="font-valheim font-bold text-valheim-gold text-base tracking-wide">
                    {selectedItem.name}
                  </h4>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">
                    {selectedItem.prefab}
                  </p>
                  <span className="mt-1 px-2 py-0.5 rounded text-[10px] bg-valheim-dark border border-valheim-border uppercase text-gray-300 font-semibold">
                    Category: {selectedItem.category}
                  </span>
                  {selectedItem.description && (
                    <p className="text-xs text-gray-300 italic mt-2 px-2 py-1.5 rounded bg-valheim-dark/60 border border-valheim-border/40 text-center leading-relaxed">
                      "{selectedItem.description}"
                    </p>
                  )}
                </div>

                {/* Stack Count Configuration */}
                {selectedItem.maxStack > 1 ? (
                  <div>
                    <div className="flex justify-between items-center text-xs text-gray-300 mb-1">
                      <span className="font-semibold">Quantity / Stack:</span>
                      <div className="flex items-center gap-1.5 font-mono">
                        <input
                          type="number"
                          min={1}
                          max={selectedItem.maxStack * 5}
                          value={spawnStack}
                          onChange={(e) => setSpawnStack(Math.max(1, Number(e.target.value) || 1))}
                          className="w-16 px-1.5 py-0.5 rounded bg-valheim-slot border border-valheim-border text-valheim-gold font-bold text-right text-xs focus:outline-none focus:border-valheim-gold"
                        />
                        <span className="text-gray-400 text-xs">/ {selectedItem.maxStack}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={1}
                        max={selectedItem.maxStack}
                        value={Math.min(spawnStack, selectedItem.maxStack)}
                        onChange={(e) => setSpawnStack(Number(e.target.value))}
                        className="w-full accent-valheim-brass"
                      />
                      <button
                        onClick={() => setSpawnStack(1)}
                        className="px-2 py-1 rounded bg-valheim-slot border border-valheim-border hover:border-valheim-gold text-[10px] text-gray-300 whitespace-nowrap"
                        title="Set to 1"
                      >
                        1
                      </button>
                      <button
                        onClick={() => setSpawnStack(selectedItem.maxStack)}
                        className="px-2 py-1 rounded bg-valheim-slot border border-valheim-border hover:border-valheim-gold text-[10px] text-gray-300 whitespace-nowrap"
                        title="Set to max stack"
                      >
                        Max
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center text-xs text-gray-300 py-1.5 px-2 rounded bg-valheim-dark/40 border border-valheim-border/40">
                    <span className="font-semibold">Stack:</span>
                    <span className="font-mono text-gray-400 text-xs">Non-stackable (1)</span>
                  </div>
                )}

                {/* Quality / Tier Configuration */}
                {selectedItem.slotType !== 'ammo' &&
                  selectedItem.category !== 'materials' &&
                  selectedItem.category !== 'consumables' && (
                    <div>
                      <div className="flex justify-between items-center text-xs text-gray-300 mb-1">
                        <span className="font-semibold">Quality Level:</span>
                        <span className="text-amber-400 font-bold">{'★'.repeat(spawnQuality)}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[1, 2, 3, 4].map((q) => (
                          <button
                            key={q}
                            onClick={() => setSpawnQuality(q)}
                            className={`py-1.5 rounded text-xs font-bold transition border ${
                              spawnQuality === q
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

                {/* Durability Notice */}
                <div className="text-[11px] text-gray-400 bg-valheim-dark/80 p-2.5 rounded border border-valheim-border/60">
                  <div className="flex justify-between">
                    <span>Base Durability:</span>
                    <span className="text-gray-200 font-mono">{selectedItem.maxDurability}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span>Weight per unit:</span>
                    <span className="text-gray-200 font-mono">{selectedItem.weight}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
                <Filter className="w-10 h-10 mb-2 opacity-40 text-valheim-brass" />
                <p className="text-sm font-valheim">Select an item from the catalog</p>
                <p className="text-xs text-gray-500 mt-1">
                  Choose any item from weapons, armor, food, mead, or building resources.
                </p>
              </div>
            )}

            {/* Bottom Button */}
            <div className="pt-4 border-t border-valheim-border/80">
              <button
                onClick={handleSpawn}
                disabled={!selectedItem}
                className={`w-full py-2.5 rounded font-valheim font-bold text-sm flex items-center justify-center gap-2 transition shadow-glow ${
                  selectedItem
                    ? 'bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-500 border border-valheim-gold text-white active:scale-95'
                    : 'bg-valheim-slot border border-valheim-border text-gray-600 cursor-not-allowed'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Spawn Item Into Inventory</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
