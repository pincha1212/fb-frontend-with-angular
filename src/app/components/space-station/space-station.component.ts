import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  signal,
  OnInit,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TacticalStation {
  id: string;
  sectionId: string;
  name: string;
  code: string;
  sector: string;
  category: string;
  coordinates: string;
  distanceKm: string;
  frequency: string;
  status: string;
  description: string;
  tags: string[];
  color: string;
  glowHex: string;
  baseX: number;
  baseY: number;
  icon: string;
}

@Component({
  selector: 'app-space-station',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './space-station.component.html',
  styleUrls: ['./space-station.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpaceStationComponent implements OnInit, OnDestroy {
  @Input() stationsData: any[] = [];
  @Input() shipSpeed = 0;
  @Input() currentStationName = '';

  @Output() selectSection = new EventEmitter<string>();
  @Output() warpToStation = new EventEmitter<any>();
  @Output() closeMap = new EventEmitter<void>();

  readonly stations: TacticalStation[] = [
    {
      id: 'station-sobre-mi',
      sectionId: 'sobre-mi',
      name: 'Perfil',
      code: 'ST-01',
      sector: 'SECTOR ALFA // FORMACIÓN',
      category: 'Geotecnologías · UNCuyo',
      coordinates: 'X: -85 · Y: +18 · Z: -70',
      distanceKm: '74 KM',
      frequency: '1420.40 MHz',
      status: 'ENLACE NOMINAL',
      description: 'Desarrollo front-end, cartografía digital y formación académica en Geotecnologías en Mendoza.',
      tags: ['Frontend', 'UNCuyo', 'Mendoza', 'Cartografía'],
      color: '#00f5d4',
      glowHex: '#00f5d4',
      baseX: 20,
      baseY: 26,
      icon: '01'
    },
    {
      id: 'station-habilidades',
      sectionId: 'habilidades',
      name: 'Tecnologías',
      code: 'ST-02',
      sector: 'SECTOR BETA // SISTEMAS',
      category: 'Frontend & Mapas Web',
      coordinates: 'X: +90 · Y: -22 · Z: -65',
      distanceKm: '98 KM',
      frequency: '1575.42 MHz',
      status: 'ENLACE NOMINAL',
      description: 'Stack tecnológico moderno: Angular zoneless, TypeScript, Tailwind CSS, Three.js 3D y QGIS SIG.',
      tags: ['Angular', 'TypeScript', 'Three.js', 'QGIS SIG'],
      color: '#38bdf8',
      glowHex: '#38bdf8',
      baseX: 80,
      baseY: 26,
      icon: '02'
    },
    {
      id: 'station-proyectos',
      sectionId: 'proyectos',
      name: 'Proyectos',
      code: 'ST-03',
      sector: 'SECTOR GAMMA // ARCHIVO',
      category: 'Cartografía Web & 3D',
      coordinates: 'X: 000 · Y: +25 · Z: -150',
      distanceKm: '152 KM',
      frequency: '1602.00 MHz',
      status: 'ARCHIVO CENTRAL',
      description: 'Proyectos interactivos: simulador espacial 3D, geovisor cartográfico SIG, CineApp y aplicaciones web.',
      tags: ['Simulador 3D', 'Geovisor SIG', 'CineApp', 'WebGL'],
      color: '#fbbf24',
      glowHex: '#fbbf24',
      baseX: 50,
      baseY: 48,
      icon: '03'
    },
    {
      id: 'station-experiencia',
      sectionId: 'experiencia',
      name: 'Trayectoria',
      code: 'ST-04',
      sector: 'SECTOR DELTA // BITÁCORA',
      category: 'NoCountry · Equipos Ágiles',
      coordinates: 'X: -95 · Y: -35 · Z: +80',
      distanceKm: '128 KM',
      frequency: '1227.60 MHz',
      status: 'ENLACE NOMINAL',
      description: 'Simulaciones laborales en equipos multidisciplinarios, metodologías ágiles Scrum y desarrollo colaborativo.',
      tags: ['NoCountry', 'Scrum / Agile', 'Git', 'Equipos'],
      color: '#f97316',
      glowHex: '#f97316',
      baseX: 22,
      baseY: 74,
      icon: '04'
    },
    {
      id: 'station-contacto',
      sectionId: 'contacto',
      name: 'Contacto',
      code: 'ST-05',
      sector: 'SECTOR EPSILON // ENLACE',
      category: 'Canales Directos',
      coordinates: 'X: +95 · Y: +22 · Z: +85',
      distanceKm: '131 KM',
      frequency: '1176.45 MHz',
      status: 'ENLACE CUÁNTICO',
      description: 'Canales de comunicación directa para colaboraciones, oportunidades laborales y proyectos tecnológicos.',
      tags: ['Email', 'LinkedIn', 'GitHub', 'Mendoza'],
      color: '#a855f7',
      glowHex: '#a855f7',
      baseX: 78,
      baseY: 74,
      icon: '05'
    }
  ];

  readonly selectedStation = signal<TacticalStation>(this.stations[2]); // Default to Proyectos (Sector Central)
  readonly hoveredStation = signal<TacticalStation | null>(null);

  readonly activeStation = computed(() => {
    return this.hoveredStation() || this.selectedStation();
  });

  private onKeyHandler = (e: KeyboardEvent): void => {
    const target = e.target as HTMLElement | null;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable) {
      return;
    }

    if (e.key >= '1' && e.key <= '5') {
      const idx = parseInt(e.key, 10) - 1;
      if (this.stations[idx]) {
        this.selectStation(this.stations[idx]);
      }
    } else if (e.key === 'Enter') {
      this.initiateWarp(this.activeStation());
    } else if (e.key === 'i' || e.key === 'I') {
      this.openSection(this.activeStation());
    }
  };

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.onKeyHandler);
    }
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.onKeyHandler);
    }
  }

  onHoverStation(st: TacticalStation | null): void {
    this.hoveredStation.set(st);
  }

  selectStation(st: TacticalStation): void {
    this.selectedStation.set(st);
  }

  initiateWarp(st: TacticalStation): void {
    const matched = this.stationsData.find(
      s => s.sectionId === st.sectionId || s.id === st.id || s.name.toLowerCase() === st.name.toLowerCase()
    );
    this.warpToStation.emit(matched || st);
  }

  openSection(st: TacticalStation): void {
    this.selectSection.emit(st.sectionId);
  }
}
