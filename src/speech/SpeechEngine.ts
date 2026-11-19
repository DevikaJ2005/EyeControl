/**
 * SpeechEngine
 * Robust Web Speech API wrapper with voice enumeration, rate, pitch, volume controls,
 * and reliable error handling.
 */

export interface SpeechSettings {
  voiceURI: string;
  rate: number;   // 0.5 to 2.0 (default 1.0)
  pitch: number;  // 0.5 to 1.5 (default 1.0)
  volume: number; // 0.0 to 1.0 (default 1.0)
  lang: string;
}

export class SpeechEngine {
  private static instance: SpeechEngine | null = null;
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private isSpeaking: boolean = false;
  private lastSpokenText: string = '';

  private settings: SpeechSettings = {
    voiceURI: '',
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    lang: 'en-US',
  };

  public static getInstance(): SpeechEngine {
    if (!SpeechEngine.instance) {
      SpeechEngine.instance = new SpeechEngine();
    }
    return SpeechEngine.instance;
  }

  private constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices(): void {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (this.voices.length === 0 && this.synth) {
      this.voices = this.synth.getVoices();
    }
    return this.voices;
  }

  public updateSettings(settings: Partial<SpeechSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  public getSettings(): SpeechSettings {
    return { ...this.settings };
  }

  /**
   * Speak given phrase using Web Speech API
   */
  public speak(text: string, onEnd?: () => void): void {
    if (!this.synth || !text.trim()) return;

    // Cancel any active utterance
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = this.settings.rate;
    utterance.pitch = this.settings.pitch;
    utterance.volume = this.settings.volume;

    if (this.settings.voiceURI) {
      const selectedVoice = this.voices.find(v => v.voiceURI === this.settings.voiceURI);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      onEnd?.();
    };

    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      this.isSpeaking = false;
      onEnd?.();
    };

    this.lastSpokenText = text;
    this.synth.speak(utterance);
  }

  public repeat(): void {
    if (this.lastSpokenText) {
      this.speak(this.lastSpokenText);
    }
  }

  public stop(): void {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
    }
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  public getLastSpokenText(): string {
    return this.lastSpokenText;
  }
}
