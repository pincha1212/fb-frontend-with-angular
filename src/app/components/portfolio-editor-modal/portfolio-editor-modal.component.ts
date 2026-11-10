import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PortfolioDataService, FullPortfolioData, HitoItem, EstudioItem, HabilidadCat, ExperienciaItem, RedSocial } from '../../services/portfolio-data.service';
import { Proyecto } from '../proyectos/proyectos.component';

@Component({
  selector: 'app-portfolio-editor-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './portfolio-editor-modal.component.html',
  styleUrls: ['./portfolio-editor-modal.component.css']
})
export class PortfolioEditorModalComponent implements OnInit {
  portfolioService = inject(PortfolioDataService);

  activeTab = signal<'perfil' | 'habilidades' | 'proyectos' | 'experiencia' | 'contacto'>('perfil');
  isSaving = signal(false);

  // Editable local state copy
  editableData!: FullPortfolioData;

  // Helper inputs for comma-separated fields
  proyectosTechInputs: string[] = [];
  habilidadesItemsInputs: string[] = [];
  experienciaTechInputs: string[] = [];
  competenciasInput: string = '';

  ngOnInit(): void {
    this.resetFormFromCurrentState();
  }

  resetFormFromCurrentState(): void {
    const current = this.portfolioService.portfolioData();
    this.editableData = JSON.parse(JSON.stringify(current));

    // Ensure array safety
    if (!this.editableData.profile.hitos) this.editableData.profile.hitos = [];
    if (!this.editableData.profile.competencias) this.editableData.profile.competencias = [];
    if (!this.editableData.profile.estudios) this.editableData.profile.estudios = [];
    if (!this.editableData.contacto.redes) this.editableData.contacto.redes = [];

    this.proyectosTechInputs = (this.editableData.proyectos || []).map(p => (p.tecnologias || []).join(', '));
    this.habilidadesItemsInputs = (this.editableData.habilidades || []).map(h => (h.items || []).join(', '));
    this.experienciaTechInputs = (this.editableData.experiencia || []).map(e => (e.tecnologias || []).join(', '));
    this.competenciasInput = (this.editableData.profile.competencias || []).join(', ');
  }

  setTab(tab: 'perfil' | 'habilidades' | 'proyectos' | 'experiencia' | 'contacto'): void {
    this.activeTab.set(tab);
  }

  // --- 01. PERFIL & HISTOS & ESTUDIOS ---
  addHito(): void {
    this.editableData.profile.hitos.push({ numero: 'Nuevo Hito', label: 'Descripción breve' });
  }

  removeHito(index: number): void {
    this.editableData.profile.hitos.splice(index, 1);
  }

  addEstudio(): void {
    this.editableData.profile.estudios.push({
      periodo: '2025 - Presente',
      titulo: 'Nueva Titulación / Estudio',
      institucion: 'Universidad / Instituto',
      descripcion: 'Descripción del plan de estudio o logro'
    });
  }

  removeEstudio(index: number): void {
    this.editableData.profile.estudios.splice(index, 1);
  }

  updateCompetencias(rawInput: string): void {
    this.competenciasInput = rawInput;
    this.editableData.profile.competencias = rawInput.split(',').map(c => c.trim()).filter(c => c.length > 0);
  }

  // --- 02. HABILIDADES ---
  addHabilidadCat(): void {
    this.editableData.habilidades.push({
      categoria: 'Nueva Categoría',
      items: ['Tecnología 1', 'Tecnología 2']
    });
    this.habilidadesItemsInputs.push('Tecnología 1, Tecnología 2');
  }

  removeHabilidadCat(index: number): void {
    this.editableData.habilidades.splice(index, 1);
    this.habilidadesItemsInputs.splice(index, 1);
  }

  updateHabilidadItems(index: number, rawInput: string): void {
    this.habilidadesItemsInputs[index] = rawInput;
    const items = rawInput.split(',').map(t => t.trim()).filter(t => t.length > 0);
    this.editableData.habilidades[index].items = items;
  }

  // --- 03. PROYECTOS ---
  addProyecto(): void {
    this.editableData.proyectos.unshift({
      titulo: 'Nuevo Proyecto',
      subtitulo: 'Subtítulo del proyecto',
      descripcion: 'Descripción detallada del proyecto...',
      tecnologias: ['Angular', 'TypeScript'],
      imagen: '',
      githubUrl: 'https://github.com/pincha1212',
      destacado: false
    });
    this.proyectosTechInputs.unshift('Angular, TypeScript');
  }

  removeProyecto(index: number): void {
    this.editableData.proyectos.splice(index, 1);
    this.proyectosTechInputs.splice(index, 1);
  }

  updateTechArray(index: number, rawInput: string): void {
    this.proyectosTechInputs[index] = rawInput;
    const techs = rawInput.split(',').map(t => t.trim()).filter(t => t.length > 0);
    this.editableData.proyectos[index].tecnologias = techs;
  }

  // --- 04. TRAYECTORIA ---
  addExperiencia(): void {
    this.editableData.experiencia.unshift({
      periodo: '2025 - Presente',
      rol: 'Nuevo Rol',
      empresa: 'Organización / Empresa',
      descripcion: 'Descripción de funciones y logros...',
      tecnologias: ['Angular', 'TypeScript']
    });
    this.experienciaTechInputs.unshift('Angular, TypeScript');
  }

  removeExperiencia(index: number): void {
    this.editableData.experiencia.splice(index, 1);
    this.experienciaTechInputs.splice(index, 1);
  }

  updateExpTechs(index: number, rawInput: string): void {
    this.experienciaTechInputs[index] = rawInput;
    const techs = rawInput.split(',').map(t => t.trim()).filter(t => t.length > 0);
    this.editableData.experiencia[index].tecnologias = techs;
  }

  // --- 05. CONTACTO & REDES SOCIALES ---
  addRedSocial(): void {
    if (!this.editableData.contacto.redes) {
      this.editableData.contacto.redes = [];
    }
    this.editableData.contacto.redes.push({
      nombre: 'Nueva Red / Enlace',
      url: 'https://',
      iconoUrl: '',
      iconoTexto: 'RS'
    });
  }

  removeRedSocial(index: number): void {
    this.editableData.contacto.redes.splice(index, 1);
  }

  saveSuccessToast = signal(false);

  // --- ACCIONES GENERALES ---
  async save(): Promise<void> {
    this.isSaving.set(true);
    await this.portfolioService.savePortfolio(this.editableData);
    this.isSaving.set(false);
    this.saveSuccessToast.set(true);
    setTimeout(() => {
      this.saveSuccessToast.set(false);
    }, 3500);
  }

  resetDefaults(): void {
    if (confirm('¿Restablecer todo el portafolio a los valores originales?')) {
      this.portfolioService.resetToDefaults();
      this.resetFormFromCurrentState();
    }
  }

  close(): void {
    this.portfolioService.closeEditor();
  }
}
