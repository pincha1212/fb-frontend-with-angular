import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  signal,
  Input,
  Output,
  EventEmitter
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DockingStationInfo {
  id: string;
  sectionId: string;
  name: string;
  subtitle?: string;
  category?: string;
  icon: string;
  glowHex?: string;
  accentHex?: string;
  code?: string;
}

@Component({
  selector: 'app-docking-alert',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './docking-alert.component.html',
  styleUrls: ['./docking-alert.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DockingAlertComponent implements OnInit, OnDestroy {
  @Input() station: DockingStationInfo | null = null;
  @Input() isDocking = false;
  @Input() distanceMeters = 12.4;

  @Output() confirmDock = new EventEmitter<DockingStationInfo>();
  @Output() cancelDock = new EventEmitter<void>();

  // Internal reactive signals
  signalSyncPercent = signal(98.6);
  isCountdownActive = signal(false);
  countdownSec = signal(3);

  private timerId: any = null;
  private isDestroyed = false;

  ngOnInit(): void {
    if (this.station) {
      this.playChime([523, 659, 784]);
    }
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    if (this.timerId) {
      clearInterval(this.timerId);
    }
  }

  onInitiateDocking(): void {
    if (!this.station) return;
    this.isCountdownActive.set(true);
    this.countdownSec.set(3);
    this.playChime([600, 800, 1000]);

    this.timerId = setInterval(() => {
      const current = this.countdownSec();
      if (current > 1) {
        this.countdownSec.set(current - 1);
        this.playChime([700 + (4 - current) * 100]);
      } else {
        clearInterval(this.timerId);
        this.isCountdownActive.set(false);
        if (this.station) {
          this.confirmDock.emit(this.station);
        }
      }
    }, 600);
  }

  onDismiss(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
    this.isCountdownActive.set(false);
    this.cancelDock.emit();
  }

  private playChime(freqs: number[]): void {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, ctx.currentTime + i * 0.08);
        gain.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.08);
        osc.stop(ctx.currentTime + i * 0.08 + 0.32);
      });
    } catch {
      // safe
    }
  }
}
