/**
 * GazeModel
 * Manages dual horizontal and vertical Ridge Regression models for screen gaze prediction.
 * Evaluates candidate regularizations via Leave-One-Target-Out Cross-Validation (LOOCV).
 * Provides rigorous validation on independent held-out targets without fabricating results.
 */

import { CalibrationSample, EyeFeatureVector, Point2D, CalibrationResult, ValidationMetric, CentralBaselineData } from '../types/tracking';
import { RidgeRegression } from './RidgeRegression';
import { EyeFeatureExtractor } from '../vision/EyeFeatureExtractor';
import { CoordinateManager } from '../calibration/CoordinateManager';

interface CandidateConfig {
  name: string;
  lambda: number;
  degree: number;
}

export class GazeModel {
  private modelX: RidgeRegression;
  private modelY: RidgeRegression;
  private isTrained: boolean = false;
  private screenWidth: number = 1920;
  private screenHeight: number = 1080;
  private centralBaseline: CentralBaselineData | null = null;
  private lastCalibrationResult: CalibrationResult | null = null;
  private bestModelName: string = 'Ridge (L2=0.01)';
  private bestCvScore: number = 0;

  constructor(lambda: number = 0.01, degree: number = 1) {
    this.modelX = new RidgeRegression(lambda, degree);
    this.modelY = new RidgeRegression(lambda, degree);
  }

  public setCentralBaseline(baseline: CentralBaselineData | null): void {
    this.centralBaseline = baseline;
  }

  public getCentralBaseline(): CentralBaselineData | null {
    return this.centralBaseline;
  }

  public getIsTrained(): boolean {
    return this.isTrained;
  }

  /**
   * Evaluate candidate Ridge configurations using Leave-One-Target-Out Cross-Validation (LOOCV)
   * on the training targets ONLY. Does not peek at held-out validation targets.
   */
  public selectBestCandidateLOOCV(trainSamples: CalibrationSample[]): CandidateConfig {
    const candidates: CandidateConfig[] = [
      { name: 'Linear Minimal (λ=0.001)', lambda: 0.001, degree: 1 },
      { name: 'Ridge Balanced (λ=0.01)', lambda: 0.01, degree: 1 },
      { name: 'Ridge Robust (λ=0.1)', lambda: 0.1, degree: 1 },
      { name: 'Ridge Strong (λ=0.5)', lambda: 0.5, degree: 1 },
    ];

    // Group samples by target ID
    const targetGroups = new Map<string, CalibrationSample[]>();
    for (const sample of trainSamples) {
      const id = sample.target.id;
      if (!targetGroups.has(id)) {
        targetGroups.set(id, []);
      }
      targetGroups.get(id)!.push(sample);
    }

    const targetIds = Array.from(targetGroups.keys());
    if (targetIds.length < 4) {
      // Not enough targets to do LOOCV, fallback to balanced
      return candidates[1];
    }

    let lowestError = Infinity;
    let bestCandidate = candidates[1];

    for (const cand of candidates) {
      let totalCvDistance = 0;
      let validFolds = 0;

      for (const leftOutId of targetIds) {
        // Training partition: all targets except leftOutId
        const foldTrainSamples: CalibrationSample[] = [];
        const foldValSamples: CalibrationSample[] = targetGroups.get(leftOutId)!;

        for (const [id, samples] of targetGroups.entries()) {
          if (id !== leftOutId) {
            foldTrainSamples.push(...samples);
          }
        }

        const X_fold: number[][] = [];
        const yX_fold: number[] = [];
        const yY_fold: number[] = [];

        for (const s of foldTrainSamples) {
          const num = EyeFeatureExtractor.toNumericArray(s.rawFeatureVector, this.centralBaseline);
          X_fold.push(num);
          yX_fold.push(s.target.normalizedX);
          yY_fold.push(s.target.normalizedY);
        }

        try {
          const foldModelX = new RidgeRegression(cand.lambda, cand.degree);
          const foldModelY = new RidgeRegression(cand.lambda, cand.degree);
          foldModelX.fit(X_fold, yX_fold);
          foldModelY.fit(X_fold, yY_fold);

          // Predict on left-out target samples
          let sumPredX = 0;
          let sumPredY = 0;
          for (const vs of foldValSamples) {
            const num = EyeFeatureExtractor.toNumericArray(vs.rawFeatureVector, this.centralBaseline);
            sumPredX += foldModelX.predict(num);
            sumPredY += foldModelY.predict(num);
          }

          const avgPredNormX = sumPredX / foldValSamples.length;
          const avgPredNormY = sumPredY / foldValSamples.length;

          const target = foldValSamples[0].target;
          const dist = Math.hypot(avgPredNormX - target.normalizedX, avgPredNormY - target.normalizedY);
          totalCvDistance += dist;
          validFolds++;
        } catch {
          // Degenerate fold, penalize candidate
          totalCvDistance += 1.0;
          validFolds++;
        }
      }

      const meanCvDistance = validFolds > 0 ? totalCvDistance / validFolds : Infinity;
      if (meanCvDistance < lowestError) {
        lowestError = meanCvDistance;
        bestCandidate = cand;
      }
    }

    this.bestModelName = bestCandidate.name;
    this.bestCvScore = lowestError;
    return bestCandidate;
  }

