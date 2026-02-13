import { Injectable, signal } from '@angular/core';
export interface MusicConfig {
  videoId: string;
  normalVolume: number; // 0-100
  duckingVolume: number; // 0-100 (volume when speech is active)
}
@Injectable({
  providedIn: 'root'
})
export class BackgroundMusic {
  private player: any = null;
  private playerReady = signal<boolean>(false);
  
  isPlaying = signal<boolean>(false);
  isDucked = signal<boolean>(false);
  
  private config: MusicConfig = {
    videoId: 'jfKfPfyJRdk',
    normalVolume: 25, 
    duckingVolume: 5 
  };

  constructor() {}

  /**
   * Inicijalizuje YouTube player
   * Pozovi ovo kada je player komponenta spremna
   */
  initPlayer(playerInstance: any): void {
    this.player = playerInstance;
    this.playerReady.set(true);
    this.setVolume(this.config.normalVolume);
  }

  /**
   * Pokreće muziku
   */
  play(): void {
    if (!this.player || !this.playerReady()) {
      console.warn('🎵 Player not ready yet');
      return;
    }
    
    this.player.playVideo();
    this.isPlaying.set(true);
    console.log('🎵 Music started');
  }

  /**
   * Pauzira muziku
   */
  pause(): void {
    if (!this.player || !this.playerReady()) return;
    
    this.player.pauseVideo();
    this.isPlaying.set(false);
    console.log('🎵 Music paused');
  }

  /**
   * Smanjuje zvuk kada AI počne da priča
   */
  duck(): void {
    if (!this.player || !this.playerReady()) return;
    
    this.isDucked.set(true);
    this.setVolume(this.config.duckingVolume);
    console.log(`🔉 Music ducked to ${this.config.duckingVolume}%`);
  }

  /**
   * Vraća zvuk na normalnu jačinu kada AI završi
   */
  unduck(): void {
    if (!this.player || !this.playerReady()) return;
    
    this.isDucked.set(false);
    this.setVolume(this.config.normalVolume);
    console.log(`🔊 Music restored to ${this.config.normalVolume}%`);
  }

  /**
   * Postavlja jačinu zvuka
   */
  private setVolume(volume: number): void {
    if (!this.player || !this.playerReady()) return;
    this.player.setVolume(volume);
  }

  /**
   * Menja video (za različite lofi stream-ove)
   */
  changeVideo(videoId: string): void {
    this.config.videoId = videoId;
    if (this.player && this.playerReady()) {
      this.player.loadVideoById(videoId);
    }
  }

  /**
   * Ažurira podešavanja jačine zvuka
   */
  updateVolumes(normal: number, ducking: number): void {
    this.config.normalVolume = normal;
    this.config.duckingVolume = ducking;
    
    if (this.isDucked()) {
      this.setVolume(ducking);
    } else {
      this.setVolume(normal);
    }
  }

  /**
   * Getter za config
   */
  getConfig(): MusicConfig {
    return { ...this.config };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.pause();
    this.player = null;
    this.playerReady.set(false);
  }
}