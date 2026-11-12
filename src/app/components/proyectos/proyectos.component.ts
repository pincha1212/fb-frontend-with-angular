import { Component, signal, computed, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortfolioDataService } from '../../services/portfolio-data.service';

export interface Proyecto {
  titulo: string;
  subtitulo?: string;
  descripcion: string;
  tecnologias: string[];
  imagen: string;
  demoUrl?: string;
  githubUrl?: string;
  destacado?: boolean;
  categoria?: string;
  desafioTecnico?: string;
  solucionArquitectura?: string;
  caracteristicasClave?: string[];
}

@Component({
  selector: 'app-proyectos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './proyectos.component.html',
  styleUrls: ['./proyectos.component.css']
})
export class ProyectosComponent implements OnInit {
  portfolioService = inject(PortfolioDataService);

  currentIndex = signal(0);
  itemsPerPage = signal(2);
  selectedProject = signal<Proyecto | null>(null);

  get proyectos(): Proyecto[] {
    return this.portfolioService.proyectos();
  }

  get totalItems(): number {
    return this.proyectos.length + 1;
  }

  maxIndex = computed(() => Math.max(0, this.totalItems - this.itemsPerPage()));

  trackTransform = computed(() => {
    const idx = Math.min(this.currentIndex(), this.maxIndex());
    if (this.itemsPerPage() === 1) {
      return `translateX(calc(-${idx} * (100% + 1rem)))`;
    }
    return `translateX(calc(-${idx} * (50% + 0.5rem)))`;
  });

  pageDots = computed(() => {
    const count = this.maxIndex() + 1;
    return Array.from({ length: count }, (_, i) => i);
  });

  ngOnInit(): void {
    this.updateItemsPerPage();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updateItemsPerPage();
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!this.selectedProject()) return;

