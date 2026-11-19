/**
 * OneEuroFilter (1€ Filter)
 * Reference: Casiez, G., Roussel, N. and Vogel, F. (2012)
 * 1€ Filter: A simple speed-based low-pass filter for noisy input in interactive systems.
 * CHI 2012.
 *
 * Provides smooth, low-latency filtering for gaze points and head pose.
 */

class LowPassFilter {
  private y: number | null = null;
  private s: number | null = null;

  constructor(private alpha: number = 0) {
    this.setAlpha(alpha);
  }

  setAlpha(alpha: number): void {
    if (alpha <= 0 || alpha > 1.0) {
      this.alpha = Math.max(0.0001, Math.min(1.0, alpha));
    } else {
      this.alpha = alpha;
    }
  }

  filter(value: number): number {
    if (this.y === null) {
      this.s = value;
    } else {
      this.s = this.alpha * value + (1.0 - this.alpha) * (this.s ?? value);
    }
    this.y = value;
    return this.s;
  }

  filterWithAlpha(value: number, alpha: number): number {
    this.setAlpha(alpha);
    return this.filter(value);
  }

  hasLastRawValue(): boolean {
    return this.y !== null;
  }

  lastRawValue(): number {
    return this.y ?? 0;
  }

  reset(): void {
    this.y = null;
    this.s = null;
  }
}

export class OneEuroFilter {
  private xFilter: LowPassFilter;
  private dxFilter: LowPassFilter;
  private lastTime: number | null = null;

  /**
   * @param freq Target sampling frequency in Hz (default 30 for 30fps webcam)
   * @param minCutoff Minimum cutoff frequency in Hz (lower = smoother when still, e.g. 1.0)
   * @param beta Speed coefficient (higher = less lag during saccades/fast movements, e.g. 0.007)
   * @param dCutoff Cutoff frequency for derivative calculation (default 1.0 Hz)
   */
  constructor(
    private freq: number = 30,
    private minCutoff: number = 1.0,
    private beta: number = 0.007,
    private dCutoff: number = 1.0
  ) {
    this.xFilter = new LowPassFilter(this.alpha(this.minCutoff));
    this.dxFilter = new LowPassFilter(this.alpha(this.dCutoff));
  }

  private alpha(cutoff: number): number {
    const te = 1.0 / Math.max(1, this.freq);
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / te);
  }

  filter(value: number, timestamp?: number): number {
    if (this.lastTime !== null && timestamp !== undefined) {
      const dt = (timestamp - this.lastTime) / 1000.0;
      if (dt > 0) {
        this.freq = 1.0 / dt;
      }
    }
    this.lastTime = timestamp ?? Date.now();

    // Estimate derivative
    const prevRaw = this.xFilter.hasLastRawValue() ? this.xFilter.lastRawValue() : value;
    const dx = (value - prevRaw) * this.freq;
    const edx = this.dxFilter.filterWithAlpha(dx, this.alpha(this.dCutoff));

    // Dynamic cutoff based on speed
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);

    return this.xFilter.filterWithAlpha(value, this.alpha(cutoff));
  }

  reset(): void {
    this.xFilter.reset();
    this.dxFilter.reset();
    this.lastTime = null;
  }

  updateParams(minCutoff: number, beta: number): void {
    this.minCutoff = minCutoff;
    this.beta = beta;
  }
}

export class OneEuroFilter2D {
  private filterX: OneEuroFilter;
  private filterY: OneEuroFilter;

  constructor(
    freq: number = 30,
    minCutoff: number = 0.8,
    beta: number = 0.005,
    dCutoff: number = 1.0
  ) {
    this.filterX = new OneEuroFilter(freq, minCutoff, beta, dCutoff);
    this.filterY = new OneEuroFilter(freq, minCutoff, beta, dCutoff);
  }

  filter(x: number, y: number, timestamp?: number): { x: number; y: number } {
    const ts = timestamp ?? Date.now();
    return {
      x: this.filterX.filter(x, ts),
      y: this.filterY.filter(y, ts),
    };
  }

  reset(): void {
    this.filterX.reset();
    this.filterY.reset();
  }

  updateParams(minCutoff: number, beta: number): void {
    this.filterX.updateParams(minCutoff, beta);
    this.filterY.updateParams(minCutoff, beta);
  }
}
