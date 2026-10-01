import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GameMode, Difficulty, AimMode, ActivePowerUp, GameStats, FloatingText, PlayerUpgrades } from '../types/game';
import { sounds } from '../audio/soundEngine';

interface GameCanvasProps {
  gameMode: GameMode;
  difficulty: Difficulty;
  aimMode: AimMode;
  isPaused: boolean;
  onHpChange: (blueHp: number, redHp: number, bossHp?: number, maxBossHp?: number) => void;
  onStaminaChange: (stamina: number) => void;
  onChargeChange: (charge: number) => void;
  onActivePowerUpsChange: (powerups: ActivePowerUp[]) => void;
  onFloatingText: (text: FloatingText) => void;
  onGameOver: (winner: 'blue' | 'red', stats: GameStats) => void;
  onWaveChange: (wave: number, remainingEnemies: number) => void;
  onCoinCollected?: (amount: number) => void;
  upgrades?: PlayerUpgrades;
  statsRef: React.MutableRefObject<GameStats>;
  touchActionRef: React.MutableRefObject<{
    moveX: number;
    moveY: number;
    lookX: number;
    lookY: number;
    isShooting: boolean;
    isCharging: boolean;
    doDash: boolean;
  }>;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameMode,
  difficulty,
  aimMode,
  isPaused,
  onHpChange,
  onStaminaChange,
  onChargeChange,
  onActivePowerUpsChange,
  onFloatingText,
  onGameOver,
  onWaveChange,
  onCoinCollected,
  upgrades,
  statsRef,
  touchActionRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // --- THREE.JS INITIALIZATION ---
    const scene = new THREE.Scene();

    // Twilight Winter Sky Canvas Texture
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 2;
    skyCanvas.height = 256;
    const skyCtx = skyCanvas.getContext('2d')!;
    const skyGrad = skyCtx.createLinearGradient(0, 0, 0, 256);
    skyGrad.addColorStop(0, '#061328');
    skyGrad.addColorStop(0.35, '#0b2344');
    skyGrad.addColorStop(0.65, '#1b4069');
    skyGrad.addColorStop(0.85, '#3a6691');
    skyGrad.addColorStop(1, '#a6cde9');
    skyCtx.fillStyle = skyGrad;
    skyCtx.fillRect(0, 0, 2, 256);
    const skyTexture = new THREE.CanvasTexture(skyCanvas);
    skyTexture.colorSpace = THREE.SRGBColorSpace;
    scene.background = skyTexture;
    scene.fog = new THREE.FogExp2(0x89adc9, 0.0055);

    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    containerRef.current.appendChild(renderer.domElement);

