import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../services/theme.service';

export interface PortfolioSection {
  id: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-section-progress',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './section-progress.component.html',
  styleUrls: ['./section-progress.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SectionProgressIndicatorComponent implements OnInit, OnDestroy {
  themeService = inject(ThemeService);
  currentTheme = this.themeService.currentTheme;

  sections: PortfolioSection[] = [
    { id: 'hero', label: 'Inicio', icon: '🏠' },
    { id: 'sobre-mi', label: 'Sobre Mí', icon: '👤' },
    { id: 'habilidades', label: 'Habilidades', icon: '⚡' },
    { id: 'proyectos', label: 'Proyectos', icon: '💻' },
    { id: 'experiencia', label: 'Experiencia', icon: '🚀' },
    { id: 'contacto', label: 'Contacto', icon: '✉️' }
  ];

  activeSection = signal<string>('hero');
  scrollProgress = signal<number>(0);

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  openSpaceMode(): void {
    window.dispatchEvent(new CustomEvent('request-open-space-mode'));
  }

  private observer: IntersectionObserver | null = null;
  private scrollListener: (() => void) | null = null;

  ngOnInit(): void {
    // 1. Configurar IntersectionObserver para detectar qué sección está en el viewport
    const options = {
      root: null,
      rootMargin: '-20% 0px -50% 0px',
      threshold: 0.15
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.activeSection.set(entry.target.id);
        }
      });
    }, options);

    // Observar elementos de sección
    setTimeout(() => {
      this.sections.forEach(sec => {
        const el = document.getElementById(sec.id);
        if (el && this.observer) {
          this.observer.observe(el);
        }
      });
    }, 200);

    // 2. Escuchar scroll para calcular la barra de progreso general de la página
    this.scrollListener = () => {
      const winScroll = window.scrollY || document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
      this.scrollProgress.set(scrolled);
    };

    window.addEventListener('scroll', this.scrollListener, { passive: true });
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener);
    }
  }

  scrollToSection(id: string): void {
    if (id !== 'hero') {
      window.dispatchEvent(new CustomEvent('request-expand-section', { detail: { sectionId: id } }));
    }

    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      this.activeSection.set(id);

      // Notificar al motor de fondo video-scroll para buscar la marca de tiempo (timestamp seek)
      window.dispatchEvent(new CustomEvent('seek-bg-section', { detail: { sectionId: id } }));
    }
  }
}
