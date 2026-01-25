import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class Speech {
  
  // ========== SIGNALS ==========
  private isSpeakingSignal = signal<boolean>(false);
  readonly isSpeaking = this.isSpeakingSignal.asReadonly();
  
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
    console.log('✅ SpeechService initialized');
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