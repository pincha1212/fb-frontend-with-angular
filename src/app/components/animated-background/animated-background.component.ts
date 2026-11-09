import {
  Component,
  ElementRef,
  OnInit,
  OnDestroy,
  ViewChild,
  HostListener,
  ChangeDetectionStrategy,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';

export type BackgroundThemeMode = 'nebula' | 'cybergrid' | 'particles';

export interface Particle3D {
  x: number;
  y: number;
  z: number;
  baseX: number;
  baseY: number;
  radius: number;
  color: string;
  alpha: number;
  speed: number;
  pulsePhase: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

@Component({
  selector: 'app-animated-background',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './animated-background.component.html',
  styleUrls: ['./animated-background.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AnimatedBackgroundComponent implements OnInit, OnDestroy {
  @ViewChild('bgCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  // Estado del tema de fondo reactivo
  currentMode = signal<BackgroundThemeMode>('nebula');
  isPaused = signal<boolean>(false);
  showControls = signal<boolean>(false);

  private ctx: CanvasRenderingContext2D | null = null;
  private animationFrameId: number | null = null;
  private particles: Particle3D[] = [];
  private prismVertices: Point3D[] = [];
  private prismEdges: [number, number][] = [];

  // Variables de scroll suave (interpolación lerp estilo video-scroll)
  private currentScroll = 0;
  private targetScroll = 0;
  private maxScroll = 1000;
  private scrollVelocity = 0;
  private lastScrollY = 0;

  // Parallax del ratón
  private mouseX = 0;
  private mouseY = 0;
  private targetMouseX = 0;
  private targetMouseY = 0;

  // Reloj interno de simulación
  private time = 0;
  private lastTimestamp = 0;

  ngOnInit(): void {
    this.initPrismGeometry();
    this.initCanvas();
    this.initParticles(160);
    this.updateScrollBounds();
    this.startAnimationLoop();
  }

  ngOnDestroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  setMode(mode: BackgroundThemeMode): void {
    this.currentMode.set(mode);
    if (mode === 'cybergrid') {
      this.initParticles(90);
    } else if (mode === 'particles') {
      this.initParticles(240);
    } else {
      this.initParticles(160);
    }
  }

  togglePause(): void {
    this.isPaused.update(val => !val);
  }

  toggleControls(): void {
    this.showControls.update(val => !val);
  }

  // Mapeo de marcas de tiempo (Video Timestamps) por sección de contenido
  readonly sectionTimestamps: Record<string, { time: number; progressRatio: number; label: string }> = {
    'hero': { time: 0.0, progressRatio: 0.0, label: '00:00.0 - Hero Prism Stage' },
    'sobre-mi': { time: 3.5, progressRatio: 0.2, label: '00:03.5 - Bio & Formación Stage' },
    'habilidades': { time: 7.0, progressRatio: 0.4, label: '00:07.0 - Skills Cyber Stage' },
    'proyectos': { time: 10.5, progressRatio: 0.6, label: '00:10.5 - Proyectos Grid Stage' },
    'experiencia': { time: 14.0, progressRatio: 0.8, label: '00:14.0 - Trayectoria Stage' },
    'contacto': { time: 17.5, progressRatio: 1.0, label: '00:17.5 - Contacto & Audit Stage' }
  };

  activeSectionId = signal<string>('hero');
  currentTimestampText = signal<string>('00:00.0 - Hero Prism Stage');

  @HostListener('window:resize')
  onResize(): void {
    this.resizeCanvas();
    this.updateScrollBounds();
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.targetScroll = window.scrollY || document.documentElement.scrollTop || 0;
    const currentY = window.scrollY;
    this.scrollVelocity = Math.min(Math.abs(currentY - this.lastScrollY) * 0.1, 15);
    this.lastScrollY = currentY;
    this.syncActiveSectionFromScroll();
  }

  @HostListener('window:seek-bg-section', ['$event'])
  onSeekBgSection(event: Event): void {
    const customEvent = event as CustomEvent<{ sectionId: string }>;
    if (customEvent.detail?.sectionId) {
      this.seekToSectionTimestamp(customEvent.detail.sectionId);
    }
  }

  // Método público para buscar la marca de tiempo (seek) al hacer clic en nav links
  seekToSectionTimestamp(sectionId: string): void {
    const config = this.sectionTimestamps[sectionId];
    if (config) {
      this.activeSectionId.set(sectionId);
      this.currentTimestampText.set(config.label);
      this.time = config.time; // Ajuste inmediato de la marca de tiempo

      const targetEl = document.getElementById(sectionId);
      if (targetEl) {
        this.targetScroll = targetEl.offsetTop;
      }
    }
  }

  private syncActiveSectionFromScroll(): void {
    const scrollProgress = Math.min(Math.max(this.currentScroll / this.maxScroll, 0), 1);
    if (scrollProgress < 0.15) {
      this.updateActiveSection('hero');
    } else if (scrollProgress < 0.35) {
      this.updateActiveSection('sobre-mi');
    } else if (scrollProgress < 0.55) {
      this.updateActiveSection('habilidades');
    } else if (scrollProgress < 0.75) {
      this.updateActiveSection('proyectos');
    } else if (scrollProgress < 0.90) {
      this.updateActiveSection('experiencia');
    } else {
      this.updateActiveSection('contacto');
    }
  }

  private updateActiveSection(id: string): void {
    if (this.activeSectionId() !== id) {
      this.activeSectionId.set(id);
      const config = this.sectionTimestamps[id];
      if (config) {
        this.currentTimestampText.set(config.label);
      }
    }
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    const halfWidth = window.innerWidth / 2;
    const halfHeight = window.innerHeight / 2;
    this.targetMouseX = (event.clientX - halfWidth) / halfWidth;
    this.targetMouseY = (event.clientY - halfHeight) / halfHeight;
  }

  private initCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.resizeCanvas();
  }

  private resizeCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    if (this.ctx) {
      this.ctx.resetTransform?.();
      this.ctx.scale(dpr, dpr);
    }
  }

  private updateScrollBounds(): void {
    const docHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
    const winHeight = window.innerHeight;
    this.maxScroll = Math.max(docHeight - winHeight, 1);
  }

  // Geometría 3D de pirámide / prisma de Angular para el Hero
  private initPrismGeometry(): void {
    // Cristal poliédrico Angular (pirámide de base triangular con núcleo)
    this.prismVertices = [
      { x: 0, y: -130, z: 0 },       // Vértice superior
      { x: -90, y: 70, z: -55 },     // Base izquierda
      { x: 90, y: 70, z: -55 },      // Base derecha
      { x: 0, y: 80, z: 85 },        // Base frontal
      { x: 0, y: 15, z: 0 }          // Núcleo energético central
    ];

    this.prismEdges = [
      [0, 1], [0, 2], [0, 3],        // Aristas superiores
      [1, 2], [2, 3], [3, 1],        // Aristas de la base
      [4, 0], [4, 1], [4, 2], [4, 3] // Aristas al núcleo
    ];
  }

  private initParticles(count: number): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const colors = ['#4ecdc4', '#dd1b16', '#ffbe0b', '#7b2cbf', '#00f5d4', '#ffffff'];
    
    this.particles = [];
    for (let i = 0; i < count; i++) {
      const baseX = (Math.random() - 0.5) * width * 1.6;
      const baseY = (Math.random() - 0.5) * height * 1.6;
      const z = Math.random() * 800 + 50;

      this.particles.push({
        x: baseX,
        y: baseY,
        z,
        baseX,
        baseY,
        radius: Math.random() * 2 + 0.8,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.7 + 0.3,
        speed: Math.random() * 0.8 + 0.4,
        pulsePhase: Math.random() * Math.PI * 2
      });
    }
  }

  private startAnimationLoop(): void {
    const render = (timestamp: number) => {
      if (!this.lastTimestamp) this.lastTimestamp = timestamp;
      const delta = Math.min((timestamp - this.lastTimestamp) / 1000, 0.1);
      this.lastTimestamp = timestamp;

      if (!this.isPaused()) {
        this.time += delta;
        // Interpolación suave del scroll (lerp exponencial)
        this.currentScroll += (this.targetScroll - this.currentScroll) * 0.08;
        // Interpolación suave del ratón
        this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;
        this.mouseY += (this.targetMouseY - this.mouseY) * 0.05;
        // Atenuación de velocidad de scroll
        this.scrollVelocity *= 0.92;

        this.renderScene();
      }

      this.animationFrameId = requestAnimationFrame(render);
    };

    this.animationFrameId = requestAnimationFrame(render);
  }

  private renderScene(): void {
    if (!this.ctx) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const scrollProgress = Math.min(Math.max(this.currentScroll / this.maxScroll, 0), 1);

    // 1. Fondo dinámico de gradiente atmosférico
    this.renderAtmosphereGradient(width, height, scrollProgress);

    // 2. Ondas luminosas tipo Aurora boreal cinemática
    this.renderAuroraRibbons(width, height, scrollProgress);

    // 3. Render según el modo visual seleccionado
    const mode = this.currentMode();
    if (mode === 'cybergrid') {
      this.renderCyberGrid(width, height, scrollProgress);
    }

    // 4. Campo de partículas 3D con efecto túnel / vuelo cinemático según scroll
    this.renderParticles3D(width, height, scrollProgress);

    // 5. En el Hero (sección inicial), proyectar el prisma Angular en 3D
    if (scrollProgress < 0.35 && mode !== 'cybergrid') {
      this.renderAngularPrism(width, height, scrollProgress);
    }
  }

  private renderAtmosphereGradient(width: number, height: number, progress: number): void {
    if (!this.ctx) return;

    let c1: string, c2: string, c3: string;

    if (progress < 0.25) {
      const t = progress / 0.25;
      c1 = this.interpolateColor('#0a0414', '#04101e', t);
      c2 = this.interpolateColor('#1a0826', '#092138', t);
      c3 = this.interpolateColor('#3b0d1a', '#0d3b45', t);
    } else if (progress < 0.5) {
        const t = (progress - 0.25) / 0.25;
        c1 = this.interpolateColor('#04101e', '#0c071d', t);
        c2 = this.interpolateColor('#092138', '#1a0d3b', t);
        c3 = this.interpolateColor('#0d3b45', '#351247', t);
      } else if (progress < 0.75) {
        const t = (progress - 0.5) / 0.25;
        c1 = this.interpolateColor('#0c071d', '#14060e', t);
        c2 = this.interpolateColor('#1a0d3b', '#280c1d', t);
        c3 = this.interpolateColor('#351247', '#4a1523', t);
      } else {
        const t = (progress - 0.75) / 0.25;
        c1 = this.interpolateColor('#14060e', '#031416', t);
        c2 = this.interpolateColor('#280c1d', '#072429', t);
        c3 = this.interpolateColor('#4a1523', '#0e4147', t);
      }

    const grad = this.ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, c1);
    grad.addColorStop(0.5, c2);
    grad.addColorStop(1, c3);

    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, width, height);

    // Glow radial dinámico reactivo al ratón y scroll
    const glowX = width * 0.5 + this.mouseX * 120;
    const glowY = height * 0.4 + this.mouseY * 80 + Math.sin(this.time * 0.7) * 30;
    const radialGrad = this.ctx.createRadialGradient(glowX, glowY, 50, glowX, glowY, width * 0.75);
    
    const glowAlpha = 0.22 + Math.sin(this.time * 1.5) * 0.05;
    radialGrad.addColorStop(0, `rgba(221, 27, 22, ${glowAlpha * (1 - progress * 0.4)})`);
    radialGrad.addColorStop(0.5, `rgba(78, 205, 196, ${glowAlpha * 0.6})`);
    radialGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    this.ctx.fillStyle = radialGrad;
    this.ctx.fillRect(0, 0, width, height);
  }

  private renderAuroraRibbons(width: number, height: number, progress: number): void {
    if (!this.ctx) return;
    const ctx = this.ctx;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Dibujar 3 capas de ondas armónicas luminosas superpuestas
    const layers = [
      { color: 'rgba(78, 205, 196, 0.12)', freq: 0.002, speed: 0.8, amp: 70, yOffset: height * 0.45 },
      { color: 'rgba(221, 27, 22, 0.09)', freq: 0.003, speed: -0.6, amp: 85, yOffset: height * 0.55 },
      { color: 'rgba(123, 44, 191, 0.10)', freq: 0.0015, speed: 1.1, amp: 95, yOffset: height * 0.65 }
    ];

    layers.forEach(layer => {
      ctx.beginPath();
      ctx.moveTo(0, height);

      for (let x = 0; x <= width; x += 15) {
        const scrollWarp = Math.sin(progress * Math.PI * 2 + x * 0.001) * 30;
        const wave = Math.sin(x * layer.freq + this.time * layer.speed) * layer.amp
                   + Math.cos(x * layer.freq * 0.5 - this.time * 0.4) * (layer.amp * 0.5);
        const y = layer.yOffset + wave + scrollWarp + (this.mouseY * 40);
        ctx.lineTo(x, y);
      }

      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fillStyle = layer.color;
      ctx.fill();
    });

    ctx.restore();
  }

  private renderCyberGrid(width: number, height: number, progress: number): void {
    if (!this.ctx) return;
    const ctx = this.ctx;

    ctx.save();
    ctx.strokeStyle = 'rgba(78, 205, 196, 0.16)';
    ctx.lineWidth = 1;

    const horizon = height * 0.52;
    const fov = 300;
    const gridSpeed = (this.time * 60 + this.currentScroll * 0.5) % 50;

    // Líneas horizontales de perspectiva
    for (let z = 20 + gridSpeed; z < 800; z += 45) {
      const y = horizon + (fov / z) * (height * 0.4);
      if (y > height) continue;
      const alpha = Math.min((y - horizon) / (height - horizon), 1) * 0.35;
      ctx.strokeStyle = `rgba(78, 205, 196, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Líneas longitudinales hacia el punto de fuga
    const vanishingX = width * 0.5 + this.mouseX * 80;
    for (let x = -width; x <= width * 2; x += 90) {
      ctx.beginPath();
      ctx.moveTo(vanishingX, horizon);
      ctx.lineTo(x, height);
      ctx.strokeStyle = 'rgba(123, 44, 191, 0.22)';
      ctx.stroke();
    }

    ctx.restore();
  }

  private renderParticles3D(width: number, height: number, progress: number): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const centerX = width / 2 + this.mouseX * 70;
    const centerY = height / 2 + this.mouseY * 40;
    const fov = 400;

    // Velocidad de avance reactiva al scroll: volar a través de las partículas
    const flySpeed = 1.2 + this.scrollVelocity * 0.8;

    for (const p of this.particles) {
      p.z -= p.speed * flySpeed;
      if (p.z <= 10) {
        p.z = 800;
        p.x = (Math.random() - 0.5) * width * 1.5;
        p.y = (Math.random() - 0.5) * height * 1.5;
      }

      // Proyección en perspectiva 3D
      const scale = fov / p.z;
      const screenX = centerX + p.x * scale;
      const screenY = centerY + p.y * scale;

      if (screenX < -20 || screenX > width + 20 || screenY < -20 || screenY > height + 20) {
        continue;
      }

      const pulse = Math.sin(this.time * 2 + p.pulsePhase) * 0.2 + 0.8;
      const radius = Math.max(p.radius * scale * pulse, 0.5);
      const alpha = Math.min(Math.max((1 - p.z / 800) * p.alpha, 0.05), 0.95);

      ctx.save();
      ctx.beginPath();
      ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.shadowBlur = radius * 3;
      ctx.shadowColor = p.color;
      ctx.fill();
      ctx.restore();
    }
  }

  private renderAngularPrism(width: number, height: number, progress: number): void {
    if (!this.ctx) return;
    const ctx = this.ctx;

    // Desvanecer el prisma a medida que salimos de la cabecera
    const opacity = Math.max(1 - (progress / 0.28), 0);
    if (opacity <= 0.01) return;

    ctx.save();
    ctx.globalAlpha = opacity;

    // Centro focal del prisma 3D con reacción suave al ratón
    const cx = width * 0.5 + this.mouseX * 65;
    const cy = height * 0.58 + this.mouseY * 40;

    // Rotación suave continua + rotación directa según scroll
    const rotY = this.time * 0.55 + this.currentScroll * 0.003;
    const rotX = Math.sin(this.time * 0.35) * 0.18 + (this.mouseY * 0.25);

    // Matriz de proyección 3D con rotación Y y X
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const cosX = Math.cos(rotX);
    const sinX = Math.sin(rotX);

    const projected = this.prismVertices.map(v => {
      // Rotar alrededor de Y
      const x1 = v.x * cosY + v.z * sinY;
      const z1 = -v.x * sinY + v.z * cosY;
      // Rotar alrededor de X
      const y2 = v.y * cosX - z1 * sinX;
      const z2 = v.y * sinX + z1 * cosX;

      const fov = 350;
      const scale = fov / (fov + z2);
      return {
        x: cx + x1 * scale,
        y: cy + y2 * scale,
        z: z2
      };
    });

    // 1. Anillos orbitales de energía giratorios alrededor de la pirámide
    ctx.save();
    ctx.lineWidth = 1.2;
    for (let r = 0; r < 3; r++) {
      const ringRadiusX = 140 + r * 35;
      const ringRadiusY = 45 + r * 12;
      const ringAngle = this.time * (0.8 + r * 0.3) + (r * Math.PI / 1.5);
      
      ctx.beginPath();
      ctx.ellipse(cx, cy + 20, ringRadiusX, ringRadiusY, ringAngle, 0, Math.PI * 2);
      ctx.strokeStyle = r === 0 ? 'rgba(78, 205, 196, 0.45)' : r === 1 ? 'rgba(221, 27, 22, 0.35)' : 'rgba(255, 255, 255, 0.25)';
      ctx.shadowBlur = 10;
      ctx.shadowColor = r === 0 ? '#4ecdc4' : '#dd1b16';
      ctx.stroke();
    }
    ctx.restore();

    // 2. Dibujar resplandor interior del núcleo energético
    const core = projected[4];
    const corePulse = Math.sin(this.time * 3.5) * 0.25 + 0.85;
    const coreGrad = ctx.createRadialGradient(core.x, core.y, 8, core.x, core.y, 110 * corePulse);
    coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    coreGrad.addColorStop(0.25, 'rgba(221, 27, 22, 0.8)');
    coreGrad.addColorStop(0.65, 'rgba(78, 205, 196, 0.4)');
    coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(core.x, core.y, 110 * corePulse, 0, Math.PI * 2);
    ctx.fill();

    // 3. Dibujar caras cristalinas transparentes con refracción holográfica
    const faces = [
      [0, 1, 2], [0, 2, 3], [0, 3, 1], [1, 2, 3]
    ];

    faces.forEach((face, idx) => {
      const p0 = projected[face[0]];
      const p1 = projected[face[1]];
      const p2 = projected[face[2]];

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.closePath();

      const faceAlpha = 0.12 + (idx % 2 === 0 ? 0.08 : 0);
      ctx.fillStyle = idx === 0 ? `rgba(221, 27, 22, ${faceAlpha * 1.6})` : `rgba(78, 205, 196, ${faceAlpha * 1.3})`;
      ctx.fill();

      // Líneas de malla holográfica internas en las caras
      ctx.beginPath();
      ctx.moveTo((p0.x + p1.x) / 2, (p0.y + p1.y) / 2);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // 4. Dibujar aristas con trazo de energía de neón
    ctx.lineWidth = 2.2;
    this.prismEdges.forEach(([i, j]) => {
      const p1 = projected[i];
      const p2 = projected[j];

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);

      const isCore = i === 4 || j === 4;
      ctx.strokeStyle = isCore ? 'rgba(78, 205, 196, 0.95)' : 'rgba(255, 255, 255, 0.75)';
      ctx.shadowBlur = 15;
      ctx.shadowColor = isCore ? '#4ecdc4' : '#dd1b16';
      ctx.stroke();
    });

    // 5. Partículas de chispa de energía radiando desde el núcleo
    ctx.save();
    for (let s = 0; s < 12; s++) {
      const sparkAngle = this.time * 2 + (s * Math.PI / 6);
      const sparkDist = 30 + Math.sin(this.time * 4 + s) * 25;
      const sx = core.x + Math.cos(sparkAngle) * sparkDist;
      const sy = core.y + Math.sin(sparkAngle) * sparkDist;
      const sRadius = (s % 2 === 0 ? 2.5 : 1.5);

      ctx.beginPath();
      ctx.arc(sx, sy, sRadius, 0, Math.PI * 2);
      ctx.fillStyle = s % 3 === 0 ? '#4ecdc4' : s % 3 === 1 ? '#ffbe0b' : '#ffffff';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#4ecdc4';
      ctx.fill();
    }
    ctx.restore();

    // 6. Emblema "A" de Angular estilizado flotando en el centro
    ctx.save();
    ctx.font = 'bold 40px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#4ecdc4';
    ctx.shadowBlur = 20;
    ctx.fillText('A', core.x, core.y);
    ctx.restore();

    ctx.restore();
  }

  // Interpolación lineal de color hexadecimal
  private interpolateColor(color1: string, color2: string, factor: number): string {
    const c1 = this.parseHex(color1);
    const c2 = this.parseHex(color2);
    const r = Math.round(c1.r + factor * (c2.r - c1.r));
    const g = Math.round(c1.g + factor * (c2.g - c1.g));
    const b = Math.round(c1.b + factor * (c2.b - c1.b));
    return `rgb(${r}, ${g}, ${b})`;
  }

  private parseHex(hex: string): { r: number; g: number; b: number } {
    let clean = hex.replace('#', '');
    if (clean.length === 3) {
      clean = clean.split('').map(c => c + c).join('');
    }
    const num = parseInt(clean, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }
}
