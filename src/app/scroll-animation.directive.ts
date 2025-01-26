import { Directive, ElementRef, Renderer2, HostListener } from '@angular/core';

@Directive({
  selector: '[appScrollAnimation]',
})
export class ScrollAnimationDirective {
  private observer: IntersectionObserver | null = null; // Inicializado como null
  private isMobile: boolean;

  constructor(private el: ElementRef, private renderer: Renderer2) {
    // Detecta si es un dispositivo móvil
    this.isMobile = window.innerWidth < 768;

    if (!this.isMobile) {
      // Solo aplica la animación si no es móvil
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              this.renderer.addClass(this.el.nativeElement, 'animate-in');
              this.renderer.removeClass(this.el.nativeElement, 'animate-out');
            } else {
              this.renderer.addClass(this.el.nativeElement, 'animate-out');
              this.renderer.removeClass(this.el.nativeElement, 'animate-in');
            }
          });
        },
        {
          threshold: 0.5,
        }
      );

      this.observer.observe(this.el.nativeElement);
    }
  }

  @HostListener('window:resize') onResize() {
    // Si cambia el tamaño de la ventana, actualizamos la lógica
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth < 768;

    if (!wasMobile && this.isMobile) {
      // Si ahora es móvil, detiene el observador y elimina las clases de animación
      this.observer?.disconnect();
      this.observer = null;
      this.renderer.removeClass(this.el.nativeElement, 'animate-in');
      this.renderer.removeClass(this.el.nativeElement, 'animate-out');
    } else if (wasMobile && !this.isMobile) {
      // Si deja de ser móvil, reactiva el observador
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              this.renderer.addClass(this.el.nativeElement, 'animate-in');
              this.renderer.removeClass(this.el.nativeElement, 'animate-out');
            } else {
              this.renderer.addClass(this.el.nativeElement, 'animate-out');
              this.renderer.removeClass(this.el.nativeElement, 'animate-in');
            }
          });
        },
        {
          threshold: 0.5,
        }
      );
      this.observer.observe(this.el.nativeElement);
    }
  }
}
