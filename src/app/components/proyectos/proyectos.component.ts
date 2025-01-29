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
  proyectos = [
    {
      titulo: 'Netflix Clone',
      descripcion: 'Réplica de la interfaz de Netflix con funcionalidades básicas',
      tecnologias: ['React', 'CSS', 'API Rest'],
      imagen: 'URL_DE_TU_NETFLIX_CLONE',
      link: 'https://github.com/tu-usuario/netflix-clone'
    },
    {
      titulo: 'Weather App',
      descripcion: 'Aplicación del clima con datos en tiempo real',
      tecnologias: ['JavaScript', 'API', 'CSS'],
      imagen: 'URL_DE_TU_WEATHER_APP',
      link: 'https://github.com/tu-usuario/weather-app'
    },
    {
      titulo: 'Calculator',
      descripcion: 'Calculadora interactiva con funciones avanzadas',
      tecnologias: ['HTML', 'CSS', 'JavaScript'],
      imagen: 'URL_DE_TU_CALCULATOR',
      link: 'https://github.com/tu-usuario/calculator'
    }
  ];
}
