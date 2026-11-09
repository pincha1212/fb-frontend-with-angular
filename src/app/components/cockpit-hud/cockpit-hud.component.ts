import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  signal,
  Input,
  Output,
  EventEmitter,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpaceStationComponent } from '../space-station/space-station.component';

@Component({
  selector: 'app-cockpit-hud',
  standalone: true,
  imports: [CommonModule, SpaceStationComponent],
  templateUrl: './cockpit-hud.component.html',
  styleUrls: ['./cockpit-hud.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CockpitHUDComponent implements OnInit, OnDestroy {
  @Input() speedKmh = 240;
  @Input() maxSpeedKmh = 520;
  @Input() isTurboActive = false;
  @Input() currentStationName = 'Sector Espacial Libres';
  @Input() stations: any[] = [];
  @Input() radarBlips: any[] = [];

  @Output() toggleTurbo = new EventEmitter<boolean>();
  @Output() teleportStation = new EventEmitter<any>();
  @Output() cinemaModeChange = new EventEmitter<boolean>();
  @Output() cameraModeChange = new EventEmitter<'chase' | 'cockpit' | 'top' | 'cinematic'>();

  // Telemetry signals
  shieldIntegrity = signal(100);
  reactorPower = signal(98.4);
  headingDegrees = signal(142);
  pitchDegrees = signal(4.2);
  isExpanded = signal(true);
  isCinemaMode = signal(false);
  currentCameraMode = signal<'chase' | 'cockpit' | 'top' | 'cinematic'>('cinematic');
  hudMode = signal<'combat' | 'navigation' | 'stealth' | 'cinema'>('navigation');
  isMapDrawerOpen = signal(false);



  private animFrameId = 0;
  private isDestroyed = false;

  ngOnInit(): void {
    this.startTelemetryLoop();
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    if (typeof window === 'undefined') return;
    const normX = (e.clientX / window.innerWidth) * 2 - 1;
    const normY = (e.clientY / window.innerHeight) * 2 - 1;

    this.headingDegrees.set(Math.round((normX * 45 + 180) % 360));
    this.pitchDegrees.set(Number((normY * -15).toFixed(1)));
  }

  private startTelemetryLoop(): void {
    let startTime = performance.now();

    const loop = () => {
      if (this.isDestroyed) return;

      const now = performance.now();
      const elapsed = (now - startTime) / 1000;

      const reactorVal = 98.4 + Math.sin(elapsed * 2.5) * 0.4;
      this.reactorPower.set(Number(reactorVal.toFixed(1)));

      this.animFrameId = requestAnimationFrame(loop);
    };

    loop();
  }

  onToggleTurbo(): void {
    this.toggleTurbo.emit(!this.isTurboActive);
  }

  setHUDMode(mode: 'combat' | 'navigation' | 'stealth' | 'cinema'): void {
    this.hudMode.set(mode);
    if (mode === 'cinema') {
      this.isCinemaMode.set(true);
      this.cinemaModeChange.emit(true);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cockpit-cinema-mode', { detail: { active: true } }));
      }
    } else {
      if (this.isCinemaMode()) {
        this.isCinemaMode.set(false);
        this.cinemaModeChange.emit(false);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('cockpit-cinema-mode', { detail: { active: false } }));
        }
      }
    }
  }

  toggleCinemaMode(): void {
    const nextVal = !this.isCinemaMode();
    this.isCinemaMode.set(nextVal);
    this.hudMode.set(nextVal ? 'cinema' : 'navigation');
    this.cinemaModeChange.emit(nextVal);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cockpit-cinema-mode', { detail: { active: nextVal } }));
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    // Tecla C alterna el modo cine
    if (e.key === 'c' || e.key === 'C') {
      // Ignorar si el usuario está escribiendo en un input o textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      this.toggleCinemaMode();
    } else if (e.key === 'Escape' && this.isCinemaMode()) {
      this.toggleCinemaMode();
    }
  }

  togglePanel(): void {
    this.isExpanded.update(v => !v);
  }

  toggleMapDrawer(): void {
    this.isMapDrawerOpen.update(v => !v);
  }

  onSelectStation(st: any): void {
    this.teleportStation.emit(st);
    this.isMapDrawerOpen.set(false);
  }

  onSelectStationFromParallax(sectionId: string): void {
    const found = this.stations.find(s => s.sectionId === sectionId);
    if (found) {
      this.teleportStation.emit(found);
    } else if (this.stations.length > 0) {
      this.teleportStation.emit(this.stations[0]);
    }
    this.isMapDrawerOpen.set(false);
  }

  setCamera(mode: 'chase' | 'cockpit' | 'top' | 'cinematic'): void {
    this.currentCameraMode.set(mode);
    this.cameraModeChange.emit(mode);
  }
}
