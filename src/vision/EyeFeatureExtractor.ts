/**
 * EyeFeatureExtractor
 * Extracts normalized eye geometry, iris positions, and openness ratios from FaceLandmarker landmarks.
 */

import { NormalizedLandmark, EyeLandmarks, EyeFeatureVector, HeadPose, CentralBaselineData, FaceBoundingBox, Point2D } from '../types/tracking';

export interface EyeDiagnosticData {
  faceBox: FaceBoundingBox;
  faceCenter: Point2D;
  leftIris: Point2D;
  rightIris: Point2D;
  leftEyeBox: FaceBoundingBox;
  rightEyeBox: FaceBoundingBox;
  leftOpenness: number;
  rightOpenness: number;
}

export class EyeFeatureExtractor {
  // Landmark indices for MediaPipe Face Mesh (468+ mesh with irises)
  // All indices use the PERSON'S ANATOMICAL perspective (standard medical/accessibility convention).
  //
  // Person's RIGHT eye — appears on the LEFT side of an unmirrored camera frame
  //   MediaPipe iris index 468, eye corners 33/133, lids 159/145
  public static readonly RIGHT_IRIS_CENTER = 468;
  public static readonly RIGHT_OUTER_CORNER = 33;
  public static readonly RIGHT_INNER_CORNER = 133;
  public static readonly RIGHT_UPPER_LID = 159;
  public static readonly RIGHT_LOWER_LID = 145;

  // Person's LEFT eye — appears on the RIGHT side of an unmirrored camera frame
  //   MediaPipe iris index 473, eye corners 263/362, lids 386/374
  public static readonly LEFT_IRIS_CENTER = 473;
  public static readonly LEFT_INNER_CORNER = 362;
  public static readonly LEFT_OUTER_CORNER = 263;
  public static readonly LEFT_UPPER_LID = 386;
  public static readonly LEFT_LOWER_LID = 374;

  // Face boundary landmarks
  public static readonly FACE_TOP = 10;
  public static readonly FACE_BOTTOM = 152;
  public static readonly FACE_LEFT = 234;
  public static readonly FACE_RIGHT = 454;
  public static readonly NOSE_TIP = 1;

  /**
   * Estimate iris center from the four perimeter landmarks. Their centroid is
   * less dependent on the model's single center landmark when it becomes noisy.
   */
  public static estimateIrisCenter(landmarks: NormalizedLandmark[], centerIndex: number): Point2D {
    const center = landmarks[centerIndex];
    const ring = [1, 2, 3, 4].map(offset => landmarks[centerIndex + offset]);
    if (!center || ring.some(point => !point || !Number.isFinite(point.x) || !Number.isFinite(point.y))) {
      return center ? { x: center.x, y: center.y } : { x: 0.5, y: 0.5 };
    }

    return {
      x: ring.reduce((sum, point) => sum + point.x, 0) / ring.length,
      y: ring.reduce((sum, point) => sum + point.y, 0) / ring.length,
    };
  }

