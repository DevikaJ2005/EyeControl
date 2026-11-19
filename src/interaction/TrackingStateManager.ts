/**
 * TrackingStateManager
 * Global state coordinator for active tracking mode, pause/resume, and accessibility states.
 */

import { InputMode, GazePrediction } from '../types/tracking';

export interface TrackingState {
  mode: InputMode;
  isPaused: boolean;
  isResting: boolean;
  isReadingMode: boolean;
  isCameraActive: boolean;
  hasCalibratedEye: boolean;
  hasCalibratedHead: boolean;
  currentPrediction: GazePrediction | null;
}

export type TrackingStateListener = (state: TrackingState) => void;

export class TrackingStateManager {
  private static instance: TrackingStateManager | null = null;

  private state: TrackingState = {
    mode: 'eye',
    isPaused: false,
    isResting: false,
    isReadingMode: false,
    isCameraActive: false,
    hasCalibratedEye: false,
    hasCalibratedHead: false,
    currentPrediction: null,
  };

  private listeners: Set<TrackingStateListener> = new Set();

  public static getInstance(): TrackingStateManager {
    if (!TrackingStateManager.instance) {
      TrackingStateManager.instance = new TrackingStateManager();
    }
    return TrackingStateManager.instance;
  }

  public subscribe(listener: TrackingStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  public getState(): TrackingState {
    return { ...this.state };
  }

  public setMode(mode: InputMode): void {
    this.state.mode = mode;
    this.notify();
  }

  public setPaused(paused: boolean): void {
    this.state.isPaused = paused;
    this.notify();
  }

  public setResting(resting: boolean): void {
    this.state.isResting = resting;
    this.notify();
  }

  public setReadingMode(reading: boolean): void {
    this.state.isReadingMode = reading;
    this.notify();
  }

  public setCameraActive(active: boolean): void {
    this.state.isCameraActive = active;
    this.notify();
  }

  public setHasCalibratedEye(calibrated: boolean): void {
    this.state.hasCalibratedEye = calibrated;
    this.notify();
  }

  public setHasCalibratedHead(calibrated: boolean): void {
    this.state.hasCalibratedHead = calibrated;
    this.notify();
  }

  public updatePrediction(prediction: GazePrediction): void {
    this.state.currentPrediction = prediction;
    this.notify();
  }

  private notify(): void {
    const s = this.getState();
    for (const l of this.listeners) {
      l(s);
    }
  }
}
