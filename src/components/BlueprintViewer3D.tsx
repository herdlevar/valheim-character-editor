import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  RotateCcw,
  Sliders,
  Layers,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  X,
  Download,
  Hammer,
  Sparkles,
  Grid,
  Box,
  Flame,
  Camera,
  Play,
  Pause,
  Info,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { BlueprintPieceData } from '../services/liveBridge';

interface BlueprintViewer3DProps {
  blueprintName: string;
  pieces: BlueprintPieceData[];
  rawBlueprintText?: string;
  author?: string;
  description?: string;
  category?: string;
  onClose?: () => void;
  onArm?: () => void;
  onBuild?: () => void;
}

// Material color definitions tailored to Valheim aesthetics
const PALETTE = {
  woodPlank: '#8B5A2B',
  woodLog: '#5C3A21',
  darkwood: '#402717',
  stone: '#6B7280',
  stoneDark: '#4B5563',
  iron: '#374151',
  bronze: '#B45309',
  thatch: '#D97706',
  fireGlow: '#F97316',
  cloth: '#1E3A8A',
  greenTorch: '#10B981',
  blueTorch: '#06B6D4',
  highlight: '#38BDF8',
};

// Material cache for optimal Three.js rendering performance
function getMaterial(color: string, roughness = 0.8, metalness = 0.1, emissive = '#000000', emissiveIntensity = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness,
    metalness,
    emissive: new THREE.Color(emissive),
    emissiveIntensity,
    flatShading: true,
  });
}

