import { Directive, ElementRef, Renderer2, OnInit, OnDestroy, input, inject } from '@angular/core';

export type AnimationType = 'slide-up' | 'fade-in' | 'scale-up' | 'slide-left' | 'slide-right';

@Directive({
  selector: '[appScrollAnimation]',
  standalone: true,
})
export class ScrollAnimationDirective implements OnInit, OnDestroy {
  private el = inject(ElementRef);
  private renderer = inject(Renderer2);
  private observer: IntersectionObserver | null = null;

  // Configurable inputs via Angular Signals
  animationType = input<AnimationType>('slide-up');
  animationDelay = input<string>('0ms');
  threshold = input<number>(0.12);
  once = input<boolean>(false);

  ngOnInit(): void {
    const nativeEl = this.el.nativeElement;

    // Configurar estado inicial según el tipo de animación
    this.renderer.setStyle(nativeEl, 'transition', `opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)`);
    this.renderer.setStyle(nativeEl, 'transition-delay', this.animationDelay());
    this.renderer.setStyle(nativeEl, 'will-change', 'opacity, transform');

    this.applyInitialStyles(nativeEl);

    // Verificar soporte de IntersectionObserver
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      this.applyActiveStyles(nativeEl);
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.applyActiveStyles(nativeEl);
            if (this.once() && this.observer) {
              this.observer.unobserve(nativeEl);
            }
          } else if (!this.once()) {
            // Opacidad de seguridad al salir del viewport para mantener legibilidad sin ocultar por completo
            this.applyExitStyles(nativeEl);
          }
        });
      },
      {
        threshold: this.threshold(),
        rootMargin: '0px 0px -40px 0px'
      }
    );

    this.observer.observe(nativeEl);
  }

  private applyInitialStyles(el: HTMLElement): void {
    // Opacidad 100% garantizada en todo momento según requerimiento del usuario
    this.renderer.setStyle(el, 'opacity', '1');

    switch (this.animationType()) {
      case 'slide-up':
        this.renderer.setStyle(el, 'transform', 'translateY(16px)');
        break;
      case 'slide-left':
        this.renderer.setStyle(el, 'transform', 'translateX(16px)');
        break;
      case 'slide-right':
        this.renderer.setStyle(el, 'transform', 'translateX(-16px)');
        break;
      case 'scale-up':
        this.renderer.setStyle(el, 'transform', 'scale(0.98)');
        break;
      case 'fade-in':
      default:
        this.renderer.setStyle(el, 'transform', 'translateY(8px)');
        break;
    }
  }

  private applyActiveStyles(el: HTMLElement): void {
    this.renderer.setStyle(el, 'opacity', '1');
    this.renderer.setStyle(el, 'transform', 'translateY(0) translateX(0) scale(1)');
  }

  private applyExitStyles(el: HTMLElement): void {
    this.renderer.setStyle(el, 'opacity', '1');
    this.renderer.setStyle(el, 'transform', 'translateY(0) scale(1)');
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}
