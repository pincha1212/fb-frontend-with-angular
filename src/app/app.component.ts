import { Component, ElementRef, AfterViewInit, Renderer2 } from '@angular/core';
import { HabilidadesComponent } from "./components/habilidades/habilidades.component";
import { ExperienciaComponent } from "./components/experiencia/experiencia.component";
import { ContactoComponent } from "./components/contacto/contacto.component";

@Component({
  selector: 'app-root',
  imports: [HabilidadesComponent, ExperienciaComponent, ContactoComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent  {

}
