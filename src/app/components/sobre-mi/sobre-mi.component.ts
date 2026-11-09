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
  ubication = 'Mendoza, Argentina';
  email = 'fedebarzola7@gmail.com';
  phone = '+54 261 383 6127';

  estudios = [
    {
      titulo: 'Tecnicatura en Geotecnologías',
      institucion: 'Facultad de Filosofía y Letras — Universidad Nacional de Cuyo (UNCuyo)',
      periodo: 'Cursando 2º Año (1er Año Finalizado)',
      descripcion: 'Formación especializada en herramientas de Información Geográfica (SIG), desarrollo de Geovisores mediante tecnologías web, QGIS y QField.'
    },
    {
      titulo: 'Desarrollo Web Frontend & Juegos Web',
      institucion: 'Formación Autodidacta Avanzada & Proyectos Prácticos',
      periodo: 'Nivel Alto / Avanzado',
      descripcion: 'Desarrollo de aplicaciones interactivas complejas, canvas 2D, motores de física e Inteligencia Artificial en juegos web con JavaScript y Angular.'
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
    { numero: 'Canvas 2D', label: 'Juegos Web e IA' },
    { numero: 'SIG', label: 'Geovisores Interactivos' }
  ];
}
