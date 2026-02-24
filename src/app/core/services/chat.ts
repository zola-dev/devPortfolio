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
  private streamingMessageId: string | null = null;

  constructor(private http: HttpClient) {
    //console.log('✅ ChatService initialized with Signals');
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
  // sendMessage(userMessage: string, additionalPrompt: string = ''): Observable<ChatApiResponse> {
  //   this.isLoadingSignal.set(true);
  //   this.errorSignal.set(null);
    
  //   this.addMessage('user', userMessage);
    
  //   const conversationHistory = this.messagesSignal().map(msg => ({
  //     role: msg.role,
  //     content: msg.content
  //   }));
    
  //   return this.http.post<any>(this.API_URL, {
  //     message: userMessage,
  //     conversationHistory: conversationHistory,
  //     additionalPrompt: additionalPrompt,
  //     stream: false
  //   }).pipe(
  //     map(response => {
  //       if (response.success && response.reply) {
  //         this.addMessage('assistant', response.reply);
  //       }
  //       this.isLoadingSignal.set(false);
  //       return {
  //         success: response.success,
  //         reply: response.reply,
  //         error: response.error
  //       };
  //     }),
  //     catchError(error => {
  //       console.error('❌ Backend error:', error);
  //       const errorMsg = 'Failed to connect. Please try again.';
  //       this.errorSignal.set(errorMsg);
  //       this.addMessage('assistant', errorMsg);
  //       this.isLoadingSignal.set(false);
  //       return of({ success: false, reply: errorMsg, error: error.message });
  //     })
  //   );
  // }
  
  async sendMessageStream(
    userMessage: string,
    additionalPrompt: string = '',
    onStart: () => void,
    onChunk: (chunk: string) => void,
    onComplete: (stats?: any, language?: string, languageUnsupported?: boolean) => void,
    onError: (error: any) => void,
    sessionId:number | null
  ): Promise<void> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);
    this.addMessage('user', userMessage);
    const streamingMessageId = this.generateId();
    this.streamingMessageId = streamingMessageId; 
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
          sessionId,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }else{
        // console.log("response: ", response);
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
        // console.log("done: ", done);
        // console.log("value: ", value);

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) {
            continue;
          }
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const raw: unknown = JSON.parse(jsonStr);
            const data = this.parseStreamChunk(raw);

            if (data.languageUnsupported) {
              console.warn('⚠️ Language unsupported flag received!');
              onComplete(
                undefined, // stats
                data.language,
                true // languageUnsupported
              );
              // Do not return – we still want to stream content if any
            }

            if (data.content) {
              onChunk(data.content);
              await new Promise((resolve) =>
                requestAnimationFrame(() => resolve(undefined))
              );
            }

            if (data.done) {
              this.streamingMessageId = null;
              this.isLoadingSignal.set(false);
              onComplete(data.tokenStats);
              return;
            }
          } catch (parseError) {
            this.streamingMessageId = null;
            console.error('Parse error:', parseError, 'Line:', line);
          }
        }
      }
    } catch (error) {
      this.streamingMessageId = null;
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
    return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
  createSpeechSession(languages: string[]): Observable<number> {
    return this.http.post<number>(`https://shebs-braids.area36000.com/api/ai/createSpeechSession`, { languages });
  }
  
  updateSpeechSession(sessionId: number, languages: string[]): Observable<void> {
    return this.http.post<void>(`https://shebs-braids.area36000.com/api/ai/updateSpeechSession`, { sessionId, languages });
  }
  
  deleteSpeechSession(sessionId: number): Observable<void> {
    return this.http.post<void>(`https://shebs-braids.area36000.com/api/ai/deleteSpeechSession`, { sessionId });
  }
  updateStreamingMessage(content: string): void {
    if (!this.streamingMessageId) {
      //console.warn('⚠️ updateStreamingMessage called but streamingMessageId is null!');
      return;
    }
    // console.log('📝 updateStreamingMessage called:', {
    //   messageId: this.streamingMessageId,
    //   content: JSON.stringify(content),
    //   contentLength: content.length
    // });
    this.messagesSignal.update(messages => 
      messages.map(msg => 
        msg.id === this.streamingMessageId
          ? { ...msg, content: msg.content + content }
          : msg
      )
    );
  }

  // Use `unknown` + narrowing for streamed chunks
  private parseStreamChunk(raw: unknown): {
    content?: string;
    done?: boolean;
    tokenStats?: unknown;
    language?: string;
    languageUnsupported?: boolean;
  } {
    if (typeof raw !== 'object' || raw === null) {
      return {};
    }

    const obj = raw as Record<string, unknown>;
    const result: {
      content?: string;
      done?: boolean;
      tokenStats?: unknown;
      language?: string;
      languageUnsupported?: boolean;
    } = {};

    if (typeof obj['content'] === 'string') {
      result.content = obj['content'];
    }
    if (typeof obj['done'] === 'boolean') {
      result.done = obj['done'];
    }
    if ('tokenStats' in obj) {
      result.tokenStats = obj['tokenStats'];
    }
    if (typeof obj['language'] === 'string') {
      result.language = obj['language'];
    }
    if (typeof obj['languageUnsupported'] === 'boolean') {
      result.languageUnsupported = obj['languageUnsupported'];
    }

    return result;
  }
    /**
   * returns random welcome message
   */
  getWelcomeMessage(): string {
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
    return WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)];
  }
}