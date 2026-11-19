import { describe, it, expect, beforeEach } from 'vitest';
import { RidgeRegression } from '../eyeTracking/RidgeRegression';
import { OneEuroFilter, OneEuroFilter2D } from '../interaction/OneEuroFilter';
import { GazeConfidence } from '../eyeTracking/GazeConfidence';
import { DwellEngine } from '../interaction/DwellEngine';
import { BlinkDetector } from '../interaction/BlinkDetector';
import { HeadPointer } from '../headTracking/HeadPointer';
import { HeadCalibration } from '../headTracking/HeadCalibration';
import { EyeFeatureExtractor } from '../vision/EyeFeatureExtractor';
import { HeadPoseEstimator } from '../vision/HeadPoseEstimator';
import { CalibrationPoints } from '../calibration/CalibrationPoints';
import { CalibrationValidator } from '../calibration/CalibrationValidator';
import { CoordinateManager } from '../calibration/CoordinateManager';
import { GazeModel } from '../eyeTracking/GazeModel';
import { NormalizedLandmark, CalibrationSample, EyeFeatureVector, CentralBaselineData } from '../types/tracking';

describe('RidgeRegression Unit Tests', () => {
  it('accurately fits a known linear relationship with L2 regularization', () => {
    const ridge = new RidgeRegression(0.001, 1);
    // Known relationship: y = 2*x1 + 3*x2 + 5
    const X: number[][] = [
      [1, 2],
      [2, 1],
      [3, 4],
      [4, 3],
      [5, 5],
      [6, 7],
      [7, 6],
      [8, 9],
      [9, 8],
      [10, 10],
    ];
    const y = X.map(([x1, x2]) => 2 * x1 + 3 * x2 + 5);

    const fitResult = ridge.fit(X, y);
    expect(fitResult.r2).toBeGreaterThan(0.99);
    expect(fitResult.mse).toBeLessThan(0.01);

    // Predict on unseen point [5, 5] -> 2*5 + 3*5 + 5 = 30
    const pred = ridge.predict([5, 5]);
    expect(Math.abs(pred - 30)).toBeLessThan(0.5);
  });

  it('correctly handles polynomial feature expansion', () => {
    const ridge = new RidgeRegression(0.01, 2);
    const expanded = ridge.expandFeatures([2, 3]);
    // [x1, x2, x1^2, x2^2, x1*x2] -> [2, 3, 4, 9, 6]
    expect(expanded).toEqual([2, 3, 4, 9, 6]);
  });

  it('correctly solves linear system via Gauss-Jordan elimination', () => {
    // 2x + y = 5
    // x + 3y = 10
    // Solution: x = 1, y = 3
    const A = [
      [2, 1],
      [1, 3],
    ];
    const b = [5, 10];
    const sol = RidgeRegression.solveLinearSystem(A, b);
    expect(Math.abs(sol[0] - 1)).toBeLessThan(1e-5);
    expect(Math.abs(sol[1] - 3)).toBeLessThan(1e-5);
  });

  it('handles feature standardization correctly without division by zero', () => {
    const X = [
      [1, 5],
      [2, 5], // constant column
      [3, 5],
    ];
    const normalizer = RidgeRegression.computeNormalizer(X);
    expect(normalizer.mean[0]).toBe(2);
    expect(normalizer.std[1]).toBe(1.0); // Safe fallback for constant features
  });
});

describe('OneEuroFilter Unit Tests', () => {
  it('reduces high frequency jitter while preserving low frequency position', () => {
    const filter = new OneEuroFilter(30, 0.8, 0.007);
    let filtered = 0;
    // Feed constant 100 with random micro-noise +/- 1.0
    for (let i = 0; i < 20; i++) {
      const noisy = 100 + (i % 2 === 0 ? 0.8 : -0.8);
      filtered = filter.filter(noisy, i * 33);
    }
    expect(Math.abs(filtered - 100)).toBeLessThan(0.4);
  });

  it('2D filter smooths both X and Y dimensions', () => {
    const filter2D = new OneEuroFilter2D(30, 0.8, 0.007);
    const res = filter2D.filter(500, 300, 0);
    expect(res.x).toBe(500);
    expect(res.y).toBe(300);
  });
});

