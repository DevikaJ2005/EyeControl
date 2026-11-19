/**
 * EyeTracker
 * Main coordinator for eye gaze tracking. Combines facial landmark extraction,
 * head pose compensation, gaze model inference, confidence calculation, and 1€ filtering.
 * Strictly checks out-of-bounds predictions and calibration validation state.
 */

import { GazePrediction, EyeLandmarks, HeadPose, Point2D, CentralBaselineData } from '../types/tracking';
import { FaceLandmarkerService } from '../vision/FaceLandmarker';
import { EyeFeatureExtractor } from '../vision/EyeFeatureExtractor';
import { HeadPoseEstimator } from '../vision/HeadPoseEstimator';
import { GazeModel } from './GazeModel';
import { GazeConfidence } from './GazeConfidence';
import { OneEuroFilter2D } from '../interaction/OneEuroFilter';
import { CoordinateManager } from '../calibration/CoordinateManager';

export type GazeListener = (prediction: GazePrediction) => void;

export class EyeTracker {
  private landmarkerService: FaceLandmarkerService;
  private gazeModel: GazeModel;
  private confidenceEstimator: GazeConfidence;
  private filter: OneEuroFilter2D;
  private listeners: Set<GazeListener> = new Set();

  private isRunning: boolean = false;
  private lastPrediction: GazePrediction | null = null;
  private neutralPose: HeadPose | null = null;

  constructor(gazeModel: GazeModel) {
    this.landmarkerService = FaceLandmarkerService.getInstance();
    this.gazeModel = gazeModel;
    this.confidenceEstimator = new GazeConfidence();
    // 30 Hz, minCutoff: 0.8 Hz (steady when holding gaze), beta: 0.007 (snappy saccades)
    this.filter = new OneEuroFilter2D(30, 0.8, 0.007);
  }

  public subscribe(listener: GazeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public setCentralBaseline(baseline: CentralBaselineData | null): void {
    this.gazeModel.setCentralBaseline(baseline);
    if (baseline) {
      this.neutralPose = {
        yaw: baseline.neutralYaw,
        pitch: baseline.neutralPitch,
        roll: baseline.neutralRoll,
        translation: { x: baseline.neutralFaceCenter.x, y: baseline.neutralFaceCenter.y, z: 0 },
      };
    }
  }

  public setNeutralPose(pose: HeadPose | null): void {
    this.neutralPose = pose;
  }

  public start(): void {
    this.isRunning = true;
    this.filter.reset();
  }

  public stop(): void {
    this.isRunning = false;
    this.filter.reset();
    this.lastPrediction = null;
  }

  /**
   * Process a single video frame and compute gaze prediction
   */
  public processFrame(video: HTMLVideoElement, timestamp: number): GazePrediction | null {
    if (!this.isRunning) return null;

    const result = this.landmarkerService.detectVideoFrame(video, timestamp);
    const hasFace = !!(result && result.faceLandmarks && result.faceLandmarks.length > 0);

    const vp = CoordinateManager.getViewport();
    const defaultCenter = { x: vp.width / 2, y: vp.height / 2 };

    const isCalibrationValidated = this.gazeModel.getIsTrained() && (this.gazeModel.getLastCalibrationResult()?.passed ?? false);

    if (!hasFace) {
      const conf = this.confidenceEstimator.evaluate(
        false,
        null,
        { yaw: 0, pitch: 0, roll: 0, translation: { x: 0, y: 0, z: 0 } },
        null,
        this.neutralPose,
        isCalibrationValidated
      );

      const prediction: GazePrediction = {
        rawX: this.lastPrediction?.rawX ?? defaultCenter.x,
        rawY: this.lastPrediction?.rawY ?? defaultCenter.y,
        filteredX: this.lastPrediction?.filteredX ?? defaultCenter.x,
        filteredY: this.lastPrediction?.filteredY ?? defaultCenter.y,
        normalizedX: this.lastPrediction?.normalizedX ?? 0.5,
        normalizedY: this.lastPrediction?.normalizedY ?? 0.5,
        confidence: conf,
        timestamp,
      };
      this.notify(prediction);
      return prediction;
    }

    const landmarks = result.faceLandmarks[0];
    const matrix = result.facialTransformationMatrixes?.[0]?.data;

    // 1. Estimate head pose
    const headPose = HeadPoseEstimator.estimate(landmarks, matrix);

    // 2. Extract eye landmarks and features
    const eyeLandmarks = EyeFeatureExtractor.extractEyeLandmarks(landmarks);
    const featureVector = EyeFeatureExtractor.buildFeatureVector(landmarks, headPose, timestamp);

    // 3. Model inference in normalized coordinates
    let rawX = defaultCenter.x;
    let rawY = defaultCenter.y;
    let normPos: Point2D | null = null;

    if (featureVector && this.gazeModel.getIsTrained()) {
      const pred = this.gazeModel.predict(featureVector);
      normPos = pred.normalized;
      rawX = pred.pixel.x;
      rawY = pred.pixel.y;
    }

    // 4. Evaluate confidence with out-of-bounds rejection and validation check
    const confidence = this.confidenceEstimator.evaluate(
      true,
      eyeLandmarks,
      headPose,
      normPos,
      this.neutralPose,
      isCalibrationValidated
    );

    // 5. Apply OneEuroFilter only when tracking is reliable and within bounds
    let filteredX = rawX;
    let filteredY = rawY;

    if (confidence.isReliable) {
      const filtered = this.filter.filter(rawX, rawY, timestamp);
      filteredX = filtered.x;
      filteredY = filtered.y;
    } else if (this.lastPrediction) {
      // Freeze position when confidence is low or out of bounds rather than jumping wildly
      filteredX = this.lastPrediction.filteredX;
      filteredY = this.lastPrediction.filteredY;
      rawX = this.lastPrediction.rawX;
      rawY = this.lastPrediction.rawY;
    }

    const normalizedX = vp.width > 0 ? filteredX / vp.width : 0.5;
    const normalizedY = vp.height > 0 ? filteredY / vp.height : 0.5;

    const prediction: GazePrediction = {
      rawX,
      rawY,
      filteredX,
      filteredY,
      normalizedX,
      normalizedY,
      confidence,
      timestamp,
    };

    this.lastPrediction = prediction;
    this.notify(prediction);
    return prediction;
  }

  public getLastPrediction(): GazePrediction | null {
    return this.lastPrediction;
  }

  private notify(prediction: GazePrediction): void {
    for (const listener of this.listeners) {
      listener(prediction);
    }
  }
}
