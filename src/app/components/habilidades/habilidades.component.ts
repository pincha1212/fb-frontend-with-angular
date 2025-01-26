import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  imports:[
    CommonModule
  ] ,
  selector: 'app-habilidades',
  templateUrl: './habilidades.component.html',
  styleUrls: ['./habilidades.component.css'],
})
export class HabilidadesComponent  {
  habilidades: { nombre: string, icono: string }[] = [
    { nombre: 'HTML', icono: 'https://cdn-icons-png.flaticon.com/512/732/732212.png' },
    { nombre: 'CSS', icono: 'https://cdn-icons-png.flaticon.com/512/732/732190.png' },
    { nombre: 'JavaScript', icono: 'https://cdn-icons-png.flaticon.com/512/5968/5968292.png' },
    { nombre: 'Angular', icono: 'https://i.ibb.co/HYGFjmL/angular.png' },
    { nombre: 'TypeScript', icono: 'https://cdn-icons-png.flaticon.com/512/5968/5968381.png' },
  ];
  
}
