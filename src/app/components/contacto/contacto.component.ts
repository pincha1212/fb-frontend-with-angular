import { Component } from '@angular/core';

@Component({
  selector: 'app-contacto',
  templateUrl: './contacto.component.html',
  styleUrls: ['./contacto.component.css']
})
export class ContactoComponent {
  correo: string = 'fedebarzola7@gmail.com';

  async copiarCorreo(): Promise<void> {
    if (!navigator.clipboard) {
      alert('La API del portapapeles no es compatible con este navegador.');
      return;
    }
    
    try {
      await navigator.clipboard.writeText(this.correo);
      alert('Correo copiado al portapapeles');
    } catch (err) {
      console.error('Error al copiar el correo:', err);
      alert('No se pudo copiar el correo. Por favor, intente de nuevo.');
    }
  }
}
