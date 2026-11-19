/**
 * HeadTracker
 * Independent head-movement tracking coordinator.
 * Operates purely on facial pose geometry without mixing with eye gaze algorithms.
 */

import { GazePrediction, HeadPose, HeadNeutralPose, GazeConfidenceResult, Point2D } from '../types/tracking';
import { FaceLandmarkerService } from '../vision/FaceLandmarker';
import { HeadPoseEstimator } from '../vision/HeadPoseEstimator';
import { HeadPointer } from './HeadPointer';
import { HeadCalibration } from './HeadCalibration';
import { OneEuroFilter2D } from '../interaction/OneEuroFilter';

export type HeadTrackingListener = (prediction: GazePrediction) => void;

export class HeadTracker {
  private landmarkerService: FaceLandmarkerService;
  private pointer: HeadPointer;
  private calibration: HeadCalibration;
  private filter: OneEuroFilter2D;
  private listeners: Set<HeadTrackingListener> = new Set();

  private isRunning: boolean = false;
  private neutralPose: HeadNeutralPose | null = null;
  private lastPrediction: GazePrediction | null = null;

  constructor() {
    this.landmarkerService = FaceLandmarkerService.getInstance();
    this.pointer = new HeadPointer();
    this.calibration = new HeadCalibration();
    // 30 Hz, minCutoff: 0.6 Hz (steady cursor), beta: 0.005 (smooth head sweeps)
    this.filter = new OneEuroFilter2D(30, 0.6, 0.005);
  }

  public subscribe(listener: HeadTrackingListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public setSensitivity(factor: number): void {
    this.pointer.setSensitivity(factor);
  }

  public setNeutralPose(pose: HeadNeutralPose): void {
    this.neutralPose = pose;
    this.pointer.setNeutralPose(pose);
  }

  public getNeutralPose(): HeadNeutralPose | null {
    return this.neutralPose;
  }

  public getCalibration(): HeadCalibration {
    return this.calibration;
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
   * Process a single video frame for head tracking
   */
  public processFrame(video: HTMLVideoElement, timestamp: number): GazePrediction | null {
    if (!this.isRunning) return null;

    const result = this.landmarkerService.detectVideoFrame(video, timestamp);
    const hasFace = !!(result && result.faceLandmarks && result.faceLandmarks.length > 0);

    if (!hasFace) {
      const conf: GazeConfidenceResult = {
        confidence: 0,
        isReliable: false,
        reason: 'Face not detected for head tracking',
        isBlinking: false,
        isFaceLost: true,
        isPoseExtreme: false,
        isOutOfBounds: false,
      };

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
    const currentPose = HeadPoseEstimator.estimate(landmarks, matrix);

    // If currently calibrating neutral posture, feed sample
    if (this.calibration.getIsCollecting()) {
      this.calibration.addSample(currentPose);
    }

    // Map head pose to screen coordinates
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const rawTarget = this.pointer.mapToScreen(currentPose, screenW, screenH);

    // Confidence: High if face is detected and pose is within tracking range
    const maxSafeRotation = 0.65; // ~37 degrees
    const isExtreme = Math.abs(currentPose.yaw) > maxSafeRotation || Math.abs(currentPose.pitch) > maxSafeRotation;

    const conf: GazeConfidenceResult = {
      confidence: isExtreme ? 0.35 : 0.95,
      isReliable: !isExtreme,
      reason: isExtreme ? 'Head turned too far' : undefined,
      isBlinking: false,
      isFaceLost: false,
      isPoseExtreme: isExtreme,
      isOutOfBounds: false,
    };

    let filteredX = rawTarget.x;
    let filteredY = rawTarget.y;

    if (conf.isReliable) {
      const filtered = this.filter.filter(rawTarget.x, rawTarget.y, timestamp);
      filteredX = filtered.x;
      filteredY = filtered.y;
    } else if (this.lastPrediction) {
      filteredX = this.lastPrediction.filteredX;
      filteredY = this.lastPrediction.filteredY;
    }

    const normalizedX = Math.max(0, Math.min(1.0, filteredX / screenW));
    const normalizedY = Math.max(0, Math.min(1.0, filteredY / screenH));

    const prediction: GazePrediction = {
      rawX: rawTarget.x,
      rawY: rawTarget.y,
      filteredX,
      filteredY,
      normalizedX,
      normalizedY,
      confidence: conf,
      timestamp,
    };

    this.lastPrediction = prediction;
    this.notify(prediction);
    return prediction;
  }

  private notify(prediction: GazePrediction): void {
    for (const listener of this.listeners) {
      listener(prediction);
    }
  }
}
