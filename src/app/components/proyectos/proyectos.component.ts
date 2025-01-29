import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-proyectos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './proyectos.component.html',
  styleUrls: ['./proyectos.component.css']
})
export class ProyectosComponent {
  techColors: { [key: string]: string } = {
    'JavaScript': '#f7df1e',
    'HTML': '#e34c26',
    'CSS': '#264de4',
    'API': '#00ff95',
    'React': '#61dafb',
    'Angular': '#dd1b16',
    'TypeScript': '#007acc'
  };

  proyectos = [
    {
      titulo: 'Netflix Clone',
      descripcion: 'Replica de app de streaming con TMDB',
      tecnologias: ['JavaScript', 'CSS', 'HTML', 'API'],
      imagen: 'https://i.ibb.co/cKq3tqcH/netfliz-clone.jpg',
      link: 'https://pincha1212.github.io/netflix-clon/'
    },
    {
      titulo: 'Weather App',
      descripcion: 'Aplicación del clima con datos en tiempo real desde la API de OpenWeatherMap',
      tecnologias: ['JavaScript', 'API', 'CSS', 'HTML'],
      imagen: 'https://i.ibb.co/Z1XtcWJn/weather.jpg',
      link: 'https://pincha1212.github.io/weather/'
    },
    {
      titulo: 'Calculator',
      descripcion: 'Calculadora con funciones basicas',
      tecnologias: ['HTML', 'CSS', 'JavaScript'],
      imagen: 'https://i.ibb.co/q1bwwnh/calculator.jpg',
      link: 'https://pincha1212.github.io/calculator/'
    }
  ];

  getTechColor(tech: string): string {
    return this.techColors[tech] || '#ffffff';
  }
}
