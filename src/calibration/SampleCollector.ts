/**
 * SampleCollector
 * Gathers stable, blink-free calibration samples during fixation windows.
 */

import { CalibrationTarget, CalibrationSample, EyeFeatureVector } from '../types/tracking';
import { EyeFeatureExtractor } from '../vision/EyeFeatureExtractor';

export class SampleCollector {
  private currentTarget: CalibrationTarget | null = null;
  private targetStartTime: number = 0;
  private settlingDurationMs: number = 700; // Time to allow eye saccade to complete and fixate
  private samples: CalibrationSample[] = [];
  private requiredSamples: number = 18; // 18 high-quality frames per target (~600ms of fixation)
  private prevFeatureVector: EyeFeatureVector | null = null;

  public startTarget(target: CalibrationTarget, requiredSamples: number = 18): void {
    this.currentTarget = target;
    this.targetStartTime = performance.now();
    this.samples = [];
    this.requiredSamples = requiredSamples;
    this.prevFeatureVector = null;
  }

  /**
   * Process a candidate feature vector for current target
   * Returns true if target sample collection is finished
   */
  public addSample(featureVector: EyeFeatureVector): boolean {
    if (!this.currentTarget) return false;

    const now = performance.now();
    const elapsed = now - this.targetStartTime;

    // 1. Wait for fixation settle window to complete
    if (elapsed < this.settlingDurationMs) {
      return false;
    }

    // 2. Reject blinks (either eye openness < 0.18)
    if (featureVector.leftOpenness < 0.18 || featureVector.rightOpenness < 0.18) {
      return false;
    }

    // 3. Reject extreme head rotation
    if (Math.abs(featureVector.headYaw) > 0.45 || Math.abs(featureVector.headPitch) > 0.4) {
      return false;
    }

    // 4. Reject sudden saccade spikes during fixation
    if (this.prevFeatureVector) {
      const deltaIrisLeft = Math.hypot(
        featureVector.leftIrisX - this.prevFeatureVector.leftIrisX,
        featureVector.leftIrisY - this.prevFeatureVector.leftIrisY
      );
      const deltaIrisRight = Math.hypot(
        featureVector.rightIrisX - this.prevFeatureVector.rightIrisX,
        featureVector.rightIrisY - this.prevFeatureVector.rightIrisY
      );

      // Sudden jump > 0.08 normalized eye width indicates a saccade or tracking glitch
      if (deltaIrisLeft > 0.08 || deltaIrisRight > 0.08) {
        this.prevFeatureVector = featureVector;
        return false;
      }
    }

    this.prevFeatureVector = featureVector;

    const numeric = EyeFeatureExtractor.toNumericArray(featureVector);
    this.samples.push({
      target: this.currentTarget,
      features: numeric,
      rawFeatureVector: { ...featureVector },
      timestamp: featureVector.timestamp,
    });

    return this.samples.length >= this.requiredSamples;
  }

  public getProgress(): number {
    if (!this.currentTarget) return 0;
    const now = performance.now();
    const elapsed = now - this.targetStartTime;

    if (elapsed < this.settlingDurationMs) {
      // Settle phase progress (0 to 0.3)
      return (elapsed / this.settlingDurationMs) * 0.3;
    }

    // Collection phase progress (0.3 to 1.0)
    const collectRatio = this.samples.length / this.requiredSamples;
    return 0.3 + collectRatio * 0.7;
  }

  public getCollectedSamples(): CalibrationSample[] {
    return [...this.samples];
  }

  public getCurrentTarget(): CalibrationTarget | null {
    return this.currentTarget;
  }

  public reset(): void {
    this.currentTarget = null;
    this.samples = [];
    this.prevFeatureVector = null;
  }
}
