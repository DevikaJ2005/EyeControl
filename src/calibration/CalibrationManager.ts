/**
 * CalibrationManager
 * Manages calibration sequence, target transitions, training, and independent validation.
 */

import { CalibrationTarget, CalibrationSample, CalibrationResult, EyeFeatureVector } from '../types/tracking';
import { CalibrationPoints } from './CalibrationPoints';
import { SampleCollector } from './SampleCollector';
import { GazeModel } from '../eyeTracking/GazeModel';
import { CalibrationValidator } from './CalibrationValidator';

export type CalibrationStep = 'idle' | 'countdown' | 'calibrating' | 'validating' | 'completed' | 'failed';

export interface CalibrationState {
  step: CalibrationStep;
  currentTarget: CalibrationTarget | null;
  targetIndex: number;
  totalTargets: number;
  targetProgress: number; // 0 to 1
  overallProgress: number; // 0 to 1
  result: CalibrationResult | null;
  statusMessage: string;
}

export type CalibrationStateListener = (state: CalibrationState) => void;

export class CalibrationManager {
  private gazeModel: GazeModel;
  private collector: SampleCollector;
  private trainTargets: CalibrationTarget[] = [];
  private validationTargets: CalibrationTarget[] = [];
  private allTrainSamples: CalibrationSample[] = [];
  private allValSamples: CalibrationSample[] = [];

  private currentTargetIndex: number = 0;
  private step: CalibrationStep = 'idle';
  private statusMessage: string = 'Ready to calibrate';
  private result: CalibrationResult | null = null;
  private method: '9-point' | '17-point' = '9-point';

  private listeners: Set<CalibrationStateListener> = new Set();

  constructor(gazeModel: GazeModel) {
    this.gazeModel = gazeModel;
    this.collector = new SampleCollector();
  }

  public subscribe(listener: CalibrationStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  public getState(): CalibrationState {
    const total = this.step === 'validating' ? this.validationTargets.length : this.trainTargets.length;
    const currentTarget = this.collector.getCurrentTarget();
    const targetProgress = this.collector.getProgress();

    let overallProgress = 0;
    if (this.step === 'calibrating') {
      const completed = this.currentTargetIndex;
      overallProgress = (completed + targetProgress) / (this.trainTargets.length + this.validationTargets.length);
    } else if (this.step === 'validating') {
      const trainTotal = this.trainTargets.length;
      const completedVal = this.currentTargetIndex;
      overallProgress = (trainTotal + completedVal + targetProgress) / (trainTotal + this.validationTargets.length);
    } else if (this.step === 'completed') {
      overallProgress = 1.0;
    }

    return {
      step: this.step,
      currentTarget,
      targetIndex: this.currentTargetIndex + 1,
      totalTargets: total,
      targetProgress,
      overallProgress,
      result: this.result,
      statusMessage: this.statusMessage,
    };
  }

  /**
   * Start calibration workflow
   */
  public start(screenWidth: number, screenHeight: number, method: '9-point' | '17-point' = '9-point'): void {
    this.method = method;
    this.allTrainSamples = [];
    this.allValSamples = [];
    this.result = null;

    if (method === '17-point') {
      const grid = CalibrationPoints.get17PointGrid(screenWidth, screenHeight);
      this.trainTargets = grid.trainTargets;
      this.validationTargets = grid.validationTargets;
    } else {
      const grid = CalibrationPoints.get9PointGrid(screenWidth, screenHeight);
      this.trainTargets = grid.trainTargets;
      this.validationTargets = grid.validationTargets;
    }

    this.currentTargetIndex = 0;
    this.step = 'calibrating';
    this.statusMessage = 'Look steadily at the circle until it fills';

    this.collector.startTarget(this.trainTargets[0], 18);
    this.notify();
  }

  /**
   * Feed a new camera frame feature vector into calibration manager
   */
  public processFeatureVector(features: EyeFeatureVector, screenWidth: number, screenHeight: number): void {
    if (this.step !== 'calibrating' && this.step !== 'validating') {
      return;
    }

    const isTargetDone = this.collector.addSample(features);

    if (isTargetDone) {
      const collected = this.collector.getCollectedSamples();

      if (this.step === 'calibrating') {
        this.allTrainSamples.push(...collected);
        this.currentTargetIndex++;

        if (this.currentTargetIndex < this.trainTargets.length) {
          // Move to next training target
          this.collector.startTarget(this.trainTargets[this.currentTargetIndex], 18);
        } else {
          // All training targets done! Switch to validation targets
          this.step = 'validating';
          this.currentTargetIndex = 0;
          this.statusMessage = 'Validating tracking accuracy... Keep looking at the target';
          this.collector.startTarget(this.validationTargets[0], 12);
        }
      } else if (this.step === 'validating') {
        this.allValSamples.push(...collected);
        this.currentTargetIndex++;

        if (this.currentTargetIndex < this.validationTargets.length) {
          this.collector.startTarget(this.validationTargets[this.currentTargetIndex], 12);
        } else {
          // Calibration + Validation complete! Fit model.
          this.finishCalibration(screenWidth, screenHeight);
        }
      }
    }

    this.notify();
  }

  private finishCalibration(screenWidth: number, screenHeight: number): void {
    this.collector.reset();
    try {
      this.statusMessage = 'Computing personalized gaze model...';
      this.notify();

      const result = this.gazeModel.train(
        this.allTrainSamples,
        this.allValSamples,
        screenWidth,
        screenHeight,
        this.method
      );

      this.result = result;

      if (result.passed) {
        this.step = 'completed';
        this.statusMessage = `Calibration successful! Accuracy: ${result.overallAccuracyPercentage}% (Error: ${result.meanValidationPixelError}px)`;
      } else {
        this.step = 'failed';
        this.statusMessage = `Calibration needs adjustment (${result.overallAccuracyPercentage}% accuracy). Extended 17-point calibration recommended.`;
      }
    } catch (err) {
      console.error('Calibration fit failed:', err);
      this.step = 'failed';
      this.statusMessage = 'Model fitting error. Please ensure stable lighting and try again.';
    }
    this.notify();
  }

  public cancel(): void {
    this.step = 'idle';
    this.collector.reset();
    this.statusMessage = 'Calibration cancelled';
    this.notify();
  }

  private notify(): void {
    const state = this.getState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }
}
