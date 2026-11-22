/**
 * SelectionManager
 * Manages element hit testing, target registration, dwell execution,
 * magnetic target snapping, hysteresis tolerance, reading protection,
 * rest mode, and audio feedback.
 */

import { DwellEngine } from './DwellEngine';
import { DwellTarget, Point2D, GazeConfidenceResult } from '../types/tracking';

export class SelectionManager {
  private static instance: SelectionManager | null = null;
  private dwellEngine: DwellEngine;
  private targets: Map<string, DwellTarget> = new Map();
  private isRestModeActive: boolean = false;
  private isReadingModeActive: boolean = false;
  private soundFeedbackEnabled: boolean = true;
  private audioCtx: AudioContext | null = null;

  // Selection method: hybrid (both dwell & intentional blink), dwell_only, or blink_only
  private selectionMethod: 'hybrid' | 'dwell' | 'blink' = 'hybrid';
  private blinkStartTime: number | null = null;
  private intentionalBlinkTriggered: boolean = false;
  private intentionalBlinkThresholdMs: number = 420; // 420ms deliberate eye closure to click

  // Hysteresis & Magnetic Snapping
  private lastHoveredTargetId: string | null = null;
  private currentSnappedPoint: Point2D | null = null;
  private enterTolerancePx: number = 20;
  private exitTolerancePx: number = 44;
  private magneticSnapRadiusPx: number = 320; // Expanded magnetic reach
  private magneticSnapStrength: number = 0.75;

  public static getInstance(): SelectionManager {
    if (!SelectionManager.instance) {
      SelectionManager.instance = new SelectionManager();
    }
    return SelectionManager.instance;
  }

  private constructor() {
    this.dwellEngine = new DwellEngine({}, (targetId) => this.handleTargetSelected(targetId));
  }

  public setSelectionMethod(method: 'hybrid' | 'dwell' | 'blink'): void {
    this.selectionMethod = method;
  }

  public getSelectionMethod(): 'hybrid' | 'dwell' | 'blink' {
    return this.selectionMethod;
  }

  public getDwellEngine(): DwellEngine {
    return this.dwellEngine;
  }

  public registerTarget(target: DwellTarget): () => void {
    this.targets.set(target.id, target);
    return () => {
      this.targets.delete(target.id);
      if (this.lastHoveredTargetId === target.id) {
        this.lastHoveredTargetId = null;
        this.currentSnappedPoint = null;
      }
      if (this.dwellEngine['currentTargetId'] === target.id) {
        this.dwellEngine.resetDwell();
      }
    };
  }

  public setRestMode(active: boolean): void {
    this.isRestModeActive = active;
    if (active) {
      this.dwellEngine.cancel();
      this.lastHoveredTargetId = null;
      this.currentSnappedPoint = null;
      this.blinkStartTime = null;
      this.intentionalBlinkTriggered = false;
    }
  }

  public cancel(): void {
    this.dwellEngine.cancel();
    this.lastHoveredTargetId = null;
    this.currentSnappedPoint = null;
    this.blinkStartTime = null;
    this.intentionalBlinkTriggered = false;
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
    this.lastHoveredTargetId = null;
    this.currentSnappedPoint = null;
    this.blinkStartTime = null;
    this.intentionalBlinkTriggered = false;
    this.dwellEngine.setOnSelect((targetId) => this.handleTargetSelected(targetId));
    this.dwellEngine.cancel();
  }

  /**
   * Returns the magnetically-stabilized point (or raw point if not near a button)
   */
  public getSnappedGazePoint(): Point2D | null {
    return this.currentSnappedPoint;
  }

  public getActiveHoveredTarget(): DwellTarget | null {
    if (!this.lastHoveredTargetId) return null;
    return this.targets.get(this.lastHoveredTargetId) ?? null;
  }

