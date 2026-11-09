import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sobre-mi',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sobre-mi.component.html',
  styleUrls: ['./sobre-mi.component.css']
})
export class SobreMiComponent {
  estudios = [
    {
      titulo: 'Tecnicatura en Geotecnologías',
      institucion: 'Facultad de Filosofía y Letras — Universidad Nacional de Cuyo (UNCuyo)',
      periodo: 'Cursando 2º Año (1er Año Finalizado)',
      descripcion: 'Formación especializada en herramientas de Información Geográfica (SIG), desarrollo de Geovisores mediante tecnologías web, QGIS y QField.'
    },
    {
      titulo: 'Desarrollo web y proyectos personales',
      institucion: 'Formación continua y práctica independiente',
      periodo: 'Aprendizaje aplicado',
      descripcion: 'Práctica independiente en interfaces web, aplicaciones interactivas y visualizaciones con JavaScript y Canvas 2D.'
    }
  ];

  competencias = [
    'Responsabilidad y compromiso',
    'Trabajo en equipo y colaboración',
    'Adaptabilidad y versatilidad',
    'Resolución de problemas',
    'Aprendizaje continuo'
  ];

  hitos = [
    { numero: 'UNCuyo', label: 'Geotecnologías - 2º Año' },
    { numero: 'Canvas 2D', label: 'Visualización e interacción' },
    { numero: 'SIG', label: 'Cartografía web' }
  ];
}
