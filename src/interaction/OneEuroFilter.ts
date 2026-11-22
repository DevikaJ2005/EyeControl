/**
 * OneEuroFilter (1€ Filter)
 * Reference: Casiez, G., Roussel, N. and Vogel, F. (2012)
 * 1€ Filter: A simple speed-based low-pass filter for noisy input in interactive systems.
 *
 * Enhanced for Assistive Eye-Tracking:
 * - Velocity-adaptive cutoff (0.2 Hz at rest for rock-steady fixations)
 * - Snappy responsiveness during saccades
 * - Micro-deadband (3.5px) during steady fixation to eliminate natural landmark tremor
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

  constructor(
    private freq: number = 30,
    private minCutoff: number = 0.25,
    private beta: number = 0.008,
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
  private lastFiltered: { x: number; y: number } | null = null;
  private deadbandPx: number = 3.5;

  constructor(
    freq: number = 30,
    minCutoff: number = 0.25,
    beta: number = 0.008,
    dCutoff: number = 1.0,
    deadbandPx: number = 3.5
  ) {
    this.filterX = new OneEuroFilter(freq, minCutoff, beta, dCutoff);
    this.filterY = new OneEuroFilter(freq, minCutoff, beta, dCutoff);
    this.deadbandPx = deadbandPx;
  }

  filter(x: number, y: number, timestamp?: number): { x: number; y: number } {
    const ts = timestamp ?? Date.now();
    const rawFilteredX = this.filterX.filter(x, ts);
    const rawFilteredY = this.filterY.filter(y, ts);

    if (!this.lastFiltered) {
      this.lastFiltered = { x: rawFilteredX, y: rawFilteredY };
      return { ...this.lastFiltered };
    }

    // Micro-deadband: Suppress micro-jitter (< 3.5px) during fixations
    const dx = rawFilteredX - this.lastFiltered.x;
    const dy = rawFilteredY - this.lastFiltered.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < this.deadbandPx) {
      this.lastFiltered = {
        x: this.lastFiltered.x * 0.92 + rawFilteredX * 0.08,
        y: this.lastFiltered.y * 0.92 + rawFilteredY * 0.08,
      };
    } else {
      this.lastFiltered = { x: rawFilteredX, y: rawFilteredY };
    }

    return { ...this.lastFiltered };
  }

  reset(): void {
    this.filterX.reset();
    this.filterY.reset();
    this.lastFiltered = null;
  }

  updateParams(minCutoff: number, beta: number): void {
    this.filterX.updateParams(minCutoff, beta);
    this.filterY.updateParams(minCutoff, beta);
  }
}
