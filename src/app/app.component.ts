import { Component, ElementRef, AfterViewInit, Renderer2 } from '@angular/core';
import { HabilidadesComponent } from "./components/habilidades/habilidades.component";

@Component({
  selector: 'app-root',
  imports: [HabilidadesComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements AfterViewInit {
  constructor(private el: ElementRef, private renderer: Renderer2) {}
  

  ngAfterViewInit() {
    // Obtén todos los contenedores que quieras observar
    const containers = this.el.nativeElement.querySelectorAll('.animate-container');
    
    containers.forEach((container: Element) => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            this.renderer.addClass(container, 'animate');
            observer.disconnect();  // Detenemos la observación una vez que se activa
          }
        },
        { threshold: 0.2 }
      );
      
      observer.observe(container);  // Inicia la observación para cada contenedor
    });
  }
}
