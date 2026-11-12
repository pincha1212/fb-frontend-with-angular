import { Injectable, signal, computed } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, getDocFromServer } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../../firebase-applet-config.json';
import { Proyecto } from '../components/proyectos/proyectos.component';
import { saveModelToDB } from './model-storage';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(auth: any, error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      providerInfo: auth.currentUser?.providerData?.map((p: any) => ({
        providerId: p.providerId,
        email: p.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

export interface HitoItem {
  numero: string;
  label: string;
}

export interface EstudioItem {
  periodo: string;
  titulo: string;
  institucion: string;
  descripcion: string;
}

export interface ProfileData {
  nombre: string;
  titulo: string;
  subtituloHero: string;
  tituloHero: string;
  bajadaHero: string;
  subtitulo: string;
  resumen: string;
  bioTexto2: string;
  ubicacion: string;
  institucion: string;
  hitos: HitoItem[];
  competencias: string[];
  estudios: EstudioItem[];
}

export interface HabilidadCat {
  categoria: string;
  items: string[];
}

export interface ExperienciaItem {
  periodo: string;
  rol: string;
  empresa: string;
  descripcion: string;
  tecnologias: string[];
}

export interface IdiomaItem {
  nombre: string;
  nivel: string;
  codigo: string;
}

export interface TrayectoriaExtra {
  tituloSeccion: string;
  objetivoProfesional: string;
  idiomas: IdiomaItem[];
}

export interface RedSocial {
  nombre: string;
  url: string;
  iconoUrl?: string;
  iconoTexto?: string;
}

export interface ContactoData {
  email: string;
  telefono: string;
  github: string;
  linkedin: string;
  ubicacion: string;
  formspreeEndpoint: string;
  redes: RedSocial[];
}

export interface StationCustomConfig {
  sectionId: string;
  useCustomData?: boolean;
  nameOverride?: string;
  subtitleOverride?: string;
  descriptionOverride?: string;
  tagsOverride?: string[];
  ctaLabelOverride?: string;
}

export interface Modo3DConfig {
  tacticalObjectiveTitle?: string;
  combatActivatedMessage?: string;
  freeModeActivatedMessage?: string;
  shieldImpactMessage?: string;
  enemyDestroyedMessage?: string;
  waveClearedMessage?: string;
  boundaryWarningMessage?: string;
  stationEncounterMessage?: string;
  lowHealthWarningMessage?: string;
  combatStartMessage?: string;
  gamePausedMessage?: string;
  hostileTargetLockedMessage?: string;
  deviceIncompatibilityMessage?: string;
  incompatibilityTitle?: string;
  incompatibilitySubtitle?: string;
  incompatibilityRequirements?: { icon: string; title: string; description: string }[];
  incompatibilityFooter?: string;
  stationsConfig?: Record<string, StationCustomConfig>;
}

export interface NaveModel {
  id?: string;
  nombre: string;
  url: string;
  tipo?: 'xeno' | 'shuttle' | 'interceptor' | 'custom';
  descripcion?: string;
  icono?: string;
}

export interface FullPortfolioData {
  profile: ProfileData;
  proyectos: Proyecto[];
  habilidades: HabilidadCat[];
  experiencia: ExperienciaItem[];
  trayectoriaExtra: TrayectoriaExtra;
  contacto: ContactoData;
  modelosNave: NaveModel[];
  modo3DConfig?: Modo3DConfig;
  updatedAt: string;
}

const LOCAL_STORAGE_KEY = 'portfolio_data_cache_v2';

export const DEFAULT_FLEET_SHIPS: NaveModel[] = [
  {
    id: 'xeno',
    nombre: 'Caza Biomecánico Xeno-01',
    tipo: 'xeno',
    url: 'preset:xeno',
    descripcion: 'Nave alienígena con fuselaje de quitina viva, alas mantis, anillo gravitón y bio-plasma.',
    icono: '👾'
  },
  {
    id: 'shuttle',
    nombre: 'Transbordador Orbital Humano STS',
    tipo: 'shuttle',
    url: 'preset:shuttle',
    descripcion: 'Aeronave espacial terrestre con alas delta, escudo térmico cerámico y triple propulsión química.',
    icono: '🚀'
  },
  {
    id: 'interceptor',
    nombre: 'Interceptor Estelar Viper-IV',
    tipo: 'interceptor',
    url: 'preset:interceptor',
    descripcion: 'Caza táctico de combate de alta maniobra con doble propulsión iónica y cañones de repetición.',
    icono: '⚡'
  }
];

export const DEFAULT_MODO3D_CONFIG: Modo3DConfig = {
  tacticalObjectiveTitle: 'DEFENDER SECTOR ORBITAL',
  combatActivatedMessage: '🎮 MODO COMBATE ACTIVADO · ESCUDO INMORTAL ACTIVO',
  freeModeActivatedMessage: '🕊️ MODO NAVEGACIÓN LIBRE ACTIVADO',
  shieldImpactMessage: '🛡️ IMPACTO ABSORBIDO POR EL ESCUDO',
  enemyDestroyedMessage: '💥 HOSTIL DERRIBADO!',
  waveClearedMessage: '🚀 ¡OLEADA SUPERADA! NUEVOS CONTACTOS DETECTADOS',
  boundaryWarningMessage: '🚨 LÍMITE DEL SECTOR · RETORNO AUTOMÁTICO',
  stationEncounterMessage: 'ESTACIÓN ALCANZADA',
  lowHealthWarningMessage: '🛡️ ESCUDO AL 100% · SIN DAÑOS RELEVANTES',
  combatStartMessage: '⚔️ ALERTA DE COMBATE · INTERCEPTACIÓN RECOMENDADA',
  gamePausedMessage: '⏸️ SIMULADOR EN PAUSA',
  hostileTargetLockedMessage: '🎯 HOSTIL EN MIRA',
  deviceIncompatibilityMessage: 'Para disfrutar del simulador 3D de vuelo espacial es necesario acceder desde una PC de escritorio o laptop con teclado y mouse.',
  incompatibilityTitle: 'MODO 3D EXCLUSIVO PARA PC',
  incompatibilitySubtitle: 'Simulador de vuelo espacial',
  incompatibilityRequirements: [
    { icon: '⌨️', title: 'Teclado W/A/S/D o Flechas', description: 'Control de propulsión y 3 ejes de vuelo' },
    { icon: '🖱️', title: 'Mouse (Pointer Lock)', description: 'Navegación libre de cabina y mira de precisión' },
    { icon: '🖥️', title: 'Pantalla Ancha (1024px+)', description: 'Panel de instrumentos HUD y radar orbital' }
  ],
  incompatibilityFooter: 'El portafolio completo (Perfil, Tecnologías, Proyectos, Trayectoria y Contacto) está 100% optimizado para tu dispositivo móvil o tablet.',
  stationsConfig: {
    'sobre-mi': {
      sectionId: 'sobre-mi',
      useCustomData: false,
      nameOverride: 'Perfil',
      subtitleOverride: 'Mendoza · Formación en Geotecnologías',
      descriptionOverride: 'Desarrollo front-end, proyectos interactivos y formación en Geotecnologías en la Universidad Nacional de Cuyo.',
      tagsOverride: ['UNCuyo', 'Frontend', 'Interactividad', 'Mendoza'],
      ctaLabelOverride: 'Abrir Perfil Completo'
    },
    'habilidades': {
      sectionId: 'habilidades',
      useCustomData: false,
      nameOverride: 'Tecnologías',
      subtitleOverride: 'Interfaces web · Datos geográficos',
      descriptionOverride: 'Herramientas para construir interfaces web, mapas interactivos y visualizaciones geográficas.',
      tagsOverride: ['Canvas 2D', 'Angular', 'TypeScript', 'QGIS SIG'],
      ctaLabelOverride: 'Ver Matriz de Habilidades'
    },
    'proyectos': {
      sectionId: 'proyectos',
      useCustomData: false,
      nameOverride: 'Proyectos',
      subtitleOverride: 'Aplicaciones y experimentos personales',
      descriptionOverride: 'Aplicaciones web, cartografía y experimentos interactivos desarrollados a lo largo de mi formación.',
      tagsOverride: ['Geovisor SIG', 'Cartografía web', 'CineApp', 'Proyectos'],
      ctaLabelOverride: 'Explorar Proyectos'
    },
    'experiencia': {
      sectionId: 'experiencia',
      useCustomData: false,
      nameOverride: 'Trayectoria',
      subtitleOverride: 'Formación y trabajo colaborativo',
      descriptionOverride: 'Experiencia práctica en equipos, desarrollo colaborativo y formación académica.',
      tagsOverride: ['NoCountry', 'Agile / Scrum', 'Teamwork', 'UNCuyo'],
      ctaLabelOverride: 'Ver Trayectoria'
    },
    'contacto': {
      sectionId: 'contacto',
      useCustomData: false,
      nameOverride: 'Contacto',
      subtitleOverride: 'Correo, GitHub y LinkedIn',
      descriptionOverride: 'Canales directos para conversar sobre proyectos, desarrollo web o geotecnologías.',
      tagsOverride: ['fedebarzola7@gmail.com', 'Mendoza', 'LinkedIn', 'GitHub'],
      ctaLabelOverride: 'Enviar Mensaje'
    }
  }
};

const DEFAULT_PORTFOLIO: FullPortfolioData = {
  profile: {
    nombre: 'Federico Barzola',
    titulo: 'Estudiante de Geotecnologías y Desarrollador Web',
    subtituloHero: 'Desarrollo front-end · Mendoza',
    tituloHero: 'Soy Federico.',
    bajadaHero: 'Desarrollo web y cartografía.',
    subtitulo: 'Universidad Nacional de Cuyo · Mendoza, Argentina',
    resumen: 'Desarrollo soluciones interactivas combinando programación web moderna (Angular, TypeScript, Canvas 2D) con análisis de datos geográficos y sistemas de información geográfica (SIG / QGIS).',
    bioTexto2: 'Estudio e investigo en la Universidad Nacional de Cuyo, combinando representación de datos espaciales y desarrollo web frontend.',
    ubicacion: 'Mendoza, Argentina',
    institucion: 'UNCuyo - Facultad de Filosofía y Letras',
    hitos: [
      { numero: 'UNCuyo', label: 'Geotecnologías - 2º Año' },
      { numero: 'Canvas 2D', label: 'Visualización e interacción' },
      { numero: 'SIG', label: 'Cartografía web' }
    ],
    competencias: [
      'Responsabilidad y compromiso',
      'Trabajo en equipo y colaboración',
      'Adaptabilidad y versatilidad',
      'Resolución de problemas',
      'Aprendizaje continuo'
    ],
    estudios: [
      {
        titulo: 'Tecnicatura en Geotecnologías',
        institucion: 'Facultad de Filosofía y Letras — Universidad Nacional de Cuyo (UNCuyo)',
        periodo: 'Cursando 2º Año (1er Año Finalizado)',
        descripcion: 'Formación especializada en herramientas de Información Geográfica (SIG), desarrollo de Geovisores mediante tecnologías web, QGIS y QField.'
      },
      {
        titulo: 'Desarrollo web y proyectos personales',
        institucion: 'Formación continua y práctica independiente',
        periodo: 'Aprendizaje applied',
        descripcion: 'Práctica independiente en interfaces web, aplicaciones interactivas y visualizaciones con JavaScript y Canvas 2D.'
      }
    ]
  },
  proyectos: [
    {
      titulo: 'GEOVISOR WEB',
      subtitulo: 'Geovisor de plazas · Gran Mendoza',
      descripcion: 'Mapa interactivo con vistas de calles, satélite y relieve; capas temáticas, herramientas de dibujo y carga de archivos geográficos.',
      tecnologias: ['JavaScript', 'Leaflet', 'SIG / QGIS', 'HTML', 'CSS'],
      imagen: '',
      githubUrl: 'https://github.com/pincha1212/My-first-geoViewer',
      destacado: true
    },
    {
      titulo: 'Weather App',
      subtitulo: 'Pronóstico meteorológico en vivo',
      descripcion: 'Aplicación del clima que consulta condiciones atmosféricas y pronósticos para distintas ubicaciones mediante la API de OpenWeatherMap.',
      tecnologias: ['JavaScript', 'API', 'CSS', 'HTML'],
      imagen: 'assets/images/weather.jpg',
      demoUrl: 'https://pincha1212.github.io/weather/',
      githubUrl: 'https://github.com/pincha1212/weather'
    },
    {
      titulo: 'CineApp',
      subtitulo: 'Catálogo de cine · API TMDB',
      descripcion: 'Aplicación web para buscar películas en el catálogo de TMDB, con filtros, recomendaciones y acceso a tráilers.',
      tecnologias: ['JavaScript', 'API', 'CSS', 'HTML'],
      imagen: 'assets/images/netfliz-clone.jpg',
      demoUrl: 'https://pincha1212.github.io/FDPelis/',
      githubUrl: 'https://github.com/pincha1212/FDPelis'
    },
    {
      titulo: 'Calculator Web',
      subtitulo: 'Herramienta de cálculo web',
      descripcion: 'Calculadora adaptable para operaciones matemáticas de uso cotidiano.',
      tecnologias: ['HTML', 'CSS', 'JavaScript'],
      imagen: 'assets/images/calculator.jpg',
      demoUrl: 'https://pincha1212.github.io/calculator/',
      githubUrl: 'https://github.com/pincha1212/calculator'
    },
    {
      titulo: 'Clash of Gods',
      subtitulo: 'Juego de duelos 2D · React y Canvas',
      descripcion: 'Proyecto de juego inspirado en Pong, con partidas individuales o para dos personas, selección de personajes y arenas.',
      tecnologias: ['React', 'TypeScript', 'Canvas 2D', 'Vite'],
      imagen: '',
      githubUrl: 'https://github.com/pincha1212/clash-of-gods-pingPong'
    }
  ],
  habilidades: [
    {
      categoria: 'Desarrollo Web Frontend',
      items: ['Angular 19+', 'TypeScript', 'JavaScript (ES6+)', 'HTML5 / CSS3', 'Tailwind CSS', 'RxJS', 'Signals']
    },
    {
      categoria: 'Geotecnologías & Cartografía',
      items: ['QGIS / SIG', 'Leaflet', 'Mapas Interactivos', 'Análisis Espacial', 'Geoserver', 'GeoJSON']
    },
    {
      categoria: 'Gráficos & Experiencias 3D',
      items: ['Three.js', 'Canvas 2D API', 'GLTF / GLB Loader', 'Web Audio API', 'Motion Animation']
    },
    {
      categoria: 'Herramientas & Entornos',
      items: ['Git & GitHub', 'GitHub Actions CI/CD', 'VS Code', 'Node.js', 'Vite', 'Firebase Firestore']
    }
  ],
  experiencia: [
    {
      periodo: '2024 - Presente',
      rol: 'Desarrollador Web & Proyectos de Geotecnología',
      empresa: 'Proyectos Personales / UNCuyo',
      descripcion: 'Construcción de aplicaciones web interactivas, visores geográficos SIG y simuladores espaciales con soporte adaptativo.',
      tecnologias: ['Angular', 'TypeScript', 'Leaflet', 'Three.js']
    },
    {
      periodo: '2023 - 2024',
      rol: 'Simulación de Trabajo en Equipo (NoCountry)',
      empresa: 'NoCountry Emulaciones',
      descripcion: 'Desarrollo colaborativo en equipos multidisciplinarios bajo metodologías ágiles Scrum, entregando MVPs con Angular y Tailwind.',
      tecnologias: ['Angular', 'Scrum', 'Git', 'REST APIs']
    }
  ],
  trayectoriaExtra: {
    tituloSeccion: 'Experiencia Complementaria & Formación',
    objetivoProfesional: 'Desarrollarme profesionalmente en el ámbito tecnológico, especialmente en desarrollo front-end, aplicaciones web y soluciones geoespaciales. Aspiro a crecer en equipos de trabajo, aportar soluciones claras y avanzar hacia posiciones de coordinación.',
    idiomas: [
      { nombre: 'Inglés', nivel: 'Uso técnico', codigo: 'EN' }
    ]
  },
  contacto: {
    email: 'fedebarzola7@gmail.com',
    telefono: '+54 261 383 6127',
    github: 'https://github.com/pincha1212',
    linkedin: 'https://www.linkedin.com/in/federico-barzola-7138b3216/',
    ubicacion: 'Mendoza, Argentina',
    formspreeEndpoint: 'https://formspree.io/f/xdkezazb',
    redes: [
      { nombre: 'GitHub', url: 'https://github.com/pincha1212', iconoUrl: 'assets/icons/github.png', iconoTexto: 'GH' },
      { nombre: 'LinkedIn', url: 'https://www.linkedin.com/in/federico-barzola-7138b3216/', iconoUrl: 'assets/icons/linkedin.png', iconoTexto: 'IN' }
    ]
  },
  modelosNave: DEFAULT_FLEET_SHIPS,
  modo3DConfig: DEFAULT_MODO3D_CONFIG,
  updatedAt: new Date().toISOString()
};

export function sanitizeModo3DConfig(config: any): Modo3DConfig {
  const defaults = DEFAULT_MODO3D_CONFIG;
  if (!config || typeof config !== 'object') return JSON.parse(JSON.stringify(defaults));

  const stationsConfig: Record<string, StationCustomConfig> = {};
  const stationKeys = ['sobre-mi', 'habilidades', 'proyectos', 'experiencia', 'contacto'];

  stationKeys.forEach(key => {
    const defaultSt = defaults.stationsConfig![key];
    const userSt = config.stationsConfig && config.stationsConfig[key];
    if (userSt) {
      stationsConfig[key] = {
        sectionId: key,
        useCustomData: !!userSt.useCustomData,
        nameOverride: userSt.nameOverride || defaultSt.nameOverride,
        subtitleOverride: userSt.subtitleOverride || defaultSt.subtitleOverride,
        descriptionOverride: userSt.descriptionOverride || defaultSt.descriptionOverride,
        tagsOverride: Array.isArray(userSt.tagsOverride) ? userSt.tagsOverride : [...(defaultSt.tagsOverride || [])],
        ctaLabelOverride: userSt.ctaLabelOverride || defaultSt.ctaLabelOverride
      };
    } else {
      stationsConfig[key] = JSON.parse(JSON.stringify(defaultSt));
    }
  });

  return {
    tacticalObjectiveTitle: config.tacticalObjectiveTitle || defaults.tacticalObjectiveTitle,
    combatActivatedMessage: config.combatActivatedMessage || defaults.combatActivatedMessage,
    freeModeActivatedMessage: config.freeModeActivatedMessage || defaults.freeModeActivatedMessage,
    shieldImpactMessage: config.shieldImpactMessage || defaults.shieldImpactMessage,
    enemyDestroyedMessage: config.enemyDestroyedMessage || defaults.enemyDestroyedMessage,
    waveClearedMessage: config.waveClearedMessage || defaults.waveClearedMessage,
    boundaryWarningMessage: config.boundaryWarningMessage || defaults.boundaryWarningMessage,
    stationEncounterMessage: config.stationEncounterMessage || defaults.stationEncounterMessage,
    lowHealthWarningMessage: config.lowHealthWarningMessage || defaults.lowHealthWarningMessage,
    combatStartMessage: config.combatStartMessage || defaults.combatStartMessage,
    gamePausedMessage: config.gamePausedMessage || defaults.gamePausedMessage,
    hostileTargetLockedMessage: config.hostileTargetLockedMessage || defaults.hostileTargetLockedMessage,
    deviceIncompatibilityMessage: config.deviceIncompatibilityMessage || defaults.deviceIncompatibilityMessage,
    incompatibilityTitle: config.incompatibilityTitle || defaults.incompatibilityTitle,
    incompatibilitySubtitle: config.incompatibilitySubtitle || defaults.incompatibilitySubtitle,
    incompatibilityRequirements: Array.isArray(config.incompatibilityRequirements) ? config.incompatibilityRequirements : [...(defaults.incompatibilityRequirements || [])],
    incompatibilityFooter: config.incompatibilityFooter || defaults.incompatibilityFooter,
    stationsConfig
  };
}

function sanitizeFleet(list: any): NaveModel[] {
  if (!Array.isArray(list) || list.length === 0) {
    return DEFAULT_FLEET_SHIPS;
  }
  // Check if list only has the legacy empty-url ships
  const hasOnlyLegacyEmpty = list.every((item: any) => !item.url || item.url === 'assets/models/ship.glb');
  if (hasOnlyLegacyEmpty) {
    return DEFAULT_FLEET_SHIPS;
  }
  // If list has some custom ships, ensure the presets are present plus any custom items
  const customItems = list.filter((item: any) => item.url && !item.url.startsWith('preset:'));
  return [...DEFAULT_FLEET_SHIPS, ...customItems];
}

@Injectable({
  providedIn: 'root'
})
export class PortfolioDataService {
  // Firebase initialization
  public app = initializeApp(firebaseConfig);
  public db = getFirestore(this.app, firebaseConfig.firestoreDatabaseId);
  public storage = getStorage(this.app);
  public auth = getAuth(this.app);

  // Authentication signals
  currentUser = signal<User | null>(null);
  isAuthReady = signal(false);
  isAdmin = computed(() => {
    const u = this.currentUser();
    return !!u && (u.email === 'fedebarzola7@gmail.com');
  });

  // Reactive state signals
  portfolioData = signal<FullPortfolioData>(DEFAULT_PORTFOLIO);
  isEditorOpen = signal(false);
  isSyncingCloud = signal(false);
  cloudStatus = signal<'synced' | 'saving' | 'offline' | 'error'>('synced');
  statusMessage = signal('');

  // Derived signals for components
  profile = computed(() => this.portfolioData().profile);
  proyectos = computed(() => this.portfolioData().proyectos);
  habilidades = computed(() => this.portfolioData().habilidades);
  experiencia = computed(() => this.portfolioData().experiencia);
  trayectoriaExtra = computed(() => this.portfolioData().trayectoriaExtra || DEFAULT_PORTFOLIO.trayectoriaExtra);
  contacto = computed(() => this.portfolioData().contacto);

  constructor() {
    this.initAuth();
    this.initDataFlow();
    this.setupShortcutListener();
  }

  private initAuth(): void {
    onAuthStateChanged(this.auth, (user) => {
      this.currentUser.set(user);
      this.isAuthReady.set(true);
      if (user && user.email === 'fedebarzola7@gmail.com') {
        this.statusMessage.set('Sesión iniciada como administrador');
      }
    });
  }

  async loginWithGoogle(): Promise<User | null> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const cred = await signInWithPopup(this.auth, provider);
      this.currentUser.set(cred.user);
      return cred.user;
    } catch (err) {
      console.error('Error al iniciar sesión con Google:', err);
      throw err;
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
      this.currentUser.set(null);
      this.statusMessage.set('Sesión cerrada');
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
  }

  private initDataFlow(): void {
    // 1. Immediate local cache load (Zero latency for visitor)
    if (typeof localStorage !== 'undefined') {
      try {
        const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.profile && parsed.proyectos) {
            // Merge defaults to ensure no undefined property
            this.portfolioData.set({
              ...DEFAULT_PORTFOLIO,
              ...parsed,
              profile: { ...DEFAULT_PORTFOLIO.profile, ...(parsed.profile || {}) },
              contacto: {
                ...DEFAULT_PORTFOLIO.contacto,
                ...(parsed.contacto || {}),
                redes: (parsed.contacto && Array.isArray(parsed.contacto.redes) && parsed.contacto.redes.length > 0)
                  ? parsed.contacto.redes
                  : DEFAULT_PORTFOLIO.contacto.redes
              },
              trayectoriaExtra: { 
                ...DEFAULT_PORTFOLIO.trayectoriaExtra, 
                ...(parsed.trayectoriaExtra || {}),
                idiomas: (parsed.trayectoriaExtra && Array.isArray(parsed.trayectoriaExtra.idiomas))
                  ? parsed.trayectoriaExtra.idiomas
                  : DEFAULT_PORTFOLIO.trayectoriaExtra.idiomas
              },
              modelosNave: sanitizeFleet(parsed.modelosNave),
              modo3DConfig: sanitizeModo3DConfig(parsed.modo3DConfig)
            });
          }
        }
      } catch (e) {
        console.warn('Error reading portfolio cache from localStorage:', e);
      }
    }

    // 2. Fetch latest persisted data from Firestore cloud (runs once on boot)
    this.syncFromCloudFirstTime();
  }

  private async syncFromCloudFirstTime(): Promise<void> {
    this.isSyncingCloud.set(true);
    try {
      try {
        await getDocFromServer(doc(this.db, 'test', 'connection'));
      } catch (err) {
        // Connection ping
      }

      const docRef = doc(this.db, 'portfolio', 'main');
      const snap = await getDoc(docRef);
      const localData = this.portfolioData();
      const localTime = localData.updatedAt ? new Date(localData.updatedAt).getTime() : 0;

      if (snap.exists()) {
        const cloudData = snap.data() as FullPortfolioData;
        const cloudTime = cloudData?.updatedAt ? new Date(cloudData.updatedAt).getTime() : 0;

        if (localTime > cloudTime && localTime > 0) {
          // Local changes are newer than cloud - push local state to cloud
          await setDoc(docRef, localData);
          this.cloudStatus.set('synced');
          this.statusMessage.set('Cambios locales sincronizados con la nube');
        } else if (cloudData && cloudData.profile) {
          // Cloud data is newer or equal - update state and local cache
          const merged: FullPortfolioData = {
            ...DEFAULT_PORTFOLIO,
            ...cloudData,
            profile: { ...DEFAULT_PORTFOLIO.profile, ...(cloudData.profile || {}) },
            contacto: {
              ...DEFAULT_PORTFOLIO.contacto,
              ...(cloudData.contacto || {}),
              redes: (cloudData.contacto && Array.isArray(cloudData.contacto.redes) && cloudData.contacto.redes.length > 0)
                ? cloudData.contacto.redes
                : DEFAULT_PORTFOLIO.contacto.redes
            },
            trayectoriaExtra: { 
              ...DEFAULT_PORTFOLIO.trayectoriaExtra, 
              ...(cloudData.trayectoriaExtra || {}),
              idiomas: (cloudData.trayectoriaExtra && Array.isArray(cloudData.trayectoriaExtra.idiomas))
                ? cloudData.trayectoriaExtra.idiomas
                : DEFAULT_PORTFOLIO.trayectoriaExtra.idiomas
            },
            modelosNave: sanitizeFleet(cloudData.modelosNave),
            modo3DConfig: sanitizeModo3DConfig(cloudData.modo3DConfig)
          };
          this.portfolioData.set(merged);
          this.saveToLocalStorage(merged);
          this.cloudStatus.set('synced');
          this.statusMessage.set('Sincronizado con la nube');
        }
      } else {
        // Document doesn't exist in cloud yet: Seed Firestore with localData or DEFAULT_PORTFOLIO
        const dataToSeed = localData && localData.profile ? localData : DEFAULT_PORTFOLIO;
        await setDoc(docRef, dataToSeed);
        this.saveToLocalStorage(dataToSeed);
        this.cloudStatus.set('synced');
        this.statusMessage.set('Base de datos inicializada en la nube');
      }
    } catch (err) {
      console.warn('Firestore initial sync notice:', err);
      this.cloudStatus.set('offline');
      this.statusMessage.set('Modo local (Caché activo)');
    } finally {
      this.isSyncingCloud.set(false);
    }
  }

  private setupShortcutListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (e: KeyboardEvent) => {
        const target = e.target as HTMLElement | null;
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable) {
          return;
        }

        // Key '7' toggles hidden editor
        if (e.key === '7') {
          e.preventDefault();
          this.toggleEditor();
        }
      });
    }
  }

  toggleEditor(): void {
    this.isEditorOpen.update(v => !v);
  }

  closeEditor(): void {
    this.isEditorOpen.set(false);
  }

  openEditor(): void {
    this.isEditorOpen.set(true);
  }

  // Save changes to local state, localStorage cache AND Cloud Firestore
  async savePortfolio(newData: FullPortfolioData): Promise<void> {
    const updated: FullPortfolioData = {
      ...newData,
      updatedAt: new Date().toISOString()
    };

    // 1. Update reactive state signal (Immediate UI update)
    this.portfolioData.set(updated);

    // 2. Save locally to localStorage (so repeat reloads do not need cloud fetch)
    this.saveToLocalStorage(updated);

    // 3. Security check: Only authenticated admin can write to Firestore
    if (!this.isAdmin()) {
      this.cloudStatus.set('offline');
      this.statusMessage.set('Guardado localmente. Iniciá sesión con la cuenta de administrador (fedebarzola7@gmail.com) para publicar en la nube.');
      return;
    }

    // 4. Save to Cloud Firestore
    this.cloudStatus.set('saving');
    this.statusMessage.set('Guardando en la nube...');

    const path = 'portfolio/main';
    try {
      const docRef = doc(this.db, 'portfolio', 'main');
      await setDoc(docRef, updated);
      this.cloudStatus.set('synced');
      this.statusMessage.set('Cambios guardados en la nube y localmente');
    } catch (err) {
      handleFirestoreError(this.auth, err, OperationType.WRITE, path);
      this.cloudStatus.set('error');
      this.statusMessage.set('Guardado localmente. Error de permisos o conexión con la nube.');
    }
  }

  async uploadModel(file: File): Promise<string> {
    this.cloudStatus.set('saving');
    this.statusMessage.set('Procesando modelo 3D...');

    // 1. Always ensure a 100% reliable local binary copy in IndexedDB
    const safeKey = `ship_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    let idbUrl = '';
    try {
      idbUrl = await saveModelToDB(safeKey, file);
    } catch (idbErr) {
      console.warn('IndexedDB save warning:', idbErr);
    }

    // 2. Try Firebase Cloud Storage if authenticated
    if (this.currentUser()) {
      try {
        const storageRef = ref(this.storage, `models/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        this.cloudStatus.set('synced');
        this.statusMessage.set('Modelo subido a la nube con éxito');
        return downloadURL;
      } catch (err) {
        console.warn('Firebase Storage upload notice (using persistent local IndexedDB model):', err);
      }
    }

    if (idbUrl) {
      this.cloudStatus.set('synced');
      this.statusMessage.set('Modelo guardado en almacenamiento local persistente');
      return idbUrl;
    }
    this.cloudStatus.set('error');
    this.statusMessage.set('Error al procesar modelo.');
    throw new Error('No se pudo procesar el archivo');
  }

  private saveToLocalStorage(data: FullPortfolioData): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        console.warn('LocalStorage save warning:', e);
      }
    }
  }

  resetToDefaults(): void {
    this.savePortfolio(DEFAULT_PORTFOLIO);
  }
}