    // --- LIGHTING ---
    const ambientLight = new THREE.AmbientLight(0xd4e9ff, 0.65);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xa5c9ea, 0x5b7596, 0.95);
    scene.add(hemiLight);

    const moonLight = new THREE.DirectionalLight(0xe8f4ff, 2.3);
    moonLight.position.set(65, 110, 45);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 1024;
    moonLight.shadow.mapSize.height = 1024;
    moonLight.shadow.camera.near = 10;
    moonLight.shadow.camera.far = 300;
    moonLight.shadow.camera.left = -75;
    moonLight.shadow.camera.right = 75;
    moonLight.shadow.camera.top = 75;
    moonLight.shadow.camera.bottom = -75;
    moonLight.shadow.bias = -0.0003;
    scene.add(moonLight);

    const rimLight = new THREE.DirectionalLight(0x7dd3fc, 0.8);
    rimLight.position.set(-60, 40, -60);
    scene.add(rimLight);

    const blueLight = new THREE.PointLight(0x38bdf8, 3.2, 38);
    scene.add(blueLight);

    // --- 1. MOON & GLOW HALO ---
    const moonGroup = new THREE.Group();
    const moonGeo = new THREE.SphereGeometry(14, 32, 32);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xfffaea });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonGroup.add(moonMesh);

    const moonGlowGeo = new THREE.PlaneGeometry(65, 65);
    const haloCanvas = document.createElement('canvas');
    haloCanvas.width = 128;
    haloCanvas.height = 128;
    const hctx = haloCanvas.getContext('2d')!;
    const hgrad = hctx.createRadialGradient(64, 64, 10, 64, 64, 64);
    hgrad.addColorStop(0, 'rgba(235, 245, 255, 0.65)');
    hgrad.addColorStop(0.4, 'rgba(165, 215, 255, 0.25)');
    hgrad.addColorStop(1, 'rgba(100, 160, 240, 0)');
    hctx.fillStyle = hgrad;
    hctx.fillRect(0, 0, 128, 128);
    const moonGlowTex = new THREE.CanvasTexture(haloCanvas);

    const moonGlowMat = new THREE.MeshBasicMaterial({
      map: moonGlowTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const moonGlow = new THREE.Mesh(moonGlowGeo, moonGlowMat);
    moonGroup.add(moonGlow);
    moonGroup.position.set(130, 170, 90);
    scene.add(moonGroup);

    // --- 2. TWINKLING STARFIELD ---
    const STAR_COUNT = 450;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.7 + 0.3);
      const r = 260 + Math.random() * 40;
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi);
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.4,
      transparent: true,
      opacity: 0.9,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // --- 3. AURORA BOREALIS ---
    const auroraCurtains: THREE.Mesh[] = [];
    const auroraCanvas = document.createElement('canvas');
    auroraCanvas.width = 64;
    auroraCanvas.height = 256;
    const actx = auroraCanvas.getContext('2d')!;
    const agrad = actx.createLinearGradient(0, 0, 0, 256);
    agrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    agrad.addColorStop(0.3, 'rgba(16, 185, 129, 0.75)');
    agrad.addColorStop(0.65, 'rgba(6, 182, 212, 0.65)');
    agrad.addColorStop(0.9, 'rgba(139, 92, 246, 0.45)');
    agrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    actx.fillStyle = agrad;
    actx.fillRect(0, 0, 64, 256);
    const auroraTex = new THREE.CanvasTexture(auroraCanvas);

    function createAuroraRibbon(radius: number, height: number, yPos: number, segments: number) {
      const geo = new THREE.CylinderGeometry(radius, radius, height, segments, 16, true, -Math.PI * 0.7, Math.PI * 1.4);
      const mat = new THREE.MeshBasicMaterial({
        map: auroraTex,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(0, yPos, -40);
      mesh.rotation.y = Math.PI * 0.1;
      scene.add(mesh);
      auroraCurtains.push(mesh);
    }
    createAuroraRibbon(200, 75, 75, 64);
    createAuroraRibbon(220, 65, 85, 64);

    // --- 4. GROUND ---
    function hillH(x: number, z: number): number {
      const r = Math.hypot(x, z);
      // Flat in center where ice rink sits!
      if (r < 25) return 0;
      const t = Math.min(1, Math.max(0, (r - 70) / 50));
      return t * t * (3 - 2 * t) * (Math.sin(x * 0.05) * Math.cos(z * 0.04) + 1.25) * 8.5;
    }

    const groundGeo = new THREE.PlaneGeometry(500, 500, 75, 75);
    const pa = groundGeo.attributes.position;
    for (let i = 0; i < pa.count; i++) {
      pa.setZ(i, hillH(pa.getX(i), -pa.getY(i)));
    }
    groundGeo.computeVertexNormals();

    const snowGroundCanvas = document.createElement('canvas');
    snowGroundCanvas.width = 512;
    snowGroundCanvas.height = 512;
    const sgc = snowGroundCanvas.getContext('2d')!;
    sgc.fillStyle = '#f0f7ff';
    sgc.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 4000; i++) {
      sgc.fillStyle = Math.random() < 0.4 ? 'rgba(175,205,235,0.25)' : 'rgba(255,255,255,0.7)';
      sgc.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    for (let i = 0; i < 250; i++) {
      sgc.fillStyle = 'rgba(255, 255, 255, 0.95)';
      sgc.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }
    const groundTex = new THREE.CanvasTexture(snowGroundCanvas);
    groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
    groundTex.repeat.set(90, 90);
    groundTex.colorSpace = THREE.SRGBColorSpace;

    const groundMat = new THREE.MeshStandardMaterial({
      map: groundTex,
      roughness: 0.85,
      metalness: 0.08,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // --- 5. CENTRAL ICE SKATING RINK (ЛЕДЯНОЙ КАТОК) ---
    const RINK_RADIUS = 22;
    const rinkGroup = new THREE.Group();

    // Procedural reflective ice texture with skate blade scratch marks
    const iceCanvas = document.createElement('canvas');
    iceCanvas.width = 512;
    iceCanvas.height = 512;
    const ictx = iceCanvas.getContext('2d')!;
    ictx.fillStyle = '#9bd2f5';
    ictx.fillRect(0, 0, 512, 512);

    // Ice depth gradient
    const igrad = ictx.createRadialGradient(256, 256, 40, 256, 256, 256);
    igrad.addColorStop(0, '#bae6fd');
    igrad.addColorStop(0.7, '#7dd3fc');
    igrad.addColorStop(1, '#38bdf8');
    ictx.fillStyle = igrad;
    ictx.fillRect(0, 0, 512, 512);

    // Skate scratch marks
    ictx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ictx.lineWidth = 1.5;
    for (let i = 0; i < 90; i++) {
      ictx.beginPath();
      const sx = Math.random() * 512;
      const sy = Math.random() * 512;
      ictx.moveTo(sx, sy);
      ictx.bezierCurveTo(
        sx + (Math.random() - 0.5) * 80,
        sy + (Math.random() - 0.5) * 80,
        sx + (Math.random() - 0.5) * 120,
        sy + (Math.random() - 0.5) * 120,
        sx + (Math.random() - 0.5) * 150,
        sy + (Math.random() - 0.5) * 150
      );
      ictx.stroke();
    }
    const iceTexture = new THREE.CanvasTexture(iceCanvas);

    const iceGeo = new THREE.CylinderGeometry(RINK_RADIUS, RINK_RADIUS + 0.5, 0.35, 64);
    const iceMat = new THREE.MeshStandardMaterial({
      map: iceTexture,
      color: 0xcfeafe,
      roughness: 0.08,
      metalness: 0.25,
      emissive: 0x0c2540,
      emissiveIntensity: 0.35,
    });
    const iceMesh = new THREE.Mesh(iceGeo, iceMat);
    iceMesh.position.y = 0.15;
    iceMesh.receiveShadow = true;
    rinkGroup.add(iceMesh);

    // Outer snowy wooden border
    const borderGeo = new THREE.TorusGeometry(RINK_RADIUS + 0.3, 0.55, 12, 64);
    const borderMat = new THREE.MeshStandardMaterial({ color: 0x4a3424, roughness: 0.9 });
    const borderMesh = new THREE.Mesh(borderGeo, borderMat);
    borderMesh.rotation.x = Math.PI / 2;
    borderMesh.position.y = 0.3;
    rinkGroup.add(borderMesh);

    // Glowing festive garland lights around the rink!
    const lightColors = [0xef4444, 0x38bdf8, 0xfacc15, 0x22c55e, 0xa855f7];
    for (let i = 0; i < 28; i++) {
      const angle = (i / 28) * Math.PI * 2;
      const lx = Math.cos(angle) * (RINK_RADIUS + 0.4);
      const lz = Math.sin(angle) * (RINK_RADIUS + 0.4);

      // Mini wooden post
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.14, 1.4, 6),
        new THREE.MeshStandardMaterial({ color: 0x332014, roughness: 0.9 })
      );
      post.position.set(lx, 0.7, lz);
      rinkGroup.add(post);

      // Colored light bulb
      const bulbColor = lightColors[i % lightColors.length];
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 8, 8),
        new THREE.MeshBasicMaterial({ color: bulbColor })
      );
      bulb.position.set(lx, 1.4, lz);
      rinkGroup.add(bulb);
    }
    scene.add(rinkGroup);

    // --- 6. FOOTPRINTS & SKATE MARKS ---
    interface Footprint {
      mesh: THREE.Mesh;
      life: number;
      maxLife: number;
    }
    const footprints: Footprint[] = [];
    const footprintGeo = new THREE.PlaneGeometry(1.6, 1.6);
    const fpCanvas = document.createElement('canvas');
    fpCanvas.width = 32;
    fpCanvas.height = 32;
    const fpctx = fpCanvas.getContext('2d')!;
    const fpGrad = fpctx.createRadialGradient(16, 16, 3, 16, 16, 16);
    fpGrad.addColorStop(0, 'rgba(140, 175, 205, 0.45)');
    fpGrad.addColorStop(0.7, 'rgba(170, 195, 220, 0.25)');
    fpGrad.addColorStop(1, 'rgba(240, 248, 255, 0)');
    fpctx.fillStyle = fpGrad;
    fpctx.fillRect(0, 0, 32, 32);
    const footprintTex = new THREE.CanvasTexture(fpCanvas);

    function spawnFootprint(pos: THREE.Vector3, isDash: boolean = false) {
      if (footprints.length > 50) {
        const oldest = footprints.shift();
        if (oldest) scene.remove(oldest.mesh);
      }
      const mat = new THREE.MeshBasicMaterial({
        map: footprintTex,
        transparent: true,
        opacity: isDash ? 0.8 : 0.5,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(footprintGeo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(pos.x + (Math.random() - 0.5) * 0.4, 0.2, pos.z + (Math.random() - 0.5) * 0.4);
      if (isDash) mesh.scale.set(2.4, 1.2, 1);
      scene.add(mesh);
      footprints.push({ mesh, life: 10, maxLife: 10 });
    }

    // --- 7. ENVIRONMENT: TREES, ROCKS, LANTERNS & CHRISTMAS TREES ---
    const treeGroup = new THREE.Group();
    const garlandBulbs: THREE.Mesh[] = [];
    const baubleColors = [0xef4444, 0xfacc15, 0x10b981, 0x3b82f6, 0xc084fc, 0xf8fafc];
    const baubleMatCache: Record<number, THREE.MeshStandardMaterial> = {};
    baubleColors.forEach((c) => {
      baubleMatCache[c] = new THREE.MeshStandardMaterial({
        color: c,
        roughness: 0.18,
        metalness: 0.85,
        emissive: c,
        emissiveIntensity: 0.35,
      });
    });

    const starTopMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.15,
      metalness: 0.9,
      emissive: 0xfbbf24,
      emissiveIntensity: 0.85,
    });

    function createPineTree(x: number, z: number, scale = 1, isFestive = false) {
      const tree = new THREE.Group();
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3e2312, roughness: 0.95 });
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.55 * scale, 0.75 * scale, 4 * scale, 8), trunkMat);
      trunk.position.y = 2 * scale;
      trunk.castShadow = true;
      tree.add(trunk);

      const needleMat = new THREE.MeshStandardMaterial({ color: 0x144020, roughness: 0.85, flatShading: true });
      const snowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.65 });

      const tiers = [
        { y: 4.8, r: 3.4, h: 4.8 },
        { y: 7.8, r: 2.6, h: 4.2 },
        { y: 10.6, r: 1.7, h: 3.8 },
      ];

      tiers.forEach((lvl, tIdx) => {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(lvl.r * scale, lvl.h * scale, 8), needleMat);
        cone.position.y = lvl.y * scale;
        cone.castShadow = true;
        tree.add(cone);

        const snowCap = new THREE.Mesh(new THREE.ConeGeometry(lvl.r * 0.95 * scale, lvl.h * 0.35 * scale, 8), snowMat);
        snowCap.position.y = (lvl.y + lvl.h * 0.3) * scale;
        snowCap.castShadow = true;
        tree.add(snowCap);

        // If Festive Tree: Add Christmas Baubles of random sizes and glossy colors!
        if (isFestive) {
          const baubleCount = 5 + tIdx * 2;
          for (let b = 0; b < baubleCount; b++) {
            const bAngle = (b / baubleCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
            const bRadius = (lvl.r * 0.82 + Math.random() * 0.15) * scale;
            const bSize = (0.18 + Math.random() * 0.3) * scale; // Random size bauble!
            const chosenCol = baubleColors[Math.floor(Math.random() * baubleColors.length)];
            const bauble = new THREE.Mesh(new THREE.SphereGeometry(bSize, 12, 12), baubleMatCache[chosenCol]);
            bauble.position.set(
              Math.cos(bAngle) * bRadius,
              (lvl.y - lvl.h * 0.32 + (Math.random() - 0.5) * 0.3) * scale,
              Math.sin(bAngle) * bRadius
            );
            bauble.castShadow = true;
            tree.add(bauble);
          }

          // Twinkling garland fairy light bulbs!
          const lightCount = 8;
          for (let g = 0; g < lightCount; g++) {
            const gAngle = (g / lightCount) * Math.PI * 2;
            const gRadius = lvl.r * 0.92 * scale;
            const bulbCol = baubleColors[(g + tIdx * 2) % baubleColors.length];
            const bulb = new THREE.Mesh(
              new THREE.SphereGeometry(0.14 * scale, 8, 8),
              new THREE.MeshBasicMaterial({ color: bulbCol })
            );
            bulb.position.set(
              Math.cos(gAngle) * gRadius,
              (lvl.y - lvl.h * 0.18) * scale,
              Math.sin(gAngle) * gRadius
            );
            tree.add(bulb);
            garlandBulbs.push(bulb);
          }
        }
      });

      // If Festive Tree: Golden Radiant Star on Top!
      if (isFestive) {
        const starMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.85 * scale, 0), starTopMat);
        starMesh.position.y = (10.6 + 2.3) * scale;
        tree.add(starMesh);
      }

      tree.position.set(x, hillH(x, z) - 0.3, z);
      treeGroup.add(tree);
    }

    // Spawn 72 trees of random scale, dressing ~24 of them as festive Christmas trees!
    for (let i = 0; i < 72; i++) {
      const angle = (i / 72) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
      const dist = 52 + Math.random() * 75;
      const randScale = 0.65 + Math.random() * 1.35; // Random diverse sizes!
      const isFestive = i % 3 === 0; // Every 3rd tree is a decorated Christmas tree!
      createPineTree(Math.cos(angle) * dist, Math.sin(angle) * dist, randScale, isFestive);
    }
    scene.add(treeGroup);

    // --- 8. DESTRUCTIBLE SNOW FORTS ---
    interface CoverBlock {
      mesh: THREE.Mesh;
      hp: number;
      maxHp: number;
      initialScaleY: number;
    }
    const coverBlocks: CoverBlock[] = [];
    const iceBlockGeo = new THREE.BoxGeometry(6.5, 3.8, 2.2);

    function createSnowCover(x: number, z: number, rotY: number) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0xddf1fe,
        roughness: 0.5,
        metalness: 0.15,
        transparent: true,
        opacity: 0.95,
      });
      const mesh = new THREE.Mesh(iceBlockGeo, mat);
      mesh.position.set(x, 1.9, z);
      mesh.rotation.y = rotY;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const capMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });
      const cap = new THREE.Mesh(new THREE.BoxGeometry(6.7, 0.6, 2.4), capMat);
      cap.position.y = 2.0;
      mesh.add(cap);

      scene.add(mesh);
      coverBlocks.push({ mesh, hp: 50, maxHp: 50, initialScaleY: 1 });
    }

    // Place tactical covers outside the central ice rink
    createSnowCover(-18, -26, 0.3);
    createSnowCover(18, -26, -0.3);
    createSnowCover(-18, 26, -0.3);
    createSnowCover(18, 26, 0.3);
    createSnowCover(-32, 0, Math.PI / 2);
    createSnowCover(32, 0, Math.PI / 2);

    // --- 9. HIGH-FIDELITY SNOWMEN VISUALS ---
    interface SnowmanEntity {
      group: THREE.Group;
      head: THREE.Mesh;
      middle: THREE.Mesh;
      bottom: THREE.Mesh;
      hatGroup: THREE.Group;
      hatDetached: boolean;
      armL: THREE.Group;
      armR: THREE.Group;
      inHandBall: THREE.Mesh;
      shieldMesh?: THREE.Mesh;
      hp: number;
      maxHp: number;
      type: 'player' | 'enemy' | 'boss';
      flash: number;
      walkPhase: number;
      lastShot: number;
      isBoss?: boolean;
      speed: number;
      velocity: THREE.Vector3;
      dodgeCooldown: number;
      frostBreathTimer: number;
    }

    function createDetailedSnowman(
      colorMain: number,
      colorAccent: number,
      isBoss: boolean = false,
      skin: string = 'classic'
    ): SnowmanEntity {
      const scale = isBoss ? 1.6 : 1.0;
      const group = new THREE.Group();
      group.scale.set(scale, scale, scale);

      // Frosted sparkling snow texture
      const snowMat = new THREE.MeshStandardMaterial({
        color: 0xfcfdff,
        roughness: 0.72,
        metalness: 0.08,
      });

      // Bottom sphere
      const bottom = new THREE.Mesh(new THREE.SphereGeometry(2.5, 32, 32), snowMat);
      bottom.position.y = 2.5;
      bottom.castShadow = true;
      group.add(bottom);

      // Middle torso
      const middle = new THREE.Mesh(new THREE.SphereGeometry(1.85, 32, 32), snowMat);
      middle.position.y = 5.5;
      middle.castShadow = true;
      group.add(middle);

      // Head
      const head = new THREE.Mesh(new THREE.SphereGeometry(1.35, 32, 32), snowMat);
      head.position.y = 8.3;
      head.castShadow = true;
      group.add(head);

      // Cheerful Blushed Rosy Cheeks
      const blushMat = new THREE.MeshBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.65 });
      const cheekL = new THREE.Mesh(new THREE.CircleGeometry(0.25, 16), blushMat);
      cheekL.position.set(-0.75, 8.1, 1.15);
      cheekL.rotation.y = -0.3;
      group.add(cheekL);

      const cheekR = new THREE.Mesh(new THREE.CircleGeometry(0.25, 16), blushMat);
      cheekR.position.set(0.75, 8.1, 1.15);
      cheekR.rotation.y = 0.3;
      group.add(cheekR);

      // Shiny Eyes & Pupils
      const coalMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.3 });
      const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), coalMat);
      eyeL.position.set(-0.45, 8.7, 1.18);
      group.add(eyeL);

      const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), coalMat);
      eyeR.position.set(0.45, 8.7, 1.18);
      group.add(eyeR);

      // Eye glimmer highlight
      const glimmerMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const glimL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), glimmerMat);
      glimL.position.set(-0.42, 8.76, 1.32);
      group.add(glimL);
      const glimR = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), glimmerMat);
      glimR.position.set(0.48, 8.76, 1.32);
      group.add(glimR);

      // Smiling Coal Mouth
      for (let i = -2; i <= 2; i++) {
        const coalSm = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), coalMat);
        coalSm.position.set((i / 2) * 0.5, 7.7 + (Math.abs(i) === 2 ? 0.12 : 0), 1.25);
        group.add(coalSm);
      }

      // 3 Charcoal Buttons on Belly
      for (let b = 0; b < 3; b++) {
        const btn = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), coalMat);
        btn.position.set(0, 6.4 - b * 0.75, 1.7 - b * 0.08);
        group.add(btn);
      }

      // Segmented Carrot Nose
      const carrotMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.55 });
      const carrot = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.3, 16), carrotMat);
      carrot.position.set(0, 8.25, 1.6);
      carrot.rotation.x = Math.PI / 2;
      carrot.castShadow = true;
      group.add(carrot);

      // Cozy Knitted Scarf with Fringe
      const scarfMat = new THREE.MeshStandardMaterial({ color: colorMain, roughness: 0.6 });
      const scarf = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.32, 14, 28), scarfMat);
      scarf.position.y = 7.4;
      scarf.rotation.x = Math.PI / 2;
      group.add(scarf);

      // Scarf tail hanging down
      const scarfTail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.28, 1.6, 8),
        new THREE.MeshStandardMaterial({ color: colorMain, roughness: 0.6 })
      );
      scarfTail.position.set(0.65, 6.5, 1.4);
      scarfTail.rotation.z = -0.3;
      group.add(scarfTail);

      // Hat Group (can fly off on headshots!)
      const hatGroup = new THREE.Group();
      if (isBoss || skin === 'crown') {
        // Royal Golden Crown with jewels
        const crownMat = new THREE.MeshStandardMaterial({
          color: 0xfacc15,
          metalness: 0.85,
          roughness: 0.2,
          emissive: 0xb45309,
          emissiveIntensity: 0.3,
        });
        const crownBase = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.3, 0.8, 16), crownMat);
        crownBase.position.y = 9.4;
        hatGroup.add(crownBase);
        for (let i = 0; i < 5; i++) {
          const spike = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.9, 8), crownMat);
          const a = (i / 5) * Math.PI * 2;
          spike.position.set(Math.cos(a) * 1.3, 10.1, Math.sin(a) * 1.3);
          hatGroup.add(spike);
        }
      } else if (skin === 'santa') {
        // Red Santa Hat with white fur trim and pom-pom!
        const santaMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.75 });
        const furMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 });
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.45, 20), furMat);
        rim.position.y = 9.1;
        hatGroup.add(rim);

        const cone = new THREE.Mesh(new THREE.ConeGeometry(1.3, 1.9, 16), santaMat);
        cone.position.set(0.2, 10.0, 0);
        cone.rotation.z = -0.28;
        hatGroup.add(cone);

        const pomPom = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), furMat);
        pomPom.position.set(0.85, 10.8, 0);
        hatGroup.add(pomPom);
      } else if (skin === 'frost') {
        // Ice Crystal Crown
        const frostMat = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          roughness: 0.1,
          metalness: 0.9,
          emissive: 0x0284c7,
          emissiveIntensity: 0.7,
        });
        for (let i = 0; i < 6; i++) {
          const spike = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.3, 6), frostMat);
          const a = (i / 6) * Math.PI * 2;
          spike.position.set(Math.cos(a) * 1.25, 9.8, Math.sin(a) * 1.25);
          hatGroup.add(spike);
        }
      } else {
        // Winter Knitted Beanie with fluffy white pom-pom!
        const beanieMat = new THREE.MeshStandardMaterial({ color: colorAccent, roughness: 0.7 });
        const beanieBase = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.45, 0.5, 20), beanieMat);
        beanieBase.position.y = 9.0;
        hatGroup.add(beanieBase);

        const beanieDome = new THREE.Mesh(
          new THREE.SphereGeometry(1.35, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
          beanieMat
        );
        beanieDome.position.y = 9.25;
        hatGroup.add(beanieDome);

        // Fluffy white Pom-Pom on top!
        const pomPom = new THREE.Mesh(
          new THREE.SphereGeometry(0.48, 16, 16),
          new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 })
        );
        pomPom.position.y = 10.7;
        hatGroup.add(pomPom);
      }
      group.add(hatGroup);

      // Detailed Branch Arms with Twig Fingers & Mittens
      const stickMat = new THREE.MeshStandardMaterial({ color: 0x4a2e1b, roughness: 0.95 });
      const mittenMat = new THREE.MeshStandardMaterial({ color: colorMain, roughness: 0.7 });

      const armL = new THREE.Group();
      const armLStick = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 3.2, 8), stickMat);
      armLStick.position.y = 1.6;
      armL.add(armLStick);
      const mittenL = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 12), mittenMat);
      mittenL.position.y = 3.2;
      armL.add(mittenL);
      armL.position.set(-2.0, 5.8, 0);
      armL.rotation.z = Math.PI / 3;
      group.add(armL);

      const armR = new THREE.Group();
      const armRStick = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 3.2, 8), stickMat);
      armRStick.position.y = 1.6;
      armR.add(armRStick);
      const mittenR = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 12), mittenMat);
      mittenR.position.y = 3.2;
      armR.add(mittenR);

      // In-hand sculpting snowball mesh!
      const inHandBall = new THREE.Mesh(
        new THREE.SphereGeometry(0.7, 16, 16),
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.85,
          emissive: colorMain,
          emissiveIntensity: 0.2,
        })
      );
      inHandBall.position.set(0, 3.5, 0);
      inHandBall.visible = false;
      armR.add(inHandBall);

      armR.position.set(2.0, 5.8, 0);
      armR.rotation.z = -Math.PI / 3;
      group.add(armR);

      // Ice Shield Mesh
      const shieldGeo = new THREE.SphereGeometry(3.6, 32, 24);
      const shieldMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        wireframe: true,
      });
      const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
      shieldMesh.position.y = 5.0;
      group.add(shieldMesh);

      // Glowing Base Ring
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(3.2, 3.8, 36),
        new THREE.MeshBasicMaterial({
          color: colorMain,
          transparent: true,
          opacity: 0.65,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.25;
      group.add(ring);

      scene.add(group);

      const maxHp = isBoss ? 250 : 100;
      return {
        group,
        head,
        middle,
        bottom,
        hatGroup,
        hatDetached: false,
        armL,
        armR,
        inHandBall,
        shieldMesh,
        hp: maxHp,
        maxHp,
        type: colorMain === 0x38bdf8 ? 'player' : (isBoss ? 'boss' : 'enemy'),
        flash: 0,
        walkPhase: 0,
        lastShot: 0,
        isBoss,
        speed: isBoss ? 16 : 28,
        velocity: new THREE.Vector3(),
        dodgeCooldown: 0,
        frostBreathTimer: Math.random() * 2,
      };
    }

    const playerSkin = upgrades?.activeSkin || 'classic';
    const player = createDetailedSnowman(0x38bdf8, 0x1d4ed8, false, playerSkin);
    const bonusHp = (upgrades?.maxHpLevel || 0) * 25;
    player.maxHp = 100 + bonusHp;
    player.hp = player.maxHp;
    player.group.position.set(-18, 0, 0);

    let enemies: SnowmanEntity[] = [];

    function setupEnemies() {
      enemies.forEach((e) => scene.remove(e.group));
      enemies = [];

      if (gameMode === 'duel') {
        const isBoss = difficulty === 'boss';
        const redEnemy = createDetailedSnowman(0xef4444, 0xb91c1c, isBoss);
        redEnemy.group.position.set(18, 0, 0);
        redEnemy.group.rotation.y = Math.PI;
        enemies.push(redEnemy);
      } else if (gameMode === 'survival') {
        for (let i = 0; i < 3; i++) {
          const e = createDetailedSnowman(0xef4444, 0xb91c1c, false);
          const angle = (i / 3) * Math.PI + Math.PI / 2;
          e.group.position.set(Math.cos(angle) * 32, 0, Math.sin(angle) * 32);
          enemies.push(e);
        }
      } else if (gameMode === 'practice') {
        const dummy = createDetailedSnowman(0xa855f7, 0x6b21a8, false);
        dummy.group.position.set(20, 0, 0);
        enemies.push(dummy);
      }
    }
    setupEnemies();

    // --- 10. SNOWBALL PROJECTILE ENGINE ---
    interface Projectile {
      mesh: THREE.Group;
      velocity: THREE.Vector3;
      owner: 'blue' | 'red';
      damage: number;
      radius: number;
      life: number;
      isCharged: boolean;
    }
    let projectiles: Projectile[] = [];

    const snowballGeo = new THREE.SphereGeometry(0.55, 16, 16);
    const snowballMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 });

    function fireSnowball(
      startPos: THREE.Vector3,
      launchVelocity: THREE.Vector3,
      owner: 'blue' | 'red',
      tier: 'small' | 'medium' | 'large' = 'small',
      damageMultiplier: number = 1
    ) {
      const group = new THREE.Group();
      let scale = 0.8;
      let baseDamage = 14;
      if (tier === 'medium') {
        scale = 1.35;
        baseDamage = 28;
      } else if (tier === 'large') {
        scale = 2.15;
        baseDamage = 50;
      }

      const mesh = new THREE.Mesh(snowballGeo, snowballMat);
      mesh.scale.setScalar(scale);
      mesh.castShadow = true;
      group.add(mesh);

      const auraColor = owner === 'blue' ? 0x38bdf8 : 0xef4444;
      const aura = new THREE.Mesh(
        new THREE.SphereGeometry(0.75 * scale, 12, 12),
        new THREE.MeshBasicMaterial({
          color: auraColor,
          transparent: true,
          opacity: tier === 'large' ? 0.85 : (tier === 'medium' ? 0.55 : 0.35),
          blending: THREE.AdditiveBlending,
        })
      );
      group.add(aura);

      group.position.copy(startPos);
      scene.add(group);

      projectiles.push({
        mesh: group,
        velocity: launchVelocity.clone(),
        owner,
        damage: Math.round(baseDamage * damageMultiplier),
        radius: 0.65 * scale,
        life: 4.5,
        isCharged: tier !== 'small',
      });

      sounds.playThrow(tier === 'large' ? 1 : (tier === 'medium' ? 0.5 : 0));
    }

    // --- 11. VFX PARTICLES ---
    interface Particle {
      mesh: THREE.Mesh;
      velocity: THREE.Vector3;
      gravity: number;
      life: number;
      maxLife: number;
      rotSpeed?: THREE.Vector3;
    }
    let particles: Particle[] = [];
    const pGeo = new THREE.IcosahedronGeometry(0.2, 0);
    const pWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pBlueMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc });
    const pRedMat = new THREE.MeshBasicMaterial({ color: 0xfca5a5 });

    const sharedSmokeGeo = new THREE.PlaneGeometry(3.5, 3.5);
    const sharedSmokeMat = new THREE.MeshBasicMaterial({
      map: footprintTex,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    function spawnSnowBurst(pos: THREE.Vector3, count = 28, isCritical = false) {
      for (let i = 0; i < count; i++) {
        const p = new THREE.Mesh(pGeo, isCritical ? pBlueMat : pWhiteMat);
        p.position.copy(pos);
        scene.add(p);
        const l = 0.5 + Math.random() * 0.6;
        particles.push({
          mesh: p,
          gravity: 24,
          life: l,
          maxLife: l,
          rotSpeed: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8),
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 22,
            Math.random() * 16 + 4,
            (Math.random() - 0.5) * 22
          ),
        });
      }

      const smokeMesh = new THREE.Mesh(sharedSmokeGeo, sharedSmokeMat);
      smokeMesh.position.copy(pos);
      smokeMesh.rotation.x = -Math.PI / 2;
      scene.add(smokeMesh);
      particles.push({
        mesh: smokeMesh,
        gravity: -2,
        life: 0.45,
        maxLife: 0.45,
        velocity: new THREE.Vector3(0, 3, 0),
      });
    }

    function spawnTrail(pos: THREE.Vector3, owner: 'blue' | 'red') {
      const p = new THREE.Mesh(pGeo, owner === 'blue' ? pBlueMat : pRedMat);
      p.position.copy(pos);
      p.scale.setScalar(0.7);
      scene.add(p);
      particles.push({
        mesh: p,
        gravity: 0,
        life: 0.25,
        maxLife: 0.25,
        velocity: new THREE.Vector3(),
      });
    }

    function spawnFrostBreath(pos: THREE.Vector3) {
      const p = new THREE.Mesh(pGeo, pWhiteMat);
      p.position.copy(pos);
      p.scale.setScalar(0.35);
      scene.add(p);
      particles.push({
        mesh: p,
        gravity: -1.5,
        life: 0.8,
        maxLife: 0.8,
        velocity: new THREE.Vector3((Math.random() - 0.5) * 1.5, 2.0, (Math.random() - 0.5) * 1.5),
      });
    }

    // --- 12. FALLING SNOW ---
    const SNOW_COUNT = 1600;
    const snowSpeeds = new Float32Array(SNOW_COUNT);
    const snowDrift = new Float32Array(SNOW_COUNT);
    const snowPositions = new Float32Array(SNOW_COUNT * 3);
    for (let i = 0; i < SNOW_COUNT; i++) {
      snowPositions[i * 3] = (Math.random() - 0.5) * 320;
      snowPositions[i * 3 + 1] = Math.random() * 95;
      snowPositions[i * 3 + 2] = (Math.random() - 0.5) * 320;
      snowSpeeds[i] = 3.5 + Math.random() * 4.5;
      snowDrift[i] = Math.random() * Math.PI * 2;
    }
    const snowBufferGeo = new THREE.BufferGeometry();
    snowBufferGeo.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));

    const snowFlakeCanvas = document.createElement('canvas');
    snowFlakeCanvas.width = snowFlakeCanvas.height = 32;
    const sfc = snowFlakeCanvas.getContext('2d')!;
    const sfGrad = sfc.createRadialGradient(16, 16, 0, 16, 16, 16);
    sfGrad.addColorStop(0, 'rgba(255,255,255,1)');
    sfGrad.addColorStop(0.4, 'rgba(255,255,255,0.85)');
    sfGrad.addColorStop(1, 'rgba(255,255,255,0)');
    sfc.fillStyle = sfGrad;
    sfc.fillRect(0, 0, 32, 32);

    const snowPoints = new THREE.Points(
      snowBufferGeo,
      new THREE.PointsMaterial({
        size: 0.95,
        map: new THREE.CanvasTexture(snowFlakeCanvas),
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      })
    );
    snowPoints.frustumCulled = false;
    scene.add(snowPoints);

    // --- 13. FESTIVE HOLIDAY GIFTS (POWER-UPS) ---
    interface ActivePowerUpState {
      type: 'triple' | 'shield' | 'rapid' | 'heal';
      expiresAt: number;
    }
    let activePowerUps: ActivePowerUpState[] = [];
    interface WorldPowerUp {
      mesh: THREE.Group;
      type: 'sack' | 'gift_bag' | 'chest';
      position: THREE.Vector3;
    }
    let worldPowerUps: WorldPowerUp[] = [];

    function spawnRandomPowerUp() {
      if (worldPowerUps.length >= 3) return;
      const types: Array<'sack' | 'gift_bag' | 'chest'> = ['sack', 'gift_bag', 'chest'];
      const chosen = types[Math.floor(Math.random() * types.length)];
      const angle = Math.random() * Math.PI * 2;
      const dist = 10 + Math.random() * 26;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      const group = new THREE.Group();

      if (chosen === 'sack') {
        // 1. Красный Мешок Санты с подарками (Лечение +45 HP!)
        const sackBody = new THREE.Mesh(
          new THREE.SphereGeometry(1.2, 16, 16),
          new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.85 })
        );
        sackBody.scale.set(1.1, 1.25, 1.1);
        sackBody.position.y = 1.3;
        sackBody.castShadow = true;
        group.add(sackBody);

        const goldRope = new THREE.Mesh(
          new THREE.TorusGeometry(0.46, 0.1, 8, 16),
          new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3, metalness: 0.8 })
        );
        goldRope.position.y = 2.45;
        goldRope.rotation.x = Math.PI / 2;
        group.add(goldRope);

        const sackTop = new THREE.Mesh(
          new THREE.ConeGeometry(0.7, 0.75, 12),
          new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.85 })
        );
        sackTop.position.y = 2.85;
        group.add(sackTop);

        const beacon = new THREE.Mesh(
          new THREE.RingGeometry(1.2, 2.0, 24),
          new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
        );
        beacon.rotation.x = -Math.PI / 2;
        beacon.position.y = 0.08;
        group.add(beacon);

      } else if (chosen === 'gift_bag') {
        // 2. Пакет с подарками (Золотые Монетки +25!)
        const boxMat = new THREE.MeshStandardMaterial({ color: 0x8b5cf6, roughness: 0.4, metalness: 0.2 });
        const box = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), boxMat);
        box.position.y = 1.4;
        box.castShadow = true;
        group.add(box);

        const ribbonMat = new THREE.MeshStandardMaterial({
          color: 0xfacc15,
          roughness: 0.2,
          metalness: 0.9,
          emissive: 0xfbbf24,
          emissiveIntensity: 0.3,
        });
        const rib1 = new THREE.Mesh(new THREE.BoxGeometry(1.65, 1.65, 0.3), ribbonMat);
        rib1.position.y = 1.4;
        group.add(rib1);
        const rib2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.65, 1.65), ribbonMat);
        rib2.position.y = 1.4;
        group.add(rib2);

        // Ribbon bow on top
        const bow = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.09, 8, 16), ribbonMat);
        bow.position.y = 2.4;
        bow.rotation.x = Math.PI / 4;
        group.add(bow);

        const beacon = new THREE.Mesh(
          new THREE.RingGeometry(1.2, 2.0, 24),
          new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
        );
        beacon.rotation.x = -Math.PI / 2;
        beacon.position.y = 0.08;
        group.add(beacon);

      } else {
        // 3. Ледяной Сундучок с подарками (Ледяной щит + Тройной бросок!)
        const chestMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.35, metalness: 0.6 });
        const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.2, metalness: 0.9 });

        const chestBase = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.2, 1.3), chestMat);
        chestBase.position.y = 1.1;
        chestBase.castShadow = true;
        group.add(chestBase);

        const chestLid = new THREE.Mesh(
          new THREE.CylinderGeometry(0.65, 0.65, 2.0, 16, 1, false, 0, Math.PI),
          chestMat
        );
        chestLid.position.set(0, 1.7, 0);
        chestLid.rotation.z = Math.PI / 2;
        group.add(chestLid);

        const lock = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.15), goldTrimMat);
        lock.position.set(0, 1.25, 0.68);
        group.add(lock);

        const beacon = new THREE.Mesh(
          new THREE.RingGeometry(1.2, 2.2, 24),
          new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
        );
        beacon.rotation.x = -Math.PI / 2;
        beacon.position.y = 0.08;
        group.add(beacon);
      }

      group.position.set(x, 0, z);
      scene.add(group);
      worldPowerUps.push({ mesh: group, type: chosen, position: group.position });
    }

    spawnRandomPowerUp();
    const powerUpInterval = setInterval(() => {
      if (!isPaused) spawnRandomPowerUp();
    }, 12000);

    // --- 14. CONTROLS & AIMING SYSTEM ---
    const keys: Record<string, boolean> = {
      w: false,
      a: false,
      s: false,
      d: false,
      space: false,
      shift: false,
    };
    let stamina = 100;
    let chargeAmount = 0;
    let isCharging = false;
    let chargeStartTime = 0;
    let isDashing = false;
    let dashTimer = 0;
    let dashDir = new THREE.Vector3();
    let playerInvulnerableTimer = 0;
    let targetFov = 65;
    let lastPlayerShotTime = 0;
    let iceSkateSoundTimer = 0;

    const cameraControl = {
      yaw: 0,
      pitch: 0.35,
      roll: 0,
      distance: 30,
      minDist: 14,
      maxDist: 60,
      isDragging: false,
      dragMoved: false,
      lastMouseX: 0,
      lastMouseY: 0,
    };

    // Instant Reliable Shoot Function with Snowball Sculpting Tiers
    function executePlayerShot(chargePercent: number) {
      const now = performance.now() / 1000;
      const isRapid = activePowerUps.some((p) => p.type === 'rapid');
      const cooldown = isRapid ? 0.12 : 0.3;
      if (now - lastPlayerShotTime < cooldown) return;
      lastPlayerShotTime = now;

      statsRef.current.shotsFired++;

      // Determine Snowball Tier based on charge amount (0.0 to 1.0)
      let tier: 'small' | 'medium' | 'large' = 'small';
      if (chargePercent >= 0.75) {
        tier = 'large';
      } else if (chargePercent >= 0.35) {
        tier = 'medium';
      } else {
        tier = 'small';
      }

      // Hide in-hand sculpt snowball on release
      player.inHandBall.visible = false;

      // 1. Calculate Target Point in 3D world
      const targetPoint = new THREE.Vector3();

      if (aimMode === 'manual') {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

        const aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -5.5);
        const intersect = new THREE.Vector3();

        if (raycaster.ray.intersectPlane(aimPlane, intersect)) {
          targetPoint.copy(intersect);
        } else {
          raycaster.ray.at(80, targetPoint);
        }

        const distFromPlayer = targetPoint.distanceTo(player.group.position);
        if (distFromPlayer < 8) {
          const camFwd = new THREE.Vector3(-Math.sin(cameraControl.yaw), 0, -Math.cos(cameraControl.yaw));
          targetPoint.copy(player.group.position).add(camFwd.multiplyScalar(40));
          targetPoint.y = 5.5;
        }
      } else {
        let closestEnemy: SnowmanEntity | null = null;
        let minDist = 999;
        enemies.forEach((e) => {
          if (e.hp > 0) {
            const d = e.group.position.distanceTo(player.group.position);
            if (d < minDist) {
              minDist = d;
              closestEnemy = e;
            }
          }
        });

        if (closestEnemy) {
          targetPoint.copy((closestEnemy as SnowmanEntity).group.position);
          targetPoint.y = 6.2;
        } else {
          const camFwd = new THREE.Vector3(-Math.sin(cameraControl.yaw), 0, -Math.cos(cameraControl.yaw));
          targetPoint.copy(player.group.position).add(camFwd.multiplyScalar(40));
          targetPoint.y = 5.5;
        }
      }

      // CRITICAL FIX: The snowman rotates to face the attack target immediately so body orientation matches!
      const toAim = new THREE.Vector3(targetPoint.x - player.group.position.x, 0, targetPoint.z - player.group.position.z);
      if (toAim.lengthSq() > 0.01) {
        player.group.rotation.y = Math.atan2(toAim.x, toAim.z);
      }

      // Snowman's exact world facing vector
      const facingYaw = player.group.rotation.y;
      const forwardX = Math.sin(facingYaw);
      const forwardZ = Math.cos(facingYaw);

      // Safe Launch Position directly in front of the snowman's chest/mitten
      const launchPos = player.group.position.clone();
      launchPos.x += forwardX * 2.8;
      launchPos.y = 6.2;
      launchPos.z += forwardZ * 2.8;

      // Ballistic velocity calculation based on tier
      let speed = 72;
      if (tier === 'medium') speed = 64;
      else if (tier === 'large') speed = 58;

      const dist = Math.hypot(targetPoint.x - launchPos.x, targetPoint.z - launchPos.z);
      const flightTime = Math.max(0.15, dist / speed);
      const gravityComp = 0.5 * 9.8 * flightTime * flightTime;

      const compensatedTarget = targetPoint.clone();
      compensatedTarget.y += gravityComp;

      const launchVelocity = new THREE.Vector3()
        .subVectors(compensatedTarget, launchPos)
        .normalize()
        .multiplyScalar(speed);

      // Fire Single or Triple
      const dmgMultiplier = 1 + (upgrades?.snowballDamage || 0) * 0.15;
      const hasTriple = activePowerUps.some((p) => p.type === 'triple');
      if (hasTriple) {
        [-0.15, 0, 0.15].forEach((angleOffset) => {
          const spreadVel = launchVelocity.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angleOffset);
          fireSnowball(launchPos, spreadVel, 'blue', tier, dmgMultiplier);
        });
      } else {
        fireSnowball(launchPos, launchVelocity, 'blue', tier, dmgMultiplier);
      }

      // Arm energetic throw animation
      player.armR.rotation.x = -Math.PI / 2;

      // Screen shake and burst on medium/large release
      if (tier === 'large') {
        screenShake = 0.55;
        spawnSnowBurst(launchPos, 18, true);
      } else if (tier === 'medium') {
        screenShake = 0.2;
        spawnSnowBurst(launchPos, 8);
      }
    }

    // Key Down: fires immediately on Space tap or starts charging!
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPaused) return;
      const code = e.code;
      if (code === 'KeyW') keys.w = true;
      if (code === 'KeyA') keys.a = true;
      if (code === 'KeyS') keys.s = true;
      if (code === 'KeyD') keys.d = true;

      if (code === 'ShiftLeft' || code === 'ShiftRight') {
        triggerPlayerDash();
      }

      if (code === 'Space') {
        e.preventDefault();
        if (!e.repeat && !isCharging) {
          isCharging = true;
          chargeStartTime = performance.now();
          chargeAmount = 0;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      if (code === 'KeyW') keys.w = false;
      if (code === 'KeyA') keys.a = false;
      if (code === 'KeyS') keys.s = false;
      if (code === 'KeyD') keys.d = false;

      if (code === 'Space') {
        if (isCharging) {
          executePlayerShot(chargeAmount);
          isCharging = false;
          chargeAmount = 0;
        }
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (isPaused) return;
      if (e.button === 0) {
        // Left click: start charge or tap
        isCharging = true;
        chargeStartTime = performance.now();
        chargeAmount = 0;
        cameraControl.lastMouseX = e.clientX;
        cameraControl.lastMouseY = e.clientY;
        cameraControl.dragMoved = false;
      } else if (e.button === 2) {
        cameraControl.isDragging = true;
        cameraControl.lastMouseX = e.clientX;
        cameraControl.lastMouseY = e.clientY;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isPaused) return;
      if (e.buttons === 1 || e.buttons === 2) {
        const dx = e.clientX - cameraControl.lastMouseX;
        const dy = e.clientY - cameraControl.lastMouseY;
        cameraControl.lastMouseX = e.clientX;
        cameraControl.lastMouseY = e.clientY;

        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
          cameraControl.dragMoved = true;
        }

        cameraControl.yaw -= dx * 0.005;
        cameraControl.pitch += dy * 0.005;
        cameraControl.pitch = Math.max(-0.15, Math.min(1.2, cameraControl.pitch));
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        if (isCharging) {
          executePlayerShot(chargeAmount);
          isCharging = false;
          chargeAmount = 0;
        }
      }
      cameraControl.isDragging = false;
    };

    const handleWheel = (e: WheelEvent) => {
      if (isPaused) return;
      e.preventDefault();
      cameraControl.distance = Math.max(
        cameraControl.minDist,
        Math.min(cameraControl.maxDist, cameraControl.distance + e.deltaY * 0.03)
      );
    };

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('contextmenu', handleContextMenu);

    function triggerPlayerDash() {
      if (stamina < 30 || isDashing) return;
      stamina -= 30;
      isDashing = true;
      dashTimer = 0.28;
      playerInvulnerableTimer = 0.35;
      targetFov = 75;

      const camForward = new THREE.Vector3(-Math.sin(cameraControl.yaw), 0, -Math.cos(cameraControl.yaw));
      const camRight = new THREE.Vector3(Math.cos(cameraControl.yaw), 0, -Math.sin(cameraControl.yaw));
      const move = new THREE.Vector3();
      if (keys.w) move.add(camForward);
      if (keys.s) move.sub(camForward);
      if (keys.a) move.sub(camRight);
      if (keys.d) move.add(camRight);

      if (move.lengthSq() > 0) {
        dashDir.copy(move.normalize());
      } else {
        dashDir.copy(camForward);
      }

      sounds.playDash();
      spawnSnowBurst(player.group.position.clone().add(new THREE.Vector3(0, 2, 0)), 22);
      spawnFootprint(player.group.position, true);
    }

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // --- 15. MAIN ANIMATION & SIMULATION LOOP ---
    const clock = new THREE.Clock();
    let currentWave = 1;
    let screenShake = 0;
    let footstepTimer = 0;
    let sculptSoundTimer = 0;

    // Static reusable vectors to eliminate GC pauses
    const _vCamForward = new THREE.Vector3();
    const _vCamRight = new THREE.Vector3();
    const _vInput = new THREE.Vector3();
    const _vCamPos = new THREE.Vector3();
    const _vCamTarget = new THREE.Vector3();

    // Throttled HUD update caches to eliminate React 60fps re-render stuttering
    let lastSentStamina = -1;
    let lastSentCharge = -1;
    let lastSentPlayerHp = -1;
    let lastSentEnemyHp = -1;
    let lastPowerUpsCount = -1;

    const animate = () => {
      requestAnimationFrame(animate);

      const delta = Math.min(clock.getDelta(), 0.05);
      const time = clock.getElapsedTime();

      // Animate Aurora Borealis, Twinkling Stars, Radiant Moon & Christmas Lights
      auroraCurtains.forEach((aurora, idx) => {
        aurora.rotation.y += delta * 0.04 * (idx % 2 === 0 ? 1 : -1);
        (aurora.material as THREE.MeshBasicMaterial).opacity = 0.55 + Math.sin(time * 0.8 + idx) * 0.2;
      });

      // Twinkling Starfield
      starMat.size = 1.3 + Math.sin(time * 3.5) * 0.35;
      starMat.opacity = 0.8 + Math.sin(time * 2.0) * 0.18;

      // Radiant Moon Corona Glow
      moonGlow.scale.setScalar(1.0 + Math.sin(time * 0.75) * 0.06);

      // Twinkling Christmas Tree Garland Fairy Lights
      garlandBulbs.forEach((bulb, idx) => {
        const pulse = 0.75 + Math.sin(time * 4.5 + idx * 0.8) * 0.45;
        bulb.scale.setScalar(pulse);
      });

      if (!isPaused && player.hp > 0) {
        // Touch inputs
        if (touchActionRef.current) {
          const { moveX, moveY, lookX, lookY, isCharging: touchCharging, doDash } = touchActionRef.current;
          if (doDash) {
            triggerPlayerDash();
            touchActionRef.current.doDash = false;
          }
          if (touchCharging && !isCharging) {
            isCharging = true;
            chargeStartTime = performance.now();
            chargeAmount = 0;
          } else if (!touchCharging && isCharging) {
            executePlayerShot(chargeAmount);
            isCharging = false;
            chargeAmount = 0;
          }
          if (Math.abs(lookX) > 0.01) {
            cameraControl.yaw -= lookX * 0.035;
          }
          if (Math.abs(lookY) > 0.01) {
            cameraControl.pitch += lookY * 0.035;
            cameraControl.pitch = Math.max(-0.15, Math.min(1.2, cameraControl.pitch));
          }
        }

        // Movement & physics (zero allocations)
        _vCamForward.set(-Math.sin(cameraControl.yaw), 0, -Math.cos(cameraControl.yaw));
        _vCamRight.set(Math.cos(cameraControl.yaw), 0, -Math.sin(cameraControl.yaw));

        let inputX = 0;
        let inputZ = 0;
        if (keys.w) { inputX += _vCamForward.x; inputZ += _vCamForward.z; }
        if (keys.s) { inputX -= _vCamForward.x; inputZ -= _vCamForward.z; }
        if (keys.a) { inputX -= _vCamRight.x; inputZ -= _vCamRight.z; }
        if (keys.d) { inputX += _vCamRight.x; inputZ += _vCamRight.z; }

        if (touchActionRef.current && (Math.abs(touchActionRef.current.moveX) > 0.1 || Math.abs(touchActionRef.current.moveY) > 0.1)) {
          inputX += _vCamRight.x * touchActionRef.current.moveX - _vCamForward.x * touchActionRef.current.moveY;
          inputZ += _vCamRight.z * touchActionRef.current.moveX - _vCamForward.z * touchActionRef.current.moveY;
        }

        _vInput.set(inputX, 0, inputZ);
        const isMoving = _vInput.lengthSq() > 0.01;

        // Camera tilt roll on strafe
        if (keys.a) cameraControl.roll = THREE.MathUtils.lerp(cameraControl.roll, 0.035, delta * 5);
        else if (keys.d) cameraControl.roll = THREE.MathUtils.lerp(cameraControl.roll, -0.035, delta * 5);
        else cameraControl.roll = THREE.MathUtils.lerp(cameraControl.roll, 0, delta * 5);

        // ICE RINK PHYSICS: Check if player is on the ice rink!
        const playerDistFromCenter = Math.hypot(player.group.position.x, player.group.position.z);
        const isOnIce = playerDistFromCenter < RINK_RADIUS;

        // On ice: low friction, smooth glide & drifting!
        const accel = isOnIce ? 70 : 110;
        const friction = isOnIce ? 0.9 : 8.0;

        if (isDashing) {
          dashTimer -= delta;
          player.velocity.copy(dashDir).multiplyScalar(55);
          if (dashTimer <= 0) {
            isDashing = false;
            targetFov = 65;
          }
        } else if (isMoving) {
          _vInput.normalize();
          player.velocity.x += _vInput.x * accel * delta;
          player.velocity.z += _vInput.z * accel * delta;
        } else {
          player.velocity.x -= player.velocity.x * friction * delta;
          player.velocity.z -= player.velocity.z * friction * delta;
        }

        const maxSpd = isOnIce ? player.speed * 1.25 : player.speed;
        const currentSpd = Math.hypot(player.velocity.x, player.velocity.z);
        if (!isDashing && currentSpd > maxSpd) {
          player.velocity.x = (player.velocity.x / currentSpd) * maxSpd;
          player.velocity.z = (player.velocity.z / currentSpd) * maxSpd;
        }

        player.group.position.x += player.velocity.x * delta;
        player.group.position.z += player.velocity.z * delta;

        const ARENA_LIMIT = 52;
        player.group.position.x = Math.max(-ARENA_LIMIT, Math.min(ARENA_LIMIT, player.group.position.x));
        player.group.position.z = Math.max(-ARENA_LIMIT, Math.min(ARENA_LIMIT, player.group.position.z));

        // High-sensitivity aim tracking: Snowman's face & chest ALWAYS turn where you look/aim!
        const aimAngle = Math.atan2(_vCamForward.x, _vCamForward.z);
        let diff = aimAngle - player.group.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        player.group.rotation.y += diff * 26 * delta;

        // Walking / Ice Skating animation
        if (currentSpd > 1.5 && !isDashing) {
          player.walkPhase += currentSpd * delta * (isOnIce ? 0.25 : 0.45);
          player.group.position.y = Math.abs(Math.sin(player.walkPhase)) * (isOnIce ? 0.2 : 0.4);
          player.group.rotation.z = Math.sin(player.walkPhase) * (isOnIce ? 0.12 : 0.06);

          if (isOnIce) {
            iceSkateSoundTimer += delta;
            if (iceSkateSoundTimer > 0.28) {
              sounds.playIceSkate();
              spawnFootprint(player.group.position, true);
              iceSkateSoundTimer = 0;
            }
          } else {
            footstepTimer += delta;
            if (footstepTimer > 0.32) {
              sounds.playFootstep();
              spawnFootprint(player.group.position);
              footstepTimer = 0;
            }
          }
        } else {
          player.group.position.y *= 0.88;
          player.group.rotation.z *= 0.88;
        }

        player.armR.rotation.x = THREE.MathUtils.lerp(player.armR.rotation.x, 0, delta * 6);
        blueLight.position.set(player.group.position.x, 8, player.group.position.z);

        // Frost breath
        player.frostBreathTimer -= delta;
        if (player.frostBreathTimer <= 0) {
          player.frostBreathTimer = 2.5 + Math.random() * 1.5;
          spawnFrostBreath(player.group.position.clone().add(new THREE.Vector3(0, 8.3, 1.2)));
        }

        // Charge and Sculpting Snowball Mechanics
        if (isCharging) {
          const elapsed = (performance.now() - chargeStartTime) / 1000;
          const sculptRate = 1 + (upgrades?.sculptSpeed || 0) * 0.25;
          chargeAmount = Math.min(1.0, (elapsed / 1.5) * sculptRate); // 1.5s (faster with upgrades) to reach large snowball!

          // CRITICAL: Rotate snowman to face the camera crosshair aim direction while sculpting!
          const aimAngle = Math.atan2(_vCamForward.x, _vCamForward.z);
          let diff = aimAngle - player.group.rotation.y;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          player.group.rotation.y += diff * 18 * delta;

          // In-hand snowball physically grows in his mittens!
          player.inHandBall.visible = true;
          const currentBallScale = 0.4 + chargeAmount * 1.6;
          player.inHandBall.scale.setScalar(currentBallScale);

          // Arms cute patting & rolling animation!
          const pat = Math.sin(time * 24) * 0.16;
          player.armR.position.set(1.4 - pat * 0.4, 5.8, 1.4);
          player.armL.position.set(-1.4 + pat * 0.4, 5.8, 1.4);
          player.armR.rotation.set(-0.85, -0.4 + pat, -0.6);
          player.armL.rotation.set(-0.85, 0.4 - pat, 0.6);

          // Rhythmic snow packing sound
          sculptSoundTimer += delta;
          if (sculptSoundTimer > 0.18) {
            sounds.playSculpt(chargeAmount);
            sculptSoundTimer = 0;
            // Little gathering snow specks
            const handPos = player.group.position.clone();
            handPos.x += Math.sin(player.group.rotation.y) * 2.2;
            handPos.y += 6.0;
            handPos.z += Math.cos(player.group.rotation.y) * 2.2;
            spawnSnowBurst(handPos, 4);
          }
        } else {
          player.inHandBall.visible = false;
          // Smooth return arms to natural rest positions
          player.armR.position.lerp(new THREE.Vector3(2.0, 5.8, 0), delta * 8);
          player.armL.position.lerp(new THREE.Vector3(-2.0, 5.8, 0), delta * 8);
          player.armL.rotation.set(0, 0, Math.PI / 3);
          player.armR.rotation.x = THREE.MathUtils.lerp(player.armR.rotation.x, 0, delta * 6);
        }

        const quantizedCharge = isCharging ? Math.round(chargeAmount * 20) / 20 : 0;
        if (quantizedCharge !== lastSentCharge) {
          lastSentCharge = quantizedCharge;
          onChargeChange(quantizedCharge);
        }

        const staminaRegen = 25 * (1 + (upgrades?.staminaSpeed || 0) * 0.25);
        if (!isDashing && stamina < 100) stamina = Math.min(100, stamina + delta * staminaRegen);
        const roundedStamina = Math.round(stamina);
        if (roundedStamina !== lastSentStamina) {
          lastSentStamina = roundedStamina;
          onStaminaChange(roundedStamina);
        }

        if (playerInvulnerableTimer > 0) playerInvulnerableTimer -= delta;

        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, delta * 6);
        camera.updateProjectionMatrix();

        // Footprints
        for (let i = footprints.length - 1; i >= 0; i--) {
          const fp = footprints[i];
          fp.life -= delta;
          (fp.mesh.material as THREE.MeshBasicMaterial).opacity = (fp.life / fp.maxLife) * 0.5;
          if (fp.life <= 0) {
            scene.remove(fp.mesh);
            (fp.mesh.material as THREE.Material).dispose();
            footprints.splice(i, 1);
          }
        }

        // Power-ups (throttled)
        const nowSec = performance.now() / 1000;
        activePowerUps = activePowerUps.filter((p) => p.expiresAt > nowSec);
        if (activePowerUps.length !== lastPowerUpsCount) {
          lastPowerUpsCount = activePowerUps.length;
          onActivePowerUpsChange(activePowerUps);
        }

        const hasShield = activePowerUps.some((p) => p.type === 'shield');
        if (player.shieldMesh) {
          (player.shieldMesh.material as THREE.MeshBasicMaterial).opacity = hasShield
            ? 0.5 + Math.sin(time * 8) * 0.2
            : 0;
          player.shieldMesh.rotation.y += delta * 2;
        }

        // Festive Holiday Pickups Collection
        for (let i = worldPowerUps.length - 1; i >= 0; i--) {
          const pw = worldPowerUps[i];
          pw.mesh.rotation.y += delta * 2.2;
          pw.mesh.position.y = 1.3 + Math.sin(time * 3 + i) * 0.3;

          if (pw.position.distanceTo(player.group.position) < 4.0) {
            statsRef.current.powerupsCollected++;

            if (pw.type === 'sack') {
              // Santa's Sack: +45 HP!
              sounds.playPowerup();
              player.hp = Math.min(player.maxHp, player.hp + 45);
              onFloatingText({
                id: Math.random().toString(),
                text: 'МЕШОК С ПОДАРКАМИ: +45 HP ❤️',
                color: '#22c55e',
                x: player.group.position.x,
                y: player.group.position.y + 10,
                z: player.group.position.z,
                life: 1.4,
                maxLife: 1.4,
              });
              spawnSnowBurst(pw.position, 20);

            } else if (pw.type === 'gift_bag') {
              // Gift Bag: +25 Gold Coins!
              sounds.playCoin();
              onCoinCollected?.(25);
              onFloatingText({
                id: Math.random().toString(),
                text: 'ПАКЕТ С ПОДАРКАМИ: +25 МОНЕТ! 🪙',
                color: '#facc15',
                x: player.group.position.x,
                y: player.group.position.y + 10,
                z: player.group.position.z,
                life: 1.4,
                maxLife: 1.4,
              });
              spawnSnowBurst(pw.position, 20);

            } else if (pw.type === 'chest') {
              // Ice Chest: Shield + Triple Snowballs!
              sounds.playVictory();
              activePowerUps.push({ type: 'shield', expiresAt: nowSec + 14 });
              activePowerUps.push({ type: 'triple', expiresAt: nowSec + 14 });
              onFloatingText({
                id: Math.random().toString(),
                text: 'СУНДУЧОК: ЛЕДЯНОЙ ЩИТ + ТРОЙНОЙ БРОСОК! ❄️',
                color: '#38bdf8',
                x: player.group.position.x,
                y: player.group.position.y + 10,
                z: player.group.position.z,
                life: 1.5,
                maxLife: 1.5,
              });
              spawnSnowBurst(pw.position, 28, true);
            }

            scene.remove(pw.mesh);
            worldPowerUps.splice(i, 1);
          }
        }

        // Enemies AI & Combat
        enemies.forEach((enemy) => {
          if (enemy.hp <= 0) return;

          const toPlayer = new THREE.Vector3().subVectors(player.group.position, enemy.group.position);
          const distToPlayer = toPlayer.length();
          toPlayer.y = 0;
          toPlayer.normalize();

          const targetAngle = Math.atan2(toPlayer.x, toPlayer.z);
          let diff = targetAngle - enemy.group.rotation.y;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          enemy.group.rotation.y += diff * 4 * delta;

          let aiSpeed = enemy.speed;
          if (difficulty === 'easy') aiSpeed *= 0.65;
          if (difficulty === 'hard') aiSpeed *= 1.2;

          if (distToPlayer > 30) {
            enemy.group.position.x += toPlayer.x * aiSpeed * delta;
            enemy.group.position.z += toPlayer.z * aiSpeed * delta;
          } else if (distToPlayer < 14) {
            enemy.group.position.x -= toPlayer.x * aiSpeed * 0.7 * delta;
            enemy.group.position.z -= toPlayer.z * aiSpeed * 0.7 * delta;
          } else {
            const strafe = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x);
            const dir = Math.sin(time * 1.5) > 0 ? 1 : -1;
            enemy.group.position.x += strafe.x * aiSpeed * 0.6 * dir * delta;
            enemy.group.position.z += strafe.z * aiSpeed * 0.6 * dir * delta;
          }

          enemy.dodgeCooldown -= delta;
          if (enemy.dodgeCooldown <= 0 && difficulty !== 'easy') {
            for (const sb of projectiles) {
              if (sb.owner === 'blue') {
                const distToBall = enemy.group.position.distanceTo(sb.mesh.position);
                if (distToBall < 12 && Math.random() < (difficulty === 'hard' ? 0.7 : 0.4)) {
                  const side = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x).normalize();
                  const sideDir = Math.random() < 0.5 ? 1 : -1;
                  enemy.group.position.add(side.multiplyScalar(sideDir * 6.5));
                  enemy.dodgeCooldown = 2.5;
                  spawnSnowBurst(enemy.group.position, 14);
                  spawnFootprint(enemy.group.position);
                  break;
                }
              }
            }
          }

          enemy.group.position.x = Math.max(-ARENA_LIMIT, Math.min(ARENA_LIMIT, enemy.group.position.x));
          enemy.group.position.z = Math.max(-ARENA_LIMIT, Math.min(ARENA_LIMIT, enemy.group.position.z));

          enemy.walkPhase += delta * 6;
          enemy.group.position.y = Math.abs(Math.sin(enemy.walkPhase)) * 0.3;

          enemy.frostBreathTimer -= delta;
          if (enemy.frostBreathTimer <= 0) {
            enemy.frostBreathTimer = 2.5 + Math.random() * 2;
            spawnFrostBreath(enemy.group.position.clone().add(new THREE.Vector3(0, 8.3, 1.2)));
          }

          enemy.lastShot += delta;
          let shootInterval = 2.4;
          if (difficulty === 'easy') shootInterval = 3.5;
          if (difficulty === 'hard') shootInterval = 1.7;
          if (enemy.isBoss) shootInterval = 1.4;

          if (enemy.lastShot > shootInterval && distToPlayer < 65) {
            enemy.lastShot = 0;
            const leadMultiplier = difficulty === 'hard' ? 0.8 : (difficulty === 'normal' ? 0.4 : 0.0);
            const predictedPos = player.group.position.clone().add(
              player.velocity.clone().multiplyScalar(leadMultiplier)
            );
            predictedPos.y = 6.2;

            const enemyShootPos = enemy.group.position.clone().add(new THREE.Vector3(0, 6.8, 0));
            const enemyDist = predictedPos.distanceTo(enemyShootPos);
            const enemyFlightTime = enemyDist / 55;
            const enemyDrop = 0.5 * 9.8 * enemyFlightTime * enemyFlightTime;
            predictedPos.y += enemyDrop;

            const enemyVel = new THREE.Vector3()
              .subVectors(predictedPos, enemyShootPos)
              .normalize()
              .multiplyScalar(55);

            if (enemy.isBoss) {
              [-0.12, 0.12].forEach((offset) => {
                const sVel = enemyVel.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), offset);
                fireSnowball(enemyShootPos, sVel, 'red', 'large', 1.4);
              });
            } else {
              fireSnowball(enemyShootPos, enemyVel, 'red', 'small');
            }
          }
        });

        // Projectiles simulation
        for (let i = projectiles.length - 1; i >= 0; i--) {
          const p = projectiles[i];
          p.mesh.position.add(p.velocity.clone().multiplyScalar(delta));
          p.velocity.y -= 9.8 * delta;
          p.life -= delta;

          spawnTrail(p.mesh.position, p.owner);

          let destroyed = false;

          for (const block of coverBlocks) {
            if (block.hp <= 0) continue;
            const bPos = block.mesh.position;
            const dx = Math.abs(p.mesh.position.x - bPos.x);
            const dz = Math.abs(p.mesh.position.z - bPos.z);
            const dy = p.mesh.position.y;
            if (dx < 3.8 && dz < 1.6 && dy < 4.2 && dy > 0) {
              block.hp -= p.damage;
              spawnSnowBurst(p.mesh.position, 18);
              sounds.playImpact(false, true);

              if (block.hp <= 0) {
                scene.remove(block.mesh);
                spawnSnowBurst(bPos, 45);
              } else {
                block.mesh.scale.y = (block.hp / block.maxHp) * block.initialScaleY;
              }
              destroyed = true;
              break;
            }
          }

          if (destroyed) {
            scene.remove(p.mesh);
            projectiles.splice(i, 1);
            continue;
          }

          if (p.owner === 'blue') {
            for (const enemy of enemies) {
              if (enemy.hp <= 0) continue;
              const distXZ = Math.hypot(
                p.mesh.position.x - enemy.group.position.x,
                p.mesh.position.z - enemy.group.position.z
              );
              const py = p.mesh.position.y;

              if (distXZ < 3.8 * (enemy.isBoss ? 1.5 : 1.0) && py > 0 && py < 13 * (enemy.isBoss ? 1.5 : 1.0)) {
                destroyed = true;
                statsRef.current.shotsHit++;

                const isHeadshot = py > 7.5 * (enemy.isBoss ? 1.5 : 1.0);
                let finalDamage = p.damage;

                if (isHeadshot) {
                  finalDamage = Math.round(p.damage * 2.2);
                  statsRef.current.headshots++;
                  sounds.playImpact(true);

                  if (!enemy.hatDetached) {
                    enemy.hatDetached = true;
                    scene.attach(enemy.hatGroup);
                    particles.push({
                      mesh: enemy.hatGroup as any,
                      gravity: 18,
                      life: 1.5,
                      maxLife: 1.5,
                      velocity: new THREE.Vector3((Math.random() - 0.5) * 8, 14, (Math.random() - 0.5) * 8),
                    });
                  }

                  onFloatingText({
                    id: Math.random().toString(),
                    text: `HEADSHOT! -${finalDamage}`,
                    color: '#f59e0b',
                    x: enemy.group.position.x,
                    y: enemy.group.position.y + 11,
                    z: enemy.group.position.z,
                    life: 1.2,
                    maxLife: 1.2,
                  });
                } else {
                  sounds.playImpact(false);
                  onFloatingText({
                    id: Math.random().toString(),
                    text: `-${finalDamage}`,
                    color: '#ef4444',
                    x: enemy.group.position.x,
                    y: enemy.group.position.y + 7,
                    z: enemy.group.position.z,
                    life: 0.9,
                    maxLife: 0.9,
                  });
                }

                statsRef.current.damageDealt += finalDamage;
                enemy.hp = Math.max(0, enemy.hp - finalDamage);
                enemy.flash = 1.0;
                spawnSnowBurst(p.mesh.position, isHeadshot ? 35 : 20, isHeadshot);

                if (enemy.hp <= 0) {
                  spawnSnowBurst(enemy.group.position, 60, true);
                  scene.remove(enemy.group);

                  if (gameMode === 'survival') {
                    statsRef.current.survivalKills++;
                    const alive = enemies.filter((e) => e.hp > 0).length;
                    onWaveChange(currentWave, alive);

                    if (alive === 0) {
                      currentWave++;
                      const spawnCount = 2 + currentWave;
                      for (let w = 0; w < spawnCount; w++) {
                        const isWaveBoss = w === 0 && currentWave % 3 === 0;
                        const ne = createDetailedSnowman(0xef4444, 0xb91c1c, isWaveBoss);
                        const a = Math.random() * Math.PI * 2;
                        ne.group.position.set(Math.cos(a) * 40, 0, Math.sin(a) * 40);
                        enemies.push(ne);
                      }
                      onWaveChange(currentWave, spawnCount);
                      onFloatingText({
                        id: Math.random().toString(),
                        text: `ВОЛНА ${currentWave}!`,
                        color: '#38bdf8',
                        x: 0,
                        y: 12,
                        z: 0,
                        life: 2.0,
                        maxLife: 2.0,
                      });
                    }
                  } else {
                    sounds.playVictory();
                    onGameOver('blue', statsRef.current);
                  }
                }
                break;
              }
            }
          } else if (p.owner === 'red') {
            const distXZ = Math.hypot(
              p.mesh.position.x - player.group.position.x,
              p.mesh.position.z - player.group.position.z
            );
            const py = p.mesh.position.y;

            if (distXZ < 3.8 && py > 0 && py < 12) {
              destroyed = true;

              if (playerInvulnerableTimer > 0) {
                onFloatingText({
                  id: Math.random().toString(),
                  text: 'DODGED!',
                  color: '#38bdf8',
                  x: player.group.position.x,
                  y: player.group.position.y + 8,
                  z: player.group.position.z,
                  life: 0.8,
                  maxLife: 0.8,
                });
                sounds.playImpact(false);
              } else {
                const shieldIdx = activePowerUps.findIndex((pw) => pw.type === 'shield');
                if (shieldIdx !== -1) {
                  activePowerUps.splice(shieldIdx, 1);
                  onFloatingText({
                    id: Math.random().toString(),
                    text: 'SHIELD BLOCKED!',
                    color: '#06b6d4',
                    x: player.group.position.x,
                    y: player.group.position.y + 8,
                    z: player.group.position.z,
                    life: 1.0,
                    maxLife: 1.0,
                  });
                  sounds.playImpact(false);
                } else {
                  const dmg = p.damage;
                  player.hp = Math.max(0, player.hp - dmg);
                  statsRef.current.damageReceived += dmg;
                  player.flash = 1.0;
                  screenShake = 0.85;
                  sounds.playImpact(false);

                  onFloatingText({
                    id: Math.random().toString(),
                    text: `-${dmg}`,
                    color: '#ef4444',
                    x: player.group.position.x,
                    y: player.group.position.y + 8,
                    z: player.group.position.z,
                    life: 0.9,
                    maxLife: 0.9,
                  });

                  if (player.hp <= 0) {
                    sounds.playDefeat();
                    onGameOver('red', statsRef.current);
                  }
                }
              }
              spawnSnowBurst(p.mesh.position, 25);
            }
          }

          if (p.mesh.position.y < 0.2 || p.life <= 0) {
            destroyed = true;
            if (p.mesh.position.y < 0.5) spawnSnowBurst(p.mesh.position, 10);
          }

          if (destroyed) {
            scene.remove(p.mesh);
            projectiles.splice(i, 1);
          }
        }

        // Particles simulation
        for (let i = particles.length - 1; i >= 0; i--) {
          const pt = particles[i];
          pt.mesh.position.add(pt.velocity.clone().multiplyScalar(delta));
          pt.velocity.y -= pt.gravity * delta;
          if (pt.rotSpeed) {
            pt.mesh.rotation.x += pt.rotSpeed.x * delta;
            pt.mesh.rotation.y += pt.rotSpeed.y * delta;
          }
          pt.life -= delta;
          const scale = Math.max(0.01, pt.life / pt.maxLife);
          pt.mesh.scale.setScalar(scale);

          if (pt.life <= 0) {
            scene.remove(pt.mesh);
            particles.splice(i, 1);
          }
        }

        // Falling Snow update
        const sArr = snowBufferGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < SNOW_COUNT; i++) {
          const k = i * 3;
          sArr[k + 1] -= snowSpeeds[i] * delta;
          sArr[k] += Math.sin(time + snowDrift[i]) * delta * 2.2;
          if (sArr[k + 1] < 0) {
            sArr[k + 1] = 85 + Math.random() * 15;
            sArr[k] = (Math.random() - 0.5) * 320;
            sArr[k + 2] = (Math.random() - 0.5) * 320;
          }
        }
        snowBufferGeo.attributes.position.needsUpdate = true;

        // Flash materials
        [player, ...enemies].forEach((ent) => {
          if (ent.flash > 0) {
            ent.flash = Math.max(0, ent.flash - delta * 3.5);
            const intensity = ent.flash * 0.9;
            (ent.bottom.material as THREE.MeshStandardMaterial).emissive.setRGB(intensity, 0.1, 0.1);
          } else {
            (ent.bottom.material as THREE.MeshStandardMaterial).emissive.setRGB(0, 0, 0);
          }
        });

        const primaryEnemy = enemies[0];
        const curPlayerHp = Math.round(player.hp);
        const curEnemyHp = primaryEnemy ? Math.round(primaryEnemy.hp) : 0;
        if (curPlayerHp !== lastSentPlayerHp || curEnemyHp !== lastSentEnemyHp) {
          lastSentPlayerHp = curPlayerHp;
          lastSentEnemyHp = curEnemyHp;
          onHpChange(
            curPlayerHp,
            curEnemyHp,
            primaryEnemy?.isBoss ? curEnemyHp : undefined,
            primaryEnemy?.isBoss ? primaryEnemy.maxHp : undefined
          );
        }
      }

      // Camera update (zero-allocation)
      const pPos = player.group.position;
      const camX = pPos.x + Math.sin(cameraControl.yaw) * Math.cos(cameraControl.pitch) * cameraControl.distance;
      const camY = pPos.y + 6.0 + Math.sin(cameraControl.pitch) * cameraControl.distance;
      const camZ = pPos.z + Math.cos(cameraControl.yaw) * Math.cos(cameraControl.pitch) * cameraControl.distance;

      _vCamPos.set(camX, camY, camZ);
      camera.position.lerp(_vCamPos, 0.18);

      if (screenShake > 0.01) {
        camera.position.x += (Math.random() - 0.5) * screenShake * 2.0;
        camera.position.y += (Math.random() - 0.5) * screenShake * 2.0;
        screenShake *= 0.88;
      }
      _vCamTarget.set(pPos.x, pPos.y + 6.0, pPos.z);
      camera.lookAt(_vCamTarget);
      camera.rotation.z += cameraControl.roll;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('resize', handleResize);
      clearInterval(powerUpInterval);

      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [gameMode, difficulty, aimMode]);

  return <div ref={containerRef} className="w-full h-full relative cursor-crosshair" />;
};
