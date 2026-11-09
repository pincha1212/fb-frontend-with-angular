import { Component, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollAnimationDirective } from './scroll-animation.directive';
import { ScrollbarIndicatorComponent } from './components/scrollbar-indicator/scrollbar-indicator.component';
import { AnimatedBackgroundComponent } from './components/animated-background/animated-background.component';
import { SpacePlaygroundComponent } from './components/space-playground/space-playground.component';
import { OrbitalBackgroundComponent } from './components/orbital-background/orbital-background.component';
import { NebulaCloudsComponent } from './components/nebula-clouds/nebula-clouds.component';

export interface CollapsibleSection {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  chip: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    AnimatedBackgroundComponent,
    OrbitalBackgroundComponent,
    NebulaCloudsComponent,
    SpacePlaygroundComponent,
    ScrollAnimationDirective,
    ScrollbarIndicatorComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  sections: CollapsibleSection[] = [
    {
      id: 'sobre-mi',
      title: 'Sobre Mí',
      subtitle: 'Perfil Profesional, Formación UNCuyo & Competencias',
      icon: '👤',
      chip: 'Bio & Estudios'
    },
    {
      id: 'habilidades',
      title: 'Conocimientos Técnicos',
      subtitle: 'Frontend, Canvas 2D, Geotecnologías SIG & Herramientas',
      icon: '⚡',
      chip: 'Tecnologías'
    },
    {
      id: 'proyectos',
      title: 'Proyectos Destacados',
      subtitle: 'Clash of Gods, Geovisor Web, CineApp & Demos',
      icon: '💻',
      chip: '5 Proyectos'
    },
    {
      id: 'experiencia',
      title: 'Experiencia & Formación',
      subtitle: 'Simulación NoCountry, UNCuyo & Objetivos',
      icon: '🚀',
      chip: 'Trayectoria'
    },
    {
      id: 'contacto',
      title: 'Contacto',
      subtitle: 'Mendoza, Argentina • +54 261 383 6127 • fedebarzola7@gmail.com',
      icon: '✉️',
      chip: 'Escríbeme'
    }
  ];

  // Estado de secciones desplegadas (acordeón interactivo)
  expandedSections = signal<Record<string, boolean>>({
    'sobre-mi': true,
    'habilidades': false,
    'proyectos': false,
    'experiencia': false,
    'contacto': false
  });

  isSectionOpen(id: string): boolean {
    return !!this.expandedSections()[id];
  }

  toggleSection(id: string): void {
    this.expandedSections.update(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  }

  // Modo Escenario Nave Espacial & Estación Orbital (Activado mediante botón Jugar)
  isSpaceModeActive = signal<boolean>(false);

  openSpaceMode(): void {
    this.isSpaceModeActive.set(true);
  }

  closeSpaceMode(): void {
    this.isSpaceModeActive.set(false);
  }

  onNavigateFromSpace(sectionId: string): void {
    this.isSpaceModeActive.set(false);
    this.expandedSections.update(prev => ({ ...prev, [sectionId]: true }));
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 120);
  }

  expandAll(): void {
    this.expandedSections.set({
      'sobre-mi': true,
      'habilidades': true,
      'proyectos': true,
      'experiencia': true,
      'contacto': true
    });
  }

  collapseAll(): void {
    this.expandedSections.set({
      'sobre-mi': false,
      'habilidades': false,
      'proyectos': false,
      'experiencia': false,
      'contacto': false
    });
  }

  onSelectSection(id: string): void {
    if (id && id !== 'hero') {
      this.expandedSections.update(prev => ({ ...prev, [id]: true }));
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 60);
    }
  }

  @HostListener('window:request-expand-section', ['$event'])
  onRequestExpandSection(event: Event): void {
    const customEvent = event as CustomEvent<{ sectionId: string }>;
    const id = customEvent.detail?.sectionId;
    if (id) {
      this.onSelectSection(id);
    }
  }

  @HostListener('window:request-open-space-mode')
  onRequestOpenSpaceMode(): void {
    this.openSpaceMode();
  }

  showUpArrows: boolean = false;
  showDownArrows: boolean = true;
  mouseState: 'top' | 'middle' | 'bottom' = 'top';

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.showUpArrows = window.scrollY > 100;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollPosition = window.scrollY + windowHeight;
    this.showDownArrows = scrollPosition < (documentHeight - 50);

    if (window.scrollY < 100) {
      this.mouseState = 'top';
    } else if (scrollPosition >= (documentHeight - 50)) {
      this.mouseState = 'bottom';
    } else {
      this.mouseState = 'middle';
    }
  }
}