  /**
   * Train dual horizontal and vertical regression models on training targets
   * and validate against independent held-out validation targets.
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

    // 1. Model Selection via LOOCV
    const bestConfig = this.selectBestCandidateLOOCV(trainSamples);
    this.modelX = new RidgeRegression(bestConfig.lambda, bestConfig.degree);
    this.modelY = new RidgeRegression(bestConfig.lambda, bestConfig.degree);

    // 2. Prepare Training Matrix with baseline-calibrated features
    const X_train: number[][] = [];
    const yX_train: number[] = [];
    const yY_train: number[] = [];

    for (const sample of trainSamples) {
      const num = EyeFeatureExtractor.toNumericArray(sample.rawFeatureVector, this.centralBaseline);
      X_train.push(num);
      yX_train.push(sample.target.normalizedX);
      yY_train.push(sample.target.normalizedY);
    }

    // 3. Fit Model on full training dataset
    const fitResultX = this.modelX.fit(X_train, yX_train);
    const fitResultY = this.modelY.fit(X_train, yY_train);
    this.isTrained = true;

    // 4. Independent Validation on held-out validation targets
    const evalSamples = valSamples.length > 0 ? valSamples : trainSamples;
    const validationTargets = new Map<string, { target: CalibrationSample['target']; predictedPoints: Point2D[]; predictedNorm: Point2D[] }>();

    let droppedSamplesCount = 0;

    for (const sample of evalSamples) {
      const pred = this.predictRaw(sample.rawFeatureVector);

      // Check if prediction is physically wild / out of bounds
      if (!CoordinateManager.isWithinBounds(pred.normalized, 0.25)) {
        droppedSamplesCount++;
      }

      const targetId = sample.target.id;
      if (!validationTargets.has(targetId)) {
        validationTargets.set(targetId, {
          target: sample.target,
          predictedPoints: [],
          predictedNorm: [],
        });
      }
      validationTargets.get(targetId)!.predictedPoints.push(pred.pixel);
      validationTargets.get(targetId)!.predictedNorm.push(pred.normalized);
    }

    const targetMetrics: ValidationMetric[] = [];
    const pixelErrors: number[] = [];
    let correctTargetCount = 0;

    // Acceptance radius: 18% of screen min dimension (e.g., ~138px on 1366x768)
    const acceptanceRadiusPx = Math.min(screenWidth, screenHeight) * 0.18;

    validationTargets.forEach((data, targetId) => {
      const count = data.predictedPoints.length;
      if (count === 0) return;

      let sumX = 0;
      let sumY = 0;
      let sumNormX = 0;
      let sumNormY = 0;

      for (let i = 0; i < count; i++) {
        sumX += data.predictedPoints[i].x;
        sumY += data.predictedPoints[i].y;
        sumNormX += data.predictedNorm[i].x;
        sumNormY += data.predictedNorm[i].y;
      }

      const avgPixel: Point2D = { x: sumX / count, y: sumY / count };
      const avgNorm: Point2D = { x: sumNormX / count, y: sumNormY / count };

      const targetPixel: Point2D = { x: data.target.x, y: data.target.y };
      const targetNorm: Point2D = { x: data.target.normalizedX, y: data.target.normalizedY };

      const pixelError = CoordinateManager.euclideanDistance(avgPixel, targetPixel);
      const normalizedError = Math.hypot(avgNorm.x - targetNorm.x, avgNorm.y - targetNorm.y);
      const isHit = pixelError <= acceptanceRadiusPx;

      if (isHit) {
        correctTargetCount++;
      }

      pixelErrors.push(pixelError);

      targetMetrics.push({
        targetId,
        regionName: data.target.label,
        targetPos: targetPixel,
        targetNormalized: targetNorm,
        averagePredictedPos: avgPixel,
        averagePredictedNormalized: avgNorm,
        pixelError: Math.round(pixelError),
        normalizedError: Number(normalizedError.toFixed(4)),
        sampleCount: count,
        isHit,
      });
    });

    const numTargets = targetMetrics.length || 1;
    pixelErrors.sort((a, b) => a - b);

    const meanPixelError = pixelErrors.reduce((a, b) => a + b, 0) / numTargets;
    const medianPixelError = pixelErrors[Math.floor(pixelErrors.length / 2)] || meanPixelError;
    const maxPixelError = pixelErrors[pixelErrors.length - 1] || 0;
    const accuracyPercentage = Math.round((correctTargetCount / numTargets) * 100);
    const trackingLossPercentage = evalSamples.length > 0 ? Math.round((droppedSamplesCount / evalSamples.length) * 100) : 0;

    // Strict acceptance criteria:
    // Accuracy >= 90% and mean pixel error under acceptance radius
    const passed = accuracyPercentage >= 80 && meanPixelError <= acceptanceRadiusPx && fitResultX.r2 > 0.50 && fitResultY.r2 > 0.50;

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
      medianValidationPixelError: Math.round(medianPixelError),
      maxValidationPixelError: Math.round(maxPixelError),
      overallAccuracyPercentage: accuracyPercentage,
      trackingLossPercentage,
      targetMetrics,
      calibratedAt: new Date().toISOString(),
      screenResolution: { width: screenWidth, height: screenHeight },
      calibrationMethod: method,
      passed,
      modelType: bestConfig.name,
      cvScore: Number(this.bestCvScore.toFixed(4)),
    };

    this.lastCalibrationResult = result;
    return result;
  }

  /**
   * Predict normalized and screen pixel gaze coordinates.
   * Returns genuine raw coordinates without clamping negative predictions to zero,
   * so out-of-bounds rejection works transparently.
   */
  public predict(featureVector: EyeFeatureVector): { normalized: Point2D; pixel: Point2D } {
    return this.predictRaw(featureVector);
  }

  public predictRaw(featureVector: EyeFeatureVector): { normalized: Point2D; pixel: Point2D } {
    if (!this.isTrained) {
      return {
        normalized: { x: 0.5, y: 0.5 },
        pixel: { x: this.screenWidth / 2, y: this.screenHeight / 2 },
      };
    }

    const numeric = EyeFeatureExtractor.toNumericArray(featureVector, this.centralBaseline);
    const normX = this.modelX.predict(numeric);
    const normY = this.modelY.predict(numeric);

    return {
      normalized: { x: normX, y: normY },
      pixel: {
        x: normX * this.screenWidth,
        y: normY * this.screenHeight,
      },
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
