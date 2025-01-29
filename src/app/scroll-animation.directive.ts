import { Directive, ElementRef, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appScrollAnimation]',
  standalone: true,
})
export class ScrollAnimationDirective {
  private observer: IntersectionObserver | null = null;
  private isMobile: boolean;

  constructor(private el: ElementRef, private renderer: Renderer2) {
    this.isMobile = window.innerWidth < 768;

    if (!this.isMobile) {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            // Calculamos qué tan visible está el elemento
            const intersectionRatio = entry.intersectionRatio;
            
            // Obtenemos la posición relativa del elemento en la ventana
            const elementRect = entry.boundingClientRect;
            const viewportHeight = window.innerHeight;
            
            // Calculamos qué tan centrado está el elemento
            const elementCenter = elementRect.top + (elementRect.height / 2);
            const viewportCenter = viewportHeight / 2;
            const distanceFromCenter = Math.abs(elementCenter - viewportCenter);
            const maxDistance = viewportHeight / 2;
            
            // Combinamos visibilidad y centralidad
            const centerRatio = 1 - (distanceFromCenter / maxDistance);
            let progress = Math.min(intersectionRatio, centerRatio);
            
            // Si está muy cerca del centro, forzamos 100%
            if (centerRatio > 0.8 && intersectionRatio > 0.8) {
              progress = 1;
            }
            
            progress = Math.max(0, Math.min(1, progress));
            
            this.el.nativeElement.style.opacity = progress;
            this.el.nativeElement.style.transform = `scale(${0.8 + (progress * 0.2)})`;
          });
        },
        {
          threshold: Array.from({ length: 100 }, (_, i) => i / 100),
          rootMargin: "0px"
        }
      );

      this.observer.observe(this.el.nativeElement);
    }
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}
