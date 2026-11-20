/**
 * HeadPoseEstimator
 * Computes 3D head rotation (yaw, pitch, roll) and position from facial landmarks
 * and MediaPipe's facialTransformationMatrixes.
 */

import { NormalizedLandmark, HeadPose, Point3D } from '../types/tracking';

export class HeadPoseEstimator {
  // Key facial orientation landmarks
  private static readonly NOSE_TIP = 1;
  private static readonly CHIN = 152;
  private static readonly FOREHEAD = 10;
  private static readonly LEFT_CHEEK = 234;
  private static readonly RIGHT_CHEEK = 454;
  private static readonly LEFT_EYE_OUTER = 33;
  private static readonly RIGHT_EYE_OUTER = 263;

  /**
   * Estimate head pose from transformation matrix or 3D landmark geometry
   */
  public static estimate(
    landmarks: NormalizedLandmark[],
    matrix?: number[] | Float32Array
  ): HeadPose {
    // If MediaPipe 4x4 facial transformation matrix is available, extract Euler angles
    if (matrix && matrix.length >= 16) {
      const poseFromMatrix = this.fromTransformationMatrix(matrix);
      if (poseFromMatrix) return poseFromMatrix;
    }

    // Robust geometric estimation from landmark constellation
    return this.fromLandmarks(landmarks);
  }

  private static fromTransformationMatrix(m: number[] | Float32Array): HeadPose | null {
    try {
      // 4x4 column-major matrix
      // R = [ [m[0], m[4], m[8]], [m[1], m[5], m[9]], [m[2], m[6], m[10]] ]
      const r00 = m[0], r01 = m[4], r02 = m[8];
      const r10 = m[1], r11 = m[5], r12 = m[9];
      const r20 = m[2], r21 = m[6], r22 = m[10];

      // Yaw (around Y axis)
      const yaw = Math.atan2(r02, r22);
      // Pitch (around X axis)
      const pitch = Math.atan2(-r12, Math.sqrt(r10 * r10 + r11 * r11));
      // Roll (around Z axis)
      const roll = Math.atan2(r10, r11);

      const translation: Point3D = {
        x: m[12],
        y: m[13],
        z: m[14],
      };

      return { yaw, pitch, roll, translation };
    } catch {
      return null;
    }
  }

  private static fromLandmarks(landmarks: NormalizedLandmark[]): HeadPose {
    if (!landmarks || landmarks.length < 468) {
      return {
        yaw: 0,
        pitch: 0,
        roll: 0,
        translation: { x: 0, y: 0, z: 0 },
      };
    }

    const nose = landmarks[this.NOSE_TIP];
    const chin = landmarks[this.CHIN];
    const forehead = landmarks[this.FOREHEAD];
    const leftCheek = landmarks[this.LEFT_CHEEK];
    const rightCheek = landmarks[this.RIGHT_CHEEK];
    const leftEye = landmarks[this.LEFT_EYE_OUTER];
    const rightEye = landmarks[this.RIGHT_EYE_OUTER];

    // Roll: Angle of eye-line relative to horizontal
    const deltaEyeX = rightEye.x - leftEye.x;
    const deltaEyeY = rightEye.y - leftEye.y;
    const roll = Math.atan2(deltaEyeY, deltaEyeX);

    // Yaw: Nose horizontal offset from cheek midpoint
    const cheekMidX = (leftCheek.x + rightCheek.x) / 2;
    const faceSpanX = Math.abs(rightCheek.x - leftCheek.x);
    const yawRatio = faceSpanX > 1e-4 ? (nose.x - cheekMidX) / (faceSpanX / 2) : 0;
    // Map ratio to angle approximation in radians
    const yaw = Math.asin(Math.max(-0.95, Math.min(0.95, yawRatio)));

    // Pitch: Nose vertical offset from forehead-chin line (tilting head down moves nose down, positive pitch)
    const faceMidY = (forehead.y + chin.y) / 2;
    const faceSpanY = Math.abs(chin.y - forehead.y);
    const pitchRatio = faceSpanY > 1e-4 ? (nose.y - faceMidY) / (faceSpanY / 2) : 0;
    const pitch = Math.asin(Math.max(-0.95, Math.min(0.95, pitchRatio)));

    const translation: Point3D = {
      x: (leftCheek.x + rightCheek.x) / 2,
      y: (forehead.y + chin.y) / 2,
      z: nose.z || 0,
    };

    return { yaw, pitch, roll, translation };
  }
}
