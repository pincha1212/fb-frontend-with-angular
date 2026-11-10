import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { FormsModule, NgForm } from '@angular/forms';
import { PortfolioDataService } from '../../services/portfolio-data.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  selector: 'app-contacto',
  templateUrl: './contacto.component.html',
  styleUrls: ['./contacto.component.css'],
})
export class ContactoComponent {
  private http = inject(HttpClient);
  portfolioService = inject(PortfolioDataService);

  get correo(): string {
    return this.portfolioService.contacto().email || 'fedebarzola7@gmail.com';
  }
  get telefono(): string {
    return this.portfolioService.contacto().telefono || '+54 261 383 6127';
  }
  get githubUrl(): string {
    return this.portfolioService.contacto().github || 'https://github.com/pincha1212';
  }
  get linkedinUrl(): string {
    return this.portfolioService.contacto().linkedin || 'https://www.linkedin.com/in/federico-barzola-7138b3216/';
  }
  get ubicacion(): string {
    return this.portfolioService.contacto().ubicacion || 'Mendoza, Argentina';
  }
  get formspreeEndpoint(): string {
    return this.portfolioService.contacto().formspreeEndpoint || 'https://formspree.io/f/xdkezazb';
  }

  mostrarFormulario = false;
  enviando = false;
  mensajeEstado = '';
  mensajeExito = false;
  copiado = false;

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
          this.formspreeEndpoint,
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
        this.toggleForm();
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
