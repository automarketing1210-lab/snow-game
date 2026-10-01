import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GameMode, Difficulty, AimMode, ActivePowerUp, GameStats, FloatingText } from '../types/game';
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
  statsRef,
  touchActionRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // --- THREE.JS INITIALIZATION ---
    const scene = new THREE.Scene();

    // Sky with gentle gradient & atmospheric fog
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 2;
    skyCanvas.height = 256;
    const skyCtx = skyCanvas.getContext('2d')!;
    const skyGrad = skyCtx.createLinearGradient(0, 0, 0, 256);
    skyGrad.addColorStop(0, '#102a4e');
    skyGrad.addColorStop(0.4, '#1e487a');
    skyGrad.addColorStop(0.7, '#6ba2cc');
    skyGrad.addColorStop(1, '#d8eaf7');
    skyCtx.fillStyle = skyGrad;
    skyCtx.fillRect(0, 0, 2, 256);
    const skyTexture = new THREE.CanvasTexture(skyCanvas);
    skyTexture.colorSpace = THREE.SRGBColorSpace;
    scene.background = skyTexture;
    scene.fog = new THREE.FogExp2(0xcfe4f5, 0.007);

    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    containerRef.current.appendChild(renderer.domElement);

    // --- LIGHTING ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xdff0ff, 0x9fbcd8, 0.85);
    scene.add(hemiLight);

    const sun = new THREE.DirectionalLight(0xfffae8, 2.0);
    sun.position.set(70, 110, 50);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 320;
    sun.shadow.camera.left = -110;
    sun.shadow.camera.right = 110;
    sun.shadow.camera.top = 110;
    sun.shadow.camera.bottom = -110;
    sun.shadow.bias = -0.0004;
    scene.add(sun);

    // Dynamic player blue & enemy red lights
    const blueLight = new THREE.PointLight(0x38bdf8, 2.8, 35);
    scene.add(blueLight);

    // --- GROUND & PERIMETER HILLS ---
    function hillH(x: number, z: number): number {
      const r = Math.hypot(x, z);
      const t = Math.min(1, Math.max(0, (r - 75) / 50));
      return t * t * (3 - 2 * t) * (Math.sin(x * 0.05) * Math.cos(z * 0.04) + 1.2) * 8;
    }

    const groundGeo = new THREE.PlaneGeometry(550, 550, 140, 140);
    const pa = groundGeo.attributes.position;
    for (let i = 0; i < pa.count; i++) {
      pa.setZ(i, hillH(pa.getX(i), -pa.getY(i)));
    }
    groundGeo.computeVertexNormals();

    // Procedural textured snow
    const snowGroundCanvas = document.createElement('canvas');
    snowGroundCanvas.width = 256;
    snowGroundCanvas.height = 256;
    const sgc = snowGroundCanvas.getContext('2d')!;
    sgc.fillStyle = '#f4faff';
    sgc.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2000; i++) {
      sgc.fillStyle = Math.random() < 0.5 ? 'rgba(180,210,240,0.3)' : 'rgba(255,255,255,0.7)';
      sgc.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    const groundTex = new THREE.CanvasTexture(snowGroundCanvas);
    groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
    groundTex.repeat.set(80, 80);
    groundTex.colorSpace = THREE.SRGBColorSpace;

    const groundMat = new THREE.MeshStandardMaterial({
      map: groundTex,
      roughness: 0.9,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // --- ENVIRONMENT: TREES, SNOW ROCKS, AND AURORA ---
    const treeGroup = new THREE.Group();
    function createPineTree(x: number, z: number, scale = 1) {
      const tree = new THREE.Group();
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3e2312, roughness: 0.95 });
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.55 * scale, 0.75 * scale, 4 * scale, 8), trunkMat);
      trunk.position.y = 2 * scale;
      trunk.castShadow = true;
      tree.add(trunk);

      const needleMat = new THREE.MeshStandardMaterial({ color: 0x184824, roughness: 0.85, flatShading: true });
      const snowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });

      [
        { y: 4.8, r: 3.4, h: 4.8 },
        { y: 7.8, r: 2.6, h: 4.2 },
        { y: 10.6, r: 1.7, h: 3.8 },
      ].forEach((lvl) => {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(lvl.r * scale, lvl.h * scale, 8), needleMat);
        cone.position.y = lvl.y * scale;
        cone.castShadow = true;
        tree.add(cone);
        const snowCap = new THREE.Mesh(new THREE.ConeGeometry(lvl.r * 0.95 * scale, lvl.h * 0.35 * scale, 8), snowMat);
        snowCap.position.y = (lvl.y + lvl.h * 0.3) * scale;
        snowCap.castShadow = true;
        tree.add(snowCap);
      });

      tree.position.set(x, hillH(x, z) - 0.3, z);
      treeGroup.add(tree);
    }

    for (let i = 0; i < 65; i++) {
      const angle = (i / 65) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
      const dist = 55 + Math.random() * 75;
      createPineTree(Math.cos(angle) * dist, Math.sin(angle) * dist, 0.85 + Math.random() * 0.8);
    }
    scene.add(treeGroup);

    // Decorative icy rocks & snowdrifts
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x5a6a7c, roughness: 0.95, flatShading: true });
    const snowCapMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 35 + Math.random() * 30;
      const rx = Math.cos(a) * d;
      const rz = Math.sin(a) * d;
      const sc = 1.2 + Math.random() * 1.8;
      const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(sc, 0), rockMat);
      rock.position.set(rx, sc * 0.4, rz);
      rock.scale.y = 0.75;
      rock.castShadow = rock.receiveShadow = true;
      scene.add(rock);

      const cap = new THREE.Mesh(new THREE.IcosahedronGeometry(sc * 0.8, 0), snowCapMat);
      cap.position.set(rx, sc * 0.8, rz);
      cap.scale.set(1, 0.45, 1);
      scene.add(cap);
    }

    // --- DESTRUCTIBLE SNOW FORTS / TACTICAL COVER ---
    interface CoverBlock {
      mesh: THREE.Mesh;
      hp: number;
      maxHp: number;
      initialScaleY: number;
    }
    const coverBlocks: CoverBlock[] = [];
    const iceBlockGeo = new THREE.BoxGeometry(7, 3.8, 2.2);

    function createSnowCover(x: number, z: number, rotY: number) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0xe6f4fe,
        roughness: 0.7,
        metalness: 0.1,
        transparent: true,
        opacity: 0.95,
      });
      const mesh = new THREE.Mesh(iceBlockGeo, mat);
      mesh.position.set(x, 1.9, z);
      mesh.rotation.y = rotY;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Snow topping
      const capMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
      const cap = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.6, 2.4), capMat);
      cap.position.y = 2.0;
      mesh.add(cap);

      scene.add(mesh);
      coverBlocks.push({ mesh, hp: 50, maxHp: 50, initialScaleY: 1 });
    }

    // Tactical arena placement (central cover, side bunkers)
    createSnowCover(-10, -12, 0.2);
    createSnowCover(10, -12, -0.2);
    createSnowCover(-10, 12, -0.2);
    createSnowCover(10, 12, 0.2);
    createSnowCover(0, -25, 0);
    createSnowCover(0, 25, 0);
    createSnowCover(-24, 0, Math.PI / 2);
    createSnowCover(24, 0, Math.PI / 2);

    // --- SNOWMAN BUILDER (HEAD, TORSO, HAT, ARMS, EYES) ---
    interface SnowmanEntity {
      group: THREE.Group;
      head: THREE.Mesh;
      middle: THREE.Mesh;
      bottom: THREE.Mesh;
      hatGroup: THREE.Group;
      hatDetached: boolean;
      armL: THREE.Mesh;
      armR: THREE.Mesh;
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
    }

    function createDetailedSnowman(colorMain: number, colorAccent: number, isBoss: boolean = false): SnowmanEntity {
      const scale = isBoss ? 1.6 : 1.0;
      const group = new THREE.Group();
      group.scale.set(scale, scale, scale);

      const snowMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.85,
        metalness: 0.02,
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

      // Face: Eyes & Glowing Pupils
      const coalMat = new THREE.MeshStandardMaterial({ color: 0x111827 });
      const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), coalMat);
      eyeL.position.set(-0.45, 8.7, 1.18);
      group.add(eyeL);
      const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), coalMat);
      eyeR.position.set(0.45, 8.7, 1.18);
      group.add(eyeR);

      const pupilMat = new THREE.MeshBasicMaterial({ color: colorMain });
      const pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), pupilMat);
      pupilL.position.set(-0.45, 8.7, 1.32);
      group.add(pupilL);
      const pupilR = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), pupilMat);
      pupilR.position.set(0.45, 8.7, 1.32);
      group.add(pupilR);

      // Carrot Nose
      const carrotMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.6 });
      const carrot = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.25, 16), carrotMat);
      carrot.position.set(0, 8.25, 1.6);
      carrot.rotation.x = Math.PI / 2;
      carrot.castShadow = true;
      group.add(carrot);

      // Scarf
      const scarfMat = new THREE.MeshStandardMaterial({ color: colorMain, roughness: 0.6 });
      const scarf = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.3, 14, 28), scarfMat);
      scarf.position.y = 7.4;
      scarf.rotation.x = Math.PI / 2;
      group.add(scarf);

      // Hat Group (can be knocked off!)
      const hatGroup = new THREE.Group();
      if (isBoss) {
        // Golden King's Crown for Boss
        const crownMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8, roughness: 0.2 });
        const crownBase = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.3, 0.8, 16), crownMat);
        crownBase.position.y = 9.4;
        hatGroup.add(crownBase);
        for (let i = 0; i < 5; i++) {
          const spike = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.9, 8), crownMat);
          const a = (i / 5) * Math.PI * 2;
          spike.position.set(Math.cos(a) * 1.3, 10.1, Math.sin(a) * 1.3);
          hatGroup.add(spike);
        }
      } else {
        // Classic Top Hat with colored ribbon
        const hatMat = new THREE.MeshStandardMaterial({ color: colorAccent, metalness: 0.4, roughness: 0.5 });
        const brim = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.16, 24), hatMat);
        brim.position.y = 8.85;
        hatGroup.add(brim);

        const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.2, 1.6, 20), hatMat);
        cylinder.position.y = 9.65;
        hatGroup.add(cylinder);

        const ribbon = new THREE.Mesh(
          new THREE.CylinderGeometry(1.38, 1.36, 0.35, 20),
          new THREE.MeshStandardMaterial({ color: colorMain })
        );
        ribbon.position.y = 9.15;
        hatGroup.add(ribbon);
      }
      group.add(hatGroup);

      // Stick Arms
      const stickMat = new THREE.MeshStandardMaterial({ color: 0x422a1d, roughness: 0.9 });
      const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 3.2, 8), stickMat);
      armL.position.set(-2.8, 6.2, 0);
      armL.rotation.z = Math.PI / 3;
      armL.castShadow = true;
      group.add(armL);

      const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 3.2, 8), stickMat);
      armR.position.set(2.8, 6.2, 0);
      armR.rotation.z = -Math.PI / 3;
      armR.castShadow = true;
      group.add(armR);

      // Ice Shield Mesh (initially hidden)
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

      // Base ring marker
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(3.2, 3.8, 36),
        new THREE.MeshBasicMaterial({
          color: colorMain,
          transparent: true,
          opacity: 0.6,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.1;
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
      };
    }

    // Spawn Player
    const player = createDetailedSnowman(0x38bdf8, 0x1e3a8a, false);
    player.group.position.set(-20, 0, 0);

    // Enemies List
    let enemies: SnowmanEntity[] = [];

    function setupEnemies() {
      // Clear existing
      enemies.forEach((e) => scene.remove(e.group));
      enemies = [];

      if (gameMode === 'duel') {
        const isBoss = difficulty === 'boss';
        const redEnemy = createDetailedSnowman(0xef4444, 0x7f1d1d, isBoss);
        redEnemy.group.position.set(22, 0, 0);
        redEnemy.group.rotation.y = Math.PI;
        enemies.push(redEnemy);
      } else if (gameMode === 'survival') {
        // Spawn 3 wave 1 enemies
        for (let i = 0; i < 3; i++) {
          const e = createDetailedSnowman(0xef4444, 0x7f1d1d, false);
          const angle = (i / 3) * Math.PI + Math.PI / 2;
          e.group.position.set(Math.cos(angle) * 35, 0, Math.sin(angle) * 35);
          enemies.push(e);
        }
      } else if (gameMode === 'practice') {
        // Practice dummy + floating targets
        const dummy = createDetailedSnowman(0xa855f7, 0x581c87, false);
        dummy.group.position.set(25, 0, 0);
        enemies.push(dummy);
      }
    }
    setupEnemies();

    // --- SNOWBALL PROJECTILE ENGINE ---
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
      direction: THREE.Vector3,
      owner: 'blue' | 'red',
      speed: number = 65,
      isCharged: boolean = false,
      damageMultiplier: number = 1
    ) {
      const group = new THREE.Group();
      const scale = isCharged ? 1.8 : 1.0;
      const mesh = new THREE.Mesh(snowballGeo, snowballMat);
      mesh.scale.setScalar(scale);
      mesh.castShadow = true;
      group.add(mesh);

      // Glowing aura
      const auraColor = owner === 'blue' ? 0x38bdf8 : 0xef4444;
      const aura = new THREE.Mesh(
        new THREE.SphereGeometry(0.75 * scale, 12, 12),
        new THREE.MeshBasicMaterial({
          color: auraColor,
          transparent: true,
          opacity: isCharged ? 0.6 : 0.3,
          blending: THREE.AdditiveBlending,
        })
      );
      group.add(aura);

      group.position.copy(startPos);
      scene.add(group);

      const vel = direction.clone().normalize().multiplyScalar(speed * (isCharged ? 1.25 : 1.0));
      // Give slight upward arc
      vel.y += 2.0;

      const baseDamage = isCharged ? 30 : 12;
      projectiles.push({
        mesh: group,
        velocity: vel,
        owner,
        damage: Math.round(baseDamage * damageMultiplier),
        radius: 0.7 * scale,
        life: 4.5,
        isCharged,
      });

      sounds.playThrow(isCharged ? 1 : 0);
    }

    // --- PARTICLE FX ENGINE ---
    interface Particle {
      mesh: THREE.Mesh;
      velocity: THREE.Vector3;
      gravity: number;
      life: number;
      maxLife: number;
    }
    let particles: Particle[] = [];
    const pGeo = new THREE.IcosahedronGeometry(0.18, 0);
    const pWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pBlueMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc });
    const pRedMat = new THREE.MeshBasicMaterial({ color: 0xfca5a5 });

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
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 22,
            Math.random() * 16 + 4,
            (Math.random() - 0.5) * 22
          ),
        });
      }
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

    // --- FALLING SNOW SIMULATION ---
    const SNOW_COUNT = 1500;
    const snowSpeeds = new Float32Array(SNOW_COUNT);
    const snowDrift = new Float32Array(SNOW_COUNT);
    const snowPositions = new Float32Array(SNOW_COUNT * 3);
    for (let i = 0; i < SNOW_COUNT; i++) {
      snowPositions[i * 3] = (Math.random() - 0.5) * 320;
      snowPositions[i * 3 + 1] = Math.random() * 90;
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
    sfGrad.addColorStop(0.4, 'rgba(255,255,255,0.75)');
    sfGrad.addColorStop(1, 'rgba(255,255,255,0)');
    sfc.fillStyle = sfGrad;
    sfc.fillRect(0, 0, 32, 32);

    const snowPoints = new THREE.Points(
      snowBufferGeo,
      new THREE.PointsMaterial({
        size: 0.9,
        map: new THREE.CanvasTexture(snowFlakeCanvas),
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      })
    );
    snowPoints.frustumCulled = false;
    scene.add(snowPoints);

    // --- POWER-UPS ENGINE ---
    interface ActivePowerUpState {
      type: 'triple' | 'shield' | 'rapid' | 'heal';
      expiresAt: number;
    }
    let activePowerUps: ActivePowerUpState[] = [];
    interface WorldPowerUp {
      mesh: THREE.Group;
      type: 'triple' | 'shield' | 'rapid' | 'heal';
      position: THREE.Vector3;
    }
    let worldPowerUps: WorldPowerUp[] = [];

    function spawnRandomPowerUp() {
      if (worldPowerUps.length >= 3) return;
      const types: Array<'triple' | 'shield' | 'rapid' | 'heal'> = ['triple', 'shield', 'rapid', 'heal'];
      const chosen = types[Math.floor(Math.random() * types.length)];
      const angle = Math.random() * Math.PI * 2;
      const dist = 10 + Math.random() * 25;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      const group = new THREE.Group();
      let color = 0x38bdf8;
      if (chosen === 'triple') color = 0xf59e0b; // Amber
      if (chosen === 'rapid') color = 0xa855f7; // Purple
      if (chosen === 'heal') color = 0x22c55e; // Green
      if (chosen === 'shield') color = 0x06b6d4; // Cyan

      // Glowing crystal / orb
      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(1.1, 0),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.8,
          roughness: 0.2,
          metalness: 0.8,
        })
      );
      crystal.position.y = 1.8;
      group.add(crystal);

      // Ground beacon ring
      const beacon = new THREE.Mesh(
        new THREE.RingGeometry(1.2, 1.8, 24),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, side: THREE.DoubleSide })
      );
      beacon.rotation.x = -Math.PI / 2;
      beacon.position.y = 0.08;
      group.add(beacon);

      group.position.set(x, 0, z);
      scene.add(group);
      worldPowerUps.push({ mesh: group, type: chosen, position: group.position });
    }

    // Initial power-up
    spawnRandomPowerUp();
    const powerUpInterval = setInterval(() => {
      if (!isPaused) spawnRandomPowerUp();
    }, 12000);

    // --- PLAYER STATE & CONTROLS ---
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
    let isDashing = false;
    let dashTimer = 0;
    let dashDir = new THREE.Vector3();
    let playerInvulnerableTimer = 0;

    const cameraControl = {
      yaw: 0,
      pitch: 0.35,
      distance: 30,
      minDist: 14,
      maxDist: 60,
      isDragging: false,
      lastMouseX: 0,
      lastMouseY: 0,
      crosshairRay: new THREE.Raycaster(),
    };

    // --- EVENT LISTENERS ---
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPaused) return;
      const code = e.code;
      if (code === 'KeyW') keys.w = true;
      if (code === 'KeyA') keys.a = true;
      if (code === 'KeyS') keys.s = true;
      if (code === 'KeyD') keys.d = true;

      // Dash on Shift
      if (code === 'ShiftLeft' || code === 'ShiftRight') {
        triggerPlayerDash();
      }

      // Charge shot on Space
      if (code === 'Space') {
        e.preventDefault();
        if (!e.repeat) {
          isCharging = true;
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
          firePlayerSnowball(chargeAmount);
          isCharging = false;
          chargeAmount = 0;
        }
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (isPaused) return;
      if (e.button === 0) {
        // Start charging on left click
        isCharging = true;
        cameraControl.lastMouseX = e.clientX;
        cameraControl.lastMouseY = e.clientY;
      } else if (e.button === 2) {
        // Right click orbit drag
        cameraControl.isDragging = true;
        cameraControl.lastMouseX = e.clientX;
        cameraControl.lastMouseY = e.clientY;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isPaused) return;
      // Allow camera drag with right click OR left click drag if moved significantly
      if (e.buttons === 1 || e.buttons === 2) {
        const dx = e.clientX - cameraControl.lastMouseX;
        const dy = e.clientY - cameraControl.lastMouseY;
        cameraControl.lastMouseX = e.clientX;
        cameraControl.lastMouseY = e.clientY;

        cameraControl.yaw -= dx * 0.005;
        cameraControl.pitch += dy * 0.005;
        cameraControl.pitch = Math.max(-0.15, Math.min(1.2, cameraControl.pitch));
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0 && isCharging) {
        firePlayerSnowball(chargeAmount);
        isCharging = false;
        chargeAmount = 0;
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

    // --- DASH / DODGE TRIGGER ---
    function triggerPlayerDash() {
      if (stamina < 30 || isDashing) return;
      stamina -= 30;
      isDashing = true;
      dashTimer = 0.28;
      playerInvulnerableTimer = 0.35;

      // Determine dash direction from movement keys or player forward
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
      spawnSnowBurst(player.group.position.clone().add(new THREE.Vector3(0, 2, 0)), 18);
    }

    // --- PLAYER SHOOTING LOGIC ---
    let lastPlayerShotTime = 0;

    function firePlayerSnowball(chargePercent: number) {
      const now = performance.now() / 1000;
      const isRapid = activePowerUps.some((p) => p.type === 'rapid');
      const cooldown = isRapid ? 0.15 : 0.45;
      if (now - lastPlayerShotTime < cooldown) return;
      lastPlayerShotTime = now;

      statsRef.current.shotsFired++;
      const isCharged = chargePercent >= 0.7;

      // Determine target in 3D
      let aimDirection = new THREE.Vector3();

      if (aimMode === 'manual') {
        // Cast ray from center of camera through crosshair into world
        cameraControl.crosshairRay.setFromCamera(new THREE.Vector2(0, 0), camera);
        const rayPoint = new THREE.Vector3();
        cameraControl.crosshairRay.ray.at(50, rayPoint);

        const startPos = player.group.position.clone().add(new THREE.Vector3(0, 7.5, 0));
        aimDirection.subVectors(rayPoint, startPos).normalize();
      } else {
        // Auto-aim to closest alive enemy
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
          const target = (closestEnemy as SnowmanEntity).group.position.clone();
          target.y = 6.5;
          const startPos = player.group.position.clone().add(new THREE.Vector3(0, 7.5, 0));
          aimDirection.subVectors(target, startPos).normalize();
        } else {
          aimDirection.set(-Math.sin(cameraControl.yaw), 0.1, -Math.cos(cameraControl.yaw)).normalize();
        }
      }

      const launchPos = player.group.position.clone().add(new THREE.Vector3(0, 7.5, 0));
      launchPos.add(aimDirection.clone().multiplyScalar(2.8));

      const hasTriple = activePowerUps.some((p) => p.type === 'triple');
      if (hasTriple) {
        // Fire 3 snowballs
        [-0.15, 0, 0.15].forEach((angleOffset) => {
          const spreadDir = aimDirection.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angleOffset);
          fireSnowball(launchPos, spreadDir, 'blue', 62, isCharged);
        });
      } else {
        fireSnowball(launchPos, aimDirection, 'blue', 65, isCharged);
      }

      // Swing arm animation
      player.armR.rotation.x = -Math.PI / 2;
    }

    // --- RESIZE HANDLER ---
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // --- GAME LOOP ---
    const clock = new THREE.Clock();
    let currentWave = 1;
    let screenShake = 0;
    let footstepTimer = 0;

    const animate = () => {
      requestAnimationFrame(animate);

      const delta = Math.min(clock.getDelta(), 0.05);
      const time = clock.getElapsedTime();

      if (!isPaused && player.hp > 0) {
        // --- 1. HANDLE TOUCH CONTROLS ---
        if (touchActionRef.current) {
          const { moveX, moveY, lookX, lookY, isCharging: touchCharging, doDash } = touchActionRef.current;
          if (doDash) {
            triggerPlayerDash();
            touchActionRef.current.doDash = false;
          }
          if (touchCharging) {
            isCharging = true;
          } else if (isCharging && !touchCharging) {
            firePlayerSnowball(chargeAmount);
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

        // --- 2. PLAYER MOVEMENT & PHYSICS ---
        const camForward = new THREE.Vector3(-Math.sin(cameraControl.yaw), 0, -Math.cos(cameraControl.yaw));
        const camRight = new THREE.Vector3(Math.cos(cameraControl.yaw), 0, -Math.sin(cameraControl.yaw));

        let inputX = 0;
        let inputZ = 0;
        if (keys.w) { inputX += camForward.x; inputZ += camForward.z; }
        if (keys.s) { inputX -= camForward.x; inputZ -= camForward.z; }
        if (keys.a) { inputX -= camRight.x; inputZ -= camRight.z; }
        if (keys.d) { inputX += camRight.x; inputZ += camRight.z; }

        if (touchActionRef.current && (Math.abs(touchActionRef.current.moveX) > 0.1 || Math.abs(touchActionRef.current.moveY) > 0.1)) {
          inputX += camRight.x * touchActionRef.current.moveX - camForward.x * touchActionRef.current.moveY;
          inputZ += camRight.z * touchActionRef.current.moveX - camForward.z * touchActionRef.current.moveY;
        }

        const inputDir = new THREE.Vector3(inputX, 0, inputZ);
        const isMoving = inputDir.lengthSq() > 0.01;

        if (isDashing) {
          dashTimer -= delta;
          player.velocity.copy(dashDir).multiplyScalar(55);
          if (dashTimer <= 0) isDashing = false;
        } else if (isMoving) {
          inputDir.normalize();
          player.velocity.x += inputDir.x * 110 * delta;
          player.velocity.z += inputDir.z * 110 * delta;
        } else {
          player.velocity.x -= player.velocity.x * 8 * delta;
          player.velocity.z -= player.velocity.z * 8 * delta;
        }

        const maxSpd = player.speed;
        const currentSpd = Math.hypot(player.velocity.x, player.velocity.z);
        if (!isDashing && currentSpd > maxSpd) {
          player.velocity.x = (player.velocity.x / currentSpd) * maxSpd;
          player.velocity.z = (player.velocity.z / currentSpd) * maxSpd;
        }

        player.group.position.x += player.velocity.x * delta;
        player.group.position.z += player.velocity.z * delta;

        // Arena boundaries
        const ARENA_LIMIT = 52;
        player.group.position.x = Math.max(-ARENA_LIMIT, Math.min(ARENA_LIMIT, player.group.position.x));
        player.group.position.z = Math.max(-ARENA_LIMIT, Math.min(ARENA_LIMIT, player.group.position.z));

        // Walking tilt & wobble animation + footstep sound
        if (currentSpd > 1.5 && !isDashing) {
          player.walkPhase += currentSpd * delta * 0.45;
          player.group.position.y = Math.abs(Math.sin(player.walkPhase)) * 0.4;
          player.group.rotation.z = Math.sin(player.walkPhase) * 0.06;

          // Rotate to face movement direction or face aiming direction
          const targetAngle = Math.atan2(player.velocity.x, player.velocity.z);
          let diff = targetAngle - player.group.rotation.y;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          player.group.rotation.y += diff * 12 * delta;

          footstepTimer += delta;
          if (footstepTimer > 0.32) {
            sounds.playFootstep();
            footstepTimer = 0;
          }
        } else {
          player.group.position.y *= 0.88;
          player.group.rotation.z *= 0.88;
        }

        // Arm swing back to idle
        player.armR.rotation.x = THREE.MathUtils.lerp(player.armR.rotation.x, 0, delta * 6);

        // Update player light
        blueLight.position.set(player.group.position.x, 8, player.group.position.z);

        // --- 3. CHARGE & STAMINA MANAGEMENT ---
        if (isCharging) {
          chargeAmount = Math.min(1.0, chargeAmount + delta * 1.5);
        }
        onChargeChange(chargeAmount);

        if (!isDashing && stamina < 100) {
          stamina = Math.min(100, stamina + delta * 25);
        }
        onStaminaChange(stamina);

        if (playerInvulnerableTimer > 0) {
          playerInvulnerableTimer -= delta;
        }

        // --- 4. POWER-UPS & SHIELD LOGIC ---
        const nowSec = performance.now() / 1000;
        activePowerUps = activePowerUps.filter((p) => p.expiresAt > nowSec);
        onActivePowerUpsChange(activePowerUps);

        const hasShield = activePowerUps.some((p) => p.type === 'shield');
        if (player.shieldMesh) {
          (player.shieldMesh.material as THREE.MeshBasicMaterial).opacity = hasShield
            ? 0.5 + Math.sin(time * 8) * 0.2
            : 0;
          player.shieldMesh.rotation.y += delta * 2;
        }

        // Check powerup pickup collision
        for (let i = worldPowerUps.length - 1; i >= 0; i--) {
          const pw = worldPowerUps[i];
          pw.mesh.rotation.y += delta * 2.5;
          pw.mesh.position.y = 1.6 + Math.sin(time * 3 + i) * 0.35;

          if (pw.position.distanceTo(player.group.position) < 4.0) {
            sounds.playPowerup();
            statsRef.current.powerupsCollected++;

            if (pw.type === 'heal') {
              player.hp = Math.min(player.maxHp, player.hp + 35);
              onFloatingText({
                id: Math.random().toString(),
                text: '+35 HP',
                color: '#22c55e',
                x: player.group.position.x,
                y: player.group.position.y + 10,
                z: player.group.position.z,
                life: 1.2,
                maxLife: 1.2,
              });
            } else {
              activePowerUps.push({ type: pw.type, expiresAt: nowSec + 10 });
            }

            scene.remove(pw.mesh);
            worldPowerUps.splice(i, 1);
          }
        }

        // --- 5. ENEMY AI & COMBAT ---
        enemies.forEach((enemy) => {
          if (enemy.hp <= 0) return;

          const toPlayer = new THREE.Vector3().subVectors(player.group.position, enemy.group.position);
          const distToPlayer = toPlayer.length();
          toPlayer.y = 0;
          toPlayer.normalize();

          // Face player smoothly
          const targetAngle = Math.atan2(toPlayer.x, toPlayer.z);
          let diff = targetAngle - enemy.group.rotation.y;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          enemy.group.rotation.y += diff * 4 * delta;

          // AI Strafe / Stalking logic depending on difficulty
          let aiSpeed = enemy.speed;
          if (difficulty === 'easy') aiSpeed *= 0.65;
          if (difficulty === 'hard') aiSpeed *= 1.2;

          // Distance keeping (stay around 18-28 units)
          if (distToPlayer > 30) {
            enemy.group.position.x += toPlayer.x * aiSpeed * delta;
            enemy.group.position.z += toPlayer.z * aiSpeed * delta;
          } else if (distToPlayer < 14) {
            enemy.group.position.x -= toPlayer.x * aiSpeed * 0.7 * delta;
            enemy.group.position.z -= toPlayer.z * aiSpeed * 0.7 * delta;
          } else {
            // Lateral strafe
            const strafe = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x);
            const dir = Math.sin(time * 1.5) > 0 ? 1 : -1;
            enemy.group.position.x += strafe.x * aiSpeed * 0.6 * dir * delta;
            enemy.group.position.z += strafe.z * aiSpeed * 0.6 * dir * delta;
          }

          // Enemy Dodge reaction: if a blue snowball is coming close!
          enemy.dodgeCooldown -= delta;
          if (enemy.dodgeCooldown <= 0 && difficulty !== 'easy') {
            for (const sb of projectiles) {
              if (sb.owner === 'blue') {
                const distToBall = enemy.group.position.distanceTo(sb.mesh.position);
                if (distToBall < 12 && Math.random() < (difficulty === 'hard' ? 0.7 : 0.4)) {
                  // Leap sideways
                  const side = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x).normalize();
                  const sideDir = Math.random() < 0.5 ? 1 : -1;
                  enemy.group.position.add(side.multiplyScalar(sideDir * 6.5));
                  enemy.dodgeCooldown = 2.5;
                  spawnSnowBurst(enemy.group.position, 12);
                  break;
                }
              }
            }
          }

          // Bounds clamp
          enemy.group.position.x = Math.max(-ARENA_LIMIT, Math.min(ARENA_LIMIT, enemy.group.position.x));
          enemy.group.position.z = Math.max(-ARENA_LIMIT, Math.min(ARENA_LIMIT, enemy.group.position.z));

          // Bobbing walk animation
          enemy.walkPhase += delta * 6;
          enemy.group.position.y = Math.abs(Math.sin(enemy.walkPhase)) * 0.3;

          // Enemy Shooting with Predictive Aim
          enemy.lastShot += delta;
          let shootInterval = 2.4;
          if (difficulty === 'easy') shootInterval = 3.5;
          if (difficulty === 'hard') shootInterval = 1.7;
          if (enemy.isBoss) shootInterval = 1.4;

          if (enemy.lastShot > shootInterval && distToPlayer < 65) {
            enemy.lastShot = 0;

            // Prediction: lead the player based on velocity
            const leadMultiplier = difficulty === 'hard' ? 0.8 : (difficulty === 'normal' ? 0.4 : 0.0);
            const predictedPos = player.group.position.clone().add(
              player.velocity.clone().multiplyScalar(leadMultiplier)
            );
            predictedPos.y = 6.2;

            const enemyShootPos = enemy.group.position.clone().add(new THREE.Vector3(0, 7.5, 0));
            const enemyAimDir = new THREE.Vector3().subVectors(predictedPos, enemyShootPos).normalize();

            if (enemy.isBoss) {
              // Boss shoots 2 snowballs
              [-0.12, 0.12].forEach((offset) => {
                const dir = enemyAimDir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), offset);
                fireSnowball(enemyShootPos, dir, 'red', 58, true, 1.4);
              });
            } else {
              fireSnowball(enemyShootPos, enemyAimDir, 'red', 55, false);
            }
          }
        });

        // --- 6. PROJECTILE SIMULATION & DAMAGE COLLISION ---
        for (let i = projectiles.length - 1; i >= 0; i--) {
          const p = projectiles[i];
          p.mesh.position.add(p.velocity.clone().multiplyScalar(delta));
          p.velocity.y -= 9.8 * delta; // Realistic gravity
          p.life -= delta;

          spawnTrail(p.mesh.position, p.owner);

          let destroyed = false;

          // A. Collision with Destructible Snow Forts
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
                spawnSnowBurst(bPos, 40);
              } else {
                // Shrink / crack visual
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

          // B. Collision with Snowmen
          if (p.owner === 'blue') {
            // Check against all enemies
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

                // Check for HEADSHOT (y > 7.5)
                const isHeadshot = py > 7.5 * (enemy.isBoss ? 1.5 : 1.0);
                let finalDamage = p.damage;

                if (isHeadshot) {
                  finalDamage = Math.round(p.damage * 2.2);
                  statsRef.current.headshots++;
                  sounds.playImpact(true);

                  // Knock off hat!
                  if (!enemy.hatDetached) {
                    enemy.hatDetached = true;
                    // Detach hat and launch into air
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

                // Check enemy death
                if (enemy.hp <= 0) {
                  spawnSnowBurst(enemy.group.position, 60, true);
                  scene.remove(enemy.group);

                  if (gameMode === 'survival') {
                    statsRef.current.survivalKills++;
                    const alive = enemies.filter((e) => e.hp > 0).length;
                    onWaveChange(currentWave, alive);

                    if (alive === 0) {
                      // Next wave
                      currentWave++;
                      const spawnCount = 2 + currentWave;
                      for (let w = 0; w < spawnCount; w++) {
                        const isWaveBoss = w === 0 && currentWave % 3 === 0;
                        const ne = createDetailedSnowman(0xef4444, 0x7f1d1d, isWaveBoss);
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
                    // 1v1 Victory!
                    sounds.playVictory();
                    onGameOver('blue', statsRef.current);
                  }
                }
                break;
              }
            }
          } else if (p.owner === 'red') {
            // Check against Player
            const distXZ = Math.hypot(
              p.mesh.position.x - player.group.position.x,
              p.mesh.position.z - player.group.position.z
            );
            const py = p.mesh.position.y;

            if (distXZ < 3.8 && py > 0 && py < 12) {
              destroyed = true;

              if (playerInvulnerableTimer > 0) {
                // Dodged with Dash invulnerability frames!
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
                  // Shield absorbs hit
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
                  screenShake = 0.8;
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

          // Ground collision
          if (p.mesh.position.y < 0.2 || p.life <= 0) {
            destroyed = true;
            if (p.mesh.position.y < 0.5) spawnSnowBurst(p.mesh.position, 10);
          }

          if (destroyed) {
            scene.remove(p.mesh);
            projectiles.splice(i, 1);
          }
        }

        // --- 7. PARTICLES UPDATE ---
        for (let i = particles.length - 1; i >= 0; i--) {
          const pt = particles[i];
          pt.mesh.position.add(pt.velocity.clone().multiplyScalar(delta));
          pt.velocity.y -= pt.gravity * delta;
          pt.life -= delta;
          const scale = Math.max(0.01, pt.life / pt.maxLife);
          pt.mesh.scale.setScalar(scale);

          if (pt.life <= 0) {
            scene.remove(pt.mesh);
            particles.splice(i, 1);
          }
        }

        // --- 8. SNOWFALL UPDATE ---
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

        // --- 9. FLASH DAMAGE MATERIALS ---
        [player, ...enemies].forEach((ent) => {
          if (ent.flash > 0) {
            ent.flash = Math.max(0, ent.flash - delta * 3.5);
            const intensity = ent.flash * 0.9;
            (ent.bottom.material as THREE.MeshStandardMaterial).emissive.setRGB(intensity, 0.1, 0.1);
          } else {
            (ent.bottom.material as THREE.MeshStandardMaterial).emissive.setRGB(0, 0, 0);
          }
        });

        // Update UI HP
        const primaryEnemy = enemies[0];
        onHpChange(
          player.hp,
          primaryEnemy ? primaryEnemy.hp : 0,
          primaryEnemy?.isBoss ? primaryEnemy.hp : undefined,
          primaryEnemy?.isBoss ? primaryEnemy.maxHp : undefined
        );
      }

      // --- 10. CAMERA UPDATE & SCREEN SHAKE ---
      const camTarget = player.group.position.clone().add(new THREE.Vector3(0, 6.0, 0));
      const camX = camTarget.x + Math.sin(cameraControl.yaw) * Math.cos(cameraControl.pitch) * cameraControl.distance;
      const camY = camTarget.y + Math.sin(cameraControl.pitch) * cameraControl.distance;
      const camZ = camTarget.z + Math.cos(cameraControl.yaw) * Math.cos(cameraControl.pitch) * cameraControl.distance;

      camera.position.lerp(new THREE.Vector3(camX, camY, camZ), 0.18);

      if (screenShake > 0.01) {
        camera.position.x += (Math.random() - 0.5) * screenShake * 2.0;
        camera.position.y += (Math.random() - 0.5) * screenShake * 2.0;
        screenShake *= 0.88;
      }
      camera.lookAt(camTarget);

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

  return <div ref={containerRef} className="w-full h-full relative cursor-grab active:cursor-grabbing" />;
};
