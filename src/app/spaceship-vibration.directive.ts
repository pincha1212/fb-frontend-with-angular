import {
  Directive,
  ElementRef,
  HostListener,
  Input,
  OnInit,
  OnDestroy,
  Renderer2
} from '@angular/core';

@Directive({
  selector: '[appSpaceshipVibration]',
  standalone: true
})
export class SpaceshipVibrationDirective implements OnInit, OnDestroy {
  @Input() vibrationIntensity = 1.4; // Subtle max displacement in pixels
  @Input() decayFactor = 0.88; // Damping rate back to zero

  private lastMouseX = 0;
  private lastMouseY = 0;
  private currentVibrationX = 0;
  private currentVibrationY = 0;
  private currentRotation = 0;

  private animFrameId = 0;
  private isDestroyed = false;
  private prefersReducedMotion = false;

  constructor(
    private el: ElementRef<HTMLElement>,
    private renderer: Renderer2
  ) {}

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    if (!this.prefersReducedMotion) {
      this.startVibrationLoop();
    }
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.resetTransform();
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    if (this.prefersReducedMotion) return;

    const dx = e.clientX - this.lastMouseX;
    const dy = e.clientY - this.lastMouseY;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;

    const speed = Math.hypot(dx, dy);

    if (speed > 1.0) {
      // Generate rhythmic micro-jitter proportional to cursor speed
      const intensity = Math.min(this.vibrationIntensity, speed * 0.08);
      const angle = Math.random() * Math.PI * 2;

      this.currentVibrationX = Math.cos(angle) * intensity;
      this.currentVibrationY = Math.sin(angle) * intensity;
      this.currentRotation = (Math.random() - 0.5) * 0.15; // Extremely subtle micro-tilt
    }
  }

  private startVibrationLoop(): void {
    const tick = () => {
      if (this.isDestroyed) return;

      // Decay vibration smoothly back to equilibrium
      this.currentVibrationX *= this.decayFactor;
      this.currentVibrationY *= this.decayFactor;
      this.currentRotation *= this.decayFactor;

      if (Math.abs(this.currentVibrationX) > 0.01 || Math.abs(this.currentVibrationY) > 0.01) {
        const transformStr = `translate3d(${this.currentVibrationX.toFixed(2)}px, ${this.currentVibrationY.toFixed(2)}px, 0) rotate(${this.currentRotation.toFixed(3)}deg)`;
        this.renderer.setStyle(this.el.nativeElement, 'transform', transformStr);
        this.renderer.setStyle(this.el.nativeElement, 'will-change', 'transform');
      } else {
        this.resetTransform();
      }

      this.animFrameId = requestAnimationFrame(tick);
    };

    tick();
  }

  private resetTransform(): void {
    if (this.el && this.el.nativeElement) {
      this.renderer.removeStyle(this.el.nativeElement, 'transform');
      this.renderer.removeStyle(this.el.nativeElement, 'will-change');
    }
  }
}
