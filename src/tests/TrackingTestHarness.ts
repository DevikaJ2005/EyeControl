/**
 * TrackingTestHarness
 * Accuracy measurement harness for real-webcam testing sessions.
 * Records deliberate selection trials, correct/incorrect selections,
 * and generates a dated test results record.
 */

export interface TrialRecord {
  targetId: string;
  targetX: number;
  targetY: number;
  predictedX: number;
  predictedY: number;
  pixelError: number;
  correct: boolean;
  selectionTimeMs: number;
  trackingLosses: number;
}

export interface TestSession {
  date: string;
  browser: string;
  cameraResolution: string;
  inputMode: 'eye' | 'head';
  calibrationMethod: string;
  totalTrials: number;
  correctSelections: number;
  incorrectSelections: number;
  accuracyPercent: number;
  medianSelectionTimeMs: number;
  trackingLossCount: number;
  environmentalConditions: string;
  trials: TrialRecord[];
}

export class TrackingTestHarness {
  private trials: TrialRecord[] = [];
  private sessionStartTime: number = performance.now();

  public recordTrial(trial: TrialRecord): void {
    this.trials.push(trial);
  }

  public generateReport(
    inputMode: 'eye' | 'head',
    calibrationMethod: string,
    environmentNotes: string
  ): TestSession {
    const totalTrials = this.trials.length;
    const correctSelections = this.trials.filter(t => t.correct).length;
    const incorrectSelections = totalTrials - correctSelections;
    const accuracyPercent = totalTrials > 0 ? Math.round((correctSelections / totalTrials) * 100) : 0;

    const sortedTimes = [...this.trials].map(t => t.selectionTimeMs).sort((a, b) => a - b);
    const medianSelectionTimeMs = sortedTimes.length > 0
      ? sortedTimes[Math.floor(sortedTimes.length / 2)]
      : 0;

    const trackingLossCount = this.trials.reduce((sum, t) => sum + t.trackingLosses, 0);

    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
    const browser = ua.includes('Edg') ? 'Microsoft Edge' : ua.includes('Chrome') ? 'Google Chrome' : 'Unknown';

    return {
      date: new Date().toISOString(),
      browser,
      cameraResolution: '640x480',
      inputMode,
      calibrationMethod,
      totalTrials,
      correctSelections,
      incorrectSelections,
      accuracyPercent,
      medianSelectionTimeMs,
      trackingLossCount,
      environmentalConditions: environmentNotes,
      trials: [...this.trials],
    };
  }

  public reset(): void {
    this.trials = [];
    this.sessionStartTime = performance.now();
  }
}
