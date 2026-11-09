import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface FloatingStation {
  id: string;
  sectionId: string;
  name: string;
  category: string;
  code: string;
  baseX: number;
  baseY: number;
}

@Component({
  selector: 'app-space-station',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './space-station.component.html',
  styleUrls: ['./space-station.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpaceStationComponent {
  @Output() selectSection = new EventEmitter<string>();

  readonly stations: FloatingStation[] = [
    { id: 'station-sobre-mi', sectionId: 'sobre-mi', name: 'Perfil', category: 'Geotecnologías · UNCuyo', code: 'ESTACIÓN 01 · PERFIL', baseX: 25, baseY: 25 },
    { id: 'station-habilidades', sectionId: 'habilidades', name: 'Tecnologías', category: 'Frontend · mapas web', code: 'ESTACIÓN 02 · SISTEMAS', baseX: 75, baseY: 25 },
    { id: 'station-proyectos', sectionId: 'proyectos', name: 'Proyectos', category: 'Cartografía · web · interactivo', code: 'ESTACIÓN 03 · ARCHIVO', baseX: 50, baseY: 50 },
    { id: 'station-experiencia', sectionId: 'experiencia', name: 'Trayectoria', category: 'NoCountry · formación', code: 'ESTACIÓN 04 · BITÁCORA', baseX: 25, baseY: 75 },
    { id: 'station-contacto', sectionId: 'contacto', name: 'Contacto', category: 'Correo · GitHub · LinkedIn', code: 'ESTACIÓN 05 · ENLACE', baseX: 75, baseY: 75 }
  ];

  readonly hoveredStation = signal<FloatingStation | null>(null);

  onStationHover(station: FloatingStation | null): void {
    this.hoveredStation.set(station);
  }

  onStationClick(station: FloatingStation): void {
    this.selectSection.emit(station.sectionId);
    this.hoveredStation.set(null);
  }
}
