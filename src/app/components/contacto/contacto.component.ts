import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { FormsModule, NgForm } from '@angular/forms';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule], // Añade FormsModule si usas ngModel
  selector: 'app-contacto',
  templateUrl: './contacto.component.html',
  styleUrls: ['./contacto.component.css'],
})
export class ContactoComponent {
  private http = inject(HttpClient);
  correo = 'fedebarzola7@gmail.com';
  mostrarFormulario = false;
  enviando = false;
  mensajeEstado = '';       // Texto del mensaje (éxito o error)
  mensajeExito = false;     // true si es éxito, false si es error
  copiado = false;          // Para feedback de copiado

  // ⭐ Método mejorado para copiar (sin alert)
  async copiarCorreo(): Promise<void> {
    if (!navigator.clipboard) {
      this.mensajeEstado = '❌ Tu navegador no soporta copiado automático.';
      this.mensajeExito = false;
      return;
    }
    try {
      await navigator.clipboard.writeText(this.correo);
      this.copiado = true;
      this.mensajeEstado = '✅ Correo copiado al portapapeles';
      this.mensajeExito = true;
      setTimeout(() => {
        this.copiado = false;
        this.mensajeEstado = '';
      }, 3000);
    } catch {
      this.mensajeEstado = '❌ No se pudo copiar. Intenta manualmente.';
      this.mensajeExito = false;
    }
  }

  toggleForm(): void {
    this.mostrarFormulario = !this.mostrarFormulario;
    this.resetearEstado();
  }

  // ⭐ Método mejorado usando lastValueFrom (moderno)
  async enviarFormulario(form: NgForm): Promise<void> {
    if (form.invalid) return;

    this.enviando = true;
    this.mensajeEstado = '';
    this.mensajeExito = false;

    const formData = new URLSearchParams();
    formData.set('name', form.value.name);
    formData.set('_replyto', form.value._replyto);
    formData.set('message', form.value.message);

    try {
      await lastValueFrom(
        this.http.post(
          'https://formspree.io/f/xdkezazb',
          formData.toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Accept: 'application/json',
            },
          }
        )
      );

      this.mensajeExito = true;
      this.mensajeEstado = '✅ ¡Mensaje enviado! Te responderé pronto.';
      form.resetForm();
      setTimeout(() => {
        this.toggleForm(); // Oculta el formulario tras 2s
        this.resetearEstado();
      }, 2500);
    } catch (error) {
      this.mensajeExito = false;
      this.mensajeEstado = '❌ Error al enviar. Intenta de nuevo más tarde.';
      console.error('Formspree error:', error);
    } finally {
      this.enviando = false;
    }
  }

  private resetearEstado(): void {
    this.mensajeEstado = '';
    this.mensajeExito = false;
    this.copiado = false;
  }
}