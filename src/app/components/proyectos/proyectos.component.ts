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
