import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Speech } from '../../core/services/speech';
import { BackgroundMusic as BackgroundMusicService } from '../../core/services/background-music';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './settings.html',
  styleUrls: ['./settings.css']
})
export class SettingsComponent {
  private speechService = inject(Speech);
  private musicService = inject(BackgroundMusicService);

  isOpen = signal(false);
  autoSpeak = this.speechService.autoSpeak; 
  musicPlaying = this.musicService.isPlaying;

  toggle(): void {
    this.isOpen.update(v => !v);
  }

  toggleAutoSpeak(): void {
    this.speechService.toggleAutoSpeak();
  }

  toggleMusic(): void {
    if (this.musicPlaying()) {
      this.musicService.pause();
    } else {
      this.musicService.play();
    }
  }
}