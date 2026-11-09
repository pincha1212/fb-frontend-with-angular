import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

export interface Habilidad {
  nombre: string;
  icono: string;
  nivel: string;
  porcentaje: number;
  color: string;
}

export interface CategoriaHabilidad {
  titulo: string;
  habilidades: Habilidad[];
}

import { ResponsiveLayoutDirective } from '../../responsive-layout.directive';

@Component({
  imports: [CommonModule, ResponsiveLayoutDirective],
  selector: 'app-habilidades',
  standalone: true,
  templateUrl: './habilidades.component.html',
  styleUrls: ['./habilidades.component.css'],
})
export class HabilidadesComponent {
  vistaSeleccionada: 'todas' | 'barras' = 'todas';

  categorias: CategoriaHabilidad[] = [
    {
      titulo: 'Desarrollo Web Frontend',
      habilidades: [
        { nombre: 'HTML5', icono: '/assets/icons/html.png', nivel: 'Avanzado', porcentaje: 95, color: '#e34c26' },
        { nombre: 'CSS3', icono: '/assets/icons/css.png', nivel: 'Avanzado', porcentaje: 90, color: '#264de4' },
        { nombre: 'JavaScript', icono: '/assets/icons/javascript.png', nivel: 'Alto / Avanzado', porcentaje: 92, color: '#f7df1e' },
        { nombre: 'Canvas 2D', icono: '/assets/icons/javascript.png', nivel: 'Física, IA & Arcade', porcentaje: 88, color: '#ff7b00' },
        { nombre: 'Angular', icono: '/assets/icons/angular.png', nivel: 'Intermedio+', porcentaje: 82, color: '#dd1b16' },
        { nombre: 'TypeScript', icono: '/assets/icons/typescript.png', nivel: 'Intermedio+', porcentaje: 80, color: '#007acc' }
      ]
    },
    {
      titulo: 'Geotecnologías & SIG',
      habilidades: [
        { nombre: 'Geovisores Web', icono: '/assets/icons/html.png', nivel: 'SIG Interactivo', porcentaje: 88, color: '#38bdf8' },
        { nombre: 'QGIS', icono: '/assets/icons/angular.png', nivel: 'Mapeo y Análisis', porcentaje: 85, color: '#4ecdc4' },
        { nombre: 'QField', icono: '/assets/icons/angular.png', nivel: 'Datos de Campo', porcentaje: 82, color: '#2dd4bf' }
      ]
    },
    {
      titulo: 'Herramientas de Desarrollo',
      habilidades: [
        { nombre: 'Git', icono: '/assets/icons/github.png', nivel: 'Control de Versiones', porcentaje: 85, color: '#f05032' },
        { nombre: 'GitHub', icono: '/assets/icons/github.png', nivel: 'Repositorios & CI/CD', porcentaje: 88, color: '#a855f7' }
      ]
    }
  ];

  get todasLasHabilidades(): Habilidad[] {
    return this.categorias.flatMap(c => c.habilidades);
  }

  setVista(vista: 'todas' | 'barras'): void {
    this.vistaSeleccionada = vista;
  }

  handleImageError(event: Event, habilidad: Habilidad): void {
    const target = event.target as HTMLImageElement;
    if (target && !target.dataset['hasFallback']) {
      target.dataset['hasFallback'] = 'true';
      const cdnFallbacks: Record<string, string> = {
        'HTML5': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg',
        'CSS3': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg',
        'JavaScript': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg',
        'Angular': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/angularjs/angularjs-original.svg',
        'TypeScript': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg',
        'Git': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/git/git-original.svg',
        'GitHub': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg'
      };
      if (cdnFallbacks[habilidad.nombre]) {
        target.src = cdnFallbacks[habilidad.nombre];
      }
    }
  }
}
