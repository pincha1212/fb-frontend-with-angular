import { Injectable, signal } from '@angular/core';

export type AppTheme = 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  currentTheme = signal<AppTheme>('dark');

  constructor() {
    this.initTheme();
  }

  private initTheme(): void {
    if (typeof window === 'undefined') return;
    document.documentElement.setAttribute('data-theme', 'dark');
    document.body.classList.remove('theme-light');
    document.body.classList.add('theme-dark');
  }

  setTheme(): void {
    this.currentTheme.set('dark');
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.classList.remove('theme-light');
      document.body.classList.add('theme-dark');
    }
  }

  toggleTheme(): void {
    // Modo oscuro permanente
    this.setTheme();
  }
}
