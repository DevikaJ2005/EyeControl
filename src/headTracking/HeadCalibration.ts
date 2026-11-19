/**
 * HeadCalibration
 * Records neutral resting head posture (yaw, pitch, roll, center) over a calm fixation window.
 */

import { HeadPose, HeadNeutralPose } from '../types/tracking';

export class HeadCalibration {
  private samples: HeadPose[] = [];
  private isCollecting: boolean = false;
  private targetSampleCount: number = 25; // ~0.8s at 30fps

  public startRecording(sampleCount: number = 25): void {
    this.samples = [];
    this.targetSampleCount = sampleCount;
    this.isCollecting = true;
  }

  public addSample(pose: HeadPose): boolean {
    if (!this.isCollecting) return false;

    this.samples.push(pose);
    if (this.samples.length >= this.targetSampleCount) {
      this.isCollecting = false;
      return true; // Complete
    }
    return false;
  }

  public getProgress(): number {
    return Math.min(1.0, this.samples.length / this.targetSampleCount);
  }

  public computeNeutralPose(): HeadNeutralPose | null {
    if (this.samples.length === 0) return null;

    let sumYaw = 0;
    let sumPitch = 0;
    let sumRoll = 0;
    let sumX = 0;
    let sumY = 0;

    for (const s of this.samples) {
      sumYaw += s.yaw;
      sumPitch += s.pitch;
      sumRoll += s.roll;
      sumX += s.translation.x;
      sumY += s.translation.y;
    }

    const n = this.samples.length;
    return {
      neutralYaw: sumYaw / n,
      neutralPitch: sumPitch / n,
      neutralRoll: sumRoll / n,
      neutralFaceX: sumX / n,
      neutralFaceY: sumY / n,
    };
  }

  public reset(): void {
    this.samples = [];
    this.isCollecting = false;
  }

  public getIsCollecting(): boolean {
    return this.isCollecting;
  }
}
