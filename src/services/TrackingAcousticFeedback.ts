/**
 * TrackingAcousticFeedback
 * Non-jarring, synthesized acoustic cues for assistive tracking recovery:
 * - Alerts user when face/eye tracking is lost (>1.2s debounce to ignore normal blinks)
 * - Chimes cheerfully when tracking is safely recovered
 * Uses Web Audio API directly: 0 external assets, 0 network latency, 100% offline.
 */

export class TrackingAcousticFeedback {
  private static instance: TrackingAcousticFeedback | null = null;
  private audioCtx: AudioContext | null = null;
  private wasTrackingLost: boolean = false;
  private lostStartTime: number = 0;
  private hasAnnouncedLost: boolean = false;
  private lostThresholdMs: number = 1200; // 1.2s sustain before alerting

  public static getInstance(): TrackingAcousticFeedback {
    if (!TrackingAcousticFeedback.instance) {
      TrackingAcousticFeedback.instance = new TrackingAcousticFeedback();
    }
    return TrackingAcousticFeedback.instance;
  }

  private constructor() {}

  private getAudioContext(): AudioContext | null {
    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Monitor live tracking status each frame.
   * Debounces tracking loss to prevent nuisance alerts during natural blinks.
   */
  public update(
    isDetected: boolean,
    soundEnabled: boolean = true,
    now: number = performance.now()
  ): { statusChanged: boolean; state: 'lost' | 'recovered' | 'steady' } {
    if (!isDetected) {
      if (this.lostStartTime === 0) {
        this.lostStartTime = now;
      } else if (now - this.lostStartTime >= this.lostThresholdMs && !this.hasAnnouncedLost) {
        this.hasAnnouncedLost = true;
        this.wasTrackingLost = true;
        if (soundEnabled) {
          this.playTrackingLostTone();
        }
        return { statusChanged: true, state: 'lost' };
      }
      return { statusChanged: false, state: 'steady' };
    }

    // Tracking is currently active/detected
    if (this.wasTrackingLost) {
      this.wasTrackingLost = false;
      this.lostStartTime = 0;
      this.hasAnnouncedLost = false;
      if (soundEnabled) {
        this.playTrackingRestoredTone();
      }
      return { statusChanged: true, state: 'recovered' };
    }

    this.lostStartTime = 0;
    this.hasAnnouncedLost = false;
    return { statusChanged: false, state: 'steady' };
  }

  /**
   * Soft descending chime: 330 Hz (E4) -> 261.6 Hz (C4)
   * Informs user gently that camera tracking lost alignment.
   */
  public playTrackingLostTone(): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(330, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(261.63, ctx.currentTime + 0.22);

      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.29);
    } catch (err) {
      // Audio playback suppressed by browser policy
    }
  }

  /**
   * Cheerful ascending chime: 523.25 Hz (C5) -> 659.25 Hz (E5)
   * Confirms to user that tracking has locked back on.
   */
  public playTrackingRestoredTone(): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.23);
    } catch (err) {
      // Audio playback suppressed
    }
  }

  public reset(): void {
    this.wasTrackingLost = false;
    this.lostStartTime = 0;
    this.hasAnnouncedLost = false;
  }
}
