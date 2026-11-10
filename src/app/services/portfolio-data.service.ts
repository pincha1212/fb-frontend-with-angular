import { Injectable, signal, computed } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../../firebase-applet-config.json';
import { Proyecto } from '../components/proyectos/proyectos.component';

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

export interface TrayectoriaExtra {
  tituloSeccion: string;
  objetivoProfesional: string;
  idiomaNombre: string;
  idiomaNivel: string;
  idiomaCodigo: string;
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

export interface FullPortfolioData {
  profile: ProfileData;
  proyectos: Proyecto[];
  habilidades: HabilidadCat[];
  experiencia: ExperienciaItem[];
  trayectoriaExtra: TrayectoriaExtra;
  contacto: ContactoData;
  updatedAt: string;
}

const LOCAL_STORAGE_KEY = 'portfolio_data_cache_v2';

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
        periodo: 'Aprendizaje aplicado',
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
    idiomaNombre: 'Inglés',
    idiomaNivel: 'Uso técnico',
    idiomaCodigo: 'EN'
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
  updatedAt: new Date().toISOString()
};

@Injectable({
  providedIn: 'root'
})
export class PortfolioDataService {
  // Firebase initialization
  private app = initializeApp(firebaseConfig);
  public db = getFirestore(this.app, firebaseConfig.firestoreDatabaseId);

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
    this.initDataFlow();
    this.setupShortcutListener();
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
              trayectoriaExtra: { ...DEFAULT_PORTFOLIO.trayectoriaExtra, ...(parsed.trayectoriaExtra || {}) }
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
            trayectoriaExtra: { ...DEFAULT_PORTFOLIO.trayectoriaExtra, ...(cloudData.trayectoriaExtra || {}) }
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

    // 3. Save to Cloud Firestore
    this.cloudStatus.set('saving');
    this.statusMessage.set('Guardando en la nube...');

    try {
      const docRef = doc(this.db, 'portfolio', 'main');
      await setDoc(docRef, updated);
      this.cloudStatus.set('synced');
      this.statusMessage.set('Cambios guardados en la nube y localmente');
    } catch (err) {
      console.error('Error writing to Firestore:', err);
      this.cloudStatus.set('error');
      this.statusMessage.set('Guardado localmente. Error de conexión con la nube.');
    }
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