// Procedural geometry helper for Valheim piece archetypes
function createPieceMesh(prefab: string): { geometry: THREE.BufferGeometry; material: THREE.Material; isFire?: boolean } {
  const p = prefab.toLowerCase();

  // 1. Thatch Roofs
  if (p.includes('roof45') || p.includes('roof_45')) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(2, 2);
    shape.lineTo(2, 0);
    shape.closePath();
    const geom = new THREE.ExtrudeGeometry(shape, { depth: 2, bevelEnabled: false });
    geom.center();
    return { geometry: geom, material: getMaterial(PALETTE.thatch, 0.9, 0) };
  }
  if (p.includes('roof26') || p.includes('roof_26') || p.includes('roof')) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(2, 1);
    shape.lineTo(2, 0);
    shape.closePath();
    const geom = new THREE.ExtrudeGeometry(shape, { depth: 2, bevelEnabled: false });
    geom.center();
    return { geometry: geom, material: getMaterial(PALETTE.thatch, 0.9, 0) };
  }

  // 2. Stone Walls & Floors
  if (p.includes('stonefloor4x4') || p.includes('stone_floor_4x4')) {
    return { geometry: new THREE.BoxGeometry(4, 0.3, 4), material: getMaterial(PALETTE.stoneDark, 0.9, 0.05) };
  }
  if (p.includes('stonefloor') || p.includes('stone_floor')) {
    return { geometry: new THREE.BoxGeometry(2, 0.3, 2), material: getMaterial(PALETTE.stone, 0.9, 0.05) };
  }
  if (p.includes('stonewall4x2') || p.includes('stone_wall_4x2')) {
    return { geometry: new THREE.BoxGeometry(4, 2, 0.5), material: getMaterial(PALETTE.stoneDark, 0.95, 0.05) };
  }
  if (p.includes('stonewall2x1') || p.includes('stone_wall_2x1')) {
    return { geometry: new THREE.BoxGeometry(2, 1, 0.5), material: getMaterial(PALETTE.stone, 0.95, 0.05) };
  }
  if (p.includes('stonewall1x1') || p.includes('stone_wall_1x1')) {
    return { geometry: new THREE.BoxGeometry(1, 1, 0.5), material: getMaterial(PALETTE.stone, 0.95, 0.05) };
  }
  if (p.includes('stonepillar') || p.includes('stone_pillar')) {
    return { geometry: new THREE.BoxGeometry(1, 2, 1), material: getMaterial(PALETTE.stoneDark, 0.9, 0.1) };
  }
  if (p.includes('stonestair') || p.includes('stone_stair')) {
    return { geometry: new THREE.BoxGeometry(2, 1.5, 2), material: getMaterial(PALETTE.stone, 0.9, 0.05) };
  }
  if (p.includes('stonearch') || p.includes('stone_arch')) {
    return { geometry: new THREE.BoxGeometry(2, 2, 0.5), material: getMaterial(PALETTE.stone, 0.9, 0.05) };
  }

  // 3. Wood Floors
  if (p.includes('woodfloor1x1') || p.includes('wood_floor_1x1')) {
    return { geometry: new THREE.BoxGeometry(1, 0.12, 1), material: getMaterial(PALETTE.woodPlank, 0.7, 0.05) };
  }
  if (p.includes('woodfloor') || p.includes('wood_floor')) {
    return { geometry: new THREE.BoxGeometry(2, 0.12, 2), material: getMaterial(PALETTE.woodPlank, 0.7, 0.05) };
  }

  // 4. Wood Walls
  if (p.includes('woodwallhalf') || p.includes('wood_wall_half')) {
    return { geometry: new THREE.BoxGeometry(2, 1, 0.15), material: getMaterial(PALETTE.woodPlank, 0.75, 0.05) };
  }
  if (p.includes('woodwallquarter') || p.includes('wood_wall_quarter')) {
    return { geometry: new THREE.BoxGeometry(1, 1, 0.15), material: getMaterial(PALETTE.woodPlank, 0.75, 0.05) };
  }
  if (p.includes('woodwall') || p.includes('wood_wall')) {
    return { geometry: new THREE.BoxGeometry(2, 2, 0.15), material: getMaterial(PALETTE.woodPlank, 0.75, 0.05) };
  }

  // 5. Beams & Poles
  if (p.includes('logpole4') || p.includes('log_pole_4')) {
    return { geometry: new THREE.CylinderGeometry(0.2, 0.2, 4, 8), material: getMaterial(PALETTE.woodLog, 0.8, 0.05) };
  }
  if (p.includes('logpole') || p.includes('log_pole')) {
    return { geometry: new THREE.CylinderGeometry(0.2, 0.2, 2, 8), material: getMaterial(PALETTE.woodLog, 0.8, 0.05) };
  }
  if (p.includes('logbeam4') || p.includes('log_beam_4')) {
    const geom = new THREE.CylinderGeometry(0.2, 0.2, 4, 8);
    geom.rotateZ(Math.PI / 2);
    return { geometry: geom, material: getMaterial(PALETTE.woodLog, 0.8, 0.05) };
  }
  if (p.includes('logbeam') || p.includes('log_beam')) {
    const geom = new THREE.CylinderGeometry(0.2, 0.2, 2, 8);
    geom.rotateZ(Math.PI / 2);
    return { geometry: geom, material: getMaterial(PALETTE.woodLog, 0.8, 0.05) };
  }
  if (p.includes('woodpole2') || p.includes('wood_pole_2')) {
    return { geometry: new THREE.BoxGeometry(0.22, 2, 0.22), material: getMaterial(PALETTE.woodPlank, 0.7, 0.05) };
  }
  if (p.includes('woodpole') || p.includes('wood_pole')) {
    return { geometry: new THREE.BoxGeometry(0.22, 1, 0.22), material: getMaterial(PALETTE.woodPlank, 0.7, 0.05) };
  }
  if (p.includes('woodbeam2') || p.includes('wood_beam_2')) {
    return { geometry: new THREE.BoxGeometry(2, 0.22, 0.22), material: getMaterial(PALETTE.woodPlank, 0.7, 0.05) };
  }
  if (p.includes('woodbeam') || p.includes('wood_beam')) {
    return { geometry: new THREE.BoxGeometry(1, 0.22, 0.22), material: getMaterial(PALETTE.woodPlank, 0.7, 0.05) };
  }

  // 6. Stairs & Doors
  if (p.includes('stair') || p.includes('wood_stair')) {
    return { geometry: new THREE.BoxGeometry(1.5, 1.5, 2), material: getMaterial(PALETTE.woodPlank, 0.7, 0.05) };
  }
  if (p.includes('door') || p.includes('wood_door')) {
    return { geometry: new THREE.BoxGeometry(1, 2, 0.1), material: getMaterial(PALETTE.woodPlank, 0.65, 0.1) };
  }

  // 7. Fire & Light
  if (p.includes('hearth') || p.includes('fire') || p.includes('bonfire')) {
    return {
      geometry: new THREE.BoxGeometry(1.8, 0.8, 1.8),
      material: getMaterial(PALETTE.stoneDark, 0.8, 0.1, PALETTE.fireGlow, 0.8),
      isFire: true,
    };
  }
  if (p.includes('groundtorchgreen') || p.includes('torch_green')) {
    return {
      geometry: new THREE.CylinderGeometry(0.08, 0.08, 1.4, 6),
      material: getMaterial(PALETTE.iron, 0.5, 0.5, PALETTE.greenTorch, 0.9),
      isFire: true,
    };
  }
  if (p.includes('groundtorchblue') || p.includes('torch_blue')) {
    return {
      geometry: new THREE.CylinderGeometry(0.08, 0.08, 1.4, 6),
      material: getMaterial(PALETTE.iron, 0.5, 0.5, PALETTE.blueTorch, 0.9),
      isFire: true,
    };
  }
  if (p.includes('torch')) {
    return {
      geometry: new THREE.CylinderGeometry(0.06, 0.06, 1.2, 6),
      material: getMaterial(PALETTE.woodPlank, 0.7, 0.1, PALETTE.fireGlow, 0.9),
      isFire: true,
    };
  }

  // 8. Iron & Utilities
  if (p.includes('iron') || p.includes('smelter') || p.includes('blastfurnace')) {
    return { geometry: new THREE.BoxGeometry(1.5, 2.5, 1.5), material: getMaterial(PALETTE.iron, 0.4, 0.7) };
  }
  if (p.includes('portal')) {
    return {
      geometry: new THREE.TorusGeometry(1, 0.25, 8, 24),
      material: getMaterial(PALETTE.woodLog, 0.7, 0.2, PALETTE.blueTorch, 0.8),
    };
  }

  // Default fallback
  return { geometry: new THREE.BoxGeometry(1, 1, 1), material: getMaterial(PALETTE.woodPlank, 0.8, 0.1) };
}

