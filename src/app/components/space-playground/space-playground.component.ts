import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  signal,
  computed,
  ChangeDetectionStrategy,
  HostListener,
  Output,
  EventEmitter
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
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
  position: { x: number; z: number };
  color: number;
  glowHex: string;
  description: string;
  tags: string[];
  ctaLabel: string;
}

interface PhysicsBox {
  mesh: THREE.Mesh;
  body: {
    x: number;
    z: number;
    vx: number;
    vz: number;
    radius: number;
    mass: number;
  };
}

interface CollectibleCrystal {
  mesh: THREE.Group;
  x: number;
  z: number;
  baseY: number;
  collected: boolean;
  rotationSpeed: number;
}

interface AlienRaider {
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
  side: 'player' | 'raider';
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
  speedKmh = signal(0);
  headingDegrees = signal(0);
  pitchDegrees = signal(0);
  hullIntegrity = signal(100);
  activeRaiders = signal(0);
  combatMessage = signal('');
  turboActive = signal(false);
  crystalsCollected = signal(0);
  totalCrystals = signal(8);
  dockedStation = signal<StationData | null>(null);
  cameraMode = signal<'chase' | 'cockpit' | 'top' | 'cinematic'>('chase');
  soundEnabled = signal(false);
  isDockCollapsed = signal(false);
  isHelpOpen = signal(false);
  isMobileDevice = signal(false);
  activeStationModal = signal<string | null>(null);
  isWarping = signal(false);
  warpTargetName = signal('');
  isCinema = signal(false);
  customGlbLoaded = signal(false);
  customGlbName = signal('');
  radarBlips = signal<any[]>([]);

  // Station definitions across deep space sectors
  readonly stations: StationData[] = [
    {
      id: 'st-sobre-mi',
      sectionId: 'sobre-mi',
      name: 'Perfil',
      subtitle: 'Mendoza · Formación en Geotecnologías',
      icon: '👤',
      position: { x: -85, z: -70 },
      color: 0xd0aa73,
      glowHex: '#d0aa73',
      description: 'Desarrollo front-end, proyectos interactivos y formación en Geotecnologías en la Universidad Nacional de Cuyo.',
      tags: ['UNCuyo', 'Frontend', 'Game Dev', 'Mendoza'],
      ctaLabel: 'Abrir Perfil Completo'
    },
    {
      id: 'st-habilidades',
      sectionId: 'habilidades',
      name: 'Tecnologías',
      subtitle: 'Desarrollo web · Juegos · Geotecnologías',
      icon: '⚡',
      position: { x: 90, z: -65 },
      color: 0x91ab93,
      glowHex: '#91ab93',
      description: 'Herramientas y tecnologías aplicadas a las interfaces web, los juegos y la información geográfica.',
      tags: ['Canvas 2D', 'Angular', 'TypeScript', 'QGIS SIG'],
      ctaLabel: 'Ver Matriz de Habilidades'
    },
    {
      id: 'st-proyectos',
      sectionId: 'proyectos',
      name: 'Proyectos',
      subtitle: 'Aplicaciones y experimentos personales',
      icon: '💻',
      position: { x: 0, z: -150 },
      color: 0x98aeb1,
      glowHex: '#98aeb1',
      description: 'Juegos web, mapas, aplicaciones de consulta y herramientas cotidianas que fui construyendo.',
      tags: ['Clash of Gods', 'Geovisor SIG', 'CineApp', '5 Proyectos'],
      ctaLabel: 'Explorar Proyectos'
    },
    {
      id: 'st-experiencia',
      sectionId: 'experiencia',
      name: 'Trayectoria',
      subtitle: 'Formación y trabajo colaborativo',
      icon: '🚀',
      position: { x: -95, z: 80 },
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
      icon: '✉️',
      position: { x: 95, z: 85 },
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
  private shipPosition = new THREE.Vector3(0, 1.2, 10);
  private shipVelocity = new THREE.Vector3(0, 0, 0);
  private shipRotationY = Math.PI; // Face forward
  private shipRoll = 0;
  private shipPitch = 0;
  private shipSpeed = 0;
  private maxNormalSpeed = 24.0;
  private maxTurboSpeed = 44.0;
  private acceleration = 32.0;
  private turnSpeed = 2.8;
  private friction = 0.94;
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
    boost: false,
    fire: false
  };

  // Interactive scene entities
  private physicsBoxes: PhysicsBox[] = [];
  private crystals: CollectibleCrystal[] = [];
  private stationMeshes: { group: THREE.Group; data: StationData; beacon: THREE.Mesh; satelliteRig: THREE.Group }[] = [];
  private thrusterParticles: { pos: THREE.Vector3; vel: THREE.Vector3; life: number; maxLife: number }[] = [];
  private thrusterParticlesGeometry!: THREE.BufferGeometry;
  private thrusterParticlesMesh!: THREE.Points;
  private boostPads: { x: number; z: number; mesh: THREE.Mesh }[] = [];
  private alienRaiders: AlienRaider[] = [];
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
    this.scene.background = new THREE.Color(0x080e12);
    this.scene.fog = new THREE.FogExp2(0x080e12, 0.009);

    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 400);
    this.camera.position.set(0, 15, 25);