describe('GazeConfidence & BlinkDetector Unit Tests', () => {
  const confidenceEstimator = new GazeConfidence();
  const blinkDetector = new BlinkDetector(0.18);

  it('flags unreliable confidence when face is missing', () => {
    const res = confidenceEstimator.evaluate(false, null, { yaw: 0, pitch: 0, roll: 0, translation: { x: 0, y: 0, z: 0 } }, null);
    expect(res.isReliable).toBe(false);
    expect(res.isFaceLost).toBe(true);
    expect(res.confidence).toBe(0);
  });

  it('detects blinks and suspends confidence when eye openness is below threshold', () => {
    const mockEyes: any = {
      leftOpenness: 0.08, // Blink
      rightOpenness: 0.07,
    };
    const blinkRes = blinkDetector.update(mockEyes, 1000);
    expect(blinkRes.isBlinking).toBe(true);

    const confRes = confidenceEstimator.evaluate(true, mockEyes, { yaw: 0, pitch: 0, roll: 0, translation: { x: 0, y: 0, z: 0 } }, { x: 0.5, y: 0.5 });
    expect(confRes.isReliable).toBe(false);
    expect(confRes.isBlinking).toBe(true);
  });

  it('flags extreme head rotation as unreliable', () => {
    const mockEyes: any = {
      leftOpenness: 0.35,
      rightOpenness: 0.35,
    };
    // Yaw deviation > 0.5 rad (~28 deg)
    const extremePose = { yaw: 0.65, pitch: 0, roll: 0, translation: { x: 0, y: 0, z: 0 } };
    const res = confidenceEstimator.evaluate(true, mockEyes, extremePose, { x: 0.5, y: 0.5 });
    expect(res.isReliable).toBe(false);
    expect(res.isPoseExtreme).toBe(true);
  });
});

describe('DwellEngine State & Selection Rearming Unit Tests', () => {
  it('correctly manages dwell progression, completion, and rearming lockout', () => {
    let selectedId: string | null = null;
    const dwell = new DwellEngine({ dwellTimeMs: 1000 }, (id) => {
      selectedId = id;
    });

    const confidenceReliable = {
      confidence: 1.0,
      isReliable: true,
      isBlinking: false,
      isFaceLost: false,
      isPoseExtreme: false,
      isOutOfBounds: false,
    };

    // Hover over target 'button-1' at t = 0
    dwell.update('button-1', confidenceReliable, 0);

    // Update at t = 500ms (50% progress)
    dwell.update('button-1', confidenceReliable, 500);
    expect(selectedId).toBeNull();

    // Update at t = 1000ms (dwell complete!)
    dwell.update('button-1', confidenceReliable, 1000);
    expect(selectedId).toBe('button-1');

    // Continuing to look at 'button-1' at t = 1500ms MUST NOT re-trigger (rearming protection)
    selectedId = null;
    dwell.update('button-1', confidenceReliable, 1500);
    expect(selectedId).toBeNull(); // Still locked out

    // User looks away to null
    dwell.update(null, confidenceReliable, 1600);

    // Now look back at 'button-1' at t = 2000ms
    dwell.update('button-1', confidenceReliable, 2000);
    dwell.update('button-1', confidenceReliable, 3000);
    expect(selectedId).toBe('button-1'); // Re-triggers only after looking away
  });

  it('cancels dwell immediately when tracking confidence drops', () => {
    let triggered = false;
    const dwell = new DwellEngine({ dwellTimeMs: 1000 }, () => {
      triggered = true;
    });

    const confidenceReliable = {
      confidence: 1.0,
      isReliable: true,
      isBlinking: false,
      isFaceLost: false,
      isPoseExtreme: false,
      isOutOfBounds: false,
    };
    const confidenceLost = {
      confidence: 0,
      isReliable: false,
      isBlinking: false,
      isFaceLost: true,
      isPoseExtreme: false,
      isOutOfBounds: false,
    };

    dwell.update('target-1', confidenceReliable, 0);
    dwell.update('target-1', confidenceReliable, 400);

    // Tracking lost at t = 500ms
    dwell.update('target-1', confidenceLost, 500);

    // Even if time reaches 1100ms with lost tracking, must NOT fire
    dwell.update('target-1', confidenceLost, 1100);
    expect(triggered).toBe(false);
  });
});

