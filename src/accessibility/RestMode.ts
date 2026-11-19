/**
 * RestMode
 * Eye fatigue protection: Tracks rest mode activation/duration and calculates
 * recommended break intervals based on sustained tracking time.
 */

export interface RestModeState {
  isResting: boolean;
  continuousTrackingMs: number;
  recommendBreak: boolean;
  restStartTime: number | null;
}

export class RestMode {
  private state: RestModeState = {
    isResting: false,
    continuousTrackingMs: 0,
    recommendBreak: false,
    restStartTime: null,
  };

  private trackingStartTime: number = performance.now();
  private recommendBreakAfterMs: number = 20 * 60 * 1000; // 20 minutes continuous tracking

  public activateRest(): void {
    this.state.isResting = true;
    this.state.restStartTime = performance.now();
    this.state.recommendBreak = false;
    this.trackingStartTime = 0;
  }

  public deactivateRest(): void {
    this.state.isResting = false;
    this.state.restStartTime = null;
    // Reset tracking timer on resume
    this.trackingStartTime = performance.now();
  }

  public update(): RestModeState {
    if (!this.state.isResting && this.trackingStartTime > 0) {
      this.state.continuousTrackingMs = performance.now() - this.trackingStartTime;
      this.state.recommendBreak = this.state.continuousTrackingMs > this.recommendBreakAfterMs;
    }
    return { ...this.state };
  }

  public getState(): RestModeState {
    return { ...this.state };
  }
}
