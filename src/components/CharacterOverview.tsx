import React from 'react';
import { ValheimCharacter } from '../types';
import { getItemByPrefab, getItemIconUrl } from '../data/items';
import { Heart, Zap, Sparkles, Shield, Hammer, Clock, Award, Ghost, Flame, Compass, Plane, Sprout, Swords } from 'lucide-react';

interface CharacterOverviewProps {
  character: ValheimCharacter;
  onSetLocationToBed?: () => void;
  onSetLocationToDeath?: () => void;
  onChangeGuardianPower?: (power: string) => void;
  isGodMode?: boolean;
  onToggleGodMode?: () => void;
  isNoCostBuilding?: boolean;
  onToggleNoCostBuilding?: () => void;
  isGhostMode?: boolean;
  onToggleGhostMode?: () => void;
  isFlyMode?: boolean;
  onToggleFlyMode?: () => void;
  isOneHitKill?: boolean;
  onToggleOneHitKill?: () => void;
  isRested?: boolean;
  restedTime?: number;
  onApplyRested?: () => void;
  onOpenWorldMap?: () => void;
  onOpenAutoBuilder?: () => void;
  onOpenGridPlanter?: () => void;
}

export const CharacterOverview: React.FC<CharacterOverviewProps> = ({
  character,
  onSetLocationToBed,
  onSetLocationToDeath,
  onChangeGuardianPower,
  isGodMode,
  onToggleGodMode,
  isNoCostBuilding,
  onToggleNoCostBuilding,
  isGhostMode,
  onToggleGhostMode,
  isFlyMode,
  onToggleFlyMode,
  isOneHitKill,
  onToggleOneHitKill,
  isRested,
  restedTime,
  onApplyRested,
  onOpenWorldMap,
  onOpenAutoBuilder,
  onOpenGridPlanter,
}) => {
  const hpInt = Math.round(character.hp);
  const staminaInt = Math.round(character.stamina);
  const bedWorld = character.worlds?.find((w) => w.haveSpawn);
  const deathWorld = character.worlds?.find((w) => w.haveDeath);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="bg-valheim-panel/90 border border-valheim-border rounded-lg p-4 shadow-valheim relative overflow-hidden">
      {/* Background Braid Ornament */}
      <img
        src="./ui/BraidLineHorisontalMedium.png"
        alt=""
        className="absolute top-0 left-0 right-0 w-full h-1 object-cover opacity-60 pointer-events-none"
      />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Name, Identity & Location Buttons */}
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-valheim font-bold text-valheim-gold tracking-wide drop-shadow">
              {character.playerName}
            </h2>
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-600/60 text-emerald-300 text-xs font-semibold">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              Achievements 100% Active
            </span>

            {/* Set Location to Bed Button */}
            {onSetLocationToBed && (
              <button
                onClick={onSetLocationToBed}
                className="flex items-center gap-1.5 px-3 py-1 rounded bg-amber-950/70 hover:bg-amber-900 border border-valheim-brass text-amber-200 text-xs font-valheim font-semibold transition shadow hover:shadow-glow active:scale-95 ml-auto sm:ml-0"
                title={
                  bedWorld
                    ? `Bed located at (${bedWorld.spawnPoint[0].toFixed(1)}, ${bedWorld.spawnPoint[1].toFixed(1)}, ${bedWorld.spawnPoint[2].toFixed(1)}). Click to teleport login point to bed.`
                    : 'Set login point to your bed spawn point'
                }
              >
                <span className="text-sm">🛏️</span>
                <span>Set Location at Bed</span>
              </button>
            )}

            {/* Set Location to Death Marker Button */}
            {onSetLocationToDeath && deathWorld && (
              <button
                onClick={onSetLocationToDeath}
                className="flex items-center gap-1.5 px-3 py-1 rounded bg-red-950/70 hover:bg-red-900 border border-red-700/80 text-red-200 text-xs font-valheim font-semibold transition shadow hover:shadow-glow active:scale-95"
                title={`Last death located at (${deathWorld.deathPoint[0].toFixed(1)}, ${deathWorld.deathPoint[1].toFixed(1)}, ${deathWorld.deathPoint[2].toFixed(1)}). Click to teleport login point to your grave marker.`}
              >
                <span className="text-sm">💀</span>
                <span>Respawn at Death Marker</span>
              </button>
            )}

            {/* World Map & Pin Explorer Button */}
            {onOpenWorldMap && (
              <button
                onClick={onOpenWorldMap}
                className="flex items-center gap-1.5 px-3 py-1 rounded bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/80 text-indigo-200 text-xs font-valheim font-semibold transition shadow hover:shadow-[0_0_12px_rgba(99,102,241,0.5)] active:scale-95"
                title="Open interactive 2D World Map & Pin Explorer to inspect all pins, bed, grave, and 1-click teleport"
              >
                <Compass className="w-3.5 h-3.5 text-indigo-400" />
                <span>World Map & Pins</span>
              </button>
            )}

            {/* Auto-Builder & Blueprints Button */}
            {onOpenAutoBuilder && (
              <button
                onClick={onOpenAutoBuilder}
                className="flex items-center gap-1.5 px-3 py-1 rounded bg-amber-950/80 hover:bg-amber-900 border border-valheim-brass text-amber-200 text-xs font-valheim font-semibold transition shadow hover:shadow-[0_0_12px_rgba(245,158,11,0.5)] active:scale-95"
                title="Open Auto-Builder, load community blueprints (.vbuild / .blueprint), and construct them live in-game"
              >
                <Hammer className="w-3.5 h-3.5 text-amber-400" />
                <span>Auto-Builder</span>
              </button>
            )}

            {/* Grid Planter & Farming Suite Button */}
            {onOpenGridPlanter && (
              <button
                onClick={onOpenGridPlanter}
                className="flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/80 text-emerald-200 text-xs font-valheim font-semibold transition shadow hover:shadow-[0_0_12px_rgba(16,185,129,0.5)] active:scale-95"
                title="Open Grid Planter & Farming Suite: automated grid planting, auto-cultivate, and harvesting suite"
              >
                <Sprout className="w-3.5 h-3.5 text-emerald-400" />
                <span>Grid Planter</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-gray-400 font-sans">
            <span>Player ID: <span className="text-gray-300 font-mono">{character.playerID.toString()}</span></span>
            {character.dateCreatedDate && (
              <span>Created: <span className="text-gray-300">{character.dateCreatedDate.toLocaleDateString()}</span></span>
            )}
            <span>Save Ver: <span className="text-gray-300">{character.version}</span></span>
            {bedWorld && (
              <span className="text-valheim-gold/90 font-mono text-[11px]">
                Bed: ({bedWorld.spawnPoint[0].toFixed(1)}, {bedWorld.spawnPoint[1].toFixed(1)}, {bedWorld.spawnPoint[2].toFixed(1)})
              </span>
            )}
            {deathWorld && (
              <span className="text-red-400 font-mono text-[11px]">
                Grave: ({deathWorld.deathPoint[0].toFixed(1)}, {deathWorld.deathPoint[1].toFixed(1)}, {deathWorld.deathPoint[2].toFixed(1)})
              </span>
            )}
            {!bedWorld && !deathWorld && (
              <span>Seed: <span className="text-gray-300">{character.startSeed || 'Standard'}</span></span>
            )}
          </div>
        </div>

        {/* Center: Vitals (Health & Stamina & Guardian Power) */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 bg-valheim-dark/80 px-4 py-2.5 rounded border border-valheim-border/60">
          {/* Health */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-red-950/80 border border-red-700/80 flex items-center justify-center">
              <Heart className="w-4 h-4 text-red-500 fill-red-500/30" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-gray-400">Health</div>
              <div className="text-sm font-bold text-red-400 font-mono">{hpInt}</div>
            </div>
          </div>

          {/* Stamina */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-amber-950/80 border border-amber-600/80 flex items-center justify-center">
              <Zap className="w-4 h-4 text-valheim-stamina fill-amber-500/30" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-gray-400">Stamina</div>
              <div className="text-sm font-bold text-valheim-stamina font-mono">{staminaInt}</div>
            </div>
          </div>

          {/* Guardian Power */}
          {character.guardianPower && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-indigo-950/80 border border-indigo-600/80 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-gray-400">Guardian Power</div>
                {onChangeGuardianPower ? (
                  <select
                    value={character.guardianPower}
                    onChange={(e) => onChangeGuardianPower(e.target.value)}
                    className="bg-valheim-dark border border-indigo-600/50 text-indigo-300 text-sm font-bold font-valheim rounded px-1 py-0.5 focus:outline-none focus:border-indigo-400 w-32"
                  >
                    <option value="">None</option>
                    <option value="GP_Eikthyr">Eikthyr</option>
                    <option value="GP_TheElder">The Elder</option>
                    <option value="GP_Bonemass">Bonemass</option>
                    <option value="GP_Moder">Moder</option>
                    <option value="GP_Yagluth">Yagluth</option>
                    <option value="GP_Queen">The Queen</option>
                    <option value="GP_Fader">Fader</option>
                    {/* Preserve custom/modded boss powers if not in list */}
                    {!['', 'GP_Eikthyr', 'GP_TheElder', 'GP_Bonemass', 'GP_Moder', 'GP_Yagluth', 'GP_Queen', 'GP_Fader'].includes(character.guardianPower) && (
                      <option value={character.guardianPower}>{character.guardianPower.replace('GP_', '')}</option>
                    )}
                  </select>
                ) : (
                  <div className="text-sm font-bold text-indigo-300 font-valheim">
                    {character.guardianPower.replace('GP_', '')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Invincibility (God Mode) Toggle */}
          {onToggleGodMode && (
            <button
              onClick={onToggleGodMode}
              className={`flex items-center gap-2 px-3 py-1.5 rounded border transition shadow active:scale-95 cursor-pointer ${
                isGodMode
                  ? 'bg-amber-950/80 border-amber-500 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                  : 'bg-valheim-dark/80 hover:bg-valheim-panel border-valheim-border/80 hover:border-valheim-brass text-gray-400 hover:text-gray-200'
              }`}
              title={
                isGodMode
                  ? 'Invincibility (God Mode) is ON. Click to toggle OFF.'
                  : 'Invincibility (God Mode) is OFF. Click to activate in-game invincibility.'
              }
            >
              <div
                className={`w-7 h-7 rounded flex items-center justify-center border ${
                  isGodMode
                    ? 'bg-amber-900/80 border-amber-400 text-amber-400'
                    : 'bg-gray-900 border-gray-700 text-gray-400'
                }`}
              >
                <Shield className={`w-4 h-4 ${isGodMode ? 'fill-amber-400/40 text-amber-400' : ''}`} />
              </div>
              <div className="text-left">
                <div className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
                  Invincibility
                </div>
                <div
                  className={`text-xs font-bold font-valheim flex items-center gap-1.5 ${
                    isGodMode ? 'text-amber-400' : 'text-gray-400'
                  }`}
                >
                  <span>{isGodMode ? 'ACTIVE' : 'OFF'}</span>
                  {isGodMode && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                  )}
                </div>
              </div>
            </button>
          )}

          {/* No-Cost Building (Creative Crafting) Toggle */}
          {onToggleNoCostBuilding && (
            <button
              onClick={onToggleNoCostBuilding}
              className={`flex items-center gap-2 px-3 py-1.5 rounded border transition shadow active:scale-95 cursor-pointer ${
                isNoCostBuilding
                  ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.35)]'
                  : 'bg-valheim-dark/80 hover:bg-valheim-panel border-valheim-border/80 hover:border-valheim-brass text-gray-400 hover:text-gray-200'
              }`}
              title={
                isNoCostBuilding
                  ? 'No-Cost Building is ON! You can build and craft with 0 materials. Click to toggle OFF.'
                  : 'No-Cost Building is OFF. Click to activate zero material cost building and crafting.'
              }
            >
              <div
                className={`w-7 h-7 rounded flex items-center justify-center border ${
                  isNoCostBuilding
                    ? 'bg-cyan-900/80 border-cyan-400 text-cyan-300'
                    : 'bg-gray-900 border-gray-700 text-gray-400'
                }`}
              >
                <Hammer className={`w-4 h-4 ${isNoCostBuilding ? 'text-cyan-300 animate-pulse' : ''}`} />
              </div>
              <div className="text-left">
                <div className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
                  Free Building
                </div>
                <div
                  className={`text-xs font-bold font-valheim flex items-center gap-1.5 ${
                    isNoCostBuilding ? 'text-cyan-400' : 'text-gray-400'
                  }`}
                >
                  <span>{isNoCostBuilding ? 'ACTIVE' : 'OFF'}</span>
                  {isNoCostBuilding && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                    </span>
                  )}
                </div>
              </div>
            </button>
          )}

          {/* Ghost Mode (Enemies ignore player) Toggle */}
          {onToggleGhostMode && (
            <button
              onClick={onToggleGhostMode}
              className={`flex items-center gap-2 px-3 py-1.5 rounded border transition shadow active:scale-95 cursor-pointer ${
                isGhostMode
                  ? 'bg-purple-950/80 border-purple-400 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.35)]'
                  : 'bg-valheim-dark/80 hover:bg-valheim-panel border-valheim-border/80 hover:border-valheim-brass text-gray-400 hover:text-gray-200'
              }`}
              title={
                isGhostMode
                  ? 'Ghost Mode is ON! Enemies completely ignore you. Click to toggle OFF.'
                  : 'Ghost Mode is OFF. Click so enemies ignore you completely.'
              }
            >
              <div
                className={`w-7 h-7 rounded flex items-center justify-center border ${
                  isGhostMode
                    ? 'bg-purple-900/80 border-purple-400 text-purple-300'
                    : 'bg-gray-900 border-gray-700 text-gray-400'
                }`}
              >
                <Ghost className={`w-4 h-4 ${isGhostMode ? 'text-purple-300 animate-pulse' : ''}`} />
              </div>
              <div className="text-left">
                <div className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
                  Ghost Mode
                </div>
                <div
                  className={`text-xs font-bold font-valheim flex items-center gap-1.5 ${
                    isGhostMode ? 'text-purple-400' : 'text-gray-400'
                  }`}
                >
                  <span>{isGhostMode ? 'ACTIVE' : 'OFF'}</span>
                  {isGhostMode && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                    </span>
                  )}
                </div>
              </div>
            </button>
          )}

          {/* Fly Mode (No-Clip) Toggle */}
          {onToggleFlyMode && (
            <button
              onClick={onToggleFlyMode}
              className={`flex items-center gap-2 px-3 py-1.5 rounded border transition shadow active:scale-95 cursor-pointer ${
                isFlyMode
                  ? 'bg-sky-950/80 border-sky-400 text-sky-200 shadow-[0_0_12px_rgba(56,189,248,0.35)]'
                  : 'bg-valheim-dark/80 hover:bg-valheim-panel border-valheim-border/80 hover:border-valheim-brass text-gray-400 hover:text-gray-200'
              }`}
              title={
                isFlyMode
                  ? 'Fly Mode (No-Clip) is ON! [Space] Up | [Ctrl] Down | [Shift] Fast | [F9] in-game hotkey. Click to toggle OFF.'
                  : 'Fly Mode (No-Clip) is OFF. Click or press [F9] in-game to fly freely through walls.'
              }
            >
              <div
                className={`w-7 h-7 rounded flex items-center justify-center border ${
                  isFlyMode
                    ? 'bg-sky-900/80 border-sky-400 text-sky-300'
                    : 'bg-gray-900 border-gray-700 text-gray-400'
                }`}
              >
                <Plane className={`w-4 h-4 ${isFlyMode ? 'text-sky-300 animate-pulse' : ''}`} />
              </div>
              <div className="text-left">
                <div className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
                  Fly (No-Clip)
                </div>
                <div
                  className={`text-xs font-bold font-valheim flex items-center gap-1.5 ${
                    isFlyMode ? 'text-sky-400' : 'text-gray-400'
                  }`}
                >
                  <span>{isFlyMode ? 'ACTIVE' : 'OFF'}</span>
                  {isFlyMode && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                    </span>
                  )}
                </div>
              </div>
            </button>
          )}

          {/* One-Hit Kill (Enemies & Bosses) Toggle */}
          {onToggleOneHitKill && (
            <button
              onClick={onToggleOneHitKill}
              className={`flex items-center gap-2 px-3 py-1.5 rounded border transition shadow active:scale-95 cursor-pointer ${
                isOneHitKill
                  ? 'bg-rose-950/80 border-rose-500 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.35)]'
                  : 'bg-valheim-dark/80 hover:bg-valheim-panel border-valheim-border/80 hover:border-valheim-brass text-gray-400 hover:text-gray-200'
              }`}
              title={
                isOneHitKill
                  ? 'One-Hit Kill is ON! [F11] in-game hotkey. All enemies & bosses die in 1 hit. Click to toggle OFF.'
                  : 'One-Hit Kill is OFF. Click or press [F11] in-game to defeat enemies and bosses in 1 hit.'
              }
            >
              <div
                className={`w-7 h-7 rounded flex items-center justify-center border ${
                  isOneHitKill
                    ? 'bg-rose-900/80 border-rose-400 text-rose-300'
                    : 'bg-gray-900 border-gray-700 text-gray-400'
                }`}
              >
                <Swords className={`w-4 h-4 ${isOneHitKill ? 'text-rose-300 animate-pulse' : ''}`} />
              </div>
              <div className="text-left">
                <div className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
                  1-Hit Kill [F11]
                </div>
                <div
                  className={`text-xs font-bold font-valheim flex items-center gap-1.5 ${
                    isOneHitKill ? 'text-rose-400' : 'text-gray-400'
                  }`}
                >
                  <span>{isOneHitKill ? 'ACTIVE' : 'OFF'}</span>
                  {isOneHitKill && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    </span>
                  )}
                </div>
              </div>
            </button>
          )}

          {/* Instant Rested Buff (Comfort 18 - 25m) Button */}
          {onApplyRested && (
            <button
              onClick={onApplyRested}
              className={`flex items-center gap-2 px-3 py-1.5 rounded border transition shadow active:scale-95 cursor-pointer ${
                isRested
                  ? 'bg-amber-950/80 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                  : 'bg-valheim-dark/80 hover:bg-valheim-panel border-valheim-border/80 hover:border-valheim-brass text-gray-400 hover:text-gray-200'
              }`}
              title="Apply instant 25-minute Rested Buff (Level 18 Comfort). Double stamina regen & +50% XP!"
            >
              <div
                className={`w-7 h-7 rounded flex items-center justify-center border ${
                  isRested
                    ? 'bg-amber-900/80 border-amber-400 text-amber-300'
                    : 'bg-gray-900 border-gray-700 text-gray-400'
                }`}
              >
                <Flame className={`w-4 h-4 ${isRested ? 'text-amber-400 animate-pulse' : ''}`} />
              </div>
              <div className="text-left">
                <div className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
                  Rested Buff
                </div>
                <div
                  className={`text-xs font-bold font-valheim flex items-center gap-1.5 ${
                    isRested ? 'text-amber-400' : 'text-gray-300'
                  }`}
                >
                  <span>
                    {isRested && restedTime && restedTime > 0
                      ? `${Math.floor(restedTime / 60)}m ${Math.floor(restedTime % 60)}s`
                      : '25m (Lvl 18)'}
                  </span>
                  {isRested && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                  )}
                </div>
              </div>
            </button>
          )}
        </div>

        {/* Right: Active Stomach Foods */}
        {character.foods && character.foods.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="text-[10px] uppercase font-bold text-valheim-brass tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3" /> Stomach Contents ({character.foods.length}/3)
            </div>
            <div className="flex items-center gap-2">
              {character.foods.map((food, idx) => {
                const catalogItem = getItemByPrefab(food.name);
                const iconUrl = getItemIconUrl(catalogItem || { prefab: food.name, category: 'consumables' });
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 px-2 py-1 rounded bg-valheim-dark border border-valheim-border/80 text-xs"
                    title={`${catalogItem?.name || food.name}: ${formatTime(food.remainingTime)} remaining`}
                  >
                    <img src={iconUrl} alt={food.name} className="w-5 h-5 object-contain" />
                    <div className="leading-none">
                      <div className="text-[11px] text-gray-200 font-medium truncate max-w-[90px]">
                        {catalogItem?.name || food.name}
                      </div>
                      <div className="text-[9px] text-amber-400/90 font-mono mt-0.5">
                        {formatTime(food.remainingTime)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
