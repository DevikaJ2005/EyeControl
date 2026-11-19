/**
 * BlinkDetector
 * Detects natural blinks and closed-eye states.
 * Suspends dwell interaction immediately when eyes close to prevent accidental activation.
 */

import { EyeLandmarks } from '../types/tracking';

export interface BlinkState {
  isBlinking: boolean;
  leftOpenness: number;
  rightOpenness: number;
  blinkDurationMs: number;
  isIntentionalLongBlink: boolean;
}

export class BlinkDetector {
  private blinkThreshold: number = 0.18;
  private blinkStartTime: number | null = null;
  private intentionalBlinkThresholdMs: number = 650; // Long deliberate blink (>650ms)
  private isBlinking: boolean = false;

  constructor(blinkThreshold: number = 0.18) {
    this.blinkThreshold = blinkThreshold;
  }

  public update(eyes: EyeLandmarks | null, now: number = performance.now()): BlinkState {
    if (!eyes) {
      return {
        isBlinking: true,
        leftOpenness: 0,
        rightOpenness: 0,
        blinkDurationMs: 0,
        isIntentionalLongBlink: false,
      };
    }

    const closed = eyes.leftOpenness < this.blinkThreshold || eyes.rightOpenness < this.blinkThreshold;

    if (closed) {
      if (!this.isBlinking) {
        this.isBlinking = true;
        this.blinkStartTime = now;
      }
      const duration = now - (this.blinkStartTime ?? now);
      return {
        isBlinking: true,
        leftOpenness: eyes.leftOpenness,
        rightOpenness: eyes.rightOpenness,
        blinkDurationMs: duration,
        isIntentionalLongBlink: duration >= this.intentionalBlinkThresholdMs,
      };
    } else {
      const wasBlinking = this.isBlinking;
      this.isBlinking = false;
      this.blinkStartTime = null;

      return {
        isBlinking: false,
        leftOpenness: eyes.leftOpenness,
        rightOpenness: eyes.rightOpenness,
        blinkDurationMs: 0,
        isIntentionalLongBlink: false,
      };
    }
  }

  public getIsBlinking(): boolean {
    return this.isBlinking;
  }
}
