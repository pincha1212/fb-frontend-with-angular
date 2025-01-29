import { Component, HostListener } from '@angular/core';
import { HabilidadesComponent } from "./components/habilidades/habilidades.component";
import { ExperienciaComponent } from "./components/experiencia/experiencia.component";
import { ContactoComponent } from "./components/contacto/contacto.component";
import { ScrollAnimationDirective } from './scroll-animation.directive';

@Component({
  selector: 'app-root',
  imports: [HabilidadesComponent,
     ExperienciaComponent,
      ContactoComponent,
      ScrollAnimationDirective],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  showUpArrows: boolean = false;
  showDownArrows: boolean = true;
  mouseState: 'top' | 'middle' | 'bottom' = 'top';

  @HostListener('window:scroll', [])
  onWindowScroll() {
    // Verificar si podemos scrollear hacia arriba
    this.showUpArrows = window.scrollY > 100;

    // Verificar si podemos scrollear hacia abajo
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollPosition = window.scrollY + windowHeight;
    
    // Dejamos un pequeño margen de 50px
    this.showDownArrows = scrollPosition < (documentHeight - 50);

    // Determinar el estado del mouse
    if (window.scrollY < 100) {
      this.mouseState = 'top';
    } else if (scrollPosition >= (documentHeight - 50)) {
      this.mouseState = 'bottom';
    } else {
      this.mouseState = 'middle';
    }
  }
}