    if (event.key === 'Escape') {
      this.closeProjectModal();
      event.preventDefault();
    } else if (event.key === 'ArrowRight') {
      this.nextModalProject();
      event.preventDefault();
    } else if (event.key === 'ArrowLeft') {
      this.prevModalProject();
      event.preventDefault();
    }
  }

  openProjectModal(proj: Proyecto): void {
    this.selectedProject.set(proj);
  }

  closeProjectModal(): void {
    this.selectedProject.set(null);
  }

  getModalProjectIndex(proj: Proyecto): number {
    return this.proyectos.findIndex(p => p.titulo === proj.titulo);
  }

  nextModalProject(): void {
    const curr = this.selectedProject();
    if (!curr) return;
    const idx = this.getModalProjectIndex(curr);
    if (idx !== -1 && idx < this.proyectos.length - 1) {
      this.selectedProject.set(this.proyectos[idx + 1]);
    } else {
      this.selectedProject.set(this.proyectos[0]);
    }
  }

  prevModalProject(): void {
    const curr = this.selectedProject();
    if (!curr) return;
    const idx = this.getModalProjectIndex(curr);
    if (idx > 0) {
      this.selectedProject.set(this.proyectos[idx - 1]);
    } else {
      this.selectedProject.set(this.proyectos[this.proyectos.length - 1]);
    }
  }

  getProjectCategory(p: Proyecto): string {
    if (p.categoria) return p.categoria;
    const lower = (p.titulo + ' ' + p.descripcion).toLowerCase();
    if (lower.includes('geovisor') || lower.includes('sig') || lower.includes('leaflet') || lower.includes('qgis')) {
      return 'Geotecnologías & SIG / Cartografía Web';
    }
    if (lower.includes('juego') || lower.includes('canvas') || lower.includes('gods')) {
      return 'Gráficos 2D & Game Dev';
    }
    if (lower.includes('weather') || lower.includes('cine') || lower.includes('pelis')) {
      return 'Frontend & Consumo de APIs REST';
    }
    return 'Desarrollo Web Frontend';
  }

  getProjectDesafio(p: Proyecto): string {
    if (p.desafioTecnico) return p.desafioTecnico;
    const lower = (p.titulo + ' ' + p.descripcion).toLowerCase();
    if (lower.includes('geovisor')) {
      return 'Renderizar geometrías vectoriales de plazas e infraestructura territorial de Mendoza sobre capas base raster satelitales sin comprometer la fluidez en navegadores móviles y de escritorio.';
    }
    if (lower.includes('weather')) {
      return 'Gestión eficiente de estados asíncronos de conexión, respuestas de geolocalización y parseo de condiciones climáticas extremas con interfaces reactivas.';
    }
    if (lower.includes('cine') || lower.includes('pelis')) {
      return 'Búsqueda instantánea y paginación en tiempo real sobre miles de registros multimedia con filtrado por género y control de cuota de solicitudes API.';
    }
    if (lower.includes('calculator')) {
      return 'Precisión en operaciones aritméticas de coma flotante en JavaScript, gestión de historial recuperable y soporte ergonómico para teclado físico.';
    }
    if (lower.includes('gods') || lower.includes('pong')) {
      return 'Bucle de renderizado a 60 FPS estables con detección matemática de colisiones elásticas entre círculos y rectángulos en la API Canvas 2D.';
    }
    return 'Diseño de interfaz adaptativa con tipografía legible, accesibilidad y tiempos de carga instantáneos.';
  }

  getProjectSolucion(p: Proyecto): string {
    if (p.solucionArquitectura) return p.solucionArquitectura;
    const lower = (p.titulo + ' ' + p.descripcion).toLowerCase();
    if (lower.includes('geovisor')) {
      return 'Integración de Leaflet con capas GeoJSON procesadas en QGIS, selector multi-proveedor de teselas satelitales y herramientas interactivas de cálculo espacial de distancias y áreas.';
    }
    if (lower.includes('weather')) {
      return 'Consumo modular de OpenWeatherMap API, desacoplamiento de componentes de visualización y paleta de colores reactiva al clima detectado.';
    }
    if (lower.includes('cine') || lower.includes('pelis')) {
      return 'Debounce asíncrono para limitar peticiones de red, diseño inspirado en plataformas de streaming con carruseles horizontales y enlaces directos a trailers.';
    }
    if (lower.includes('calculator')) {
      return 'Máquina de estados finitos que valida sintaxis matemática antes del cómputo y emite eventos visuales de pulsación con respuesta inmediata.';
    }
    if (lower.includes('gods') || lower.includes('pong')) {
      return 'Motor de físicas en React y TypeScript montado sobre requestAnimationFrame con estados inmutables y efectos de partículas de chispas en impacto.';
    }
    return 'Arquitectura modular basada en estándares web modernos, separación de responsabilidades y estilos fluidos.';
  }

  getProjectFeatures(p: Proyecto): string[] {
    if (p.caracteristicasClave && p.caracteristicasClave.length > 0) return p.caracteristicasClave;
    const lower = (p.titulo + ' ' + p.descripcion).toLowerCase();
    if (lower.includes('geovisor')) {
      return [
        'Visualización de espacios verdes y plazas del Gran Mendoza con datos tabulares SIG',
        'Conmutación dinámica entre mapas base (satelital, callejero, relieve topográfico)',
        'Herramientas interactivas de dibujo, medición de polígonos y cálculo de perímetros',
        'Carga y superposición directa de archivos espaciales GeoJSON y KML',
        'Totalmente adaptado para consultas de campo en tablets y laptops'
      ];
    }
    if (lower.includes('weather')) {
      return [
        'Consulta meteorológica en tiempo real por búsqueda de ciudad o país',
        'Métricas detalladas: sensación térmica, humedad relativa, viento y presión',
        'Pronóstico extendido con íconos visuales de estado del cielo',
        'Manejo amigable de errores de red o localidades inexistentes'
      ];
    }
    if (lower.includes('cine') || lower.includes('pelis')) {
      return [
        'Catálogo de películas actualizado mediante API The Movie Database (TMDB)',
        'Filtro instantáneo por géneros cinematográficos y títulos populares',
        'Ficha detallada con sinopsis oficial, puntuación de audiencia y fecha de lanzamiento',
        'Acceso directo a reproductores de avances y trailers en alta definición'
      ];
    }
    if (lower.includes('calculator')) {
      return [
        'Operaciones aritméticas esenciales y funciones de porcentaje/inversión de signo',
        'Historial cronológico de cálculos anteriores con opción de reusar valores',
        'Soporte completo de navegación y tipeo con el teclado numérico de la PC',
        'Diseño minimalista de alto contraste con respuesta visual instantánea'
      ];
    }
    if (lower.includes('gods') || lower.includes('pong')) {
      return [
        'Modo arcade para 1 jugador contra IA reactiva o versus local de 2 jugadores',
        'Selección de personajes mitológicos con velocidades y poderes únicos',
        'Física elástica de pelota con aceleración y desvío según punto de impacto',
        'Sistema de efectos visuales con chispas de Canvas 2D y marcador dinámico'
      ];
    }
    return [
      'Interfaz responsiva para dispositivos móviles, tablets y computadoras',
      'Código fuente documentado y estructurado con buenas prácticas',
      'Integración ágil de tecnologías frontend modernas'
    ];
  }

  private updateItemsPerPage(): void {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 768;
      this.itemsPerPage.set(isMobile ? 1 : 2);
      if (this.currentIndex() > this.maxIndex()) {
        this.currentIndex.set(this.maxIndex());
      }
    }
  }

  prev(): void {
    if (this.currentIndex() > 0) {
      this.currentIndex.update(i => i - 1);
    }
  }

  next(): void {
    if (this.currentIndex() < this.maxIndex()) {
      this.currentIndex.update(i => i + 1);
    }
  }

  goTo(idx: number): void {
    this.currentIndex.set(Math.max(0, Math.min(idx, this.maxIndex())));
  }

  handleImageFallback(event: Event, proyecto: Proyecto): void {
    const target = event.target as HTMLImageElement;
    if (target && !target.dataset['hasFallback']) {
      target.dataset['hasFallback'] = 'true';
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340">
          <defs>
            <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#14192b"/>
              <stop offset="100%" stop-color="#090b14"/>
            </linearGradient>
          </defs>
          <rect width="600" height="340" fill="url(#g)"/>
          <circle cx="300" cy="140" r="45" fill="#4ecdc4" opacity="0.2"/>
          <circle cx="300" cy="145" r="76" fill="none" stroke="#aebec1" stroke-opacity=".42"/>
          <circle cx="300" cy="145" r="52" fill="#617a83" opacity=".48"/>
          <path d="M210 145h180M300 55v180" stroke="#d5bd8c" stroke-opacity=".55" stroke-dasharray="3 7"/>
          <text x="300" y="252" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#e4e8df" text-anchor="middle">${proyecto.titulo}</text>
          <text x="300" y="278" font-family="Arial, sans-serif" font-size="12" fill="#aebdc1" text-anchor="middle">SEÑAL DE PROYECTO · FB / WEB</text>
        </svg>
      `.trim();
      target.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }
  }
}
