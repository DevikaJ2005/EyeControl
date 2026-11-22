/**
 * Redesign, Gaze Jitter & News Tests
 * Validates:
 * 1. Adaptive Dwell: 350ms grace period during micro-saccades & smooth decay
 * 2. Magnetic target snapping
 * 3. Hysteresis enter & exit boundaries
 * 4. India Today news reader service integration
 * 5. OneEuroFilter2D fixation stabilization & deadband
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DwellEngine } from '../interaction/DwellEngine';
import { SelectionManager } from '../interaction/SelectionManager';
import { OneEuroFilter2D } from '../interaction/OneEuroFilter';
import { IndiaTodayNewsService } from '../services/IndiaTodayNewsService';
import { GazeConfidenceResult, Point2D } from '../types/tracking';

describe('Redesign, Gaze Jitter & News System', () => {
  const mockConfidence: GazeConfidenceResult = {
    confidence: 0.95,
    isReliable: true,
    isBlinking: false,
    isFaceLost: false,
    isPoseExtreme: false,
    isOutOfBounds: false,
    systemStatus: 'validated_tracking',
  };

  describe('1. Adaptive Dwell & Grace Period', () => {
    let dwellEngine: DwellEngine;

    beforeEach(() => {
      dwellEngine = new DwellEngine({ dwellTimeMs: 1000, gracePeriodMs: 350, decayRatePerSec: 1.5 });
    });

    it('preserves dwell progress during brief micro-saccadic deviations (< 350ms)', () => {
      let progressValues: number[] = [];
      const unsub = dwellEngine.subscribe((update) => {
        progressValues.push(update.progress);
      });

      const t0 = 1000;
      // Step 1: Start dwelling on button-1
      dwellEngine.update('button-1', mockConfidence, t0);
      dwellEngine.update('button-1', mockConfidence, t0 + 400); // 40% progress
      expect(progressValues[progressValues.length - 1]).toBeCloseTo(0.4, 1);

      // Step 2: Natural eye tremor / micro-saccade kicks gaze off the button for 200ms
      dwellEngine.update(null, mockConfidence, t0 + 500); // 100ms away (within 350ms grace)
      dwellEngine.update(null, mockConfidence, t0 + 600); // 200ms away (within 350ms grace)

      // Step 3: Gaze returns to button-1 at t0 + 650ms (within 350ms grace period)
      dwellEngine.update('button-1', mockConfidence, t0 + 650);
      // Progress must resume from ~0.4, NOT restart at 0!
      expect(progressValues[progressValues.length - 1]).toBeGreaterThanOrEqual(0.38);

      // Step 4: Continue dwelling to completion
      dwellEngine.update('button-1', mockConfidence, t0 + 1300);
      expect(progressValues[progressValues.length - 1]).toBe(1.0);

      unsub();
    });

    it('decays progress smoothly when gaze stays away longer than grace period', () => {
      let latestProgress = 0;
      const unsub = dwellEngine.subscribe((update) => {
        latestProgress = update.progress;
      });

      const t0 = 1000;
      dwellEngine.update('button-1', mockConfidence, t0);
      dwellEngine.update('button-1', mockConfidence, t0 + 500); // 50% progress
      expect(latestProgress).toBeCloseTo(0.5, 1);

      // Gaze drifts away (exceeding 350ms grace period by 140ms at t0 + 1000)
      dwellEngine.update(null, mockConfidence, t0 + 510);
      dwellEngine.update(null, mockConfidence, t0 + 1000); // 490ms away (140ms past grace threshold)

      // Decayed progress should be less than 0.5, but still smoothly descending
      expect(latestProgress).toBeLessThan(0.5);
      expect(latestProgress).toBeGreaterThan(0);

      unsub();
    });
  });

  describe('2. Magnetic Target Snapping & Hysteresis', () => {
    let selectionManager: SelectionManager;

    beforeEach(() => {
      selectionManager = SelectionManager.getInstance();
      selectionManager.reset();
    });

    it('magnetically attracts gaze toward target center when near interactive element', () => {
      // Register a button at (200, 200) to (300, 260) with center (250, 230)
      selectionManager.registerTarget({
        id: 'test-card',
        element: {
          getBoundingClientRect: () => ({
            left: 200,
            right: 300,
            top: 200,
            bottom: 260,
            width: 100,
            height: 60,
          }),
        } as any,
        rect: { left: 200, right: 300, top: 200, bottom: 260 } as any,
        onSelect: () => {},
        label: 'Test Card',
      });

      // Raw gaze point near the edge of the card at (210, 210)
      const rawGaze: Point2D = { x: 210, y: 210 };
      selectionManager.update(rawGaze, mockConfidence);

      const snapped = selectionManager.getSnappedGazePoint();
      expect(snapped).not.toBeNull();
      if (snapped) {
        // Snapped point must be pulled toward center (250, 230)
        expect(snapped.x).toBeGreaterThan(rawGaze.x);
        expect(snapped.y).toBeGreaterThan(rawGaze.y);
      }
    });

    it('enforces hysteresis: keeps target active across wider exit boundary', () => {
      selectionManager.registerTarget({
        id: 'hysteresis-button',
        element: {
          getBoundingClientRect: () => ({
            left: 100,
            right: 200,
            top: 100,
            bottom: 150,
            width: 100,
            height: 50,
          }),
        } as any,
        rect: { left: 100, right: 200, top: 100, bottom: 150 } as any,
        onSelect: () => {},
        label: 'Hysteresis Button',
      });

      // Enter target at (150, 125)
      selectionManager.update({ x: 150, y: 125 }, mockConfidence);
      expect(selectionManager.getActiveHoveredTarget()?.id).toBe('hysteresis-button');

      // Gaze drifts 30px outside the right edge to x = 230 (within 44px exit tolerance)
      selectionManager.update({ x: 230, y: 125 }, mockConfidence);
      // Thanks to hysteresis exit margin, button remains active!
      expect(selectionManager.getActiveHoveredTarget()?.id).toBe('hysteresis-button');

      // Gaze moves far away to x = 320 (exceeding 44px exit tolerance)
      selectionManager.update({ x: 320, y: 125 }, mockConfidence);
      // Now target is properly released
      expect(selectionManager.getActiveHoveredTarget()).toBeNull();
    });
  });

  describe('3. OneEuroFilter2D Deadband & Fixation Stabilization', () => {
    it('suppresses micro-tremors (< 3.5px) during steady fixation', () => {
      const filter = new OneEuroFilter2D(30, 0.25, 0.008, 1.0, 3.5);

      // Initial steady fixation point
      filter.filter(500, 500, 1000);
      filter.filter(500, 500, 1033);

      // Micro-tremor noise: 2.0px movement
      const noisySample = filter.filter(502, 499, 1066);
      // Filter must absorb the micro-tremor and remain very close to 500
      expect(Math.abs(noisySample.x - 500)).toBeLessThan(1.5);
      expect(Math.abs(noisySample.y - 500)).toBeLessThan(1.5);
    });

    it('promptly tracks intentional fast saccadic eye movements', () => {
      const filter = new OneEuroFilter2D(30, 0.25, 0.008, 1.0, 3.5);

      filter.filter(200, 200, 1000);
      filter.filter(200, 200, 1033);

      // Saccade jump to (600, 400)
      const saccadeSample = filter.filter(600, 400, 1066);
      // Dynamic cutoff scales up with velocity, following the jump
      expect(saccadeSample.x).toBeGreaterThan(400);
      expect(saccadeSample.y).toBeGreaterThan(300);
    });
  });

  describe('4. India Today News Service', () => {
    it('returns structured India Today headlines with real date and segmented paragraphs', async () => {
      const newsService = IndiaTodayNewsService.getInstance();
      const articles = await newsService.getLatestHeadlines();

      expect(articles.length).toBeGreaterThan(0);
      const firstArticle = articles[0];
      expect(firstArticle.source).toBe('India Today');
      expect(firstArticle.title).toBeTruthy();
      expect(firstArticle.paragraphs.length).toBeGreaterThan(0);
      expect(firstArticle.publishedDate).toBeTruthy();
    }, 15000);
  });
});
