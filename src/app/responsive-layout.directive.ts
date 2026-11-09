import {
  Directive,
  ElementRef,
  Renderer2,
  OnInit,
  OnDestroy,
  HostListener,
  inject
} from '@angular/core';

export type ViewportMode = 'desktop' | 'tablet' | 'mobile';

@Directive({
  selector: '[appResponsiveLayout]',
  standalone: true
})
export class ResponsiveLayoutDirective implements OnInit, OnDestroy {
  private el = inject(ElementRef);
  private renderer = inject(Renderer2);
  private resizeObserver: ResizeObserver | null = null;
  private currentMode: ViewportMode = 'desktop';

  ngOnInit(): void {
    const nativeEl = this.el.nativeElement as HTMLElement;

    // Configurar ResizeObserver para rendimiento óptimo
    if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => {
        this.evaluateViewportLayout(nativeEl);
      });
      this.resizeObserver.observe(document.body);
    }

    this.evaluateViewportLayout(nativeEl);
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.evaluateViewportLayout(this.el.nativeElement as HTMLElement);
  }

  private evaluateViewportLayout(container: HTMLElement): void {
    const width = window.innerWidth;
    let newMode: ViewportMode;

    if (width < 768) {
      newMode = 'mobile';
    } else if (width <= 1024) {
      newMode = 'tablet';
    } else {
      newMode = 'desktop';
    }

    if (this.currentMode !== newMode) {
      this.currentMode = newMode;
      this.applyLayoutStyles(container, newMode);
    } else {
      // Aplicar de todos modos para sincronizar estilos iniciales
      this.applyLayoutStyles(container, newMode);
    }
  }

  private applyLayoutStyles(container: HTMLElement, mode: ViewportMode): void {
    // Remover clases anteriores
    this.renderer.removeClass(container, 'layout-desktop-grid');
    this.renderer.removeClass(container, 'layout-tablet-carousel');
    this.renderer.removeClass(container, 'layout-mobile-carousel');

    const children = Array.from(container.children) as HTMLElement[];

    if (mode === 'mobile') {
      // MÓVIL (<768px): Carrusel horizontal con 1 tarjeta por vista
      this.renderer.addClass(container, 'layout-mobile-carousel');
      this.renderer.setStyle(container, 'display', 'flex');
      this.renderer.setStyle(container, 'overflow-x', 'auto');
      this.renderer.setStyle(container, 'scroll-snap-type', 'x mandatory');
      this.renderer.setStyle(container, 'gap', '0.85rem');
      this.renderer.setStyle(container, 'padding-bottom', '0.85rem');
      this.renderer.setStyle(container, '-webkit-overflow-scrolling', 'touch');

      children.forEach((child) => {
        this.renderer.setStyle(child, 'flex', '0 0 88%');
        this.renderer.setStyle(child, 'scroll-snap-align', 'center');
      });
    } else if (mode === 'tablet') {
      // TABLET (768px - 1024px): Carrusel horizontal con 2 tarjetas por vista
      this.renderer.addClass(container, 'layout-tablet-carousel');
      this.renderer.setStyle(container, 'display', 'flex');
      this.renderer.setStyle(container, 'overflow-x', 'auto');
      this.renderer.setStyle(container, 'scroll-snap-type', 'x mandatory');
      this.renderer.setStyle(container, 'gap', '1.15rem');
      this.renderer.setStyle(container, 'padding-bottom', '0.85rem');
      this.renderer.setStyle(container, '-webkit-overflow-scrolling', 'touch');

      children.forEach((child) => {
        this.renderer.setStyle(child, 'flex', '0 0 calc(50% - 0.6rem)');
        this.renderer.setStyle(child, 'scroll-snap-align', 'start');
      });
    } else {
      // ESCRITORIO (>1024px): Grilla multi-columna extendida
      this.renderer.addClass(container, 'layout-desktop-grid');
      this.renderer.removeStyle(container, 'display');
      this.renderer.removeStyle(container, 'overflow-x');
      this.renderer.removeStyle(container, 'scroll-snap-type');
      this.renderer.removeStyle(container, 'gap');
      this.renderer.removeStyle(container, 'padding-bottom');
      this.renderer.removeStyle(container, '-webkit-overflow-scrolling');

      children.forEach((child) => {
        this.renderer.removeStyle(child, 'flex');
        this.renderer.removeStyle(child, 'scroll-snap-align');
      });
    }
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }
}
