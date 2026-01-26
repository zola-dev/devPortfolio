import { Injectable, signal } from '@angular/core';
import { concatMap, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Speech {
  
  // ========== SIGNALS ==========
  private isSpeakingSignal = signal<boolean>(false);
  readonly isSpeaking = this.isSpeakingSignal.asReadonly();

    // ========== STREAMING QUEUE ==========
    private sentenceQueue$ = new Subject<string>();
    private currentBuffer = '';
    private isStreaming = false;
  
  
  // ========== CONFIG ==========
  private synthesis: SpeechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  
  // Voice settings
  private defaultVoice: SpeechSynthesisVoice | null = null;
  private rate = 1.0;      // Brzina (0.1 - 10)
  private pitch = 1.0;     // Ton (0 - 2)
  private volume = 1.0;    // Glasnoća (0 - 1)
  
  constructor() {
    this.synthesis = window.speechSynthesis;
    this.loadVoices();
    this.setupStreamingQueue();
    console.log('✅ SpeechService initialized');
  }
  private setupStreamingQueue(): void {
    this.sentenceQueue$.pipe(
      concatMap(sentence => this.speakAsync(sentence))
    ).subscribe({
      next: () => {
        // sentence finished, => next
      },
      error: (err) => {
        console.error('❌ Speech queue error:', err);
        this.isSpeakingSignal.set(false);
      }
    });
  }

  //Speak text asynchronously (returns Promise wrapped in Observable)
 private speakAsync(text: string): Promise<void> {
   return new Promise((resolve, reject) => {
     if (!text.trim()) {
       resolve();
       return;
     }
     
     const utterance = new SpeechSynthesisUtterance(text);
     
     if (this.defaultVoice) {
       utterance.voice = this.defaultVoice;
     }
     utterance.rate = this.rate;
     utterance.pitch = this.pitch;
     utterance.volume = this.volume;
     utterance.lang = 'en-US';
     
     utterance.onstart = () => {
       this.isSpeakingSignal.set(true);
       console.log(`🔊 Speaking: "${text.substring(0, 50)}..."`);
     };
     
     utterance.onend = () => {
       console.log('✅ Sentence finished');
       resolve();
     };
     
     utterance.onerror = (event) => {
       console.error('❌ Speech error:', event);
       reject(event);
     };
     
     this.currentUtterance = utterance;
     this.synthesis.speak(utterance);
   });
 }
 startStreaming(): void {
  this.isStreaming = true;
  this.currentBuffer = '';
  this.isSpeakingSignal.set(false);
  console.log('🎙️ Streaming speech started');
}
addChunk(chunk: string): void {
  if (!this.isStreaming) return;
  
  this.currentBuffer += chunk;
  
  // Extract complete sentences (ending with . ! ? , or newline)
  const sentences = this.extractCompleteSentences();
  
  sentences.forEach(sentence => {
    if (sentence.trim()) {
      this.sentenceQueue$.next(sentence);
    }
  });
}
// * Extract complete sentences from buffer
//    * Supports: . ! ? , and \n as sentence endings
private extractCompleteSentences(): string[] {
  // Regex: match sentence endings (., !, ?, ,) followed by space/newline OR just newline
  const sentencePattern = /[.!?,]\s+|\n/g;
  
  const sentences: string[] = [];
  let lastIndex = 0;
  let match;
  
  while ((match = sentencePattern.exec(this.currentBuffer)) !== null) {
    const endIndex = match.index + match[0].length;
    const sentence = this.currentBuffer.substring(lastIndex, endIndex).trim();
    
    if (sentence) {
      sentences.push(sentence);
    }
    
    lastIndex = endIndex;
  }
  
  // Keep incomplete sentence in buffer
  this.currentBuffer = this.currentBuffer.substring(lastIndex);
  
  return sentences;
}
  /**
   * Load available voices
   */
  private loadVoices(): void {
    const voices = this.synthesis.getVoices();
    
    if (voices.length === 0) {
      // Voices not loaded yet, try again
      this.synthesis.onvoiceschanged = () => {
        this.selectDefaultVoice();
      };
    } else {
      this.selectDefaultVoice();
    }
  }
  
  /**
   * Select best English voice
   */
  private selectDefaultVoice(): void {
    const voices = this.synthesis.getVoices();
    
    // Prioritet: Google UK English Male → Microsoft Mark → Bilo koji engleski
    const preferredVoices = [
      'Google UK English Male',
      'Google US English',
      'Microsoft Mark - English (United States)',
      'Alex',  // macOS
      'Samantha' // macOS
    ];
    
    for (const preferred of preferredVoices) {
      const voice = voices.find(v => v.name === preferred);
      if (voice) {
        this.defaultVoice = voice;
        console.log(`🎤 Selected voice: ${voice.name}`);
        return;
      }
    }
    
    // Fallback: Bilo koji engleski glas
    const englishVoice = voices.find(v => v.lang.startsWith('en'));
    if (englishVoice) {
      this.defaultVoice = englishVoice;
      console.log(`🎤 Selected fallback voice: ${englishVoice.name}`);
    }
  }
  
  /**
   * Speak text aloud
   */
  speak(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Stop any current speech
      this.stop();
      
      if (!text.trim()) {
        resolve();
        return;
      }
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set voice and settings
      if (this.defaultVoice) {
        utterance.voice = this.defaultVoice;
      }
      utterance.rate = this.rate;
      utterance.pitch = this.pitch;
      utterance.volume = this.volume;
      utterance.lang = 'en-US';
      
      // Event handlers
      utterance.onstart = () => {
        this.isSpeakingSignal.set(true);
        console.log('🔊 Started speaking');
      };
      
      utterance.onend = () => {
        this.isSpeakingSignal.set(false);
        this.currentUtterance = null;
        console.log('✅ Finished speaking');
        resolve();
      };
      
      utterance.onerror = (event) => {
        this.isSpeakingSignal.set(false);
        this.currentUtterance = null;
        console.error('❌ Speech error:', event);
        reject(event);
      };
      
      // Store and speak
      this.currentUtterance = utterance;
      this.synthesis.speak(utterance);
    });
  }
  
  /**
   * Stop current speech
   */
  stop(): void {
    if (this.synthesis.speaking) {
      this.synthesis.cancel();
      this.isSpeakingSignal.set(false);
      this.currentUtterance = null;
      console.log('⏹️ Speech stopped');
    }
  }
  stop1(): void {
    try {
      this.synthesis.cancel();
  
      // Chrome / Safari workaround
      setTimeout(() => {
        this.synthesis.cancel();
      }, 0);
  
      this.isSpeakingSignal.set(false);
      this.currentUtterance = null;
      console.log('⏹️ Speech force-stopped');
    } catch (e) {
      console.warn('Speech stop failed', e);
    }
  }
  
  /**
   * Pause speech
   */
  pause(): void {
    if (this.synthesis.speaking && !this.synthesis.paused) {
      this.synthesis.pause();
      console.log('⏸️ Speech paused');
    }
  }
  
  /**
   * Resume speech
   */
  resume(): void {
    if (this.synthesis.paused) {
      this.synthesis.resume();
      console.log('▶️ Speech resumed');
    }
  }
  
  /**
   * Get available voices
   */
  getVoices(): SpeechSynthesisVoice[] {
    return this.synthesis.getVoices();
  }
  
  /**
   * Set voice by name
   */
  setVoice(voiceName: string): void {
    const voices = this.getVoices();
    const voice = voices.find(v => v.name === voiceName);
    if (voice) {
      this.defaultVoice = voice;
      console.log(`🎤 Voice changed to: ${voice.name}`);
    }
  }
  
  /**
   * Set speech rate (0.1 - 10)
   */
  setRate(rate: number): void {
    this.rate = Math.max(0.1, Math.min(10, rate));
  }
  
  /**
   * Set pitch (0 - 2)
   */
  setPitch(pitch: number): void {
    this.pitch = Math.max(0, Math.min(2, pitch));
  }
  
  /**
   * Set volume (0 - 1)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }
}