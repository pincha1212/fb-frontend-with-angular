import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  OnDestroy,
  OnInit,
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
  icon: string;
  glowColor: string;
  accentHex: string;
  baseX: number;
  baseY: number;
  parallaxFactor: number;
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
  @Output() selectSection = new EventEmitter<string>();

  readonly stations: FloatingStation[] = [
    { id: 'station-sobre-mi', sectionId: 'sobre-mi', name: 'Perfil', category: 'Geotecnologías · UNCuyo', code: 'RUTA 01 · PERFIL', icon: '👤', glowColor: 'rgba(185, 152, 105, .22)', accentHex: '#b99869', baseX: 20, baseY: 28, parallaxFactor: .14 },
    { id: 'station-habilidades', sectionId: 'habilidades', name: 'Tecnologías', category: 'Frontend · mapas web', code: 'RUTA 02 · HERRAMIENTAS', icon: '⌘', glowColor: 'rgba(142, 170, 141, .2)', accentHex: '#8eaa8d', baseX: 72, baseY: 22, parallaxFactor: .18 },
    { id: 'station-proyectos', sectionId: 'proyectos', name: 'Proyectos', category: 'Juegos · cartografía · aplicaciones', code: 'RUTA 03 · PROYECTOS', icon: '▤', glowColor: 'rgba(146, 166, 164, .2)', accentHex: '#92a6a4', baseX: 45, baseY: 55, parallaxFactor: .12 },
    { id: 'station-experiencia', sectionId: 'experiencia', name: 'Trayectoria', category: 'NoCountry · formación', code: 'RUTA 04 · RECORRIDO', icon: '↗', glowColor: 'rgba(197, 140, 103, .2)', accentHex: '#c58c67', baseX: 18, baseY: 72, parallaxFactor: .16 },
    { id: 'station-contacto', sectionId: 'contacto', name: 'Contacto', category: 'Correo · GitHub · LinkedIn', code: 'RUTA 05 · CONTACTO', icon: '✉', glowColor: 'rgba(208, 170, 115, .2)', accentHex: '#d0aa73', baseX: 78, baseY: 70, parallaxFactor: .2 }
  ];

  readonly mouseX = signal(0);
  readonly mouseY = signal(0);
  readonly hoveredStation = signal<FloatingStation | null>(null);
  private targetMouseX = 0;
  private targetMouseY = 0;
  private animFrameId = 0;
  private isDestroyed = false;

  ngOnInit(): void {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) this.startParallaxLoop();
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    this.targetMouseX = (event.clientX / window.innerWidth) * 2 - 1;
    this.targetMouseY = (event.clientY / window.innerHeight) * 2 - 1;
  }

  @HostListener('window:deviceorientation', ['$event'])
  onDeviceOrientation(event: DeviceOrientationEvent): void {
    if (event.gamma !== null && event.beta !== null) {
      this.targetMouseX = Math.max(-1, Math.min(1, event.gamma / 30));
      this.targetMouseY = Math.max(-1, Math.min(1, (event.beta - 45) / 30));
    }
  }

  private startParallaxLoop(): void {
    const loop = () => {
      if (this.isDestroyed) return;
      this.mouseX.update(value => value + (this.targetMouseX - value) * .08);
      this.mouseY.update(value => value + (this.targetMouseY - value) * .08);
      this.animFrameId = requestAnimationFrame(loop);
    };
    loop();
  }

  getStationTransform(station: FloatingStation): string {
    return `translate3d(${this.mouseX() * station.parallaxFactor * 30}px, ${this.mouseY() * station.parallaxFactor * 30}px, 0)`;
  }

  getFarParallaxTransform(): string {
    return `translate3d(${-this.mouseX() * 14}px, ${-this.mouseY() * 14}px, 0)`;
  }

  getMidParallaxTransform(): string {
    return `translate3d(${-this.mouseX() * 32}px, ${-this.mouseY() * 32}px, 0)`;
  }

  getForegroundParallaxTransform(): string {
    return `translate3d(${this.mouseX() * 75}px, ${this.mouseY() * 75}px, 0)`;
  }

  onStationHover(station: FloatingStation | null): void {
    this.hoveredStation.set(station);
  }

  onStationClick(station: FloatingStation): void {
    this.selectSection.emit(station.sectionId);
    this.hoveredStation.set(null);
  }
}
