import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { PortfolioDataService } from '../../services/portfolio-data.service';

@Component({
  imports: [CommonModule],
  selector: 'app-habilidades',
  standalone: true,
  templateUrl: './habilidades.component.html',
  styleUrls: ['./habilidades.component.css'],
})
export class HabilidadesComponent {
  portfolioService = inject(PortfolioDataService);

  get habilidadesData() {
    return this.portfolioService.habilidades();
  }
}
