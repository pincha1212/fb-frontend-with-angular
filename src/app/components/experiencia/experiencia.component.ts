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
      puesto: 'Simulación Laboral Collaborative Frontend',
      empresa: 'NoCountry',
      periodo: 'Experiencia Práctica',
      puntos: [
        'Participación activa en dinámicas de equipo multidisciplinares.',
        'Organización, asignación y cumplimiento riguroso de tareas bajo metodologías de desarrollo ágil.',
        'Colaboración continua en un entorno de trabajo remoto simulado para la entrega de productos funcionales.'
      ]
    },
    {
      puesto: 'Desarrollo Frontend & Geovisores SIG',
      empresa: 'Universidad Nacional de Cuyo (UNCuyo)',
      periodo: 'Formación en Geotecnologías',
      puntos: [
        'Diseño y maquetación de interfaz interactiva utilizando HTML5, CSS3 y JavaScript.',
        'Organización, estructuración y despliegue de datos espaciales con QGIS y QField.',
        'Integración de tecnologías frontend con herramientas geográficas para la creación de soluciones interactivas.'
      ]
    }
  ];

  objetivo = 'Desarrollarme profesionalmente en el ámbito tecnológico, especialmente en desarrollo web frontend, aplicaciones interactivas y videojuegos web. Aspiro a crecer dentro de equipos de trabajo, aportar soluciones, asumir responsabilidades y avanzar hacia posiciones de mayor coordinación.';
}
