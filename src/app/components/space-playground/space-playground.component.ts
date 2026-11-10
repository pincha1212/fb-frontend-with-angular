import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  signal,
  ChangeDetectionStrategy,
  HostListener,
  Output,
  EventEmitter
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SobreMiComponent } from '../sobre-mi/sobre-mi.component';
import { HabilidadesComponent } from '../habilidades/habilidades.component';
import { ProyectosComponent } from '../proyectos/proyectos.component';
import { ExperienciaComponent } from '../experiencia/experiencia.component';
import { ContactoComponent } from '../contacto/contacto.component';
import { CockpitHUDComponent } from '../cockpit-hud/cockpit-hud.component';

export interface StationData {
  id: string;
  sectionId: string;
  name: string;
  subtitle: string;
  icon: string;
  position: { x: number; y: number; z: number };
  color: number;
  glowHex: string;
  description: string;
  tags: string[];
  ctaLabel: string;
}

export interface StationWaypoint {
  id: string;
  station: StationData;
  name: string;
  icon: string;
  color: string;
  distanceKm: number;
  screenX: number;
  screenY: number;
  isOnScreen: boolean;
  arrowAngleDeg: number;
  isDocked: boolean;
}

interface AlienFighter {
  group: THREE.Group;
  velocity: THREE.Vector3;
  phase: number;
  orbitRadius: number;
  fireCooldown: number;
  integrity: number;
}

interface CombatBolt {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  remaining: number;
  side: 'player' | 'hostile';
}

