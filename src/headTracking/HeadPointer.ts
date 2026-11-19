/**
 * HeadPointer
 * Maps relative head yaw and pitch to screen positions with dead zones and adjustable sensitivity.
 */

import { HeadPose, HeadNeutralPose, HeadTrackingConfig, Point2D } from '../types/tracking';

export class HeadPointer {
  private config: HeadTrackingConfig = {
    sensitivityX: 2.2,
    sensitivityY: 2.5,
    deadZoneYaw: 0.025,   // ~1.4 degrees dead zone for resting head stability
    deadZonePitch: 0.025,
    smoothingMinCutoff: 0.8,
    smoothingBeta: 0.008,
  };

  private neutralPose: HeadNeutralPose = {
    neutralYaw: 0,
    neutralPitch: 0,
    neutralRoll: 0,
    neutralFaceX: 0.5,
    neutralFaceY: 0.5,
  };

  constructor(config?: Partial<HeadTrackingConfig>) {
    if (config) this.config = { ...this.config, ...config };
  }

  public setNeutralPose(neutral: HeadNeutralPose): void {
    this.neutralPose = { ...neutral };
  }

  public setSensitivity(factor: number): void {
    this.config.sensitivityX = 2.2 * factor;
    this.config.sensitivityY = 2.5 * factor;
  }

  /**
   * Map current head pose to screen coordinates
   */
  public mapToScreen(
    currentPose: HeadPose,
    screenWidth: number,
    screenHeight: number
  ): Point2D {
    // 1. Calculate relative deviation from neutral pose
    let deltaYaw = currentPose.yaw - this.neutralPose.neutralYaw;
    let deltaPitch = currentPose.pitch - this.neutralPose.neutralPitch;

    // Invert yaw because webcam camera faces the user: turning head to screen right moves face towards camera left
    // Adjust signs so user head movement matches intuitive screen direction
    const directedYaw = -deltaYaw;
    const directedPitch = -deltaPitch; // Looking up tilts nose up

    // 2. Apply dead zone
    let activeYaw = 0;
    if (Math.abs(directedYaw) > this.config.deadZoneYaw) {
      activeYaw = Math.sign(directedYaw) * (Math.abs(directedYaw) - this.config.deadZoneYaw);
    }

    let activePitch = 0;
    if (Math.abs(directedPitch) > this.config.deadZonePitch) {
      activePitch = Math.sign(directedPitch) * (Math.abs(directedPitch) - this.config.deadZonePitch);
    }

    // 3. Map angular deviation to normalized screen coordinates [0..1]
    // Comfortable head range is ~0.25 rad (~14 deg) in each direction
    const maxComfortableAngleRad = 0.25;

    const normX = 0.5 + (activeYaw / maxComfortableAngleRad) * 0.5 * this.config.sensitivityX;
    const normY = 0.5 + (activePitch / maxComfortableAngleRad) * 0.5 * this.config.sensitivityY;

    // 4. Clamp to viewport
    const clampedNormX = Math.max(0.02, Math.min(0.98, normX));
    const clampedNormY = Math.max(0.02, Math.min(0.98, normY));

    return {
      x: clampedNormX * screenWidth,
      y: clampedNormY * screenHeight,
    };
  }

  public getConfig(): HeadTrackingConfig {
    return { ...this.config };
  }
}
