import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-scroll-indicator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './scrollbar-indicator.component.html',
  styleUrl: './scrollbar-indicator.component.css'
})
export class ScrollbarIndicatorComponent implements OnInit {
  showUpArrows = false;
  showDownArrows = true;
  mouseState: 'top' | 'middle' | 'bottom' = 'top';

  ngOnInit() {
    this.checkScroll();
    window.addEventListener('scroll', () => this.checkScroll());
  }

  private checkScroll() {
    // Verificar flechas superiores
    this.showUpArrows = window.scrollY > 100;

    // Verificar flechas inferiores
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollPosition = window.scrollY + windowHeight;
    this.showDownArrows = scrollPosition < (documentHeight - 50);

    // Estado del mouse
    if (window.scrollY < 100) {
      this.mouseState = 'top';
    } else if (scrollPosition >= (documentHeight - 50)) {
      this.mouseState = 'bottom';
    } else {
      this.mouseState = 'middle';
    }
  }
}
