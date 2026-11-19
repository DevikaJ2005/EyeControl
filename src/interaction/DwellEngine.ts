/**
 * DwellEngine
 * Manages dwell-based selection logic with progress calculations,
 * stability tracking, confidence-gating, and accidental re-selection protection.
 */

import { DwellConfig, DwellState, Point2D, GazeConfidenceResult } from '../types/tracking';

export interface DwellProgressUpdate {
  targetId: string | null;
  progress: number; // 0.0 to 1.0
  state: DwellState;
}

export type DwellListener = (update: DwellProgressUpdate) => void;

export class DwellEngine {
  private config: DwellConfig = {
    dwellTimeMs: 1500, // 1.5 seconds default
    rearmDelayMs: 600,
    activationRadiusPx: 40,
  };

  private currentTargetId: string | null = null;
  private dwellStartTime: number = 0;
  private state: DwellState = 'idle';
  private selectedTargetId: string | null = null; // Target that just fired; must leave before rearming
  private listeners: Set<DwellListener> = new Set();
  private onSelectCallback?: (targetId: string) => void;

  constructor(config?: Partial<DwellConfig>, onSelect?: (targetId: string) => void) {
    if (config) this.config = { ...this.config, ...config };
    if (onSelect) this.onSelectCallback = onSelect;
  }

  public setDwellDuration(durationMs: number): void {
    this.config.dwellTimeMs = Math.max(800, Math.min(4000, durationMs));
  }

  public getDwellDuration(): number {
    return this.config.dwellTimeMs;
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
    // 1. If confidence is lost or user is blinking, suspend/cancel ongoing dwell
    if (!confidence.isReliable || confidence.isBlinking || confidence.isFaceLost) {
      if (this.state === 'dwelling') {
        this.resetDwell();
      }
      return;
    }

    // 2. If no target is hovered
    if (!hoveredTargetId) {
      if (this.currentTargetId !== null) {
        // User looked away: clear previous selection lock and reset
        this.selectedTargetId = null;
        this.resetDwell();
      }
      return;
    }

    // 3. If target changed
    if (hoveredTargetId !== this.currentTargetId) {
      this.currentTargetId = hoveredTargetId;

      // If user moved to a new target, clear lock from previous target
      if (this.selectedTargetId !== hoveredTargetId) {
        this.selectedTargetId = null;
        this.dwellStartTime = now;
        this.state = 'dwelling';
        this.notifyProgress(0);
      } else {
        // User is still over the locked target they just activated
        this.state = 'rearming';
        this.notifyProgress(0);
        return;
      }
    }

    // 4. Currently dwelling on target
    if (this.state === 'dwelling') {
      const elapsed = now - this.dwellStartTime;
      const progress = Math.min(1.0, elapsed / this.config.dwellTimeMs);

      this.notifyProgress(progress);

      if (progress >= 1.0) {
        // Trigger activation
        this.state = 'selected';
        this.selectedTargetId = hoveredTargetId;
        this.onSelectCallback?.(hoveredTargetId);
        this.notifyProgress(1.0);

        // Transition to rearming state: prevents repeat clicks until gaze leaves
        this.state = 'rearming';
      }
    }
  }

  public resetDwell(): void {
    this.currentTargetId = null;
    this.state = 'idle';
    this.dwellStartTime = 0;
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
