import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Save,
  Search,
  Plus,
  Trash2,
  ShieldCheck,
  Edit2,
  Copy,
  Sparkles,
  ChevronDown,
  Layers,
  Check,
  Zap,
} from 'lucide-react';
import { VALHEIM_ITEMS, getItemIconUrl } from '../data/items';
import { CatalogItem, LoadoutConfigItem, LoadoutProfile, InventoryItem } from '../types';

interface LoadoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: LoadoutProfile[];
  activeProfileId: string;
  onSelectProfile: (id: string) => void;
  onSaveProfiles: (profiles: LoadoutProfile[], activeId?: string) => void;
  onApplyProfile: (profile: LoadoutProfile) => void;
  characterItems?: InventoryItem[];
}

export const LoadoutModal: React.FC<LoadoutModalProps> = ({
  isOpen,
  onClose,
  profiles,
  activeProfileId,
  onSelectProfile,
  onSaveProfiles,
  onApplyProfile,
  characterItems,
}) => {
  const [localProfiles, setLocalProfiles] = useState<LoadoutProfile[]>(profiles);
  const [currentId, setCurrentId] = useState<string>(activeProfileId || (profiles[0]?.id ?? 'default'));
  const [searchQuery, setSearchQuery] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  // Sync with prop changes when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalProfiles(profiles);
      setCurrentId(activeProfileId || (profiles[0]?.id ?? 'default'));
      setIsRenaming(false);
      setSearchQuery('');
    }
  }, [isOpen, profiles, activeProfileId]);

  const activeProfile = useMemo(() => {
    return localProfiles.find((p) => p.id === currentId) || localProfiles[0];
  }, [localProfiles, currentId]);

  const filteredItems = useMemo(() => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase();
    return VALHEIM_ITEMS.filter((item: CatalogItem) => {
      if (item.category === 'hidden' || item.category === 'internal') return false;
      if (item.name.toLowerCase().includes(query)) return true;
      if (item.prefab.toLowerCase().includes(query)) return true;
      if (item.aliases?.some((a: string) => a.toLowerCase().includes(query))) return true;
      return false;
    }).slice(0, 15);
  }, [searchQuery]);

  if (!isOpen || !activeProfile) return null;

  const handleUpdateActiveItems = (newItems: LoadoutConfigItem[]) => {
    setLocalProfiles((prev) =>
      prev.map((p) => (p.id === activeProfile.id ? { ...p, items: newItems } : p))
    );
  };

  const handleUpdateBossBuff = (power: string) => {
    setLocalProfiles((prev) =>
      prev.map((p) => (p.id === activeProfile.id ? { ...p, bossBuff: power } : p))
    );
  };

  const handleRemoveItem = (hash: number) => {
    handleUpdateActiveItems(activeProfile.items.filter((c) => c.hash !== hash));
  };

  const handleAmountChange = (hash: number, amount: number) => {
    const clamped = Math.max(1, Math.min(9999, amount));
    handleUpdateActiveItems(
      activeProfile.items.map((c) => (c.hash === hash ? { ...c, amount: clamped } : c))
    );
  };

  const handleAddItem = (item: CatalogItem) => {
    if (activeProfile.items.some((c) => c.hash === item.hash)) return;
    handleUpdateActiveItems([
      ...activeProfile.items,
      { hash: item.hash, prefab: item.prefab, amount: item.maxStack || 1 },
    ]);
    setSearchQuery('');
  };

  // Add new named loadout
  const handleCreateNewProfile = () => {
    const newId = `custom_${Date.now()}`;
    const newName = `Loadout ${localProfiles.length + 1}`;
    const newProfile: LoadoutProfile = {
      id: newId,
      name: newName,
      description: 'Custom loadout setup.',
      items: [],
    };
    const updated = [...localProfiles, newProfile];
    setLocalProfiles(updated);
    setCurrentId(newId);
    setRenameValue(newName);
    setIsRenaming(true);
  };

  // Clone current loadout
  const handleDuplicateProfile = () => {
    const newId = `custom_${Date.now()}`;
    const newProfile: LoadoutProfile = {
      ...activeProfile,
      id: newId,
      name: `${activeProfile.name} (Copy)`,
    };
    const updated = [...localProfiles, newProfile];
    setLocalProfiles(updated);
    setCurrentId(newId);
  };

  // Copy current player inventory into a loadout
  const handleCopyFromInventory = () => {
    if (!characterItems || characterItems.length === 0) return;
    // Group duplicates and sum stack
    const map = new Map<number, LoadoutConfigItem>();
    for (const item of characterItems) {
      if (map.has(item.hash)) {
        const existing = map.get(item.hash)!;
        existing.amount += item.stack;
      } else {
        map.set(item.hash, { hash: item.hash, prefab: item.prefab, amount: item.stack });
      }
    }
    const bagItems = Array.from(map.values());
    const newId = `bags_${Date.now()}`;
    const newProfile: LoadoutProfile = {
      id: newId,
      name: `🎒 Bags Snapshot (${bagItems.length} items)`,
      description: 'Saved directly from your active character inventory.',
      items: bagItems,
    };
    const updated = [...localProfiles, newProfile];
    setLocalProfiles(updated);
    setCurrentId(newId);
  };

  // Delete profile
  const handleDeleteProfile = (id: string) => {
    if (localProfiles.length <= 1) return;
    const updated = localProfiles.filter((p) => p.id !== id);
    setLocalProfiles(updated);
    setCurrentId(updated[0].id);
  };

  // Rename commit
  const handleCommitRename = () => {
    if (renameValue.trim()) {
      setLocalProfiles((prev) =>
        prev.map((p) => (p.id === activeProfile.id ? { ...p, name: renameValue.trim() } : p))
      );
    }
    setIsRenaming(false);
  };

  // Save changes
  const handleSaveAndClose = () => {
    onSaveProfiles(localProfiles, currentId);
    onSelectProfile(currentId);
    onClose();
  };

  // Apply now
  const handleApplyNow = () => {
    onSaveProfiles(localProfiles, currentId);
    onSelectProfile(currentId);
    onApplyProfile(activeProfile);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-valheim-dark border border-valheim-border rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-valheim-border bg-valheim-panel">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-valheim-gold/20 border border-valheim-brass flex items-center justify-center">
              <Layers className="w-4 h-4 text-valheim-gold" />
            </div>
            <div>
              <h2 className="font-valheim text-lg text-valheim-goldlight tracking-wide flex items-center gap-2">
                <span>Manage Loadouts</span>
                <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-valheim-dark border border-valheim-border text-valheim-gold">
                  {localProfiles.length} Presets
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Customize, save, and 1-click apply multi-item equipment and food kits.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-valheim-dark transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profiles Selector Bar */}
        <div className="px-5 py-2.5 bg-valheim-dark/95 border-b border-valheim-border/80 flex flex-wrap items-center justify-between gap-3">
          {/* Active Profile Dropdown & Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs uppercase font-bold text-valheim-brass">Active Preset:</span>
            {isRenaming ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCommitRename()}
                  className="bg-valheim-panel border border-valheim-gold rounded px-2.5 py-1 text-sm font-valheim font-semibold text-valheim-goldlight focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={handleCommitRename}
                  className="p-1.5 bg-valheim-gold/20 hover:bg-valheim-gold/30 border border-valheim-brass text-valheim-gold rounded text-xs transition"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <select
                  value={currentId}
                  onChange={(e) => setCurrentId(e.target.value)}
                  className="bg-valheim-panel border border-valheim-border/90 hover:border-valheim-brass text-valheim-gold font-valheim font-semibold text-sm rounded px-3 py-1.5 focus:outline-none focus:border-valheim-gold transition"
                >
                  {localProfiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.items.length} items)
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => {
                    setRenameValue(activeProfile.name);
                    setIsRenaming(true);
                  }}
                  className="p-1.5 text-gray-400 hover:text-valheim-gold rounded bg-valheim-panel border border-valheim-border/70 hover:border-valheim-brass transition"
                  title="Rename this loadout"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={handleDuplicateProfile}
                  className="p-1.5 text-gray-400 hover:text-valheim-gold rounded bg-valheim-panel border border-valheim-border/70 hover:border-valheim-brass transition"
                  title="Duplicate this loadout"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                {localProfiles.length > 1 && (
                  <button
                    onClick={() => handleDeleteProfile(activeProfile.id)}
                    className="p-1.5 text-gray-400 hover:text-red-400 rounded bg-valheim-panel border border-valheim-border/70 hover:border-red-700/80 transition"
                    title="Delete this loadout preset"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons: New Loadout & Copy from Bags */}
          <div className="flex items-center gap-2">
            {characterItems && characterItems.length > 0 && (
              <button
                onClick={handleCopyFromInventory}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-valheim-panel hover:bg-valheim-slothover border border-valheim-border text-xs text-gray-200 transition shadow"
                title="Create a new loadout matching your active character bags right now"
              >
                <span>🎒</span>
                <span>Copy Current Bags</span>
              </button>
            )}

            <button
              onClick={handleCreateNewProfile}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-valheim-gold/20 hover:bg-valheim-gold/30 border border-valheim-brass text-xs font-valheim font-semibold text-valheim-goldlight transition shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Loadout</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-4">
          {/* Loadout Description & Optional Boss Buff */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-valheim-panel/60 border border-valheim-border/60 rounded-lg p-3 text-xs text-gray-300">
            <div>
              <span className="font-semibold text-valheim-goldlight">{activeProfile.name}:</span>{' '}
              <span>{activeProfile.description || 'Custom loadout setup.'}</span>
            </div>

            {/* Associated Boss Buff */}
            <div className="flex items-center gap-2">
              <span className="text-gray-400 font-bold uppercase text-[10px]">Guardian Buff:</span>
              <select
                value={activeProfile.bossBuff || ''}
                onChange={(e) => handleUpdateBossBuff(e.target.value)}
                className="bg-valheim-dark border border-indigo-600/60 text-indigo-300 rounded px-2 py-0.5 text-xs font-valheim focus:outline-none"
              >
                <option value="">Keep Current</option>
                <option value="GP_Eikthyr">Eikthyr</option>
                <option value="GP_TheElder">The Elder</option>
                <option value="GP_Bonemass">Bonemass</option>
                <option value="GP_Moder">Moder</option>
                <option value="GP_Yagluth">Yagluth</option>
                <option value="GP_Queen">The Queen</option>
                <option value="GP_Fader">Fader</option>
              </select>
            </div>
          </div>

          {/* Quick Bulk Stock Helpers */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Quick Fill:</span>
            <button
              onClick={() => {
                const foods = VALHEIM_ITEMS.filter((i) => i.category === 'consumables').map((i) => ({
                  hash: i.hash,
                  prefab: i.prefab,
                  amount: i.maxStack || 10,
                }));
                handleUpdateActiveItems(foods);
              }}
              className="px-2.5 py-1 bg-valheim-panel hover:bg-valheim-slothover border border-valheim-border rounded text-xs text-gray-200 transition"
            >
              🍖 All Foods
            </button>
            <button
              onClick={() => {
                const materials = VALHEIM_ITEMS.filter((i) => i.category === 'materials').map((i) => ({
                  hash: i.hash,
                  prefab: i.prefab,
                  amount: i.maxStack || 50,
                }));
                handleUpdateActiveItems(materials);
              }}
              className="px-2.5 py-1 bg-valheim-panel hover:bg-valheim-slothover border border-valheim-border rounded text-xs text-gray-200 transition"
            >
              ⚒️ All Materials
            </button>
            <button
              onClick={() => handleUpdateActiveItems([])}
              className="px-2.5 py-1 bg-red-950/40 hover:bg-red-950/70 border border-red-800/60 rounded text-xs text-red-300 transition ml-auto"
            >
              Clear Preset Items
            </button>
          </div>

          {/* Search to Add Items */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search items to add (e.g. 'Mistwalker', 'Misthare Supreme', 'Carapace Arrow')..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-valheim-panel border border-valheim-border rounded-lg py-2.5 pl-10 pr-4 text-sm text-gray-200 focus:outline-none focus:border-valheim-gold focus:ring-1 focus:ring-valheim-gold placeholder-gray-500 transition"
            />
            {filteredItems.length > 0 && (
              <div className="absolute top-full mt-1.5 left-0 right-0 max-h-64 overflow-y-auto bg-valheim-dark border border-valheim-border rounded-lg shadow-2xl z-30 divide-y divide-valheim-border/40">
                {filteredItems.map((item: CatalogItem) => {
                  const alreadyAdded = activeProfile.items.some((c) => c.hash === item.hash);
                  const iconUrl = getItemIconUrl(item);
                  return (
                    <button
                      key={item.hash}
                      onClick={() => handleAddItem(item)}
                      disabled={alreadyAdded}
                      className="w-full text-left px-3.5 py-2.5 text-sm text-gray-200 hover:bg-valheim-panel disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-between transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 flex items-center justify-center bg-valheim-slot rounded border border-valheim-border shrink-0 overflow-hidden">
                          <img src={iconUrl} className="w-6 h-6 object-contain" alt="" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-200">{item.name}</span>
                          <span className="text-[11px] text-gray-400 capitalize">{item.category} &bull; Stack of {item.maxStack || 1}</span>
                        </div>
                      </div>
                      {alreadyAdded ? (
                        <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Added
                        </span>
                      ) : (
                        <Plus className="w-4 h-4 text-valheim-gold" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* List of Configured Items in this Preset */}
          <div className="flex flex-col gap-2 min-h-[220px]">
            {activeProfile.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-valheim-border/60 rounded-xl text-center text-gray-400 text-sm">
                <Layers className="w-10 h-10 text-gray-500 mb-2 opacity-50" />
                <p className="font-semibold text-gray-300">This loadout preset is empty.</p>
                <p className="text-xs text-gray-500 mt-1">
                  Use the search bar above to add weapons, armor, foods, and meads, or click "Copy Current Bags".
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {activeProfile.items.map((cfg) => {
                  if (!cfg || typeof cfg.hash !== 'number') return null;
                  const itemDef = VALHEIM_ITEMS.find((i: CatalogItem) => i.hash === cfg.hash);
                  const iconUrl = getItemIconUrl(itemDef || { prefab: cfg.prefab });
                  return (
                    <div
                      key={cfg.hash}
                      className="flex items-center gap-3 bg-valheim-panel border border-valheim-border/80 hover:border-valheim-border p-2.5 rounded-lg shadow-sm"
                    >
                      <div className="w-9 h-9 flex items-center justify-center bg-valheim-slot rounded border border-valheim-border shrink-0 overflow-hidden">
                        <img src={iconUrl} className="w-7 h-7 object-contain" alt="" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-valheim-goldlight text-sm truncate">
                          {itemDef?.name || cfg.prefab}
                        </div>
                        <div className="text-[10px] text-gray-400 uppercase font-mono">
                          {cfg.prefab}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] text-gray-400">Qty:</span>
                        <input
                          type="number"
                          min={1}
                          max={9999}
                          value={cfg.amount}
                          onChange={(e) =>
                            handleAmountChange(cfg.hash, parseInt(e.target.value) || 1)
                          }
                          className="w-16 bg-valheim-dark border border-valheim-border rounded px-2 py-1 text-xs text-center text-gray-200 font-mono focus:outline-none focus:border-valheim-gold"
                        />
                        <button
                          onClick={() => handleRemoveItem(cfg.hash)}
                          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-valheim-dark rounded transition ml-1"
                          title="Remove from preset"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-valheim-border bg-valheim-panel flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-gray-400">
            Total in <span className="text-valheim-gold font-semibold">{activeProfile.name}</span>: {activeProfile.items.length} items
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded text-sm text-gray-300 hover:text-white transition"
            >
              Cancel
            </button>

            <button
              onClick={handleSaveAndClose}
              className="flex items-center gap-1.5 px-4 py-2 rounded bg-valheim-dark hover:bg-valheim-panel border border-valheim-border hover:border-valheim-brass text-sm text-gray-200 transition shadow"
            >
              <Save className="w-4 h-4 text-valheim-gold" />
              <span>Save Changes</span>
            </button>

            <button
              onClick={handleApplyNow}
              className="flex items-center gap-1.5 px-4 py-2 rounded bg-valheim-gold hover:bg-valheim-goldlight text-valheim-dark font-valheim font-bold text-sm transition shadow-[0_0_12px_rgba(230,195,100,0.35)] active:scale-95"
            >
              <Zap className="w-4 h-4 fill-valheim-dark" />
              <span>Apply Loadout Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
