/**
 * Stage 1 Assistive Interaction Tests
 * Rigorous automated validation of critical accessibility fixes:
 * 1. Emergency return-home and dwell abort mechanisms
 * 2. Rest mode hands-free wake-up (preventing trapped motor-impaired users)
 * 3. Accidental selection prevention & rearming locks
 * 4. Tracking loss debounced acoustic feedback & recovery transitions
 * 5. Diagnostic reporting accuracy (calibration_required vs temporarily_unavailable)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SelectionManager } from '../interaction/SelectionManager';
import { DwellEngine } from '../interaction/DwellEngine';
import { TrackingAcousticFeedback } from '../services/TrackingAcousticFeedback';
import { GazeConfidence } from '../eyeTracking/GazeConfidence';
import { GazeConfidenceResult, EyeLandmarks, HeadPose, Point2D } from '../types/tracking';

describe('Stage 1 — Critical Assistive Interaction Fixes', () => {
  let selectionManager: SelectionManager;
  let dwellEngine: DwellEngine;

  const mockReliableConfidence: GazeConfidenceResult = {
    confidence: 0.95,
    isReliable: true,
    isBlinking: false,
    isFaceLost: false,
    isPoseExtreme: false,
    isOutOfBounds: false,
    systemStatus: 'validated_tracking',
  };

  const mockUnreliableConfidence: GazeConfidenceResult = {
    confidence: 0.1,
    isReliable: false,
    isBlinking: false,
    isFaceLost: false,
    isPoseExtreme: false,
    isOutOfBounds: true,
    systemStatus: 'temporarily_unavailable',
  };

  beforeEach(() => {
    selectionManager = SelectionManager.getInstance();
    selectionManager.reset();
    dwellEngine = selectionManager.getDwellEngine();
    dwellEngine.setDwellDuration(1000); // 1.0s for testing
  });

  describe('1. Accidental Selection Prevention & Dwell Cancellation', () => {
    it('cancels ongoing dwell immediately when gaze leaves the target', () => {
      dwellEngine.setGracePeriod(0); // Test zero-grace immediate cancellation
      let progressValues: number[] = [];
      const unsub = dwellEngine.subscribe((update) => {
        progressValues.push(update.progress);
      });

      const t0 = 1000;
      // Start dwelling on target-1
      dwellEngine.update('btn-target-1', mockReliableConfidence, t0);
      expect(dwellEngine['state']).toBe('dwelling');

      // 500ms elapsed -> progress 0.5
      dwellEngine.update('btn-target-1', mockReliableConfidence, t0 + 500);
      expect(progressValues[progressValues.length - 1]).toBeCloseTo(0.5, 1);

      // User looks away (null target)
      dwellEngine.update(null, mockReliableConfidence, t0 + 600);
      expect(dwellEngine['state']).toBe('idle');
      expect(dwellEngine['currentTargetId']).toBeNull();
      // Must notify progress = 0
      expect(progressValues[progressValues.length - 1]).toBe(0);

      unsub();
    });

    it('cancels ongoing dwell immediately if tracking confidence drops', () => {
      const t0 = 1000;
      dwellEngine.update('btn-action', mockReliableConfidence, t0);
      dwellEngine.update('btn-action', mockReliableConfidence, t0 + 400);
      expect(dwellEngine['state']).toBe('dwelling');

      // Confidence drops (e.g. eye obscured, out of bounds)
      dwellEngine.update('btn-action', mockUnreliableConfidence, t0 + 500);
      expect(dwellEngine['state']).toBe('idle');
    });

    it('prevents accidental re-triggering with rearming lock until gaze departs', () => {
      let selectionCount = 0;
      dwellEngine.setOnSelect(() => {
        selectionCount++;
      });

      const t0 = 1000;
      dwellEngine.update('btn-submit', mockReliableConfidence, t0);
      // 1000ms completes dwell
      dwellEngine.update('btn-submit', mockReliableConfidence, t0 + 1050);
      expect(selectionCount).toBe(1);
      expect(dwellEngine['state']).toBe('rearming');

      // Continued stare on the same target must NOT trigger again
      dwellEngine.update('btn-submit', mockReliableConfidence, t0 + 2000);
      dwellEngine.update('btn-submit', mockReliableConfidence, t0 + 3000);
      expect(selectionCount).toBe(1);

      // Gaze departs to another area
      dwellEngine.update(null, mockReliableConfidence, t0 + 3100);
      expect(dwellEngine['state']).toBe('idle');

      // Now user can re-engage intentionally
      dwellEngine.update('btn-submit', mockReliableConfidence, t0 + 3200);
      dwellEngine.update('btn-submit', mockReliableConfidence, t0 + 4300);
      expect(selectionCount).toBe(2);
    });
  });

  describe('2. Rest Mode Hands-Free Wake-Up (Assistive Trap Fix)', () => {
    it('locks out regular buttons when Rest Mode is active', () => {
      let standardButtonActivated = false;
      const unreg = selectionManager.registerTarget({
        id: 'btn-standard-action',
        element: {
          getBoundingClientRect: () => ({ left: 100, right: 300, top: 100, bottom: 200, width: 200, height: 100 }),
        } as any,
        rect: { left: 100, right: 300, top: 100, bottom: 200 } as any,
        onSelect: () => { standardButtonActivated = true; },
        label: 'Standard Action',
      });

      // Activate Rest Mode
      selectionManager.setRestMode(true);
      expect(selectionManager.getRestMode()).toBe(true);

      // Gaze hovers over standard button
      const point: Point2D = { x: 200, y: 150 };
      selectionManager.update(point, mockReliableConfidence);

      // DwellEngine must remain idle
      expect(dwellEngine['state']).toBe('idle');
      expect(standardButtonActivated).toBe(false);

      unreg();
    });

    it('allows hands-free wake-up by dwelling on the Wake Up button during Rest Mode', () => {
      let wakeUpActivated = false;
      const unregWake = selectionManager.registerTarget({
        id: 'btn-wake-up',
        element: {
          getBoundingClientRect: () => ({ left: 400, right: 700, top: 300, bottom: 450, width: 300, height: 150 }),
        } as any,
        rect: { left: 400, right: 700, top: 300, bottom: 450 } as any,
        onSelect: () => {
          wakeUpActivated = true;
          selectionManager.setRestMode(false);
        },
        label: 'Wake Up & Resume Control',
        allowInRestMode: true,
      });

      selectionManager.setRestMode(true);
      expect(selectionManager.getRestMode()).toBe(true);

      // User looks at the Wake Up button
      const wakePoint: Point2D = { x: 500, y: 350 };
      const t0 = 1000;

      selectionManager.update(wakePoint, mockReliableConfidence, t0);
      expect(dwellEngine['currentTargetId']).toBe('btn-wake-up');
      expect(dwellEngine['state']).toBe('dwelling');

      // Complete dwell duration through selectionManager
      selectionManager.update(wakePoint, mockReliableConfidence, t0 + 1100);
      expect(wakeUpActivated).toBe(true);
      expect(selectionManager.getRestMode()).toBe(false);

      unregWake();
    });
  });

  describe('3. Corner Abort Zone', () => {
    it('aborts active dwell if gaze glances at screen corners', () => {
      const unreg = selectionManager.registerTarget({
        id: 'btn-active-target',
        element: {
          getBoundingClientRect: () => ({ left: 200, right: 400, top: 200, bottom: 300, width: 200, height: 100 }),
        } as any,
        rect: { left: 200, right: 400, top: 200, bottom: 300 } as any,
        onSelect: () => {},
        label: 'Active Target',
      });

      // User starts dwelling on target
      selectionManager.update({ x: 300, y: 250 }, mockReliableConfidence);
      expect(dwellEngine['state']).toBe('dwelling');

      // Gaze glances at top-left corner (x <= 60, y <= 60)
      selectionManager.update({ x: 20, y: 20 }, mockReliableConfidence);
      expect(dwellEngine['state']).toBe('idle');
      expect(dwellEngine['currentTargetId']).toBeNull();

      unreg();
    });
  });

  describe('4. Tracking Loss & Acoustic Feedback', () => {
    it('does NOT trigger tracking-lost alert for natural blinks under 1.2s', () => {
      const feedback = TrackingAcousticFeedback.getInstance();
      feedback.reset();
      const playLostSpy = vi.spyOn(feedback, 'playTrackingLostTone');

      const t0 = 1000;
      // Frame 1: Tracking lost (blink start)
      let res = feedback.update(false, true, t0);
      expect(res.state).toBe('steady');
      expect(playLostSpy).not.toHaveBeenCalled();

      // Frame 2: 400ms later (mid-blink)
      res = feedback.update(false, true, t0 + 400);
      expect(res.state).toBe('steady');
      expect(playLostSpy).not.toHaveBeenCalled();

      // Frame 3: Blink ends at 500ms
      res = feedback.update(true, true, t0 + 500);
      expect(res.state).toBe('steady');
      expect(playLostSpy).not.toHaveBeenCalled();
    });

    it('triggers tracking-lost alert when tracking is lost for >= 1.2s and chimes upon recovery', () => {
      const feedback = TrackingAcousticFeedback.getInstance();
      feedback.reset();
      const playLostSpy = vi.spyOn(feedback, 'playTrackingLostTone');
      const playRestoredSpy = vi.spyOn(feedback, 'playTrackingRestoredTone');

      const t0 = 1000;
      feedback.update(false, true, t0);
      feedback.update(false, true, t0 + 800);
      expect(playLostSpy).not.toHaveBeenCalled();

      // 1300ms elapsed without face detected -> fires alert
      const resLost = feedback.update(false, true, t0 + 1300);
      expect(resLost.statusChanged).toBe(true);
      expect(resLost.state).toBe('lost');
      expect(playLostSpy).toHaveBeenCalledTimes(1);

      // Now face recovers
      const resRecovered = feedback.update(true, true, t0 + 2000);
      expect(resRecovered.statusChanged).toBe(true);
      expect(resRecovered.state).toBe('recovered');
      expect(playRestoredSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('5. Diagnostic Status Accuracy (Calibration vs Temporarily Unavailable)', () => {
    it('correctly reports calibration_required when uncalibrated rather than temporarily_unavailable', () => {
      const gazeConfidence = new GazeConfidence();
      const mockEyes: EyeLandmarks = {
        leftIrisCenter: { x: 0.5, y: 0.5 },
        leftInnerCorner: { x: 0.4, y: 0.5 },
        leftOuterCorner: { x: 0.6, y: 0.5 },
        leftUpperLid: { x: 0.5, y: 0.4 },
        leftLowerLid: { x: 0.5, y: 0.6 },
        leftEyeWidth: 20,
        leftEyeHeight: 8,
        leftOpenness: 0.4,
        leftNormalizedIris: { x: 0.5, y: 0.5 },
        rightIrisCenter: { x: 0.5, y: 0.5 },
        rightInnerCorner: { x: 0.4, y: 0.5 },
        rightOuterCorner: { x: 0.6, y: 0.5 },
        rightUpperLid: { x: 0.5, y: 0.4 },
        rightLowerLid: { x: 0.5, y: 0.6 },
        rightEyeWidth: 20,
        rightEyeHeight: 8,
        rightOpenness: 0.4,
        rightNormalizedIris: { x: 0.5, y: 0.5 },
        normalizedIpd: 0.4,
      };
      const mockHeadPose: HeadPose = {
        yaw: 0.05,
        pitch: 0.02,
        roll: 0,
        translation: { x: 0, y: 0, z: 0 },
      };

      // Raw prediction from uncalibrated prior falls off-screen (-0.1, 0.5)
      const uncalibratedOutNormPos: Point2D = { x: -0.1, y: 0.5 };

      // When isCalibrationValidated is false:
      const result = gazeConfidence.evaluate(
        true,
        mockEyes,
        mockHeadPose,
        uncalibratedOutNormPos,
        null,
        false // NOT calibrated
      );

      // Must report calibration_required, NOT temporarily_unavailable!
      expect(result.systemStatus).toBe('calibration_required');
      expect(result.isReliable).toBe(false);
      expect(result.reason).toContain('Calibration required');
    });
  });
});
