import { Component } from '@angular/core';
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
export class AppComponent  {

}
