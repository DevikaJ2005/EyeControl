/**
 * EyeTracker
 * Main coordinator for eye gaze tracking. Combines facial landmark extraction,
 * head pose estimation, gaze model inference, confidence calculation, and 1€ filtering.
 */

import { GazePrediction, EyeLandmarks, HeadPose, Point2D } from '../types/tracking';
import { FaceLandmarkerService } from '../vision/FaceLandmarker';
import { EyeFeatureExtractor } from '../vision/EyeFeatureExtractor';
import { HeadPoseEstimator } from '../vision/HeadPoseEstimator';
import { GazeModel } from './GazeModel';
import { GazeConfidence } from './GazeConfidence';
import { OneEuroFilter2D } from '../interaction/OneEuroFilter';

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
    // 30 Hz, minCutoff: 0.8 Hz (very smooth when holding gaze), beta: 0.007 (responsive during saccades)
    this.filter = new OneEuroFilter2D(30, 0.8, 0.007);
  }

  public subscribe(listener: GazeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
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

    if (!hasFace) {
      const conf = this.confidenceEstimator.evaluate(false, null, { yaw: 0, pitch: 0, roll: 0, translation: { x: 0, y: 0, z: 0 } }, null);
      const prediction: GazePrediction = {
        rawX: this.lastPrediction?.rawX ?? window.innerWidth / 2,
        rawY: this.lastPrediction?.rawY ?? window.innerHeight / 2,
        filteredX: this.lastPrediction?.filteredX ?? window.innerWidth / 2,
        filteredY: this.lastPrediction?.filteredY ?? window.innerHeight / 2,
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

    // 3. Model inference
    let rawX = window.innerWidth / 2;
    let rawY = window.innerHeight / 2;
    let normPos: Point2D | null = null;

    if (featureVector && this.gazeModel.getIsTrained()) {
      const pred = this.gazeModel.predict(featureVector);
      rawX = pred.pixel.x;
      rawY = pred.pixel.y;
      normPos = pred.normalized;
    }

    // 4. Evaluate confidence
    const confidence = this.confidenceEstimator.evaluate(
      true,
      eyeLandmarks,
      headPose,
      normPos,
      this.neutralPose
    );

    // 5. Apply OneEuroFilter only when tracking confidence is reliable
    let filteredX = rawX;
    let filteredY = rawY;

    if (confidence.isReliable) {
      const filtered = this.filter.filter(rawX, rawY, timestamp);
      filteredX = filtered.x;
      filteredY = filtered.y;
    } else if (this.lastPrediction) {
      // Freeze position when confidence is low rather than jumping wildly
      filteredX = this.lastPrediction.filteredX;
      filteredY = this.lastPrediction.filteredY;
      rawX = this.lastPrediction.rawX;
      rawY = this.lastPrediction.rawY;
    }

    const normalizedX = Math.max(0, Math.min(1.0, filteredX / window.innerWidth));
    const normalizedY = Math.max(0, Math.min(1.0, filteredY / window.innerHeight));

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