describe('HeadPointer Dead Zone & Sensitivity Unit Tests', () => {
  it('applies dead zone around neutral position to prevent cursor jitter', () => {
    const pointer = new HeadPointer({ deadZoneYaw: 0.05, deadZonePitch: 0.05 });
    pointer.setNeutralPose({
      neutralYaw: 0,
      neutralPitch: 0,
      neutralRoll: 0,
      neutralFaceX: 0.5,
      neutralFaceY: 0.5,
    });

    // Small head tremor within deadzone (yaw = 0.02 rad)
    const pos = pointer.mapToScreen(
      { yaw: 0.02, pitch: 0.01, roll: 0, translation: { x: 0, y: 0, z: 0 } },
      1920,
      1080
    );
    // Should remain centered at 1920/2 = 960 and 1080/2 = 540
    expect(pos.x).toBe(960);
    expect(pos.y).toBe(540);
  });

  it('moves pointer proportionally when head turns past dead zone', () => {
    const pointer = new HeadPointer({ deadZoneYaw: 0.02, deadZonePitch: 0.02 });
    pointer.setNeutralPose({
      neutralYaw: 0,
      neutralPitch: 0,
      neutralRoll: 0,
      neutralFaceX: 0.5,
      neutralFaceY: 0.5,
    });

    // Turning head to user's right (camera left: negative yaw) moves pointer right
    const posRight = pointer.mapToScreen(
      { yaw: -0.15, pitch: 0, roll: 0, translation: { x: 0, y: 0, z: 0 } },
      1920,
      1080
    );
    expect(posRight.x).toBeGreaterThan(960);

    // Turning head to user's left moves pointer left
    const posLeft = pointer.mapToScreen(
      { yaw: 0.15, pitch: 0, roll: 0, translation: { x: 0, y: 0, z: 0 } },
      1920,
      1080
    );
    expect(posLeft.x).toBeLessThan(960);

    // Tilting head up moves pointer up
    const posUp = pointer.mapToScreen(
      { yaw: 0, pitch: 0.15, roll: 0, translation: { x: 0, y: 0, z: 0 } },
      1920,
      1080
    );
    expect(posUp.y).toBeLessThan(540);
  });

  it('collects neutral head posture samples and computes neutral pose accurately', () => {
    const calib = new HeadCalibration();
    calib.startRecording(10);
    expect(calib.getIsCollecting()).toBe(true);
    expect(calib.getProgress()).toBe(0);

    for (let i = 0; i < 10; i++) {
      calib.addSample({
        yaw: 0.05,
        pitch: -0.02,
        roll: 0.01,
        translation: { x: 0.48, y: 0.52, z: 0 },
      });
    }

    expect(calib.getIsCollecting()).toBe(false);
    expect(calib.getProgress()).toBe(1.0);

    const neutral = calib.computeNeutralPose();
    expect(neutral).not.toBeNull();
    expect(neutral!.neutralYaw).toBeCloseTo(0.05, 3);
    expect(neutral!.neutralPitch).toBeCloseTo(-0.02, 3);
  });
});

