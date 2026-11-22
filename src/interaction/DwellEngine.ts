/**
 * DwellEngine
 * Manages dwell-based selection logic with:
 * - Adaptive Dwell: 350ms grace period for natural micro-saccades / jitter
 * - Smooth progress decay instead of abrupt resets
 * - Confidence-gating and rearming locks to prevent accidental repeat clicks
 */

import { DwellConfig, DwellState, GazeConfidenceResult } from '../types/tracking';

export interface DwellProgressUpdate {
  targetId: string | null;
  progress: number; // 0.0 to 1.0
  state: DwellState;
}

export type DwellListener = (update: DwellProgressUpdate) => void;

export interface AdaptiveDwellConfig extends DwellConfig {
  gracePeriodMs: number; // Tolerance period before decaying progress (default 350ms)
  decayRatePerSec: number; // Rate at which progress decays if gaze remains away (default 1.5/s)
}

export class DwellEngine {
  private config: AdaptiveDwellConfig = {
    dwellTimeMs: 1400, // 1.4 seconds comfortable default
    rearmDelayMs: 600,
    activationRadiusPx: 48,
    gracePeriodMs: 350,
    decayRatePerSec: 1.5,
  };

  private currentTargetId: string | null = null;
  private dwellStartTime: number = 0;
  private state: DwellState = 'idle';
  private selectedTargetId: string | null = null; // Locked until gaze departs
  private listeners: Set<DwellListener> = new Set();
  private onSelectCallback?: (targetId: string) => void;

  // Adaptive Grace Period State
  private lastLeaveTime: number = 0;
  private savedProgress: number = 0;
  private isDuringGracePeriod: boolean = false;

  constructor(config?: Partial<AdaptiveDwellConfig>, onSelect?: (targetId: string) => void) {
    if (config) this.config = { ...this.config, ...config };
    if (onSelect) this.onSelectCallback = onSelect;
  }

  public setDwellDuration(durationMs: number): void {
    this.config.dwellTimeMs = Math.max(600, Math.min(3500, durationMs));
  }

  public getDwellDuration(): number {
    return this.config.dwellTimeMs;
  }

  public setGracePeriod(graceMs: number): void {
    this.config.gracePeriodMs = Math.max(0, Math.min(1000, graceMs));
  }

  public setOnSelect(cb: (targetId: string) => void): void {
    this.onSelectCallback = cb;
  }

  public subscribe(listener: DwellListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Update dwell state with current gaze position and detected hovered target
   */
  public update(
    hoveredTargetId: string | null,
    confidence: GazeConfidenceResult,
    now: number = performance.now()
  ): void {
    // 1. If tracking confidence is lost, face lost, or out of bounds: cancel immediately for safety
    if (!confidence.isReliable || confidence.isFaceLost || confidence.isOutOfBounds) {
      this.resetDwell();
      return;
    }

    // 2. If user is blinking: natural blinks last 100-250ms, pause without resetting
    if (confidence.isBlinking) {
      return;
    }

    // 3. If no target is hovered (gaze departed or micro-saccade)
    if (!hoveredTargetId) {
      if (this.state === 'rearming') {
        // Gaze has departed the locked target; release rearm lock
        this.selectedTargetId = null;
        this.currentTargetId = null;
        this.state = 'idle';
        this.isDuringGracePeriod = false;
        return;
      }

      if (this.state === 'dwelling' && this.currentTargetId !== null) {
        if (this.config.gracePeriodMs <= 0) {
          this.resetDwell();
          return;
        }

        if (!this.isDuringGracePeriod) {
          // Enter grace period: pause dwell progress, do NOT reset immediately!
          this.isDuringGracePeriod = true;
          this.lastLeaveTime = now;
        } else {
          const timeAway = now - this.lastLeaveTime;
          if (timeAway > this.config.gracePeriodMs) {
            // Decay progress smoothly
            const decayElapsedSec = (timeAway - this.config.gracePeriodMs) / 1000;
            const decayedProgress = Math.max(0, this.savedProgress - decayElapsedSec * this.config.decayRatePerSec);
            this.notifyProgress(decayedProgress);

            if (decayedProgress <= 0) {
              this.resetDwell();
            }
          }
        }
      }
      return;
    }

    // 4. User is hovering a target
    if (hoveredTargetId === this.currentTargetId) {
      if (this.state === 'rearming') {
        // Still looking at target that just fired; keep locked out
        return;
      }

      if (this.isDuringGracePeriod) {
        // Returned to the same target within grace period!
        // Adjust dwellStartTime so progress resumes seamlessly
        const elapsedSoFar = this.savedProgress * this.config.dwellTimeMs;
        this.dwellStartTime = now - elapsedSoFar;
        this.isDuringGracePeriod = false;
        this.lastLeaveTime = 0;
      }

      if (this.state === 'dwelling') {
        const elapsed = now - this.dwellStartTime;
        const progress = Math.min(1.0, elapsed / this.config.dwellTimeMs);
        this.savedProgress = progress;
        this.notifyProgress(progress);

        if (progress >= 1.0) {
          // Trigger activation
          this.state = 'selected';
          this.selectedTargetId = hoveredTargetId;
          this.onSelectCallback?.(hoveredTargetId);
          this.notifyProgress(1.0);

          // Transition to rearming state: prevents repeat clicks until gaze leaves
          this.state = 'rearming';
          this.isDuringGracePeriod = false;
        }
      }
      return;
    }

    // 5. Target changed to a different target (or from null / idle)
    this.currentTargetId = hoveredTargetId;
    this.isDuringGracePeriod = false;
    this.lastLeaveTime = 0;

    if (this.selectedTargetId === hoveredTargetId) {
      // Still over the target that just fired
      this.state = 'rearming';
      this.savedProgress = 0;
      this.notifyProgress(0);
    } else {
      // Fresh new target
      this.selectedTargetId = null;
      this.dwellStartTime = now;
      this.savedProgress = 0;
      this.state = 'dwelling';
      this.notifyProgress(0);
    }
  }

  public resetDwell(): void {
    this.currentTargetId = null;
    this.state = 'idle';
    this.dwellStartTime = 0;
    this.savedProgress = 0;
    this.isDuringGracePeriod = false;
    this.lastLeaveTime = 0;
    this.notifyProgress(0);
  }

  public cancel(): void {
    this.resetDwell();
    this.selectedTargetId = null;
  }

  private notifyProgress(progress: number): void {
    const update: DwellProgressUpdate = {
      targetId: this.currentTargetId,
      progress,
      state: this.state,
    };
    for (const listener of this.listeners) {
      listener(update);
    }
  }
}
