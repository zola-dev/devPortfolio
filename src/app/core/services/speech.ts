import { Injectable, signal } from '@angular/core';
import { concatMap, Subject, takeUntil } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Speech {
  
  // ========== SIGNALS ==========
  private isSpeakingSignal = signal<boolean>(false);
  readonly isSpeaking = this.isSpeakingSignal.asReadonly();

  // ========== STREAMING QUEUE ==========
  private sentenceQueue$ = new Subject<string>();
  private stopQueue$ = new Subject<void>();
  private currentBuffer = '';
  private isStreaming = false;
  
  // ========== CONFIG ==========
  private synthesis: SpeechSynthesis;
  
  // Voice settings
  private defaultVoice: SpeechSynthesisVoice | null = null;
  private currentLanguage: string = 'en-US'; // 🔥 NEW: Track current language
  private rate = 1.0;      // Brzina (0.1 - 10)
  private pitch = 1;     // Ton (0 - 2)
  private volume = 1.0;    // Glasnoća (0 - 1)
  private speechSessionId: number | null = null;
  private readonly SESSION_KEY = 'speechSessionId';
  constructor() {
    this.synthesis = window.speechSynthesis;
    this.loadVoices();
    this.setupStreamingQueue();
    this.logAvailableLanguages(); // 🔥 NEW: Log all available languages
    console.log('✅ SpeechService initialized');
  }
  
  // 🔥 NEW: Log all available languages on startup
  private logAvailableLanguages(): void {
    if (this.synthesis.getVoices().length === 0) {
      this.synthesis.onvoiceschanged = () => {
        this.doLogLanguages();
      };
    } else {
      this.doLogLanguages();
    }
  }
  
  private doLogLanguages(): void {
    const voices = this.synthesis.getVoices();
    const languages = new Set<string>();
    
    voices.forEach(voice => {
      languages.add(voice.lang);
    });
    
    console.log('🗣️ Available speech languages:', Array.from(languages).sort());
    console.log('📝 Example voices per language:');
    
    const languageMap = new Map<string, string[]>();
    voices.forEach(voice => {
      if (!languageMap.has(voice.lang)) {
        languageMap.set(voice.lang, []);
      }
      languageMap.get(voice.lang)!.push(voice.name);
    });
    
    // Log first 2 voices per language
    languageMap.forEach((names, lang) => {
      console.log(`  ${lang}: ${names.slice(0, 2).join(', ')}${names.length > 2 ? '...' : ''}`);
    });
  }
  
  // 🔥 NEW: Set language dynamically from backend
  setLanguage(lang: string): void {
    this.currentLanguage = lang;
    console.log(`🗣️ Language changed to: ${lang}`);
    
    // Update voice to match language
    this.selectVoiceForLanguage(lang);
  }
  
  // 🔥 NEW: Select voice based on detected language
  private selectVoiceForLanguage(lang: string): void {
    const voices = this.synthesis.getVoices();
    
    // Try to find voices for specific language
    const voicesForLang = voices.filter(v => v.lang === lang);
    
    if (voicesForLang.length > 0) {
      // Prefer Google voices if available
      const googleVoice = voicesForLang.find(v => v.name.includes('Google'));
      this.defaultVoice = googleVoice || voicesForLang[0];
      console.log(`🎤 Selected voice for ${lang}: ${this.defaultVoice.name}`);
    } else {
      // Fallback: try base language (e.g., 'sr' for 'sr-RS')
      const baseLang = lang.split('-')[0];
      const similarVoice = voices.find(v => v.lang.startsWith(baseLang));
      
      if (similarVoice) {
        this.defaultVoice = similarVoice;
        console.log(`🎤 Selected fallback voice for ${baseLang}: ${similarVoice.name}`);
      } else {
        console.warn(`⚠️ No voice found for language: ${lang}, keeping current voice`);
      }
    }
  }
  
  private setupStreamingQueue(): void {
    this.sentenceQueue$.pipe(
      takeUntil(this.stopQueue$),
      concatMap(sentence => this.speakAsync(sentence))
    ).subscribe({
      next: () => {
        // Sentence finished, automatically moves to next
      },
      error: (err) => {
        console.error('❌ Speech queue error:', err);
        this.isSpeakingSignal.set(false);
      },
      complete: () => {
        console.log('🎬 Queue completed');
        this.isSpeakingSignal.set(false);
      }
    });
  }

  private sanitizeForSpeech(text: string): string {
    let cleaned = text;
    
    // Remove markdown bold/italic
    cleaned = cleaned.replace(/(\*\*|__)(.*?)\1/g, '$2');
    cleaned = cleaned.replace(/(\*|_)(.*?)\1/g, '$2');
    
    // Remove markdown headers
    cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');
    
    // Remove links but keep text [text](url) -> text
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
    
    // Remove URLs
    cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, '');
    
    // Remove emojis
    cleaned = cleaned.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
    
    // Remove special symbols
    cleaned = cleaned.replace(/[•·→←↑↓✓✗✔✘★☆♠♣♥♦]/g, '');
    
    // Replace multiple punctuation
    cleaned = cleaned.replace(/\.{2,}/g, '.');
    cleaned = cleaned.replace(/!{2,}/g, '!');
    cleaned = cleaned.replace(/\?{2,}/g, '?');
    
    // Replace multiple spaces
    cleaned = cleaned.replace(/\s+/g, ' ');
    
    return cleaned.trim();
  }

  private speakAsync(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const cleanedText = this.sanitizeForSpeech(text);
      
      if (!cleanedText.trim()) {
        resolve();
        return;
      }
      
      const utterance = new SpeechSynthesisUtterance(cleanedText);
      
      if (this.defaultVoice) {
        utterance.voice = this.defaultVoice;
      }
      utterance.rate = this.rate;
      utterance.pitch = this.pitch;
      utterance.volume = this.volume;
      utterance.lang = this.currentLanguage; // 🔥 Use dynamic language
      
      utterance.onstart = () => {
        this.isSpeakingSignal.set(true);
        console.log(`🔊 Speaking (${this.currentLanguage}): "${cleanedText.substring(0, 50)}..."`);
      };
      
      utterance.onend = () => {
        console.log('✅ Sentence finished');
        resolve();
      };
      
      utterance.onerror = (event) => {
        console.error('❌ Speech error:', event);
        reject(event);
      };
      
      this.synthesis.speak(utterance);
    });
  }
  
  startStreaming(): void {
    this.stop();
    
    this.isStreaming = true;
    this.currentBuffer = '';
    this.isSpeakingSignal.set(false);
    
    this.stopQueue$ = new Subject<void>();
    this.setupStreamingQueue();
    
    console.log('🎙️ Streaming speech started');
  }
  
  addChunk(chunk: string): void {
    if (!this.isStreaming) return;
    
    this.currentBuffer += chunk;
    
    const sentences = this.extractCompleteSentences();
    
    sentences.forEach(sentence => {
      if (sentence.trim()) {
        this.sentenceQueue$.next(sentence);
      }
    });
  }
  
  private extractCompleteSentences(): string[] {
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
    
    this.currentBuffer = this.currentBuffer.substring(lastIndex);
    
    return sentences;
  }
  
  finishStreaming(): void {
    this.isStreaming = false;
    
    if (this.currentBuffer.trim()) {
      this.sentenceQueue$.next(this.currentBuffer);
      this.currentBuffer = '';
    }
    
    console.log('🎬 Streaming speech finished');
  }
  
  private loadVoices(): void {
    const voices = this.synthesis.getVoices();
    
    if (voices.length === 0) {
      this.synthesis.onvoiceschanged = () => {
        this.selectDefaultVoice();
      };
    } else {
      this.selectDefaultVoice();
    }
  }
  
  private selectDefaultVoice(): void {
    const voices = this.synthesis.getVoices();
    
    const preferredVoices = [
      'Google US English',        // Female
      'Samantha',                 // macOS Female
      'Microsoft Zira - English (United States)', // Female
      'Alex'                      // macOS Male (fallback)
    ];
    
    for (const preferred of preferredVoices) {
      const voice = voices.find(v => v.name === preferred);
      if (voice) {
        this.defaultVoice = voice;
        console.log(`🎤 Selected default voice: ${voice.name}`);
        return;
      }
    }
    
    const englishVoice = voices.find(v => v.lang.startsWith('en'));
    if (englishVoice) {
      this.defaultVoice = englishVoice;
      console.log(`🎤 Selected fallback voice: ${englishVoice.name}`);
    }
  }
  
  speak(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.stop();
      
      const cleanedText = this.sanitizeForSpeech(text);
      
      if (!cleanedText.trim()) {
        resolve();
        return;
      }
      
      const utterance = new SpeechSynthesisUtterance(cleanedText);
      
      if (this.defaultVoice) {
        utterance.voice = this.defaultVoice;
      }
      utterance.rate = this.rate;
      utterance.pitch = this.pitch;
      utterance.volume = this.volume;
      utterance.lang = this.currentLanguage; // 🔥 Use dynamic language
      
      utterance.onstart = () => {
        this.isSpeakingSignal.set(true);
        console.log(`🔊 Started speaking (${this.currentLanguage})`);
      };
      
      utterance.onend = () => {
        this.isSpeakingSignal.set(false);
        console.log('✅ Finished speaking');
        resolve();
      };
      
      utterance.onerror = (event) => {
        this.isSpeakingSignal.set(false);
        console.error('❌ Speech error:', event);
        reject(event);
      };
      
      this.synthesis.speak(utterance);
    });
  }
  
  stop(): void {
    this.isStreaming = false;
    this.currentBuffer = '';
    
    this.stopQueue$.next();
    
    if (this.synthesis.speaking || this.synthesis.pending) {
      this.synthesis.cancel();
      
      setTimeout(() => {
        this.synthesis.cancel();
      }, 0);
    }
    
    this.isSpeakingSignal.set(false);
    console.log('⏹️ Speech stopped & queue cleared');
  }

  pause(): void {
    if (this.synthesis.speaking && !this.synthesis.paused) {
      this.synthesis.pause();
      console.log('⏸️ Speech paused');
    }
  }
  
  resume(): void {
    if (this.synthesis.paused) {
      this.synthesis.resume();
      console.log('▶️ Speech resumed');
    }
  }
  
  getVoices(): SpeechSynthesisVoice[] {
    return this.synthesis.getVoices();
  }
  
  setVoice(voiceName: string): void {
    const voices = this.getVoices();
    const voice = voices.find(v => v.name === voiceName);
    if (voice) {
      this.defaultVoice = voice;
      console.log(`🎤 Voice changed to: ${voice.name}`);
    }
  }
  
  setRate(rate: number): void {
    this.rate = Math.max(0.1, Math.min(10, rate));
  }
  
  setPitch(pitch: number): void {
    this.pitch = Math.max(0, Math.min(2, pitch));
  }
  
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }
  logAvailableVoices(): void {
    const log = () => {
      const voices = this.synthesis.getVoices();
  
      if (!voices.length) {
        console.warn('⚠️ No voices available');
        return;
      }
  
      console.group(`🗣️ Available voices (${voices.length})`);
  
      voices.forEach((v, i) => {
        console.log(
          `${i + 1}. ${v.name} | lang=${v.lang} | default=${v.default}`
        );
      });
  
      console.groupEnd();
    };
  
    // 🔥 ako nisu još učitani
    if (this.synthesis.getVoices().length === 0) {
      this.synthesis.onvoiceschanged = log;
    } else {
      log();
    }
  }
  getAvailableLanguages(): Promise<string[]> {
    return new Promise(resolve => {
      const collect = () => {
        const voices = this.synthesis.getVoices();
  
        const langs = Array.from(
          new Set(voices.map(v => v.lang).filter(Boolean))
        );
  
        resolve(langs);
      };
  
      if (this.synthesis.getVoices().length === 0) {
        this.synthesis.onvoiceschanged = collect;
      } else {
        collect();
      }
    });
  }
}