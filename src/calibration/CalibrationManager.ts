/**
 * CalibrationManager
 * Coordinates sequential calibration workflow:
 * Step A (Camera Positioning) -> Step B (Central Baseline) -> Step C (9-Point Calibration)
 * -> Step D (LOOCV Model Fitting) -> Step E (Independent 5-Point Validation).
 * Supports manual pause, retry, and advance for caregivers / testers.
 */

import {
  CalibrationTarget,
  CalibrationSample,
  CalibrationResult,
  EyeFeatureVector,
  CentralBaselineData,
  Point2D,
} from '../types/tracking';
import { CalibrationPoints } from './CalibrationPoints';
import { SampleCollector } from './SampleCollector';
import { GazeModel } from '../eyeTracking/GazeModel';
import { CoordinateManager } from './CoordinateManager';

export type CalibrationWorkflowStep =
  | 'idle'
  | 'positioning'
  | 'baseline'
  | 'calibrating'
  | 'fitting'
  | 'validating'
  | 'completed'
  | 'failed';

export interface CalibrationState {
  step: CalibrationWorkflowStep;
  currentTarget: CalibrationTarget | null;
  targetIndex: number;
  totalTargets: number;
  targetProgress: number; // 0 to 1
  overallProgress: number; // 0 to 1
  result: CalibrationResult | null;
  statusMessage: string;
  isPaused: boolean;
  centralBaseline: CentralBaselineData | null;
}

export type CalibrationStateListener = (state: CalibrationState) => void;

export class CalibrationManager {
  private gazeModel: GazeModel;
  private collector: SampleCollector;

  private baselineTarget: CalibrationTarget | null = null;
  private trainTargets: CalibrationTarget[] = [];
  private validationTargets: CalibrationTarget[] = [];

  private baselineSamples: EyeFeatureVector[] = [];
  private centralBaseline: CentralBaselineData | null = null;

  private allTrainSamples: CalibrationSample[] = [];
  private allValSamples: CalibrationSample[] = [];

  private currentTargetIndex: number = 0;
  private step: CalibrationWorkflowStep = 'idle';
  private statusMessage: string = 'Ready to begin calibration';
  private result: CalibrationResult | null = null;
  private method: '9-point' | '17-point' = '9-point';
  private isPaused: boolean = false;

  private screenWidth: number = 1920;
  private screenHeight: number = 1080;

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
    const targetProgress = this.collector.getProgress();

    let total = 0;
    let currentIdx = 0;
    let overallProgress = 0;

    if (this.step === 'baseline') {
      total = 1;
      currentIdx = 1;
      overallProgress = 0.05 + targetProgress * 0.15;
    } else if (this.step === 'calibrating') {
      total = this.trainTargets.length;
      currentIdx = this.currentTargetIndex + 1;
      const trainTotal = this.trainTargets.length;
      overallProgress = 0.20 + ((this.currentTargetIndex + targetProgress) / trainTotal) * 0.50;
    } else if (this.step === 'fitting') {
      total = this.trainTargets.length;
      currentIdx = this.trainTargets.length;
      overallProgress = 0.72;
    } else if (this.step === 'validating') {
      total = this.validationTargets.length;
      currentIdx = this.currentTargetIndex + 1;
      const valTotal = this.validationTargets.length;
      overallProgress = 0.75 + ((this.currentTargetIndex + targetProgress) / valTotal) * 0.25;
    } else if (this.step === 'completed') {
      overallProgress = 1.0;
    }