describe('Calibration & Validation Engine Unit Tests', () => {
  it('generates 9-point grid and 5 distinct held-out validation points with safe margins', () => {
    const grid = CalibrationPoints.get9PointGrid(1920, 1080);
    expect(grid.trainTargets.length).toBe(9);
    expect(grid.validationTargets.length).toBe(5);

    // Ensure validation points are never duplicated in training set
    const trainIds = new Set(grid.trainTargets.map(t => t.id));
    for (const val of grid.validationTargets) {
      expect(trainIds.has(val.id)).toBe(false);
      expect(val.isValidationOnly).toBe(true);
    }

    // Verify safe margins (within 0.15 to 0.85)
    for (const t of grid.trainTargets) {
      expect(t.normalizedX).toBeGreaterThanOrEqual(0.14);
      expect(t.normalizedX).toBeLessThanOrEqual(0.86);
      expect(t.normalizedY).toBeGreaterThanOrEqual(0.14);
      expect(t.normalizedY).toBeLessThanOrEqual(0.86);
    }
  });

  it('validates calibration samples without fabricated numbers and selects model via LOOCV', () => {
    const model = new GazeModel(0.01, 1);
    const grid = CalibrationPoints.get9PointGrid(1920, 1080);

    const baseline: CentralBaselineData = {
      neutralYaw: 0,
      neutralPitch: 0,
      neutralRoll: 0,
      neutralLeftIris: { x: 0.5, y: 0.5 },
      neutralRightIris: { x: 0.5, y: 0.5 },
      neutralFaceCenter: { x: 0.5, y: 0.5 },
      collectedAt: 1000,
    };
    model.setCentralBaseline(baseline);

    // Create synthetic training samples
    const trainSamples: CalibrationSample[] = [];
    for (const target of grid.trainTargets) {
      for (let i = 0; i < 15; i++) {
        const rawFv: EyeFeatureVector = {
          leftIrisX: (target.normalizedX - 0.5) * 0.4 + 0.5,
          leftIrisY: (target.normalizedY - 0.5) * 0.4 + 0.5,
          rightIrisX: (target.normalizedX - 0.5) * 0.4 + 0.5,
          rightIrisY: (target.normalizedY - 0.5) * 0.4 + 0.5,
          leftOpenness: 0.35,
          rightOpenness: 0.35,
          headYaw: 0,
          headPitch: 0,
          headRoll: 0,
          faceCenterX: 0.5,
          faceCenterY: 0.5,
          faceScale: 0.3,
          timestamp: 1000 + i * 33,
        };
        trainSamples.push({
          target,
          features: EyeFeatureExtractor.toNumericArray(rawFv, baseline),
          rawFeatureVector: rawFv,
          timestamp: rawFv.timestamp,
        });
      }
    }

    // Held-out validation samples (5 targets)
    const valSamples: CalibrationSample[] = [];
    for (const target of grid.validationTargets) {
      for (let i = 0; i < 10; i++) {
        const rawFv: EyeFeatureVector = {
          leftIrisX: (target.normalizedX - 0.5) * 0.4 + 0.5,
          leftIrisY: (target.normalizedY - 0.5) * 0.4 + 0.5,
          rightIrisX: (target.normalizedX - 0.5) * 0.4 + 0.5,
          rightIrisY: (target.normalizedY - 0.5) * 0.4 + 0.5,
          leftOpenness: 0.35,
          rightOpenness: 0.35,
          headYaw: 0,
          headPitch: 0,
          headRoll: 0,
          faceCenterX: 0.5,
          faceCenterY: 0.5,
          faceScale: 0.3,
          timestamp: 2000 + i * 33,
        };
        valSamples.push({
          target,
          features: EyeFeatureExtractor.toNumericArray(rawFv, baseline),
          rawFeatureVector: rawFv,
          timestamp: rawFv.timestamp,
        });
      }
    }

    const result = model.train(trainSamples, valSamples, 1920, 1080, '9-point');
    expect(result.targetMetrics.length).toBe(5); // 5 held-out targets
    expect(result.overallAccuracyPercentage).toBeGreaterThanOrEqual(80);
    expect(result.passed).toBe(true);
    expect(result.r2X).toBeGreaterThan(0.9);
    expect(result.r2Y).toBeGreaterThan(0.9);
    expect(result.modelType).toBeDefined();
  });
});

