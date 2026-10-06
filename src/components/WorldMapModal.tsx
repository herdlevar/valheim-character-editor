import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Map as MapIcon,
  MapPin,
  Compass,
  Crosshair,
  Navigation,
  Zap,
  Search,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Check,
  Skull,
  Home,
  Flame,
  Anchor,
  Hammer,
  Radio,
  Sparkles,
  RefreshCw,
  Award,
  Layers,
  Image as ImageIcon,
  Eye,
  Mountain,
} from 'lucide-react';
import { LiveGameStatus, LivePin, getLivePins, teleportLive, getLiveMapTextureBlob } from '../services/liveBridge';
import { ValheimCharacter } from '../types';

interface WorldMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: ValheimCharacter | null;
  liveStatus: LiveGameStatus | null;
  onSetLocationToBed?: () => void;
  onSetLocationToDeath?: () => void;
  onSetCustomLocation?: (x: number, y: number, z: number) => void;
  showToast?: (text: string, type?: 'success' | 'info' | 'error') => void;
}

interface MapMarker {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  type: string; // 'player' | 'bed' | 'death' | 'logout' | 'center' | 'portal' | 'base' | 'boss' | 'pin'
  rawType?: number;
  checked?: boolean;
}

// Procedural Valheim Biomes Generator (renders concentric latitudinal biome distribution)
function drawProceduralBiomes(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number
) {
  // Base deep ocean
  ctx.fillStyle = '#0d1d2d';
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

  // Ashlands (South: bottom of canvas, cy + r)
  const ashlandsGrad = ctx.createLinearGradient(cx, cy + r * 0.45, cx, cy + r);
  ashlandsGrad.addColorStop(0, 'rgba(40, 10, 10, 0)');
  ashlandsGrad.addColorStop(0.35, 'rgba(140, 25, 15, 0.7)');
  ashlandsGrad.addColorStop(0.7, 'rgba(190, 45, 15, 0.85)');
  ashlandsGrad.addColorStop(1, '#200606');
  ctx.fillStyle = ashlandsGrad;
  ctx.beginPath();
  ctx.rect(cx - r, cy + r * 0.45, r * 2, r * 0.55);
  ctx.fill();

  // Deep North (North: top of canvas, cy - r)
  const northGrad = ctx.createLinearGradient(cx, cy - r * 0.45, cx, cy - r);
  northGrad.addColorStop(0, 'rgba(180, 220, 240, 0)');
  northGrad.addColorStop(0.35, 'rgba(190, 230, 255, 0.65)');
  northGrad.addColorStop(0.7, 'rgba(220, 245, 255, 0.85)');
  northGrad.addColorStop(1, '#ffffff');
  ctx.fillStyle = northGrad;
  ctx.beginPath();
  ctx.rect(cx - r, cy - r, r * 2, r * 0.55);
  ctx.fill();

  // Outer Mid Ring: Plains & Mistlands (r * 0.45 to r * 0.8)
  const outerGrad = ctx.createRadialGradient(cx, cy, r * 0.45, cx, cy, r * 0.8);
  outerGrad.addColorStop(0, 'rgba(35, 60, 40, 0)');
  outerGrad.addColorStop(0.35, 'rgba(180, 145, 60, 0.45)'); // Plains savannah gold
  outerGrad.addColorStop(0.75, 'rgba(85, 40, 110, 0.4)'); // Mistlands mystic purple
  outerGrad.addColorStop(1, 'rgba(15, 30, 50, 0.5)'); // Ocean transition
  ctx.fillStyle = outerGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2);
  ctx.fill();

  // Middle Ring: Black Forest & Swamps (r * 0.2 to r * 0.55)
  const midGrad = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 0.55);
  midGrad.addColorStop(0, 'rgba(50, 100, 50, 0)');
  midGrad.addColorStop(0.5, 'rgba(20, 60, 30, 0.65)'); // Black Forest dark pine
  midGrad.addColorStop(0.8, 'rgba(45, 55, 30, 0.55)'); // Swamp murky olive
  midGrad.addColorStop(1, 'rgba(20, 60, 30, 0)');
  ctx.fillStyle = midGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
  ctx.fill();

  // Mountain Snow Peaks (dotted snowy mountain clusters between r * 0.35 and r * 0.65)
  ctx.fillStyle = 'rgba(240, 245, 255, 0.75)';
  const mountainAngles = [0.4, 1.1, 1.9, 2.7, 3.6, 4.3, 5.1, 5.8];
  mountainAngles.forEach((ang) => {
    const dist = r * 0.48;
    const mx = cx + Math.cos(ang) * dist;
    const my = cy + Math.sin(ang) * dist;
    ctx.beginPath();
    ctx.arc(mx, my, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
  });

  // Center: Meadows (r < 0.28)
  const meadowsGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.28);
  meadowsGrad.addColorStop(0, '#3d7a35'); // Vibrant green heartland
  meadowsGrad.addColorStop(0.7, '#2f6329');
  meadowsGrad.addColorStop(1, 'rgba(47, 99, 41, 0)');
  ctx.fillStyle = meadowsGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.28, 0, Math.PI * 2);
  ctx.fill();

  // Subtle landmass texture archipelago rings
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1.5;
  for (let ring = 0.15; ring < 0.9; ring += 0.08) {
    ctx.beginPath();
    ctx.arc(cx, cy, r * ring, 0, Math.PI * 2);
    ctx.stroke();
  }
}

