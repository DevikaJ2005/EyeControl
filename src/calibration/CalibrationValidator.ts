/**
 * CalibrationValidator
 * Evaluates trained GazeModel against held-out validation points.
 * Calculates measurable error and pass/fail status without fake accuracy.
 */

import { GazeModel } from '../eyeTracking/GazeModel';
import { CalibrationSample, CalibrationResult, ValidationMetric, Point2D } from '../types/tracking';

export class CalibrationValidator {
  /**
   * Run independent validation trials
   */
  public static validate(
    model: GazeModel,
    validationSamples: CalibrationSample[],
    screenWidth: number,
    screenHeight: number
  ): {
    metrics: ValidationMetric[];
    overallAccuracy: number;
    meanPixelError: number;
    passed: boolean;
  } {
    const targets = new Map<string, { targetPos: Point2D; preds: Point2D[] }>();

    for (const sample of validationSamples) {
      const pred = model.predict(sample.rawFeatureVector);
      const id = sample.target.id;
      if (!targets.has(id)) {
        targets.set(id, {
          targetPos: { x: sample.target.x, y: sample.target.y },
          preds: [],
        });
      }
      targets.get(id)!.preds.push(pred.pixel);
    }

    const metrics: ValidationMetric[] = [];
    let totalError = 0;
    let hitCount = 0;
    const acceptanceRadius = Math.min(screenWidth, screenHeight) * 0.18;

    targets.forEach((val, id) => {
      const count = val.preds.length;
      if (count === 0) return;

      let sumX = 0;
      let sumY = 0;
      for (const p of val.preds) {
        sumX += p.x;
        sumY += p.y;
      }
      const avgPred: Point2D = { x: sumX / count, y: sumY / count };
      const pixelError = Math.hypot(avgPred.x - val.targetPos.x, avgPred.y - val.targetPos.y);

      const isHit = pixelError <= acceptanceRadius;
      if (isHit) {
        hitCount++;
      }

      totalError += pixelError;
      metrics.push({
        targetId: id,
        targetPos: val.targetPos,
        targetNormalized: { x: val.targetPos.x / screenWidth, y: val.targetPos.y / screenHeight },
        averagePredictedPos: avgPred,
        averagePredictedNormalized: { x: avgPred.x / screenWidth, y: avgPred.y / screenHeight },
        pixelError: Math.round(pixelError),
        normalizedError: Number((pixelError / Math.hypot(screenWidth, screenHeight)).toFixed(4)),
        sampleCount: count,
        isHit,
      });
    });

    const targetCount = metrics.length || 1;
    const meanPixelError = Math.round(totalError / targetCount);
    const overallAccuracy = Math.round((hitCount / targetCount) * 100);

    const passed = overallAccuracy >= 90 || (meanPixelError <= acceptanceRadius && targetCount >= 4);

    return {
      metrics,
      overallAccuracy,
      meanPixelError,
      passed,
    };
  }
}
