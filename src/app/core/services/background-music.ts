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
  private isPlayingSignal = signal<boolean>(false);
  private isDuckedSignal = signal<boolean>(false);

  readonly isPlaying = this.isPlayingSignal.asReadonly();
  readonly isDucked = this.isDuckedSignal.asReadonly();
  
  private config: MusicConfig = {
    videoId: 'jfKfPfyJRdk',
    normalVolume: 25, 
    duckingVolume: 5 
  };

  /**
   * Initializes the YouTube player
   * Call this when the player component is ready
   */
  initPlayer(playerInstance: any): void {
    this.player = playerInstance;
    this.playerReady.set(true);
    this.setVolume(this.config.normalVolume);
  }

  /**
   * Starts the music
   */
  play(): void {
    if (!this.player || !this.playerReady()) {
      console.warn('🎵 Player not ready yet');
      return;
    }
    
    this.player.playVideo();
    this.isPlayingSignal.set(true);
    console.log('🎵 Music started');
  }

  /**
   * Pauses the music
   */
  pause(): void {
    if (!this.player || !this.playerReady()) return;
    
    this.player.pauseVideo();
    this.isPlayingSignal.set(false);
    console.log('🎵 Music paused');
  }

  /**
   * Lowers the volume when AI starts speaking
   */
  duck(): void {
    if (!this.player || !this.playerReady()) return;
    
    this.isDuckedSignal.set(true);
    this.setVolume(this.config.duckingVolume);
    console.log(`🔉 Music ducked to ${this.config.duckingVolume}%`);
  }

  /**
   * Restores the volume to normal when AI finishes speaking
   */
  unduck(): void {
    if (!this.player || !this.playerReady()) return;
    
    this.isDuckedSignal.set(false);
    this.setVolume(this.config.normalVolume);
    console.log(`🔊 Music restored to ${this.config.normalVolume}%`);
  }

  /**
   * Sets the volume
   */
  private setVolume(volume: number): void {
    if (!this.player || !this.playerReady()) return;
    this.player.setVolume(volume);
  }

  /**
   * Changes the video (for different lofi streams)
   */
  changeVideo(videoId: string): void {
    this.config.videoId = videoId;
    if (this.player && this.playerReady()) {
      this.player.loadVideoById(videoId);
    }
  }

  /**
   * Updates the volume settings
   */
  updateVolumes(normal: number, ducking: number): void {
    this.config.normalVolume = normal;
    this.config.duckingVolume = ducking;
    
    if (this.isDuckedSignal()) {
      this.setVolume(ducking);
    } else {
      this.setVolume(normal);
    }
  }

  /**
   * Getter for config
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
    this.isPlayingSignal.set(false);
    this.isDuckedSignal.set(false);
  }
}
