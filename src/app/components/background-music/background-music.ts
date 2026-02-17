import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  effect,
  HostListener,
  DestroyRef
} from '@angular/core';
import { YouTubePlayer } from '@angular/youtube-player';
import { BackgroundMusic as BackgroundMusicService } from '../../core/services/background-music';
import { timer } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
@Component({
  selector: 'app-background-music',
  standalone: true,
  imports: [YouTubePlayer],
  template: `
    <youtube-player
      [videoId]="videoId"
      [height]="1"
      [width]="1"
      [playerVars]="playerConfig"
      (ready)="onPlayerReady($event)"
      (stateChange)="onStateChange($event)"
      style="position:absolute; pointer-events:none; opacity:0;"
    />
  `
})
export class BackgroundMusic implements OnInit, OnDestroy {
  private readonly musicService = inject(BackgroundMusicService);
  private readonly destroyRef = inject(DestroyRef); 
  readonly videoId = 'jfKfPfyJRdk';
  readonly playerConfig = {
    autoplay: 0,
    controls: 0,
    loop: 1,
    playlist: 'jfKfPfyJRdk',
    disablekb: 1,
    fs: 0,
    rel: 0,
    modestbranding: 1,
    iv_load_policy: 3,
    cc_load_policy: 0,
    origin: window.location.origin
  };
  private readonly playerReady = signal(false);
  private readonly userInteracted = signal(false);
  constructor() {
    effect(() => {
      if (this.playerReady() && this.userInteracted()) {
        console.log('🎵 Both ready - starting music!');
        this.musicService.play();
      }
    });
  }
  @HostListener('document:click')
  @HostListener('document:keydown')
  @HostListener('document:touchstart')
  onFirstInteraction(): void {
    if (!this.userInteracted()) {
      this.userInteracted.set(true);
    }
  }
  @HostListener('document:visibilitychange')
  onVisibilityChange(): void {
    if (!document.hidden && this.musicService.isPlaying()) {
      timer(500)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.musicService.play());
    }
  }
  onPlayerReady(event: any): void {
    this.musicService.initPlayer(event.target);
    this.playerReady.set(true);
  }
  onStateChange(event: any): void {
    switch (event.data) {
      case 2:
        if (this.musicService.isPlaying() && !document.hidden) {
          timer(500) 
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.musicService.play());
        }
        break;
      case 0: 
        timer(2000) 
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(() => this.musicService.play());
        break;
      case 1: 
        this.musicService.isPlaying.set(true);
        break;
    }
  }
  ngOnInit(): void {}
  ngOnDestroy(): void {
    this.musicService.destroy();
  }
}