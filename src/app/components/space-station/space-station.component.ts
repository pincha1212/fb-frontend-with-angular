import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  signal,
  Output,
  EventEmitter,
  HostListener,
  ElementRef,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DockingAlertComponent } from '../docking-alert/docking-alert.component';

export interface FloatingStation {
  id: string;
  sectionId: string;
  name: string;
  category: string;
  code: string;
  icon: string;
  glowColor: string;
  accentHex: string;
  description: string;
  metrics: { label: string; value: string }[];
  tags: string[];
  baseX: number;
  baseY: number;
  parallaxFactor: number;
  floatPeriod: number;
  floatAmp: number;
}

@Component({
  selector: 'app-space-station',
  standalone: true,
  imports: [CommonModule, DockingAlertComponent],
  templateUrl: './space-station.component.html',
  styleUrls: ['./space-station.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpaceStationComponent implements OnInit, OnDestroy {
  @Output() selectSection = new EventEmitter<string>();
  @Output() launchPlayground = new EventEmitter<void>();

  @ViewChild('parallaxContainer', { static: true })
  containerRef!: ElementRef<HTMLDivElement>;

  // Interactive stations dataset
  readonly stations: FloatingStation[] = [
    {
      id: 'station-sobre-mi',
      sectionId: 'sobre-mi',
      name: 'Estación Alpha-1',
      category: 'Módulo Bio & Formación UNCuyo',
      code: 'SECTOR-01 // BIO',
      icon: '👤',
      glowColor: 'rgba(0, 240, 255, 0.4)',
      accentHex: '#00f0ff',
      description: 'Estación orbital de biografía personal, formación académica en UNCuyo y desarrollo Frontend.',
      metrics: [
        { label: 'ORIGEN', value: 'Mendoza, ARG' },
        { label: 'ESTADO', value: 'ONLINE' },
        { label: 'ACCESO', value: 'NIVEL-1' }
      ],
      tags: ['UNCuyo', 'Frontend', 'GameDev'],
      baseX: 20,
      baseY: 28,
      parallaxFactor: 0.14,
      floatPeriod: 4.2,
      floatAmp: 14
    },
    {
      id: 'station-habilidades',
      sectionId: 'habilidades',
      name: 'Reactor Núcleo',
      category: 'Matriz Técnica & SIG',
      code: 'SECTOR-02 // CORE',
      icon: '⚡',
      glowColor: 'rgba(189, 0, 255, 0.4)',
      accentHex: '#bd00ff',
      description: 'Generador de energía técnica: Angular, Canvas 2D, TypeScript y geotecnologías SIG QGIS.',
      metrics: [
        { label: 'POTENCIA', value: '99.8%' },
        { label: 'CORE', value: 'ANGULAR-21' },
        { label: 'ESTADO', value: 'ESTABLE' }
      ],
      tags: ['Angular', 'Canvas 2D', 'SIG QGIS'],
      baseX: 72,
      baseY: 22,
      parallaxFactor: 0.18,
      floatPeriod: 5.0,
      floatAmp: 18
    },
    {
      id: 'station-proyectos',
      sectionId: 'proyectos',
      name: 'Astillero Estelar',
      category: 'Bahía de Proyectos & Demos',
      code: 'SECTOR-03 // DOCKS',
      icon: '💻',
      glowColor: 'rgba(0, 255, 136, 0.4)',
      accentHex: '#00ff88',
      description: 'Astillero de desarrollo con Clash of Gods 2D, Geovisor SIG, CineApp y aplicaciones en vivo.',
      metrics: [
        { label: 'PROYECTOS', value: '5 ACTIVOS' },
        { label: 'JUEGO 2D', value: 'CLASH OF GODS' },
        { label: 'SIG', value: 'GEOVISOR' }
      ],
      tags: ['Clash of Gods', 'Geovisor SIG', 'CineApp'],
      baseX: 45,
      baseY: 55,
      parallaxFactor: 0.12,
      floatPeriod: 4.6,
      floatAmp: 12
    },
    {
      id: 'station-experiencia',
      sectionId: 'experiencia',
      name: 'Muelle Orbital',
      category: 'Registro NoCountry & Trayectoria',
      code: 'SECTOR-04 // NAV',
      icon: '🚀',
      glowColor: 'rgba(255, 170, 0, 0.4)',
      accentHex: '#ffaa00',
      description: 'Bitácora de misiones en equipo, metodologías ágiles y simulación laboral NoCountry.',
      metrics: [
        { label: 'METODOLOGÍA', value: 'SCRUM / AGILE' },
        { label: 'EQUIPO', value: 'NOCOUNTRY' },
        { label: 'EXP', value: 'FULLSTACK' }
      ],
      tags: ['NoCountry', 'Agile', 'Teamwork'],
      baseX: 18,
      baseY: 72,
      parallaxFactor: 0.16,
      floatPeriod: 5.4,
      floatAmp: 16
    },
    {
      id: 'station-contacto',
      sectionId: 'contacto',
      name: 'Antena de Comms',
      category: 'Matriz Satelital de Contacto',
      code: 'SECTOR-05 // COMMS',
      icon: '✉️',
      glowColor: 'rgba(255, 51, 102, 0.4)',
      accentHex: '#ff3366',
      description: 'Estación de transmisión profunda para mensajes directos, GitHub, LinkedIn y correo.',
      metrics: [
        { label: 'ENLACE', value: 'DIRECTO' },
        { label: 'RESPUESTA', value: '< 24 HRS' },
        { label: 'LATITUD', value: 'MENDOZA' }
      ],
      tags: ['Email Directo', 'LinkedIn', 'GitHub'],
      baseX: 78,
      baseY: 70,
      parallaxFactor: 0.20,
      floatPeriod: 4.8,
      floatAmp: 20
    }
  ];

  // Parallax smooth interpolation coordinates (-1 to 1)
  mouseX = signal(0);
  mouseY = signal(0);
  targetMouseX = 0;
  targetMouseY = 0;

  // Active hover station selection
  hoveredStation = signal<FloatingStation | null>(null);

  // Time ticker for floating levitation sine waves
  elapsedSec = signal(0);

  private animFrameId = 0;
  private isDestroyed = false;

  ngOnInit(): void {
    this.startParallaxLoop();
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
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.targetMouseX = (e.clientX / width) * 2 - 1;
    this.targetMouseY = (e.clientY / height) * 2 - 1;
  }

  @HostListener('window:deviceorientation', ['$event'])
  onDeviceOrientation(e: DeviceOrientationEvent): void {
    if (e.gamma !== null && e.beta !== null) {
      this.targetMouseX = Math.max(-1, Math.min(1, e.gamma / 30));
      this.targetMouseY = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
    }
  }

  private startParallaxLoop(): void {
    let startTime = performance.now();

    const loop = () => {
      if (this.isDestroyed) return;

      const now = performance.now();
      const dt = (now - startTime) / 1000;
      this.elapsedSec.set(dt);

      const currX = this.mouseX();
      const currY = this.mouseY();
      const newX = currX + (this.targetMouseX - currX) * 0.08;
      const newY = currY + (this.targetMouseY - currY) * 0.08;

      this.mouseX.set(newX);
      this.mouseY.set(newY);

      this.animFrameId = requestAnimationFrame(loop);
    };

    loop();
  }

  getStationTransform(st: FloatingStation): string {
    const mx = this.mouseX() * st.parallaxFactor * 30;
    const my = this.mouseY() * st.parallaxFactor * 30;
    // Floating animation removed per user request

    return `translate3d(${mx}px, ${my}px, 0px)`;
  }

  getFarParallaxTransform(): string {
    const mx = this.mouseX() * 14;
    const my = this.mouseY() * 14;
    return `translate3d(${-mx}px, ${-my}px, 0px)`;
  }

  getMidParallaxTransform(): string {
    const mx = this.mouseX() * 32;
    const my = this.mouseY() * 32;
    return `translate3d(${-mx}px, ${-my}px, 0px)`;
  }

  getForegroundParallaxTransform(): string {
    const mx = this.mouseX() * 75;
    const my = this.mouseY() * 75;
    return `translate3d(${mx}px, ${my}px, 0px)`;
  }

  onStationHover(st: FloatingStation | null): void {
    this.hoveredStation.set(st);
  }

  onStationClick(st: FloatingStation): void {
    this.selectSection.emit(st.sectionId);
  }

  onLaunch3D(): void {
    this.launchPlayground.emit();
  }
}
