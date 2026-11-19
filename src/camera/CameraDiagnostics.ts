/**
 * CameraDiagnostics
 * Analyzes video stream frames for lighting quality (low light vs harsh backlighting),
 * frame consistency, and camera stream diagnostics.
 */

export class CameraDiagnostics {
  private static canvas: HTMLCanvasElement | null = null;
  private static ctx: CanvasRenderingContext2D | null = null;
  private static lastCheckTime: number = 0;
  private static lastResult: 'good' | 'low' | 'harsh' = 'good';
  private static readonly THROTTLE_MS = 1500; // Only sample lighting every 1.5 seconds to avoid GPU-CPU readback stalls

  public static analyzeLighting(video: HTMLVideoElement, force: boolean = false): 'good' | 'low' | 'harsh' {
    try {
      if (video.videoWidth === 0 || video.videoHeight === 0) return 'good';

      const now = performance.now();
      if (!force && now - this.lastCheckTime < this.THROTTLE_MS) {
        return this.lastResult;
      }
      this.lastCheckTime = now;

      if (!this.canvas) {
        this.canvas = document.createElement('canvas');
        this.canvas.width = 32; // Ultra-compact for instant check
        this.canvas.height = 24;
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
      }

      if (!this.ctx) return 'good';

      this.ctx.drawImage(video, 0, 0, 32, 24);
      const imgData = this.ctx.getImageData(0, 0, 32, 24).data;
      let totalLuminance = 0;
      const count = imgData.length / 4;

      for (let i = 0; i < imgData.length; i += 4) {
        const r = imgData[i];
        const g = imgData[i + 1];
        const b = imgData[i + 2];
        totalLuminance += 0.2126 * r + 0.7152 * g + 0.0722 * b;
      }

      const avgLuminance = totalLuminance / count;

      if (avgLuminance < 40) {
        this.lastResult = 'low';
      } else if (avgLuminance > 225) {
        this.lastResult = 'harsh';
      } else {
        this.lastResult = 'good';
      }
      return this.lastResult;
    } catch {
      return 'good';
    }
  }
}
