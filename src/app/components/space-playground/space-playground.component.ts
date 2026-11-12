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
  EventEmitter,
  input,
  effect,
  inject
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
import { PortfolioDataService, Modo3DConfig, DEFAULT_MODO3D_CONFIG } from '../../services/portfolio-data.service';
import { resolveModelUrl, saveModelToDB } from '../../services/model-storage';
import {
  SHADER_PILOT_VERTEX,
  PRESET_SYNTHWAVE_GLSL,
  PRESET_NEBULA_GLSL,
  PRESET_WORMHOLE_GLSL,
  PRESET_FRACTAL_GLSL,
  PRESET_PLASMA_GLSL
} from '../../services/shader-presets';
import {
  LodLevel,
  LodProfile,
  LodThresholds,
  LodMetrics,
  getLodThresholds,
  determineLodLevel,
  shouldUpdateEntity,
  getUpdateDeltaMultiplier,
  calculateLODMetrics,
  LOD_PROFILES
} from '../../services/lod-system';

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

interface ActiveExplosion {
  group: THREE.Group;
  light?: THREE.PointLight;
  particles: { mesh: THREE.Mesh; velocity: THREE.Vector3; rotSpeed: THREE.Vector3 }[];
  shockwave?: THREE.Mesh;
  fireball?: THREE.Mesh;
  elapsed: number;
  maxLife: number;
}

interface Missile {
  mesh: THREE.Group;
  velocity: THREE.Vector3;
  target: AlienFighter | null;
  life: number;
}