export const BlueprintViewer3D: React.FC<BlueprintViewer3DProps> = ({
  blueprintName,
  pieces,
  rawBlueprintText,
  author,
  description,
  category,
  onClose,
  onArm,
  onBuild,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Mesh mapping
  const pieceMeshesRef = useRef<Array<{ mesh: THREE.Mesh; origPos: THREE.Vector3; piece: BlueprintPieceData }>>([]);

  // Viewer Controls State
  const [slicePercent, setSlicePercent] = useState<number>(100);
  const [explodeFactor, setExplodeFactor] = useState<number>(0);
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showWireframe, setShowWireframe] = useState<boolean>(false);
  const [hoveredPiece, setHoveredPiece] = useState<{ prefab: string; pos: string; count: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Bounds & Dimensions
  const bounds = useMemo(() => {
    if (!pieces || pieces.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0, width: 0, height: 0, depth: 0, center: new THREE.Vector3() };
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (const p of pieces) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    }

    const width = Math.max(1, maxX - minX);
    const height = Math.max(1, maxY - minY);
    const depth = Math.max(1, maxZ - minZ);
    const center = new THREE.Vector3((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);

    return { minX, maxX, minY, maxY, minZ, maxZ, width, height, depth, center };
  }, [pieces]);

  // Bill of Materials Summary
  const billOfMaterials = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of pieces) {
      const clean = p.prefab.replace(/\(Clone\)/gi, '').trim();
      counts[clean] = (counts[clean] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [pieces]);

  // Estimated Resources
  const estimatedResources = useMemo(() => {
    let wood = 0;
    let stone = 0;
    let iron = 0;
    let thatch = 0;
    let coreWood = 0;

    for (const p of pieces) {
      const name = p.prefab.toLowerCase();
      if (name.includes('stone')) {
        stone += name.includes('4x4') ? 8 : name.includes('4x2') ? 6 : 2;
      } else if (name.includes('log')) {
        coreWood += name.includes('4') ? 2 : 1;
      } else if (name.includes('iron')) {
        iron += 2;
      } else if (name.includes('roof')) {
        wood += 1;
        thatch += 1;
      } else {
        wood += 2;
      }
    }
    return { wood, stone, iron, thatch, coreWood };
  }, [pieces]);

  // Initialize Three.js Scene
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0c1017');
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    const maxDim = Math.max(bounds.width, bounds.height, bounds.depth);
    const camDist = maxDim * 1.8 + 8;
    camera.position.set(camDist * 0.7, camDist * 0.5, camDist * 0.7);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, bounds.height * 0.35, 0);
    controls.maxPolarAngle = Math.PI / 2 + 0.05; // Don't flip under ground
    controlsRef.current = controls;

    // 5. Lighting
    const hemiLight = new THREE.HemisphereLight('#cbd5e1', '#1e293b', 0.9);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight('#ffffff', 1.2);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight('#38bdf8', 0.3);
    fillLight.position.set(-20, 15, -20);
    scene.add(fillLight);

    // 6. Ground Grid
    const gridHelper = new THREE.GridHelper(Math.max(30, maxDim * 2), Math.max(30, Math.round(maxDim * 2)), '#334155', '#1e293b');
    gridHelper.position.y = bounds.minY - 0.02;
    gridHelper.name = 'gridHelper';
    scene.add(gridHelper);

    // 7. Populate Pieces
    const pieceMeshes: Array<{ mesh: THREE.Mesh; origPos: THREE.Vector3; piece: BlueprintPieceData }> = [];
    const group = new THREE.Group();
    group.name = 'blueprintGroup';

    pieces.forEach((piece) => {
      const { geometry, material, isFire } = createPieceMesh(piece.prefab);
      const mesh = new THREE.Mesh(geometry, material.clone());
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Position
      mesh.position.set(piece.x, piece.y, piece.z);

      // Rotation (Quaternion)
      if (piece.rx !== undefined && piece.ry !== undefined && piece.rz !== undefined && piece.rw !== undefined) {
        mesh.quaternion.set(piece.rx, piece.ry, piece.rz, piece.rw);
      }

      // Metadata for raycasting
      mesh.userData = { piece };

      // Optional PointLight for fires / hearths
      if (isFire) {
        const fireLight = new THREE.PointLight('#ff7a00', 1.2, 5);
        fireLight.position.set(0, 0.4, 0);
        mesh.add(fireLight);
      }

      group.add(mesh);
      pieceMeshes.push({ mesh, origPos: new THREE.Vector3(piece.x, piece.y, piece.z), piece });
    });

    scene.add(group);
    pieceMeshesRef.current = pieceMeshes;

    // 8. Raycasting for hover tooltip
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let prevHoveredMesh: THREE.Mesh | null = null;
    let prevOriginalColor: THREE.Color | null = null;

    const handleMouseMove = (event: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(group.children);

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        if (hit !== prevHoveredMesh) {
          // Restore previous
          if (prevHoveredMesh && prevOriginalColor && prevHoveredMesh.material instanceof THREE.MeshStandardMaterial) {
            prevHoveredMesh.material.color.copy(prevOriginalColor);
            prevHoveredMesh.material.emissive.set('#000000');
          }
          // Highlight current
          if (hit.material instanceof THREE.MeshStandardMaterial) {
            prevOriginalColor = hit.material.color.clone();
            hit.material.emissive.set(PALETTE.highlight);
            hit.material.emissiveIntensity = 0.5;
            prevHoveredMesh = hit;
          }

          const hitPiece = hit.userData.piece as BlueprintPieceData;
          if (hitPiece) {
            setHoveredPiece({
              prefab: hitPiece.prefab,
              pos: `(${hitPiece.x.toFixed(1)}, ${hitPiece.y.toFixed(1)}, ${hitPiece.z.toFixed(1)})`,
              count: pieces.filter((p) => p.prefab === hitPiece.prefab).length,
            });
          }
        }
      } else {
        if (prevHoveredMesh && prevOriginalColor && prevHoveredMesh.material instanceof THREE.MeshStandardMaterial) {
          prevHoveredMesh.material.color.copy(prevOriginalColor);
          prevHoveredMesh.material.emissive.set('#000000');
          prevHoveredMesh = null;
        }
        setHoveredPiece(null);
      }
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('mousemove', handleMouseMove);

    // 9. Resize Observer
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;
      cameraRef.current.aspect = newWidth / newHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // 10. Animation Loop
    let clock = new THREE.Clock();
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      if (controlsRef.current) {
        if (isAutoRotating) {
          controlsRef.current.autoRotate = true;
          controlsRef.current.autoRotateSpeed = 2.0;
        } else {
          controlsRef.current.autoRotate = false;
        }
        controlsRef.current.update();
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
      domElement.removeEventListener('mousemove', handleMouseMove);
      renderer.dispose();
    };
  }, [pieces, bounds]);

  // Dynamic Height Slicing Update
  useEffect(() => {
    const cutoffY = bounds.minY + (bounds.height * slicePercent) / 100;
    pieceMeshesRef.current.forEach(({ mesh, piece }) => {
      mesh.visible = piece.y <= cutoffY + 0.1;
    });
  }, [slicePercent, bounds]);

  // Dynamic Explode Factor Update
  useEffect(() => {
    const center = bounds.center;
    pieceMeshesRef.current.forEach(({ mesh, origPos }) => {
      const offset = new THREE.Vector3().subVectors(origPos, center);
      mesh.position.set(
        origPos.x + offset.x * explodeFactor,
        origPos.y + offset.y * explodeFactor * 0.4,
        origPos.z + offset.z * explodeFactor
      );
    });
  }, [explodeFactor, bounds]);

  // Grid Helper Toggle
  useEffect(() => {
    if (!sceneRef.current) return;
    const grid = sceneRef.current.getObjectByName('gridHelper');
    if (grid) grid.visible = showGrid;
  }, [showGrid]);

  // Wireframe Toggle
  useEffect(() => {
    pieceMeshesRef.current.forEach(({ mesh }) => {
      if (mesh.material instanceof THREE.MeshStandardMaterial) {
        mesh.material.wireframe = showWireframe;
      }
    });
  }, [showWireframe]);

  // Auto-rotate toggle
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = isAutoRotating;
      controlsRef.current.autoRotateSpeed = 2.0;
    }
  }, [isAutoRotating]);

  // Camera Presets
  const setCameraView = (type: 'iso' | 'front' | 'top' | 'side') => {
    if (!cameraRef.current || !controlsRef.current) return;
    const maxDim = Math.max(bounds.width, bounds.height, bounds.depth);
    const dist = maxDim * 1.8 + 6;
    const target = new THREE.Vector3(0, bounds.height * 0.35, 0);

    controlsRef.current.target.copy(target);

    switch (type) {
      case 'iso':
        cameraRef.current.position.set(dist * 0.7, dist * 0.5, dist * 0.7);
        break;
      case 'front':
        cameraRef.current.position.set(0, target.y, dist);
        break;
      case 'top':
        cameraRef.current.position.set(0, dist * 1.2, 0.001);
        break;
      case 'side':
        cameraRef.current.position.set(dist, target.y, 0);
        break;
    }
    controlsRef.current.update();
  };

  const handleDownloadBlueprint = () => {
    let content = rawBlueprintText;
    if (!content) {
      const lines = [
        `#Name:${blueprintName}`,
        `#Creator:${author || 'Antigravity'}`,
        `#Description:${description || 'Exported from Valheim Companion App'}`,
        `#Category:${category || 'Blueprints'}`,
        '#Pieces',
      ];
      for (const p of pieces) {
        lines.push(`${p.prefab};Building;${p.x};${p.y};${p.z};${p.rx || 0};${p.ry || 0};${p.rz || 0};${p.rw ?? 1};""`);
      }
      content = lines.join('\n');
    }
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${blueprintName.replace(/\s+/g, '_')}.blueprint`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md transition-all p-3 sm:p-6 ${
        isFullscreen ? 'p-0' : ''
      }`}
    >
      <div
        className={`relative flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden transition-all ${
          isFullscreen ? 'w-full h-full rounded-none border-none' : 'w-full max-w-6xl h-[90vh]'
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-800/90 border-b border-slate-700/80 backdrop-blur-sm z-10">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white tracking-wide">{blueprintName}</h2>
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">
                  {pieces.length} Pieces
                </span>
                <span className="px-2 py-0.5 text-xs font-medium bg-slate-700/60 text-slate-300 rounded-full">
                  {bounds.width.toFixed(1)}m × {bounds.depth.toFixed(1)}m × {bounds.height.toFixed(1)}m
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Interactive 3D Blueprint Inspector • Rotate [Left-Click], Pan [Right-Click], Zoom [Scroll]
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onArm && (
              <button
                onClick={onArm}
                className="flex items-center px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all"
                title="Arm 3D Hologram in Valheim for real-time placement"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Arm in Game
              </button>
            )}

            {onBuild && (
              <button
                onClick={onBuild}
                className="flex items-center px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all"
                title="Instant Auto-Build in-game"
              >
                <Hammer className="w-3.5 h-3.5 mr-1.5" />
                Auto-Build
              </button>
            )}

            <button
              onClick={handleDownloadBlueprint}
              className="flex items-center px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-semibold transition-all"
              title="Download .blueprint file"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Download
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-rose-600/30 rounded-lg transition-all"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="relative flex-1 flex overflow-hidden">
          {/* 3D WebGL Canvas */}
          <div ref={containerRef} className="relative flex-1 w-full h-full cursor-grab active:cursor-grabbing outline-none" />

          {/* Hovered Piece HUD Tooltip */}
          {hoveredPiece && (
            <div className="absolute top-4 left-4 z-20 pointer-events-none px-3 py-2 bg-slate-900/90 border border-cyan-500/40 rounded-xl shadow-xl backdrop-blur-md animate-fade-in">
              <div className="flex items-center space-x-2 text-cyan-400 font-bold text-xs">
                <Box className="w-3.5 h-3.5" />
                <span>{hoveredPiece.prefab}</span>
              </div>
              <div className="text-[11px] text-slate-300 mt-0.5">Position: {hoveredPiece.pos}</div>
              <div className="text-[10px] text-slate-400">Total in structure: {hoveredPiece.count}</div>
            </div>
          )}

          {/* Floating Controls Bar (Bottom Left) */}
          <div className="absolute bottom-5 left-5 z-20 flex flex-wrap items-center gap-2 px-3 py-2 bg-slate-900/90 border border-slate-700/80 rounded-xl shadow-xl backdrop-blur-md">
            {/* Camera View Buttons */}
            <div className="flex items-center space-x-1 border-r border-slate-700/80 pr-2">
              <button
                onClick={() => setCameraView('iso')}
                className="px-2 py-1 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700/60 rounded transition-all"
                title="Isometric View"
              >
                Iso
              </button>
              <button
                onClick={() => setCameraView('front')}
                className="px-2 py-1 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700/60 rounded transition-all"
                title="Front View"
              >
                Front
              </button>
              <button
                onClick={() => setCameraView('top')}
                className="px-2 py-1 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700/60 rounded transition-all"
                title="Top-down Floorplan View"
              >
                Top
              </button>
              <button
                onClick={() => setCameraView('side')}
                className="px-2 py-1 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700/60 rounded transition-all"
                title="Side View"
              >
                Side
              </button>
            </div>

            {/* Turntable Auto-Rotate */}
            <button
              onClick={() => setIsAutoRotating(!isAutoRotating)}
              className={`flex items-center px-2 py-1 text-xs font-semibold rounded transition-all ${
                isAutoRotating
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
              title="Toggle Auto-Rotate Turntable"
            >
              {isAutoRotating ? <Pause className="w-3.5 h-3.5 mr-1" /> : <Play className="w-3.5 h-3.5 mr-1" />}
              Rotate
            </button>

            {/* Grid Toggle */}
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`flex items-center px-2 py-1 text-xs font-semibold rounded transition-all ${
                showGrid
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
              }`}
              title="Toggle Ground Grid"
            >
              <Grid className="w-3.5 h-3.5 mr-1" />
              Grid
            </button>

            {/* Wireframe Toggle */}
            <button
              onClick={() => setShowWireframe(!showWireframe)}
              className={`flex items-center px-2 py-1 text-xs font-semibold rounded transition-all ${
                showWireframe
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
              }`}
              title="Toggle Wireframe Mode"
            >
              <Box className="w-3.5 h-3.5 mr-1" />
              Wireframe
            </button>
          </div>

          {/* Right Sidebar: Sliders & Bill of Materials */}
          <div className="w-80 border-l border-slate-700/80 bg-slate-900/95 flex flex-col h-full z-10 overflow-hidden">
            {/* Sliders Panel */}
            <div className="p-4 border-b border-slate-700/80 space-y-4 bg-slate-800/40">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center">
                  <Sliders className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
                  3D Inspection Tools
                </span>
                {(slicePercent < 100 || explodeFactor > 0) && (
                  <button
                    onClick={() => {
                      setSlicePercent(100);
                      setExplodeFactor(0);
                    }}
                    className="text-[10px] text-amber-400 hover:underline flex items-center"
                  >
                    <RefreshCw className="w-2.5 h-2.5 mr-1" /> Reset
                  </button>
                )}
              </div>

              {/* Height Slicing Cutaway */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                  <span className="flex items-center">
                    <Layers className="w-3 h-3 mr-1 text-emerald-400" />
                    Height Slicing (Cutaway)
                  </span>
                  <span className="font-mono text-emerald-400">{slicePercent}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="1"
                  value={slicePercent}
                  onChange={(e) => setSlicePercent(Number(e.target.value))}
                  className="w-full accent-emerald-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                  <span>Foundation</span>
                  <span>Roof</span>
                </div>
              </div>

              {/* Explode Diagram Slider */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                  <span className="flex items-center">
                    <Sparkles className="w-3 h-3 mr-1 text-amber-400" />
                    Explode View
                  </span>
                  <span className="font-mono text-amber-400">{(explodeFactor * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.05"
                  value={explodeFactor}
                  onChange={(e) => setExplodeFactor(Number(e.target.value))}
                  className="w-full accent-amber-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                  <span>Assembled</span>
                  <span>Exploded</span>
                </div>
              </div>
            </div>

            {/* Estimated Materials Section */}
            <div className="p-4 border-b border-slate-700/80 bg-slate-800/20">
              <h3 className="text-xs font-bold text-slate-300 mb-2 flex items-center">
                <Hammer className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                Estimated Resources
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {estimatedResources.wood > 0 && (
                  <div className="flex items-center justify-between px-2 py-1 bg-amber-950/30 border border-amber-800/40 rounded-lg">
                    <span className="text-amber-200">Wood</span>
                    <span className="font-bold text-amber-400">{estimatedResources.wood}</span>
                  </div>
                )}
                {estimatedResources.stone > 0 && (
                  <div className="flex items-center justify-between px-2 py-1 bg-slate-800/60 border border-slate-700 rounded-lg">
                    <span className="text-slate-300">Stone</span>
                    <span className="font-bold text-slate-200">{estimatedResources.stone}</span>
                  </div>
                )}
                {estimatedResources.coreWood > 0 && (
                  <div className="flex items-center justify-between px-2 py-1 bg-amber-900/30 border border-amber-700/40 rounded-lg">
                    <span className="text-amber-300">Core Wood</span>
                    <span className="font-bold text-amber-400">{estimatedResources.coreWood}</span>
                  </div>
                )}
                {estimatedResources.thatch > 0 && (
                  <div className="flex items-center justify-between px-2 py-1 bg-yellow-950/30 border border-yellow-800/40 rounded-lg">
                    <span className="text-yellow-200">Thatch</span>
                    <span className="font-bold text-yellow-400">{estimatedResources.thatch}</span>
                  </div>
                )}
                {estimatedResources.iron > 0 && (
                  <div className="flex items-center justify-between px-2 py-1 bg-zinc-800/60 border border-zinc-700 rounded-lg">
                    <span className="text-zinc-300">Iron</span>
                    <span className="font-bold text-zinc-100">{estimatedResources.iron}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bill of Materials / Piece Breakdown List */}
            <div className="flex-1 flex flex-col p-4 overflow-hidden">
              <h3 className="text-xs font-bold text-slate-300 mb-2 flex items-center justify-between">
                <span className="flex items-center">
                  <Box className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
                  Piece Breakdown
                </span>
                <span className="text-[10px] text-slate-400 font-normal">{billOfMaterials.length} unique types</span>
              </h3>

              <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {billOfMaterials.map(([prefab, count]) => (
                  <div
                    key={prefab}
                    className="flex items-center justify-between px-2.5 py-1.5 bg-slate-800/40 hover:bg-slate-800/80 rounded-lg text-xs transition-colors border border-slate-700/40"
                  >
                    <span className="text-slate-300 font-mono truncate max-w-[170px]" title={prefab}>
                      {prefab}
                    </span>
                    <span className="font-bold text-cyan-400 bg-cyan-950/40 px-1.5 py-0.5 rounded text-[11px] border border-cyan-800/30">
                      ×{count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
