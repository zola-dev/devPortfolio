import { Component, signal, computed, inject, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chat } from '../../core/services/chat';
import { ChatMessage } from '../../core/models/chat';
import { Speech } from '../../core/services/speech'; // ← NOVO

@Component({
  selector: 'app-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './assistant.html',
  styleUrls: ['./assistant.css']
})
export class AssistantComponent implements OnInit {
  @ViewChild('chatMessages') 
  private chatMessagesRef?: ElementRef<HTMLDivElement>;
  private chatService = inject(Chat);
  private speechService = inject(Speech); 
  // ========== SIGNALS ==========
  userInput = signal<string>('');
  autoSpeak = signal<boolean>(false);

  
  // ========== COMPUTED SIGNALS from Service ==========
  messages = this.chatService.visibleMessages;
  isLoading = this.chatService.isLoading;
  hasMessages = this.chatService.hasMessages;
  isSpeaking = this.speechService.isSpeaking; 

  constructor() {
  }
  ngOnInit() {
    this.initChat();
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
      this.speechService.speak(randomMessage)
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

    // Always streaming - no conditional logic needed
    let languageSet = false;
    this.chatService.sendMessageStream(
      message,
      '',
      () => {
        this.scrollToBottom(); 
      },
      (chunk: string) => {     
        this.scrollToBottom(); 
        if (!languageSet) {
          const langMatch = chunk.match(/\[LANG:(\w+-?\w*)\]/);
          if (langMatch) {
            const lang = langMatch[1];
            console.log(`🗣️ Detected language early: ${lang}`);
            this.speechService.setLanguage(lang);
            languageSet = true;
          }
        }
      
        // 🔥 2. Očisti LANG marker iz govora
        const cleanChunk = chunk.replace(/\[LANG:\w+-?\w*\]/g, '');
        if (this.autoSpeak()) {
          this.speechService.addChunk(cleanChunk);
        }
      },
      (stats?: any, language?: string) => {
        console.log('✅ Complete', stats);
        this.scrollToBottom();
        // if (language) {
        //   console.log(`🗣️ Updating speech language to: ${language}`);
        //   this.speechService.setLanguage(language);
        // }
        if (this.autoSpeak()) {
          this.speechService.finishStreaming();
        }
      },
      (error: any) => {
        this.speechService.stop(); 
        console.error('❌ Error:', error)}
    );
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private scrollToBottom(): void {
    // const chatContainer = document.querySelector('.chat-messages');
    // if (chatContainer) {
    //   chatContainer.scrollTop = chatContainer.scrollHeight;
    // }
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
    }else{
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