/**
 * GazeConfidence
 * Evaluates real-time tracking confidence across face detection, eye openness,
 * blink states, landmark jitter, extreme head rotation, and prediction bounds.
 */

import { GazeConfidenceResult, EyeLandmarks, HeadPose, Point2D } from '../types/tracking';

export interface ConfidenceThresholds {
  minConfidence: number; // e.g. 0.65
  blinkOpennessThreshold: number; // e.g. 0.18
  maxYawDeviationRad: number; // e.g. 0.5 rad (~28 deg)
  maxPitchDeviationRad: number; // e.g. 0.4 rad (~23 deg)
  maxScreenMarginFactor: number; // Allowed margin outside screen [0..1]
}

export class GazeConfidence {
  private thresholds: ConfidenceThresholds = {
    minConfidence: 0.65,
    blinkOpennessThreshold: 0.18,
    maxYawDeviationRad: 0.5,
    maxPitchDeviationRad: 0.4,
    maxScreenMarginFactor: 0.15, // 15% margin outside screen edges
  };

  private prevIrisPos: Point2D | null = null;
  private prevTimestamp: number = 0;

  constructor(thresholds?: Partial<ConfidenceThresholds>) {
    if (thresholds) {
      this.thresholds = { ...this.thresholds, ...thresholds };
    }
  }

  /**
   * Evaluate confidence of current frame observation
   */
  public evaluate(
    faceDetected: boolean,
    eyes: EyeLandmarks | null,
    headPose: HeadPose,
    predictedNormPos: Point2D | null,
    neutralPose?: HeadPose | null
  ): GazeConfidenceResult {
    // 1. Face lost check
    if (!faceDetected || !eyes) {
      return {
        confidence: 0,
        isReliable: false,
        reason: 'Face or eyes not detected',
        isBlinking: false,
        isFaceLost: true,
        isPoseExtreme: false,
        isOutOfBounds: false,
      };
    }

    // 2. Blink check (either eye closed below threshold)
    const avgOpenness = (eyes.leftOpenness + eyes.rightOpenness) / 2;
    const isBlinking = eyes.leftOpenness < this.thresholds.blinkOpennessThreshold ||
                       eyes.rightOpenness < this.thresholds.blinkOpennessThreshold;

    if (isBlinking) {
      return {
        confidence: 0.1,
        isReliable: false,
        reason: 'Blink in progress',
        isBlinking: true,
        isFaceLost: false,
        isPoseExtreme: false,
        isOutOfBounds: false,
      };
    }

    // 3. Head pose deviation check
    const refYaw = neutralPose ? neutralPose.yaw : 0;
    const refPitch = neutralPose ? neutralPose.pitch : 0;
    const deltaYaw = Math.abs(headPose.yaw - refYaw);
    const deltaPitch = Math.abs(headPose.pitch - refPitch);

    const isPoseExtreme = deltaYaw > this.thresholds.maxYawDeviationRad ||
                          deltaPitch > this.thresholds.maxPitchDeviationRad;

    if (isPoseExtreme) {
      return {
        confidence: 0.3,
        isReliable: false,
        reason: 'Head turned too far from screen',
        isBlinking: false,
        isFaceLost: false,
        isPoseExtreme: true,
        isOutOfBounds: false,
      };
    }

    // 4. Out of bounds check
    let isOutOfBounds = false;
    if (predictedNormPos) {
      const margin = this.thresholds.maxScreenMarginFactor;
      if (
        predictedNormPos.x < -margin ||
        predictedNormPos.x > 1 + margin ||
        predictedNormPos.y < -margin ||
        predictedNormPos.y > 1 + margin
      ) {
        isOutOfBounds = true;
      }
    }

    if (isOutOfBounds) {
      return {
        confidence: 0.4,
        isReliable: false,
        reason: 'Gaze prediction out of bounds',
        isBlinking: false,
        isFaceLost: false,
        isPoseExtreme: false,
        isOutOfBounds: true,
      };
    }

    // 5. Compute continuous confidence score [0.65 .. 1.0]
    let score = 1.0;

    // Penalize head rotation smoothly
    score -= (deltaYaw / this.thresholds.maxYawDeviationRad) * 0.15;
    score -= (deltaPitch / this.thresholds.maxPitchDeviationRad) * 0.15;

    // Penalize borderline eye closure
    if (avgOpenness < 0.25) {
      score -= (0.25 - avgOpenness) * 0.2;
    }

    score = Math.max(0, Math.min(1.0, score));
    const isReliable = score >= this.thresholds.minConfidence;

    return {
      confidence: score,
      isReliable,
      reason: isReliable ? undefined : 'Low confidence tracking',
      isBlinking: false,
      isFaceLost: false,
      isPoseExtreme: false,
      isOutOfBounds: false,
    };
  }

  public reset(): void {
    this.prevIrisPos = null;
    this.prevTimestamp = 0;
  }
}
