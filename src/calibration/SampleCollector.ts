/**
 * SampleCollector
 * Gathers stable, blink-free calibration samples during fixation windows.
 */

import { CalibrationTarget, CalibrationSample, EyeFeatureVector } from '../types/tracking';
import { EyeFeatureExtractor } from '../vision/EyeFeatureExtractor';

export class SampleCollector {
  private currentTarget: CalibrationTarget | null = null;
  private targetStartTime: number = 0;
  private settlingDurationMs: number = 1000; // 1 second to allow eye saccade to settle on target
  private samples: CalibrationSample[] = [];
  private requiredSamples: number = 20; // 20 high-quality frames (~1.5-2.0s of steady fixation)
  private prevFeatureVector: EyeFeatureVector | null = null;
  private isPaused: boolean = false;

  public startTarget(target: CalibrationTarget, requiredSamples: number = 20, settleMs: number = 1000): void {
    this.currentTarget = target;
    this.targetStartTime = performance.now();
    this.samples = [];
    this.requiredSamples = requiredSamples;
    this.settlingDurationMs = settleMs;
    this.prevFeatureVector = null;
    this.isPaused = false;
  }

  public setPaused(paused: boolean): void {
    this.isPaused = paused;
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Process a candidate feature vector for current target
   * Returns true if target sample collection is finished
   */
  public addSample(featureVector: EyeFeatureVector, isEyeRegionStable: boolean = true): boolean {
    if (!this.currentTarget || this.isPaused || !isEyeRegionStable) return false;

    const now = performance.now();
    const elapsed = now - this.targetStartTime;

    // 1. Wait for fixation settle window to complete
    if (elapsed < this.settlingDurationMs) {
      return false;
    }

    // 2. Reject blinks (either eye openness < 0.16)
    if (featureVector.leftOpenness < 0.16 || featureVector.rightOpenness < 0.16) {
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

  /**
   * Compute a robust trimmed mean feature vector across collected samples for this target.
   * Removes extreme outliers in iris coordinates to yield stable target prototypes.
   */
  public computeTrimmedMeanSample(): CalibrationSample | null {
    if (!this.currentTarget || this.samples.length === 0) return null;

    const n = this.samples.length;
    if (n < 3) return this.samples[0];

    const numCols = this.samples[0].features.length;
    const trimmedFeatures: number[] = [];

    for (let c = 0; c < numCols; c++) {
      const vals = this.samples.map(s => s.features[c]).sort((a, b) => a - b);
      // Trim top and bottom 10%
      const trimCount = Math.floor(n * 0.1);
      const sub = vals.slice(trimCount, n - trimCount);
      const avg = sub.reduce((sum, v) => sum + v, 0) / sub.length;
      trimmedFeatures.push(avg);
    }

    // Median raw vector for representative metadata
    const midIdx = Math.floor(n / 2);
    return {
      target: this.currentTarget,
      features: trimmedFeatures,
      rawFeatureVector: this.samples[midIdx].rawFeatureVector,
      timestamp: this.samples[midIdx].timestamp,
    };
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