@Component({
  selector: 'app-space-playground',
  standalone: true,
  imports: [
    CommonModule,
    CockpitHUDComponent,
    SobreMiComponent,
    HabilidadesComponent,
    ProyectosComponent,
    ExperienciaComponent,
    ContactoComponent
  ],
  templateUrl: './space-playground.component.html',
  styleUrls: ['./space-playground.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpacePlaygroundComponent implements OnInit, OnDestroy {
  @ViewChild('canvasContainer', { static: true })
  canvasContainerRef!: ElementRef<HTMLDivElement>;

  @Output() navigateToSection = new EventEmitter<string>();
  @Output() closePlayground = new EventEmitter<void>();

  // Reactive UI signals
  speedKms = signal(0);
  headingDegrees = signal(0);
  pitchDegrees = signal(0);
  hullIntegrity = signal(100);
  activeHostiles = signal(0);
  combatMessage = signal('');
  turboActive = signal(false);
  dockedStation = signal<StationData | null>(null);
  cameraMode = signal<'chase' | 'cockpit' | 'top' | 'cinematic'>('chase');
  soundEnabled = signal(false);
  isDockCollapsed = signal(false);
  isHelpOpen = signal(false);
  isMobileDevice = signal(false);
  hasMouseControl = signal(false);
  activeStationModal = signal<string | null>(null);
  isTransiting = signal(false);
  destinationName = signal('');
  isCinema = signal(false);
  isPointerLocked = signal(false);
  customGlbLoaded = signal(false);
  customGlbName = signal('');
  radarBlips = signal<any[]>([]);
  invertY = signal(false);
  stationWaypoints = signal<StationWaypoint[]>([]);
  showWaypoints = signal(true);
  gameMode = signal<'free' | 'combat'>('free');
  enemiesDestroyed = signal(0);

  toggleWaypoints(): void {
    this.showWaypoints.update(v => !v);
  }

  toggleGameMode(): void {
    if (this.gameMode() === 'free') {
      this.gameMode.set('combat');
      this.showWaypoints.set(false); // Las balizas desaparecen en modo juego
      this.hullIntegrity.set(100);
      this.clearAlienFighters();
      this.spawnCombatEnemies(3);
      this.setCombatMessage('🎮 MODO COMBATE ACTIVADO · NAVE INMORTAL · ENEMIGOS ATACANDO', 4000);
      this.playChime([523, 659, 784, 1046]);
    } else {
      this.gameMode.set('free');
      this.showWaypoints.set(true); // Las balizas reaparecen en modo libre
      this.clearAlienFighters();
      this.setCombatMessage('🕊️ MODO NAVEGACIÓN LIBRE ACTIVADO', 3000);
      this.playChime([659, 523]);
    }
  }

  private clearAlienFighters(): void {
    for (const fighter of this.alienFighters) {
      this.scene.remove(fighter.group);
      fighter.group.traverse(object => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach(material => material.dispose());
      });
    }
    this.alienFighters = [];
    this.activeHostiles.set(0);
  }

  private spawnCombatEnemies(count: number): void {
    for (let index = 0; index < count; index++) {
      const phase = Math.random() * Math.PI * 2;
      const ship = this.buildAlienFighter();
      const orbitRadius = 25 + Math.random() * 15;
      ship.position.set(
        this.shipPosition.x + Math.cos(phase) * orbitRadius,
        this.shipPosition.y + (Math.random() - 0.5) * 10,
        this.shipPosition.z + Math.sin(phase) * orbitRadius
      );
      ship.lookAt(this.shipPosition);
      this.scene.add(ship);
      this.alienFighters.push({
        group: ship,
        velocity: new THREE.Vector3(),
        phase,
        orbitRadius,
        fireCooldown: 0.8 + Math.random() * 1.2,
        integrity: 3
      });
    }
    this.activeHostiles.set(this.alienFighters.length);
  }

  // Station definitions across deep space sectors
  readonly stations: StationData[] = [
    {
      id: 'st-sobre-mi',
      sectionId: 'sobre-mi',
      name: 'Perfil',
      subtitle: 'Mendoza · Formación en Geotecnologías',
      icon: '01',
      position: { x: -85, y: 18, z: -70 },
      color: 0xd0aa73,
      glowHex: '#d0aa73',
      description: 'Desarrollo front-end, proyectos interactivos y formación en Geotecnologías en la Universidad Nacional de Cuyo.',
      tags: ['UNCuyo', 'Frontend', 'Interactividad', 'Mendoza'],
      ctaLabel: 'Abrir Perfil Completo'
    },
    {
      id: 'st-habilidades',
      sectionId: 'habilidades',
      name: 'Tecnologías',
      subtitle: 'Interfaces web · Datos geográficos',
      icon: '02',
      position: { x: 90, y: -22, z: -65 },
      color: 0x91ab93,
      glowHex: '#91ab93',
      description: 'Herramientas para construir interfaces web, mapas interactivos y visualizaciones geográficas.',
      tags: ['Canvas 2D', 'Angular', 'TypeScript', 'QGIS SIG'],
      ctaLabel: 'Ver Matriz de Habilidades'
    },
    {
      id: 'st-proyectos',
      sectionId: 'proyectos',
      name: 'Proyectos',
      subtitle: 'Aplicaciones y experimentos personales',
      icon: '03',
      position: { x: 0, y: 25, z: -150 },
      color: 0x98aeb1,
      glowHex: '#98aeb1',
      description: 'Aplicaciones web, cartografía y experimentos interactivos desarrollados a lo largo de mi formación.',
      tags: ['Geovisor SIG', 'Cartografía web', 'CineApp', '5 proyectos'],
      ctaLabel: 'Explorar Proyectos'
    },
    {
      id: 'st-experiencia',
      sectionId: 'experiencia',
      name: 'Trayectoria',
      subtitle: 'Formación y trabajo colaborativo',
      icon: '04',
      position: { x: -95, y: -35, z: 80 },
      color: 0xc58c67,
      glowHex: '#c58c67',
      description: 'Experiencia práctica en equipos, desarrollo colaborativo y formación académica.',
      tags: ['NoCountry', 'Agile / Scrum', 'Teamwork', 'UNCuyo'],
      ctaLabel: 'Ver Trayectoria'
    },
    {
      id: 'st-contacto',
      sectionId: 'contacto',
      name: 'Contacto',
      subtitle: 'Correo, GitHub y LinkedIn',
      icon: '05',
      position: { x: 95, y: 22, z: 85 },
      color: 0xd0aa73,
      glowHex: '#d0aa73',
      description: 'Canales directos para conversar sobre proyectos, desarrollo web o geotecnologías.',
      tags: ['fedebarzola7@gmail.com', 'Mendoza', 'LinkedIn', 'GitHub'],
      ctaLabel: 'Enviar Mensaje'
    }
  ];

  // Three.js internal state
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private lastTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  private elapsedTime = 0;
  private animFrameId: number = 0;
  private isDestroyed = false;
  private isSoftwareGl = false;

  // Spacecraft state
  private shipGroup = new THREE.Group();
  private shipThrusterLeft!: THREE.Mesh;
  private shipThrusterRight!: THREE.Mesh;
  private shipPropulsionRing?: THREE.Mesh;
  private shipBioCoreMat?: THREE.MeshStandardMaterial;
  private alienMonoliths: THREE.Group[] = [];
  private shipPosition = new THREE.Vector3(0, 0, 10);
  private shipVelocity = new THREE.Vector3(0, 0, 0);
  private shipRotationY = Math.PI; // Face forward
  private shipRoll = 0;
  private shipPitch = 0;
  private shipYawRate = 0;
  private shipPitchRate = 0;
  private shipSpeed = 0;
  private maxNormalSpeed = 20.0;
  private maxTurboSpeed = 36.0;
  private acceleration = 18.0;
  private brakingForce = 24.0;
  private coastDrag = 0.72;
  private turnSpeed = 1.12;
  private pitchSpeed = 0.72;
  private isBoosting = false;

  // Engine audio synthesis
  private audioCtx: AudioContext | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;

  // Input states
  private keysPressed: Record<string, boolean> = {};
  private touchState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    pitchUp: false,
    pitchDown: false,
    boost: false,
    fire: false
  };

  // Interactive scene entities
  private stationMeshes: {
    group: THREE.Group;
    data: StationData;
    beacon: THREE.Mesh;
    satelliteRig: THREE.Group;
    haloRing?: THREE.Mesh;
    beaconBeam?: THREE.Mesh;
  }[] = [];
  private thrusterParticles: { pos: THREE.Vector3; vel: THREE.Vector3; life: number; maxLife: number }[] = [];
  private thrusterParticlesGeometry!: THREE.BufferGeometry;
  private thrusterParticlesMesh!: THREE.Points;
  private alienFighters: AlienFighter[] = [];
  private combatBolts: CombatBolt[] = [];
  private encounteredStationIds = new Set<string>();
  private combatCooldown = 0;
  private hullRegenCooldown = 0;
  private combatMessageTimeout: ReturnType<typeof setTimeout> | null = null;

  // Reusable math objects (Zero GC in tick)
  private readonly _vecA = new THREE.Vector3();
  private readonly _vecB = new THREE.Vector3();
  private readonly _camTarget = new THREE.Vector3();

  ngOnInit(): void {
    this.checkMobile();
    this.initThree();
    this.buildSpaceScene();
    this.setupEvents();
    this.startLoop();
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    if (this.combatMessageTimeout) clearTimeout(this.combatMessageTimeout);
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.stopAudio();
    this.disposeThree();
  }

  private checkMobile(): void {
    if (typeof window !== 'undefined') {
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      this.isMobileDevice.set(isTouch || window.innerWidth < 800);
      this.hasMouseControl.set(
        typeof window.matchMedia === 'function' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
      );
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    if (!this.canvasContainerRef || !this.renderer || !this.camera) return;
    const width = this.canvasContainerRef.nativeElement.clientWidth || window.innerWidth;
    const height = this.canvasContainerRef.nativeElement.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.checkMobile();
  }

  @HostListener('window:app-theme-changed', ['$event'])
  onThemeChanged(event: Event): void {
    const customEvent = event as CustomEvent<{ theme: string }>;
    const isLight = customEvent.detail?.theme === 'light';
    if (this.scene) {
      const bgColor = isLight ? 0x0f172a : 0x050711;
      this.scene.background = new THREE.Color(bgColor);
      if (this.scene.fog) {
        this.scene.fog.color.setHex(bgColor);
      }
    }
  }

  // ==========================================
  // Three.js Initialization & Scene Setup
  // ==========================================
  private initThree(): void {
    const container = this.canvasContainerRef.nativeElement;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Detect software WebGL as per Three.js skill
    this.isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(width, height);

    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050711);
    this.scene.fog = new THREE.FogExp2(0x050711, 0.0015);

    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 400);
    this.camera.position.set(0, 15, 25);

  }

  // ==========================================
  // Scene Construction (Procedural & Zero 404s)
  // ==========================================
  private buildSpaceScene(): void {
    // 1. Balanced Lighting Rig
    const ambientLight = new THREE.AmbientLight(0x788995, 0.58);
    this.scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x9eb4c5, 0x171920, 0.62);
    this.scene.add(hemiLight);

    const keySun = new THREE.DirectionalLight(0xfff2de, 2.0);
    keySun.position.set(-110, 90, -280);
    if (!this.isSoftwareGl) {
      keySun.castShadow = true;
      keySun.shadow.mapSize.width = 2048;
      keySun.shadow.mapSize.height = 2048;
      keySun.shadow.camera.near = 10;
      keySun.shadow.camera.far = 160;
      keySun.shadow.camera.left = -60;
      keySun.shadow.camera.right = 60;
      keySun.shadow.camera.top = 60;
      keySun.shadow.camera.bottom = -60;
      keySun.shadow.bias = -0.0005;
      keySun.shadow.normalBias = 0.02;
    }
    this.scene.add(keySun);

    const rimLight = new THREE.DirectionalLight(0x8398ad, 0.48);
    rimLight.position.set(-50, 20, -50);
    this.scene.add(rimLight);

    // 2. Deep Space Starfield & Cosmic Dust
    this.buildStarfield();

    // 3. A distant field of irregular bodies gives the flight a real sense of scale.
    this.buildAsteroids();

    // 4. Distant planets establish a place beyond a flat arena.
    this.buildCelestialBodies();

    // 5. Five autonomous orbital stations.
    this.buildStationOutposts();

    // 6. Survey craft.
    this.buildSpaceship();

    // 7. Low intensity engine exhaust.
    this.buildThrusterParticles();

    // 8. Ancient Alien Monoliths floating in deep orbit
    this.buildAlienMonoliths();
  }

  private buildStarfield(): void {
    const starCount = 1400;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const idx = i * 3;
      // Distribute on sphere shell
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 180 + Math.random() * 80;

      starPositions[idx] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[idx + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[idx + 2] = r * Math.cos(phi);

      // Mostly neutral stars with occasional cool or warm points.
      const colorType = Math.random();
      if (colorType > 0.94) {
        starColors[idx] = 0.72;
        starColors[idx + 1] = 0.84;
        starColors[idx + 2] = 1.0;
      } else if (colorType > 0.87) {
        starColors[idx] = 1.0;
        starColors[idx + 1] = 0.86;
        starColors[idx + 2] = 0.68;
      } else {
        starColors[idx] = 0.94;
        starColors[idx + 1] = 0.96;
        starColors[idx + 2] = 1.0;
      }
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 1.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.85
    });

    const starPoints = new THREE.Points(starGeo, starMat);
    this.scene.add(starPoints);
  }

  private buildAsteroids(): void {
    const asteroidCount = 16;
    const asteroidMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.9,
      metalness: 0.1,
      flatShading: false
    });

    for (let i = 0; i < asteroidCount; i++) {
      const angle = (i / asteroidCount) * Math.PI * 2;
      const dist = 75 + Math.random() * 30;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const y = (Math.random() - 0.5) * 25;

      const scale = 2 + Math.random() * 5;
      const geo = new THREE.IcosahedronGeometry(scale, 2);

      // Slight deformation for natural rocky look
      const pos = geo.attributes['position'];
      for (let j = 0; j < pos.count; j++) {
        const vx = pos.getX(j) * (0.85 + Math.random() * 0.3);
        const vy = pos.getY(j) * (0.85 + Math.random() * 0.3);
        const vz = pos.getZ(j) * (0.85 + Math.random() * 0.3);
        pos.setXYZ(j, vx, vy, vz);
      }
      geo.computeVertexNormals();

      const mesh = new THREE.Mesh(geo, asteroidMat);
      mesh.position.set(x, y, z);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      mesh.castShadow = !this.isSoftwareGl;
      mesh.receiveShadow = !this.isSoftwareGl;
      this.scene.add(mesh);
    }
  }

  private buildAlienMonoliths(): void {
    const monolithMat = new THREE.MeshStandardMaterial({
      color: 0x061217,
      roughness: 0.16,
      metalness: 0.94,
      emissive: 0x021d22,
      emissiveIntensity: 0.45
    });
    const runeMat = new THREE.MeshStandardMaterial({
      color: 0x00f5d4,
      emissive: 0x00f5d4,
      emissiveIntensity: 1.6,
      roughness: 0.1
    });

    const positions = [
      { x: -65, y: 32, z: -110, s: 2.2 },
      { x: 80, y: -26, z: -80, s: 2.6 },
      { x: -110, y: -16, z: 45, s: 3.0 },
      { x: 65, y: 36, z: 65, s: 2.4 }
    ];

    positions.forEach(p => {
      const group = new THREE.Group();
      group.position.set(p.x, p.y, p.z);

      const obelisk = new THREE.Mesh(new THREE.BoxGeometry(1.4 * p.s, 8.4 * p.s, 1.4 * p.s), monolithMat);
      obelisk.castShadow = !this.isSoftwareGl;
      group.add(obelisk);

      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2 * p.s, 0.08 * p.s, 8, 28), runeMat);
      ring.rotation.x = Math.PI / 3;
      group.add(ring);

      const runeSlot = new THREE.Mesh(new THREE.BoxGeometry(0.18 * p.s, 6.0 * p.s, 1.5 * p.s), runeMat);
      group.add(runeSlot);

      this.scene.add(group);
      this.alienMonoliths.push(group);
    });
  }

  private buildCelestialBodies(): void {
    const gasBandCanvas = document.createElement('canvas');
    gasBandCanvas.width = 1024;
    gasBandCanvas.height = 512;
    const context = gasBandCanvas.getContext('2d');
    if (context) {
      const bands = ['#6b695e', '#7b7668', '#878171', '#545a56', '#a0947b', '#555d5e', '#756e61'];
      bands.forEach((color, index) => {
        const y = index * 74;
        context.fillStyle = color;
        context.fillRect(0, y, gasBandCanvas.width, 74);
        context.fillStyle = 'rgba(220, 207, 176, 0.08)';
        context.beginPath();
        context.moveTo(0, y + 10);
        context.bezierCurveTo(260, y + 38, 650, y - 4, 1024, y + 23);
        context.lineTo(1024, y + 37);
        context.bezierCurveTo(660, y + 9, 350, y + 52, 0, y + 26);
        context.closePath();
        context.fill();
      });
      const gasTexture = new THREE.CanvasTexture(gasBandCanvas);
      gasTexture.colorSpace = THREE.SRGBColorSpace;
      const planet = new THREE.Mesh(
        new THREE.SphereGeometry(64, 64, 48),
        new THREE.MeshStandardMaterial({ map: gasTexture, roughness: 0.94, metalness: 0.02 })
      );
      planet.position.set(90, -20, -245);
      planet.rotation.z = 0.16;
      this.scene.add(planet);

      const atmosphere = new THREE.Mesh(
        new THREE.SphereGeometry(65.8, 48, 36),
        new THREE.MeshBasicMaterial({ color: 0x869d9a, transparent: true, opacity: 0.08, side: THREE.BackSide, depthWrite: false })
      );
      atmosphere.position.copy(planet.position);
      this.scene.add(atmosphere);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(88, 4.4, 4, 160),
        new THREE.MeshStandardMaterial({ color: 0x898171, roughness: 0.9, metalness: 0.08, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
      );
      ring.position.copy(planet.position);
      ring.rotation.set(0.42, 0.12, -0.24);
      this.scene.add(ring);
    }

    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(13, 32, 24),
      new THREE.MeshStandardMaterial({ color: 0x817f76, roughness: 0.97, metalness: 0.01, flatShading: true })
    );
    moon.position.set(-130, 55, -155);
    moon.rotation.set(0.2, 0.7, -0.1);
    this.scene.add(moon);

    const distantStar = new THREE.Mesh(
      new THREE.SphereGeometry(7, 24, 18),
      new THREE.MeshBasicMaterial({ color: 0xf2e5ca })
    );
    distantStar.position.set(-110, 90, -280);
    this.scene.add(distantStar);

    const stellarHalo = new THREE.Mesh(
      new THREE.SphereGeometry(11, 24, 18),
      new THREE.MeshBasicMaterial({ color: 0xd2d1c4, transparent: true, opacity: 0.08, side: THREE.BackSide, depthWrite: false })
    );
    stellarHalo.position.copy(distantStar.position);
    this.scene.add(stellarHalo);
  }

  private buildStationOutposts(): void {
    this.stations.forEach(st => {
      const group = new THREE.Group();
      group.position.set(st.position.x, st.position.y, st.position.z);

      // Compact orbital platform: habitat, service truss, radiator wings and antenna.
      const satelliteRig = new THREE.Group();
      const hullMat = new THREE.MeshStandardMaterial({ color: 0x586661, roughness: 0.62, metalness: 0.72 });
      const edgeMat = new THREE.MeshStandardMaterial({ color: 0x89928a, roughness: 0.42, metalness: 0.78 });
      const panelMat = new THREE.MeshStandardMaterial({ color: 0x243b46, roughness: 0.48, metalness: 0.58 });
      const cellMat = new THREE.MeshStandardMaterial({ color: 0x395767, roughness: 0.4, metalness: 0.52 });
      const accentMat = new THREE.MeshStandardMaterial({ color: st.color, emissive: st.color, emissiveIntensity: 0.13, roughness: 0.4, metalness: 0.52 });

      const truss = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 15.5, 8), edgeMat);
      truss.rotation.z = Math.PI / 2;
      truss.position.set(0, 4.65, 0);
      satelliteRig.add(truss);

      const habitat = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.22, 4.7, 12), hullMat);
      habitat.rotation.x = Math.PI / 2;
      habitat.position.set(0, 5.15, 0);
      habitat.castShadow = !this.isSoftwareGl;
      satelliteRig.add(habitat);

      const nosePort = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.76, 0.38, 12), edgeMat);
      nosePort.rotation.x = Math.PI / 2;
      nosePort.position.set(0, 5.15, 2.48);
      satelliteRig.add(nosePort);

      const aftPort = nosePort.clone();
      aftPort.position.z = -2.48;
      satelliteRig.add(aftPort);

      const centerBand = new THREE.Mesh(new THREE.TorusGeometry(1.13, 0.09, 6, 18), accentMat);
      centerBand.rotation.x = Math.PI / 2;
      centerBand.position.set(0, 5.15, 0);
      satelliteRig.add(centerBand);

      const panelFrameGeo = new THREE.BoxGeometry(4.3, 0.12, 2.75);
      const panelCellGeo = new THREE.BoxGeometry(1.03, 0.055, 2.62);
      for (const side of [-1, 1]) {
        const wingRoot = new THREE.Group();
        wingRoot.position.set(side * 5.55, 4.65, 0);
        const frame = new THREE.Mesh(panelFrameGeo, edgeMat);
        wingRoot.add(frame);
        for (let cell = 0; cell < 4; cell++) {
          const panel = new THREE.Mesh(panelCellGeo, cell % 2 === 0 ? panelMat : cellMat);
          panel.position.x = (cell - 1.5) * 1.07;
          panel.position.y = 0.09;
          wingRoot.add(panel);
        }
        satelliteRig.add(wingRoot);
        const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 3.9, 6), edgeMat);
        brace.rotation.z = side < 0 ? -0.28 : 0.28;
        brace.position.set(side * 3.4, 4.68, 0);
        satelliteRig.add(brace);
      }

      const dishMast = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 1.7, 8), edgeMat);
      dishMast.position.set(0, 7.2, -1.4);
      satelliteRig.add(dishMast);
      const dish = new THREE.Mesh(new THREE.SphereGeometry(0.82, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), hullMat);
      dish.position.set(0, 8.05, -1.4);
      dish.rotation.x = Math.PI / 2.8;
      satelliteRig.add(dish);

      const beaconGeo = new THREE.SphereGeometry(0.22, 10, 8);
      const beaconMat = new THREE.MeshBasicMaterial({ color: st.color });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.set(0, 7.15, 1.65);
      satelliteRig.add(beacon);

      // Two small relay satellites circle the main habitat on a quiet orbit.
      const relayGeo = new THREE.BoxGeometry(0.72, 0.62, 1.1);
      const relayMat = new THREE.MeshStandardMaterial({ color: 0x77827b, roughness: 0.52, metalness: 0.68 });
      for (const side of [-1, 1]) {
        const relay = new THREE.Group();
        relay.position.set(side * 10.7, 6.3, side * 3.5);
        const relayBody = new THREE.Mesh(relayGeo, relayMat);
        relay.add(relayBody);
        const relayPanel = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.82), panelMat);
        relayPanel.position.x = side * 1.45;
        relay.add(relayPanel);
        const relayLink = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.3, 5), edgeMat);
        relayLink.rotation.z = Math.PI / 2;
        relayLink.position.x = side * 0.9;
        relay.add(relayLink);
        satelliteRig.add(relay);
      }
      group.add(satelliteRig);

      // A small instrument style call sign follows the station in open space.
      const labelCanvas = document.createElement('canvas');
      labelCanvas.width = 512;
      labelCanvas.height = 112;
      const lctx = labelCanvas.getContext('2d')!;
      lctx.fillStyle = 'rgba(7, 14, 18, 0.78)';
      lctx.fillRect(0, 15, labelCanvas.width, 82);
      lctx.fillStyle = '#b9c7c0';
      lctx.font = '600 20px monospace';
      lctx.textAlign = 'left';
      lctx.fillText(`ORBITAL ${st.icon}  /  ${st.name.toUpperCase()}`, 20, 50);
      lctx.fillStyle = '#a9b9b0';
      lctx.font = '16px monospace';
      lctx.fillText(`ALT ${st.position.y > 0 ? '+' : ''}${st.position.y}.0 KM`, 20, 76);

      const labelTex = new THREE.CanvasTexture(labelCanvas);
      labelTex.colorSpace = THREE.SRGBColorSpace;
      const labelMat = new THREE.SpriteMaterial({ map: labelTex, transparent: true, depthWrite: false });
      const labelSprite = new THREE.Sprite(labelMat);
      labelSprite.scale.set(14, 3.1, 1);
      labelSprite.position.set(0, 12.2, 0);
      group.add(labelSprite);

      // 3D Luminous Ion Light Beam projecting through the station into space
      const beamGeo = new THREE.CylinderGeometry(0.35, 0.7, 160, 8);
      const beamMat = new THREE.MeshBasicMaterial({
        color: st.color,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      const beaconBeam = new THREE.Mesh(beamGeo, beamMat);
      beaconBeam.position.set(0, 0, 0);
      group.add(beaconBeam);

      // Large Pulsing Holographic Beacon Ring around the station
      const haloRingGeo = new THREE.TorusGeometry(15, 0.22, 8, 48);
      const haloRingMat = new THREE.MeshBasicMaterial({
        color: st.color,
        transparent: true,
        opacity: 0.45,
        depthWrite: false
      });
      const haloRing = new THREE.Mesh(haloRingGeo, haloRingMat);
      haloRing.rotation.x = Math.PI / 2;
      group.add(haloRing);

      this.scene.add(group);
      this.stationMeshes.push({ group, data: st, beacon, satelliteRig, haloRing, beaconBeam });
    });
  }

  // ==========================================
  // Procedural 3D Alien Spaceship Model (Biomechanical Chitin Vessel)
  // ==========================================
  private buildSpaceship(): void {
    this.shipGroup = new THREE.Group();
    this.shipGroup.position.copy(this.shipPosition);

    // Exotic Biomechanical Materials
    const alienChitinMat = new THREE.MeshStandardMaterial({
      color: 0x07151a,
      roughness: 0.22,
      metalness: 0.92,
      emissive: 0x02161c,
      emissiveIntensity: 0.45
    });
    const alienPlatingMat = new THREE.MeshStandardMaterial({
      color: 0x112d34,
      roughness: 0.35,
      metalness: 0.82
    });
    const alienGlowMat = new THREE.MeshStandardMaterial({
      color: 0x00f5d4,
      emissive: 0x00f5d4,
      emissiveIntensity: 1.25,
      roughness: 0.15,
      metalness: 0.2
    });
    const alienCoreMat = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      emissive: 0x7c3aed,
      emissiveIntensity: 1.45,
      roughness: 0.1,
      metalness: 0.3
    });
    this.shipBioCoreMat = alienCoreMat;

    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 1.6,
      roughness: 0.1
    });

    // 1. Central Aerodynamic Bio-Thorax (Sculpted organic fusiform body)
    const thoraxGeo = new THREE.SphereGeometry(1.25, 24, 18);
    const thorax = new THREE.Mesh(thoraxGeo, alienChitinMat);
    thorax.scale.set(1.45, 0.58, 2.7);
    thorax.position.set(0, 0, 0.4);
    thorax.castShadow = !this.isSoftwareGl;
    thorax.receiveShadow = !this.isSoftwareGl;
    this.shipGroup.add(thorax);

    // 2. Cephalic Mandible / Predatory Nose
    const noseGeo = new THREE.ConeGeometry(0.82, 3.8, 16);
    const nose = new THREE.Mesh(noseGeo, alienPlatingMat);
    nose.rotation.x = Math.PI / 2;
    nose.scale.set(1.15, 1, 0.4);
    nose.position.set(0, 0.08, 3.9);
    nose.castShadow = !this.isSoftwareGl;
    this.shipGroup.add(nose);

    // 3. Segmented Dorsal Bio-Crest (Vertebral fins with glowing fissures)
    for (let i = 0; i < 5; i++) {
      const zPos = 2.4 - i * 0.95;
      const finHeight = 0.55 + Math.sin(i * 0.6) * 0.35;
      const fin = new THREE.Mesh(new THREE.ConeGeometry(0.18, finHeight, 6), alienPlatingMat);
      fin.rotation.x = -0.32;
      fin.position.set(0, 0.45 + finHeight * 0.45, zPos);
      this.shipGroup.add(fin);

      // Bioluminescent seam along the spine
      const glowNode = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), alienGlowMat);
      glowNode.position.set(0, 0.42, zPos);
      this.shipGroup.add(glowNode);
    }

    // 4. Exposed Bio-Plasma Core (Visible in central cavity)
    const coreMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 2), alienCoreMat);
    coreMesh.position.set(0, 0.28, -0.2);
    this.shipGroup.add(coreMesh);

    // Rib-like skeletal cages enclosing the core
    for (let r = 0; r < 4; r++) {
      const ribZ = 0.4 - r * 0.45;
      const rib = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.06, 6, 16, Math.PI), alienChitinMat);
      rib.rotation.x = Math.PI / 2;
      rib.position.set(0, 0.22, ribZ);
      this.shipGroup.add(rib);
    }

    // 5. Forward-Swept Alien Scythe Wings (Predatory curved mantis blades)
    for (const side of [-1, 1]) {
      // Main wing blade
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 0);
      wingShape.lineTo(side * 2.8, -0.6);
      wingShape.lineTo(side * 5.4, -0.2);
      wingShape.lineTo(side * 6.2, 1.8);  // Hooks forward
      wingShape.lineTo(side * 5.8, 2.6);  // Scythe tip
      wingShape.lineTo(side * 4.6, 1.1);
      wingShape.lineTo(side * 2.2, 0.8);
      wingShape.closePath();

      const extrudeSettings = { depth: 0.12, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.04, bevelThickness: 0.04 };
      const wingGeo = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);
      const wingMesh = new THREE.Mesh(wingGeo, alienChitinMat);
      wingMesh.rotation.x = Math.PI / 2;
      wingMesh.scale.x = 1;
      wingMesh.position.set(0, -0.06, 0.2);
      wingMesh.castShadow = !this.isSoftwareGl;
      this.shipGroup.add(wingMesh);

      // Bioluminescent plasma vein along wing leading edge
      const veinGeo = new THREE.CylinderGeometry(0.04, 0.04, 5.6, 6);
      const vein = new THREE.Mesh(veinGeo, alienGlowMat);
      vein.rotation.z = side * 0.72;
      vein.rotation.x = 0.25;
      vein.position.set(side * 3.4, 0.02, 1.1);
      this.shipGroup.add(vein);

      // Ventral fin stabilizer
      const ventralFin = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.4, 6), alienPlatingMat);
      ventralFin.rotation.x = 0.45;
      ventralFin.rotation.z = -side * 0.35;
      ventralFin.position.set(side * 1.6, -0.52, -1.2);
      this.shipGroup.add(ventralFin);

      // Alien eye cluster nodes on forward head
      const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), eyeMat);
      eye1.position.set(side * 0.38, 0.26, 3.1);
      this.shipGroup.add(eye1);

      const eye2 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), eyeMat);
      eye2.position.set(side * 0.55, 0.18, 2.5);
      this.shipGroup.add(eye2);

      const eye3 = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), eyeMat);
      eye3.position.set(side * 0.24, 0.34, 3.6);
      this.shipGroup.add(eye3);

      // Biomechanical engine nacelle
      const engineNacelle = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.48, 2.2, 12), alienPlatingMat);
      engineNacelle.rotation.x = Math.PI / 2;
      engineNacelle.position.set(side * 1.25, -0.08, -2.8);
      this.shipGroup.add(engineNacelle);

      // Radiant Alien Plasma Flame Exhaust
      const exhaust = new THREE.Mesh(
        new THREE.ConeGeometry(0.32, 1.2, 12),
        new THREE.MeshBasicMaterial({ color: 0x00ffc8, transparent: true, opacity: 0.9 })
      );
      exhaust.rotation.x = -Math.PI / 2;
      exhaust.position.set(side * 1.25, -0.08, -4.1);
      if (side < 0) this.shipThrusterLeft = exhaust;
      else this.shipThrusterRight = exhaust;
      this.shipGroup.add(exhaust);
    }

    // 6. Floating Graviton Anti-Gravity Propulsion Ring
    const gravitonRingGeo = new THREE.TorusGeometry(1.68, 0.085, 12, 36);
    this.shipPropulsionRing = new THREE.Mesh(gravitonRingGeo, alienGlowMat);
    this.shipPropulsionRing.position.set(0, -0.02, -2.4);
    this.shipGroup.add(this.shipPropulsionRing);

    this.scene.add(this.shipGroup);

    if (typeof localStorage !== 'undefined') {
      const cachedGlb = localStorage.getItem('cached_transformer_glb');
      const cachedName = localStorage.getItem('cached_transformer_name');
      if (cachedGlb) {
        this.loadGlbFromUrl(cachedGlb, cachedName || 'Transformador .GLB');
      }
    }
  }
  private buildAlienFighter(): THREE.Group {
    const ship = new THREE.Group();

    // Human Space Shuttle Materials
    const whiteHullMat = new THREE.MeshStandardMaterial({ color: 0xebf1f5, roughness: 0.3, metalness: 0.5 });
    const blackTileMat = new THREE.MeshStandardMaterial({ color: 0x1a232e, roughness: 0.8, metalness: 0.2 });
    const glassCanopyMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.3, roughness: 0.1, transparent: true, opacity: 0.85 });
    const rocketEngineMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.4, metalness: 0.8 });
    const rocketFlameMat = new THREE.MeshBasicMaterial({ color: 0xff9900 });

    // 1. Fuselage Body (Aerodynamic Human Shuttle Nose & Cargo Hull)
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.95, 3.8, 14), whiteHullMat);
    body.rotation.x = Math.PI / 2;
    body.position.set(0, 0, 0);
    ship.add(body);

    // Black Thermal Shield Belly Coating
    const belly = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.96, 3.82, 14, 1, false, Math.PI * 0.8, Math.PI * 1.4), blackTileMat);
    belly.rotation.x = Math.PI / 2;
    belly.position.set(0, -0.02, 0);
    ship.add(belly);

    // Aerodynamic Nose Cone
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.4, 14), blackTileMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 0, 2.5);
    ship.add(nose);

    // Flight Deck Cockpit Windows
    const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.68, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2.2), glassCanopyMat);
    cockpit.position.set(0, 0.22, 1.4);
    cockpit.scale.set(0.9, 0.6, 1.2);
    ship.add(cockpit);

    // 2. Human Delta Wings
    for (const side of [-1, 1]) {
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 1.2);
      wingShape.lineTo(side * 2.8, -1.2);
      wingShape.lineTo(side * 2.6, -1.8);
      wingShape.lineTo(0, -1.5);
      wingShape.closePath();

      const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.1, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02 });
      const wing = new THREE.Mesh(wingGeo, whiteHullMat);
      wing.rotation.x = Math.PI / 2;
      wing.position.set(0, -0.1, 0.2);
      ship.add(wing);

      // Wing Black Leading Edge Thermal Tiles
      const leadingEdge = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.4, 6), blackTileMat);
      leadingEdge.rotation.z = side * 0.95;
      leadingEdge.rotation.x = 0.22;
      leadingEdge.position.set(side * 1.4, -0.1, 0.1);
      ship.add(leadingEdge);

      // Red/Green Wing Navigation Lights
      const navLight = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 8, 6),
        new THREE.MeshBasicMaterial({ color: side < 0 ? 0xef4444 : 0x22c55e })
      );
      navLight.position.set(side * 2.75, -0.05, -1.0);
      ship.add(navLight);

      // Main Rocket Engine Pods
      const enginePod = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 1.2, 10), rocketEngineMat);
      enginePod.rotation.x = Math.PI / 2;
      enginePod.position.set(side * 0.48, -0.05, -2.1);
      ship.add(enginePod);

      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.7, 8), rocketFlameMat);
      flame.rotation.x = -Math.PI / 2;
      flame.position.set(side * 0.48, -0.05, -2.85);
      ship.add(flame);
    }

    // 3. Vertical Tail Stabilizer Fin
    const tailFinShape = new THREE.Shape();
    tailFinShape.moveTo(0, 0);
    tailFinShape.lineTo(0, 1.6);
    tailFinShape.lineTo(-1.1, 1.4);
    tailFinShape.lineTo(-1.4, 0);
    tailFinShape.closePath();

    const tailFinGeo = new THREE.ExtrudeGeometry(tailFinShape, { depth: 0.08, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02 });
    const tailFin = new THREE.Mesh(tailFinGeo, whiteHullMat);
    tailFin.position.set(0.04, 0.65, -0.6);
    ship.add(tailFin);

    // Top Central Engine Nozzle
    const topEngine = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 1.2, 10), rocketEngineMat);
    topEngine.rotation.x = Math.PI / 2;
    topEngine.position.set(0, 0.35, -2.1);
    ship.add(topEngine);

    const topFlame = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.8, 8), rocketFlameMat);
    topFlame.rotation.x = -Math.PI / 2;
    topFlame.position.set(0, 0.35, -2.9);
    ship.add(topFlame);

    ship.traverse(object => {
      if ((object as THREE.Mesh).isMesh) object.castShadow = !this.isSoftwareGl;
    });
    return ship;
  }

  private beginStationEncounter(station: StationData): void {
    if (this.encounteredStationIds.has(station.id)) return;
    this.encounteredStationIds.add(station.id);

    if (this.gameMode() === 'free') {
      this.setCombatMessage(`ESTACIÓN ALCANZADA · ${station.name.toUpperCase()}`, 2500);
      this.playChime([440, 660]);
      return;
    }

    const count = 2 + Math.floor(Math.random() * 2);
    this.spawnCombatEnemies(count);
    this.setCombatMessage(`TRANSBORDADORES ENEMIGOS DETECTADOS · ${count} EN VUELO`, 3000);
    this.playChime([480, 360]);
  }

  private setCombatMessage(message: string, duration = 3600): void {
    this.combatMessage.set(message);
    if (this.combatMessageTimeout) clearTimeout(this.combatMessageTimeout);
    this.combatMessageTimeout = setTimeout(() => this.combatMessage.set(''), duration);
  }

  firePlayerWeapons(): void {
    if (this.combatCooldown > 0) return;
    this.combatCooldown = 0.22;
    const cosPitch = Math.cos(this.shipPitch);
    const forward = new THREE.Vector3(
      Math.sin(this.shipRotationY) * cosPitch,
      -Math.sin(this.shipPitch),
      Math.cos(this.shipRotationY) * cosPitch
    );
    const lateral = new THREE.Vector3(Math.cos(this.shipRotationY), 0, -Math.sin(this.shipRotationY));
    const direction = forward.clone().normalize();
    for (const side of [-1, 1]) {
      const origin = this.shipPosition.clone().addScaledVector(forward, 2.4).addScaledVector(lateral, side * 0.62);
      const bolt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 1.4, 6),
        new THREE.MeshBasicMaterial({ color: 0xe6bd79 })
      );
      bolt.position.copy(origin);
      bolt.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
      this.scene.add(bolt);
      this.combatBolts.push({ mesh: bolt, velocity: direction.clone().multiplyScalar(105), remaining: 2.6, side: 'player' });
    }
    this.playChime([720, 540]);
  }

  private fireAlienWeapons(fighter: AlienFighter): void {
    const direction = this.shipPosition.clone().add(new THREE.Vector3(0, 0.3, 0)).sub(fighter.group.position).normalize();
    const bolt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 1.7, 6),
      new THREE.MeshBasicMaterial({ color: 0xb8563e })
    );
    bolt.position.copy(fighter.group.position).addScaledVector(direction, 2.2);
    bolt.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    this.scene.add(bolt);
    this.combatBolts.push({ mesh: bolt, velocity: direction.multiplyScalar(38), remaining: 4.5, side: 'hostile' });
  }

  private updateCombat(delta: number): void {
    this.combatCooldown = Math.max(0, this.combatCooldown - delta);
    this.hullRegenCooldown = Math.max(0, this.hullRegenCooldown - delta);
    
    // Player is IMMORTAL: Hull remains at 100%
    this.hullIntegrity.set(100);

    if ((this.keysPressed['f'] || this.touchState.fire) && this.combatCooldown <= 0) this.firePlayerWeapons();

    for (const fighter of this.alienFighters) {
      fighter.phase += delta * (fighter.velocity.x >= 0 ? 0.28 : -0.28);
      const target = new THREE.Vector3(
        this.shipPosition.x + Math.cos(fighter.phase) * fighter.orbitRadius,
        this.shipPosition.y + Math.sin(this.elapsedTime * 1.1 + fighter.phase) * fighter.orbitRadius * 0.36,
        this.shipPosition.z + Math.sin(fighter.phase) * fighter.orbitRadius
      );
      const toTarget = target.sub(fighter.group.position);
      const desiredVelocity = toTarget.lengthSq() > 0.01 ? toTarget.normalize().multiplyScalar(8.5) : new THREE.Vector3();
      fighter.velocity.lerp(desiredVelocity, Math.min(1, delta * 1.6));
      fighter.group.position.addScaledVector(fighter.velocity, delta);
      fighter.group.lookAt(this.shipPosition.x, this.shipPosition.y + 0.2, this.shipPosition.z);
      fighter.group.rotation.z = Math.sin(this.elapsedTime * 1.6 + fighter.phase) * 0.08;
      fighter.fireCooldown -= delta;
      if (fighter.fireCooldown <= 0 && fighter.group.position.distanceTo(this.shipPosition) < 105) {
        this.fireAlienWeapons(fighter);
        fighter.fireCooldown = 1.45 + Math.random() * 1.2;
      }
    }

    for (let boltIndex = this.combatBolts.length - 1; boltIndex >= 0; boltIndex--) {
      const bolt = this.combatBolts[boltIndex];
      bolt.remaining -= delta;
      bolt.mesh.position.addScaledVector(bolt.velocity, delta);
      let consumed = bolt.remaining <= 0;

      if (!consumed && bolt.side === 'hostile' && bolt.mesh.position.distanceTo(this.shipPosition) < 2.0) {
        // Player is IMMORTAL!
        this.hullIntegrity.set(100);
        this.playThump();
        this.setCombatMessage(`🛡️ IMPACTO ABSORBIDO (ESCUDO INVENCIBLE · INMORTAL)`, 1400);
        consumed = true;
      } else if (!consumed && bolt.side === 'player') {
        const hitIndex = this.alienFighters.findIndex(fighter => bolt.mesh.position.distanceTo(fighter.group.position) < 2.4);
        if (hitIndex >= 0) {
          const target = this.alienFighters[hitIndex];
          target.integrity -= 1;
          const hull = target.group.children[0] as THREE.Mesh;
          if (hull.material instanceof THREE.MeshStandardMaterial) hull.material.emissive.setHex(0xff3300);
          if (target.integrity <= 0) {
            this.scene.remove(target.group);
            target.group.traverse(object => {
              const mesh = object as THREE.Mesh;
              if (!mesh.isMesh) return;
              mesh.geometry.dispose();
              const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              materials.forEach(material => material.dispose());
            });
            this.alienFighters.splice(hitIndex, 1);
            this.enemiesDestroyed.update(v => v + 1);
            this.activeHostiles.set(this.alienFighters.length);
            this.setCombatMessage(`💥 TRANSBORDADOR ENEMIGO DERRIBADO! (DERRIBOS: ${this.enemiesDestroyed()})`, 2500);
            this.playChime([523, 659, 784, 1046]);

            // Continuous spawn in combat mode to keep action going
            if (this.gameMode() === 'combat' && this.alienFighters.length < 3) {
              this.spawnCombatEnemies(1);
            }
          }
          consumed = true;
        }
      }

      if (consumed) {
        this.scene.remove(bolt.mesh);
        bolt.mesh.geometry.dispose();
        (bolt.mesh.material as THREE.Material).dispose();
        this.combatBolts.splice(boltIndex, 1);
      }
    }
  }

  private buildThrusterParticles(): void {
    const maxParticles = 60;
    this.thrusterParticlesGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(maxParticles * 3);
    this.thrusterParticlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const pMat = new THREE.PointsMaterial({
      color: 0x00f5d4,
      size: 1.8,
      transparent: true,
      opacity: 0.9
    });

    this.thrusterParticlesMesh = new THREE.Points(this.thrusterParticlesGeometry, pMat);
    this.scene.add(this.thrusterParticlesMesh);
  }

  // ==========================================
  // Audio Synthesis (Procedural Web Audio API)
  // ==========================================
  toggleSound(): void {
    if (this.soundEnabled()) {
      this.soundEnabled.set(false);
      this.stopAudio();
    } else {
      this.soundEnabled.set(true);
      this.startAudio();
    }
  }

  private startAudio(): void {
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      // Biomechanical alien sub-harmonic hum
      this.engineOsc = this.audioCtx.createOscillator();
      this.engineGain = this.audioCtx.createGain();

      this.engineOsc.type = 'triangle';
      this.engineOsc.frequency.setValueAtTime(56, this.audioCtx.currentTime);

      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(160, this.audioCtx.currentTime);
      filter.Q.setValueAtTime(2.2, this.audioCtx.currentTime);

      this.engineGain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);

      this.engineOsc.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.audioCtx.destination);

      this.engineOsc.start();
    } catch {
      // Audio fallback safe
    }
  }

  private stopAudio(): void {
    try {
      if (this.engineOsc) {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
        this.engineOsc = null;
      }
    } catch {
      // safe
    }
  }

  private playChime(freqs: number[]): void {
    if (!this.soundEnabled() || !this.audioCtx) return;
    try {
      freqs.forEach((f, i) => {
        const osc = this.audioCtx!.createOscillator();
        const gain = this.audioCtx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, this.audioCtx!.currentTime + i * 0.08);
        gain.gain.setValueAtTime(0.12, this.audioCtx!.currentTime + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx!.currentTime + i * 0.08 + 0.35);

        osc.connect(gain);
        gain.connect(this.audioCtx!.destination);
        osc.start(this.audioCtx!.currentTime + i * 0.08);
        osc.stop(this.audioCtx!.currentTime + i * 0.08 + 0.38);
      });
    } catch {
      // safe
    }
  }

  private playThump(): void {
    if (!this.soundEnabled() || !this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(110, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, this.audioCtx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.18, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.2);
    } catch {
      // safe
    }
  }

  // ==========================================
  // Controls & Event Listeners
  // ==========================================
  private setupEvents(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.clearInputState);
    window.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    // Ignore if typing in an input
    const target = e.target as HTMLElement | null;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable) {
      return;
    }
    if (this.isHelpOpen() || this.activeStationModal()) return;
    const key = e.key.toLowerCase();
    this.keysPressed[key] = true;
    if (['w', 'a', 's', 'd', 'q', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) e.preventDefault();

    if (e.code === 'Space') {
      e.preventDefault();
      this.isBoosting = true;
      this.turboActive.set(true);
    }
    if (key === 'r' && !e.repeat) {
      this.resetShipPosition();
    }
    if (key === 'c' && !e.repeat) {
      this.cycleCamera();
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    const key = e.key.toLowerCase();
    this.keysPressed[key] = false;
    if (e.code === 'Space') {
      this.isBoosting = false;
      this.turboActive.set(false);
    }
  };

  private onVisibilityChange = (): void => {
    if (document.hidden) this.clearInputState();
  };

  private onPointerLockChange = (): void => {
    const isLocked = document.pointerLockElement === this.renderer?.domElement;
    this.isPointerLocked.set(isLocked);
    if (!isLocked) {
      this.shipYawRate = 0;
      this.shipPitchRate = 0;
    }
  };

  private onMouseMove = (event: MouseEvent): void => {
    if (document.pointerLockElement !== this.renderer?.domElement) return;

    const sensitivity = 0.0021;
    const yMultiplier = this.invertY() ? -1 : 1;
    // Mouse horizontal: moving right turns ship right, moving left turns ship left
    this.shipRotationY -= event.movementX * sensitivity;
    // Mouse vertical: moving up (negative movementY) pitches nose UP, moving down pitches nose DOWN
    this.shipPitch = THREE.MathUtils.clamp(
      this.shipPitch + yMultiplier * event.movementY * sensitivity,
      -0.92,
      0.92
    );
    this.shipYawRate = 0;
    this.shipPitchRate = 0;
  };

  toggleInvertY(): void {
    this.invertY.update(v => !v);
  }

  private clearInputState = (): void => {
    this.keysPressed = {};
    this.touchState.forward = false;
    this.touchState.backward = false;
    this.touchState.left = false;
    this.touchState.right = false;
    this.touchState.pitchUp = false;
    this.touchState.pitchDown = false;
    this.touchState.boost = false;
    this.touchState.fire = false;
    this.isBoosting = false;
    this.turboActive.set(false);
    this.shipYawRate = 0;
    this.shipPitchRate = 0;
  };

  // Touch Virtual Controls
  setTouchControl(control: 'forward' | 'backward' | 'left' | 'right' | 'pitchUp' | 'pitchDown' | 'boost' | 'fire', state: boolean): void {
    this.touchState[control] = state;
    if (control === 'boost') {
      this.isBoosting = state;
      this.turboActive.set(state);
    }
    if (control === 'fire') this.touchState.fire = state;
  }

  captureMouse(event: MouseEvent): void {
    if (!this.hasMouseControl() || event.target !== this.renderer?.domElement || document.pointerLockElement) return;
    if (this.cameraMode() === 'top' || this.cameraMode() === 'cinematic') this.setCameraMode('chase');
    try {
      this.renderer.domElement.requestPointerLock();
    } catch {
      this.isPointerLocked.set(false);
    }
  }

  resetShipPosition(): void {
    this.shipPosition.set(0, 0, 12);
    this.shipVelocity.set(0, 0, 0);
    this.shipSpeed = 0;
    this.shipRotationY = Math.PI;
    this.shipRoll = 0;
    this.shipPitch = 0;
    this.shipYawRate = 0;
    this.shipPitchRate = 0;
    this.playChime([330, 440]);
  }

  teleportToStation(st: StationData): void {
    if (this.isTransiting()) return;
    this.isTransiting.set(true);
    this.destinationName.set(st.name);
    this.playChime([600, 800, 1000, 1200]);

    const start = this.shipPosition.clone();
    const target = new THREE.Vector3(st.position.x, st.position.y + 10, st.position.z - 12);

    let elapsed = 0;
    const duration = 1.45;

    const transitInterval = setInterval(() => {
      elapsed += 0.03;
      const progress = Math.min(1.0, elapsed / duration);
      const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      this.shipPosition.copy(start).lerp(target, ease);
      this.shipPosition.y += Math.sin(progress * Math.PI) * 10;
      this.shipGroup.lookAt(st.position.x, st.position.y, st.position.z);
      this.shipVelocity.set(0, 0, 0);
      this.shipYawRate = 0;
      this.shipPitchRate = 0;

      if (progress >= 1.0) {
        clearInterval(transitInterval);
        this.shipPosition.copy(target);
        this.shipSpeed = 0;
        this.shipRotationY = 0;
        this.shipPitch = 0;
        this.dockedStation.set(st);
        this.beginStationEncounter(st);
        this.isTransiting.set(false);
        this.playChime([440, 554, 659]);
      }
    }, 20);
  }

  setCameraMode(mode: 'chase' | 'cockpit' | 'top' | 'cinematic'): void {
    this.cameraMode.set(mode);
    this.isCinema.set(mode === 'cinematic');
  }

  onLoadCustomGlb(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    this.customGlbName.set(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      try {
        localStorage.setItem('cached_transformer_glb', dataUrl);
        localStorage.setItem('cached_transformer_name', file.name);
      } catch (err) {
        console.warn('LocalStorage save error:', err);
      }
      this.loadGlbFromUrl(dataUrl, file.name);
    };
    reader.onerror = (err) => {
      console.error('FileReader error:', err);
      alert('Error al leer el archivo.');
    };
    reader.readAsDataURL(file);
  }

  private loadGlbFromUrl(url: string, name: string): void {
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        while (this.shipGroup.children.length > 0) {
          this.shipGroup.remove(this.shipGroup.children[0]);
        }

        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetScale = 3.5 / (maxDim || 1);
        model.scale.set(targetScale, targetScale, targetScale);

        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center.multiplyScalar(targetScale));
        model.rotation.y = Math.PI;

        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = !this.isSoftwareGl;
            child.receiveShadow = !this.isSoftwareGl;
          }
        });

        this.shipGroup.add(model);
        this.customGlbLoaded.set(true);
        this.customGlbName.set(name);
        this.playChime([523, 659, 784, 1046]);
      },
      undefined,
      (error) => {
        console.error('Error loading custom .glb model:', error);
      }
    );
  }

  cycleCamera(): void {
    const modes: ('chase' | 'cockpit' | 'top' | 'cinematic')[] = this.isPointerLocked()
      ? ['chase', 'cockpit']
      : ['chase', 'cockpit', 'top', 'cinematic'];
    const nextIdx = (modes.indexOf(this.cameraMode()) + 1) % modes.length;
    this.setCameraMode(modes[nextIdx]);
  }

  toggleDock(): void {
    this.isDockCollapsed.update(v => !v);
  }

  toggleHelp(): void {
    if (!this.isHelpOpen()) this.releasePointerLock();
    this.isHelpOpen.update(v => !v);
  }

  openStationModal(sectionId: string): void {
    this.releasePointerLock();
    this.activeStationModal.set(sectionId);
    this.playChime([523, 659, 784]);
  }

  closeStationModal(): void {
    this.activeStationModal.set(null);
  }

  // Action: Launch station content modal in 3D environment
  onSelectStation(st: StationData): void {
    this.openStationModal(st.sectionId);
  }

  // ==========================================
  // Main Animation / Physics Render Loop
  // ==========================================
  private startLoop(): void {
    const tick = () => {
      if (this.isDestroyed) return;

      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const delta = Math.min((now - this.lastTime) / 1000, 0.05);
      this.lastTime = now;
      this.elapsedTime += delta;

      this.updatePhysics(delta);
      this.updateCombat(delta);
      this.updateStations(delta);
      this.updateParticles(delta);
      this.updateCamera(delta);
      this.updateAudioFeedback();

      this.renderer.render(this.scene, this.camera);

      // Pacing on software WebGL as per Three.js skill
      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.animFrameId = requestAnimationFrame(tick);
      }
    };

    tick();
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.animFrameId = window.setTimeout(poll, 5);
      } else {
        gl.deleteSync(sync);
        this.animFrameId = window.setTimeout(cb, 60);
      }
    };
    this.animFrameId = window.setTimeout(poll, 5);
  }

  private updatePhysics(delta: number): void {
    const forwardInput = (this.keysPressed['w'] || this.touchState.forward) ? 1 : 0;
    const backwardInput = (this.keysPressed['s'] || this.touchState.backward) ? 1 : 0;
    const leftInput = (this.keysPressed['a'] || this.keysPressed['arrowleft'] || this.touchState.left) ? 1 : 0;
    const rightInput = (this.keysPressed['d'] || this.keysPressed['arrowright'] || this.touchState.right) ? 1 : 0;
    const pitchUpInput = (this.keysPressed['q'] || this.keysPressed['arrowup'] || this.touchState.pitchUp) ? 1 : 0;
    const pitchDownInput = (this.keysPressed['e'] || this.keysPressed['arrowdown'] || this.touchState.pitchDown) ? 1 : 0;
    const steering = leftInput - rightInput;
    const pitchInput = pitchUpInput - pitchDownInput;

    // Flight assist eases into turns and damps them after release. Pitch gently
    // returns to level so small corrections do not leave the ship pointed away.
    this.shipYawRate = THREE.MathUtils.damp(this.shipYawRate, steering * this.turnSpeed, 7.5, delta);
    this.shipRotationY += this.shipYawRate * delta;
    this.shipPitchRate = THREE.MathUtils.damp(this.shipPitchRate, -pitchInput * this.pitchSpeed, 7.5, delta);
    this.shipPitch = THREE.MathUtils.clamp(this.shipPitch + this.shipPitchRate * delta, -0.92, 0.92);
    if (pitchInput === 0 && !this.isPointerLocked()) this.shipPitch = THREE.MathUtils.damp(this.shipPitch, 0, 0.62, delta);
    this.shipRoll = THREE.MathUtils.damp(this.shipRoll, -steering * 0.18, 5.5, delta);

    const cosPitch = Math.cos(this.shipPitch);
    const forward = this._vecA
      .set(Math.sin(this.shipRotationY) * cosPitch, -Math.sin(this.shipPitch), Math.cos(this.shipRotationY) * cosPitch)
      .normalize();

    if (backwardInput) {
      // S is a predictable brake: cancel current drift first, without turning
      // the same key into an unexpected reverse-thrust input.
      const speed = this.shipVelocity.length();
      const brakeStep = speed > 0 ? Math.min(1, (this.brakingForce * delta) / speed) : 1;
      this.shipVelocity.multiplyScalar(1 - brakeStep);
    } else if (forwardInput) {
      const engineFactor = this.isBoosting ? 1.28 : 1;
      const maxSpeed = this.isBoosting ? this.maxTurboSpeed : this.maxNormalSpeed;
      const targetSpeed = Math.min(maxSpeed, this.shipVelocity.length() + this.acceleration * engineFactor * delta);
      this._vecB.copy(forward).multiplyScalar(targetSpeed);
      // With the engines engaged, flight assist gently aligns travel with the
      // view direction instead of letting old sideways drift fight the pilot.
      this.shipVelocity.lerp(this._vecB, Math.min(1, delta * 3.4));
    } else {
      // The assisted stabilizers reduce drift gradually after W is released.
      this.shipVelocity.multiplyScalar(Math.exp(-this.coastDrag * delta));
    }

    const maxSpeed = this.isBoosting ? this.maxTurboSpeed : this.maxNormalSpeed;
    this.shipVelocity.clampLength(0, maxSpeed);
    this.shipSpeed = this.shipVelocity.length();
    this.shipPosition.addScaledVector(this.shipVelocity, delta);

    // The mapped region is an open star system; distant limits wrap gently instead of acting as walls.
    const outerSectorLimit = 350;
    for (const axis of ['x', 'y', 'z'] as const) {
      if (Math.abs(this.shipPosition[axis]) > outerSectorLimit) {
        this.shipPosition[axis] = -Math.sign(this.shipPosition[axis]) * (outerSectorLimit - 5);
      }
    }

    this.shipGroup.position.copy(this.shipPosition);
    this.shipGroup.rotation.set(this.shipPitch, this.shipRotationY, this.shipRoll);

    const thrusterScale = Math.max(0.2, (this.shipSpeed / this.maxNormalSpeed) * (this.isBoosting ? 1.8 : 1.1));
    this.shipThrusterLeft.scale.set(thrusterScale, thrusterScale * 1.5, thrusterScale);
    this.shipThrusterRight.scale.set(thrusterScale, thrusterScale * 1.5, thrusterScale);

    if (this.shipSpeed > 1.5) this.emitThrusterParticle();

    // Animate alien bio-technological components
    if (this.shipPropulsionRing) {
      this.shipPropulsionRing.rotation.z += delta * 2.5;
    }
    if (this.shipBioCoreMat) {
      this.shipBioCoreMat.emissiveIntensity = 0.9 + 0.6 * Math.sin(this.elapsedTime * 4.2);
    }
    for (let m = 0; m < this.alienMonoliths.length; m++) {
      const mono = this.alienMonoliths[m];
      mono.rotation.y += delta * (0.16 + m * 0.05);
      mono.rotation.x += delta * 0.08;
    }

    this.speedKms.set(Math.round(this.shipSpeed));
    this.headingDegrees.set(((Math.round(THREE.MathUtils.radToDeg(this.shipRotationY)) % 360) + 360) % 360);
    this.pitchDegrees.set(Math.round(THREE.MathUtils.radToDeg(-this.shipPitch)));

    const radarRange = 210;
    const computedBlips = this.stations.map(st => {
      const dx = st.position.x - this.shipPosition.x;
      const dz = st.position.z - this.shipPosition.z;
      const angle = -this.shipRotationY;
      const rxRel = dx * Math.cos(angle) - dz * Math.sin(angle);
      const rzRel = dx * Math.sin(angle) + dz * Math.cos(angle);
      const radarX = Math.max(12, Math.min(88, 50 + (rxRel / radarRange) * 38));
      const radarY = Math.max(12, Math.min(88, 50 - (rzRel / radarRange) * 38));
      const altitude = Math.round(st.position.y - this.shipPosition.y);

      return {
        x: radarX,
        y: radarY,
        label: st.name + ' · ALT ' + (altitude > 0 ? '+' : '') + altitude,
        color: st.glowHex,
        station: st
      };
    });
    const hostileBlips = this.alienFighters.map((fighter, index) => {
      const dx = fighter.group.position.x - this.shipPosition.x;
      const dz = fighter.group.position.z - this.shipPosition.z;
      const angle = -this.shipRotationY;
      const rxRel = dx * Math.cos(angle) - dz * Math.sin(angle);
      const rzRel = dx * Math.sin(angle) + dz * Math.cos(angle);
      return {
        x: Math.max(12, Math.min(88, 50 + (rxRel / radarRange) * 38)),
        y: Math.max(12, Math.min(88, 50 - (rzRel / radarRange) * 38)),
        label: 'Hostil ' + (index + 1),
        color: '#bd6b4f',
        station: null,
        isHostile: true
      };
    });
    this.radarBlips.set([...computedBlips, ...hostileBlips]);
  }
  private emitThrusterParticle(): void {
    if (this.thrusterParticles.length > 50) return;
    const cosPitch = Math.cos(this.shipPitch);
    const forward = new THREE.Vector3(
      Math.sin(this.shipRotationY) * cosPitch,
      -Math.sin(this.shipPitch),
      Math.cos(this.shipRotationY) * cosPitch
    ).normalize();
    const lateral = new THREE.Vector3(Math.cos(this.shipRotationY), 0, -Math.sin(this.shipRotationY));

    for (const side of [-1, 1]) {
      const position = this.shipPosition.clone()
        .addScaledVector(lateral, side * 0.67)
        .addScaledVector(forward, -2.1);
      position.y -= 0.05;
      const velocity = forward.clone().negate().multiplyScalar(6 + Math.random() * 4);
      velocity.y += (Math.random() - 0.5) * 0.45;

      this.thrusterParticles.push({
        pos: position,
        vel: velocity,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.25
      });
    }
  }

  private updateParticles(delta: number): void {
    for (let i = this.thrusterParticles.length - 1; i >= 0; i--) {
      const p = this.thrusterParticles[i];
      p.life += delta;
      if (p.life >= p.maxLife) {
        this.thrusterParticles.splice(i, 1);
      } else {
        p.pos.addScaledVector(p.vel, delta);
      }
    }

    const posAttr = this.thrusterParticlesGeometry.attributes['position'] as THREE.BufferAttribute;
    const array = posAttr.array as Float32Array;

    for (let i = 0; i < 60; i++) {
      if (i < this.thrusterParticles.length) {
        const p = this.thrusterParticles[i];
        array[i * 3] = p.pos.x;
        array[i * 3 + 1] = p.pos.y;
        array[i * 3 + 2] = p.pos.z;
      } else {
        array[i * 3] = 0;
        array[i * 3 + 1] = -999;
        array[i * 3 + 2] = 0;
      }
    }
    posAttr.needsUpdate = true;
  }

  private updateStations(delta: number): void {
    const elapsed = this.elapsedTime;
    let closestStation: StationData | null = null;
    let minStationDist = 18;
    const showBeacons = this.showWaypoints() && this.gameMode() === 'free';

    this.stationMeshes.forEach(sm => {
      sm.beacon.rotation.y += 1.2 * delta;
      sm.satelliteRig.rotation.y += 0.012 * delta;

      sm.beacon.visible = showBeacons;

      // Animate 3D holographic beacon halo ring & ion beam
      if (sm.haloRing) {
        sm.haloRing.visible = showBeacons;
        sm.haloRing.rotation.z += 0.28 * delta;
        const pulse = Math.sin(elapsed * 2.4);
        sm.haloRing.scale.setScalar(1.0 + 0.25 * pulse);
        (sm.haloRing.material as THREE.MeshBasicMaterial).opacity = 0.35 + 0.2 * pulse;
      }
      if (sm.beaconBeam) {
        sm.beaconBeam.visible = showBeacons;
        (sm.beaconBeam.material as THREE.MeshBasicMaterial).opacity = 0.28 + 0.12 * Math.sin(elapsed * 3.2);
      }

      const dist = this.shipPosition.distanceTo(sm.group.position);
      if (dist < minStationDist) {
        minStationDist = dist;
        closestStation = sm.data;
      }
    });

    if (closestStation !== this.dockedStation()) {
      if (closestStation && !this.dockedStation()) {
        this.playChime([440, 660]); // Station entry beacon
      }
      this.dockedStation.set(closestStation);
      if (closestStation) this.beginStationEncounter(closestStation);
    }

    // Compute Screen-Space Visual HUD Waypoints (On-Screen Reticles & Off-Screen Edge Pointers)
    if (this.camera) {
      const waypoints: StationWaypoint[] = this.stations.map(st => {
        const stWorldPos = this._vecB.set(st.position.x, st.position.y + 4.5, st.position.z);
        const dist = Math.round(this.shipPosition.distanceTo(stWorldPos));

        // Project through camera to NDC [-1, 1]
        const projected = stWorldPos.clone().project(this.camera);

        const isBehind = projected.z > 1.0;
        let nx = projected.x;
        let ny = projected.y;

        if (isBehind) {
          nx = -nx;
          ny = -ny;
          if (nx === 0 && ny === 0) nx = 1;
        }

        const marginX = 0.88;
        const marginY = 0.82;
        const onScreen = !isBehind && Math.abs(nx) <= marginX && Math.abs(ny) <= marginY;

        let screenX: number;
        let screenY: number;
        let arrowAngle = 0;

        if (onScreen) {
          screenX = (nx * 0.5 + 0.5) * 100;
          screenY = (-ny * 0.5 + 0.5) * 100;
        } else {
          // Off-screen: compute directional angle towards edge
          const screenDirX = nx;
          const screenDirY = -ny; // Inverted because CSS top is positive downwards
          const angleRad = Math.atan2(screenDirY, screenDirX);
          arrowAngle = (angleRad * 180) / Math.PI;

          // Perimeter clamping
          const maxRx = 45;
          const maxRy = 42;
          const cosA = Math.cos(angleRad);
          const sinA = Math.sin(angleRad);

          const scale = Math.min(
            Math.abs(maxRx / (Math.abs(cosA) > 0.001 ? cosA : 0.001)),
            Math.abs(maxRy / (Math.abs(sinA) > 0.001 ? sinA : 0.001))
          );

          screenX = 50 + cosA * scale;
          screenY = 50 + sinA * scale;
        }

        return {
          id: st.id,
          station: st,
          name: st.name,
          icon: st.icon,
          color: st.glowHex,
          distanceKm: dist,
          screenX: Math.max(3.5, Math.min(96.5, screenX)),
          screenY: Math.max(7.0, Math.min(91.5, screenY)),
          isOnScreen: onScreen,
          arrowAngleDeg: arrowAngle,
          isDocked: this.dockedStation()?.id === st.id
        };
      });

      this.stationWaypoints.set(waypoints);
    }
  }

  private updateCamera(delta: number): void {
    const mode = this.cameraMode();
    const cosPitch = Math.cos(this.shipPitch);
    const forward = this._vecA
      .set(Math.sin(this.shipRotationY) * cosPitch, -Math.sin(this.shipPitch), Math.cos(this.shipRotationY) * cosPitch)
      .normalize();

    if (mode === 'chase') {
      const chaseDist = this.isBoosting ? 14 : 11;
      const targetCamera = this.shipPosition.clone().addScaledVector(forward, -chaseDist);
      targetCamera.y += 4.2;

      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, targetCamera.x, 5.0, delta);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, targetCamera.y, 5.0, delta);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, targetCamera.z, 5.0, delta);

      this._camTarget.copy(this.shipPosition).addScaledVector(forward, 6);
      this.camera.lookAt(this._camTarget);
    } else if (mode === 'cockpit') {
      this.camera.position.copy(this.shipPosition).add(new THREE.Vector3(0, 0.55, 0)).addScaledVector(forward, 0.85);
      this._camTarget.copy(this.shipPosition).addScaledVector(forward, 18);
      this.camera.lookAt(this._camTarget);
    } else if (mode === 'top') {
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, this.shipPosition.x, 5.0, delta);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, this.shipPosition.y + 64, 5.0, delta);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, this.shipPosition.z, 5.0, delta);
      this.camera.lookAt(this.shipPosition);
    } else if (mode === 'cinematic') {
      const t = this.elapsedTime * 0.4;
      this.camera.position.set(
        this.shipPosition.x + Math.cos(t) * 14.0,
        this.shipPosition.y + Math.sin(t * 0.63) * 7.0 + 3.0,
        this.shipPosition.z + Math.sin(t) * 14.0
      );
      this.camera.lookAt(this.shipPosition);
    }
  }

  private updateAudioFeedback(): void {
    if (!this.soundEnabled() || !this.engineOsc || !this.engineGain || !this.audioCtx) return;
    try {
      const speedRatio = Math.min(1.0, Math.abs(this.shipSpeed) / this.maxNormalSpeed);
      const targetFreq = 60 + speedRatio * 140 + (this.isBoosting ? 60 : 0);
      const targetGain = 0.05 + speedRatio * 0.12 + (this.isBoosting ? 0.08 : 0);

      this.engineOsc.frequency.setTargetAtTime(targetFreq, this.audioCtx.currentTime, 0.08);
      this.engineGain.gain.setTargetAtTime(targetGain, this.audioCtx.currentTime, 0.08);
    } catch {
      // safe
    }
  }

  // ==========================================
  // Clean Disposal
  // ==========================================
  private disposeThree(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.clearInputState);
    window.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    this.releasePointerLock();

    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
    this.scene.clear();
  }

  private releasePointerLock(): void {
    if (document.pointerLockElement === this.renderer?.domElement) document.exitPointerLock();
    this.isPointerLocked.set(false);
  }
}
