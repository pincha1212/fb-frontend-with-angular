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
  proyectos: Proyecto[] = [
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
  ];

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
