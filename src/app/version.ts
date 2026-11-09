export interface AppChangelogEntry {
  version: string;
  date: string;
  title: string;
  description: string;
  auditTrail: {
    component: string;
    action: string;
    detail: string;
  }[];
}

export interface AppVersionData {
  currentVersion: string;
  lastUpdated: string;
  author: string;
  environment: string;
  changelog: AppChangelogEntry[];
}

export const APP_VERSION: AppVersionData = {
  currentVersion: '3.4.0',
  lastUpdated: '2026-11-09',
  author: 'Federico Barzola',
  environment: 'Production & Preview',
  changelog: [
    {
      version: '3.4.0',
      date: '2026-11-09',
      title: 'Carta orbital y estaciones de datos',
      description: 'El portafolio unifica la interfaz visual con la experiencia espacial: navegación orbital en tres ejes, estaciones satelitales a distintas altitudes, cuerpos planetarios y una carta de destinos.',
      auditTrail: [
        {
          component: 'SpacePlaygroundComponent',
          action: 'Vuelo y entorno de espacio profundo',
          detail: 'Se incorporaron orientación vertical, deriva inercial y referencias planetarias para que el vuelo se sienta como una travesía orbital.'
        },
        {
          component: 'SpaceStationComponent',
          action: 'Carta orbital de estaciones',
          detail: 'Los destinos ahora se presentan como módulos satelitales sobre un mapa orbital interactivo, con su información real de portafolio.'
        }
      ]
    },
    {
      version: '3.2.0',
      date: '2026-11-07',
      title: 'Botón Jugar Directo y Eliminación de Vibración de Cursor & Modo Claro',
      description: 'Incorporación del botón principal "Jugar" en la sección Hero para abrir el simulador interactivo (sin mención textual al modo 3D). Eliminación completa del modo claro y fijación permanente del modo oscuro en el body. Remoción de la vibración de pantalla al mover el mouse y del cursor espacial/nave seguidor.',
      auditTrail: [
        {
          component: 'AppComponent',
          action: 'Hero Jugar CTA & Cleanup',
          detail: 'Botón Jugar con diseño degradado neón que activa el simulador interactivo. Remoción de SpaceshipVibrationDirective y SpaceCursorComponent.'
        },
        {
          component: 'ThemeService & Styles',
          action: 'Permanent Dark Mode',
          detail: 'Eliminación completa de estilos e interruptores de modo claro, fijando body y variables de diseño permanentemente en modo oscuro.'
        }
      ]
    },
    {
      version: '3.1.0',
      date: '2026-11-07',
      title: 'Conmutador de Tema Switch (Theme Toggle) con Clases theme-dark y theme-light',
      description: 'Implementación del componente interactivo ThemeToggleComponent que conmuta dinámicamente las clases theme-dark y theme-light en el elemento body, sincronizado con ThemeService, persistencia en localStorage, atajos en la barra de navegación superior, HUD 3D de la cabina y barra de progreso lateral.',
      auditTrail: [
        {
          component: 'ThemeToggleComponent',
          action: 'Theme Switch Component Implementation',
          detail: 'Interruptor visual con pista graduada día/noche, botón deslizante con iconos dinámicos (Sol/Luna) y compatibilidad accesible (role=switch, aria-checked).'
        },
        {
          component: 'ThemeService',
          action: 'Body Class Toggling & Persistence',
          detail: 'Gestión estricta de las clases theme-dark y theme-light en document.body con difusión de eventos para adaptar componentes Three.js y fondos dinámicos.'
        }
      ]
    },
    {
      version: '3.0.0',
      date: '2026-11-06',
      title: 'Escenario 3D interactivo: nave espacial y estaciones orbitales',
      description: 'Primera versión del escenario interactivo de Three.js para explorar las secciones del portafolio mediante estaciones, una nave de vuelo controlable, un mapa orbital y una cabina con lecturas de navegación.',
      auditTrail: [
        {
          component: 'SpacePlaygroundComponent',
          action: 'Escena Three.js con nave y estaciones orbitales',
          detail: 'Modelo procedural de nave, asteroides, cielo estrellado, estaciones para cada sección y control desde cabina con soporte táctil.'
        },
        {
          component: 'AppComponent & SectionProgressIndicatorComponent',
          action: 'Space Mode Integration & Deep Linking',
          detail: 'Lanzador en Hero y acceso a las secciones del portafolio desde las estaciones orbitales.'
        }
      ]
    },
    {
      version: '2.8.0',
      date: '2026-11-06',
      title: 'Arquitectura de Secciones Desplegables Tipo Acordeón con Controles Rápidos',
      description: 'Transformación de todas las secciones del portfolio en tarjetas desplegables interactivas con encabezados interactivos, animación fluida en CSS Grid (0fr a 1fr), sincronización de apertura automática desde el menú lateral y barra de control global (Desplegar Todo / Plegar Todo).',
      auditTrail: [
        {
          component: 'AppComponent',
          action: 'Collapsible Sections Architecture',
          detail: 'Implementación de estado reactivo expandedSections con soporte para apertura individual, masiva y sincronización con navegación lateral.'
        },
        {
          component: 'SectionProgressIndicatorComponent',
          action: 'Auto-Expand Signal Dispatch',
          detail: 'Emisión del evento request-expand-section para garantizar despliegue automático al seleccionar nodos del menú.'
        }
      ]
    },
    {
      version: '2.7.0',
      date: '2026-11-06',
      title: 'Depuración de Superposiciones HUD y Simplificación de Contenidos',
      description: 'Eliminación del indicador de marca de tiempo [REC 00:00.0] y controladores superpuestos sobre el lienzo de fondo, fijación permanente del modo oscuro e higienización de textos secundarios en todos los componentes para una presentación profesional y directa.',
      auditTrail: [
        {
          component: 'AnimatedBackgroundComponent',
          action: 'HUD Timestamp & Overlay Cleanup',
          detail: 'Remoción de las etiquetas de tiempo REC y paneles flotantes de ajustes para mantener un lienzo de fondo oscuro pulcro y enfocado.'
        },
        {
          component: 'SobreMiComponent & HabilidadesComponent & ProyectosComponent & ContactoComponent',
          action: 'Content Clean-Up',
          detail: 'Eliminación de insignias redundantes y simplificación de encabezados principales para una lectura directa del portfolio.'
        }
      ]
    },
    {
      version: '2.6.0',
      date: '2026-11-06',
      title: 'Conmutador de Tema Claro/Oscuro con Persistencia en LocalStorage y Variables CSS',
      description: 'Implementación del servicio ThemeService con gestión de tema (Oscuro/Claro), persistencia automática en localStorage, actualización dinámica del atributo data-theme en el elemento raíz y actualización reactiva de la atmósfera del canvas 3D.',
      auditTrail: [
        {
          component: 'ThemeService',
          action: 'State Management & LocalStorage Persistence',
          detail: 'Signal reactivo con detección de preferencia prefers-color-scheme y persistencia bajo la clave app-portfolio-theme.'
        },
        {
          component: 'SectionProgressIndicatorComponent',
          action: 'HUD Theme Toggle Button',
          detail: 'Botón conmutador flotante en el menú lateral derecho para alternar entre modo sol (claro) y modo luna (oscuro).'
        },
        {
          component: 'AnimatedBackgroundComponent',
          action: 'Dynamic Canvas Palette Shift',
          detail: 'Evento personalizado app-theme-changed que adapta el renderizado de gradientes y partículas al modo seleccionado.'
        }
      ]
    },
    {
      version: '2.5.0',
      date: '2026-11-06',
      title: 'Formulario de Contacto Directo con Validación Básica y Atajo Mailto',
      description: 'Implementación del formulario de contacto interactivo en ContactoComponent con validación básica en tiempo real (nombre mínimo 2 caracteres, correo electrónico con patrón RFC y mensaje mínimo 10 caracteres), feedback de errores visuales y atajo mailto directo a fedebarzola7@gmail.com.',
      auditTrail: [
        {
          component: 'ContactoComponent',
          action: 'Contact Form Validation & Mailto Link',
          detail: 'Validación NgForm reactiva con ngModel, pattern de correo, alertas de validación y envío mediante Formspree API + mailto fallback.'
        }
      ]
    },
    {
      version: '2.4.0',
      date: '2026-11-06',
      title: 'Directiva Responsiva Dinámica de Transformación de Grilla a Carrusel',
      description: 'Creación e integración de ResponsiveLayoutDirective ([appResponsiveLayout]) que evalúa en tiempo real el ancho de viewport (mediante ResizeObserver y window resize) para conmutar dinámicamente el layout: grilla multi-columna en escritorio (>1024px), carrusel horizontal de 2 elementos en tablet (768px-1024px) y carrusel compacto de 1 elemento en móviles (<768px).',
      auditTrail: [
        {
          component: 'ResponsiveLayoutDirective',
          action: 'Dynamic Layout Transformation',
          detail: 'Supervisión de ResizeObserver con asignación dinámica de clases layout-mobile-carousel, layout-tablet-carousel y layout-desktop-grid.'
        },
        {
          component: 'ProyectosComponent & HabilidadesComponent',
          action: 'Directive Integration',
          detail: 'Incorporación del selector [appResponsiveLayout] en los contenedores principales de tarjetas.'
        }
      ]
    },
    {
      version: '2.3.0',
      date: '2026-11-06',
      title: 'Sincronización de Marcas de Tiempo de Video con Navegación de Secciones',
      description: 'Implementación del mecanismo de búsqueda (seek) de video por sección en AnimatedBackgroundComponent. Al hacer clic en los enlaces o botones del menú lateral, el reproductor de fondo busca automáticamente la marca de tiempo (timestamp) correspondiente (Hero: 00:00.0, Sobre Mí: 00:03.5, Habilidades: 00:07.0, Proyectos: 00:10.5, Experiencia: 00:14.0, Contacto: 00:17.5) con un distintivo HUD interactivo REC en pantalla.',
      auditTrail: [
        {
          component: 'AnimatedBackgroundComponent',
          action: 'Video Section Timestamp Seeking',
          detail: 'Mapeo unívoco de timestamps por sección e indicador HUD con parpadeo REC e identificación de stage activo.'
        },
        {
          component: 'SectionProgressIndicatorComponent',
          action: 'Custom Seek Event Dispatch',
          detail: 'Emisión del evento global seek-bg-section al seleccionar cualquier nodo del menú lateral derecho.'
        }
      ]
    },
    {
      version: '2.2.0',
      date: '2026-11-06',
      title: 'Sincronización de Fondo Video-Scroll y Adaptabilidad Responsiva Multinivel',
      description: 'Garantía de visibilidad total (opacidad 100% permanente en todas las secciones), sincronización del motor canvas 3D con la navegación lateral derecha y reestructuración adaptativa: 1 tarjeta en carrusel horizontal táctil para móviles (<768px), 2 tarjetas en carrusel para tablets (768px-1024px) y grilla completa para computadora (>1024px).',
      auditTrail: [
        {
          component: 'ScrollAnimationDirective',
          action: '100% Opacity Guarantee',
          detail: 'Fijación de opacidad en 1 para eliminar secciones invisibles y mantener textos e imágenes 100% nítidos.'
        },
        {
          component: 'HabilidadesComponent & ProyectosComponent & SobreMiComponent',
          action: 'Multi-device Responsive Carousels',
          detail: 'Reglas CSS scroll-snap-type: x mandatory para carrusel de 1 elemento en móvil y 2 elementos en tablet.'
        },
        {
          component: 'AnimatedBackgroundComponent & SectionProgressIndicatorComponent',
          action: 'Video-Scroll Scrubbing Sync',
          detail: 'Proyección 3D y atenuación atmosférica enlazada suavemente a la navegación de botones laterales.'
        }
      ]
    },
    {
      version: '2.1.0',
      date: '2026-11-06',
      title: 'Directiva de Animación Reactiva con Intersection Observer',
      description: 'Implementación de la directiva Angular ScrollAnimationDirective basada en la API nativa IntersectionObserver con soporte para animaciones configurables (slide-up, fade-in, scale-up, slide-left, slide-right), umbral de intersección dinámico y fallback de seguridad.',
      auditTrail: [
        {
          component: 'ScrollAnimationDirective',
          action: 'IntersectionObserver Transitions',
          detail: 'Supervisión del viewport con curva cubic-bezier(0.16, 1, 0.3, 1), opacidad de seguridad y tipos de entrada por sección.'
        }
      ]
    },
    {
      version: '2.0.0',
      date: '2026-11-06',
      title: 'Layout Flexbox para Habilidades Técnicas e Indicadores de Progreso',
      description: 'Implementación del layout Flexbox dinámico en HabilidadesComponent con selector de vista doble: insignias estilizadas (Badges pastilla Flexbox con minibarras) y vista de barras de progreso por categoría con porcentaje exacto (HTML5 95%, JS 92%, CSS3 90%, Canvas 2D 88%, etc.).',
      auditTrail: [
        {
          component: 'HabilidadesComponent',
          action: 'Flexbox Layout & Progress Bars',
          detail: 'Flexbox flex-wrap responsive layout con insignias personalizadas, gradiente por tecnología y alternador interactivo de vista.'
        }
      ]
    },
    {
      version: '1.9.0',
      date: '2026-11-06',
      title: 'Rediseño de Grilla de Proyectos con Enlaces a Demo Live y GitHub',
      description: 'Implementación del componente Proyectos con tarjetas en diseño de grilla responsiva (CSS Grid), insignias de proyectos destacados (Clash of Gods, Geovisor SIG), etiquetas tecnológicas coloreadas y botones duales de acción para Demo Web y código fuente en GitHub.',
      auditTrail: [
        {
          component: 'ProyectosComponent',
          action: 'Grid & Dual CTA Actions',
          detail: 'Configuración de modelo de datos con demoUrl y githubUrl, renderizado en grilla responsiva y fallback SVG dinámico.'
        }
      ]
    },
    {
      version: '1.8.0',
      date: '2026-11-06',
      title: 'Categorización de Conocimientos Técnicos & Detalles de Contacto CV',
      description: 'Reestructuración completa del componente Habilidades por áreas clave (Desarrollo Web Frontend, Geotecnologías & SIG, Herramientas) con insignias de nivel e integración de ubicación y teléfono directo (+54 261 383 6127) en la sección de contacto.',
      auditTrail: [
        {
          component: 'HabilidadesComponent',
          action: 'Skills Categorization & Badges',
          detail: 'Renderizado de categorías estructuradas en tarjetas glassmorphic con iconos locales e indicadores de dominio técnico.'
        },
        {
          component: 'ContactoComponent',
          action: 'Contact Information & Phone Link',
          detail: 'Incorporación de ubicación (Mendoza, Argentina), teléfono interactivo y diseño de pastillas informativas.'
        }
      ]
    },
    {
      version: '1.7.0',
      date: '2026-11-06',
      title: 'Creación e integración del componente Sobre Mí (Perfil Profesional y Estudios)',
      description: 'Implementación del componente SobreMiComponent que detalla el resumen profesional, hitos de experiencia y línea de tiempo de estudios y formación académica, integrado en el flujo de scroll y en el indicador lateral de navegación.',
      auditTrail: [
        {
          component: 'SobreMiComponent',
          action: 'Professional Summary & Studies',
          detail: 'Creación de estructura glassmorphic con bio profesional, métricas clave e itinerario de formación.'
        },
        {
          component: 'SectionProgressIndicatorComponent & AppComponent',
          action: 'Navigation & Integration',
          detail: 'Incorporación de la sección #sobre-mi en el indicador lateral derecho y en el flujo principal del template.'
        }
      ]
    },
    {
      version: '1.6.0',
      date: '2026-11-06',
      title: 'Corrección crítica de apilamiento z-index (Visibilidad de secciones)',
      description: 'Ajuste del orden de capas (z-index) para colocar el lienzo del fondo animado detrás del contenido (z-index: 0) y elevar el contenedor principal a z-index: 10, garantizando que todas las secciones del portfolio sean perfectamente visibles y legibles.',
      auditTrail: [
        {
          component: 'AnimatedBackgroundComponent & AppComponent',
          action: 'Stacking Context Fix',
          detail: 'Asignación de z-index: 0 al fondo animado y z-index: 10 al contenido principal (.main-content) para evitar que el canvas cubra el texto y las tarjetas.'
        }
      ]
    },
    {
      version: '1.5.0',
      date: '2026-11-06',
      title: 'Corrección de visibilidad de secciones y desbordamiento de scroll',
      description: 'Eliminación del bloqueo de desbordamiento en el contenedor principal y ajuste en la directiva ScrollAnimationDirective para garantizar que todas las secciones del portfolio sean visibles en todo momento con una opacidad mínima de seguridad (0.4).',
      auditTrail: [
        {
          component: 'ScrollAnimationDirective',
          action: 'Visibility Safety Threshold',
          detail: 'Establecimiento de opacidad inicial 1 y límite mínimo de animación (0.4) para evitar que las secciones queden ocultas.'
        },
        {
          component: 'AppComponent Styles',
          action: 'Scroll Flow Fix',
          detail: 'Remoción de overflow: hidden en el contenedor .background para habilitar el scroll vertical completo y natural de la página.'
        }
      ]
    },
    {
      version: '1.4.0',
      date: '2026-11-06',
      title: 'Optimización y realce del prisma 3D central (Pyramid/Angular Crystal)',
      description: 'Mejora visual de la estructura poliédrica central en el Hero con anillos orbitales giratorios, chispas de energía radiantes, mallas holográficas en las caras y mayor respuesta inercial al movimiento del cursor.',
      auditTrail: [
        {
          component: 'AnimatedBackgroundComponent',
          action: '3D Angular Pyramid Enhancement',
          detail: 'Incorporación de órbitas elípticas de neón, partículas de chispa energéticas y núcleo de alta refracción.'
        }
      ]
    },
    {
      version: '1.3.0',
      date: '2026-11-06',
      title: 'Indicador de progreso de secciones fijo y navegación interactiva por scroll',
      description: 'Implementación de un indicador de progreso lateral derecho con barra vertical y puntos interactivos que destacan la sección activa en tiempo real y permiten desplazamiento suave (smooth scroll) al hacer clic.',
      auditTrail: [
        {
          component: 'SectionProgressIndicatorComponent',
          action: 'Fixed Right-side Navigation & Progress',
          detail: 'Seguimiento automático de secciones con IntersectionObserver, barra de progreso porcentual del documento y tooltips interactivos.'
        },
        {
          component: 'AppComponent',
          action: 'Section Anchors & Integration',
          detail: 'Asignación de identificadores unívocos (#hero, #habilidades, #proyectos, #experiencia, #contacto) para interactividad completa.'
        }
      ]
    },
    {
      version: '1.2.0',
      date: '2026-11-06',
      title: 'Motor de fondo animado interactivo reactivo al scroll (Efecto video-scroll)',
      description: 'Sustitución de la imagen estática por un lienzo HTML5 procedural a 60 FPS con progresión lerp ligada al scroll, auroras lumínicas, campo de partículas 3D con perspectiva cónica, prisma poliédrico Angular y selector de modos visuales.',
      auditTrail: [
        {
          component: 'AnimatedBackgroundComponent',
          action: 'Cinematic Scroll Canvas Engine',
          detail: 'Implementación de renderizado continuo en canvas con interpolación lerp (factor 0.08) y aceleración de partículas según velocidad de desplazamiento.'
        },
        {
          component: 'AnimatedBackgroundComponent',
          action: 'Theme Modes & Controls',
          detail: 'Selector de modos (Nebulosa Cuántica, Malla Cyber Grid, Partículas Cósmicas) con control interactivo de pausa y optimización de tasa de refresco.'
        },
        {
          component: 'AppComponent & Styles',
          action: 'Layout Decoupling',
          detail: 'Eliminación de la imagen estática angular-bg.webp del contenedor principal; elevación del contenido con capas de viñeta cinematográfica para máximo contraste visual.'
        }
      ]
    },
    {
      version: '1.1.0',
      date: '2026-11-06',
      title: 'Auditoría de activos e integridad de imágenes locales',
      description: 'Resolución de fallos HTTP 503/403 en proveedores CDN externos (ibb.co, flaticon). Migración de todos los recursos a assets locales en /public/assets/.',
      auditTrail: [
        {
          component: 'ProyectosComponent',
          action: 'Asset Migration & Resilience',
          detail: 'Migración de capturas de proyectos (CineApp / Netflix Clone, Weather App, Calculator) a /assets/images/ con fallback SVG dinámico tipado.'
        },
        {
          component: 'HabilidadesComponent',
          action: 'Icon Migration',
          detail: 'Alojamiento local de logos tecnológicos (HTML5, CSS3, JavaScript, Angular, TypeScript) en /assets/icons/ con atributo referrerpolicy="no-referrer".'
        },
        {
          component: 'ContactoComponent',
          action: 'Icon Migration',
          detail: 'Alojamiento local de marcas sociales (GitHub, LinkedIn) en /assets/icons/ garantizando disponibilidad constante.'
        },
        {
          component: 'AppComponent & Styles',
          action: 'Theme & Cursor Reliability',
          detail: 'Alojamiento local de angular-bg.webp y cursores de espada y pico para evitar cuelgues de red.'
        }
      ]
    },
    {
      version: '1.0.0',
      date: '2026-11-06',
      title: 'Migración inicial de repositorio',
      description: 'Migración inicial desde GitHub pincha1212/fb-frontend-with-angular al entorno Node.js 22 / Angular 19.',
      auditTrail: [
        {
          component: 'Build & Config',
          action: 'Normalización de build',
          detail: 'Configuración de baseHref en / y enlace de scripts npm dev y build sobre puerto 3000 con soporte iframe.'
        }
      ]
    }
  ]
};
