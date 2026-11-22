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
  private broadcastChannel: BroadcastChannel | null = null;

  public static getInstance(): ExtensionBridge {
    if (!ExtensionBridge.instance) {
      ExtensionBridge.instance = new ExtensionBridge();
    }
    return ExtensionBridge.instance;
  }

  private constructor() {
    this.detectExtension();
    this.initAutoBridge();
  }

  private initAutoBridge(): void {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel('eyecontrol_gaze_channel');
      }
    } catch {
      // BroadcastChannel unsupported or restricted
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'EYECONTROL_EXTENSION_INSTALLED') {
          this.isConnected = true;
          console.log('[ExtensionBridge] Auto-bridge extension detected and connected!');
        }
      });
    }
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
   * Broadcasts via postMessage and BroadcastChannel for automatic zero-config bridging,
   * as well as direct chrome.runtime.sendMessage if extensionId is configured.
   */
  public sendGazePoint(x: number, y: number, confidence: any): void {
    const now = performance.now();
    if (now - this.lastStreamTime < 30) return; // ~33 FPS throttle
    this.lastStreamTime = now;

    const payload = {
      x,
      y,
      confidence: typeof confidence === 'number' ? confidence : 1.0,
      timestamp: Date.now(),
    };

    // 1. PostMessage auto-bridge (bridge_injector.js receives this on localhost)
    if (typeof window !== 'undefined') {
      window.postMessage({ type: 'EYECONTROL_GAZE_STREAM', payload }, '*');
    }

    // 2. BroadcastChannel
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type: 'EYECONTROL_GAZE_STREAM', payload });
      } catch {}
    }

    // 3. Direct chrome.runtime.sendMessage if extension ID is configured
    if (this.extensionId) {
      const chromeApi = (window as any).chrome;
      if (chromeApi && chromeApi.runtime && chromeApi.runtime.sendMessage) {
        try {
          chromeApi.runtime.sendMessage(
            this.extensionId,
            {
              type: 'EYECONTROL_GAZE_UPDATE',
              payload,
            },
            () => {}
          );
        } catch {
          // Extension may have reloaded
        }
      }
    }
  }
}
