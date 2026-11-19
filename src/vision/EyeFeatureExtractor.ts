/**
 * EyeFeatureExtractor
 * Extracts normalized eye geometry, iris positions, and openness ratios from FaceLandmarker landmarks.
 */

import { NormalizedLandmark, EyeLandmarks, EyeFeatureVector, HeadPose } from '../types/tracking';

export class EyeFeatureExtractor {
  // Landmark indices for MediaPipe Face Mesh (468+ mesh with irises)
  // Left eye
  private static readonly LEFT_IRIS_CENTER = 468;
  private static readonly LEFT_OUTER_CORNER = 33;
  private static readonly LEFT_INNER_CORNER = 133;
  private static readonly LEFT_UPPER_LID = 159;
  private static readonly LEFT_LOWER_LID = 145;

  // Right eye
  private static readonly RIGHT_IRIS_CENTER = 473;
  private static readonly RIGHT_INNER_CORNER = 362;
  private static readonly RIGHT_OUTER_CORNER = 263;
  private static readonly RIGHT_UPPER_LID = 386;
  private static readonly RIGHT_LOWER_LID = 374;

  // Face boundary landmarks
  private static readonly FACE_TOP = 10;
  private static readonly FACE_BOTTOM = 152;
  private static readonly FACE_LEFT = 234;
  private static readonly FACE_RIGHT = 454;

  /**
   * Extract comprehensive eye landmarks from 478 landmarks array
   */
  public static extractEyeLandmarks(landmarks: NormalizedLandmark[]): EyeLandmarks | null {
    if (!landmarks || landmarks.length < 478) {
      return null;
    }

    const leftIris = landmarks[this.LEFT_IRIS_CENTER];
    const leftOuter = landmarks[this.LEFT_OUTER_CORNER];
    const leftInner = landmarks[this.LEFT_INNER_CORNER];
    const leftUpper = landmarks[this.LEFT_UPPER_LID];
    const leftLower = landmarks[this.LEFT_LOWER_LID];

    const rightIris = landmarks[this.RIGHT_IRIS_CENTER];
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
    // Left eye (viewer's left / camera right)
    const leftSpanX = leftInner.x - leftOuter.x;
    const leftSpanY = leftLower.y - leftUpper.y;
    const leftNormX = Math.abs(leftSpanX) > 1e-5 ? (leftIris.x - leftOuter.x) / leftSpanX : 0.5;
    const leftNormY = Math.abs(leftSpanY) > 1e-5 ? (leftIris.y - leftUpper.y) / leftSpanY : 0.5;

    // Right eye
    const rightSpanX = rightOuter.x - rightInner.x;
    const rightSpanY = rightLower.y - rightUpper.y;
    const rightNormX = Math.abs(rightSpanX) > 1e-5 ? (rightIris.x - rightInner.x) / rightSpanX : 0.5;
    const rightNormY = Math.abs(rightSpanY) > 1e-5 ? (rightIris.y - rightUpper.y) / rightSpanY : 0.5;

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
   * Converts EyeFeatureVector into numeric array for regression
   */
  public static toNumericArray(fv: EyeFeatureVector): number[] {
    return [
      fv.leftIrisX,
      fv.leftIrisY,
      fv.rightIrisX,
      fv.rightIrisY,
      fv.leftOpenness,
      fv.rightOpenness,
      fv.headYaw,
      fv.headPitch,
      fv.headRoll,
      fv.faceCenterX,
      fv.faceCenterY,
      fv.faceScale,
    ];
  }
}
