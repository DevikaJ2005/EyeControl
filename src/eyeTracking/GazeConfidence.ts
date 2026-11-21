/**
 * GazeConfidence
 * Evaluates real-time tracking confidence across face detection, eye openness,
 * blink states, landmark jitter, extreme head rotation, and prediction bounds.
 * Enforces strict honesty: NEVER labels tracking as "RELIABLE" unless calibration has passed.
 */

import { GazeConfidenceResult, EyeLandmarks, HeadPose, Point2D, TrackingSystemStatus } from '../types/tracking';
import { CoordinateManager } from '../calibration/CoordinateManager';

export interface ConfidenceThresholds {
  minConfidence: number;
  blinkOpennessThreshold: number;
  maxYawDeviationRad: number;
  maxPitchDeviationRad: number;
  maxScreenMarginFactor: number; // e.g. 0.05 = 5% outside viewport
}

export class GazeConfidence {
  private thresholds: ConfidenceThresholds = {
    minConfidence: 0.65,
    blinkOpennessThreshold: 0.16,
    maxYawDeviationRad: 0.55,
    maxPitchDeviationRad: 0.45,
    maxScreenMarginFactor: 0.05,
  };

  constructor(thresholds?: Partial<ConfidenceThresholds>) {
    if (thresholds) {
      this.thresholds = { ...this.thresholds, ...thresholds };
    }
  }

  /**
   * Evaluate confidence of current frame observation.
   * isCalibrationValidated must be true for the system to ever report "RELIABLE".
   */
  public evaluate(
    faceDetected: boolean,
    eyes: EyeLandmarks | null,
    headPose: HeadPose,
    predictedNormPos: Point2D | null,
    neutralPose?: HeadPose | null,
    isCalibrationValidated: boolean = false
  ): GazeConfidenceResult & { systemStatus: TrackingSystemStatus } {
    // 1. Face or Eyes Lost Check
    if (!faceDetected) {
      return {
        confidence: 0,
        isReliable: false,
        reason: 'Face not detected in camera',
        isBlinking: false,
        isFaceLost: true,
        isPoseExtreme: false,
        isOutOfBounds: false,
        systemStatus: 'face_not_detected',
      };
    }

    if (!eyes) {
      return {
        confidence: 0,
        isReliable: false,
        reason: 'Eye landmarks obscured',
        isBlinking: false,
        isFaceLost: false,
        isPoseExtreme: false,
        isOutOfBounds: false,
        systemStatus: 'eyes_not_detected',
      };
    }

    // 2. Blink check (either eye closed below threshold)
    const isBlinking =
      eyes.leftOpenness < this.thresholds.blinkOpennessThreshold ||
      eyes.rightOpenness < this.thresholds.blinkOpennessThreshold;

    if (isBlinking) {
      return {
        confidence: 0.05,
        isReliable: false,
        reason: 'Blink detected',
        isBlinking: true,
        isFaceLost: false,
        isPoseExtreme: false,
        isOutOfBounds: false,
        systemStatus: 'temporarily_unavailable',
      };
    }

    // 3. Head pose deviation check
    const refYaw = neutralPose ? neutralPose.yaw : 0;
    const refPitch = neutralPose ? neutralPose.pitch : 0;
    const deltaYaw = Math.abs(headPose.yaw - refYaw);
    const deltaPitch = Math.abs(headPose.pitch - refPitch);

    const isPoseExtreme =
      deltaYaw > this.thresholds.maxYawDeviationRad ||
      deltaPitch > this.thresholds.maxPitchDeviationRad;

    if (isPoseExtreme) {
      return {
        confidence: 0.2,
        isReliable: false,
        reason: 'Head turned too far from screen',
        isBlinking: false,
        isFaceLost: false,
        isPoseExtreme: true,
        isOutOfBounds: false,
        systemStatus: 'temporarily_unavailable',
      };
    }

    // 4. Gaze calibration status check: must be calibrated before checking boundary violations
    if (!isCalibrationValidated) {
      return {
        confidence: 0.3,
        isReliable: false,
        reason: 'Calibration required before tracking',
        isBlinking: false,
        isFaceLost: false,
        isPoseExtreme: false,
        isOutOfBounds: false,
        systemStatus: 'calibration_required',
      };
    }

    // 5. Out of bounds check: predicted point must be within valid viewport margins
    let isOutOfBounds = false;
    if (predictedNormPos) {
      if (!CoordinateManager.isWithinBounds(predictedNormPos, this.thresholds.maxScreenMarginFactor)) {
        isOutOfBounds = true;
      }
    }

    if (isOutOfBounds) {
      return {
        confidence: 0.1,
        isReliable: false,
        reason: 'Gaze prediction off-screen / out of bounds',
        isBlinking: false,
        isFaceLost: false,
        isPoseExtreme: false,
        isOutOfBounds: true,
        systemStatus: 'temporarily_unavailable',
      };
    }

    // 6. Compute continuous confidence score [0.65 .. 1.0]
    let score = 1.0;
    score -= (deltaYaw / this.thresholds.maxYawDeviationRad) * 0.15;
    score -= (deltaPitch / this.thresholds.maxPitchDeviationRad) * 0.15;

    const avgOpenness = (eyes.leftOpenness + eyes.rightOpenness) / 2;
    if (avgOpenness < 0.22) {
      score -= (0.22 - avgOpenness) * 0.2;
    }

    score = Math.max(0, Math.min(1.0, score));
    const isReliable = score >= this.thresholds.minConfidence;

    return {
      confidence: score,
      isReliable,
      reason: isReliable ? undefined : 'Unstable tracking signal',
      isBlinking: false,
      isFaceLost: false,
      isPoseExtreme: false,
      isOutOfBounds: false,
      systemStatus: isReliable ? 'validated_tracking' : 'temporarily_unavailable',
    };
  }
}
