import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

export interface Habilidad {
  nombre: string;
  sigla: string;
  aplicacion: string;
}

export interface CategoriaHabilidad {
  titulo: string;
  habilidades: Habilidad[];
}

@Component({
  imports: [CommonModule],
  selector: 'app-habilidades',
  standalone: true,
  templateUrl: './habilidades.component.html',
  styleUrls: ['./habilidades.component.css'],
})
export class HabilidadesComponent {
  readonly categorias: CategoriaHabilidad[] = [
    {
      titulo: 'Interfaces web',
      habilidades: [
        { nombre: 'HTML5', sigla: 'H', aplicacion: 'Estructura y contenido' },
        { nombre: 'CSS3', sigla: 'C', aplicacion: 'Diseño adaptable y animación' },
        { nombre: 'JavaScript', sigla: 'JS', aplicacion: 'Interacción y lógica de interfaz' },
        { nombre: 'React', sigla: 'R', aplicacion: 'Interfaces para juegos y aplicaciones' },
        { nombre: 'Angular', sigla: 'A', aplicacion: 'Aplicaciones y componentes' },
        { nombre: 'TypeScript', sigla: 'TS', aplicacion: 'Código tipado para proyectos web' },
        { nombre: 'Vite', sigla: 'V', aplicacion: 'Desarrollo y compilación web' }
      ]
    },
    {
      titulo: 'Juegos y geotecnologías',
      habilidades: [
        { nombre: 'Canvas 2D', sigla: '2D', aplicacion: 'Gráficos, física y lógica de juego' },
        { nombre: 'QGIS', sigla: 'Q', aplicacion: 'Cartografía y análisis espacial' },
        { nombre: 'QField', sigla: 'QF', aplicacion: 'Trabajo con datos en campo' },
        { nombre: 'Leaflet', sigla: 'L', aplicacion: 'Mapas interactivos en la web' },
        { nombre: 'Geovisores web', sigla: 'G', aplicacion: 'Exploración de información geográfica' }
      ]
    },
    {
      titulo: 'Flujo de trabajo',
      habilidades: [
        { nombre: 'Git', sigla: 'git', aplicacion: 'Control de versiones' },
        { nombre: 'GitHub', sigla: 'GH', aplicacion: 'Repositorios y publicación' }
      ]
    }
  ];
}