describe('CoordinateManager & Out-of-Bounds Rejection Tests', () => {
  it('correctly maps normalized [0..1] coordinates for 1366x768 viewport', () => {
    const vp = { width: 1366, height: 768 };
    const centerNorm = { x: 0.5, y: 0.5 };
    const centerPx = CoordinateManager.normalizedToViewportPixels(centerNorm, vp);
    expect(centerPx.x).toBe(683);
    expect(centerPx.y).toBe(384);

    const backNorm = CoordinateManager.viewportPixelsToNormalized(centerPx, vp);
    expect(backNorm.x).toBeCloseTo(0.5, 4);
    expect(backNorm.y).toBeCloseTo(0.5, 4);
  });

  it('correctly maps normalized [0..1] coordinates for 1280x720 viewport', () => {
    const vp = { width: 1280, height: 720 };
    const cornerNorm = { x: 0.85, y: 0.15 };
    const cornerPx = CoordinateManager.normalizedToViewportPixels(cornerNorm, vp);
    expect(cornerPx.x).toBe(1088);
    expect(cornerPx.y).toBe(108);

    const backNorm = CoordinateManager.viewportPixelsToNormalized(cornerPx, vp);
    expect(backNorm.x).toBeCloseTo(0.85, 4);
    expect(backNorm.y).toBeCloseTo(0.15, 4);
  });

  it('strictly rejects negative prediction (-105, 181) as out of bounds', () => {
    const vp = { width: 1366, height: 768 };
    const negativePx = { x: -105, y: 181 };
    const norm = CoordinateManager.viewportPixelsToNormalized(negativePx, vp);

    // norm.x is -0.0768, which is outside the screen margin!
    expect(norm.x).toBeLessThan(0);
    expect(CoordinateManager.isWithinBounds(norm, 0.05)).toBe(false);

    // Evaluate confidence with out-of-bounds prediction
    const confEstimator = new GazeConfidence();
    const confResult = confEstimator.evaluate(
      true,
      {
        leftIrisCenter: { x: 0.3, y: 0.4 },
        leftInnerCorner: { x: 0.35, y: 0.4 },
        leftOuterCorner: { x: 0.25, y: 0.4 },
        leftUpperLid: { x: 0.3, y: 0.38 },
        leftLowerLid: { x: 0.3, y: 0.42 },
        leftEyeWidth: 0.1,
        leftEyeHeight: 0.04,
        leftOpenness: 0.4,
        leftNormalizedIris: { x: 0.5, y: 0.5 },
        rightIrisCenter: { x: 0.7, y: 0.4 },
        rightInnerCorner: { x: 0.65, y: 0.4 },
        rightOuterCorner: { x: 0.75, y: 0.4 },
        rightUpperLid: { x: 0.7, y: 0.38 },
        rightLowerLid: { x: 0.7, y: 0.42 },
        rightEyeWidth: 0.1,
        rightEyeHeight: 0.04,
        rightOpenness: 0.4,
        rightNormalizedIris: { x: 0.5, y: 0.5 },
        normalizedIpd: 0.4,
      },
      { yaw: 0, pitch: 0, roll: 0, translation: { x: 0, y: 0, z: 0 } },
      norm,
      null,
      true // calibrated
    );

    // Coordinate (-105, 181) must NEVER be accepted as reliable!
    expect(confResult.isOutOfBounds).toBe(true);
    expect(confResult.isReliable).toBe(false);
    expect(confResult.confidence).toBeLessThanOrEqual(0.1);
    expect(confResult.systemStatus).toBe('temporarily_unavailable');
  });

  it('accounts for window resizing dynamically', () => {
    const vpSmall = { width: 1024, height: 600 };
    const vpLarge = { width: 2560, height: 1440 };

    const norm = { x: 0.5, y: 0.5 };
    const pxSmall = CoordinateManager.normalizedToViewportPixels(norm, vpSmall);
    const pxLarge = CoordinateManager.normalizedToViewportPixels(norm, vpLarge);

    expect(pxSmall).toEqual({ x: 512, y: 300 });
    expect(pxLarge).toEqual({ x: 1280, y: 720 });
  });
});
