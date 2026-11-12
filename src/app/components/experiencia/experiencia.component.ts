import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortfolioDataService } from '../../services/portfolio-data.service';

@Component({
  selector: 'app-experiencia',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './experiencia.component.html',
  styleUrl: './experiencia.component.css'
})
export class ExperienciaComponent {
  portfolioService = inject(PortfolioDataService);

  get experienciasList() {
    return this.portfolioService.experiencia();
  }

  get extraData() {
    return this.portfolioService.trayectoriaExtra();
  }

  get estudiosList() {
    return this.portfolioService.profile().estudios || [];
  }
}
