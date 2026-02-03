import { Component, signal, computed, inject, OnInit, ViewChild, ElementRef, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chat } from '../../core/services/chat';
import { ChatMessage } from '../../core/models/chat';
import { Speech } from '../../core/services/speech';
import Swal from 'sweetalert2';
import { StreamParser } from '../../core/services/stream-parser';
import { Subscription } from 'rxjs';
@Component({
  selector: 'app-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './assistant.html',
  styleUrls: ['./assistant.css']
})
export class AssistantComponent implements OnInit, OnDestroy {
  @ViewChild('chatMessages') 
  private chatMessagesRef?: ElementRef<HTMLDivElement>;
  private chatService = inject(Chat);
  private speechService = inject(Speech); 
  private parser = inject(StreamParser);
  private parserSubscription?: Subscription; 
  
  // ========== SIGNALS ==========
  userInput = signal<string>('');
  autoSpeak = signal<boolean>(false);
  
  // ========== COMPUTED SIGNALS from Service ==========
  messages = this.chatService.visibleMessages;
  isLoading = this.chatService.isLoading;
  hasMessages = this.chatService.hasMessages;
  isSpeaking = this.speechService.isSpeaking; 

  constructor() {}
  
  ngOnInit() {
    this.initChat();
    this.parser.setMarkers([
      { start: '[LANG:', end: ']', singleUse: true }
    ]);
  }
  
  ngOnDestroy(): void {
    this.speechService.destroySpeechSession();
    this.parser.reset();
    this.parserSubscription?.unsubscribe();
  }
  
  private initChat(): void {
    const welcomeMessages = [
      'Hello! 👋 I\'m your AI assistant. How can I help you today?',
      'Hi there! 😊 What can I help you with?',
      'Hey! ✨ Ready to chat about your portfolio or projects?'
    ];
    
    const randomMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
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
    let languageSet = false;
    let unsupportedHandled = false;
    const sessionId = this.speechService.speechSessionId;
    this.parser.reset();
    this.parserSubscription?.unsubscribe();
    this.parserSubscription = this.parser.stream().subscribe(event => {
      console.log('🔵 Parser event:', event); 
      if (event.type === 'marker' && event.markerType === 'LANG' && !languageSet) {
        const lang = event.value;
        console.log(`🗣️ Detected language: ${lang}`);
        this.speechService.setLanguage(lang);
        languageSet = true;
      } else if (event.type === 'text') {
        console.log('📝 Parser emitted text, calling updateStreamingMessage');
        this.chatService.updateStreamingMessage(event.value);
        if (this.autoSpeak() && !unsupportedHandled) {
          this.speechService.addChunk(event.value);
        }
      }
    });

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
        // if (!languageSet) {
        //   const langMatch = chunk.match(/\[LANG:(\w+-?\w*)\]/);
        //   if (langMatch) {
        //     const lang = langMatch[1];
        //     console.log(`🗣️ Detected language early: ${lang}`);
        //     this.speechService.setLanguage(lang);
        //     languageSet = true;
        //   }
        // }
      
        // // Clean LANG marker from speech
        // const cleanChunk = chunk.replace(/\[LANG:\w+-?\w*\]/g, '');
        // if (this.autoSpeak()) {
        //   this.speechService.addChunk(cleanChunk);
        // }
      },
      (stats?: any, language?: string, languageUnsupported?: boolean) => {
        console.log('✅ Complete', stats);
        console.log('✅ language', language);
        console.log('✅ languageUnsupported', languageUnsupported);
        this.scrollToBottom();
        
        if (languageUnsupported&&unsupportedHandled) {
          console.warn('already set languageUnsupported!');
        }
        if (languageUnsupported&&!unsupportedHandled) {
          unsupportedHandled = true;
          console.warn('⚠️ Language not supported - disabling auto-speak');
          this.autoSpeak.set(false);
          this.speechService.stop();
          this.showUnsupportedLanguageAlert(language || 'unknown');
        }
        
        if (this.autoSpeak()) {
          this.speechService.finishStreaming();
        }
      },
      (error: any) => {
        this.speechService.stop(); 
        this.parserSubscription?.unsubscribe();
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
      confirmButtonColor: '#8b5cf6'
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
    this.autoSpeak.update(v => !v);
    if (!this.autoSpeak()) {
      this.speechService.stop();
    } else {
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