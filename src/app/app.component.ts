import { Component, HostListener, signal, inject } from '@angular/core';
import { SpacePlaygroundComponent } from './components/space-playground/space-playground.component';
import { SobreMiComponent } from './components/sobre-mi/sobre-mi.component';
import { HabilidadesComponent } from './components/habilidades/habilidades.component';
import { ProyectosComponent } from './components/proyectos/proyectos.component';
import { ExperienciaComponent } from './components/experiencia/experiencia.component';
import { ContactoComponent } from './components/contacto/contacto.component';
import { PortfolioEditorModalComponent } from './components/portfolio-editor-modal/portfolio-editor-modal.component';
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
    PortfolioEditorModalComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  portfolioService = inject(PortfolioDataService);
  isSpaceModeActive = signal(false);
  showMobilePcNotice = signal(false);
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

  openSpaceMode(): void {
    if (!this.checkDeviceType()) {
      this.showMobilePcNotice.set(true);
      return;
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

    const container = document.getElementById('contenido');
    if (!container) return;

    // Check if user is scrolling inside an internally scrollable element (like a card text)
    let target = event.target as HTMLElement | null;
    let internalScrollable: HTMLElement | null = null;
    
    while (target && target !== container) {
      const style = window.getComputedStyle(target);
      const isScrollable = (style.overflowY === 'auto' || style.overflowY === 'scroll') && target.scrollHeight > target.clientHeight;
      if (isScrollable) {
        internalScrollable = target;
        break;
      }
      target = target.parentElement;
    }

    if (internalScrollable) {
      const delta = event.deltaY;
      const atTop = internalScrollable.scrollTop <= 0 && delta < 0;
      const atBottom = internalScrollable.scrollTop + internalScrollable.clientHeight >= internalScrollable.scrollHeight - 2 && delta > 0;
      if (!atTop && !atBottom) {
        // Allow internal scrolling inside the card
        return;
      }
    }

    // Convert vertical wheel scroll to horizontal section movement
    // Scroll Down (deltaY > 0) -> move RIGHT
    // Scroll Up (deltaY < 0) -> move LEFT
    if (Math.abs(event.deltaY) > 5) {
      event.preventDefault();
      container.scrollLeft += event.deltaY * 1.25;
      this.updateActiveSectionOnScroll(container);
    }
  }

  onTouchStart(event: TouchEvent): void {
    if (event.touches.length > 0) {
      this.touchStartY = event.touches[0].clientY;
      this.touchStartX = event.touches[0].clientX;
    }
  }

  onTouchMove(event: TouchEvent): void {
    if (this.isSpaceModeActive() || this.portfolioService.isEditorOpen() || event.touches.length === 0) return;

    const container = document.getElementById('contenido');
    if (!container) return;

    const currentY = event.touches[0].clientY;
    const diffY = this.touchStartY - currentY; // Positive when swiping up (scrolling down)
    const diffX = this.touchStartX - event.touches[0].clientX;

    // If vertical swipe is more prominent than horizontal swipe
    if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 8) {
      container.scrollLeft += diffY * 1.3;
      this.touchStartY = currentY;
      this.updateActiveSectionOnScroll(container);
    }
  }

  private updateActiveSectionOnScroll(container: HTMLElement): void {
    const scrollPos = container.scrollLeft + container.clientWidth / 2;
    const sectionEls = Array.from(container.children).filter(child => child.tagName === 'SECTION');
    
    for (let i = 0; i < sectionEls.length; i++) {
      const el = sectionEls[i] as HTMLElement;
      if (scrollPos >= el.offsetLeft && scrollPos <= el.offsetLeft + el.offsetWidth) {
        if (this.activeSectionIndex() !== i) {
          this.activeSectionIndex.set(i);
        }
        break;
      }
    }
  }

  @HostListener('document:keydown.escape')
  closeSpaceModeWithEscape(): void {
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
