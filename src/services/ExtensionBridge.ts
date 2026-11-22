/**
 * ExtensionBridge
 * Automatically bridges gaze tracking coordinates from the EyeControl Web Application
 * to the EyeControl Chrome Extension (Manifest V3) running on YouTube and India Today.
 */

export class ExtensionBridge {
  private static instance: ExtensionBridge | null = null;
  private extensionId: string | null = null;
  private isConnected: boolean = false;
  private lastStreamTime: number = 0;

  public static getInstance(): ExtensionBridge {
    if (!ExtensionBridge.instance) {
      ExtensionBridge.instance = new ExtensionBridge();
    }
    return ExtensionBridge.instance;
  }

  private constructor() {
    this.detectExtension();
  }

  public detectExtension(): void {
    const savedId = localStorage.getItem('eyecontrol_extension_id');
    if (savedId) {
      this.extensionId = savedId;
      this.pingExtension(savedId);
    }
  }

  public setExtensionId(id: string): void {
    this.extensionId = id;
    localStorage.setItem('eyecontrol_extension_id', id);
    this.pingExtension(id);
  }

  public getExtensionId(): string | null {
    return this.extensionId;
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  public pingExtension(id: string): void {
    const chromeApi = (window as any).chrome;
    if (chromeApi && chromeApi.runtime && chromeApi.runtime.sendMessage) {
      try {
        chromeApi.runtime.sendMessage(
          id,
          { type: 'EYECONTROL_PING' },
          (response: any) => {
            if (response && response.status === 'connected') {
              this.isConnected = true;
              console.log('[ExtensionBridge] Successfully connected to EyeControl Extension:', id);
            } else {
              this.isConnected = false;
            }
          }
        );
      } catch {
        this.isConnected = false;
      }
    }
  }

  /**
   * Stream gaze coordinates to Chrome Extension at ~30 FPS
   */
  public sendGazePoint(x: number, y: number, confidence: any): void {
    if (!this.extensionId) return;

    const now = performance.now();
    if (now - this.lastStreamTime < 32) return; // ~30 FPS throttle
    this.lastStreamTime = now;

    const chromeApi = (window as any).chrome;
    if (chromeApi && chromeApi.runtime && chromeApi.runtime.sendMessage) {
      try {
        chromeApi.runtime.sendMessage(
          this.extensionId,
          {
            type: 'EYECONTROL_GAZE_UPDATE',
            payload: { x, y, confidence },
          },
          () => {}
        );
      } catch {
        // Extension may have reloaded
      }
    }
  }
}
