/**
 * SelectionManager
 * Manages element hit testing, target registration, dwell execution,
 * reading protection lockouts, rest mode, and audio feedback.
 */

import { DwellEngine, DwellProgressUpdate } from './DwellEngine';
import { DwellTarget, Point2D, GazeConfidenceResult } from '../types/tracking';

export class SelectionManager {
  private static instance: SelectionManager | null = null;
  private dwellEngine: DwellEngine;
  private targets: Map<string, DwellTarget> = new Map();
  private isRestModeActive: boolean = false;
  private isReadingModeActive: boolean = false;
  private soundFeedbackEnabled: boolean = true;
  private audioCtx: AudioContext | null = null;

  public static getInstance(): SelectionManager {
    if (!SelectionManager.instance) {
      SelectionManager.instance = new SelectionManager();
    }
    return SelectionManager.instance;
  }

  private constructor() {
    this.dwellEngine = new DwellEngine({}, (targetId) => this.handleTargetSelected(targetId));
  }

  public getDwellEngine(): DwellEngine {
    return this.dwellEngine;
  }

  public registerTarget(target: DwellTarget): () => void {
    this.targets.set(target.id, target);
    return () => {
      this.targets.delete(target.id);
      if (this.dwellEngine['currentTargetId'] === target.id) {
        this.dwellEngine.resetDwell();
      }
    };
  }

  public setRestMode(active: boolean): void {
    this.isRestModeActive = active;
    if (active) {
      this.dwellEngine.cancel();
    }
  }

  public cancel(): void {
    this.dwellEngine.cancel();
  }

  public getRestMode(): boolean {
    return this.isRestModeActive;
  }

  public setReadingMode(active: boolean): void {
    this.isReadingModeActive = active;
    if (active) {
      this.dwellEngine.resetDwell();
    }
  }

  public getReadingMode(): boolean {
    return this.isReadingModeActive;
  }

  public setSoundFeedback(enabled: boolean): void {
    this.soundFeedbackEnabled = enabled;
  }

  public reset(): void {
    this.targets.clear();
    this.isRestModeActive = false;
    this.isReadingModeActive = false;
    this.dwellEngine.setOnSelect((targetId) => this.handleTargetSelected(targetId));
    this.dwellEngine.cancel();
  }

  /**
   * Process current focus point and evaluate dwell selection
   */
  public update(point: Point2D, confidence: GazeConfidenceResult, now: number = performance.now()): void {
    // Emergency corner abort: Looking at top corners (within 60px) cancels ongoing dwell
    const isCornerAbort =
      (point.y <= 60 && (point.x <= 60 || (typeof window !== 'undefined' && point.x >= window.innerWidth - 60)));

    if (isCornerAbort) {
      this.dwellEngine.cancel();
      return;
    }

    if (this.isRestModeActive) {
      // In Rest Mode, only allow hovering and dwelling on explicit wake/resume targets
      const wakeTargetId = this.findRestModeTarget(point);
      if (wakeTargetId) {
        this.dwellEngine.update(wakeTargetId, confidence, now);
      } else {
        this.dwellEngine.cancel();
      }
      return;
    }

    // Hit test against registered targets
    const hoveredTargetId = this.findHoveredTarget(point);
    this.dwellEngine.update(hoveredTargetId, confidence, now);
  }

  /**
   * Targets accessible while resting (Wake Up button or Toggle Rest)
   */
  private findRestModeTarget(point: Point2D): string | null {
    for (const [id, target] of this.targets.entries()) {
      if (target.disabled) continue;
      if (!target.allowInRestMode && id !== 'btn-wake-up' && id !== 'btn-toggle-rest') continue;

      if (target.element) {
        const rect = target.element.getBoundingClientRect();
        if (
          point.x >= rect.left &&
          point.x <= rect.right &&
          point.y >= rect.top &&
          point.y <= rect.bottom
        ) {
          return id;
        }
      }
    }
    return null;
  }

  private findHoveredTarget(point: Point2D): string | null {
    // Check elements at point
    for (const [id, target] of this.targets.entries()) {
      if (target.disabled) continue;

      // Reading protection: if article reading area, reject selection
      if (target.isArticleReadingArea && this.isReadingModeActive) {
        continue;
      }

      if (target.element) {
        const rect = target.element.getBoundingClientRect();
        if (
          point.x >= rect.left &&
          point.x <= rect.right &&
          point.y >= rect.top &&
          point.y <= rect.bottom
        ) {
          return id;
        }
      }
    }

    return null;
  }

  private handleTargetSelected(targetId: string): void {
    const target = this.targets.get(targetId);
    if (!target || target.disabled) return;

    if (this.soundFeedbackEnabled) {
      this.playSoftSelectionTone();
    }

    try {
      target.onSelect();
    } catch (err) {
      console.error(`Error activating target ${targetId}:`, err);
    }
  }

  /**
   * Synthesize a gentle, non-jarring acoustic feedback chime
   */
  private playSoftSelectionTone(): void {
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }

      if (!this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      // Dual gentle chime: 523.25 Hz (C5) ramping to 659.25 Hz (E5)
      osc.frequency.setValueAtTime(523.25, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(659.25, this.audioCtx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.16);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.16);
    } catch {
      // Audio playback fails silently if browser blocks autoplay
    }
  }
}
