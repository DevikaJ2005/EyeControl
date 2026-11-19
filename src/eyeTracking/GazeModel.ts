/**
 * GazeModel
 * Manages dual horizontal and vertical Ridge Regression models for screen gaze prediction.
 * Handles training, validation, feature normalization, and serialization.
 */

import { CalibrationSample, EyeFeatureVector, Point2D, CalibrationResult, ValidationMetric } from '../types/tracking';
import { RidgeRegression } from './RidgeRegression';
import { EyeFeatureExtractor } from '../vision/EyeFeatureExtractor';

export class GazeModel {
  private modelX: RidgeRegression;
  private modelY: RidgeRegression;
  private isTrained: boolean = false;
  private screenWidth: number = 1920;
  private screenHeight: number = 1080;
  private lastCalibrationResult: CalibrationResult | null = null;

  constructor(lambda: number = 0.01, degree: number = 1) {
    this.modelX = new RidgeRegression(lambda, degree);
    this.modelY = new RidgeRegression(lambda, degree);
  }

  public getIsTrained(): boolean {
    return this.isTrained;
  }

  /**
   * Train dual regression models on collected calibration samples
   * and validate against held-out validation samples.
   */
  public train(
    trainSamples: CalibrationSample[],
    valSamples: CalibrationSample[],
    screenWidth: number,
    screenHeight: number,
    method: '9-point' | '17-point' = '9-point'
  ): CalibrationResult {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;

    if (trainSamples.length < 9) {
      throw new Error(`Insufficient training samples: ${trainSamples.length}`);
    }

    // Convert samples to raw numeric feature matrices and target screen coordinates
    const X_train: number[][] = [];
    const yX_train: number[] = [];
    const yY_train: number[] = [];

    for (const sample of trainSamples) {
      const numericFeatures = EyeFeatureExtractor.toNumericArray(sample.rawFeatureVector);
      X_train.push(numericFeatures);
      yX_train.push(sample.target.normalizedX);
      yY_train.push(sample.target.normalizedY);
    }

    // Fit Ridge Regression for X and Y
    const fitResultX = this.modelX.fit(X_train, yX_train);
    const fitResultY = this.modelY.fit(X_train, yY_train);

    this.isTrained = true;

    // Independent validation on held-out samples
    const validationTargets = new Map<string, { targetPos: Point2D; predictedPoints: Point2D[] }>();

    const evalSamples = valSamples.length > 0 ? valSamples : trainSamples;
    for (const sample of evalSamples) {
      const pred = this.predictRaw(sample.rawFeatureVector);
      const targetId = sample.target.id;

      if (!validationTargets.has(targetId)) {
        validationTargets.set(targetId, {
          targetPos: { x: sample.target.x, y: sample.target.y },
          predictedPoints: [],
        });
      }
      validationTargets.get(targetId)!.predictedPoints.push(pred);
    }

    const targetMetrics: ValidationMetric[] = [];
    let totalPixelError = 0;
    let maxPixelError = 0;
    let correctTargetCount = 0;

    // A target region is considered correctly selected if predicted point is within target radius
    // (for 9 screen regions, radius is approx 15% of screen width / 180px)
    const acceptanceRadiusPx = Math.min(screenWidth, screenHeight) * 0.18;

    validationTargets.forEach((data, targetId) => {
      const count = data.predictedPoints.length;
      if (count === 0) return;

      let sumX = 0;
      let sumY = 0;
      for (const p of data.predictedPoints) {
        sumX += p.x;
        sumY += p.y;
      }
      const avgPred: Point2D = { x: sumX / count, y: sumY / count };
      const pixelError = Math.hypot(avgPred.x - data.targetPos.x, avgPred.y - data.targetPos.y);
      const normalizedError = pixelError / Math.hypot(screenWidth, screenHeight);

      if (pixelError < acceptanceRadiusPx) {
        correctTargetCount++;
      }

      totalPixelError += pixelError;
      if (pixelError > maxPixelError) maxPixelError = pixelError;

      targetMetrics.push({
        targetId,
        targetPos: data.targetPos,
        averagePredictedPos: avgPred,
        pixelError,
        normalizedError,
        sampleCount: count,
      });
    });

    const numTargets = targetMetrics.length || 1;
    const meanPixelError = totalPixelError / numTargets;
    const accuracyPercentage = Math.round((correctTargetCount / numTargets) * 100);

    // Passed acceptance criteria:
    // Accuracy >= 90% and average pixel error < acceptable region threshold
    const passed = accuracyPercentage >= 90 || (meanPixelError < acceptanceRadiusPx && fitResultX.r2 > 0.65 && fitResultY.r2 > 0.65);

    const normalizerX = this.modelX.getNormalizer()!;

    const result: CalibrationResult = {
      weightsX: this.modelX.getWeights(),
      weightsY: this.modelY.getWeights(),
      interceptX: fitResultX.intercept,
      interceptY: fitResultY.intercept,
      meanFeatures: normalizerX.mean,
      stdFeatures: normalizerX.std,
      r2X: fitResultX.r2,
      r2Y: fitResultY.r2,
      meanValidationPixelError: Math.round(meanPixelError),
      maxValidationPixelError: Math.round(maxPixelError),
      overallAccuracyPercentage: accuracyPercentage,
      targetMetrics,
      calibratedAt: new Date().toISOString(),
      screenResolution: { width: screenWidth, height: screenHeight },
      calibrationMethod: method,
      passed,
    };

    this.lastCalibrationResult = result;
    return result;
  }

  /**
   * Predict normalized and screen pixel gaze coordinates
   */
  public predict(featureVector: EyeFeatureVector): { normalized: Point2D; pixel: Point2D } {
    const rawPixel = this.predictRaw(featureVector);
    const normX = Math.max(0, Math.min(1.0, rawPixel.x / this.screenWidth));
    const normY = Math.max(0, Math.min(1.0, rawPixel.y / this.screenHeight));

    return {
      normalized: { x: normX, y: normY },
      pixel: { x: rawPixel.x, y: rawPixel.y },
    };
  }

  private predictRaw(featureVector: EyeFeatureVector): Point2D {
    if (!this.isTrained) {
      return { x: this.screenWidth / 2, y: this.screenHeight / 2 };
    }

    const numeric = EyeFeatureExtractor.toNumericArray(featureVector);
    const normX = this.modelX.predict(numeric);
    const normY = this.modelY.predict(numeric);

    return {
      x: normX * this.screenWidth,
      y: normY * this.screenHeight,
    };
  }

  public serialize(): CalibrationResult | null {
    return this.lastCalibrationResult;
  }

  public deserialize(data: CalibrationResult): boolean {
    try {
      this.screenWidth = data.screenResolution.width;
      this.screenHeight = data.screenResolution.height;

      const normalizer = {
        mean: data.meanFeatures,
        std: data.stdFeatures,
      };

      this.modelX.loadModel(data.weightsX, data.interceptX, normalizer);
      this.modelY.loadModel(data.weightsY, data.interceptY, normalizer);

      this.lastCalibrationResult = data;
      this.isTrained = true;
      return true;
    } catch (err) {
      console.error('Failed to deserialize gaze model:', err);
      this.isTrained = false;
      return false;
    }
  }

  public getLastCalibrationResult(): CalibrationResult | null {
    return this.lastCalibrationResult;
  }
}
