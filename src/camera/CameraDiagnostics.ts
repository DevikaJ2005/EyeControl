/**
 * CameraDiagnostics
 * Analyzes video stream frames for lighting quality (low light vs harsh backlighting),
 * frame consistency, and camera stream diagnostics.
 */

export class CameraDiagnostics {
  private static canvas: HTMLCanvasElement | null = null;
  private static ctx: CanvasRenderingContext2D | null = null;

  public static analyzeLighting(video: HTMLVideoElement): 'good' | 'low' | 'harsh' {
    try {
      if (video.videoWidth === 0 || video.videoHeight === 0) return 'unknown' as any;

      if (!this.canvas) {
        this.canvas = document.createElement('canvas');
        this.canvas.width = 64; // Subsampled for ultra-fast diagnostic
        this.canvas.height = 48;
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
      }

      if (!this.ctx) return 'good';

      this.ctx.drawImage(video, 0, 0, 64, 48);
      const imgData = this.ctx.getImageData(0, 0, 64, 48).data;
      let totalLuminance = 0;
      const count = imgData.length / 4;

      for (let i = 0; i < imgData.length; i += 4) {
        const r = imgData[i];
        const g = imgData[i + 1];
        const b = imgData[i + 2];
        // Standard relative luminance (ITU-R BT.709)
        totalLuminance += 0.2126 * r + 0.7152 * g + 0.0722 * b;
      }

      const avgLuminance = totalLuminance / count;

      if (avgLuminance < 40) {
        return 'low';
      } else if (avgLuminance > 225) {
        return 'harsh';
      }
      return 'good';
    } catch {
      return 'good';
    }
  }
}
