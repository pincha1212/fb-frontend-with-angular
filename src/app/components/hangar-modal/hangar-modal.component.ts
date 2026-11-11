import { Component, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ShipSelectionEvent {
  url: string;
  nombre: string;
  tipo?: string;
}

export interface PresetShipSpec {
  id: string;
  nombre: string;
  url: string;
  tipo: 'xeno' | 'shuttle' | 'interceptor';
  icono: string;
  badge: string;
  clase: string;
  descripcion: string;
  velocidad: number;
  maniobrabilidad: number;
  escudo: number;
  propulsion: string;
}

export const PRESET_SHIPS: PresetShipSpec[] = [
  {
    id: 'xeno',
    nombre: 'Caza Biomecánico Xeno-01',
    url: 'preset:xeno',
    tipo: 'xeno',
    icono: '👾',
    badge: 'BIO-QUITINA ALIENÍGENA',
    clase: 'Exploración y Combate Orgánico',
    descripcion: 'Aeronave alienígena con fuselaje de quitina viva, alas basculantes estilo mantis, núcleo biolumínico y anillo de propulsión gravitón.',
    velocidad: 92,
    maniobrabilidad: 98,
    escudo: 85,
    propulsion: 'Anillo Gravitacional Cuántico'
  },
  {
    id: 'shuttle',
    nombre: 'Transbordador Orbital Humano STS',
    url: 'preset:shuttle',
    tipo: 'shuttle',
    icono: '🚀',
    badge: 'FUSELAJE TERRESTRE STS',
    clase: 'Transporte y Órbita Atmosférica',
    descripcion: 'Diseño clásico de la era espacial humana con fuselaje cerámico blanco y negro, alas delta estabilizadoras y triple tobera de propulsión química.',
    velocidad: 80,
    maniobrabilidad: 78,
    escudo: 95,
    propulsion: 'Triple Tobera Criogénica'
  },
  {
    id: 'interceptor',
    nombre: 'Interceptor Estelar Viper-IV',
    url: 'preset:interceptor',
    tipo: 'interceptor',
    icono: '⚡',
    badge: 'CAZA TÁCTICO DE ASALTO',
    clase: 'Combate Rápido y Superioridad Aérea',
    descripcion: 'Caza táctico de alta maniobrabilidad con blindaje de titanio biselado, cañones de repetición y doble reactor iónico de respuesta inmediata.',
    velocidad: 100,
    maniobrabilidad: 90,
    escudo: 75,
    propulsion: 'Doble Reactor Iónico de Plasma'
  }
];

@Component({
  selector: 'app-hangar-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hangar-modal.component.html',
  styleUrls: ['./hangar-modal.component.css']
})
export class HangarModalComponent {
  @Output() shipSelected = new EventEmitter<ShipSelectionEvent>();

  isOpen = signal(false);
  selectedModelUrl = signal<string>('preset:xeno');

  readonly presetShips = PRESET_SHIPS;

  open(currentSelectedUrl: string = 'preset:xeno'): void {
    this.selectedModelUrl.set(currentSelectedUrl || 'preset:xeno');
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  chooseShip(ship: PresetShipSpec): void {
    this.selectedModelUrl.set(ship.url);
    this.shipSelected.emit({
      url: ship.url,
      nombre: ship.nombre,
      tipo: ship.tipo
    });
    this.close();
  }
}