  /**
   * Extract comprehensive eye landmarks from 478 landmarks array
   */
  public static extractEyeLandmarks(landmarks: NormalizedLandmark[]): EyeLandmarks | null {
    if (!landmarks || landmarks.length < 478) {
      return null;
    }

    const leftIris = this.estimateIrisCenter(landmarks, this.LEFT_IRIS_CENTER);
    const leftOuter = landmarks[this.LEFT_OUTER_CORNER];
    const leftInner = landmarks[this.LEFT_INNER_CORNER];
    const leftUpper = landmarks[this.LEFT_UPPER_LID];
    const leftLower = landmarks[this.LEFT_LOWER_LID];

    const rightIris = this.estimateIrisCenter(landmarks, this.RIGHT_IRIS_CENTER);
    const rightInner = landmarks[this.RIGHT_INNER_CORNER];
    const rightOuter = landmarks[this.RIGHT_OUTER_CORNER];
    const rightUpper = landmarks[this.RIGHT_UPPER_LID];
    const rightLower = landmarks[this.RIGHT_LOWER_LID];

    // Left eye dimensions
    const leftWidth = Math.hypot(leftInner.x - leftOuter.x, leftInner.y - leftOuter.y);
    const leftHeight = Math.hypot(leftLower.x - leftUpper.x, leftLower.y - leftUpper.y);
    const leftOpenness = leftWidth > 1e-5 ? leftHeight / leftWidth : 0;

    // Right eye dimensions
    const rightWidth = Math.hypot(rightOuter.x - rightInner.x, rightOuter.y - rightInner.y);
    const rightHeight = Math.hypot(rightLower.x - rightUpper.x, rightLower.y - rightUpper.y);
    const rightOpenness = rightWidth > 1e-5 ? rightHeight / rightWidth : 0;

    // Normalized iris position within eye frame [0..1]
    // Both eyes centered at (0.5, 0.5) when looking directly at camera
    // Left eye (person's anatomical left, camera right)
    const leftCenterX = (leftInner.x + leftOuter.x) / 2;
    // Anatomical vertical center: resting pupil sits naturally at ~42% from upper lid to lower lid
    const leftCenterY = leftUpper.y * 0.58 + leftLower.y * 0.42;
    const leftSpanX = Math.abs(leftOuter.x - leftInner.x);
    const leftSpanY = Math.abs(leftLower.y - leftUpper.y);
    const leftNormX = leftSpanX > 1e-5 ? 0.5 + (leftIris.x - leftCenterX) / leftSpanX : 0.5;
    const leftNormY = leftSpanY > 1e-5 ? 0.5 + (leftIris.y - leftCenterY) / leftSpanY : 0.5;

    // Right eye (person's anatomical right, camera left)
    const rightCenterX = (rightInner.x + rightOuter.x) / 2;
    // Anatomical vertical center: resting pupil sits naturally at ~42% from upper lid to lower lid
    const rightCenterY = rightUpper.y * 0.58 + rightLower.y * 0.42;
    const rightSpanX = Math.abs(rightInner.x - rightOuter.x);
    const rightSpanY = Math.abs(rightLower.y - rightUpper.y);
    const rightNormX = rightSpanX > 1e-5 ? 0.5 + (rightIris.x - rightCenterX) / rightSpanX : 0.5;
    const rightNormY = rightSpanY > 1e-5 ? 0.5 + (rightIris.y - rightCenterY) / rightSpanY : 0.5;

    // Inter-pupillary distance normalized by face width
    const faceLeft = landmarks[this.FACE_LEFT];
    const faceRight = landmarks[this.FACE_RIGHT];
    const faceWidth = Math.hypot(faceRight.x - faceLeft.x, faceRight.y - faceLeft.y);
    const ipd = Math.hypot(rightIris.x - leftIris.x, rightIris.y - leftIris.y);
    const normalizedIpd = faceWidth > 1e-5 ? ipd / faceWidth : 0.5;

    return {
      leftIrisCenter: { x: leftIris.x, y: leftIris.y },
      leftInnerCorner: { x: leftInner.x, y: leftInner.y },
      leftOuterCorner: { x: leftOuter.x, y: leftOuter.y },
      leftUpperLid: { x: leftUpper.x, y: leftUpper.y },
      leftLowerLid: { x: leftLower.x, y: leftLower.y },
      leftEyeWidth: leftWidth,
      leftEyeHeight: leftHeight,
      leftOpenness,
      leftNormalizedIris: { x: leftNormX, y: leftNormY },

      rightIrisCenter: { x: rightIris.x, y: rightIris.y },
      rightInnerCorner: { x: rightInner.x, y: rightInner.y },
      rightOuterCorner: { x: rightOuter.x, y: rightOuter.y },
      rightUpperLid: { x: rightUpper.x, y: rightUpper.y },
      rightLowerLid: { x: rightLower.x, y: rightLower.y },
      rightEyeWidth: rightWidth,
      rightEyeHeight: rightHeight,
      rightOpenness,
      rightNormalizedIris: { x: rightNormX, y: rightNormY },

      normalizedIpd,
    };
  }

  /**
   * Builds normalized feature vector combining eye geometry and head pose
   */
  public static buildFeatureVector(
    landmarks: NormalizedLandmark[],
    headPose: HeadPose,
    timestamp: number = Date.now()
  ): EyeFeatureVector | null {
    const eyes = this.extractEyeLandmarks(landmarks);
    if (!eyes) return null;

    const faceTop = landmarks[this.FACE_TOP];
    const faceBottom = landmarks[this.FACE_BOTTOM];
    const faceLeft = landmarks[this.FACE_LEFT];
    const faceRight = landmarks[this.FACE_RIGHT];

    const faceCenterX = (faceLeft.x + faceRight.x) / 2;
    const faceCenterY = (faceTop.y + faceBottom.y) / 2;
    const faceScale = Math.hypot(faceRight.x - faceLeft.x, faceRight.y - faceLeft.y);

    return {
      leftIrisX: eyes.leftNormalizedIris.x,
      leftIrisY: eyes.leftNormalizedIris.y,
      rightIrisX: eyes.rightNormalizedIris.x,
      rightIrisY: eyes.rightNormalizedIris.y,
      leftOpenness: eyes.leftOpenness,
      rightOpenness: eyes.rightOpenness,
      headYaw: headPose.yaw,
      headPitch: headPose.pitch,
      headRoll: headPose.roll,
      faceCenterX,
      faceCenterY,
      faceScale,
      timestamp,
    };
  }

