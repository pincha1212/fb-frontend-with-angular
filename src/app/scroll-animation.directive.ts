import { Directive, ElementRef, Renderer2, HostListener } from '@angular/core';

@Directive({
  selector: '[appScrollAnimation]',
})
export class ScrollAnimationDirective {
  private observer: IntersectionObserver | null = null;
  private isMobile: boolean;

  constructor(private el: ElementRef, private renderer: Renderer2) {
    this.isMobile = window.innerWidth < 768;

    if (!this.isMobile) {
      const thresholdArray = Array.from({ length: 100 }, (_, i) => i / 100);
      
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const elementCenter = entry.boundingClientRect.top + 
                                (entry.boundingClientRect.height / 2);
            const windowHeight = window.innerHeight;
            const windowCenter = windowHeight / 2;
            
            // Simplificamos el cálculo para centrarlo mejor
            const maxDistance = windowHeight / 2;
            const distance = Math.abs(elementCenter - windowCenter);
            let progress = 1 - (distance / maxDistance);
            
            // Aseguramos que el progreso esté entre 0 y 1
            progress = Math.max(0, Math.min(1, progress));
            
            this.el.nativeElement.style.opacity = progress;
            this.el.nativeElement.style.transform = `scale(${0.7 + (progress * 0.3)})`;
          });
        },
        {
          threshold: thresholdArray,
          rootMargin: "0px"
        }
      );

      this.observer.observe(this.el.nativeElement);
    }
  }

  @HostListener('window:resize') onResize() {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth < 768;

    if (!wasMobile && this.isMobile) {
      this.observer?.disconnect();
      this.observer = null;
      this.el.nativeElement.style.opacity = 1;
      this.el.nativeElement.style.transform = 'none';
    } else if (wasMobile && !this.isMobile) {
      const thresholdArray = Array.from({ length: 100 }, (_, i) => i / 100);
      
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const elementCenter = entry.boundingClientRect.top + 
                                (entry.boundingClientRect.height / 2);
            const windowHeight = window.innerHeight;
            const windowCenter = windowHeight / 2;
            
            const maxDistance = windowHeight / 2;
            const distance = Math.abs(elementCenter - windowCenter);
            let progress = 1 - (distance / maxDistance);
            
            progress = Math.max(0, Math.min(1, progress));
            
            this.el.nativeElement.style.opacity = progress;
            this.el.nativeElement.style.transform = `scale(${0.7 + (progress * 0.3)})`;
          });
        },
        {
          threshold: thresholdArray,
          rootMargin: "0px"
        }
      );
      this.observer.observe(this.el.nativeElement);
    }
  }
}
