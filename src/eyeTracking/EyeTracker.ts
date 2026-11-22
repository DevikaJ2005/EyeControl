/**
 * EyeTracker
 * Main coordinator for eye gaze tracking. Combines facial landmark extraction,
 * head pose compensation, gaze model inference, confidence calculation, and 1€ filtering.
 * Strictly checks out-of-bounds predictions and calibration validation state.
 */

import { GazePrediction, EyeLandmarks, HeadPose, Point2D, CentralBaselineData, TrackingConfigMode } from '../types/tracking';
import { FaceLandmarkerService } from '../vision/FaceLandmarker';
import { EyeFeatureExtractor } from '../vision/EyeFeatureExtractor';
import { HeadPoseEstimator } from '../vision/HeadPoseEstimator';
import { AdaptiveEyeRegionTracker } from '../vision/AdaptiveEyeRegionTracker';
import { GazeModel } from './GazeModel';
import { GazeConfidence } from './GazeConfidence';
import { OneEuroFilter2D } from '../interaction/OneEuroFilter';
import { CoordinateManager } from '../calibration/CoordinateManager';

export type GazeListener = (prediction: GazePrediction) => void;

export class EyeTracker {
  private landmarkerService: FaceLandmarkerService;
  private gazeModel: GazeModel;
  private confidenceEstimator: GazeConfidence;
  private adaptiveTracker: AdaptiveEyeRegionTracker;
  private filter: OneEuroFilter2D;
  private listeners: Set<GazeListener> = new Set();

  private isRunning: boolean = false;
  private lastPrediction: GazePrediction | null = null;
  private neutralPose: HeadPose | null = null;

  constructor(gazeModel: GazeModel, configMode: TrackingConfigMode = 'adaptive_dual_view') {
    this.landmarkerService = FaceLandmarkerService.getInstance();
    this.gazeModel = gazeModel;
    this.confidenceEstimator = new GazeConfidence();
    this.adaptiveTracker = new AdaptiveEyeRegionTracker(configMode);
    // 30 Hz, minCutoff: 0.25 Hz (rock-steady fixation), beta: 0.008 (snappy saccades), deadband: 3.5px
    this.filter = new OneEuroFilter2D(30, 0.25, 0.008, 1.0, 3.5);
  }

  public getAdaptiveTracker(): AdaptiveEyeRegionTracker {
    return this.adaptiveTracker;
  }

  public setConfigMode(mode: TrackingConfigMode): void {
    this.adaptiveTracker.setConfigMode(mode);
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

    const t0 = performance.now();
    const result = this.landmarkerService.detectVideoFrame(video, timestamp);
    const faceDetectionMs = Math.round((performance.now() - t0) * 10) / 10;
    const hasFace = !!(result && result.faceLandmarks && result.faceLandmarks.length > 0);

    const vp = CoordinateManager.getViewport();
    const defaultCenter = { x: vp.width / 2, y: vp.height / 2 };

    const isCalibrationValidated = this.gazeModel.getIsTrained() && (this.gazeModel.getLastCalibrationResult()?.passed ?? false);

    if (!hasFace) {
      this.adaptiveTracker.processFrame(null, null, video.videoWidth || 640, video.videoHeight || 480, {
        faceDetectionMs,
      });

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

    // 2. Extract eye landmarks and features with timing
    const tFv0 = performance.now();
    const eyeLandmarks = EyeFeatureExtractor.extractEyeLandmarks(landmarks);
    const featureVector = EyeFeatureExtractor.buildFeatureVector(landmarks, headPose, timestamp);
    const featureExtractionMs = Math.round((performance.now() - tFv0) * 10) / 10;

    // 3. Update Adaptive Eye-Region Tracker (dual-view pipeline)
    const adaptiveState = this.adaptiveTracker.processFrame(
      landmarks,
      headPose,
      video.videoWidth || 640,
      video.videoHeight || 480,
      { faceDetectionMs, featureExtractionMs }
    );

    // 4. Model inference in normalized coordinates
    let rawX = defaultCenter.x;
    let rawY = defaultCenter.y;
    let normPos: Point2D | null = null;

    if (featureVector && this.gazeModel.getIsTrained()) {
      const pred = this.gazeModel.predict(featureVector);
      normPos = pred.normalized;
      rawX = pred.pixel.x;
      rawY = pred.pixel.y;
    }

    // 5. Evaluate confidence with out-of-bounds rejection and validation check
    const confidence = this.confidenceEstimator.evaluate(
      true,
      eyeLandmarks,
      headPose,
      normPos,
      this.neutralPose,
      isCalibrationValidated
    );

    // In Adaptive Dual-View mode, enforce strict eye ROI reliability:
    // Suspend selection and mark unreliable if eye regions are lost or unstable
    if (this.adaptiveTracker.getConfigMode() === 'adaptive_dual_view') {
      if (!adaptiveState.isDualEyeReliable) {
        confidence.isReliable = false;
        confidence.systemStatus = 'eyes_not_detected';
        confidence.reason = adaptiveState.repositionInstruction || 'Eye region lost or obscured';
      }
    }

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
