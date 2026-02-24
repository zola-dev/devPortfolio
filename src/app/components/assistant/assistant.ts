import {
  Component,
  signal,
  inject,
  OnInit,
  ViewChild,
  ElementRef,
  HostListener,
  OnDestroy,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chat } from '../../core/services/chat';
import { ChatMessage } from '../../core/models/chat';
import { Speech } from '../../core/services/speech';
import Swal from 'sweetalert2';
import { StreamParser } from '../../core/services/stream-parser';
import { BackgroundMusic as BackgroundMusicService } from '../../core/services/background-music';
import { BackgroundMusic } from '../background-music/background-music';
import { VersionDisplay } from '../version-display/version-display';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { UserInteraction } from '../../core/services/user-interaction';
@Component({
  selector: 'app-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule, BackgroundMusic, VersionDisplay],
  templateUrl: './assistant.html',
  styleUrls: ['./assistant.css'],
})
export class AssistantComponent implements OnInit, OnDestroy {
  @ViewChild('chatMessages')
  private chatMessagesRef?: ElementRef<HTMLDivElement>;
  private chatService = inject(Chat);
  private speechService = inject(Speech);
  private parser = inject(StreamParser);
  private backgroundMusicService = inject(BackgroundMusicService);
  private userInteraction = inject(UserInteraction);
  private currentMessageState = signal<{
    languageSet: boolean;
    unsupportedHandled: boolean;
  }>({
    languageSet: false,
    unsupportedHandled: false,
  });
  private destroyRef = inject(DestroyRef);
  userInput = signal<string>('');
  autoSpeak = signal<boolean>(false);
  messages = this.chatService.visibleMessages;
  isLoading = this.chatService.isLoading;
  hasMessages = this.chatService.hasMessages;
  isSpeaking = this.speechService.isSpeaking;
  musicPlaying = this.backgroundMusicService.isPlaying;
  musicDucked = this.backgroundMusicService.isDucked;
  constructor() {
    effect(() => {
      const speaking = this.isSpeaking();
      if (speaking) {
        this.backgroundMusicService.duck(); 
      } else {
        this.backgroundMusicService.unduck();
      }
    });
    effect(() => {
      if (this.userInteraction.hasInteracted()) {
        this.autoSpeak.set(true);
        this.speechService.initSpeechSession();
      }
    });
  }
  ngOnInit() {
    this.initChat();
    this.parser.setMarkers([{ start: '[LANG:', end: ']', singleUse: true }]);
    this.parser
      .stream()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        if (event.type === 'marker' && event.markerType === 'LANG') {
          if (!this.currentMessageState().languageSet) {
            const lang = event.value;
            this.speechService.setLanguage(lang);
            this.currentMessageState.update((s) => ({ ...s, languageSet: true }));
          }
        } else if (event.type === 'text') {
          this.chatService.updateStreamingMessage(event.value);
          if (this.autoSpeak() && !this.currentMessageState().unsupportedHandled) {
            this.speechService.addChunk(event.value);
          }
        }
      });
  }
  ngOnDestroy(): void {
    this.speechService.destroySpeechSession();
    this.parser.reset();
  }
  private initChat(): void {
    const WELCOME_MESSAGES = [
      "Hi 👋 I'm Milos Lazovic's AI assistant. I can walk you through his projects, skills, experience, education. What would you like to explore?",
      "Welcome! I'm Milos Lazovic's AI assistant. 📋 Ask me about Milos's projects, tech stack, work history.",
      "Hey there! I'm Milos Lazovic's AI assistant. 😊 I'm here to guide you through Milos's projects, skills, experience, and education. What would you like to check out first?",
      "Hello! I'm Milos Lazovic's AI assistant. ✨ Curious about Milos's work? I can show you his projects, tech stack, experience, or education background.",
      "Welcome aboard 👋 I'm Milos Lazovic's AI assistant. Ask me anything about Milos's projects, technologies, professional experience, or education.",
      "Hi! I'm Milos Lazovic's AI assistant. 💼 I can help you explore Milos's portfolio — from projects and skills to experience and education.",
      "Hey! I'm Milos Lazovic's AI assistant. 🚀 Want a quick overview of Milos's projects, tech stack, or career journey? Just ask!",
      "Hello and welcome 🙂 I'm Milos Lazovic's AI assistant. I'm your guide to Milos's work, skills, and professional background. What would you like to learn more about?",
      "Hi there! I'm Milos Lazovic's AI assistant. 📋 I can walk you through Milos's projects, frontend and backend skills, experience timeline, or education details.",
      "Nice to meet you 👋 I'm Milos Lazovic's AI assistant. Ask me about Milos's portfolio, technologies he uses, or his experience and education — I'm happy to help!"
    ] as const satisfies readonly string[];
    const randomMessage = WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)];
    this.chatService.addMessage('assistant', randomMessage);
    if (this.autoSpeak()) {
      this.speechService.speak(randomMessage);
    }
  }
  sendMessage(): void {
    const message = this.userInput().trim();
    if (!message || this.isLoading()) return;
    this.userInput.set('');
    this.speechService.stop();
    if (this.autoSpeak()) {
      this.speechService.startStreaming();
    }
    const sessionId = this.speechService.speechSessionId;
    this.currentMessageState.set({
      languageSet: false,
      unsupportedHandled: false,
    });
    this.parser.reset();
    this.chatService.sendMessageStream(
      message,
      '',
      () => {
        this.scrollToBottom();
      },
      (chunk: string) => {
        console.log('📦 Chunk received:', JSON.stringify(chunk));
        this.scrollToBottom();
        this.parser.feed(chunk);
      },
      (stats?: any, language?: string, languageUnsupported?: boolean) => {
        console.log('✅ Complete', stats);
        this.scrollToBottom();
        if (languageUnsupported && !this.currentMessageState().unsupportedHandled) {
          this.currentMessageState.update((s) => ({ ...s, unsupportedHandled: true }));
          console.warn('⚠️ Language not supported - disabling auto-speak');
          this.autoSpeak.set(false);
          this.speechService.stop();
          this.showUnsupportedLanguageAlert(language || 'unknown');
          this.speechService.updateSpeechSessionLanguages();
        }
        if (this.autoSpeak()) {
          this.speechService.finishStreaming();
        }
      },
      (error: any) => {
        this.speechService.stop();
        this.parser.reset();
        console.error('❌ Error:', error);
      },
      sessionId
    );
  }
  private showUnsupportedLanguageAlert(lang: string): void {
    Swal.fire({
      icon: 'warning',
      title: 'Speech Not Available',
      html: `
        <p>Your browser doesn't support text-to-speech for <strong>${lang}</strong>.</p>
        <p>Auto-speak has been disabled.</p>
      `,
      confirmButtonText: 'Got it',
      confirmButtonColor: '#8b5cf6',
    });
  }
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
  private scrollToBottom(): void {
    const el = this.chatMessagesRef?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }
  resetChat(): void {
    this.chatService.reset();
    this.userInput.set('');
    this.speechService.stop();
    this.initChat();
  }
  toggleAutoSpeak(): void {
    this.autoSpeak.update((v) => !v);
    if (!this.autoSpeak()) {
      this.speechService.stop();
    } else if (this.userInteraction.hasInteracted()) {
      this.speechService.initSpeechSession();
    }
  }
  speakMessage(message: ChatMessage): void {
    if (this.isSpeaking()) {
      this.speechService.stop();
    } else {
      this.speechService.speak(message.content);
    }
  }
  trackByMessageId(index: number, message: ChatMessage): string {
    return message.id;
  }
  @HostListener('window:pagehide')
  @HostListener('document:visibilitychange')
  handleStopOnHide(): void {
    this.speechService.stop();
  }
}