    // Studio Environment Reflections
    try {
      const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      pmremGenerator.dispose();
    } catch {
      // RoomEnvironment fallback safe
    }
  }

  // ==========================================
  // Scene Construction (Procedural & Zero 404s)
  // ==========================================
  private buildSpaceScene(): void {
    // 1. Balanced Lighting Rig
    const ambientLight = new THREE.AmbientLight(0x526562, 0.85);
    this.scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x899e9c, 0x292a25, 0.8);
    this.scene.add(hemiLight);

    const keySun = new THREE.DirectionalLight(0xfff5e6, 2.2);
    keySun.position.set(40, 60, 30);
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

    // Blue rim light for dramatic cosmic contrast
    const rimLight = new THREE.DirectionalLight(0x748685, 0.7);
    rimLight.position.set(-50, 20, -50);
    this.scene.add(rimLight);

    // 2. Deep Space Starfield & Cosmic Dust
    this.buildStarfield();

    // 3. Floating Distant Asteroid Belt
    this.buildAsteroids();

    // 4. Futuristic Space Station Deck (Platform)
    this.buildStationDeck();

    // 5. Perimeter Forcefield & Neon Barrier Pylons
    this.buildForcefieldBoundary();

    // 6. 5 Interactive Station Landing Outposts
    this.buildStationOutposts();

    // 7. Interactive Physics Space Crates & Canisters
    this.buildPhysicsProps();

    // 8. Collectible Quantum Crystals
    this.buildCollectibleCrystals();

    // 9. Speed Booster Jump Pads
    this.buildBoostPads();

    // 10. Procedural Spaceship (3–12 Composite Parts)
    this.buildSpaceship();

    // 11. Plasma Thruster Particle System
    this.buildThrusterParticles();
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

      // Star palette: cyan, white, gold, lilac
      const colorType = Math.random();
      if (colorType > 0.7) {
        starColors[idx] = 0.5;
        starColors[idx + 1] = 0.8;
        starColors[idx + 2] = 1.0;
      } else if (colorType > 0.4) {
        starColors[idx] = 1.0;
        starColors[idx + 1] = 0.9;
        starColors[idx + 2] = 0.6;
      } else {
        starColors[idx] = 0.9;
        starColors[idx + 1] = 0.95;
        starColors[idx + 2] = 1.0;
      }
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 1.6,
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
      flatShading: true
    });

    for (let i = 0; i < asteroidCount; i++) {
      const angle = (i / asteroidCount) * Math.PI * 2;
      const dist = 75 + Math.random() * 30;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const y = (Math.random() - 0.5) * 25;

      const scale = 2 + Math.random() * 5;
      const geo = new THREE.DodecahedronGeometry(scale, 1);

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

  private buildStationDeck(): void {
    // Open Deep Space Navigational Waypoint Grid (No floor platform box)
    const gridHelper = new THREE.GridHelper(400, 40, 0x677f7a, 0x26383d);
    gridHelper.position.y = -0.5;
    const gridMat = gridHelper.material as THREE.Material;
    gridMat.transparent = true;
    gridMat.opacity = 0.25;
    this.scene.add(gridHelper);

    // Glowing Hyper-Lane Waypoint Lines connecting Central Sector to Outposts
    const hyperLineMat = new THREE.LineDashedMaterial({
      color: 0xa39a79,
      dashSize: 3,
      gapSize: 2,
      scale: 1,
      transparent: true,
      opacity: 0.22
    });

    this.stations.forEach(st => {
      const points = [
        new THREE.Vector3(0, 0.2, 0),
        new THREE.Vector3(st.position.x, 0.2, st.position.z)
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geo, hyperLineMat);
      line.computeLineDistances();
      this.scene.add(line);
    });
  }

  private buildForcefieldBoundary(): void {
    // Open deep space sector - forcefield walls removed for unrestricted flight freedom
  }

  private buildStationOutposts(): void {
    this.stations.forEach(st => {
      const group = new THREE.Group();
      group.position.set(st.position.x, 0, st.position.z);

      // Base landing pad disc (octagonal or circular)
      const padGeo = new THREE.CylinderGeometry(6.5, 7.0, 0.4, 24);
      const padMat = new THREE.MeshStandardMaterial({
        color: 0x111827,
        roughness: 0.35,
        metalness: 0.75
      });
      const padMesh = new THREE.Mesh(padGeo, padMat);
      padMesh.position.y = 0.2;
      padMesh.receiveShadow = !this.isSoftwareGl;
      group.add(padMesh);

      // Glowing Station Energy Ring
      const ringGeo = new THREE.RingGeometry(5.2, 5.8, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: st.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.y = 0.42;
      group.add(ringMesh);

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

      // Station ground marker label in canvas
      const labelCanvas = document.createElement('canvas');
      labelCanvas.width = 256;
      labelCanvas.height = 128;
      const lctx = labelCanvas.getContext('2d')!;
      lctx.fillStyle = '#d6b779';
      lctx.font = '600 32px sans-serif';
      lctx.textAlign = 'center';
      lctx.fillText(st.icon + ' ' + st.name.split(':')[0], 128, 70);

      const labelTex = new THREE.CanvasTexture(labelCanvas);
      labelTex.colorSpace = THREE.SRGBColorSpace;
      const labelGeo = new THREE.PlaneGeometry(6, 3);
      const labelMat = new THREE.MeshBasicMaterial({
        map: labelTex,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
      });
      const labelMesh = new THREE.Mesh(labelGeo, labelMat);
      labelMesh.rotation.x = -Math.PI / 2;
      labelMesh.position.set(0, 0.44, 4.0);
      group.add(labelMesh);

      this.scene.add(group);
      this.stationMeshes.push({ group, data: st, beacon, satelliteRig });
    });
  }

  private buildPhysicsProps(): void {
    // Space Cargo Crates & Canisters that player can push and bump into
    const crateMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.5,
      metalness: 0.6
    });

    const canisterMat = new THREE.MeshStandardMaterial({
      color: 0xd4a76a,
      roughness: 0.3,
      metalness: 0.8
    });

    const spawnCoords = [
      { x: -14, z: -10, type: 'box', size: 2.2 },
      { x: -16, z: -12, type: 'box', size: 1.8 },
      { x: 15, z: -8, type: 'cylinder', size: 1.8 },
      { x: 18, z: -10, type: 'box', size: 2.0 },
      { x: -12, z: 12, type: 'cylinder', size: 2.0 },
      { x: 14, z: 14, type: 'box', size: 2.2 },
      { x: -5, z: -20, type: 'box', size: 2.0 },
      { x: 6, z: -22, type: 'cylinder', size: 1.8 },
      { x: 0, z: 18, type: 'box', size: 2.4 }
    ];

    spawnCoords.forEach(c => {
      let mesh: THREE.Mesh;
      let radius: number;

      if (c.type === 'cylinder') {
        const geo = new THREE.CylinderGeometry(c.size * 0.5, c.size * 0.5, c.size * 1.4, 12);
        mesh = new THREE.Mesh(geo, canisterMat);
        mesh.position.set(c.x, c.size * 0.7, c.z);
        radius = c.size * 0.55;
      } else {
        const geo = new THREE.BoxGeometry(c.size, c.size, c.size);
        mesh = new THREE.Mesh(geo, crateMat);
        mesh.position.set(c.x, c.size * 0.5, c.z);
        radius = c.size * 0.7;
      }

      mesh.castShadow = !this.isSoftwareGl;
      mesh.receiveShadow = !this.isSoftwareGl;
      this.scene.add(mesh);

      this.physicsBoxes.push({
        mesh,
        body: {
          x: c.x,
          z: c.z,
          vx: 0,
          vz: 0,
          radius,
          mass: 1.5
        }
      });
    });
  }

  private buildCollectibleCrystals(): void {
    // 8 Floating Quantum Energy Crystals
    const crystalCoords = [
      { x: -20, z: -32 },
      { x: 20, z: -32 },
      { x: -22, z: 0 },
      { x: 22, z: 0 },
      { x: -18, z: 34 },
      { x: 18, z: 34 },
      { x: 0, z: -12 },
      { x: 0, z: 28 }
    ];

    this.totalCrystals.set(crystalCoords.length);

    crystalCoords.forEach(c => {
      const group = new THREE.Group();
      group.position.set(c.x, 1.8, c.z);

      // Inner glowing core
      const coreGeo = new THREE.OctahedronGeometry(0.85, 0);
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0xb48d58,
        emissive: 0x805927,
        emissiveIntensity: 0.28,
        roughness: 0.42,
        metalness: 0.62
      });
      const core = new THREE.Mesh(coreGeo, coreMat);
      group.add(core);

      // Outer wireframe cage
      const cageGeo = new THREE.IcosahedronGeometry(1.2, 0);
      const cageMat = new THREE.MeshBasicMaterial({
        color: 0x8c9b88,
        wireframe: true,
        transparent: true,
        opacity: 0.38
      });
      const cage = new THREE.Mesh(cageGeo, cageMat);
      group.add(cage);

      // Floor glow disc
      const glowGeo = new THREE.RingGeometry(0.4, 1.4, 16);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0xb48d58,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.16
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.rotation.x = -Math.PI / 2;
      glow.position.y = -1.75;
      group.add(glow);

      this.scene.add(group);

      this.crystals.push({
        mesh: group,
        x: c.x,
        z: c.z,
        baseY: 1.8,
        collected: false,
        rotationSpeed: 1.5 + Math.random() * 1.5
      });
    });
  }

  private buildBoostPads(): void {
    // 2 Speed Boost Accelerator Pads with glowing neon arrows
    const padLocations = [
      { x: -10, z: 4 },
      { x: 10, z: 4 }
    ];

    padLocations.forEach(loc => {
      const padGeo = new THREE.PlaneGeometry(3.5, 7.0);
      const padCanvas = document.createElement('canvas');
      padCanvas.width = 128;
      padCanvas.height = 256;
      const pctx = padCanvas.getContext('2d')!;
      pctx.fillStyle = '#111918';
      pctx.fillRect(0, 0, 128, 256);

      // Subtle amber markings identify the impulse lane.
      pctx.fillStyle = '#b99a67';
      for (let i = 0; i < 3; i++) {
        const y = 60 + i * 65;
        pctx.beginPath();
        pctx.moveTo(64, y - 30);
        pctx.lineTo(110, y + 20);
        pctx.lineTo(84, y + 20);
        pctx.lineTo(64, y);
        pctx.lineTo(44, y + 20);
        pctx.lineTo(18, y + 20);
        pctx.closePath();
        pctx.fill();
      }

      const padTex = new THREE.CanvasTexture(padCanvas);
      padTex.colorSpace = THREE.SRGBColorSpace;

      const padMat = new THREE.MeshBasicMaterial({
        map: padTex,
        transparent: true,
        opacity: 0.95
      });
      const padMesh = new THREE.Mesh(padGeo, padMat);
      padMesh.rotation.x = -Math.PI / 2;
      padMesh.position.set(loc.x, 0.03, loc.z);
      this.scene.add(padMesh);

      this.boostPads.push({ x: loc.x, z: loc.z, mesh: padMesh });
    });
  }

  // ==========================================
  // Procedural 3D Spaceship Model (Composite THREE.Group)
  // ==========================================
  private buildSpaceship(): void {
    this.shipGroup = new THREE.Group();
    this.shipGroup.position.copy(this.shipPosition);

    // Primary Silhouette: Sleek Aerodynamic Fuselage
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x454e49,
      roughness: 0.52,
      metalness: 0.68
    });

    const hullGeo = new THREE.ConeGeometry(1.2, 5.0, 6);
    const hull = new THREE.Mesh(hullGeo, hullMat);
    hull.rotation.x = Math.PI / 2; // Point cone forward (+Z)
    hull.position.set(0, 0, 0.4);
    hull.scale.set(1.1, 1.0, 0.6);
    hull.castShadow = !this.isSoftwareGl;
    this.shipGroup.add(hull);

    // Secondary Read: Cockpit Glass Canopy
    const canopyMat = new THREE.MeshPhysicalMaterial({
      color: 0x657c7b,
      emissive: 0x182a2c,
      emissiveIntensity: 0.12,
      roughness: 0.18,
      metalness: 0.38,
      transmission: this.isSoftwareGl ? 0 : 0.28,
      transparent: true,
      opacity: 0.76
    });
    const canopyGeo = new THREE.SphereGeometry(0.7, 12, 12);
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 0.35, 0.6);
    canopy.scale.set(0.65, 0.45, 1.3);
    this.shipGroup.add(canopy);

    // Swept Delta Wings (Left & Right)
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x28312f,
      roughness: 0.3,
      metalness: 0.8
    });

    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(3.2, -1.8);
    wingShape.lineTo(3.4, -2.4);
    wingShape.lineTo(0.4, -2.0);
    wingShape.closePath();

    const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
      depth: 0.15,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.05,
      bevelThickness: 0.05
    });

    // Left Wing
    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.rotation.x = Math.PI / 2;
    leftWing.position.set(0.6, 0.05, 0.8);
    leftWing.castShadow = !this.isSoftwareGl;
    this.shipGroup.add(leftWing);

    // Right Wing (mirrored)
    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.rotation.x = Math.PI / 2;
    rightWing.rotation.y = Math.PI;
    rightWing.position.set(-0.6, 0.05, 0.8);
    rightWing.castShadow = !this.isSoftwareGl;
    this.shipGroup.add(rightWing);

    // Wingtip Vertical Stabilizer Fins
    const finMat = new THREE.MeshStandardMaterial({
      color: 0x74816e,
      roughness: 0.2,
      metalness: 0.9
    });
    const finGeo = new THREE.BoxGeometry(0.12, 0.9, 1.4);

    const leftFin = new THREE.Mesh(finGeo, finMat);
    leftFin.position.set(3.6, 0.35, -1.2);
    leftFin.rotation.z = -0.2;
    this.shipGroup.add(leftFin);

    const rightFin = new THREE.Mesh(finGeo, finMat);
    rightFin.position.set(-3.6, 0.35, -1.2);
    rightFin.rotation.z = 0.2;
    this.shipGroup.add(rightFin);

    // Twin High-Output Ion Thruster Nacelles
    const thrusterMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.2,
      metalness: 0.95
    });
    const nacelleGeo = new THREE.CylinderGeometry(0.4, 0.45, 2.0, 12);

    const leftNacelle = new THREE.Mesh(nacelleGeo, thrusterMat);
    leftNacelle.rotation.x = Math.PI / 2;
    leftNacelle.position.set(1.0, 0, -1.2);
    leftNacelle.castShadow = !this.isSoftwareGl;
    this.shipGroup.add(leftNacelle);

    const rightNacelle = new THREE.Mesh(nacelleGeo, thrusterMat);
    rightNacelle.rotation.x = Math.PI / 2;
    rightNacelle.position.set(-1.0, 0, -1.2);
    rightNacelle.castShadow = !this.isSoftwareGl;
    this.shipGroup.add(rightNacelle);

    // Glowing Plasma Exhaust Cones
    const plasmaMat = new THREE.MeshBasicMaterial({
      color: 0xc39a62
    });
    const exhaustGeo = new THREE.ConeGeometry(0.38, 1.2, 12);

    this.shipThrusterLeft = new THREE.Mesh(exhaustGeo, plasmaMat);
    this.shipThrusterLeft.rotation.x = -Math.PI / 2;
    this.shipThrusterLeft.position.set(1.0, 0, -2.6);
    this.shipGroup.add(this.shipThrusterLeft);

    this.shipThrusterRight = new THREE.Mesh(exhaustGeo, plasmaMat);
    this.shipThrusterRight.rotation.x = -Math.PI / 2;
    this.shipThrusterRight.position.set(-1.0, 0, -2.6);
    this.shipGroup.add(this.shipThrusterRight);

    // Forward Sensor Antenna / Laser Cannons
    const gunMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.9,
      roughness: 0.1
    });
    const gunGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.4, 8);

    const leftGun = new THREE.Mesh(gunGeo, gunMat);
    leftGun.rotation.x = Math.PI / 2;
    leftGun.position.set(1.8, -0.05, 0.2);
    this.shipGroup.add(leftGun);

    const rightGun = new THREE.Mesh(gunGeo, gunMat);
    rightGun.rotation.x = Math.PI / 2;
    rightGun.position.set(-1.8, -0.05, 0.2);
    this.shipGroup.add(rightGun);

    // Ground Contact Shadow Disc (Three.js skill directive)
    const shadowGeo = new THREE.PlaneGeometry(5.0, 5.0);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.45,
      depthWrite: false
    });
    const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = -1.18;
    this.shipGroup.add(contactShadow);

    this.scene.add(this.shipGroup);

    if (typeof localStorage !== 'undefined') {
      const cachedGlb = localStorage.getItem('cached_transformer_glb');
      const cachedName = localStorage.getItem('cached_transformer_name');
      if (cachedGlb) {
        this.loadGlbFromUrl(cachedGlb, cachedName || 'Transformador .GLB');
      }
    }
  }

  private buildRaiderShip(): THREE.Group {
    const ship = new THREE.Group();
    const shell = new THREE.MeshStandardMaterial({ color: 0x343b37, roughness: 0.34, metalness: 0.78, flatShading: true });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x4b443d, roughness: 0.4, metalness: 0.7, flatShading: true, side: THREE.DoubleSide });
    const sensorMat = new THREE.MeshStandardMaterial({ color: 0xa65d43, emissive: 0x9b3828, emissiveIntensity: 0.8, roughness: 0.25, metalness: 0.45 });
    const engineMat = new THREE.MeshBasicMaterial({ color: 0xe0905d });

    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), shell);
    body.scale.set(1.15, 0.46, 1.82);
    ship.add(body);

    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.52, 10, 7), wingMat);
    crown.scale.set(0.74, 0.82, 1.0);
    crown.position.set(0, 0.25, -0.08);
    ship.add(crown);

    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0.48);
    wingShape.lineTo(2.55, -0.1);
    wingShape.lineTo(2.05, -1.06);
    wingShape.lineTo(0.32, -0.63);
    wingShape.closePath();
    const wingGeometry = new THREE.ExtrudeGeometry(wingShape, { depth: 0.16, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.04, bevelThickness: 0.04 });
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(wingGeometry, wingMat);
      wing.rotation.x = Math.PI / 2;
      wing.scale.x = side;
      wing.position.set(side * 0.7, -0.04, -0.12);
      ship.add(wing);

      const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.0, 7), shell);
      cannon.rotation.x = Math.PI / 2;
      cannon.position.set(side * 0.57, -0.1, 1.18);
      ship.add(cannon);

      const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 0.82, 9), shell);
      engine.rotation.x = Math.PI / 2;
      engine.position.set(side * 0.67, -0.05, -1.42);
      ship.add(engine);
      const exhaust = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.48, 8), engineMat);
      exhaust.rotation.x = -Math.PI / 2;
      exhaust.position.set(side * 0.67, -0.05, -2.02);
      ship.add(exhaust);
    }

    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 8), sensorMat);
    eye.position.set(0, 0.18, 1.05);
    ship.add(eye);
    const dorsalSpine = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.15, 7), shell);
    dorsalSpine.rotation.x = Math.PI / 2;
    dorsalSpine.position.set(0, 0.36, -0.7);
    ship.add(dorsalSpine);
    ship.traverse(object => {
      if ((object as THREE.Mesh).isMesh) object.castShadow = !this.isSoftwareGl;
    });
    return ship;
  }

  private beginStationEncounter(station: StationData): void {
    if (this.encounteredStationIds.has(station.id)) return;
    this.encounteredStationIds.add(station.id);

    const count = 2 + Math.floor(Math.random() * 2);
    for (let index = 0; index < count; index++) {
      const phase = (index / count) * Math.PI * 2 + Math.random() * 0.45;
      const ship = this.buildRaiderShip();
      const orbitRadius = 22 + Math.random() * 8;
      ship.position.set(
        this.shipPosition.x + Math.cos(phase) * orbitRadius,
        2 + Math.random() * 5,
        this.shipPosition.z + Math.sin(phase) * orbitRadius
      );
      ship.lookAt(this.shipPosition);
      this.scene.add(ship);
      this.alienRaiders.push({
        group: ship,
        velocity: new THREE.Vector3(),
        phase,
        orbitRadius,
        fireCooldown: 1.2 + Math.random() * 1.5,
        integrity: 4
      });
    }

    this.activeRaiders.set(this.alienRaiders.length);
    this.setCombatMessage(`CONTACTO HOSTIL · ${count} NAVES`);
    this.playChime([480, 360]);
  }

  private setCombatMessage(message: string, duration = 3600): void {
    this.combatMessage.set(message);
    if (this.combatMessageTimeout) clearTimeout(this.combatMessageTimeout);
    this.combatMessageTimeout = setTimeout(() => this.combatMessage.set(''), duration);
  }

  firePlayerWeapons(): void {
    if (this.alienRaiders.length === 0 || this.combatCooldown > 0) return;
    this.combatCooldown = 0.22;
    const heading = this.shipRotationY;
    const forward = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
    const lateral = new THREE.Vector3(Math.cos(heading), 0, -Math.sin(heading));
    const direction = forward.clone().normalize();
    for (const side of [-1, 1]) {
      const origin = this.shipPosition.clone().addScaledVector(forward, 2.4).addScaledVector(lateral, side * 0.62);
      origin.y += 0.05;
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

  private fireRaiderWeapons(raider: AlienRaider): void {
    const direction = this.shipPosition.clone().add(new THREE.Vector3(0, 0.3, 0)).sub(raider.group.position).normalize();
    const bolt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 1.7, 6),
      new THREE.MeshBasicMaterial({ color: 0xb8563e })
    );
    bolt.position.copy(raider.group.position).addScaledVector(direction, 2.2);
    bolt.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    this.scene.add(bolt);
    this.combatBolts.push({ mesh: bolt, velocity: direction.multiplyScalar(38), remaining: 4.5, side: 'raider' });
  }

  private updateCombat(delta: number): void {
    this.combatCooldown = Math.max(0, this.combatCooldown - delta);
    this.hullRegenCooldown = Math.max(0, this.hullRegenCooldown - delta);
    if (this.hullRegenCooldown === 0 && this.hullIntegrity() < 100) {
      this.hullIntegrity.update(value => Math.min(100, value + delta * 3.5));
    }
    if ((this.keysPressed['f'] || this.touchState.fire) && this.combatCooldown <= 0) this.firePlayerWeapons();

    for (const raider of this.alienRaiders) {
      raider.phase += delta * (raider.velocity.x >= 0 ? 0.28 : -0.28);
      const target = new THREE.Vector3(
        this.shipPosition.x + Math.cos(raider.phase) * raider.orbitRadius,
        2.4 + Math.sin(this.elapsedTime * 1.1 + raider.phase) * 2.0,
        this.shipPosition.z + Math.sin(raider.phase) * raider.orbitRadius
      );
      const toTarget = target.sub(raider.group.position);
      const desiredVelocity = toTarget.lengthSq() > 0.01 ? toTarget.normalize().multiplyScalar(8.5) : new THREE.Vector3();
      raider.velocity.lerp(desiredVelocity, Math.min(1, delta * 1.6));
      raider.group.position.addScaledVector(raider.velocity, delta);
      raider.group.lookAt(this.shipPosition.x, this.shipPosition.y + 0.2, this.shipPosition.z);
      raider.group.rotation.z = Math.sin(this.elapsedTime * 1.6 + raider.phase) * 0.08;
      raider.fireCooldown -= delta;
      if (raider.fireCooldown <= 0 && raider.group.position.distanceTo(this.shipPosition) < 105) {
        this.fireRaiderWeapons(raider);
        raider.fireCooldown = 1.55 + Math.random() * 1.25;
      }
    }

    for (let boltIndex = this.combatBolts.length - 1; boltIndex >= 0; boltIndex--) {
      const bolt = this.combatBolts[boltIndex];
      bolt.remaining -= delta;
      bolt.mesh.position.addScaledVector(bolt.velocity, delta);
      let consumed = bolt.remaining <= 0;

      if (!consumed && bolt.side === 'raider' && bolt.mesh.position.distanceTo(this.shipPosition) < 2.0) {
        this.hullIntegrity.update(value => Math.max(0, value - 9));
        this.hullRegenCooldown = 4.5;
        this.playThump();
        this.setCombatMessage(`IMPACTO · CASCO ${Math.round(this.hullIntegrity())}%`, 1900);
        if (this.hullIntegrity() === 0) {
          this.shipSpeed = 0;
          this.hullIntegrity.set(42);
          this.setCombatMessage('CASCO CRÍTICO · SISTEMA DE RESPALDO ACTIVO', 3200);
        }
        consumed = true;
      } else if (!consumed && bolt.side === 'player') {
        const hitIndex = this.alienRaiders.findIndex(raider => bolt.mesh.position.distanceTo(raider.group.position) < 2.2);
        if (hitIndex >= 0) {
          const target = this.alienRaiders[hitIndex];
          target.integrity -= 1;
          const hull = target.group.children[0] as THREE.Mesh;
          if (hull.material instanceof THREE.MeshStandardMaterial) hull.material.emissive.setHex(0x5b251b);
          if (target.integrity <= 0) {
            this.scene.remove(target.group);
            target.group.traverse(object => {
              const mesh = object as THREE.Mesh;
              if (!mesh.isMesh) return;
              mesh.geometry.dispose();
              const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              materials.forEach(material => material.dispose());
            });
            this.alienRaiders.splice(hitIndex, 1);
            this.activeRaiders.set(this.alienRaiders.length);
            this.setCombatMessage(this.alienRaiders.length === 0 ? 'SECTOR DESPEJADO' : `OBJETIVO NEUTRALIZADO · ${this.alienRaiders.length} RESTANTES`, 2600);
            this.playChime([440, 554, 659]);
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
      color: 0xc39a62,
      size: 1.2,
      transparent: true,
      opacity: 0.8
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

      // Continuous low-frequency ion drive engine hum
      this.engineOsc = this.audioCtx.createOscillator();
      this.engineGain = this.audioCtx.createGain();

      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(65, this.audioCtx.currentTime);

      // Low pass filter for smooth spaceship engine drone
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(220, this.audioCtx.currentTime);

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
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    // Ignore if typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }
    const key = e.key.toLowerCase();
    this.keysPressed[key] = true;

    if (e.code === 'Space') {
      e.preventDefault();
      this.isBoosting = true;
      this.turboActive.set(true);
    }
    if (key === 'r') {
      this.resetShipPosition();
    }
    if (key === 'c') {
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

  // Touch Virtual Controls
  setTouchControl(control: 'forward' | 'backward' | 'left' | 'right' | 'boost' | 'fire', state: boolean): void {
    this.touchState[control] = state;
    if (control === 'boost') {
      this.isBoosting = state;
      this.turboActive.set(state);
    }
    if (control === 'fire') this.touchState.fire = state;
  }

  resetShipPosition(): void {
    this.shipPosition.set(0, 1.2, 12);
    this.shipVelocity.set(0, 0, 0);
    this.shipSpeed = 0;
    this.shipRotationY = Math.PI;
    this.shipRoll = 0;
    this.shipPitch = 0;
    this.playChime([330, 440]);
  }

  teleportToStation(st: StationData): void {
    if (this.isWarping()) return;
    this.isWarping.set(true);
    this.warpTargetName.set(st.name);
    this.playChime([600, 800, 1000, 1200]);

    const targetX = st.position.x;
    const targetZ = st.position.z + 3.5;
    const startX = this.shipPosition.x;
    const startZ = this.shipPosition.z;

    let elapsed = 0;
    const duration = 0.55;

    const warpInterval = setInterval(() => {
      elapsed += 0.03;
      const progress = Math.min(1.0, elapsed / duration);
      // easeInOutCubic
      const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      this.shipPosition.x = startX + (targetX - startX) * ease;
      this.shipPosition.z = startZ + (targetZ - startZ) * ease;
      this.shipVelocity.set(0, 0, 0);

      if (progress >= 1.0) {
        clearInterval(warpInterval);
        this.shipPosition.set(targetX, 1.2, targetZ);
        this.shipSpeed = 0;
        this.shipRotationY = 0; // face station
        this.dockedStation.set(st);
        this.beginStationEncounter(st);
        this.isWarping.set(false);
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
    const modes: ('chase' | 'cockpit' | 'top' | 'cinematic')[] = ['chase', 'cockpit', 'top', 'cinematic'];
    const nextIdx = (modes.indexOf(this.cameraMode()) + 1) % modes.length;
    this.setCameraMode(modes[nextIdx]);
  }

  toggleDock(): void {
    this.isDockCollapsed.update(v => !v);
  }

  toggleHelp(): void {
    this.isHelpOpen.update(v => !v);
  }

  openStationModal(sectionId: string): void {
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
      this.updateCrystals(delta);
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
    // 1. Gather steering & throttle inputs
    const forwardInput = (this.keysPressed['w'] || this.keysPressed['arrowup'] || this.touchState.forward) ? 1 : 0;
    const backwardInput = (this.keysPressed['s'] || this.keysPressed['arrowdown'] || this.touchState.backward) ? 1 : 0;
    const leftInput = (this.keysPressed['a'] || this.keysPressed['arrowleft'] || this.touchState.left) ? 1 : 0;
    const rightInput = (this.keysPressed['d'] || this.keysPressed['arrowright'] || this.touchState.right) ? 1 : 0;

    const throttle = forwardInput - backwardInput;
    const steering = leftInput - rightInput;

    const targetMaxSpeed = this.isBoosting ? this.maxTurboSpeed : this.maxNormalSpeed;

    // Acceleration & Drag
    if (throttle > 0) {
      this.shipSpeed += this.acceleration * delta * (this.isBoosting ? 1.5 : 1.0);
      if (this.shipSpeed > targetMaxSpeed) {
        this.shipSpeed = targetMaxSpeed;
      }
    } else if (throttle < 0) {
      this.shipSpeed -= (this.acceleration * 0.7) * delta;
      if (this.shipSpeed < -this.maxNormalSpeed * 0.4) {
        this.shipSpeed = -this.maxNormalSpeed * 0.4;
      }
    } else {
      this.shipSpeed *= Math.pow(this.friction, delta * 60);
    }

    // Steering rotation (turning speed is responsive when moving)
    const turnFactor = Math.abs(this.shipSpeed) > 1.0 ? Math.sign(this.shipSpeed) : 1.0;
    this.shipRotationY += steering * this.turnSpeed * turnFactor * delta;

    // Banking & Tilting (Roll & Pitch Kinematics)
    const targetRoll = -steering * 0.45;
    this.shipRoll = THREE.MathUtils.damp(this.shipRoll, targetRoll, 8.0, delta);

    const targetPitch = throttle * 0.15;
    this.shipPitch = THREE.MathUtils.damp(this.shipPitch, targetPitch, 8.0, delta);

    // Subtle Hover Levitation Bobbing
    const hoverY = 1.2 + Math.sin(this.elapsedTime * 3.0) * 0.12;

    // Forward direction vector
    const dirX = Math.sin(this.shipRotationY);
    const dirZ = Math.cos(this.shipRotationY);

    this.shipVelocity.x = dirX * this.shipSpeed;
    this.shipVelocity.z = dirZ * this.shipSpeed;

    this.shipPosition.x += this.shipVelocity.x * delta;
    this.shipPosition.z += this.shipVelocity.z * delta;
    this.shipPosition.y = hoverY;

    // Open Deep Space Navigation: Soft sector wrap-around at 350 space units
    const outerSectorLimit = 350.0;
    if (Math.abs(this.shipPosition.x) > outerSectorLimit) {
      this.shipPosition.x = -Math.sign(this.shipPosition.x) * (outerSectorLimit - 5.0);
    }
    if (Math.abs(this.shipPosition.z) > outerSectorLimit) {
      this.shipPosition.z = -Math.sign(this.shipPosition.z) * (outerSectorLimit - 5.0);
    }

    // Check Boost Pads
    this.boostPads.forEach(bp => {
      const dist = Math.hypot(this.shipPosition.x - bp.x, this.shipPosition.z - bp.z);
      if (dist < 2.5) {
        this.shipSpeed = this.maxTurboSpeed * 1.2;
        this.isBoosting = true;
        this.turboActive.set(true);
        this.playChime([600, 800, 1000]);
      }
    });

    // Check Physics Props Collisions
    const shipRadius = 1.8;
    this.physicsBoxes.forEach(p => {
      const dx = p.body.x - this.shipPosition.x;
      const dz = p.body.z - this.shipPosition.z;
      const dist = Math.hypot(dx, dz);
      const minDist = shipRadius + p.body.radius;

      if (dist < minDist && dist > 0.001) {
        const nx = dx / dist;
        const nz = dz / dist;
        const overlap = minDist - dist;

        // Push crate away
        p.body.x += nx * overlap;
        p.body.z += nz * overlap;

        // Impart impulse
        p.body.vx += nx * (Math.abs(this.shipSpeed) + 4.0) * 0.8;
        p.body.vz += nz * (Math.abs(this.shipSpeed) + 4.0) * 0.8;

        this.shipSpeed *= 0.75;
        this.playThump();
      }

      // Update crate physics
      p.body.x += p.body.vx * delta;
      p.body.z += p.body.vz * delta;
      p.body.vx *= Math.pow(0.9, delta * 60);
      p.body.vz *= Math.pow(0.9, delta * 60);

      // Keep crates inside deep space bounds
      p.body.x = THREE.MathUtils.clamp(p.body.x, -180, 180);
      p.body.z = THREE.MathUtils.clamp(p.body.z, -180, 180);

      p.mesh.position.x = p.body.x;
      p.mesh.position.z = p.body.z;
      p.mesh.rotation.y += (p.body.vx + p.body.vz) * 0.05;
    });

    // Apply Transformations to Spaceship
    this.shipGroup.position.copy(this.shipPosition);
    this.shipGroup.rotation.set(this.shipPitch, this.shipRotationY, this.shipRoll);

    // Update Plasma Thruster scale & glow
    const thrusterScale = Math.max(0.2, (Math.abs(this.shipSpeed) / this.maxNormalSpeed) * (this.isBoosting ? 2.2 : 1.2));
    this.shipThrusterLeft.scale.set(thrusterScale, thrusterScale * 1.5, thrusterScale);
    this.shipThrusterRight.scale.set(thrusterScale, thrusterScale * 1.5, thrusterScale);

    // Emit Thruster Particles when moving
    if (Math.abs(this.shipSpeed) > 1.5) {
      this.emitThrusterParticle();
    }

    // UI Signal update (Kmh conversion)
    this.speedKmh.set(Math.round(Math.abs(this.shipSpeed) * 12));
    this.headingDegrees.set(((Math.round(THREE.MathUtils.radToDeg(this.shipRotationY)) % 360) + 360) % 360);
    this.pitchDegrees.set(Math.round(THREE.MathUtils.radToDeg(this.shipPitch)));

    // Update real-time dynamic radar blips
    const radarRange = 180.0;
    const computedBlips = this.stations.map(st => {
      const dx = st.position.x - this.shipPosition.x;
      const dz = st.position.z - this.shipPosition.z;
      const angle = -this.shipRotationY;
      const rxRel = dx * Math.cos(angle) - dz * Math.sin(angle);
      const rzRel = dx * Math.sin(angle) + dz * Math.cos(angle);

      const radarX = Math.max(12, Math.min(88, 50 + (rxRel / radarRange) * 38));
      const radarY = Math.max(12, Math.min(88, 50 - (rzRel / radarRange) * 38));

      return {
        x: radarX,
        y: radarY,
        label: st.name,
        color: st.glowHex,
        station: st
      };
    });
    const hostileBlips = this.alienRaiders.map((raider, index) => {
      const dx = raider.group.position.x - this.shipPosition.x;
      const dz = raider.group.position.z - this.shipPosition.z;
      const angle = -this.shipRotationY;
      const rxRel = dx * Math.cos(angle) - dz * Math.sin(angle);
      const rzRel = dx * Math.sin(angle) + dz * Math.cos(angle);
      return {
        x: Math.max(12, Math.min(88, 50 + (rxRel / radarRange) * 38)),
        y: Math.max(12, Math.min(88, 50 - (rzRel / radarRange) * 38)),
        label: `Hostil ${index + 1}`,
        color: '#bd6b4f',
        station: null,
        isHostile: true
      };
    });
    this.radarBlips.set([...computedBlips, ...hostileBlips]);
  }

  private emitThrusterParticle(): void {
    if (this.thrusterParticles.length > 50) return;
    const angle = this.shipRotationY;
    const backX = -Math.sin(angle);
    const backZ = -Math.cos(angle);

    for (let i = 0; i < 2; i++) {
      const offsetX = (i === 0 ? 0.9 : -0.9) * Math.cos(angle);
      const offsetZ = (i === 0 ? -0.9 : 0.9) * Math.sin(angle);

      this.thrusterParticles.push({
        pos: new THREE.Vector3(
          this.shipPosition.x + offsetX + backX * 1.8,
          this.shipPosition.y + (Math.random() - 0.5) * 0.2,
          this.shipPosition.z + offsetZ + backZ * 1.8
        ),
        vel: new THREE.Vector3(
          backX * (6 + Math.random() * 4),
          (Math.random() - 0.5) * 0.8,
          backZ * (6 + Math.random() * 4)
        ),
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

  private updateCrystals(delta: number): void {
    const elapsed = this.elapsedTime;
    this.crystals.forEach(c => {
      if (c.collected) return;

      c.mesh.rotation.y += c.rotationSpeed * delta;
      c.mesh.position.y = c.baseY + Math.sin(elapsed * 2.5 + c.x) * 0.25;

      // Check pickup
      const dist = Math.hypot(this.shipPosition.x - c.x, this.shipPosition.z - c.z);
      if (dist < 2.4) {
        c.collected = true;
        this.crystalsCollected.update(v => v + 1);
        this.scene.remove(c.mesh);
        this.playChime([523, 659, 784, 1046]); // Major chord chime
      }
    });
  }

  private updateStations(delta: number): void {
    const elapsed = this.elapsedTime;
    let closestStation: StationData | null = null;
    let minStationDist = 8.5; // Landing detection radius

    this.stationMeshes.forEach(sm => {
      sm.beacon.rotation.y += 1.2 * delta;
      sm.satelliteRig.rotation.y += 0.012 * delta;

      const dist = Math.hypot(this.shipPosition.x - sm.data.position.x, this.shipPosition.z - sm.data.position.z);
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
  }

  private updateCamera(delta: number): void {
    const mode = this.cameraMode();

    if (mode === 'chase') {
      // Dynamic third-person chase camera
      const chaseDist = this.isBoosting ? 13.0 : 10.5;
      const chaseHeight = 4.8;
      const angle = this.shipRotationY;

      // Behind the ship
      const targetCamX = this.shipPosition.x - Math.sin(angle) * chaseDist;
      const targetCamZ = this.shipPosition.z - Math.cos(angle) * chaseDist;
      const targetCamY = this.shipPosition.y + chaseHeight;

      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, targetCamX, 6.0, delta);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, targetCamY, 6.0, delta);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, targetCamZ, 6.0, delta);

      // Look slightly ahead of the ship
      this._camTarget.set(
        this.shipPosition.x + Math.sin(angle) * 5.0,
        this.shipPosition.y + 1.2,
        this.shipPosition.z + Math.cos(angle) * 5.0
      );
      this.camera.lookAt(this._camTarget);
    } else if (mode === 'cockpit') {
      // Cockpit front camera
      const angle = this.shipRotationY;
      this.camera.position.set(
        this.shipPosition.x + Math.sin(angle) * 0.8,
        this.shipPosition.y + 0.6,
        this.shipPosition.z + Math.cos(angle) * 0.8
      );
      this._camTarget.set(
        this.shipPosition.x + Math.sin(angle) * 15.0,
        this.shipPosition.y + 0.6,
        this.shipPosition.z + Math.cos(angle) * 15.0
      );
      this.camera.lookAt(this._camTarget);
    } else if (mode === 'top') {
      // Top-down satellite radar
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, this.shipPosition.x, 5.0, delta);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, 42.0, 5.0, delta);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, this.shipPosition.z + 1.0, 5.0, delta);
      this.camera.lookAt(this.shipPosition.x, 0, this.shipPosition.z);
    } else if (mode === 'cinematic') {
      // Slow orbital cinematic camera
      const t = this.elapsedTime * 0.4;
      this.camera.position.set(
        this.shipPosition.x + Math.cos(t) * 14.0,
        this.shipPosition.y + 6.0,
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

    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
    this.scene.clear();
  }
}
