import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ChatMessage, ChatApiResponse } from '../models/chat';
import { Observable, catchError, map, of } from 'rxjs';

/**
 * Angular 21 Chat Service
 * Combines: Signals + Your Working Streaming Code
 */
@Injectable({
  providedIn: 'root'
})
export class Chat {
  
  // ========== SIGNALS (State) ==========
  private messagesSignal = signal<ChatMessage[]>([]);
  private isLoadingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);
  
  // ========== PUBLIC READONLY SIGNALS ==========
  readonly messages = this.messagesSignal.asReadonly();
  readonly isLoading = this.isLoadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  
  // ========== COMPUTED SIGNALS ==========
  readonly visibleMessages = computed(() => 
    this.messagesSignal().filter(msg => !msg.hidden)
  );
  
  readonly messageCount = computed(() => this.messagesSignal().length);
  readonly hasMessages = computed(() => this.messageCount() > 0);
  
  // ========== CONFIG ==========
  private readonly API_URL = 'https://shebs-braids.area36000.com/api/ai/devPortfolioAssistant';
  
  constructor(private http: HttpClient) {
    console.log('✅ ChatService initialized with Signals');
  }
  
  /**
   * Add message to chat
   * ✅ Signal update
   */
  addMessage(role: 'user' | 'assistant' | 'system', content: string, hidden = false): void {
    const newMessage: ChatMessage = {
      id: this.generateId(),
      role,
      content,
      timestamp: new Date(),
      hidden,
    };
    
    this.messagesSignal.update(msgs => [...msgs, newMessage]);
  }
  
  /**
   * Send message (NON-STREAMING)
   */
  sendMessage(userMessage: string, additionalPrompt: string = ''): Observable<ChatApiResponse> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);
    
    this.addMessage('user', userMessage);
    
    const conversationHistory = this.messagesSignal().map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    return this.http.post<any>(this.API_URL, {
      message: userMessage,
      conversationHistory: conversationHistory,
      additionalPrompt: additionalPrompt,
      stream: false
    }).pipe(
      map(response => {
        if (response.success && response.reply) {
          this.addMessage('assistant', response.reply);
        }
        this.isLoadingSignal.set(false);
        return {
          success: response.success,
          reply: response.reply,
          error: response.error
        };
      }),
      catchError(error => {
        console.error('❌ Backend error:', error);
        const errorMsg = 'Failed to connect. Please try again.';
        this.errorSignal.set(errorMsg);
        this.addMessage('assistant', errorMsg);
        this.isLoadingSignal.set(false);
        return of({ success: false, reply: errorMsg, error: error.message });
      })
    );
  }
  
  /**
   * Send message with STREAMING (Your working code!)
   * ✅ Uses your exact SSE parsing logic
   */
  async sendMessageStream(
    userMessage: string,
    additionalPrompt: string = '',
    onStart: () => void,
    onChunk: (chunk: string) => void,
    onComplete: (stats?: any, language?: string, languageUnsupported?: boolean) => void,
    onError: (error: any) => void
  ): Promise<void> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);
    
    // Add user message
    this.addMessage('user', userMessage);
    
    // Create streaming assistant message
    const streamingMessageId = this.generateId();
    const streamingMessage: ChatMessage = {
      id: streamingMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    
    this.messagesSignal.update(messages => [...messages, streamingMessage]);
    
    // Prepare conversationHistory (exclude the new streaming message)
    const conversationHistory = this.messagesSignal()
      .filter(msg => msg.id !== streamingMessageId)
      .map(msg => ({
        role: msg.role,
        content: msg.content
      }));
    
    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: conversationHistory,
          additionalPrompt: additionalPrompt,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      onStart();

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Response body is not readable');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6).trim();
              if (!jsonStr) continue;

              const data = JSON.parse(jsonStr);

              if (data.content) {
                // Update streaming message with Signal
                this.messagesSignal.update(messages => 
                  messages.map(msg => 
                    msg.id === streamingMessageId
                      ? { ...msg, content: msg.content + data.content }
                      : msg
                  )
                );
                
                onChunk(data.content);
                await new Promise((resolve) =>
                  requestAnimationFrame(() => resolve(undefined))
                );
              }

              if (data.done) {     
                this.isLoadingSignal.set(false);
                onComplete(data.tokenStats);
                return;
              }
            } catch (parseError) {
              console.error('Parse error:', parseError, 'Line:', line);
            }
          }
        }
      }
    } catch (error) {
      console.error('Stream error:', error);
      this.errorSignal.set('Streaming failed');
      this.isLoadingSignal.set(false);
      
      // Remove failed streaming message
      this.messagesSignal.update(messages => 
        messages.filter(msg => msg.id !== streamingMessageId)
      );
      
      this.addMessage('assistant', 'Connection failed. Please try again.');
      onError(error);
    }
  }
  
  /**
   * Clear all messages
   */
  clearMessages(): void {
    this.messagesSignal.set([]);
    this.errorSignal.set(null);
  }
  
  /**
   * Reset service
   */
  reset(): void {
    this.clearMessages();
    this.isLoadingSignal.set(false);
  }
  
  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  createSpeechSession(languages: string[]): Observable<number> {
    return this.http.post<number>(`${this.API_URL}/createSpeechSession`, { languages });
  }
  
  updateSpeechSession(sessionId: number, languages: string[]): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/updateSpeechSession`, { sessionId, languages });
  }
  
  deleteSpeechSession(sessionId: number): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/deleteSpeechSession`, { sessionId });
  }
}