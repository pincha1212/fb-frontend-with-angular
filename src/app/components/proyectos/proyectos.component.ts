import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResponsiveLayoutDirective } from '../../responsive-layout.directive';

export interface Proyecto {
  titulo: string;
  subtitulo?: string;
  descripcion: string;
  tecnologias: string[];
  imagen: string;
  demoUrl?: string;
  githubUrl?: string;
  destacado?: boolean;
}

@Component({
  selector: 'app-proyectos',
  standalone: true,
  imports: [CommonModule, ResponsiveLayoutDirective],
  templateUrl: './proyectos.component.html',
  styleUrls: ['./proyectos.component.css']
})
export class ProyectosComponent {
  techColors: { [key: string]: string } = {
    'JavaScript': '#f7df1e',
    'HTML': '#e34c26',
    'CSS': '#264de4',
    'API': '#00ff95',
    'Canvas 2D': '#ff7b00',
    'SIG / QGIS': '#4ecdc4',
    'React': '#61dafb',
    'Angular': '#dd1b16',
    'TypeScript': '#007acc',
    'Vite': '#8b73e8',
    'Leaflet': '#78a65a'
  };

  proyectos: Proyecto[] = [
    {
      titulo: 'CLASH OF GODS',
      subtitulo: 'Arena mitológica · React y Canvas 2D',
      descripcion: 'Juego de duelos inspirado en Pong, con partidas contra la CPU o para dos jugadores. Incluye selección de personajes, arenas y habilidades.',
      tecnologias: ['React', 'TypeScript', 'Canvas 2D', 'Vite'],
      imagen: '',
      githubUrl: 'https://github.com/pincha1212/clash-of-gods-pingPong',
      destacado: true
    },
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
      titulo: 'CineApp',
      subtitulo: 'Streaming & Catálogo TMDB',
      descripcion: 'Plataforma web de búsqueda y exploración de películas en tiempo real consumiendo la API REST de TMDB con filtros dinámicos, recomendaciones y tráilers.',
      tecnologias: ['JavaScript', 'API', 'CSS', 'HTML'],
      imagen: 'assets/images/netfliz-clone.jpg',
      demoUrl: 'https://pincha1212.github.io/FDPelis/',
      githubUrl: 'https://github.com/pincha1212/FDPelis'
    },
    {
      titulo: 'Weather App',
      subtitulo: 'Pronóstico Meteorológico en Vivo',
      descripcion: 'Aplicación del clima interactiva que consulta las condiciones atmosféricas globales y pronósticos en tiempo real mediante la API OpenWeatherMap.',
      tecnologias: ['JavaScript', 'API', 'CSS', 'HTML'],
      imagen: 'assets/images/weather.jpg',
      demoUrl: 'https://pincha1212.github.io/weather/',
      githubUrl: 'https://github.com/pincha1212/weather'
    },
    {
      titulo: 'Calculator Web',
      subtitulo: 'Calculadora Interactiva',
      descripcion: 'Calculadora web moderna con diseño limpio, soporte para operaciones matemáticas completas e interfaz adaptativa.',
      tecnologias: ['HTML', 'CSS', 'JavaScript'],
      imagen: 'assets/images/calculator.jpg',
      demoUrl: 'https://pincha1212.github.io/calculator/',
      githubUrl: 'https://github.com/pincha1212/calculator'
    }
  ];

  getTechColor(tech: string): string {
    return this.techColors[tech] || '#ffffff';
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
          <text x="300" y="150" font-family="Arial, sans-serif" font-size="36" fill="#4ecdc4" text-anchor="middle">💻</text>
          <text x="300" y="220" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#ffffff" text-anchor="middle">${proyecto.titulo}</text>
          <text x="300" y="250" font-family="Arial, sans-serif" font-size="14" fill="#a0aec0" text-anchor="middle">Proyecto Front-end</text>
        </svg>
      `.trim();
      target.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }
  }
}
