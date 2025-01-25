import { Component, ElementRef, AfterViewInit, Renderer2 } from '@angular/core';

@Component({
  selector: 'app-habilidades',
  templateUrl: './habilidades.component.html',
  styleUrls: ['./habilidades.component.css'],
})
export class HabilidadesComponent implements AfterViewInit {
  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngAfterViewInit() {
    const habilidadesContainer = this.el.nativeElement.querySelector('.habilidades-container');

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          this.renderer.setStyle(habilidadesContainer, 'opacity', '1');
          this.renderer.setStyle(habilidadesContainer, 'transform', 'translateX(0)');
          observer.disconnect(); // Detenemos la observación
        }
      },
      { threshold: 0.2 } // Activará la animación cuando el 20% del contenedor sea visible
    );

    if (habilidadesContainer) {
      observer.observe(habilidadesContainer);
    }
  }
}
