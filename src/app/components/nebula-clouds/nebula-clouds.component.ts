import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  signal,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface NebulaCloud {
  id: string;
  name: string;
  cxPct: number;
  cyPct: number;
  rxPx: number;
  ryPx: number;
  colorGradId: string;
  blurDev: number;
  opacity: number;
  zIndex: number;
  driftSpeedSec: number;
  scaleFactor: number;
}

@Component({
  selector: 'app-nebula-clouds',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './nebula-clouds.component.html',
  styleUrls: ['./nebula-clouds.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NebulaCloudsComponent implements OnInit, OnDestroy {
  parallaxX = signal(0);
  parallaxY = signal(0);
  targetParallaxX = 0;
  targetParallaxY = 0;

  // Multi-depth organic nebula cloud formations
  readonly clouds: NebulaCloud[] = [
    {
      id: 'nebula-orion',
      name: 'Nebulosa Orión Cyan',
      cxPct: 20,
      cyPct: 25,
      rxPx: 380,
      ryPx: 260,
      colorGradId: 'nebulaCyanGrad',
      blurDev: 45,
      opacity: 0.35,
      zIndex: 1,
      driftSpeedSec: 65,
      scaleFactor: 1.1
    },
    {
      id: 'nebula-carina',
      name: 'Nebulosa Carina Violeta',
      cxPct: 80,
      cyPct: 65,
      rxPx: 440,
      ryPx: 320,
      colorGradId: 'nebulaVioletGrad',
      blurDev: 55,
      opacity: 0.38,
      zIndex: 2,
      driftSpeedSec: 85,
      scaleFactor: 1.25
    },
    {
      id: 'nebula-helix',
      name: 'Nebulosa Hélice Dorada',
      cxPct: 50,
      cyPct: 80,
      rxPx: 320,
      ryPx: 220,
      colorGradId: 'nebulaGoldGrad',
      blurDev: 40,
      opacity: 0.28,
      zIndex: 3,
      driftSpeedSec: 50,
      scaleFactor: 0.95
    },
    {
      id: 'nebula-andromeda',
      name: 'Nebulosa Andrómeda Azul',
      cxPct: 75,
      cyPct: 20,
      rxPx: 350,
      ryPx: 240,
      colorGradId: 'nebulaIndigoGrad',
      blurDev: 50,
      opacity: 0.32,
      zIndex: 2,
      driftSpeedSec: 70,
      scaleFactor: 1.05
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
    this.targetParallaxX = normX * 35;
    this.targetParallaxY = normY * 35;
  }

  private startParallaxLoop(): void {
    const loop = () => {
      if (this.isDestroyed) return;

      const cx = this.parallaxX();
      const cy = this.parallaxY();
      const nx = cx + (this.targetParallaxX - cx) * 0.04;
      const ny = cy + (this.targetParallaxY - cy) * 0.04;

      this.parallaxX.set(nx);
      this.parallaxY.set(ny);

      this.animFrameId = requestAnimationFrame(loop);
    };

    loop();
  }
}