export const WorldMapModal: React.FC<WorldMapModalProps> = ({
  isOpen,
  onClose,
  character,
  liveStatus,
  onSetLocationToBed,
  onSetLocationToDeath,
  onSetCustomLocation,
  showToast = () => {},
}) => {
  const [pins, setPins] = useState<LivePin[]>([]);
  const [isLoadingPins, setIsLoadingPins] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);

  // Real In-Game Map Texture States
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);
  const [isLoadingMapImage, setIsLoadingMapImage] = useState<boolean>(false);
  const [mapMode, setMapMode] = useState<'real' | 'chart' | 'procedural'>('real');
  const [hasRealMap, setHasRealMap] = useState<boolean>(false);

  // Manual coordinate input
  const [customX, setCustomX] = useState<string>('0');
  const [customY, setCustomY] = useState<string>('30');
  const [customZ, setCustomZ] = useState<string>('0');
  const [isTeleporting, setIsTeleporting] = useState(false);

  // Canvas Viewport Pan & Zoom
  // scale = pixels per meter (world radius 10,000m)
  const [scale, setScale] = useState<number>(0.038); // fits ~10,000m in ~760px diameter
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cursorWorldPos, setCursorWorldPos] = useState<{ x: number; z: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Fetch pins when opened and in-game
  const refreshPins = async () => {
    if (!liveStatus?.inGame) return;
    setIsLoadingPins(true);
    try {
      const livePinsList = await getLivePins();
      setPins(livePinsList);
    } catch {
      // ignore
    } finally {
      setIsLoadingPins(false);
    }
  };

  // Fetch real in-game world map texture from Valheim
  const fetchRealMap = async () => {
    if (!liveStatus?.inGame) {
      showToast('Connect to running Valheim game to fetch live map texture.', 'info');
      return;
    }
    setIsLoadingMapImage(true);
    showToast('Fetching authentic 2048x2048 world map from Valheim...', 'info');
    try {
      const blob = await getLiveMapTextureBlob();
      if (blob && blob.size > 2000) {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          setMapImage(img);
          setHasRealMap(true);
          setMapMode('real');
          showToast('⚡ Real Valheim World Map loaded successfully!', 'success');

          // Persist to local cache for offline viewing
          const reader = new FileReader();
          reader.onloadend = () => {
            if (typeof reader.result === 'string') {
              try {
                localStorage.setItem(`valheim_map_${character?.playerName || 'default'}`, reader.result);
              } catch (e) {}
            }
          };
          reader.readAsDataURL(blob);
        };
        img.src = url;
      } else {
        showToast('Map texture not ready yet. Make sure you are in a world.', 'info');
      }
    } catch (err: any) {
      showToast(`Could not fetch map: ${err.message}`, 'error');
    } finally {
      setIsLoadingMapImage(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshPins();
      // Restore cached map if available
      const cacheKey = `valheim_map_${character?.playerName || 'default'}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached && !mapImage) {
        const img = new Image();
        img.onload = () => {
          setMapImage(img);
          setHasRealMap(true);
        };
        img.src = cached;
      }

      // If in-game, automatically fetch fresh map texture
      if (liveStatus?.inGame && !hasRealMap) {
        fetchRealMap();
      }

      // Center view on player if available, or bed
      if (liveStatus?.position) {
        setPanX(-liveStatus.position.x * scale);
        setPanY(liveStatus.position.z * scale);
      }
    }
  }, [isOpen, liveStatus?.inGame]);

  // Extract bed and death world points from character save file
  const bedWorld = character?.worlds?.find((w) => w.haveSpawn);
  const deathWorld = character?.worlds?.find((w) => w.haveDeath);
  const logoutWorld = character?.worlds?.find((w) => w.haveLogout);

  // Compile all markers (Live Player + Bed + Death + Minimap Pins + World Center)
  const allMarkers = useMemo<MapMarker[]>(() => {
    const list: MapMarker[] = [];

    // 1. World Center (Sacrificial Stones)
    list.push({
      id: 'world-center',
      name: 'Sacrificial Stones (World Center)',
      x: 0,
      y: 30,
      z: 0,
      type: 'center',
    });

    // 2. Live Player Position
    if (liveStatus?.position) {
      list.push({
        id: 'player-live',
        name: `${liveStatus.playerName || 'Player'} (Current Position)`,
        x: liveStatus.position.x,
        y: liveStatus.position.y,
        z: liveStatus.position.z,
        type: 'player',
      });
    }

    // 3. Bed Spawn
    const bedX = liveStatus?.spawnPoint?.x ?? bedWorld?.spawnPoint?.[0];
    const bedY = liveStatus?.spawnPoint?.y ?? bedWorld?.spawnPoint?.[1] ?? 30;
    const bedZ = liveStatus?.spawnPoint?.z ?? bedWorld?.spawnPoint?.[2];
    if (bedX !== undefined && bedZ !== undefined && (bedX !== 0 || bedZ !== 0)) {
      list.push({
        id: 'bed-spawn',
        name: 'Bed Spawn Point',
        x: bedX,
        y: bedY,
        z: bedZ,
        type: 'bed',
      });
    }

    // 4. Last Death / Grave
    const deathX = liveStatus?.deathPoint?.x ?? deathWorld?.deathPoint?.[0];
    const deathY = liveStatus?.deathPoint?.y ?? deathWorld?.deathPoint?.[1] ?? 30;
    const deathZ = liveStatus?.deathPoint?.z ?? deathWorld?.deathPoint?.[2];
    if (deathX !== undefined && deathZ !== undefined && (deathX !== 0 || deathZ !== 0)) {
      list.push({
        id: 'death-marker',
        name: 'Tombstone (Last Death)',
        x: deathX,
        y: deathY,
        z: deathZ,
        type: 'death',
      });
    }

    // 5. Logout Point (offline save)
    if (logoutWorld?.haveLogout && logoutWorld.logoutPoint) {
      list.push({
        id: 'logout-point',
        name: 'Last Logout Location',
        x: logoutWorld.logoutPoint[0],
        y: logoutWorld.logoutPoint[1],
        z: logoutWorld.logoutPoint[2],
        type: 'logout',
      });
    }

    // 6. In-game Minimap pins
    pins.forEach((pin, index) => {
      let pinCategory = 'pin';
      // Valheim PinType mapping:
      // 0 = Fireplace, 1 = House, 2 = Anchor/Ship, 3 = Hammer/Craft, 4 = Death, 5 = Bed, 6 = Portal/Circle, 9 = Boss, 14-16 = Hildir
      if (pin.type === 6 || pin.name.toLowerCase().includes('portal')) pinCategory = 'portal';
      else if (pin.type === 1 || pin.name.toLowerCase().includes('base')) pinCategory = 'base';
      else if (pin.type === 9 || pin.name.toLowerCase().includes('boss')) pinCategory = 'boss';
      else if (pin.type === 4) pinCategory = 'death';
      else if (pin.type === 5) pinCategory = 'bed';
      else if (pin.type === 0) pinCategory = 'fire';
      else if (pin.type === 2) pinCategory = 'anchor';

      list.push({
        id: `pin-${index}-${pin.name}`,
        name: pin.name || `${pin.typeName || 'Pin'} #${index + 1}`,
        x: pin.pos.x,
        y: pin.pos.y,
        z: pin.pos.z,
        type: pinCategory,
        rawType: pin.type,
        checked: pin.checked,
      });
    });

    return list;
  }, [liveStatus, bedWorld, deathWorld, logoutWorld, pins]);

  // Filter markers by search and category
  const filteredMarkers = useMemo(() => {
    return allMarkers.filter((m) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!m.name.toLowerCase().includes(q) && !m.type.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (selectedCategory === 'all') return true;
      if (selectedCategory === 'portals') return m.type === 'portal';
      if (selectedCategory === 'bases') return m.type === 'base' || m.type === 'bed';
      if (selectedCategory === 'bosses') return m.type === 'boss';
      if (selectedCategory === 'deaths') return m.type === 'death';
      if (selectedCategory === 'pins') return m.type === 'pin' || m.type === 'fire' || m.type === 'anchor';
      return true;
    });
  }, [allMarkers, searchQuery, selectedCategory]);

  // Player position reference for distance calculations
  const playerX = liveStatus?.position?.x ?? bedWorld?.spawnPoint?.[0] ?? 0;
  const playerZ = liveStatus?.position?.z ?? bedWorld?.spawnPoint?.[2] ?? 0;

  const calculateDistance = (targetX: number, targetZ: number) => {
    const dx = targetX - playerX;
    const dz = targetZ - playerZ;
    const dist = Math.sqrt(dx * dx + dz * dz);
    return Math.round(dist);
  };

  const calculateBearing = (targetX: number, targetZ: number) => {
    const dx = targetX - playerX;
    const dz = targetZ - playerZ; // dz > 0 is North
    if (Math.abs(dx) < 5 && Math.abs(dz) < 5) return 'Here';
    const angleRad = Math.atan2(dx, dz); // angle clockwise from North
    const deg = (angleRad * (180 / Math.PI) + 360) % 360;
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const idx = Math.round(deg / 22.5) % 16;
    return directions[idx];
  };

  // Convert World Coordinates (X, Z) to Canvas Pixel Coordinates (screenX, screenY)
  const worldToScreen = (wx: number, wz: number, width: number, height: number) => {
    const cx = width / 2 + panX;
    const cy = height / 2 + panY;
    const sx = cx + wx * scale;
    const sy = cy - wz * scale; // +Z is North / upward
    return { sx, sy };
  };

  // Convert Canvas Pixel Coordinates (screenX, screenY) to World Coordinates (wx, wz)
  const screenToWorld = (sx: number, sy: number, width: number, height: number) => {
    const cx = width / 2 + panX;
    const cy = height / 2 + panY;
    const wx = (sx - cx) / scale;
    const wz = -(sy - cy) / scale;
    return { wx, wz };
  };

  // Canvas Drawing Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 1. Clear background - Dark Nordic Ocean parchment
    ctx.fillStyle = '#0a0d12';
    ctx.fillRect(0, 0, width, height);

    // Subtle atmospheric ocean radial vignette
    const cx = width / 2 + panX;
    const cy = height / 2 + panY;
    const worldRadiusPx = 10000 * scale;

    const oceanGrad = ctx.createRadialGradient(cx, cy, 100, cx, cy, Math.max(worldRadiusPx, 400));
    oceanGrad.addColorStop(0, '#121822');
    oceanGrad.addColorStop(0.7, '#0d131b');
    oceanGrad.addColorStop(1, '#06080b');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Draw World Disk & Map Surface
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, worldRadiusPx, 0, Math.PI * 2);
    ctx.clip(); // Cleanly clip all map graphics inside the 10,000m world circle

    if (mapMode === 'real' && mapImage) {
      // Draw authentic in-game Valheim world map texture (2048x2048)
      ctx.drawImage(
        mapImage,
        cx - worldRadiusPx,
        cy - worldRadiusPx,
        worldRadiusPx * 2,
        worldRadiusPx * 2
      );
    } else if (mapMode === 'procedural' || (mapMode === 'real' && !mapImage)) {
      // Draw rich procedural biomes
      drawProceduralBiomes(ctx, cx, cy, worldRadiusPx);
    } else {
      // Nautical Chart mode: clean dark ocean parchment
      ctx.fillStyle = '#10151f';
      ctx.fillRect(cx - worldRadiusPx, cy - worldRadiusPx, worldRadiusPx * 2, worldRadiusPx * 2);
    }
    ctx.restore();

    // World Edge Waterfall border (warning ring)
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, worldRadiusPx, 0, Math.PI * 2);
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // 3. Distance Circles (2500m, 5000m, 7500m)
    [2500, 5000, 7500].forEach((dist) => {
      const r = dist * scale;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(184, 148, 77, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Distance labels
      ctx.fillStyle = 'rgba(230, 195, 100, 0.4)';
      ctx.font = '10px monospace';
      ctx.fillText(`${dist}m`, cx + 6, cy - r + 12);
    });

    // 4. Coordinate Axes & Grid Lines
    ctx.strokeStyle = 'rgba(69, 58, 43, 0.35)';
    ctx.lineWidth = 1;

    // Crosshairs through (0, 0)
    ctx.beginPath();
    ctx.moveTo(cx, cy - worldRadiusPx);
    ctx.lineTo(cx, cy + worldRadiusPx);
    ctx.moveTo(cx - worldRadiusPx, cy);
    ctx.lineTo(cx + worldRadiusPx, cy);
    ctx.stroke();

    // 5. Cardinal Direction Labels
    ctx.fillStyle = '#e6c364';
    ctx.font = 'bold 12px "Trajan Pro", Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N  •  THE DEEP NORTH', cx, cy - worldRadiusPx - 18);
    ctx.fillText('S  •  THE ASHLANDS', cx, cy + worldRadiusPx + 18);
    ctx.fillText('W', cx - worldRadiusPx - 18, cy);
    ctx.fillText('E', cx + worldRadiusPx + 18, cy);

    // 6. Draw Markers
    filteredMarkers.forEach((marker) => {
      const { sx, sy } = worldToScreen(marker.x, marker.z, width, height);

      // Skip off-screen markers
      if (sx < -40 || sx > width + 40 || sy < -40 || sy > height + 40) return;

      const isSelected = selectedMarker?.id === marker.id;

      ctx.save();

      if (marker.type === 'player') {
        // Player Marker: Glowing cyan avatar with beacon pulse
        ctx.beginPath();
        ctx.arc(sx, sy, 14, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(sx, sy, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#06b6d4';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Direction / label
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = '#67e8f9';
        ctx.textAlign = 'center';
        ctx.fillText(marker.name, sx, sy - 14);
      } else if (marker.type === 'bed') {
        // Bed: Emerald green marker
        ctx.beginPath();
        ctx.arc(sx, sy, 9, 0, Math.PI * 2);
        ctx.fillStyle = '#10b981';
        ctx.fill();
        ctx.strokeStyle = '#064e3b';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.font = '11px sans-serif';
        ctx.fillText('🛏️', sx - 6, sy + 4);

        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#a7f3d0';
        ctx.textAlign = 'center';
        ctx.fillText(marker.name, sx, sy - 12);
      } else if (marker.type === 'death') {
        // Death: Crimson skull
        ctx.beginPath();
        ctx.arc(sx, sy, 9, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
        ctx.strokeStyle = '#7f1d1d';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.font = '11px sans-serif';
        ctx.fillText('💀', sx - 6, sy + 4);

        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#fca5a5';
        ctx.textAlign = 'center';
        ctx.fillText(marker.name, sx, sy - 12);
      } else if (marker.type === 'portal') {
        // Portal: Swirling Violet
        ctx.beginPath();
        ctx.arc(sx, sy, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#8b5cf6';
        ctx.fill();
        ctx.strokeStyle = '#4c1d95';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#c4b5fd';
        ctx.textAlign = 'center';
        ctx.fillText(`🌀 ${marker.name}`, sx, sy - 10);
      } else if (marker.type === 'boss') {
        // Boss: Gold Crown
        ctx.beginPath();
        ctx.arc(sx, sy, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#f59e0b';
        ctx.fill();
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#fde68a';
        ctx.textAlign = 'center';
        ctx.fillText(`👑 ${marker.name}`, sx, sy - 11);
      } else if (marker.type === 'base') {
        // Base / Camp: Amber house
        ctx.beginPath();
        ctx.arc(sx, sy, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#d97706';
        ctx.fill();
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#fcd34d';
        ctx.textAlign = 'center';
        ctx.fillText(`🏠 ${marker.name}`, sx, sy - 10);
      } else {
        // Standard pin
        ctx.beginPath();
        ctx.arc(sx, sy, 5, 0, Math.PI * 2);
        ctx.fillStyle = marker.checked ? '#6b7280' : '#e6c364';
        ctx.fill();
        ctx.strokeStyle = '#2b2118';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = '10px sans-serif';
        ctx.fillStyle = marker.checked ? '#9ca3af' : '#ffea9f';
        ctx.textAlign = 'center';
        ctx.fillText(marker.name, sx, sy - 8);
      }

      // Selection Halo
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(sx, sy, 18, 0, Math.PI * 2);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Crosshair reticle
        ctx.beginPath();
        ctx.moveTo(sx - 24, sy);
        ctx.lineTo(sx + 24, sy);
        ctx.moveTo(sx, sy - 24);
        ctx.lineTo(sx, sy + 24);
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.7)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.restore();
    });
  }, [allMarkers, filteredMarkers, selectedMarker, scale, panX, panY, mapImage, mapMode, hasRealMap]);

  // Handle Canvas Mouse Drag (Pan) & Click Selection
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const { wx, wz } = screenToWorld(sx, sy, canvas.width, canvas.height);
    setCursorWorldPos({ x: Math.round(wx), z: Math.round(wz) });

    if (isDragging) {
      setPanX(e.clientX - dragStart.x);
      setPanY(e.clientY - dragStart.y);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Canvas Click to select marker or set custom coordinate
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    // Check if clicked close to any marker
    let hitMarker: MapMarker | null = null;
    for (const marker of filteredMarkers) {
      const { sx: msx, sy: msy } = worldToScreen(marker.x, marker.z, canvas.width, canvas.height);
      const dist = Math.hypot(sx - msx, sy - msy);
      if (dist <= 16) {
        hitMarker = marker;
        break;
      }
    }

    if (hitMarker) {
      setSelectedMarker(hitMarker);
      setCustomX(hitMarker.x.toFixed(1));
      setCustomY(hitMarker.y.toFixed(1));
      setCustomZ(hitMarker.z.toFixed(1));
    } else {
      // Placed custom coordinate on map!
      const { wx, wz } = screenToWorld(sx, sy, canvas.width, canvas.height);
      const newMarker: MapMarker = {
        id: `custom-${Date.now()}`,
        name: `Target Location (${Math.round(wx)}, ${Math.round(wz)})`,
        x: Math.round(wx),
        y: 35,
        z: Math.round(wz),
        type: 'pin',
      };
      setSelectedMarker(newMarker);
      setCustomX(Math.round(wx).toString());
      setCustomY('35');
      setCustomZ(Math.round(wz).toString());
    }
  };

  // Zoom with Wheel
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    setScale((prev) => Math.min(0.25, Math.max(0.015, prev * zoomFactor)));
  };

  // Quick Center Buttons
  const handleCenterOnPlayer = () => {
    if (liveStatus?.position) {
      setPanX(-liveStatus.position.x * scale);
      setPanY(liveStatus.position.z * scale);
      showToast(`Centered map on ${liveStatus.playerName || 'Player'}`, 'info');
    } else if (bedWorld?.spawnPoint) {
      setPanX(-bedWorld.spawnPoint[0] * scale);
      setPanY(bedWorld.spawnPoint[2] * scale);
      showToast('Centered on Bed spawn', 'info');
    }
  };

  const handleCenterOnBed = () => {
    const bx = liveStatus?.spawnPoint?.x ?? bedWorld?.spawnPoint?.[0];
    const bz = liveStatus?.spawnPoint?.z ?? bedWorld?.spawnPoint?.[2];
    if (bx !== undefined && bz !== undefined) {
      setPanX(-bx * scale);
      setPanY(bz * scale);
      showToast('Centered map on Bed Spawn', 'info');
    } else {
      showToast('No bed spawn point recorded.', 'info');
    }
  };

  const handleResetView = () => {
    setPanX(0);
    setPanY(0);
    setScale(0.038);
    showToast('Reset map view to World Center (0, 0)', 'info');
  };

  // Teleport Execution
  const handleExecuteTeleport = async (targetX: number, targetY: number, targetZ: number, label: string) => {
    if (liveStatus?.inGame) {
      setIsTeleporting(true);
      try {
        const res = await teleportLive(targetX, targetY, targetZ);
        if (res.success) {
          showToast(`⚡ Teleported to ${label} (${targetX.toFixed(0)}, ${targetZ.toFixed(0)})!`, 'success');
        } else {
          showToast(`Teleport failed: ${res.error || 'Check game'}`, 'error');
        }
      } catch (err: any) {
        showToast(`Teleport error: ${err.message}`, 'error');
      } finally {
        setIsTeleporting(false);
      }
    } else {
      // Offline file mode: update character location
      if (onSetCustomLocation) {
        onSetCustomLocation(targetX, targetY, targetZ);
        showToast(`Set login location in character save to (${targetX.toFixed(0)}, ${targetZ.toFixed(0)})! Save file to commit.`, 'success');
      } else {
        showToast('Valheim Live Bridge is offline. Launch game to teleport live.', 'info');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in-50">
      <div className="bg-valheim-dark border border-valheim-border rounded-xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden relative">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-valheim-border bg-valheim-panel/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-amber-950/80 border border-valheim-brass flex items-center justify-center text-valheim-gold">
              <Compass className="w-5 h-5 animate-[spin_12s_linear_infinite]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-valheim font-bold text-valheim-gold tracking-wide">
                  World Map & Pin Explorer
                </h2>
                {liveStatus?.inGame ? (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/80 text-emerald-300 text-[11px] font-semibold">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    LIVE: {liveStatus.playerName} ({pins.length} Pins)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-valheim-slot border border-valheim-border text-gray-400 text-[11px]">
                    Offline File Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">
                Inspect world markers, bed spawn, tombstones & 1-click teleport player directly in-game.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {liveStatus?.inGame && (
              <>
                <button
                  onClick={fetchRealMap}
                  disabled={isLoadingMapImage}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-950/80 hover:bg-amber-900 border border-valheim-brass text-xs text-valheim-gold font-valheim font-semibold transition shadow hover:shadow-glow"
                  title="Fetch authentic 2048x2048 world map from running Valheim session"
                >
                  <ImageIcon className={`w-3.5 h-3.5 ${isLoadingMapImage ? 'animate-pulse text-valheim-gold' : ''}`} />
                  <span>{isLoadingMapImage ? 'Fetching Map...' : hasRealMap ? 'Update Real Map' : 'Sync Real Map'}</span>
                </button>
                <button
                  onClick={refreshPins}
                  disabled={isLoadingPins}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-valheim-panel hover:bg-valheim-slothover border border-valheim-border text-xs text-valheim-goldlight transition"
                  title="Refresh Pins from Valheim Game"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPins ? 'animate-spin text-valheim-gold' : ''}`} />
                  <span>Refresh Pins</span>
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded hover:bg-valheim-slothover flex items-center justify-center text-gray-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Content: Sidebar + Canvas Map Viewport */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          {/* Left Sidebar: Pin Search & Filter List */}
          <div className="w-full md:w-80 bg-valheim-panel/60 border-r border-valheim-border/80 flex flex-col shrink-0">
            {/* Search Input */}
            <div className="p-3 border-b border-valheim-border/60">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search pins, portals, bases..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-valheim-dark border border-valheim-border rounded px-9 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-valheim-brass"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2 text-gray-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Chips */}
              <div className="flex flex-wrap gap-1 mt-2.5">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'portals', label: 'Portals' },
                  { id: 'bases', label: 'Bases' },
                  { id: 'bosses', label: 'Bosses' },
                  { id: 'deaths', label: 'Deaths' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                      selectedCategory === cat.id
                        ? 'bg-amber-950 border border-valheim-brass text-valheim-gold'
                        : 'bg-valheim-dark border border-valheim-border/80 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Marker List */}
            <div className="flex-1 overflow-y-auto divide-y divide-valheim-border/40 p-1">
              {filteredMarkers.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-500">
                  No markers or pins matching "{searchQuery}"
                </div>
              ) : (
                filteredMarkers.map((marker) => {
                  const isSelected = selectedMarker?.id === marker.id;
                  const dist = calculateDistance(marker.x, marker.z);
                  const bearing = calculateBearing(marker.x, marker.z);

                  return (
                    <div
                      key={marker.id}
                      onClick={() => {
                        setSelectedMarker(marker);
                        setCustomX(marker.x.toFixed(1));
                        setCustomY(marker.y.toFixed(1));
                        setCustomZ(marker.z.toFixed(1));
                        // Pan to marker
                        setPanX(-marker.x * scale);
                        setPanY(marker.z * scale);
                      }}
                      className={`p-2.5 rounded transition cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-valheim-dark border border-valheim-brass/80 text-valheim-gold'
                          : 'hover:bg-valheim-dark/60 text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-base shrink-0">
                          {marker.type === 'player'
                            ? '🧭'
                            : marker.type === 'bed'
                            ? '🛏️'
                            : marker.type === 'death'
                            ? '💀'
                            : marker.type === 'portal'
                            ? '🌀'
                            : marker.type === 'boss'
                            ? '👑'
                            : marker.type === 'base'
                            ? '🏠'
                            : '📍'}
                        </span>
                        <div className="truncate">
                          <div className="text-xs font-semibold truncate">{marker.name}</div>
                          <div className="text-[10px] text-gray-400 font-mono">
                            X: {marker.x.toFixed(0)}, Z: {marker.z.toFixed(0)} &bull; {dist}m ({bearing})
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExecuteTeleport(marker.x, marker.y, marker.z, marker.name);
                        }}
                        disabled={isTeleporting}
                        className="px-2 py-1 rounded bg-amber-950/80 hover:bg-amber-900 border border-valheim-brass text-[11px] font-valheim font-semibold text-amber-200 transition shadow hover:shadow-glow shrink-0 flex items-center gap-1 active:scale-95"
                        title={`Teleport directly to ${marker.name}`}
                      >
                        <Zap className="w-3 h-3 text-amber-400" />
                        <span>Teleport</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Area: Interactive Canvas Map */}
          <div className="flex-1 flex flex-col relative overflow-hidden bg-black select-none">
            {/* Viewport Floating Controls */}
            <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-1.5 bg-valheim-dark/90 backdrop-blur border border-valheim-border rounded-lg p-1 shadow-lg">
              <button
                onClick={() => setScale((prev) => Math.min(0.25, prev * 1.3))}
                className="w-8 h-8 rounded hover:bg-valheim-panel flex items-center justify-center text-gray-300 hover:text-valheim-gold transition"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setScale((prev) => Math.max(0.015, prev * 0.7))}
                className="w-8 h-8 rounded hover:bg-valheim-panel flex items-center justify-center text-gray-300 hover:text-valheim-gold transition"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <div className="h-5 w-px bg-valheim-border/60 mx-0.5" />
              <button
                onClick={handleCenterOnPlayer}
                className="px-2.5 py-1 rounded hover:bg-valheim-panel text-xs text-cyan-300 font-semibold flex items-center gap-1 transition"
                title="Center view on Player"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Player</span>
              </button>
              <button
                onClick={handleCenterOnBed}
                className="px-2.5 py-1 rounded hover:bg-valheim-panel text-xs text-emerald-300 font-semibold flex items-center gap-1 transition"
                title="Center view on Bed Spawn"
              >
                <span>🛏️ Bed</span>
              </button>
              <button
                onClick={handleResetView}
                className="w-8 h-8 rounded hover:bg-valheim-panel flex items-center justify-center text-gray-300 hover:text-valheim-gold transition"
                title="Reset View (World Center)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <div className="h-5 w-px bg-valheim-border/60 mx-0.5" />

              {/* Map Layer Mode Switcher */}
              <div className="flex items-center bg-valheim-panel/90 rounded border border-valheim-border/80 p-0.5 gap-0.5">
                <button
                  onClick={() => setMapMode('real')}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition flex items-center gap-1 ${
                    mapMode === 'real'
                      ? 'bg-amber-950 border border-valheim-brass text-valheim-gold shadow'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                  title={hasRealMap ? "Authentic Valheim World Map Texture" : "Live In-Game Map Texture (falls back to biomes if offline)"}
                >
                  <ImageIcon className="w-3 h-3" />
                  <span>Real Map</span>
                  {hasRealMap && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
                </button>
                <button
                  onClick={() => setMapMode('procedural')}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition flex items-center gap-1 ${
                    mapMode === 'procedural'
                      ? 'bg-amber-950 border border-valheim-brass text-valheim-gold shadow'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                  title="Procedural Biomes Layout"
                >
                  <Mountain className="w-3 h-3" />
                  <span>Biomes</span>
                </button>
                <button
                  onClick={() => setMapMode('chart')}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition flex items-center gap-1 ${
                    mapMode === 'chart'
                      ? 'bg-amber-950 border border-valheim-brass text-valheim-gold shadow'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                  title="Minimalist Nautical Chart"
                >
                  <Layers className="w-3 h-3" />
                  <span>Chart</span>
                </button>
              </div>
            </div>

            {/* Coordinates Readout HUD (Top Right) */}
            <div className="absolute top-3 right-3 z-10 bg-valheim-dark/90 backdrop-blur border border-valheim-border rounded-lg px-3 py-1.5 shadow-lg text-right font-mono text-xs">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider">World Coordinates</div>
              <div className="text-valheim-gold font-bold">
                {cursorWorldPos ? `X: ${cursorWorldPos.x}, Z: ${cursorWorldPos.z}` : 'X: 0, Z: 0'}
              </div>
            </div>

            {/* Biome Legend (subtle bar on top right below coordinates) */}
            <div className="absolute top-16 right-3 z-10 hidden sm:flex items-center gap-2 bg-valheim-dark/85 backdrop-blur border border-valheim-border/80 rounded px-2.5 py-1 text-[10px] text-gray-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#3d7a35]"></span>Meadows</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#1e4a28]"></span>Black Forest</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#3f4a28]"></span>Swamp</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#ffffff]"></span>Mountain</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#b8943d]"></span>Plains</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#6a3082]"></span>Mistlands</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#b32b19]"></span>Ashlands</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#a8e0f0]"></span>Deep North</span>
            </div>

            {/* Offline/Procedural notice if real map not loaded yet */}
            {mapMode === 'real' && !hasRealMap && (
              <div className="absolute top-16 left-3 z-10 bg-amber-950/80 backdrop-blur border border-amber-600/60 rounded px-2.5 py-1 text-[11px] text-amber-300 flex items-center gap-1.5 shadow-lg">
                <Sparkles className="w-3.5 h-3.5 text-valheim-gold shrink-0" />
                <span>Showing procedural biomes. Sync while in-game to load real terrain.</span>
              </div>
            )}

            {/* Selected Marker Inspector Banner (if selected) */}
            {selectedMarker && (
              <div className="absolute bottom-3 left-3 right-3 md:right-auto md:w-96 z-10 bg-valheim-dark/95 backdrop-blur-md border border-valheim-brass rounded-lg p-3.5 shadow-2xl animate-in fade-in-50 slide-in-from-bottom-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg">
                        {selectedMarker.type === 'player'
                          ? '🧭'
                          : selectedMarker.type === 'bed'
                          ? '🛏️'
                          : selectedMarker.type === 'death'
                          ? '💀'
                          : selectedMarker.type === 'portal'
                          ? '🌀'
                          : selectedMarker.type === 'boss'
                          ? '👑'
                          : selectedMarker.type === 'base'
                          ? '🏠'
                          : '📍'}
                      </span>
                      <span className="font-valheim font-bold text-sm text-valheim-gold">
                        {selectedMarker.name}
                      </span>
                    </div>
                    <div className="text-xs text-gray-300 font-mono mt-1">
                      Coordinates: ({selectedMarker.x.toFixed(1)}, {selectedMarker.y.toFixed(1)}, {selectedMarker.z.toFixed(1)})
                    </div>
                    <div className="text-[11px] text-amber-400 mt-0.5">
                      Distance from Player: {calculateDistance(selectedMarker.x, selectedMarker.z)} meters (
                      {calculateBearing(selectedMarker.x, selectedMarker.z)})
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedMarker(null)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() =>
                      handleExecuteTeleport(
                        selectedMarker.x,
                        selectedMarker.y,
                        selectedMarker.z,
                        selectedMarker.name
                      )
                    }
                    disabled={isTeleporting}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 border border-valheim-brass text-valheim-dark font-valheim font-bold text-xs tracking-wider transition shadow active:scale-95 cursor-pointer"
                  >
                    <Zap className="w-4 h-4 fill-valheim-dark" />
                    <span>{isTeleporting ? 'Teleporting...' : 'Teleport Here Live'}</span>
                  </button>

                  {/* Offline save location */}
                  {onSetCustomLocation && !liveStatus?.inGame && (
                    <button
                      onClick={() => {
                        onSetCustomLocation(selectedMarker.x, selectedMarker.y, selectedMarker.z);
                        showToast(`Set character login location to (${selectedMarker.x.toFixed(0)}, ${selectedMarker.z.toFixed(0)})! Save file to persist.`, 'success');
                      }}
                      className="px-2.5 py-2 rounded bg-valheim-panel hover:bg-valheim-slothover border border-valheim-border text-[11px] text-gray-200"
                      title="Set as player login location in character save file"
                    >
                      Save to .fch
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Canvas Viewport */}
            <canvas
              ref={canvasRef}
              width={1000}
              height={700}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onClick={handleCanvasClick}
              onWheel={handleWheel}
              className="w-full h-full cursor-grab active:cursor-grabbing block"
            />
          </div>
        </div>

        {/* Modal Bottom Bar: Direct Coordinate Teleportation */}
        <div className="px-5 py-3 border-t border-valheim-border bg-valheim-panel/95 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-valheim font-semibold text-valheim-goldlight flex items-center gap-1">
              <Crosshair className="w-4 h-4 text-valheim-gold" />
              <span>Target Coordinates:</span>
            </span>

            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-gray-400">X:</span>
              <input
                type="number"
                value={customX}
                onChange={(e) => setCustomX(e.target.value)}
                className="w-20 bg-valheim-dark border border-valheim-border rounded px-2 py-1 text-center text-xs focus:outline-none focus:border-valheim-brass"
              />
              <span className="text-gray-400 ml-1">Y (Altitude):</span>
              <input
                type="number"
                value={customY}
                onChange={(e) => setCustomY(e.target.value)}
                className="w-16 bg-valheim-dark border border-valheim-border rounded px-2 py-1 text-center text-xs focus:outline-none focus:border-valheim-brass"
              />
              <span className="text-gray-400 ml-1">Z:</span>
              <input
                type="number"
                value={customZ}
                onChange={(e) => setCustomZ(e.target.value)}
                className="w-20 bg-valheim-dark border border-valheim-border rounded px-2 py-1 text-center text-xs focus:outline-none focus:border-valheim-brass"
              />
            </div>

            <button
              onClick={() => {
                const x = parseFloat(customX) || 0;
                const y = parseFloat(customY) || 35;
                const z = parseFloat(customZ) || 0;
                handleExecuteTeleport(x, y, z, `Coordinates (${x}, ${z})`);
              }}
              disabled={isTeleporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-950/90 hover:bg-amber-900 border border-valheim-brass text-amber-200 font-valheim font-semibold transition shadow hover:shadow-glow active:scale-95 ml-1"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>{isTeleporting ? 'Teleporting...' : 'Teleport to Coordinates'}</span>
            </button>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-[11px] hidden sm:inline">Quick Jump:</span>
            {bedWorld?.spawnPoint && (
              <button
                onClick={() =>
                  handleExecuteTeleport(
                    bedWorld.spawnPoint[0],
                    bedWorld.spawnPoint[1],
                    bedWorld.spawnPoint[2],
                    'Bed Spawn'
                  )
                }
                className="px-2.5 py-1 rounded bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-600/70 text-emerald-200 text-xs flex items-center gap-1 transition"
              >
                <span>🛏️ Bed</span>
              </button>
            )}

            {deathWorld?.deathPoint && (
              <button
                onClick={() =>
                  handleExecuteTeleport(
                    deathWorld.deathPoint[0],
                    deathWorld.deathPoint[1],
                    deathWorld.deathPoint[2],
                    'Tombstone Grave'
                  )
                }
                className="px-2.5 py-1 rounded bg-red-950/70 hover:bg-red-900 border border-red-700/80 text-red-200 text-xs flex items-center gap-1 transition"
              >
                <span>💀 Grave</span>
              </button>
            )}

            <button
              onClick={() => handleExecuteTeleport(0, 30, 0, 'World Center')}
              className="px-2.5 py-1 rounded bg-valheim-dark hover:bg-valheim-panel border border-valheim-border text-gray-300 text-xs flex items-center gap-1 transition"
            >
              <span>Sacrificial Stones (0, 0)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