  /**
   * Process current focus point and evaluate selection (Voronoi Proximity + Dwell + Intentional Blink)
   */
  public update(point: Point2D, confidence: GazeConfidenceResult, now: number = performance.now()): void {
    // Emergency corner abort: Looking at top corners (within 60px) cancels ongoing dwell
    const isCornerAbort =
      point.y <= 60 &&
      (point.x <= 60 || (typeof window !== 'undefined' && point.x >= window.innerWidth - 60));

    if (isCornerAbort) {
      this.dwellEngine.cancel();
      this.lastHoveredTargetId = null;
      this.currentSnappedPoint = null;
      this.blinkStartTime = null;
      this.intentionalBlinkTriggered = false;
      return;
    }

    if (this.isRestModeActive) {
      const wakeTargetId = this.findRestModeTarget(point);
      if (wakeTargetId) {
        this.computeMagneticSnap(point, wakeTargetId);
        this.dwellEngine.update(wakeTargetId, confidence, now);
      } else {
        this.currentSnappedPoint = null;
        this.dwellEngine.cancel();
      }
      return;
    }

    // 1. Robust Voronoi Nearest-Target Hit Testing (Prevents missing buttons when gaze is off by 50-150px)
    const hoveredTargetId = this.findHoveredTargetWithProximity(point);
    this.lastHoveredTargetId = hoveredTargetId;

    if (hoveredTargetId) {
      this.computeMagneticSnap(point, hoveredTargetId);
    } else {
      this.currentSnappedPoint = null;
    }

    // 2. Intentional Blink-To-Click Gesture (Close eyes for >= 420ms to select immediately)
    if (confidence.isBlinking) {
      if (this.blinkStartTime === null) {
        this.blinkStartTime = now;
        this.intentionalBlinkTriggered = false;
      }
      const blinkDuration = now - this.blinkStartTime;

      if (
        (this.selectionMethod === 'hybrid' || this.selectionMethod === 'blink') &&
        !this.intentionalBlinkTriggered &&
        blinkDuration >= this.intentionalBlinkThresholdMs &&
        blinkDuration <= 1500 &&
        hoveredTargetId
      ) {
        this.intentionalBlinkTriggered = true;
        this.handleTargetSelected(hoveredTargetId);
        this.dwellEngine.resetDwell();
        return;
      }
    } else {
      this.blinkStartTime = null;
      this.intentionalBlinkTriggered = false;
    }

    // 3. Continuous Dwell Timer Selection (if enabled)
    if (this.selectionMethod !== 'blink') {
      this.dwellEngine.update(hoveredTargetId, confidence, now);
    }
  }

  /**
   * Applies gentle magnetic attraction toward target center
   */
  private computeMagneticSnap(rawPoint: Point2D, targetId: string): void {
    const target = this.targets.get(targetId);
    if (!target || !target.element) {
      this.currentSnappedPoint = rawPoint;
      return;
    }

    const rect = target.element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = centerX - rawPoint.x;
    const dy = centerY - rawPoint.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < this.magneticSnapRadiusPx) {
      const snapFactor = Math.min(0.85, 0.40 + (1.0 - Math.min(1.0, dist / this.magneticSnapRadiusPx)) * 0.45);
      this.currentSnappedPoint = {
        x: rawPoint.x + dx * snapFactor,
        y: rawPoint.y + dy * snapFactor,
      };
    } else {
      this.currentSnappedPoint = rawPoint;
    }
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
          point.x >= rect.left - 40 &&
          point.x <= rect.right + 40 &&
          point.y >= rect.top - 40 &&
          point.y <= rect.bottom + 40
        ) {
          return id;
        }
      }
    }
    return null;
  }

  /**
   * Voronoi Proximity Hit Testing:
   * Maps gaze to the nearest interactive button edge within a generous 320px reach.
   * Eliminates the 'missed bounding box' problem of webcam eye tracking!
   */
  private findHoveredTargetWithProximity(point: Point2D): string | null {
    // If still comfortably near the active target, retain it (hysteresis)
    if (this.lastHoveredTargetId) {
      const current = this.targets.get(this.lastHoveredTargetId);
      if (current && !current.disabled && current.element) {
        if (!(current.isArticleReadingArea && this.isReadingModeActive)) {
          const rect = current.element.getBoundingClientRect();
          const dx = Math.max(rect.left - point.x, 0, point.x - rect.right);
          const dy = Math.max(rect.top - point.y, 0, point.y - rect.bottom);
          const edgeDist = Math.sqrt(dx * dx + dy * dy);
          if (edgeDist <= 160) {
            return this.lastHoveredTargetId;
          }
        }
      }
    }

    // Otherwise, search for the closest target on screen
    let closestId: string | null = null;
    let closestScore = Infinity;
    const MAX_EDGE_DISTANCE = 320; // 320px reach

    for (const [id, target] of this.targets.entries()) {
      if (target.disabled) continue;
      if (target.isArticleReadingArea && this.isReadingModeActive) continue;

      if (target.element) {
        const rect = target.element.getBoundingClientRect();
        const dx = Math.max(rect.left - point.x, 0, point.x - rect.right);
        const dy = Math.max(rect.top - point.y, 0, point.y - rect.bottom);
        const edgeDist = Math.sqrt(dx * dx + dy * dy);

        if (edgeDist <= MAX_EDGE_DISTANCE) {
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const centerDist = Math.sqrt((point.x - cx) ** 2 + (point.y - cy) ** 2);
          const score = edgeDist * 2.0 + centerDist * 0.5;

          if (score < closestScore) {
            closestScore = score;
            closestId = id;
          }
        }
      }
    }

    return closestId;
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
      // Crisp blue selection chime: C5 (523.25 Hz) -> E5 (659.25 Hz)
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
