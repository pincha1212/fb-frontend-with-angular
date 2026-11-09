import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  signal,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CelestialBody {
  id: string;
  name: string;
  orbitRadiusX: number;
  orbitRadiusY: number;
  orbitTiltDeg: number;
  orbitSpeedSec: number;
  depthScale: number;
  blurPx: number;
  opacity: number;
  colorGrad: string[];
  hasRing?: boolean;
  sizePx: number;
  initialAngleDeg: number;
}

@Component({
  selector: 'app-orbital-background',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './orbital-background.component.html',
  styleUrls: ['./orbital-background.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrbitalBackgroundComponent implements OnInit, OnDestroy {
  // Parallax offset based on cursor / tilt
  parallaxX = signal(0);
  parallaxY = signal(0);
  targetParallaxX = 0;
  targetParallaxY = 0;

  // Celestial dataset on concentric scaled orbits
  readonly bodies: CelestialBody[] = [
    {
      id: 'planet-aegis',
      name: 'Planeta Gaseoso Aegis-7',
      orbitRadiusX: 420,
      orbitRadiusY: 180,
      orbitTiltDeg: -12,
      orbitSpeedSec: 120,
      depthScale: 1.25,
      blurPx: 0,
      opacity: 0.85,
      colorGrad: ['#38bdf8', '#0284c7', '#0f172a'],
      hasRing: true,
      sizePx: 64,
      initialAngleDeg: 35
    },
    {
      id: 'moon-phobos',
      name: 'Luna Titanio Phobos',
      orbitRadiusX: 280,
      orbitRadiusY: 110,
      orbitTiltDeg: 24,
      orbitSpeedSec: 80,
      depthScale: 0.65,
      blurPx: 1,
      opacity: 0.7,
      colorGrad: ['#a855f7', '#6b21a8', '#1e1b4b'],
      hasRing: false,
      sizePx: 28,
      initialAngleDeg: 140
    },
    {
      id: 'asteroid-cluster',
      name: 'Cinturón de Asteroides',
      orbitRadiusX: 580,
      orbitRadiusY: 260,
      orbitTiltDeg: -5,
      orbitSpeedSec: 180,
      depthScale: 0.45,
      blurPx: 2,
      opacity: 0.55,
      colorGrad: ['#f59e0b', '#78350f', '#0f172a'],
      hasRing: false,
      sizePx: 20,
      initialAngleDeg: 220
    },
    {
      id: 'nebula-outpost',
      name: 'Estación de Relevo Nebular',
      orbitRadiusX: 340,
      orbitRadiusY: 140,
      orbitTiltDeg: -35,
      orbitSpeedSec: 95,
      depthScale: 0.8,
      blurPx: 0.5,
      opacity: 0.75,
      colorGrad: ['#00ff88', '#047857', '#022c22'],
      hasRing: true,
      sizePx: 36,
      initialAngleDeg: 310
    }
  ];

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
    const normX = (e.clientX / window.innerWidth) * 2 - 1;
    const normY = (e.clientY / window.innerHeight) * 2 - 1;
    this.targetParallaxX = normX * 25;
    this.targetParallaxY = normY * 25;
  }

  private startParallaxLoop(): void {
    const loop = () => {
      if (this.isDestroyed) return;

      const cx = this.parallaxX();
      const cy = this.parallaxY();
      const nx = cx + (this.targetParallaxX - cx) * 0.05;
      const ny = cy + (this.targetParallaxY - cy) * 0.05;

      this.parallaxX.set(nx);
      this.parallaxY.set(ny);

      this.animFrameId = requestAnimationFrame(loop);
    };

    loop();
  }
}
