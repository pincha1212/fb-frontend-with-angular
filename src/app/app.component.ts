import { Component, HostListener, signal } from '@angular/core';
import { SpacePlaygroundComponent } from './components/space-playground/space-playground.component';
import { SobreMiComponent } from './components/sobre-mi/sobre-mi.component';
import { HabilidadesComponent } from './components/habilidades/habilidades.component';
import { ProyectosComponent } from './components/proyectos/proyectos.component';
import { ExperienciaComponent } from './components/experiencia/experiencia.component';
import { ContactoComponent } from './components/contacto/contacto.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    SpacePlaygroundComponent,
    SobreMiComponent,
    HabilidadesComponent,
    ProyectosComponent,
    ExperienciaComponent,
    ContactoComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  isSpaceModeActive = signal(false);
  private previousFocus: HTMLElement | null = null;

  openSpaceMode(): void {
    this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.isSpaceModeActive.set(true);
    requestAnimationFrame(() => document.querySelector<HTMLElement>('.space-fullscreen-overlay .hud-close-btn')?.focus());
  }

  closeSpaceMode(): void {
    if (!this.isSpaceModeActive()) return;
    this.isSpaceModeActive.set(false);
    const focusTarget = this.previousFocus;
    this.previousFocus = null;
    requestAnimationFrame(() => focusTarget?.focus());
  }

  @HostListener('document:keydown.escape')
  closeSpaceModeWithEscape(): void {
    this.closeSpaceMode();
  }

  @HostListener('document:keydown', ['$event'])
  keepFocusInSpaceMode(event: KeyboardEvent): void {
    if (!this.isSpaceModeActive() || event.key !== 'Tab') return;
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
