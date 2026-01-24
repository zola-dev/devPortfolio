import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../core/services/chat';
import { ChatMessage } from '../../core/models/chat';

@Component({
  selector: 'app-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './assistant.html',
  styleUrl: './assistant.css'
})
export class AssistantComponent {
  private chatService = inject(ChatService);

  // ========== SIGNALS ==========
  userInput = signal<string>('');
  
  // ========== COMPUTED SIGNALS from Service ==========
  messages = this.chatService.visibleMessages;
  isLoading = this.chatService.isLoading;
  hasMessages = this.chatService.hasMessages;

  constructor() {
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
  }

  sendMessage(): void {
    const message = this.userInput().trim();
    
    if (!message || this.isLoading()) return;

    this.userInput.set('');

    // Always streaming - no conditional logic needed
    this.chatService.sendMessageStream(
      message,
      '',
      () => console.log('🎬 Streaming started'),
      (chunk: string) => {},
      (stats?: any) => {
        console.log('✅ Complete', stats);
        setTimeout(() => this.scrollToBottom(), 100);
      },
      (error: any) => console.error('❌ Error:', error)
    );
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private scrollToBottom(): void {
    const chatContainer = document.querySelector('.chat-messages');
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  resetChat(): void {
    this.chatService.reset();
    this.userInput.set('');
    this.initChat();
  }

  trackByMessageId(index: number, message: ChatMessage): string {
    return message.id;
  }
}