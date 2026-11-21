/**
 * CameraManager
 * Handles camera permissions, device enumeration, 640x480 native stream initialization,
 * FPS tracking, and safe start/stop lifecycles.
 */

import { CameraDiagnosticInfo } from '../types/tracking';

export interface CameraManagerCallbacks {
  onFrame?: (video: HTMLVideoElement, timestamp: number) => void;
  onError?: (error: Error) => void;
  onStatusChange?: (info: CameraDiagnosticInfo) => void;
}

export class CameraManager {
  private videoElement: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private videoCallbackId: number | null = null;
  private lastFrameTimestamp: number = 0;
  private frameCount: number = 0;
  private lastFpsUpdateTime: number = 0;
  private currentFps: number = 0;
  private isProcessingFrame: boolean = false;

  private diagnosticInfo: CameraDiagnosticInfo = {
    deviceId: '',
    label: '',
    width: 640,
    height: 480,
    actualFps: 0,
    faceDetected: false,
    eyeRegionsClear: false,
    trackingLost: false,
    lightingQuality: 'unknown',
    systemStatus: 'camera_unavailable',
  };

  private callbacks: CameraManagerCallbacks = {};

  constructor(callbacks?: CameraManagerCallbacks) {
    if (callbacks) this.callbacks = callbacks;
  }

  public setCallbacks(callbacks: CameraManagerCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Get available video input devices
   */
  public async getAvailableCameras(): Promise<MediaDeviceInfo[]> {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return [];
    }
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(d => d.kind === 'videoinput');
  }

  /**
   * Start camera stream with 640x480 native 480p constraint
   */
  public async startCamera(videoElement: HTMLVideoElement, preferredDeviceId?: string): Promise<boolean> {
    try {
      this.stopCamera();
      this.videoElement = videoElement;

      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 },
          frameRate: { ideal: 30, min: 15 },
          facingMode: 'user',
          deviceId: preferredDeviceId ? { exact: preferredDeviceId } : undefined,
        },
        audio: false,
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.videoElement.srcObject = this.stream;
      this.videoElement.playsInline = true;
      this.videoElement.muted = true;

      await new Promise<void>((resolve, reject) => {
        if (!this.videoElement) return reject(new Error('No video element'));
        this.videoElement.onloadedmetadata = () => {
          this.videoElement!.play()
            .then(() => resolve())
            .catch(reject);
        };
      });

      const videoTrack = this.stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();

      this.diagnosticInfo = {
        ...this.diagnosticInfo,
        deviceId: settings.deviceId || preferredDeviceId || 'default',
        label: videoTrack.label || 'Webcam',
        width: settings.width || this.videoElement.videoWidth || 640,
        height: settings.height || this.videoElement.videoHeight || 480,
        actualFps: 0,
        trackingLost: false,
      };

      this.isRunning = true;
      this.lastFpsUpdateTime = performance.now();
      this.startFrameLoop();
      this.notifyStatus();

      return true;
    } catch (err) {
      this.isRunning = false;
      const error = err instanceof Error ? err : new Error(String(err));
      this.callbacks.onError?.(error);
      return false;
    }
  }

  /**
   * Stop camera stream and release hardware
   */
  public stopCamera(): void {
    this.isRunning = false;
    this.isProcessingFrame = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.videoCallbackId !== null && this.videoElement && 'cancelVideoFrameCallback' in this.videoElement) {
      (this.videoElement as any).cancelVideoFrameCallback(this.videoCallbackId);
      this.videoCallbackId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
    this.diagnosticInfo.actualFps = 0;
    this.diagnosticInfo.systemStatus = 'camera_unavailable';
    this.notifyStatus();
  }

  private startFrameLoop(): void {
    const handleFrame = (now: number) => {
      if (!this.isRunning || !this.videoElement) return;

      this.frameCount++;
      const elapsed = now - this.lastFpsUpdateTime;
      if (elapsed >= 1000) {
        this.currentFps = Math.round((this.frameCount * 1000) / elapsed);
        this.frameCount = 0;
        this.lastFpsUpdateTime = now;
        this.diagnosticInfo.actualFps = this.currentFps;
        this.notifyStatus();
      }

      // Guard against overlapping frame processing
      if (!this.isProcessingFrame && this.videoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        this.isProcessingFrame = true;
        try {
          this.callbacks.onFrame?.(this.videoElement, now);
        } finally {
          this.isProcessingFrame = false;
        }
      }

      // Schedule next frame
      if (this.isRunning && this.videoElement) {
        if ('requestVideoFrameCallback' in this.videoElement) {
          this.videoCallbackId = (this.videoElement as any).requestVideoFrameCallback((_: any, metadata: any) => {
            handleFrame(metadata.expectedDisplayTime || performance.now());
          });
        } else {
          this.animationFrameId = requestAnimationFrame(handleFrame);
        }
      }
    };

    if (this.videoElement && 'requestVideoFrameCallback' in this.videoElement) {
      this.videoCallbackId = (this.videoElement as any).requestVideoFrameCallback((_: any, metadata: any) => {
        handleFrame(metadata.expectedDisplayTime || performance.now());
      });
    } else {
      this.animationFrameId = requestAnimationFrame(handleFrame);
    }
  }

  public updateVisionDiagnostics(
    faceDetected: boolean,
    eyeRegionsClear: boolean,
    lighting: 'good' | 'low' | 'harsh',
    faceBox?: { x: number; y: number; width: number; height: number },
    status?: any,
    reason?: string
  ): void {
    const trackingLost = !faceDetected || !eyeRegionsClear;
    let changed = false;

    if (
      this.diagnosticInfo.faceDetected !== faceDetected ||
      this.diagnosticInfo.eyeRegionsClear !== eyeRegionsClear ||
      this.diagnosticInfo.trackingLost !== trackingLost ||
      this.diagnosticInfo.lightingQuality !== lighting ||
      this.diagnosticInfo.systemStatus !== status ||
      this.diagnosticInfo.diagnosticReason !== reason
    ) {
      changed = true;
    }

    this.diagnosticInfo.faceDetected = faceDetected;
    this.diagnosticInfo.eyeRegionsClear = eyeRegionsClear;
    this.diagnosticInfo.trackingLost = trackingLost;
    this.diagnosticInfo.lightingQuality = lighting;
    if (faceBox) this.diagnosticInfo.faceBox = faceBox;
    if (status) this.diagnosticInfo.systemStatus = status;
    if (reason !== undefined) this.diagnosticInfo.diagnosticReason = reason;

    if (changed) {
      this.notifyStatus();
    }
  }

  public getDiagnosticInfo(): CameraDiagnosticInfo {
    return { ...this.diagnosticInfo };
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  public getVideoElement(): HTMLVideoElement | null {
    return this.videoElement;
  }

  private notifyStatus(): void {
    this.callbacks.onStatusChange?.(this.getDiagnosticInfo());
  }
}
