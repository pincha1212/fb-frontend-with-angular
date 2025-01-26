import { Directive, ElementRef, Renderer2, HostListener } from '@angular/core';

@Directive({
  selector: '[appScrollAnimation]'
})
export class ScrollAnimationDirective {
  private observer: IntersectionObserver;

  constructor(private el: ElementRef, private renderer: Renderer2) {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Cuando entra al viewport, activa la animación de entrada
          this.renderer.addClass(this.el.nativeElement, 'animate-in');
          this.renderer.removeClass(this.el.nativeElement, 'animate-out');
        } else {
          // Cuando sale del viewport, activa la animación de salida
          this.renderer.addClass(this.el.nativeElement, 'animate-out');
          this.renderer.removeClass(this.el.nativeElement, 'animate-in');
        }
      });
    }, {
      threshold: 0.5 // Ajusta según cuándo quieres que se active (cuando el 50% del elemento esté visible)
    });

    // Inicia el observador en el elemento
    this.observer.observe(this.el.nativeElement);
  }

  @HostListener('window:resize') onResize() {
    // Cuando se redimensiona la ventana, reiniciamos la observación
    this.observer.disconnect();
    this.observer.observe(this.el.nativeElement);
  }
}
