import {
  Component,
  HostListener,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';

interface IonExhaustParticle {
  x: number;
  y: number;
  size: number;
  maxSize: number;
  opacity: number;
  color: string;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

interface ShockwaveRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  color: string;
}

@Component({
  selector: 'app-space-cursor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-cursor-overlay" aria-hidden="true">
      <svg class="cursor-svg" width="100%" height="100%">
        <defs>
          <!-- Ion Thruster Plasma Glow Gradients -->
          <radialGradient id="ionFlameCore" cx="30%" cy="50%" r="70%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="1" />
            <stop offset="30%" stop-color="#00f0ff" stop-opacity="0.95" />
            <stop offset="70%" stop-color="#bd00ff" stop-opacity="0.8" />
            <stop offset="100%" stop-color="#3b82f6" stop-opacity="0" />
          </radialGradient>

          <linearGradient id="thrustConeGrad" x1="100%" y1="50%" x2="0%" y2="50%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="1" />
            <stop offset="25%" stop-color="#00f0ff" stop-opacity="0.85" />
            <stop offset="65%" stop-color="#a855f7" stop-opacity="0.5" />
            <stop offset="100%" stop-color="#ec4899" stop-opacity="0" />
          </linearGradient>

          <filter id="ionPlasmaGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <!-- Shockwave Pulse Rings (Created on click/acceleration bursts) -->
        @for (ring of shockwaves; track $index) {
          <circle 
            [attr.cx]="ring.x" 
            [attr.cy]="ring.y" 
            [attr.r]="ring.radius" 
            fill="none" 
            [attr.stroke]="ring.color" 
            stroke-width="2" 
            [attr.opacity]="ring.opacity" />
        }

        <!-- Ion Engine Exhaust Particle Trail -->
        @for (p of particles; track $index) {
          <circle 
            [attr.cx]="p.x" 
            [attr.cy]="p.y" 
            [attr.r]="p.size" 
            [attr.fill]="p.color" 
            [attr.opacity]="p.opacity" 
            filter="url(#ionPlasmaGlow)" />
        }

        <!-- Connecting Ion Beam Vector Path -->
        @if (trailPoints().length > 1) {
          <polyline 
            [attr.points]="getTrailPointsString()" 
            fill="none" 
            stroke="url(#thrustConeGrad)" 
            [attr.stroke-width]="beamWidth()" 
            stroke-linecap="round" 
            stroke-linejoin="round" 
            opacity="0.75" />
        }

        <!-- Ion Engine Nozzle & Craft Head -->
        <g [attr.transform]="'translate(' + currX() + ',' + currY() + ') rotate(' + angle() + ')'" filter="url(#ionPlasmaGlow)">
          <!-- Retrograde Plasma Thrust Flame Cone (Faces opposite to velocity) -->
          <path 
            [attr.d]="'M 0,0 L -' + (22 + thrustPower() * 1.5) + ',-' + (6 + thrustPower() * 0.3) + ' L -' + (32 + thrustPower() * 2.2) + ',0 L -' + (22 + thrustPower() * 1.5) + ',' + (6 + thrustPower() * 0.3) + ' Z'" 
            fill="url(#thrustConeGrad)" 
            opacity="0.9" />

          <!-- Engine Nacelle Frame -->
          <polygon 
            points="10,0 -4,-7 -8,-4 -8,4 -4,7" 
            fill="#0f172a" 
            stroke="#00f0ff" 
            stroke-width="1.5" />

          <!-- White Hot Plasma Core Nucleus -->
          <circle cx="0" cy="0" [attr.r]="4 + thrustPower() * 0.2" fill="url(#ionFlameCore)" />

          <!-- Side Thruster Nozzles -->
          <rect x="-6" y="-8" width="4" height="2" fill="#38bdf8" rx="1" />
          <rect x="-6" y="6" width="4" height="2" fill="#38bdf8" rx="1" />
        </g>
      </svg>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 99999;
      overflow: hidden;
    }

    .space-cursor-overlay {
      width: 100vw;
      height: 100vh;
      position: relative;
    }

    .cursor-svg {
      display: block;
      width: 100%;
      height: 100%;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpaceCursorComponent implements OnInit, OnDestroy {
  targetX = signal(-100);
  targetY = signal(-100);
  currX = signal(-100);
  currY = signal(-100);
  angle = signal(0);
  thrustPower = signal(0);
  beamWidth = signal(3);
  trailPoints = signal<{ x: number; y: number }[]>([]);

  particles: IonExhaustParticle[] = [];
  shockwaves: ShockwaveRing[] = [];

  private animId = 0;
  private isDestroyed = false;

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      this.targetX.set(centerX);
      this.targetY.set(centerY);
      this.currX.set(centerX);
      this.currY.set(centerY);
    }
    this.startLoop();
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
    }
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    this.targetX.set(e.clientX);
    this.targetY.set(e.clientY);
  }

  @HostListener('window:touchmove', ['$event'])
  onTouchMove(e: TouchEvent): void {
    if (e.touches && e.touches[0]) {
      this.targetX.set(e.touches[0].clientX);
      this.targetY.set(e.touches[0].clientY);
    }
  }

  @HostListener('window:mousedown', ['$event'])
  onMouseDown(e: MouseEvent): void {
    this.triggerPlasmaBurst(e.clientX, e.clientY);
  }

  getTrailPointsString(): string {
    return this.trailPoints().map(p => `${p.x},${p.y}`).join(' ');
  }

  private triggerPlasmaBurst(x: number, y: number): void {
    // Spawn expandable shockwave ring
    this.shockwaves.push({
      x,
      y,
      radius: 4,
      maxRadius: 42,
      opacity: 0.9,
      color: '#00f0ff'
    });

    // Radial ion particle explosion burst
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2;
      const speed = 2.5 + Math.random() * 4.5;
      this.particles.push({
        x,
        y,
        size: 2.5 + Math.random() * 3,
        maxSize: 6,
        opacity: 0.95,
        color: i % 2 === 0 ? '#00f0ff' : '#bd00ff',
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 0.4 + Math.random() * 0.3
      });
    }
  }

  private startLoop(): void {
    const tick = () => {
      if (this.isDestroyed) return;

      const tx = this.targetX();
      const ty = this.targetY();
      const cx = this.currX();
      const cy = this.currY();

      // Damped lerp momentum
      const lerpFactor = 0.16;
      const nx = cx + (tx - cx) * lerpFactor;
      const ny = cy + (ty - cy) * lerpFactor;

      const dx = nx - cx;
      const dy = ny - cy;
      const speed = Math.hypot(dx, dy);

      this.thrustPower.set(Math.min(12, speed));
      this.beamWidth.set(3 + Math.min(6, speed * 0.4));

      if (speed > 0.4) {
        const newAngle = Math.atan2(dy, dx) * (180 / Math.PI);
        this.angle.set(newAngle);

        // Spawn high-density ion exhaust particles backwards from ship heading
        const backAngle = (newAngle + 180) * (Math.PI / 180);
        const spawnCount = Math.min(4, Math.ceil(speed * 0.3));

        for (let k = 0; k < spawnCount; k++) {
          const spread = (Math.random() - 0.5) * 0.6;
          const pAngle = backAngle + spread;
          const pSpeed = (speed * 0.25) + 1.5 + Math.random() * 2.0;

          // Color palette progression based on exhaust temperature
          const palette = ['#ffffff', '#00f0ff', '#38bdf8', '#a855f7', '#ec4899'];
          const pColor = palette[Math.floor(Math.random() * palette.length)];

          this.particles.push({
            x: nx + Math.cos(backAngle) * 8 + (Math.random() - 0.5) * 4,
            y: ny + Math.sin(backAngle) * 8 + (Math.random() - 0.5) * 4,
            size: 2 + Math.random() * 2.5,
            maxSize: 5 + Math.random() * 3,
            opacity: 0.9,
            color: pColor,
            vx: Math.cos(pAngle) * pSpeed,
            vy: Math.sin(pAngle) * pSpeed,
            life: 0,
            maxLife: 0.35 + Math.random() * 0.25
          });
        }
      }

      this.currX.set(nx);
      this.currY.set(ny);

      // Vector trail history
      const trail = this.trailPoints();
      const newTrail = [{ x: nx, y: ny }, ...trail.slice(0, 9)];
      this.trailPoints.set(newTrail);

      // Update particle physics
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life += 0.03;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.94;
        p.vy *= 0.94;
        const progress = p.life / p.maxLife;
        p.opacity = Math.max(0, 1.0 - progress);
        p.size = p.maxSize * (1.0 - progress * 0.6);

        if (progress >= 1.0 || p.opacity <= 0) {
          this.particles.splice(i, 1);
        }
      }

      // Update shockwave ring expansions
      for (let j = this.shockwaves.length - 1; j >= 0; j--) {
        const s = this.shockwaves[j];
        s.radius += 2.2;
        s.opacity -= 0.045;
        if (s.opacity <= 0 || s.radius >= s.maxRadius) {
          this.shockwaves.splice(j, 1);
        }
      }

      this.animId = requestAnimationFrame(tick);
    };

    tick();
  }
}
