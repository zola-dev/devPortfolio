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
import { UserInteraction } from '../../core/services/user-interaction';
import { Speech } from '../../core/services/speech';
@Component({
  selector: 'app-background-music',
  standalone: true,
  imports: [YouTubePlayer],
  templateUrl: './background-music.html',
  styleUrls: ['./background-music.css'],
})
export class BackgroundMusic implements OnInit, OnDestroy {
  private readonly musicService = inject(BackgroundMusicService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly userInteraction = inject(UserInteraction);
  private readonly speechService = inject(Speech);
  readonly videoId = 'jfKfPfyJRdk';
  readonly playerConfig = {
    autoplay: 1,
    controls: 0,
    loop: 1,
    playlist: 'jfKfPfyJRdk',
    disablekb: 1,
    fs: 0,
    rel: 0,
    modestbranding: 1,
    iv_load_policy: 3,
    cc_load_policy: 0,
  };
  private readonly playerReady = signal(false);
  constructor() {
    effect(() => {
      const ready = this.playerReady();
      const interacted = this.userInteraction.hasInteracted();
      if (ready && interacted) {
        this.musicService.play();
      }
    });
    effect(() => {
      if (this.speechService.isSpeaking()) {
        this.musicService.duck();
      } else {
        this.musicService.unduck();
      }
    });
  }

  @HostListener('document:visibilitychange')
  onVisibilityChange(): void {
    console.log(`[BackgroundMusic] Visibility changed - hidden: ${document.hidden}, isPlaying: ${this.musicService.isPlaying()}`);
    if (!document.hidden && this.musicService.isPlaying()) {
      console.log('[BackgroundMusic] Tab visible again, resuming playback...');
      timer(500)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          console.log('[BackgroundMusic] Calling play() after visibility restore');
          this.musicService.play();
        });
    }
  }

  onPlayerReady(event: any): void {
    console.log('[BackgroundMusic] YouTube player ready', event);
    this.musicService.initPlayer(event.target);
    this.playerReady.set(true);
  }

  onStateChange(event: any): void {
    const stateMap: Record<number, string> = {
      [-1]: 'UNSTARTED',
      [0]: 'ENDED',
      [1]: 'PLAYING',
      [2]: 'PAUSED',
      [3]: 'BUFFERING',
      [5]: 'CUED'
    };
    console.log(`[BackgroundMusic] State changed: ${stateMap[event.data] ?? 'UNKNOWN'} (${event.data})`);

    switch (event.data) {
      case 2:
        console.log(`[BackgroundMusic] Paused - isPlaying: ${this.musicService.isPlaying()}, hidden: ${document.hidden}`);
        if (this.musicService.isPlaying() && !document.hidden) {
          console.log('[BackgroundMusic] Paused unexpectedly, resuming in 500ms...');
          timer(500)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
              console.log('[BackgroundMusic] Calling play() after unexpected pause');
              this.musicService.play();
            });
        }
        break;
      case 0:
        console.log('[BackgroundMusic] Stream ended, restarting in 2s...');
        timer(2000)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(() => {
            console.log('[BackgroundMusic] Calling play() after stream end');
            this.musicService.play();
          });
        break;
      case 1:
        console.log('[BackgroundMusic] Playing!');
        break;  
      case 3:
        console.log('[BackgroundMusic] Buffering...');
        break;
    }
  }

  ngOnInit(): void {
    console.log('[BackgroundMusic] Component initialized');
  }

  ngOnDestroy(): void {
    console.log('[BackgroundMusic] Component destroyed');
    this.musicService.destroy();
  }
}