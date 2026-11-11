import { Component, HostListener, signal, inject, ViewChild, OnInit } from '@angular/core';
import { SpacePlaygroundComponent } from './components/space-playground/space-playground.component';
import { SobreMiComponent } from './components/sobre-mi/sobre-mi.component';
import { HabilidadesComponent } from './components/habilidades/habilidades.component';
import { ProyectosComponent } from './components/proyectos/proyectos.component';
import { ExperienciaComponent } from './components/experiencia/experiencia.component';
import { ContactoComponent } from './components/contacto/contacto.component';
import { PortfolioEditorModalComponent } from './components/portfolio-editor-modal/portfolio-editor-modal.component';
import { HangarModalComponent } from './components/hangar-modal/hangar-modal.component';
import { PortfolioDataService } from './services/portfolio-data.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    SpacePlaygroundComponent,
    SobreMiComponent,
    HabilidadesComponent,
    ProyectosComponent,
    ExperienciaComponent,
    ContactoComponent,
    PortfolioEditorModalComponent,
    HangarModalComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  portfolioService = inject(PortfolioDataService);

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1' || params.get('space') === '1') {
        this.isSpaceModeActive.set(true);
      }
    }
  }
  isSpaceModeActive = signal(false);
  showMobilePcNotice = signal(false);
  modelSelectionOpen = signal(false);
  selectedModelUrl = signal<string>('preset:xeno');
  selectedShipName = signal<string>('Caza Biomecánico Xeno-01');
  activeSectionIndex = signal(0);
  
  readonly sections = ['inicio', 'sobre-mi', 'habilidades', 'proyectos', 'experiencia', 'contacto'];
  readonly sectionNames: Record<string, string> = {
    'inicio': 'Inicio',
    'sobre-mi': '01. Perfil',
    'habilidades': '02. Tecnologías',
    'proyectos': '03. Proyectos',
    'experiencia': '04. Trayectoria',
    'contacto': '05. Contacto'
  };

  private previousFocus: HTMLElement | null = null;
  private touchStartY = 0;
  private touchStartX = 0;

  checkDeviceType(): boolean {
    if (typeof window === 'undefined') return true;
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isNarrow = window.innerWidth < 1024;
    return !(isTouch || isNarrow);
  }

  @ViewChild(HangarModalComponent) hangarModal?: HangarModalComponent;

  openSpaceMode(): void {
    if (!this.checkDeviceType()) {
      this.showMobilePcNotice.set(true);
      return;
    }
    this.hangarModal?.open(this.selectedModelUrl());
  }

  openHangarFromPlayground(): void {
    this.hangarModal?.open(this.selectedModelUrl());
  }

  onShipChosen(event: { url: string; nombre?: string; tipo?: string } | string): void {
    const url = typeof event === 'string' ? event : event.url;
    const nombre = typeof event === 'string' ? '' : event.nombre;
    this.selectedModelUrl.set(url || 'preset:xeno');
    if (nombre) {
      this.selectedShipName.set(nombre);
    }
    this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.isSpaceModeActive.set(true);
    requestAnimationFrame(() => document.querySelector<HTMLElement>('.space-fullscreen-overlay .hud-close-btn')?.focus());
  }

  closeMobilePcNotice(): void {
    this.showMobilePcNotice.set(false);
  }

  closeSpaceMode(): void {
    if (!this.isSpaceModeActive()) return;
    this.isSpaceModeActive.set(false);
    const focusTarget = this.previousFocus;
    this.previousFocus = null;
    requestAnimationFrame(() => focusTarget?.focus());
  }

  scrollToSection(sectionId: string, event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    const targetEl = document.getElementById(sectionId);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      const idx = this.sections.indexOf(sectionId);
      if (idx !== -1) {
        this.activeSectionIndex.set(idx);
      }
    }
  }

  prevSection(): void {
    const current = this.activeSectionIndex();
    if (current > 0) {
      this.scrollToSection(this.sections[current - 1]);
    }
  }

  nextSection(): void {
    const current = this.activeSectionIndex();
    if (current < this.sections.length - 1) {
      this.scrollToSection(this.sections[current + 1]);
    }
  }

  @HostListener('wheel', ['$event'])
  onWheelScroll(event: WheelEvent): void {
    if (this.isSpaceModeActive() || this.portfolioService.isEditorOpen()) return;
    // Allow default vertical scrolling
  }

  onTouchStart(event: TouchEvent): void {
    if (event.touches.length > 0) {
      this.touchStartY = event.touches[0].clientY;
      this.touchStartX = event.touches[0].clientX;
    }
  }

  onTouchMove(event: TouchEvent): void {
    // Allow default vertical scrolling
  }

  private updateActiveSectionOnScroll(container: HTMLElement): void {
    const scrollPos = container.scrollTop + container.clientHeight / 2;
    const sectionEls = Array.from(container.children).filter(child => child.tagName === 'SECTION');
    
    for (let i = 0; i < sectionEls.length; i++) {
      const el = sectionEls[i] as HTMLElement;
      if (scrollPos >= el.offsetTop && scrollPos <= el.offsetTop + el.offsetHeight) {
        if (this.activeSectionIndex() !== i) {
          this.activeSectionIndex.set(i);
        }
        break;
      }
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  closeSpaceModeWithEscape(event?: KeyboardEvent): void {
    if (event?.defaultPrevented) return;
    const hasOpenModal = document.querySelector(
      '.iron-man-hologram-backdrop, .station-modal-overlay, .unified-settings-overlay, .help-modal-overlay'
    );
    if (hasOpenModal) {
      return;
    }
    this.closeSpaceMode();
  }

  @HostListener('document:keydown', ['$event'])
  handleGlobalKeys(event: KeyboardEvent): void {
    if (this.isSpaceModeActive()) {
      if (event.key === 'Tab') {
        this.keepFocusInSpaceMode(event);
      }
      return;
    }

    if (this.portfolioService.isEditorOpen()) return;

    // Keyboard arrow section navigation
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      this.nextSection();
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.prevSection();
    }
  }

  private keepFocusInSpaceMode(event: KeyboardEvent): void {
    const dialog = document.querySelector('.space-fullscreen-overlay');
    const focusable = dialog?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const items = Array.from(focusable ?? []).filter(item => item.getClientRects().length > 0);
    if (items.length === 0) {
      event.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