    return {
      step: this.step,
      currentTarget: this.collector.getCurrentTarget(),
      targetIndex: currentIdx,
      totalTargets: total,
      targetProgress,
      overallProgress: Math.min(1.0, overallProgress),
      result: this.result,
      statusMessage: this.statusMessage,
      isPaused: this.isPaused,
      centralBaseline: this.centralBaseline,
    };
  }

  /**
   * Start guided calibration sequence
   */
  public start(screenWidth: number, screenHeight: number, method: '9-point' | '17-point' = '9-point'): void {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.method = method;

    this.allTrainSamples = [];
    this.allValSamples = [];
    this.baselineSamples = [];
    this.centralBaseline = null;
    this.result = null;
    this.isPaused = false;

    const grid = CalibrationPoints.get9PointGrid(screenWidth, screenHeight);
    this.baselineTarget = grid.baselineTarget;
    this.trainTargets = grid.trainTargets;
    this.validationTargets = grid.validationTargets;

    // STEP B: Start Central Baseline acquisition (3.5 seconds = 35 frames)
    this.step = 'baseline';
    this.statusMessage = 'Step 1/3: Look comfortably at the central circle to set your baseline';
    this.collector.startTarget(this.baselineTarget, 30, 1000);
    this.notify();
  }

  /**
   * Process a camera feature vector during active calibration or validation
   */
  public processFeatureVector(features: EyeFeatureVector, screenWidth: number, screenHeight: number): void {
    if (this.isPaused) return;

    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;

    if (this.step === 'baseline') {
      // Accumulate raw frames for central baseline estimation
      this.baselineSamples.push(features);
      const isDone = this.collector.addSample(features);

      if (isDone) {
        this.finishCentralBaseline();
      }
      this.notify();
      return;
    }

    if (this.step === 'calibrating') {
      const isDone = this.collector.addSample(features);
      if (isDone) {
        // Collect samples from this target
        const samples = this.collector.getCollectedSamples();
        this.allTrainSamples.push(...samples);

        this.currentTargetIndex++;
        if (this.currentTargetIndex < this.trainTargets.length) {
          // Advance to next calibration target
          const nextTarget = this.trainTargets[this.currentTargetIndex];
          this.statusMessage = `Target ${this.currentTargetIndex + 1} of ${this.trainTargets.length}: Look at the circle`;
          this.collector.startTarget(nextTarget, 20, 1000);
        } else {
          // All 9 training targets collected! Proceed to model fitting & LOOCV
          this.fitModelAndStartValidation();
        }
      }
      this.notify();
      return;
    }

    if (this.step === 'validating') {
      const isDone = this.collector.addSample(features);
      if (isDone) {
        const samples = this.collector.getCollectedSamples();
        this.allValSamples.push(...samples);

        this.currentTargetIndex++;
        if (this.currentTargetIndex < this.validationTargets.length) {
          const nextValTarget = this.validationTargets[this.currentTargetIndex];
          this.statusMessage = `Validating ${this.currentTargetIndex + 1} of ${this.validationTargets.length}: Keep looking steadily`;
          this.collector.startTarget(nextValTarget, 16, 800);
        } else {
          // Independent validation complete! Compute final metrics.
          this.finishValidation();
        }
      }
      this.notify();
      return;
    }
  }

  private finishCentralBaseline(): void {
    if (this.baselineSamples.length === 0) return;

    // Calculate median neutral head pose and iris positions
    const yaws = this.baselineSamples.map(s => s.headYaw).sort((a, b) => a - b);
    const pitches = this.baselineSamples.map(s => s.headPitch).sort((a, b) => a - b);
    const rolls = this.baselineSamples.map(s => s.headRoll).sort((a, b) => a - b);
    const leftIrisXs = this.baselineSamples.map(s => s.leftIrisX).sort((a, b) => a - b);
    const leftIrisYs = this.baselineSamples.map(s => s.leftIrisY).sort((a, b) => a - b);
    const rightIrisXs = this.baselineSamples.map(s => s.rightIrisX).sort((a, b) => a - b);
    const rightIrisYs = this.baselineSamples.map(s => s.rightIrisY).sort((a, b) => a - b);

    const mid = Math.floor(this.baselineSamples.length / 2);

    this.centralBaseline = {
      neutralYaw: yaws[mid],
      neutralPitch: pitches[mid],
      neutralRoll: rolls[mid],
      neutralLeftIris: { x: leftIrisXs[mid], y: leftIrisYs[mid] },
      neutralRightIris: { x: rightIrisXs[mid], y: rightIrisYs[mid] },
      neutralFaceCenter: { x: 0.5, y: 0.5 },
      collectedAt: Date.now(),
    };

    this.gazeModel.setCentralBaseline(this.centralBaseline);

    // Transition to Step C: 9-Point Calibration
    this.step = 'calibrating';
    this.currentTargetIndex = 0;
    this.statusMessage = 'Step 2/3: 9-Point Calibration. Look at each circle as it appears.';
    this.collector.startTarget(this.trainTargets[0], 20, 1000);
  }

  private fitModelAndStartValidation(): void {
    this.step = 'fitting';
    this.statusMessage = 'Computing best gaze model using Cross-Validation...';
    this.notify();

    // Fit model on training samples
    try {
      this.gazeModel.train(
        this.allTrainSamples,
        [], // Empty validation targets during initial fitting
        this.screenWidth,
        this.screenHeight,
        this.method
      );

      // Transition to Step E: Independent 5-Point Validation
      this.step = 'validating';
      this.currentTargetIndex = 0;
      this.statusMessage = 'Step 3/3: Independent Validation. Look at each validation target.';
      this.collector.startTarget(this.validationTargets[0], 16, 800);
    } catch (err) {
      console.error('Model fitting failed:', err);
      this.step = 'failed';
      this.statusMessage = 'Calibration failed during model fitting. Please try again with steady lighting.';
    }
    this.notify();
  }

  private finishValidation(): void {
    try {
      // Re-run evaluation with collected held-out validation samples
      const finalResult = this.gazeModel.train(
        this.allTrainSamples,
        this.allValSamples,
        this.screenWidth,
        this.screenHeight,
        this.method
      );

      this.result = finalResult;

      if (finalResult.passed) {
        this.step = 'completed';
        this.statusMessage = `Calibration Passed! Validation Accuracy: ${finalResult.overallAccuracyPercentage}% (Mean Error: ${finalResult.meanValidationPixelError} px)`;
      } else {
        this.step = 'failed';
        this.statusMessage = `Calibration needs adjustment (${finalResult.overallAccuracyPercentage}% accuracy, ${finalResult.meanValidationPixelError} px error). Please recalibrate.`;
      }
    } catch (err) {
      console.error('Validation computation error:', err);
      this.step = 'failed';
      this.statusMessage = 'Validation calculation error. Please retry.';
    }
    this.notify();
  }

  /**
   * Caregiver / Tester Controls: Pause or Resume
   */
  public togglePause(): void {
    this.isPaused = !this.isPaused;
    this.collector.setPaused(this.isPaused);
    this.statusMessage = this.isPaused ? 'Calibration Paused' : 'Calibration Resumed';
    this.notify();
  }

  /**
   * Caregiver / Tester Controls: Retry current target
   */
  public retryCurrentTarget(): void {
    if (this.step === 'baseline' && this.baselineTarget) {
      this.baselineSamples = [];
      this.collector.startTarget(this.baselineTarget, 30, 1000);
      this.statusMessage = 'Retrying central baseline fixation...';
    } else if (this.step === 'calibrating') {
      const cur = this.trainTargets[this.currentTargetIndex];
      this.collector.startTarget(cur, 20, 1000);
      this.statusMessage = `Retrying Target ${this.currentTargetIndex + 1}...`;
    } else if (this.step === 'validating') {
      const cur = this.validationTargets[this.currentTargetIndex];
      this.collector.startTarget(cur, 16, 800);
      this.statusMessage = `Retrying Validation Target ${this.currentTargetIndex + 1}...`;
    }
    this.notify();
  }

  /**
   * Caregiver / Tester Controls: Advance manually to next target
   */
  public advanceTarget(): void {
    if (this.step === 'baseline') {
      this.finishCentralBaseline();
    } else if (this.step === 'calibrating') {
      const samples = this.collector.getCollectedSamples();
      if (samples.length > 0) this.allTrainSamples.push(...samples);

      this.currentTargetIndex++;
      if (this.currentTargetIndex < this.trainTargets.length) {
        this.collector.startTarget(this.trainTargets[this.currentTargetIndex], 20, 1000);
      } else {
        this.fitModelAndStartValidation();
      }
    } else if (this.step === 'validating') {
      const samples = this.collector.getCollectedSamples();
      if (samples.length > 0) this.allValSamples.push(...samples);

      this.currentTargetIndex++;
      if (this.currentTargetIndex < this.validationTargets.length) {
        this.collector.startTarget(this.validationTargets[this.currentTargetIndex], 16, 800);
      } else {
        this.finishValidation();
      }
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
