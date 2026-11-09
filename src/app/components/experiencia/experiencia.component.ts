import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-experiencia',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './experiencia.component.html',
  styleUrl: './experiencia.component.css'
})
export class ExperienciaComponent {
  experiencias = [
    {
      puesto: 'Práctica colaborativa de desarrollo front-end',
      empresa: 'NoCountry',
      periodo: 'Experiencia Práctica',
      puntos: [
        'Colaboré con un equipo multidisciplinario en la planificación y construcción de un producto web.',
        'Organicé tareas y avances con una metodología de trabajo ágil.',
        'Participé en la revisión de entregas dentro de un equipo remoto.'
      ]
    },
    {
      puesto: 'Desarrollo front-end y geovisores SIG',
      empresa: 'Universidad Nacional de Cuyo (UNCuyo)',
      periodo: 'Formación en Geotecnologías',
      puntos: [
        'Diseñé interfaces y desarrollé funcionalidades con HTML, CSS y JavaScript.',
        'Trabajé con QGIS y QField para organizar y representar información geográfica.',
        'Integré datos espaciales en geovisores web.'
      ]
    }
  ];

  objetivo = 'Desarrollarme profesionalmente en el ámbito tecnológico, especialmente en desarrollo front-end, aplicaciones web y soluciones geoespaciales. Aspiro a crecer en equipos de trabajo, aportar soluciones claras, asumir responsabilidades y avanzar hacia posiciones de mayor coordinación.';
}
