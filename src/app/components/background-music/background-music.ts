import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { YouTubePlayer } from '@angular/youtube-player';
import { BackgroundMusic as BackgroundMusicService } from '../../core/services/background-music';

@Component({
  selector: 'app-background-music',
  standalone: true,
  imports: [YouTubePlayer],
  template: `
    <!-- Skriveni YouTube player -->
    <youtube-player
      [videoId]="videoId"
      [height]="1"
      [width]="1"
      [playerVars]="playerConfig"
      (ready)="onPlayerReady($event)"
      style="display: none;"
    />
  `,
  styles: []
})

export class BackgroundMusic implements OnInit, OnDestroy {
  private musicService = inject(BackgroundMusicService);
  
  videoId = 'jfKfPfyJRdk'; // Lofi Girl stream
  
  playerConfig = {
    autoplay: 1,
    controls: 0,
    loop: 1,
    playlist: 'jfKfPfyJRdk', // Za loop mora biti isto kao videoId
    disablekb: 1, // Disable keyboard controls
    fs: 0, // No fullscreen button
    modestbranding: 1, // Minimal YouTube branding
    iv_load_policy: 3 // Hide video annotations
  };

  ngOnInit(): void {
    console.log('🎵 Background music component initialized');
  }

  onPlayerReady(event: any): void {
    console.log('🎵 YouTube player ready');
    this.musicService.initPlayer(event.target);
    this.musicService.play();
  }

  ngOnDestroy(): void {
    this.musicService.destroy();
  }
}