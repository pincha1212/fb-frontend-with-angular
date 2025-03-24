import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import {  NgForm } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  standalone: true,
  imports: [CommonModule ],
  selector: 'app-contacto',
  templateUrl: './contacto.component.html',
  styleUrls: ['./contacto.component.css'],
})
export class ContactoComponent {
  private http = inject(HttpClient); 
  correo = 'fedebarzola7@gmail.com';
  mostrarFormulario = false;
  enviando = false;
  mensajeEstado = '';
  mensajeExito = false;

  async copiarCorreo(): Promise<void> {
    if (!navigator.clipboard) {
      alert('La API del portapapeles no es compatible con este navegador.');
      return;
    }

    try {
      await navigator.clipboard.writeText(this.correo);
      alert('Correo copiado al portapeles');
    } catch (err) {
      console.error('Error al copiar el correo:', err);
      alert('No se pudo copiar el correo. Por favor, intente de nuevo.');
    }
  }

  toggleForm(): void {
    this.mostrarFormulario = !this.mostrarFormulario;
    this.resetearEstadoFormulario();
  }

  async enviarFormulario(form: NgForm): Promise<void> {
    if (form.invalid) return;

    this.enviando = true;
    this.mensajeEstado = '';

    const formData = new URLSearchParams();
    formData.set('name', form.value.name);
    formData.set('_replyto', form.value._replyto);
    formData.set('message', form.value.message);

    try {
      await this.http
        .post(`https://formspree.io/f/xdkezazb`, formData.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
          responseType: 'json',
        })
        .toPromise();

      this.mensajeExito = true;
      this.mensajeEstado = '✓ Mensaje enviado correctamente';
      form.resetForm();
      setTimeout(() => this.toggleForm(), 2000);
    } catch (error) {
      this.mensajeExito = false;
      this.mensajeEstado = '✗ Error al enviar. Intenta nuevamente.';
    } finally {
      this.enviando = false;
    }
  }

  private resetearEstadoFormulario(): void {
    this.mensajeEstado = '';
    this.mensajeExito = false;
  }
}