export type ShaderPreset = 'synthwave' | 'nebula' | 'wormhole' | 'fractal' | 'plasma';

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
  @Output() openHangar = new EventEmitter<void>();

  modelUrl = input<string>('preset:xeno');
  shipName = input<string>('Caza Biomecánico Xeno-01');

  // Dynamic ship telemetry display
  currentShipTitle = signal('CAZA BIOMECÁNICO · XENO-01');
  currentShipSub = signal('Fuselaje viviente de quitina · Propulsión gravitacional');
  currentShipTypeTag = signal('BIO-ESTRUCTURA QUINÍTICA');
  currentHullLabel = signal('INTEGRIDAD BIO-CORAZA');

  // Reactive UI signals
  speedKms = signal(0);
  headingDegrees = signal(0);
  pitchDegrees = signal(0);
  hullIntegrity = signal(100);
  activeHostiles = signal(0);
  combatMessages = signal<{ id: number; text: string }[]>([]);
  private nextMessageId = 0;
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
  waveNumber = signal(1);
  private combatReinforcementTimer = 0;
  isSettingsOpen = signal(false);
  isRespawning = signal(false);
  private isFirstLoad = true;

  // Level of Detail (LOD) & Update Throttling System state
  lodEnabled = signal(true);
  lodProfile = signal<LodProfile>('balanced');
  lodThresholds: LodThresholds = getLodThresholds('balanced');
  lodMetrics = signal<LodMetrics>({
    totalEntities: 5,
    highCount: 5,
    mediumCount: 0,
    lowCount: 0,
    culledCount: 0,
    estimatedComplexitySavingsPercent: 0
  });
  private frameCounter = 0;

  toggleLod(): void {
    this.lodEnabled.update(v => !v);
    this.updateLodThresholdsInScene();
    this.refreshLodMetrics();
    const stateText = this.lodEnabled() ? 'ACTIVADO' : 'DESACTIVADO';
    this.setCombatMessage(`⚡ SISTEMA LOD (NIVEL DE DETALLE) ${stateText}`, 2500);
  }

  setLodProfile(profile: LodProfile): void {
    this.lodProfile.set(profile);
    this.lodThresholds = getLodThresholds(profile);
    this.updateLodThresholdsInScene();
    this.refreshLodMetrics();
    const label = profile === 'performance' ? 'MÁXIMO RENDIMIENTO' : profile === 'ultra' ? 'ULTRA DETALLE' : 'EQUILIBRADO';
    this.setCombatMessage(`⚙️ PERFIL LOD: ${label}`, 2500);
  }

  refreshLodMetrics(): void {
    if (!this.stationMeshes || this.stationMeshes.length === 0) return;
    const distances = this.stationMeshes.map(sm => this.shipPosition.distanceTo(sm.group.position));
    const metrics = calculateLODMetrics(distances, this.lodThresholds, this.lodEnabled());
    this.lodMetrics.set(metrics);
  }

  private updateLodThresholdsInScene(): void {
    const enabled = this.lodEnabled();
    this.stationMeshes.forEach(sm => {
      if (sm.lod && sm.lod.levels && sm.lod.levels.length >= 3) {
        sm.lod.levels[0].distance = 0;
        sm.lod.levels[1].distance = enabled ? this.lodThresholds.medium : Infinity;
        sm.lod.levels[2].distance = enabled ? this.lodThresholds.low : Infinity;
      }
    });
  }

  toggleSettingsMenu(): void {
    this.isSettingsOpen.update(v => !v);
    if (this.isSettingsOpen()) {
      this.releasePointerLock();
      this.refreshLodMetrics();
    }
  }

  // Shader Pilot Generative GLSL Engine state
  shaderPilotActive = signal(false);
  selectedShaderPreset = signal<ShaderPreset>('synthwave');
  shaderSpeed = signal(1.0);
  shaderFrequency = signal(2.0);
  shaderGlow = signal(1.5);
  shaderScale = signal(1.0);
  shaderDistortion = signal(0.5);
  shaderColorPalette = signal(0);
  syncFlight = signal(true);
  glslCode = signal(PRESET_SYNTHWAVE_GLSL);
  glslCompileError = signal<string | null>(null);

  private shaderPilotMesh?: THREE.Mesh;
  private shaderPilotMaterial?: THREE.ShaderMaterial;
  private portfolioService = inject(PortfolioDataService);

  private get cfg(): Modo3DConfig {
    return this.portfolioService.portfolioData().modo3DConfig || DEFAULT_MODO3D_CONFIG;
  }

  constructor() {
    effect(() => {
      const url = this.modelUrl();
      const name = this.shipName();
      if (this.scene && this.shipGroup) {
        this.applySelectedShip(url, name);
      }
    });
  }

  toggleWaypoints(): void {
    this.showWaypoints.update(v => !v);
  }

  toggleGameMode(): void {
    if (this.gameMode() === 'free') {
      this.gameMode.set('combat');
      this.showWaypoints.set(false); // Las balizas desaparecen en modo juego
      this.hullIntegrity.set(100);
      this.waveNumber.set(1);
      this.combatReinforcementTimer = 0;
      this.clearAlienFighters();
      this.spawnCombatEnemies(3);
      this.setCombatMessage(this.cfg.combatActivatedMessage || '🎮 MODO COMBATE ACTIVADO', 4000);
      this.playChime([523, 659, 784, 1046]);
    } else {
      this.gameMode.set('free');
      this.showWaypoints.set(true); // Las balizas reaparecen en modo libre
      this.clearAlienFighters();
      this.setCombatMessage(this.cfg.freeModeActivatedMessage || '🕊️ MODO NAVEGACIÓN LIBRE ACTIVADO', 3000);
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
    const diffFactor = 1.0 + (this.waveNumber() - 1) * 0.22;
    for (let index = 0; index < count; index++) {
      const phase = Math.random() * Math.PI * 2;
      const ship = this.buildAlienFighter();
      const orbitRadius = 22 + Math.random() * 18;
      ship.position.set(
        this.shipPosition.x + Math.cos(phase) * orbitRadius,
        this.shipPosition.y + (Math.random() - 0.5) * 12,
        this.shipPosition.z + Math.sin(phase) * orbitRadius
      );
      ship.lookAt(this.shipPosition);
      this.scene.add(ship);
      this.alienFighters.push({
        group: ship,
        velocity: new THREE.Vector3(),
        phase,
        orbitRadius,
        fireCooldown: (0.7 + Math.random() * 1.0) / diffFactor,
        integrity: 2 + Math.floor(this.waveNumber() * 0.5)
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

  // Interactive scene entities with Level of Detail (LOD)
  private stationMeshes: {
    group: THREE.Group;
    lod: THREE.LOD;
    data: StationData;
    highRig: THREE.Group;
    mediumRig: THREE.Group;
    lowRig: THREE.Group;
    beacon: THREE.Mesh;
    mediumBeacon?: THREE.Mesh;
    satelliteRig: THREE.Group;
    haloRing?: THREE.Mesh;
    beaconBeam?: THREE.Mesh;
    currentLodLevel: LodLevel;
    distance: number;
  }[] = [];
  private thrusterParticles: { pos: THREE.Vector3; vel: THREE.Vector3; life: number; maxLife: number }[] = [];
  private thrusterParticlesGeometry!: THREE.BufferGeometry;
  private thrusterParticlesMesh!: THREE.Points;
  private alienFighters: AlienFighter[] = [];
  private combatBolts: CombatBolt[] = [];
  private activeExplosions: ActiveExplosion[] = [];
  private asteroidsList: { mesh: THREE.Mesh; position: THREE.Vector3; radius: number }[] = [];
  private playerCollisionCooldown = 0;
  private cameraShakeIntensity = 0;
  private lastAppliedUrl = '';
  private lastAppliedName = '';
  private lastNotificationTimes = new Map<string, number>();
  private encounteredStationIds = new Set<string>();
  private combatCooldown = 0;
  private missileCooldown = 0;
  private hullRegenCooldown = 0;
  private combatMissiles: Missile[] = [];
  private combatMessageTimeout: ReturnType<typeof setTimeout> | null = null;
  private transitInterval: ReturnType<typeof setInterval> | null = null;
  private messageTimeouts = new Set<ReturnType<typeof setTimeout>>();
  private cockpitOffset = new THREE.Vector3(0, 0.75, 1.6);
  private updateCockpitOffset(): void {
    const box = new THREE.Box3().setFromObject(this.shipGroup);
    const size = box.getSize(new THREE.Vector3());
    
    // Heuristic: Place camera slightly above the center and forward.
    this.cockpitOffset.set(
      0, 
      size.y * 0.2 + 0.5, // slightly above center
      size.z * 0.3 + 1.0  // slightly forward
    );
  }

  // --- PERFORMANCE POOLING & OPTIMIZATION ---
  private readonly sharedGeos = {
    sphere: new THREE.SphereGeometry(1, 12, 10),
    box: new THREE.BoxGeometry(1, 1, 1),
    tetra: new THREE.TetrahedronGeometry(1),
    torus: new THREE.TorusGeometry(1, 0.05, 8, 24),
    plane: new THREE.PlaneGeometry(1, 1),
    dodeca: new THREE.DodecahedronGeometry(1),
    cylinder: new THREE.CylinderGeometry(1, 1, 1, 8),
    cone: new THREE.ConeGeometry(1, 1, 8)
  };
  
  private activeLightsCount = 0;
  private readonly MAX_EXPLOSION_LIGHTS = 4;
  private readonly explosionMaterialCache = new Map<number, THREE.Material>();

  private getCachedExplosionMat(color: number, transparent = true, opacity = 1.0): THREE.Material {
    const key = color + (transparent ? 1 : 0) + opacity;
    if (this.explosionMaterialCache.has(key)) return this.explosionMaterialCache.get(key)!;
    
    const mat = new THREE.MeshBasicMaterial({ color, transparent, opacity });
    this.explosionMaterialCache.set(key, mat);
    return mat;
  }

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
    if (this.transitInterval) {
      clearInterval(this.transitInterval);
      this.transitInterval = null;
    }
    this.messageTimeouts.forEach(t => clearTimeout(t));
    this.messageTimeouts.clear();
    if (this.combatMessageTimeout) {
      clearTimeout(this.combatMessageTimeout);
      this.combatMessageTimeout = null;
    }
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      clearTimeout(this.animFrameId);
      this.animFrameId = 0;
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

    // 9. Shader Pilot Generative GLSL Environment Dome
    this.initShaderPilotEnvironment();
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
    const asteroidCount = 32;
    const asteroidMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.9,
      metalness: 0.1,
      flatShading: false
    });

    this.asteroidsList = [];
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

      this.asteroidsList.push({ mesh, position: mesh.position, radius: scale * 0.95 });
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

      // Shared materials across LOD tiers
      const hullMat = new THREE.MeshStandardMaterial({ color: 0x586661, roughness: 0.62, metalness: 0.72 });
      const edgeMat = new THREE.MeshStandardMaterial({ color: 0x89928a, roughness: 0.42, metalness: 0.78 });
      const panelMat = new THREE.MeshStandardMaterial({ color: 0x243b46, roughness: 0.48, metalness: 0.58 });
      const cellMat = new THREE.MeshStandardMaterial({ color: 0x395767, roughness: 0.4, metalness: 0.52 });
      const accentMat = new THREE.MeshStandardMaterial({ color: st.color, emissive: st.color, emissiveIntensity: 0.13, roughness: 0.4, metalness: 0.52 });
      const beaconMat = new THREE.MeshBasicMaterial({ color: st.color });

      // Shared call-sign billboard sprite
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

      // ========================================================
      // TIER 0: HIGH DETAIL (Near range: 0 to ~55 km)
      // 25+ distinct meshes, individual solar cells, relay satellites
      // ========================================================
      const highRig = new THREE.Group();
      const satelliteRig = new THREE.Group();

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
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.set(0, 7.15, 1.65);
      satelliteRig.add(beacon);

      // Two small relay satellites circle the main habitat
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
      highRig.add(satelliteRig);

      const highLabelSprite = new THREE.Sprite(labelMat);
      highLabelSprite.scale.set(14, 3.1, 1);
      highLabelSprite.position.set(0, 12.2, 0);
      highRig.add(highLabelSprite);

      // ========================================================
      // TIER 1: MEDIUM DETAIL (Mid range: ~55 to ~130 km)
      // Streamlined ~7 meshes: consolidated wings, no small relay satellites
      // ========================================================
      const mediumRig = new THREE.Group();
      const medHabitat = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.22, 4.7, 8), hullMat);
      medHabitat.rotation.x = Math.PI / 2;
      medHabitat.position.set(0, 5.15, 0);
      mediumRig.add(medHabitat);

      const medTruss = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 14.0, 6), edgeMat);
      medTruss.rotation.z = Math.PI / 2;
      medTruss.position.set(0, 4.65, 0);
      mediumRig.add(medTruss);

      const medBand = new THREE.Mesh(new THREE.TorusGeometry(1.13, 0.1, 4, 12), accentMat);
      medBand.rotation.x = Math.PI / 2;
      medBand.position.set(0, 5.15, 0);
      mediumRig.add(medBand);

      // Consolidated single-mesh solar wing panels (1 per side instead of 6 each)
      const medWingGeo = new THREE.BoxGeometry(4.2, 0.1, 2.6);
      for (const side of [-1, 1]) {
        const medWing = new THREE.Mesh(medWingGeo, panelMat);
        medWing.position.set(side * 5.2, 4.65, 0);
        mediumRig.add(medWing);
      }

      const medDish = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), hullMat);
      medDish.position.set(0, 7.8, -1.2);
      medDish.rotation.x = Math.PI / 2.8;
      mediumRig.add(medDish);

      const mediumBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), beaconMat);
      mediumBeacon.position.set(0, 7.15, 1.65);
      mediumRig.add(mediumBeacon);

      const medLabelSprite = new THREE.Sprite(labelMat);
      medLabelSprite.scale.set(14, 3.1, 1);
      medLabelSprite.position.set(0, 12.2, 0);
      mediumRig.add(medLabelSprite);

      // ========================================================
      // TIER 2: LOW DETAIL (Distant range: > 130 km)
      // Minimalist low-poly beacon proxy (2-3 meshes total, ~88% savings)
      // ========================================================
      const lowRig = new THREE.Group();
      const lowCore = new THREE.Mesh(new THREE.OctahedronGeometry(1.6, 0), hullMat);
      lowCore.position.set(0, 5.15, 0);
      lowCore.rotation.y = Math.PI / 4;
      lowRig.add(lowCore);

      const lowBand = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.25, 0.8), accentMat);
      lowBand.position.set(0, 5.15, 0);
      lowRig.add(lowBand);

      const lowBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 4), beaconMat);
      lowBeacon.position.set(0, 6.8, 0);
      lowRig.add(lowBeacon);

      // Assemble THREE.LOD container
      const lod = new THREE.LOD();
      lod.addLevel(highRig, 0);
      lod.addLevel(mediumRig, this.lodThresholds.medium);
      lod.addLevel(lowRig, this.lodThresholds.low);
      group.add(lod);

      // Shared Global Beacon Elements (Navigation Ion Beam & Pulsing Halo Ring)
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
      this.stationMeshes.push({
        group,
        lod,
        data: st,
        highRig,
        mediumRig,
        lowRig,
        beacon,
        mediumBeacon,
        satelliteRig,
        haloRing,
        beaconBeam,
        currentLodLevel: LodLevel.HIGH,
        distance: 0
      });
    });
    this.refreshLodMetrics();
  }

  // ==========================================
  // Modular Spaceship Construction & Switching
  // ==========================================
  private buildSpaceship(): void {
    this.shipGroup = new THREE.Group();
    this.shipGroup.rotation.order = 'YXZ';
    this.shipGroup.position.copy(this.shipPosition);
    this.scene.add(this.shipGroup);

    this.applySelectedShip(this.modelUrl() || 'preset:xeno', this.shipName());
  }

  applySelectedShip(url: string, name?: string): void {
    if (!this.shipGroup) return;

    const finalName = name || '';
    if (url === this.lastAppliedUrl && finalName === this.lastAppliedName) {
      return;
    }
    this.lastAppliedUrl = url;
    this.lastAppliedName = finalName;

    // 1. Thorough cleanup of existing meshes, geometries, and materials
    while (this.shipGroup.children.length > 0) {
      const child = this.shipGroup.children[0];
      this.shipGroup.remove(child);
      child.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh && mesh.isMesh) {
          mesh.geometry?.dispose();
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => m?.dispose());
        }
      });
    }

    this.shipThrusterLeft = null as any;
    this.shipThrusterRight = null as any;
    this.shipPropulsionRing = undefined;
    this.shipBioCoreMat = undefined;
    this.customGlbLoaded.set(false);

    // 2. Select appropriate 3D model
    if (url === 'preset:shuttle') {
      this.buildShuttleSpaceship();
      const finalName = name || 'Transbordador Orbital Humano STS';
      this.currentShipTitle.set(finalName.toUpperCase());
      this.currentShipSub.set('Aeronave terrestre · Alas delta y propulsión química');
      this.currentShipTypeTag.set('FUSELAJE AERODINÁMICO');
      this.currentHullLabel.set('INTEGRIDAD TÉRMICA');
      this.setCombatMessage(`🚀 NAVE EQUIPADA: ${finalName.toUpperCase()}`, 3000);
      this.playChime([523, 659, 784]);
    } else if (url === 'preset:interceptor') {
      this.buildViperSpaceship();
      const finalName = name || 'Interceptor Estelar Viper-IV';
      this.currentShipTitle.set(finalName.toUpperCase());
      this.currentShipSub.set('Caza táctico de combate · Doble propulsión iónica');
      this.currentShipTypeTag.set('BLINDAJE DE TITANIO');
      this.currentHullLabel.set('ESCUDO DEFLEXOR');
      this.setCombatMessage(`⚡ NAVE EQUIPADA: ${finalName.toUpperCase()}`, 3000);
      this.playChime([659, 784, 1046]);
    } else if (url && (url.startsWith('idb:') || url.startsWith('blob:') || url.startsWith('http') || url.startsWith('data:') || url.endsWith('.glb') || url.endsWith('.gltf'))) {
      const finalName = name || 'Nave Personalizada .GLB';
      this.currentShipTitle.set(finalName.toUpperCase());
      this.currentShipSub.set('Modelo 3D cargado · Telemetría activa');
      this.currentShipTypeTag.set('SISTEMAS EXTERNOS');
      this.currentHullLabel.set('INTEGRIDAD DEL FUSELAJE');
      this.setCombatMessage(`🛸 CARGANDO MODELO .GLB: ${finalName.toUpperCase()}`, 3000);

      resolveModelUrl(url).then(resolvedUrl => {
        this.loadGlbFromUrl(resolvedUrl, finalName);
      }).catch(err => {
        console.error('Error resolving model url:', err);
        this.setCombatMessage(`⚠ Error al cargar modelo 3D local`, 4000);
      });
    } else {
      // Default: Alien Biomechanical
      this.buildAlienSpaceship();
      const finalName = name || 'Caza Biomecánico Xeno-01';
      this.currentShipTitle.set(finalName.toUpperCase());
      this.currentShipSub.set('Fuselaje viviente de quitina · Propulsión gravitacional');
      this.currentShipTypeTag.set('BIO-ESTRUCTURA QUINÍTICA');
      this.currentHullLabel.set('INTEGRIDAD BIO-CORAZA');
      if (!this.isFirstLoad) {
        this.setCombatMessage(`👾 NAVE EQUIPADA: ${finalName.toUpperCase()}`, 3000);
      }
      this.playChime([440, 554, 659]);
    }
    this.isFirstLoad = false;
    this.updateCockpitOffset();
  }

  private buildAlienSpaceship(): void {
    // Exotic Biomechanical Materials
    const alienChitinMat = new THREE.MeshStandardMaterial({
      color: 0x07151a,
      roughness: 0.22,
      metalness: 0.92,
      emissive: 0x02161c,
      emissiveIntensity: 0.45,
      side: THREE.DoubleSide
    });
    const alienPlatingMat = new THREE.MeshStandardMaterial({
      color: 0x112d34,
      roughness: 0.35,
      metalness: 0.82,
      side: THREE.DoubleSide
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

    // 1. Central Aerodynamic Bio-Thorax
    const thoraxGeo = new THREE.SphereGeometry(1.25, 24, 18);
    const thorax = new THREE.Mesh(thoraxGeo, alienChitinMat);
    thorax.scale.set(1.45, 0.58, 2.7);
    thorax.position.set(0, 0, 0.4);
    thorax.castShadow = !this.isSoftwareGl;
    thorax.receiveShadow = !this.isSoftwareGl;
    this.shipGroup.add(thorax);

    // 2. Cephalic Mandible / Predatory Nose
    // 2. Cephalic Mandible / Predatory Nose
    const noseGeo = new THREE.ConeGeometry(0.82, 3.8, 16);
    const nose = new THREE.Mesh(noseGeo, alienPlatingMat);
    nose.rotation.x = Math.PI / 2;
    nose.scale.set(1.15, 1, 0.4);
    nose.position.set(0, 0.08, 3.9);
    nose.castShadow = !this.isSoftwareGl;
    this.shipGroup.add(nose);

    // Add Weapon Pods (Laser Cannons)
    const cannonGeo = new THREE.CylinderGeometry(0.08, 0.12, 1.2, 8);
    const cannonMat = alienPlatingMat.clone();
    for (const side of [-1, 1]) {
      const cannon = new THREE.Mesh(cannonGeo, cannonMat);
      cannon.rotation.x = Math.PI / 2;
      cannon.position.set(side * 1.1, -0.2, 1.5);
      this.shipGroup.add(cannon);

      const muzzleGlow = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), alienGlowMat);
      muzzleGlow.position.set(side * 1.1, -0.2, 2.1);
      this.shipGroup.add(muzzleGlow);
    }


    // 3. Segmented Dorsal Bio-Crest (strictly on X=0 center line)
    for (let i = 0; i < 5; i++) {
      const zPos = 2.4 - i * 0.95;
      const finHeight = 0.55 + Math.sin(i * 0.6) * 0.35;
      const fin = new THREE.Mesh(new THREE.ConeGeometry(0.18, finHeight, 6), alienPlatingMat);
      fin.rotation.x = -0.32;
      fin.position.set(0, 0.45 + finHeight * 0.45, zPos);
      this.shipGroup.add(fin);

      const glowNode = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), alienGlowMat);
      glowNode.position.set(0, 0.42, zPos);
      this.shipGroup.add(glowNode);
    }

    // 4. Exposed Bio-Plasma Core & Exoskeleton Ribs
    const coreMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 2), alienCoreMat);
    coreMesh.position.set(0, 0.28, -0.2);
    this.shipGroup.add(coreMesh);

    for (let r = 0; r < 4; r++) {
      const ribZ = 0.4 - r * 0.45;
      const rib = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.06, 6, 16, Math.PI), alienChitinMat);
      rib.rotation.x = Math.PI / 2;
      rib.position.set(0, 0.22, ribZ);
      this.shipGroup.add(rib);
    }

    // 5. Symmetric Forward-Swept Alien Scythe Wings
    // Build Right Wing Sub-Assembly Group (side = +1)
    const rightWingGroup = new THREE.Group();

    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(2.8, -0.6);
    wingShape.lineTo(5.4, -0.2);
    wingShape.lineTo(6.2, 1.8);
    wingShape.lineTo(5.8, 2.6);
    wingShape.lineTo(4.6, 1.1);
    wingShape.lineTo(2.2, 0.8);
    wingShape.closePath();

    const extrudeSettings = { depth: 0.12, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.04, bevelThickness: 0.04 };
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);
    const rightWingMesh = new THREE.Mesh(wingGeo, alienChitinMat);
    rightWingMesh.rotation.x = Math.PI / 2;
    rightWingMesh.position.set(0, 0.06, 0.2);
    rightWingMesh.castShadow = !this.isSoftwareGl;
    rightWingGroup.add(rightWingMesh);

    // Glowing Bio Vein
    const veinGeo = new THREE.CylinderGeometry(0.04, 0.04, 5.6, 6);
    const rightVein = new THREE.Mesh(veinGeo, alienGlowMat);
    rightVein.rotation.z = 0.72;
    rightVein.rotation.x = 0.25;
    rightVein.position.set(3.4, 0.02, 1.1);
    rightWingGroup.add(rightVein);

    // Ventral Fin
    const rightVentralFin = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.4, 6), alienPlatingMat);
    rightVentralFin.rotation.x = 0.45;
    rightVentralFin.rotation.z = -0.35;
    rightVentralFin.position.set(1.6, -0.52, -1.2);
    rightWingGroup.add(rightVentralFin);

    // Bio Eye Sensors
    const rightEye1 = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), eyeMat);
    rightEye1.position.set(0.38, 0.26, 3.1);
    rightWingGroup.add(rightEye1);

    const rightEye2 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), eyeMat);
    rightEye2.position.set(0.55, 0.18, 2.5);
    rightWingGroup.add(rightEye2);

    const rightEye3 = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), eyeMat);
    rightEye3.position.set(0.24, 0.34, 3.6);
    rightWingGroup.add(rightEye3);

    // Engine Nacelle & Plasma Exhaust
    const rightNacelle = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.48, 2.2, 12), alienPlatingMat);
    rightNacelle.rotation.x = Math.PI / 2;
    rightNacelle.position.set(1.25, -0.08, -2.8);
    rightWingGroup.add(rightNacelle);

    const rightExhaust = new THREE.Mesh(
      new THREE.ConeGeometry(0.32, 1.2, 12),
      new THREE.MeshBasicMaterial({ color: 0x00ffc8, transparent: true, opacity: 0.9 })
    );
    rightExhaust.rotation.x = -Math.PI / 2;
    rightExhaust.position.set(1.25, -0.08, -4.1);
    this.shipThrusterRight = rightExhaust;
    rightWingGroup.add(rightExhaust);

    // Add Right Wing
    this.shipGroup.add(rightWingGroup);

    // Mirror Left Wing Group for 100% Precision Symmetry
    const leftWingGroup = rightWingGroup.clone(true);
    leftWingGroup.scale.set(-1, 1, 1);

    // Assign left thruster
    leftWingGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial && child.material.color.getHex() === 0x00ffc8) {
        this.shipThrusterLeft = child;
      }
    });
    this.shipGroup.add(leftWingGroup);

    // 6. Floating Graviton Anti-Gravity Propulsion Ring
    const gravitonRingGeo = new THREE.TorusGeometry(1.68, 0.085, 12, 36);
    this.shipPropulsionRing = new THREE.Mesh(gravitonRingGeo, alienGlowMat);
    this.shipPropulsionRing.position.set(0, -0.02, -2.4);
    this.shipGroup.add(this.shipPropulsionRing);
  }

  private buildShuttleSpaceship(): void {
    const whiteHullMat = new THREE.MeshStandardMaterial({
      color: 0xebf1f5,
      roughness: 0.3,
      metalness: 0.45,
      side: THREE.DoubleSide
    });
    const blackTileMat = new THREE.MeshStandardMaterial({
      color: 0x1a232e,
      roughness: 0.85,
      metalness: 0.2,
      side: THREE.DoubleSide
    });
    const glassCanopyMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.4,
      roughness: 0.1,
      transparent: true,
      opacity: 0.85
    });
    const rocketEngineMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.4, metalness: 0.8 });
    const rocketFlameMat = new THREE.MeshBasicMaterial({ color: 0xff9900 });

    // 1. Aerodynamic Cylindrical Fuselage
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.95, 3.8, 16), whiteHullMat);
    body.rotation.x = Math.PI / 2;
    body.position.set(0, 0, 0);
    body.castShadow = !this.isSoftwareGl;
    this.shipGroup.add(body);

    // Black Ceramic Thermal Shield Belly
    const belly = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.96, 3.82, 16, 1, false, Math.PI * 0.8, Math.PI * 1.4), blackTileMat);
    belly.rotation.x = Math.PI / 2;
    belly.position.set(0, -0.02, 0);
    this.shipGroup.add(belly);

    // Smooth Aerodynamic Nose Cone
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.4, 16), blackTileMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 0, 2.5);
    this.shipGroup.add(nose);

    // Cockpit Flight Deck
    const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.68, 14, 12, 0, Math.PI * 2, 0, Math.PI / 2.2), glassCanopyMat);
    cockpit.position.set(0, 0.22, 1.4);
    cockpit.scale.set(0.9, 0.6, 1.2);
    this.shipGroup.add(cockpit);

    // 2. Symmetric Delta Wings
    // Right Wing Assembly (side = +1)
    const rightWingGroup = new THREE.Group();

    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 1.2);
    wingShape.lineTo(2.8, -1.2);
    wingShape.lineTo(2.6, -1.8);
    wingShape.lineTo(0, -1.5);
    wingShape.closePath();

    const wingMesh = new THREE.Mesh(
      new THREE.ExtrudeGeometry(wingShape, { depth: 0.1, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02 }),
      whiteHullMat
    );
    wingMesh.rotation.x = Math.PI / 2;
    wingMesh.position.set(0, -0.05, 0.2);
    wingMesh.castShadow = !this.isSoftwareGl;
    rightWingGroup.add(wingMesh);

    // Black Leading Edge Thermal Tiles
    const leadingEdge = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.4, 8), blackTileMat);
    leadingEdge.rotation.z = -0.95;
    leadingEdge.rotation.x = 0.22;
    leadingEdge.position.set(1.4, -0.1, 0.1);
    rightWingGroup.add(leadingEdge);

    // Green Right Navigation Light
    const rightNavLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0x22c55e })
    );
    rightNavLight.position.set(2.75, -0.05, -1.0);
    rightWingGroup.add(rightNavLight);

    // Engine Pod & Rocket Flame
    const enginePod = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 1.2, 10), rocketEngineMat);
    enginePod.rotation.x = Math.PI / 2;
    enginePod.position.set(0.48, -0.05, -2.1);
    rightWingGroup.add(enginePod);

    const rightFlame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.7, 8), rocketFlameMat);
    rightFlame.rotation.x = -Math.PI / 2;
    rightFlame.position.set(0.48, -0.05, -2.85);
    this.shipThrusterRight = rightFlame;
    rightWingGroup.add(rightFlame);

    this.shipGroup.add(rightWingGroup);

    // Left Wing Assembly (mirrored for 100% precision)
    const leftWingGroup = rightWingGroup.clone(true);
    leftWingGroup.scale.set(-1, 1, 1);

    // Fix Red Left Navigation Light & Assign Thruster
    leftWingGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry instanceof THREE.SphereGeometry) {
        child.material = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      } else if (child instanceof THREE.Mesh && child.geometry instanceof THREE.ConeGeometry && child.material instanceof THREE.MeshBasicMaterial) {
        this.shipThrusterLeft = child;
      }
    });
    this.shipGroup.add(leftWingGroup);

    // 2.5 Add Auxiliary Weapon Pods (Shuttle conversion for combat)
    const podGeo = new THREE.CylinderGeometry(0.15, 0.18, 1.4, 8);
    const podMat = whiteHullMat.clone();
    for (const side of [-1, 1]) {
      const pod = new THREE.Mesh(podGeo, podMat);
      pod.rotation.x = Math.PI / 2;
      pod.position.set(side * 0.8, -0.6, 0.5);
      this.shipGroup.add(pod);

      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6), rocketEngineMat);
      nozzle.rotation.x = Math.PI / 2;
      nozzle.position.set(side * 0.8, -0.6, 1.3);
      this.shipGroup.add(nozzle);
    }


    // 3. Strictly Centered Vertical Tail Fin (X = 0 Centerline)
    const tailFinShape = new THREE.Shape();
    tailFinShape.moveTo(0, 0);
    tailFinShape.lineTo(0, 1.6);
    tailFinShape.lineTo(-1.2, 1.2);
    tailFinShape.lineTo(-1.5, 0);
    tailFinShape.closePath();

    const tailFinGeo = new THREE.ExtrudeGeometry(tailFinShape, { depth: 0.08, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02 });
    const tailFin = new THREE.Mesh(tailFinGeo, whiteHullMat);
    tailFin.rotation.y = Math.PI / 2; // Rotate so shape Y is vertical height and shape X extends backward
    tailFin.position.set(-0.04, 0.65, -0.6); // Centered depth across X=0
    this.shipGroup.add(tailFin);

    // Top Central OMS Engine & Rocket Flame
    const topEngine = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 1.2, 10), rocketEngineMat);
    topEngine.rotation.x = Math.PI / 2;
    topEngine.position.set(0, 0.35, -2.1);
    this.shipGroup.add(topEngine);

    const topFlame = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.8, 8), rocketFlameMat);
    topFlame.rotation.x = -Math.PI / 2;
    topFlame.position.set(0, 0.35, -2.9);
    this.shipGroup.add(topFlame);
  }

  private buildViperSpaceship(): void {
    const armorMat = new THREE.MeshStandardMaterial({
      color: 0x18202c,
      roughness: 0.28,
      metalness: 0.88,
      side: THREE.DoubleSide
    });
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x2e3d54,
      roughness: 0.35,
      metalness: 0.75,
      side: THREE.DoubleSide
    });
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.6,
      roughness: 0.12,
      metalness: 0.9,
      transparent: true,
      opacity: 0.9
    });
    const ionNacelleMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
      metalness: 0.85
    });
    const ionFlameMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.95
    });
    const laserMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 1.2
    });

    // 1. Sleek Knife-Edge Fuselage Body
    const bodyGeo = new THREE.ConeGeometry(0.78, 4.4, 4);
    const body = new THREE.Mesh(bodyGeo, armorMat);
    body.rotation.x = Math.PI / 2;
    body.rotation.y = Math.PI / 4;
    body.scale.set(1.4, 1.0, 0.45);
    body.position.set(0, 0, 0.6);
    body.castShadow = !this.isSoftwareGl;
    body.receiveShadow = !this.isSoftwareGl;
    this.shipGroup.add(body);

    // High-Tech Amber Cockpit Visor
    const canopyGeo = new THREE.SphereGeometry(0.48, 14, 10);
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.scale.set(0.72, 0.42, 1.6);
    canopy.position.set(0, 0.24, 0.8);
    this.shipGroup.add(canopy);

    // 2. Symmetric Tactical Wings & Weaponry
    const rightWingGroup = new THREE.Group();

    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0.8);
    wingShape.lineTo(3.6, -1.4);
    wingShape.lineTo(3.8, -1.8);
    wingShape.lineTo(1.2, -1.5);
    wingShape.lineTo(0, -1.2);
    wingShape.closePath();

    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03 });
    const wing = new THREE.Mesh(wingGeo, armorMat);
    wing.rotation.x = Math.PI / 2;
    wing.position.set(0, -0.04, 0.2);
    wing.castShadow = !this.isSoftwareGl;
    rightWingGroup.add(wing);

    // Wingtip Heavy Laser Cannon & Plasma Muzzle
    const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.8, 8), frameMat);
    cannon.rotation.x = Math.PI / 2;
    cannon.position.set(3.7, -0.05, -0.5);
    rightWingGroup.add(cannon);

    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), laserMat);
    muzzle.position.set(3.7, -0.05, 0.45);
    rightWingGroup.add(muzzle);

    // Missile Rack under wing
    const rack = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.08, 1.2), frameMat);
    rack.position.set(2.0, -0.2, -0.2);
    rightWingGroup.add(rack);

    const miniMissile = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 6), ionNacelleMat);
    miniMissile.rotation.x = Math.PI / 2;
    miniMissile.position.set(2.0, -0.28, -0.1);
    rightWingGroup.add(miniMissile);


    // Angled Canted Vertical Stabilizer
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0);
    finShape.lineTo(0, 1.2);
    finShape.lineTo(-0.9, 0.9);
    finShape.lineTo(-1.1, 0);
    finShape.closePath();

    const fin = new THREE.Mesh(new THREE.ExtrudeGeometry(finShape, { depth: 0.06 }), armorMat);
    fin.position.set(1.1, 0.2, -0.8);
    fin.rotation.z = -0.25;
    rightWingGroup.add(fin);

    // Heavy Ion Thruster Pod & Blue Plasma Cone
    const engineNacelle = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 2.2, 12), ionNacelleMat);
    engineNacelle.rotation.x = Math.PI / 2;
    engineNacelle.position.set(0.85, 0.02, -2.2);
    rightWingGroup.add(engineNacelle);

    const rightExhaust = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.1, 12), ionFlameMat);
    rightExhaust.rotation.x = -Math.PI / 2;
    rightExhaust.position.set(0.85, 0.02, -3.3);
    this.shipThrusterRight = rightExhaust;
    rightWingGroup.add(rightExhaust);

    this.shipGroup.add(rightWingGroup);

    // Mirror Left Wing for 100% Precise Symmetry
    const leftWingGroup = rightWingGroup.clone(true);
    leftWingGroup.scale.set(-1, 1, 1);

    leftWingGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry instanceof THREE.ConeGeometry && child.material instanceof THREE.MeshBasicMaterial) {
        this.shipThrusterLeft = child;
      }
    });
    this.shipGroup.add(leftWingGroup);
  }

  private buildAlienFighter(): THREE.Group {
    const ship = new THREE.Group();

    // Hostile Crimson Alien Scout Fighter Materials
    const alienArmorMat = new THREE.MeshStandardMaterial({ color: 0x1f090d, roughness: 0.2, metalness: 0.9, side: THREE.DoubleSide });
    const crimsonPlatingMat = new THREE.MeshStandardMaterial({ color: 0x881337, roughness: 0.3, metalness: 0.8, side: THREE.DoubleSide });
    const redGlowMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 1.8, roughness: 0.1 });
    const redFlameMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.9 });

    // 1. Central Jagged Bio-Thorax
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.7, 3.8, 6), alienArmorMat);
    body.rotation.x = Math.PI / 2;
    body.position.set(0, 0, 0.2);
    ship.add(body);

    // Glowing Sensor Eye
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), redGlowMat);
    eye.position.set(0, 0.12, 1.6);
    ship.add(eye);

    // 2. Symmetric Forward-Swept Crimson Blades
    const rightWingGroup = new THREE.Group();

    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(2.2, -0.4);
    wingShape.lineTo(4.2, 1.2);
    wingShape.lineTo(3.6, 1.8);
    wingShape.lineTo(1.8, 0.6);
    wingShape.closePath();

    const wingMesh = new THREE.Mesh(
      new THREE.ExtrudeGeometry(wingShape, { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03 }),
      crimsonPlatingMat
    );
    wingMesh.rotation.x = Math.PI / 2;
    wingMesh.position.set(0, -0.04, 0.1);
    rightWingGroup.add(wingMesh);

    // Engine Nacelle & Red Exhaust Cone
    const nacelle = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.32, 1.8, 10), alienArmorMat);
    nacelle.rotation.x = Math.PI / 2;
    nacelle.position.set(0.75, 0, -1.8);
    rightWingGroup.add(nacelle);

    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.9, 10), redFlameMat);
    flame.rotation.x = -Math.PI / 2;
    flame.position.set(0.75, 0, -2.7);
    rightWingGroup.add(flame);

    ship.add(rightWingGroup);

    ship.traverse(object => {
      if ((object as THREE.Mesh).isMesh) object.castShadow = !this.isSoftwareGl;
    });
    return ship;
  }

  private destroyEnemyFighter(hitIndex: number): void {
    const target = this.alienFighters[hitIndex];
    if (!target) return;
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

  }

  spawnExplosion(
    pos: THREE.Vector3,
    type: 'catastrophic' | 'impact' | 'shield' | 'asteroid' | 'structure' | 'glitch',
    colorHex = 0xff6600,
    scaleMult = 1.0
  ): void {
    const group = new THREE.Group();
    group.position.copy(pos);

    let maxLife = 0.6;
    let light: THREE.PointLight | undefined;
    let fireball: THREE.Mesh | undefined;
    let shockwave: THREE.Mesh | undefined;
    const particles: { mesh: THREE.Mesh; velocity: THREE.Vector3; rotSpeed: THREE.Vector3 }[] = [];

    if (type === 'catastrophic') {
      maxLife = 1.2 * scaleMult;
      const fireballMat = this.getCachedExplosionMat(colorHex, true, 0.95);
      fireball = new THREE.Mesh(this.sharedGeos.sphere, fireballMat);
      fireball.userData['baseScale'] = 1.2 * scaleMult;
      group.add(fireball);

      const ringMat = this.getCachedExplosionMat(0xffaa00, true, 0.8);
      shockwave = new THREE.Mesh(this.sharedGeos.torus, ringMat);
      shockwave.rotation.x = Math.PI / 2;
      shockwave.userData['baseScale'] = 1.5 * scaleMult;
      group.add(shockwave);

      const shardMat = this.getCachedExplosionMat(0xff4400, false);
      const numShards = Math.floor(15 * scaleMult); // Reduced count for stability
      for (let i = 0; i < numShards; i++) {
        const shardSize = (0.15 + Math.random() * 0.35) * scaleMult;
        const mesh = new THREE.Mesh(Math.random() > 0.5 ? this.sharedGeos.tetra : this.sharedGeos.box, shardMat);
        mesh.scale.set(shardSize, shardSize, shardSize);
        const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
        const speed = (12 + Math.random() * 24) * scaleMult;
        const velocity = dir.multiplyScalar(speed);
        const rotSpeed = new THREE.Vector3((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12);
        group.add(mesh);
        particles.push({ mesh, velocity, rotSpeed });
      }

      if (this.activeLightsCount < this.MAX_EXPLOSION_LIGHTS) {
        light = new THREE.PointLight(colorHex, 10 * scaleMult, 45 * scaleMult);
        group.add(light);
        this.activeLightsCount++;
      }
      this.playExplosionSound('big');
      this.cameraShakeIntensity = Math.max(this.cameraShakeIntensity, 0.9 * scaleMult);

    } else if (type === 'impact') {
      maxLife = 0.45 * scaleMult;
      const sparkMat = this.getCachedExplosionMat(colorHex, true, 0.9);
      for (let i = 0; i < 8; i++) {
        const mesh = new THREE.Mesh(this.sharedGeos.box, sparkMat);
        mesh.scale.set(0.08, 0.08, 0.3);
        const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
        const velocity = dir.multiplyScalar((15 + Math.random() * 18) * scaleMult);
        const rotSpeed = new THREE.Vector3(Math.random() * 8, Math.random() * 8, 0);
        group.add(mesh);
        particles.push({ mesh, velocity, rotSpeed });
      }
      this.playExplosionSound('medium');

    } else if (type === 'shield') {
      maxLife = 0.4 * scaleMult;
      const domeMat = this.getCachedExplosionMat(0x38bdf8, true, 0.7);
      fireball = new THREE.Mesh(this.sharedGeos.sphere, domeMat);
      fireball.userData['baseScale'] = 2.2 * scaleMult;
      group.add(fireball);

      const ringMat = this.getCachedExplosionMat(0x7dd3fc, true, 0.85);
      shockwave = new THREE.Mesh(this.sharedGeos.torus, ringMat);
      shockwave.userData['baseScale'] = 2.3 * scaleMult;
      group.add(shockwave);
      this.playExplosionSound('shield');

    } else if (type === 'asteroid') {
      maxLife = 0.75 * scaleMult;
      const rockMat = this.getCachedExplosionMat(0x64748b, false);
      for (let i = 0; i < 10; i++) {
        const size = (0.2 + Math.random() * 0.4) * scaleMult;
        const mesh = new THREE.Mesh(this.sharedGeos.dodeca, rockMat);
        mesh.scale.set(size, size, size);
        const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
        const velocity = dir.multiplyScalar((10 + Math.random() * 16) * scaleMult);
        const rotSpeed = new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10);
        group.add(mesh);
        particles.push({ mesh, velocity, rotSpeed });
      }
      this.playExplosionSound('crunch');

    } else if (type === 'structure') {
      maxLife = 0.65 * scaleMult;
      const cyanMat = this.getCachedExplosionMat(0x00f5d4, true, 0.95);
      for (let i = 0; i < 12; i++) {
        const mesh = new THREE.Mesh(this.sharedGeos.box, cyanMat);
        mesh.scale.set(0.1, 0.1, 0.4);
        const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
        const velocity = dir.multiplyScalar((14 + Math.random() * 20) * scaleMult);
        const rotSpeed = new THREE.Vector3(Math.random() * 12, Math.random() * 12, 0);
        group.add(mesh);
        particles.push({ mesh, velocity, rotSpeed });
      }
      const ringMat = this.getCachedExplosionMat(0x00f5d4, true, 0.85);
      shockwave = new THREE.Mesh(this.sharedGeos.torus, ringMat);
      shockwave.rotation.x = Math.PI / 2;
      shockwave.userData['baseScale'] = 2.0 * scaleMult;
      group.add(shockwave);
      this.playExplosionSound('shield');

    } else if (type === 'glitch') {
      maxLife = 0.3 * scaleMult;
      const glitchMat = this.getCachedExplosionMat(colorHex, true, 0.8);
      for (let i = 0; i < 6; i++) {
        const mesh = new THREE.Mesh(this.sharedGeos.plane, glitchMat);
        mesh.scale.set(0.1, 1.2, 1.0);
        const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        const velocity = dir.multiplyScalar(5 * scaleMult);
        const rotSpeed = new THREE.Vector3(0, 0, 10);
        group.add(mesh);
        particles.push({ mesh, velocity, rotSpeed });
      }
      this.playExplosionSound('shield');
    }

    this.scene.add(group);
    this.activeExplosions.push({ group, light, particles, shockwave, fireball, elapsed: 0, maxLife });
  }

  private updateExplosions(delta: number): void {
    for (let i = this.activeExplosions.length - 1; i >= 0; i--) {
      const exp = this.activeExplosions[i];
      exp.elapsed += delta;
      const progress = exp.elapsed / exp.maxLife;

      if (progress >= 1.0) {
        this.scene.remove(exp.group);
        if (exp.light) {
          exp.light.dispose();
          this.activeLightsCount--;
        }
        this.activeExplosions.splice(i, 1);
        continue;
      }

      const fade = 1 - progress;

      if (exp.fireball) {
        const s = exp.fireball.userData['baseScale'] * (1.0 + progress * 2.5);
        exp.fireball.scale.set(s, s, s);
        if (exp.fireball.material instanceof THREE.Material) exp.fireball.material.opacity = fade * 0.9;
      }

      if (exp.shockwave) {
        const s = exp.shockwave.userData['baseScale'] * (1.0 + progress * 4.5);
        exp.shockwave.scale.set(s, s, s);
        if (exp.shockwave.material instanceof THREE.Material) exp.shockwave.material.opacity = fade * 0.75;
      }

      for (const p of exp.particles) {
        p.mesh.position.addScaledVector(p.velocity, delta);
        p.mesh.rotation.x += p.rotSpeed.x * delta;
        p.mesh.rotation.y += p.rotSpeed.y * delta;
        p.mesh.rotation.z += p.rotSpeed.z * delta;
        if (p.mesh.material instanceof THREE.Material) p.mesh.material.opacity = fade;
      }

      if (exp.light) {
        exp.light.intensity = fade * 8.0;
      }
    }
  }

  private playExplosionSound(type: 'big' | 'medium' | 'small' | 'shield' | 'crunch'): void {
    if (!this.soundEnabled() || !this.audioCtx) return;
    try {
      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      if (type === 'shield') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.25);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.26);
        return;
      }

      const bufferSize = ctx.sampleRate * (type === 'big' ? 0.6 : 0.35);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = type === 'crunch' ? 'bandpass' : 'lowpass';
      filter.frequency.setValueAtTime(type === 'big' ? 300 : type === 'medium' ? 600 : 900, now);
      filter.frequency.exponentialRampToValueAtTime(40, now + (type === 'big' ? 0.6 : 0.35));

      const gain = ctx.createGain();
      const vol = type === 'big' ? 0.35 : type === 'medium' ? 0.22 : 0.15;
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (type === 'big' ? 0.6 : 0.35));

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
    } catch {
      // safe
    }
  }

  private beginStationEncounter(station: StationData): void {
    if (this.encounteredStationIds.has(station.id)) return;
    this.encounteredStationIds.add(station.id);

    if (this.gameMode() === 'free') {
      // Visual notification removed in Free Mode as per user request
      this.playChime([440, 660]);
      return;
    }

    const count = 2 + Math.floor(Math.random() * 2);
    this.spawnCombatEnemies(count);
    this.setCombatMessage(`TRANSBORDADORES ENEMIGOS DETECTADOS · ${count} EN VUELO`, 3000);
    this.playChime([480, 360]);
  }

  private setCombatMessage(text: string, duration = 3600): void {
    // 1. Instant deduplication (don't add if already in the stack)
    if (this.combatMessages().some(m => m.text === text)) return;

    // 2. Temporal deduplication (don't repeat the same message too soon after it expired)
    const now = Date.now();
    const lastTime = this.lastNotificationTimes.get(text) || 0;
    if (now - lastTime < duration + 1000) return; 
    this.lastNotificationTimes.set(text, now);

    const id = this.nextMessageId++;
    this.combatMessages.update(msgs => [...msgs, { id, text }]);
    const timerId = setTimeout(() => {
      this.messageTimeouts.delete(timerId);
      if (!this.isDestroyed) {
        this.combatMessages.update(msgs => msgs.filter(m => m.id !== id));
      }
    }, duration);
    this.messageTimeouts.add(timerId);
  }

  firePlayerWeapons(): void {
    if (this.combatCooldown > 0) return;
    this.combatCooldown = 0.16;
    const cosPitch = Math.cos(this.shipPitch);
    const forward = new THREE.Vector3(
      Math.sin(this.shipRotationY) * cosPitch,
      -Math.sin(this.shipPitch),
      Math.cos(this.shipRotationY) * cosPitch
    );
    const lateral = new THREE.Vector3(Math.cos(this.shipRotationY), 0, -Math.sin(this.shipRotationY));
    const direction = forward.clone().normalize();
    for (const side of [-1, 1]) {
      const origin = this.shipPosition.clone().addScaledVector(forward, 2.4).addScaledVector(lateral, side * 1.1);
      
      const boltGroup = new THREE.Group();
      
      // Main core bolt
      const bolt = new THREE.Mesh(this.sharedGeos.cylinder, this.getCachedExplosionMat(0xffffff, false));
      bolt.scale.set(0.025, 3.5, 0.025);
      bolt.rotation.x = Math.PI / 2;
      boltGroup.add(bolt);

      // Outer glow
      const glow = new THREE.Mesh(this.sharedGeos.cylinder, this.getCachedExplosionMat(0x00f5d4, true, 0.4));
      glow.scale.set(0.08, 3.8, 0.08);
      glow.rotation.x = Math.PI / 2;
      boltGroup.add(glow);

      boltGroup.position.copy(origin);
      boltGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
      this.scene.add(boltGroup);
      
      // We use the group as the mesh for the physics system
      this.combatBolts.push({ 
        mesh: boltGroup as unknown as THREE.Mesh, 
        velocity: direction.clone().multiplyScalar(135), 
        remaining: 2.5, 
        side: 'player' 
      });
    }
    this.playChime([720, 540]);
  }

  fireMissile(): void {
    if (this.missileCooldown > 0 || this.alienFighters.length === 0) return;
    this.missileCooldown = 2.0; // 2 seconds between missiles

    // Find nearest target
    let nearest: AlienFighter | null = null;
    let minDist = Infinity;
    for (const f of this.alienFighters) {
      const d = f.group.position.distanceTo(this.shipPosition);
      if (d < minDist) {
        minDist = d;
        nearest = f;
      }
    }

    const missileGroup = new THREE.Group();
    const body = new THREE.Mesh(this.sharedGeos.cylinder, this.getCachedExplosionMat(0x334155, false));
    body.scale.set(0.12, 1.2, 0.12);
    body.rotation.x = Math.PI / 2;
    missileGroup.add(body);

    const tip = new THREE.Mesh(this.sharedGeos.cone, this.getCachedExplosionMat(0xef4444, false));
    tip.scale.set(0.12, 0.4, 0.12);
    tip.position.z = 0.8;
    tip.rotation.x = Math.PI / 2;
    missileGroup.add(tip);

    const trail = new THREE.Mesh(this.sharedGeos.cone, this.getCachedExplosionMat(0x00f5d4, true, 0.4));
    trail.scale.set(0.15, 1.8, 0.15);
    trail.position.z = -1.2;
    trail.rotation.x = -Math.PI / 2;
    missileGroup.add(trail);

    const pointLight = new THREE.PointLight(0x00f5d4, 2, 10);
    pointLight.position.z = -0.5;
    missileGroup.add(pointLight);

    missileGroup.position.copy(this.shipPosition).add(new THREE.Vector3(0, -0.8, 1).applyQuaternion(this.shipGroup.quaternion));
    this.scene.add(missileGroup);

    this.combatMissiles.push({
      mesh: missileGroup,
      velocity: new THREE.Vector3(0, 0, 15).applyQuaternion(this.shipGroup.quaternion),
      target: nearest,
      life: 5.0
    });

    this.setCombatMessage('🚀 MISIL TELEDIRIGIDO LANZADO', 2000);
    this.playChime([300, 450, 600]);
  }

  private fireAlienWeapons(fighter: AlienFighter): void {
    const direction = this.shipPosition.clone().add(new THREE.Vector3(0, 0.3, 0)).sub(fighter.group.position).normalize();
    
    const boltGroup = new THREE.Group();
    
    const core = new THREE.Mesh(this.sharedGeos.cylinder, this.getCachedExplosionMat(0xffffff, false));
    core.scale.set(0.04, 1.8, 0.04);
    core.rotation.x = Math.PI / 2;
    boltGroup.add(core);

    const glow = new THREE.Mesh(this.sharedGeos.cylinder, this.getCachedExplosionMat(0xff4400, true, 0.3));
    glow.scale.set(0.12, 2.0, 0.12);
    glow.rotation.x = Math.PI / 2;
    boltGroup.add(glow);

    boltGroup.position.copy(fighter.group.position).addScaledVector(direction, 2.2);
    boltGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
    this.scene.add(boltGroup);
    
    this.combatBolts.push({ 
      mesh: boltGroup as unknown as THREE.Mesh, 
      velocity: direction.multiplyScalar(48), 
      remaining: 4.5, 
      side: 'hostile' 
    });
  }

  private updateCombat(delta: number): void {
    if (this.gameMode() !== 'combat') return;

    this.combatCooldown = Math.max(0, this.combatCooldown - delta);
    this.missileCooldown = Math.max(0, this.missileCooldown - delta);
    this.hullRegenCooldown = Math.max(0, this.hullRegenCooldown - delta);
    
    // Auto-regen faster to compensate for removing death, and keep health near 100
    this.hullIntegrity.update(v => Math.min(100, v + delta * 15));

    // Periodic enemy reinforcements every 40 seconds in combat mode
    this.combatReinforcementTimer += delta;
    if (this.combatReinforcementTimer >= 40) {
      this.combatReinforcementTimer = 0;
      const reinforcementCount = 2 + Math.floor(this.waveNumber() * 0.5);
      this.spawnCombatEnemies(reinforcementCount);
      this.setCombatMessage(`⚡ ¡TANDA DE REFUERZOS ENEMIGOS ENTRANDO EN ÓRBITA (+${reinforcementCount})!`, 3500);
      this.playChime([440, 550, 770]);
    }

    // Check if current wave is cleared -> advance wave
    if (this.alienFighters.length === 0) {
      this.waveNumber.update(v => v + 1);
      // Slower growth: start at 3, increase every 2 waves
      const nextCount = 3 + Math.floor((this.waveNumber() - 1) / 2);
      this.spawnCombatEnemies(nextCount);
      this.setCombatMessage((this.cfg.waveClearedMessage || '🚀 ¡NUEVA OLEADA ENTRANTE!') + ` (OLEADA ${this.waveNumber()})`, 4500);
      this.playChime([523, 659, 784, 1046, 1318]);
    }

    if ((this.keysPressed['f'] || this.touchState.fire) && this.combatCooldown <= 0) {
      this.firePlayerWeapons();
    }

    const diffFactor = 1.0 + (this.waveNumber() - 1) * 0.2;

    for (let fIdx = 0; fIdx < this.alienFighters.length; fIdx++) {
      const fighter = this.alienFighters[fIdx];
      const dist = fighter.group.position.distanceTo(this.shipPosition);
      const fighterLod = determineLodLevel(dist, this.lodThresholds, this.lodEnabled());

      // If distant and throttled, skip sub-frame updates
      if (!shouldUpdateEntity(fighterLod, this.frameCounter, this.lodEnabled(), fIdx)) {
        continue;
      }
      const deltaMult = getUpdateDeltaMultiplier(fighterLod, this.lodEnabled());
      const effectiveDelta = delta * deltaMult;

      fighter.phase += effectiveDelta * (fighter.velocity.x >= 0 ? 0.32 : -0.32) * diffFactor;
      const target = new THREE.Vector3(
        this.shipPosition.x + Math.cos(fighter.phase) * fighter.orbitRadius,
        this.shipPosition.y + Math.sin(this.elapsedTime * 1.2 + fighter.phase) * fighter.orbitRadius * 0.4,
        this.shipPosition.z + Math.sin(fighter.phase) * fighter.orbitRadius
      );
      const toTarget = target.sub(fighter.group.position);
      const desiredVelocity = toTarget.lengthSq() > 0.01 ? toTarget.normalize().multiplyScalar(9.5 * diffFactor) : new THREE.Vector3();
      fighter.velocity.lerp(desiredVelocity, Math.min(1, effectiveDelta * 1.8));
      fighter.group.position.addScaledVector(fighter.velocity, effectiveDelta);
      fighter.group.lookAt(this.shipPosition.x, this.shipPosition.y + 0.2, this.shipPosition.z);
      fighter.group.rotation.z = Math.sin(this.elapsedTime * 1.8 + fighter.phase) * 0.1;
      fighter.fireCooldown -= effectiveDelta;
      if (fighter.fireCooldown <= 0 && dist < 115) {
        this.fireAlienWeapons(fighter);
        // Enemies shoot MUCH less: (5.0 to 8.0 seconds cooldown)
        fighter.fireCooldown = (5.0 + Math.random() * 3.0) / diffFactor;
      }
    }

    // Update Guided Missiles
    for (let i = this.combatMissiles.length - 1; i >= 0; i--) {
      const m = this.combatMissiles[i];
      m.life -= delta;
      
      if (m.target && this.alienFighters.includes(m.target)) {
        const toTarget = m.target.group.position.clone().sub(m.mesh.position).normalize();
        m.velocity.lerp(toTarget.multiplyScalar(35), delta * 4.0);
        m.mesh.lookAt(m.target.group.position);
      } else {
        // Find new target if lost
        let nearest: AlienFighter | null = null;
        let minDist = Infinity;
        for (const f of this.alienFighters) {
          const d = f.group.position.distanceTo(m.mesh.position);
          if (d < minDist) {
            minDist = d;
            nearest = f;
          }
        }
        m.target = nearest;
      }

      m.mesh.position.addScaledVector(m.velocity, delta);

      let hit = false;
      const hitIndex = this.alienFighters.findIndex(f => m.mesh.position.distanceTo(f.group.position) < 3.5);
      if (hitIndex >= 0) {
        const target = this.alienFighters[hitIndex];
        this.spawnExplosion(m.mesh.position.clone(), 'catastrophic', 0x38bdf8, 2.5);
        this.destroyEnemyFighter(hitIndex);
        this.setCombatMessage('🚀 ¡IMPACTO DE MISIL!', 2000);
        hit = true;
      }

      if (hit || m.life <= 0) {
        this.scene.remove(m.mesh);
        m.mesh.traverse(obj => {
          if ((obj as THREE.Mesh).isMesh) {
            (obj as THREE.Mesh).geometry.dispose();
            ((obj as THREE.Mesh).material as THREE.Material).dispose();
          }
        });
        this.combatMissiles.splice(i, 1);
      }
    }

    for (let boltIndex = this.combatBolts.length - 1; boltIndex >= 0; boltIndex--) {
      const bolt = this.combatBolts[boltIndex];
      bolt.remaining -= delta;
      bolt.mesh.position.addScaledVector(bolt.velocity, delta);
      let consumed = bolt.remaining <= 0;

      if (!consumed && bolt.side === 'hostile' && !this.isRespawning() && bolt.mesh.position.distanceTo(this.shipPosition) < 2.2) {
        // Player is effectively immortal now as requested, just shake camera
        this.cameraShakeIntensity = Math.max(this.cameraShakeIntensity, 0.2);
        this.setCombatMessage(this.cfg.shieldImpactMessage || '🛡️ IMPACTO ABSORBIDO', 1000);
        consumed = true;
      } else if (!consumed && bolt.side === 'player') {
        const hitIndex = this.alienFighters.findIndex(fighter => bolt.mesh.position.distanceTo(fighter.group.position) < 2.6);
        if (hitIndex >= 0) {
          const target = this.alienFighters[hitIndex];
          target.integrity -= 1;
          const hitPos = bolt.mesh.position.clone();

          if (target.integrity <= 0) {
            this.spawnExplosion(hitPos, 'catastrophic', 0xff3300, 1.8);
            this.destroyEnemyFighter(hitIndex);
            this.setCombatMessage((this.cfg.enemyDestroyedMessage || '💥 HOSTIL DERRIBADO') + `! (OLEADA ${this.waveNumber()} · DERRIBOS: ${this.enemiesDestroyed()})`, 2500);
          } else {
            this.spawnExplosion(hitPos, 'impact', 0xffcc00, 1.0);
            const hull = target.group.children[0] as THREE.Mesh;
            if (hull && hull.material instanceof THREE.MeshStandardMaterial) hull.material.emissive.setHex(0xff3300);
          }
          consumed = true;
        }
      }

      if (consumed) {
        this.scene.remove(bolt.mesh);
        // Disposal is now handled by the pooling system (geometries and materials are shared)
        // We only remove the group from the scene.
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
    if (key === 'g' && !e.repeat) {
      this.fireMissile();
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
      this.lastPointerLockRelease = Date.now();
    }
  };

  private onMouseMove = (event: MouseEvent): void => {
    if (document.pointerLockElement !== this.renderer?.domElement) return;

    const sensitivityX = 0.0018; // Slightly reduced yaw sensitivity
    const sensitivityY = 0.0035; // Increased pitch sensitivity
    const yMultiplier = this.invertY() ? -1 : 1;
    // Mouse horizontal: moving right turns ship right, moving left turns ship left
    this.shipRotationY -= event.movementX * sensitivityX;
    // Mouse vertical: moving up (negative movementY) pitches nose UP, moving down pitches nose DOWN
    this.shipPitch = THREE.MathUtils.clamp(
      this.shipPitch + yMultiplier * event.movementY * sensitivityY,
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

  private lastPointerLockRelease = 0;

  captureMouse(event: MouseEvent): void {
    if (!this.hasMouseControl() || event.target !== this.renderer?.domElement || document.pointerLockElement) return;
    
    // Prevent immediate re-acquisition error (browser security policy)
    // 1.3s is a safer threshold for most browsers to reset their pointer lock permission state.
    const now = Date.now();
    if (now - this.lastPointerLockRelease < 1300) return;

    if (this.cameraMode() === 'top' || this.cameraMode() === 'cinematic') this.setCameraMode('chase');
    
    try {
      const el = this.renderer.domElement;
      // Modern browsers return a promise
      const promise = el.requestPointerLock() as any;
      if (promise && promise.catch) {
        promise.catch((err: any) => {
          console.warn('Pointer lock request rejected:', err);
          this.isPointerLocked.set(false);
        });
      }
    } catch (err) {
      console.warn('Pointer lock request failed:', err);
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
    this.hullIntegrity.set(100);
    this.isRespawning.set(false);
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

    if (this.transitInterval) {
      clearInterval(this.transitInterval);
      this.transitInterval = null;
    }

    this.transitInterval = setInterval(() => {
      if (this.isDestroyed) {
        if (this.transitInterval) {
          clearInterval(this.transitInterval);
          this.transitInterval = null;
        }
        return;
      }

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
        if (this.transitInterval) {
          clearInterval(this.transitInterval);
          this.transitInterval = null;
        }
        this.shipPosition.copy(target);
        this.shipSpeed = 0;
        this.shipRotationY = 0;
        this.shipPitch = 0;
        this.dockedStation.set(st);
        this.beginStationEncounter(st);
        this.isTransiting.set(false);
        this.refreshLodMetrics();
        this.playChime([440, 554, 659]);
      }
    }, 20);
  }

  setCameraMode(mode: 'chase' | 'cockpit' | 'top' | 'cinematic'): void {
    this.cameraMode.set(mode);
    this.isCinema.set(mode === 'cinematic');
  }

  async onLoadCustomGlb(event: any): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;

    this.customGlbName.set(file.name);
    try {
      const idbKey = `in_game_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      await saveModelToDB(idbKey, file);
      const blobUrl = URL.createObjectURL(file);
      this.loadGlbFromUrl(blobUrl, file.name);
    } catch (err) {
      console.warn('Fallback loading directly via ObjectURL:', err);
      const blobUrl = URL.createObjectURL(file);
      this.loadGlbFromUrl(blobUrl, file.name);
    }
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

        // Dual thruster flames attached at the rear of the loaded 3D vessel
        const thrusterMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 });
        const flameL = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.8, 8), thrusterMat);
        flameL.rotation.x = -Math.PI / 2;
        flameL.position.set(-0.6, 0, -2.0);
        const flameR = flameL.clone();
        flameR.position.x = 0.6;
        this.shipThrusterLeft = flameL;
        this.shipThrusterRight = flameR;
        this.shipGroup.add(flameL);
        this.shipGroup.add(flameR);

        this.customGlbLoaded.set(true);
        this.customGlbName.set(name);
        this.currentShipTitle.set(name.toUpperCase());
        this.currentShipSub.set('Modelo 3D cargado desde la nube · Telemetría activa');
        this.setCombatMessage(`✓ MODELO 3D CARGADO: ${name.toUpperCase()}`, 3500);
        this.playChime([523, 659, 784, 1046]);
        this.updateCockpitOffset();
      },
      undefined,
      (error) => {
        console.error('Error loading custom .glb model:', error);
        this.setCombatMessage(`⚠ Error al cargar archivo 3D: modelo no accesible`, 4000);
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
      this.frameCounter++;

      this.updatePhysics(delta);
      this.updateCombat(delta);
      this.updateStations(delta);
      this.updateExplosions(delta);
      this.updateParticles(delta);
      this.updateShaderPilot(delta);
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
    if (this.isDestroyed) return;
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.isDestroyed) {
        if (sync) {
          try { gl.deleteSync(sync); } catch {}
        }
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.animFrameId = window.setTimeout(poll, 5);
      } else {
        if (sync) {
          try { gl.deleteSync(sync); } catch {}
        }
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
    if (this.shipThrusterLeft && this.shipThrusterRight) {
        this.shipThrusterLeft.scale.set(thrusterScale, thrusterScale * 1.5, thrusterScale);
        this.shipThrusterRight.scale.set(thrusterScale, thrusterScale * 1.5, thrusterScale);
    }

    if (this.shipSpeed > 1.5) this.emitThrusterParticle();

    // Animate alien bio-technological components
    if (this.shipPropulsionRing) {
      this.shipPropulsionRing.rotation.z += delta * 2.5;
    }
    if (this.shipBioCoreMat) {
      this.shipBioCoreMat.emissiveIntensity = 0.9 + 0.6 * Math.sin(this.elapsedTime * 4.2);
    }
    // Animate alien monoliths with distance-based LOD update throttling
    for (let m = 0; m < this.alienMonoliths.length; m++) {
      const mono = this.alienMonoliths[m];
      const dist = this.shipPosition.distanceTo(mono.position);
      const monoLod = determineLodLevel(dist, this.lodThresholds, this.lodEnabled());
      if (shouldUpdateEntity(monoLod, this.frameCounter, this.lodEnabled(), m)) {
        const deltaMult = getUpdateDeltaMultiplier(monoLod, this.lodEnabled());
        mono.rotation.y += delta * deltaMult * (0.16 + m * 0.05);
        mono.rotation.x += delta * deltaMult * 0.08;
      }
    }

    // Update collision cooldowns
    this.playerCollisionCooldown = Math.max(0, this.playerCollisionCooldown - delta);

    if (this.playerCollisionCooldown <= 0) {
      // 1. Check Asteroid Collisions with distance LOD
      for (let i = 0; i < this.asteroidsList.length; i++) {
        const ast = this.asteroidsList[i];
        const distSq = this.shipPosition.distanceToSquared(ast.position);
        // Distant asteroids (> 75 km): skip fine collision test on 7 out of 8 frames
        if (this.lodEnabled() && distSq > 5625) {
          if ((this.frameCounter + i) % 8 !== 0) continue;
        }
        const dist = Math.sqrt(distSq);
        if (dist < ast.radius + 1.8) {
          this.playerCollisionCooldown = 0.65;
          const bounceDir = this._vecA.subVectors(this.shipPosition, ast.position).normalize();
          if (bounceDir.lengthSq() < 0.01) bounceDir.set(0, 0, 1);
          this.shipVelocity.copy(bounceDir).multiplyScalar(Math.max(14, this.shipSpeed * 0.8));

          const impactPoint = this.shipPosition.clone().addScaledVector(bounceDir, -1.2);
          this.spawnExplosion(impactPoint, 'glitch', 0xff9933, 0.8);
          this.cameraShakeIntensity = 0.45;
          this.setCombatMessage('💥 IMPACTO CON ASTEROIDE · REBOTE DE SEGURIDAD', 2000);
          break;
        }
      }
    }

    if (this.playerCollisionCooldown <= 0) {
      // 2. Check Monolith Collisions
      for (const mono of this.alienMonoliths) {
        const dist = this.shipPosition.distanceTo(mono.position);
        if (dist < 6.0) {
          this.playerCollisionCooldown = 0.65;
          const bounceDir = this._vecA.subVectors(this.shipPosition, mono.position).normalize();
          this.shipVelocity.copy(bounceDir).multiplyScalar(Math.max(16, this.shipSpeed * 0.9));

          this.spawnExplosion(this.shipPosition.clone(), 'glitch', 0x00f5d4, 1.0);
          this.cameraShakeIntensity = 0.5;
          this.setCombatMessage('⚡ DESCARGA ENERGÉTICA · MONOLITO ANCESTRAL', 2000);
          break;
        }
      }
    }

    // 3. Check Orbital Station Deflector Collisions - DISABLED per user request
    /*
    if (this.playerCollisionCooldown <= 0) {
      for (const sm of this.stationMeshes) {
        const dist = this.shipPosition.distanceTo(sm.group.position);
        if (dist < 11.5) {
          this.playerCollisionCooldown = 0.7;
          const bounceDir = this._vecA.subVectors(this.shipPosition, sm.group.position).normalize();
          if (bounceDir.lengthSq() < 0.01) bounceDir.set(0, 1, 0);
          this.shipVelocity.copy(bounceDir).multiplyScalar(Math.max(16, this.shipSpeed * 0.85));

          const impactPoint = this.shipPosition.clone().addScaledVector(bounceDir, -1.0);
          this.spawnExplosion(impactPoint, 'shield', sm.data.color || 0x00f5d4, 0.7);
          this.cameraShakeIntensity = 0.4;
          this.setCombatMessage(`🛡️ CAMPO DEFLECTOR · ESTACIÓN ${sm.data.name.toUpperCase()}`, 2000);
          break;
        }
      }
    }
    */

    if (this.playerCollisionCooldown <= 0) {
      // 4. Check Ramming Enemy Fighters
      for (let i = 0; i < this.alienFighters.length; i++) {
        const fighter = this.alienFighters[i];
        const dist = this.shipPosition.distanceTo(fighter.group.position);
        if (dist < 3.2) {
          this.playerCollisionCooldown = 0.75;
          const bounceDir = this._vecA.subVectors(this.shipPosition, fighter.group.position).normalize();
          this.shipVelocity.copy(bounceDir).multiplyScalar(18);

          const hitPos = fighter.group.position.clone();
          this.spawnExplosion(hitPos, 'catastrophic', 0xff3300, 1.8);
          this.cameraShakeIntensity = 1.2;

          fighter.integrity -= 2;
          if (fighter.integrity <= 0) {
            this.destroyEnemyFighter(i);
            this.setCombatMessage('💥 NAVE ENEMIGA DESTRUIDA POR EMBESTIDA!', 2500);
          } else {
            this.setCombatMessage('💥 COLISIÓN NAVE CONTRA NAVE!', 2000);
          }
          break;
        }
      }
    }

    // 5. Sector Boundary Forcefield Barrier Collisions (Radius > 340)
    const distFromCenter = this.shipPosition.length();
    if (distFromCenter > 340 && this.playerCollisionCooldown <= 0) {
      const normal = this.shipPosition.clone().normalize().negate();
      this.shipPosition.clampLength(0, 338);
      this.shipVelocity.reflect(normal).multiplyScalar(0.75);
      this.playerCollisionCooldown = 0.5;

      this.spawnExplosion(this.shipPosition.clone(), 'glitch', 0xff0055, 1.2);
      this.cameraShakeIntensity = 0.6;
      this.setCombatMessage(this.cfg.boundaryWarningMessage || '🚨 BARRERA DE SEGURIDAD DEL SECTOR', 2200);
      this.playChime([880, 440, 220]);
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
    const distances: number[] = [];

    this.stationMeshes.forEach((sm, index) => {
      const dist = this.shipPosition.distanceTo(sm.group.position);
      distances.push(dist);

      const lodLevel = determineLodLevel(dist, this.lodThresholds, this.lodEnabled());
      sm.currentLodLevel = lodLevel;
      sm.distance = dist;

      // Update Three.js LOD geometry visibility based on camera distance
      if (this.camera) {
        sm.lod.update(this.camera);
      }

      // LOD update frequency throttling:
      // HIGH: 60Hz (every frame)
      // MEDIUM: 30Hz (every 2nd frame)
      // LOW: 15Hz (every 4th frame)
      // CULLED: update skipped
      if (shouldUpdateEntity(lodLevel, this.frameCounter, this.lodEnabled(), index)) {
        const deltaMult = getUpdateDeltaMultiplier(lodLevel, this.lodEnabled());

        if (sm.beacon) {
          sm.beacon.rotation.y += 1.2 * delta * deltaMult;
          sm.beacon.visible = showBeacons;
        }
        if (sm.mediumBeacon) {
          sm.mediumBeacon.rotation.y += 1.2 * delta * deltaMult;
          sm.mediumBeacon.visible = showBeacons;
        }
        if (sm.satelliteRig) {
          sm.satelliteRig.rotation.y += 0.012 * delta * deltaMult;
        }

        // Animate 3D holographic beacon halo ring & ion beam
        if (sm.haloRing) {
          sm.haloRing.visible = showBeacons;
          sm.haloRing.rotation.z += 0.28 * delta * deltaMult;
          const pulse = Math.sin(elapsed * 2.4);
          sm.haloRing.scale.setScalar(1.0 + 0.25 * pulse);
          (sm.haloRing.material as THREE.MeshBasicMaterial).opacity = 0.35 + 0.2 * pulse;
        }
        if (sm.beaconBeam) {
          sm.beaconBeam.visible = showBeacons;
          (sm.beaconBeam.material as THREE.MeshBasicMaterial).opacity = 0.28 + 0.12 * Math.sin(elapsed * 3.2);
        }
      }

      if (dist < minStationDist) {
        minStationDist = dist;
        closestStation = sm.data;
      }
    });

    // Periodically update LOD metrics for UI telemetry without burdening the render loop
    if (this.frameCounter % 15 === 0) {
      const metrics = calculateLODMetrics(distances, this.lodThresholds, this.lodEnabled());
      this.lodMetrics.set(metrics);
    }

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
      const up = this._vecB.set(0, 1, 0).applyQuaternion(this.shipGroup.quaternion);
      
      // Target camera position: behind the ship and slightly above its local 'up'
      const targetCamera = this.shipPosition.clone()
        .addScaledVector(forward, -chaseDist)
        .addScaledVector(up, 3.8);

      this.camera.position.lerp(targetCamera, Math.min(1, delta * 6.5));

      this._camTarget.copy(this.shipPosition).addScaledVector(forward, 12);
      this.camera.lookAt(this._camTarget);
    } else if (mode === 'cockpit') {
      this.camera.position.copy(this.shipPosition).add(this.cockpitOffset).addScaledVector(forward, 1.6);
      this._camTarget.copy(this.shipPosition).addScaledVector(forward, 22);
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

    // Apply Camera Shake Effect on Collisions and Explosions
    if (this.cameraShakeIntensity > 0) {
      const shakeX = (Math.random() - 0.5) * this.cameraShakeIntensity * 1.2;
      const shakeY = (Math.random() - 0.5) * this.cameraShakeIntensity * 1.2;
      const shakeZ = (Math.random() - 0.5) * this.cameraShakeIntensity * 1.2;
      this.camera.position.x += shakeX;
      this.camera.position.y += shakeY;
      this.camera.position.z += shakeZ;
      this.cameraShakeIntensity = Math.max(0, this.cameraShakeIntensity - delta * 2.8);
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
  // Shader Pilot GLSL Environment Engine
  // ==========================================
  private initShaderPilotEnvironment(): void {
    const geo = new THREE.SphereGeometry(280, 48, 32);
    const uniforms = {
      uTime: { value: 0 },
      uSpeed: { value: this.shaderSpeed() },
      uFrequency: { value: this.shaderFrequency() },
      uGlow: { value: this.shaderGlow() },
      uScale: { value: this.shaderScale() },
      uDistortion: { value: this.shaderDistortion() },
      uColorPalette: { value: this.shaderColorPalette() },
      uShipSpeed: { value: 0 },
      uShipTilt: { value: new THREE.Vector2(0, 0) }
    };

    this.shaderPilotMaterial = new THREE.ShaderMaterial({
      vertexShader: SHADER_PILOT_VERTEX,
      fragmentShader: this.glslCode() || PRESET_SYNTHWAVE_GLSL,
      uniforms,
      side: THREE.BackSide,
      depthWrite: false
    });

    this.shaderPilotMesh = new THREE.Mesh(geo, this.shaderPilotMaterial);
    this.shaderPilotMesh.visible = this.shaderPilotActive();
    this.scene.add(this.shaderPilotMesh);
  }

  private updateShaderPilot(delta: number): void {
    if (!this.shaderPilotMaterial || !this.shaderPilotMesh) return;
    this.shaderPilotMesh.visible = this.shaderPilotActive();

    if (!this.shaderPilotActive()) return;

    const u = this.shaderPilotMaterial.uniforms;
    u['uTime'].value += delta;
    u['uSpeed'].value = this.shaderSpeed();
    u['uFrequency'].value = this.shaderFrequency();
    u['uGlow'].value = this.shaderGlow();
    u['uScale'].value = this.shaderScale();
    u['uDistortion'].value = this.shaderDistortion();
    u['uColorPalette'].value = this.shaderColorPalette();

    if (this.syncFlight()) {
      u['uShipSpeed'].value = this.shipSpeed;
      u['uShipTilt'].value.set(this.shipPitch, this.shipRoll);
    } else {
      u['uShipSpeed'].value = 0;
      u['uShipTilt'].value.set(0, 0);
    }
  }

  onToggleShaderPilot(active: boolean): void {
    this.shaderPilotActive.set(active);
    if (active) {
      this.setCombatMessage('✨ MOTOR GLSL EN TIEMPO REAL ACTIVADO', 3000);
      this.playChime([523, 659, 784, 1046]);
    } else {
      this.setCombatMessage('🌐 MODO ESPACIO PROFUNDO ESTÁNDAR', 2500);
    }
  }

  onSelectShaderPreset(preset: ShaderPreset): void {
    this.selectedShaderPreset.set(preset);
    let code = PRESET_SYNTHWAVE_GLSL;
    if (preset === 'nebula') code = PRESET_NEBULA_GLSL;
    if (preset === 'wormhole') code = PRESET_WORMHOLE_GLSL;
    if (preset === 'fractal') code = PRESET_FRACTAL_GLSL;
    if (preset === 'plasma') code = PRESET_PLASMA_GLSL;

    this.glslCode.set(code);
    this.applyGlslMaterial(code);
    this.setCombatMessage(`✨ PRESET GLSL: ${preset.toUpperCase()}`, 2500);
  }

  onUpdateUniform(event: { key: string; value: number | boolean }): void {
    const { key, value } = event;
    if (key === 'speed') this.shaderSpeed.set(value as number);
    if (key === 'frequency') this.shaderFrequency.set(value as number);
    if (key === 'glow') this.shaderGlow.set(value as number);
    if (key === 'scale') this.shaderScale.set(value as number);
    if (key === 'distortion') this.shaderDistortion.set(value as number);
    if (key === 'colorPalette') this.shaderColorPalette.set(value as number);
    if (key === 'syncFlight') this.syncFlight.set(value as boolean);
  }

  onCompileGlsl(code: string): void {
    this.applyGlslMaterial(code);
  }

  private applyGlslMaterial(fragmentShaderCode: string): void {
    if (!this.shaderPilotMaterial) return;
    try {
      const testMat = new THREE.ShaderMaterial({
        vertexShader: SHADER_PILOT_VERTEX,
        fragmentShader: fragmentShaderCode,
        uniforms: this.shaderPilotMaterial.uniforms
      });

      this.shaderPilotMaterial.dispose();
      this.shaderPilotMaterial = testMat;
      this.shaderPilotMaterial.side = THREE.BackSide;
      this.shaderPilotMaterial.depthWrite = false;

      if (this.shaderPilotMesh) {
        this.shaderPilotMesh.material = this.shaderPilotMaterial;
      }

      this.glslCode.set(fragmentShaderCode);
      this.glslCompileError.set(null);
      this.setCombatMessage('⚡ SHADER GLSL COMPILADO CON ÉXITO', 3000);
      this.playChime([784, 1046]);
    } catch (err: any) {
      console.error('GLSL Compile error:', err);
      this.glslCompileError.set(err?.message || 'Error de compilación en Fragment Shader GLSL');
    }
  }

  onResetShaderUniforms(): void {
    this.shaderSpeed.set(1.0);
    this.shaderFrequency.set(2.0);
    this.shaderGlow.set(1.5);
    this.shaderScale.set(1.0);
    this.shaderDistortion.set(0.5);
    this.shaderColorPalette.set(0);
    this.syncFlight.set(true);
    this.onSelectShaderPreset('synthwave');
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

    this.activeExplosions = [];
    
    // Dispose shared geometries
    Object.values(this.sharedGeos).forEach(geo => geo.dispose());
    
    // Dispose cached materials
    this.explosionMaterialCache.forEach(mat => mat.dispose());
    this.explosionMaterialCache.clear();

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
