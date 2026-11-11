import {
  Component,
  ChangeDetectionStrategy,
  signal,
  Input,
  Output,
  EventEmitter,
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
export class CockpitHUDComponent {
  @Input() speedKms = 0;
  @Input() maxSpeedKms = 44;
  @Input() isTurboActive = false;
  @Input() currentStationName = 'Sector Espacial Libres';
  @Input() stations: any[] = [];
  @Input() radarBlips: any[] = [];
  @Input() headingDegrees = 0;
  @Input() pitchDegrees = 0;
  @Input() hullIntegrity = 100;
  @Input() shipTypeTag = 'BIO-ESTRUCTURA QUINÍTICA';
  @Input() hullLabel = 'INTEGRIDAD BIO-CORAZA';
  @Input() activeHostiles = 0;
  @Input() combatMessage = '';
  @Input() currentCameraMode: 'chase' | 'cockpit' | 'top' | 'cinematic' = 'chase';

  @Output() toggleTurbo = new EventEmitter<boolean>();
  @Output() teleportStation = new EventEmitter<any>();
  @Output() cameraModeChange = new EventEmitter<'chase' | 'cockpit' | 'top' | 'cinematic'>();
  @Output() fireWeapons = new EventEmitter<void>();

  get speedPercent(): number {
    return this.maxSpeedKms > 0 ? Math.min(100, Math.max(0, (this.speedKms / this.maxSpeedKms) * 100)) : 0;
  }

  isExpanded = signal(true);
  isMapDrawerOpen = signal(false);



  onToggleTurbo(): void {
    this.toggleTurbo.emit(!this.isTurboActive);
  }

  toggleCinemaMode(): void {
    this.setCamera(this.currentCameraMode === 'cinematic' ? 'chase' : 'cinematic');
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
    this.cameraModeChange.emit(mode);
  }
}