  /**
   * Extract face bounding box in normalized coordinates [0..1]
   */
  public static getFaceBoundingBox(landmarks: NormalizedLandmark[]): FaceBoundingBox | null {
    if (!landmarks || landmarks.length < 468) return null;

    let minX = 1;
    let maxX = 0;
    let minY = 1;
    let maxY = 0;

    for (let i = 0; i < landmarks.length; i++) {
      const p = landmarks[i];
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    // Add 5% comfortable margin
    const marginX = (maxX - minX) * 0.05;
    const marginY = (maxY - minY) * 0.05;

    return {
      x: Math.max(0, minX - marginX),
      y: Math.max(0, minY - marginY),
      width: Math.min(1, maxX - minX + marginX * 2),
      height: Math.min(1, maxY - minY + marginY * 2),
    };
  }

  /**
   * Extract visual diagnostics data for live camera preview overlay
   */
  public static getDiagnosticOverlayData(landmarks: NormalizedLandmark[]): EyeDiagnosticData | null {
    if (!landmarks || landmarks.length < 478) return null;

    const faceBox = this.getFaceBoundingBox(landmarks) || { x: 0.2, y: 0.2, width: 0.6, height: 0.6 };
    const nose = landmarks[this.NOSE_TIP] || { x: 0.5, y: 0.5 };

    const leftIris = this.estimateIrisCenter(landmarks, this.LEFT_IRIS_CENTER);
    const rightIris = this.estimateIrisCenter(landmarks, this.RIGHT_IRIS_CENTER);

    // Left eye box
    const leftOuter = landmarks[this.LEFT_OUTER_CORNER];
    const leftInner = landmarks[this.LEFT_INNER_CORNER];
    const leftUpper = landmarks[this.LEFT_UPPER_LID];
    const leftLower = landmarks[this.LEFT_LOWER_LID];

    const leftEyeBox: FaceBoundingBox = {
      x: Math.min(leftOuter.x, leftInner.x) - 0.015,
      y: Math.min(leftUpper.y, leftLower.y) - 0.015,
      width: Math.abs(leftInner.x - leftOuter.x) + 0.03,
      height: Math.abs(leftLower.y - leftUpper.y) + 0.03,
    };

    // Right eye box
    const rightOuter = landmarks[this.RIGHT_OUTER_CORNER];
    const rightInner = landmarks[this.RIGHT_INNER_CORNER];
    const rightUpper = landmarks[this.RIGHT_UPPER_LID];
    const rightLower = landmarks[this.RIGHT_LOWER_LID];

    const rightEyeBox: FaceBoundingBox = {
      x: Math.min(rightOuter.x, rightInner.x) - 0.015,
      y: Math.min(rightUpper.y, rightLower.y) - 0.015,
      width: Math.abs(rightOuter.x - rightInner.x) + 0.03,
      height: Math.abs(rightLower.y - rightUpper.y) + 0.03,
    };

    const leftWidth = Math.hypot(leftInner.x - leftOuter.x, leftInner.y - leftOuter.y);
    const leftHeight = Math.hypot(leftLower.x - leftUpper.x, leftLower.y - leftUpper.y);
    const rightWidth = Math.hypot(rightOuter.x - rightInner.x, rightOuter.y - rightInner.y);
    const rightHeight = Math.hypot(rightLower.x - rightUpper.x, rightLower.y - rightUpper.y);

    return {
      faceBox,
      faceCenter: { x: nose.x, y: nose.y },
      leftIris: { x: leftIris.x, y: leftIris.y },
      rightIris: { x: rightIris.x, y: rightIris.y },
      leftEyeBox,
      rightEyeBox,
      leftOpenness: leftWidth > 1e-4 ? leftHeight / leftWidth : 0.28,
      rightOpenness: rightWidth > 1e-4 ? rightHeight / rightWidth : 0.28,
    };
  }

  /**
   * Converts EyeFeatureVector into numeric array for regression.
   * If a central baseline is provided, features are normalized relative to the neutral fixation center!
   */
  public static toNumericArray(fv: EyeFeatureVector, baseline?: CentralBaselineData | null): number[] {
    const bYaw = baseline ? baseline.neutralYaw : 0;
    const bPitch = baseline ? baseline.neutralPitch : 0;
    const bRoll = baseline ? baseline.neutralRoll : 0;
    const bLeftX = baseline ? baseline.neutralLeftIris.x : 0.5;
    const bLeftY = baseline ? baseline.neutralLeftIris.y : 0.5;
    const bRightX = baseline ? baseline.neutralRightIris.x : 0.5;
    const bRightY = baseline ? baseline.neutralRightIris.y : 0.5;

    // Relative iris offsets from central baseline
    const dLeftX = fv.leftIrisX - bLeftX;
    const dLeftY = fv.leftIrisY - bLeftY;
    const dRightX = fv.rightIrisX - bRightX;
    const dRightY = fv.rightIrisY - bRightY;

    // Average binocular iris displacement
    const dAvgX = (dLeftX + dRightX) / 2;
    const dAvgY = (dLeftY + dRightY) / 2;

    // Relative head pose delta
    const dYaw = fv.headYaw - bYaw;
    const dPitch = fv.headPitch - bPitch;
    const dRoll = fv.headRoll - bRoll;

    return [
      dAvgX,             // Primary horizontal eye gaze signal
      dAvgY,             // Primary vertical eye gaze signal
      dLeftX,            // Left eye delta
      dLeftY,
      dRightX,           // Right eye delta
      dRightY,
      dYaw,              // Compensatory head yaw
      dPitch,            // Compensatory head pitch
      dRoll,             // Compensatory head roll
    ];
  }
}
