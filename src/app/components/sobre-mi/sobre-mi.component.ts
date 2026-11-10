import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortfolioDataService } from '../../services/portfolio-data.service';

@Component({
  selector: 'app-sobre-mi',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sobre-mi.component.html',
  styleUrls: ['./sobre-mi.component.css']
})
export class SobreMiComponent {
  portfolioService = inject(PortfolioDataService);

  get profile() {
    return this.portfolioService.profile();
  }

  get estudios() {
    return this.profile.estudios || [];
  }

  get competencias() {
    return this.profile.competencias || [];
  }

  get hitos() {
    return this.profile.hitos || [];
  }
}
