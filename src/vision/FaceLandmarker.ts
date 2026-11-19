/**
 * FaceLandmarkerService
 * Initializes and manages MediaPipe Face Landmarker locally using /wasm and /models/face_landmarker.task
 * Zero cloud dependency.
 */

import { FaceLandmarker, FilesetResolver, FaceLandmarkerResult } from '@mediapipe/tasks-vision';

export class FaceLandmarkerService {
  private static instance: FaceLandmarkerService | null = null;
  private landmarker: FaceLandmarker | null = null;
  private isInitializing: boolean = false;
  private isReady: boolean = false;
  private lastVideoTime: number = -1;

  public static getInstance(): FaceLandmarkerService {
    if (!FaceLandmarkerService.instance) {
      FaceLandmarkerService.instance = new FaceLandmarkerService();
    }
    return FaceLandmarkerService.instance;
  }

  public async initialize(): Promise<boolean> {
    if (this.isReady) return true;
    if (this.isInitializing) {
      while (this.isInitializing) {
        await new Promise(r => setTimeout(r, 50));
      }
      return this.isReady;
    }

    this.isInitializing = true;
    try {
      // 1. Resolve WASM assets locally from /wasm
      const vision = await FilesetResolver.forVisionTasks('/wasm');

      // 2. Try initializing with GPU delegate first, fallback to CPU
      try {
        this.landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: '/models/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
        });
      } catch (gpuError) {
        console.warn('FaceLandmarker GPU delegate failed, falling back to CPU:', gpuError);
        this.landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: '/models/face_landmarker.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
        });
      }

      this.isReady = true;
      this.isInitializing = false;
      return true;
    } catch (err) {
      console.error('Failed to initialize FaceLandmarker:', err);
      this.isInitializing = false;
      this.isReady = false;
      return false;
    }
  }

  /**
   * Run landmark detection on an active HTMLVideoElement frame
   */
  public detectVideoFrame(video: HTMLVideoElement, timestampMs: number): FaceLandmarkerResult | null {
    if (!this.landmarker || !this.isReady) return null;
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return null;

    // MediaPipe requires strictly increasing timestamps
    const frameTimestamp = Math.max(timestampMs, this.lastVideoTime + 1);
    this.lastVideoTime = frameTimestamp;

    try {
      return this.landmarker.detectForVideo(video, frameTimestamp);
    } catch (err) {
      console.warn('MediaPipe detectForVideo error:', err);
      return null;
    }
  }

  public getIsReady(): boolean {
    return this.isReady;
  }

  public close(): void {
    if (this.landmarker) {
      this.landmarker.close();
      this.landmarker = null;
    }
    this.isReady = false;
    this.isInitializing = false;
  }
}
