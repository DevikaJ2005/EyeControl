/**
 * AdaptiveEyeRegionTracker
 * Dual-View Adaptive Eye Tracking System that maintains full-frame tracking
 * while extracting and stabilizing enlarged regions of interest (ROI) for both eyes.
 * 
 * Features:
 * - Dynamic ROI extraction with smoothing on position & dimensions to prevent oscillation.
 * - Adaptive zoom/margin: Maintains normal crop when stable, repositions smoothly on slight movement,
 *   and enlarges ROI context when the user sits farther away.
 * - Non-destructive coordinate mapping: All features preserve original camera geometry.
 * - Live diagnostic rendering for enlarged Left & Right eye previews with landmark overlays.
 * - Real-time stability evaluation and human-friendly repositioning instructions.
 * - Performance profiling: Measures FPS, detection latency, ROI extraction latency, and tracking loss.
 */

import {
  NormalizedLandmark,
  Point2D,
  FaceBoundingBox,
  EyeRegionROI,
  AdaptiveEyeTrackingState,
  TrackingConfigMode,
  TrackingPerformanceTelemetry,
  BenchmarkComparisonSession,
  HeadPose,
} from '../types/tracking';
import { EyeFeatureExtractor } from './EyeFeatureExtractor';

export class AdaptiveEyeRegionTracker {
  private configMode: TrackingConfigMode = 'adaptive_dual_view';

  // Smoothed ROIs
  private smoothedLeftBox: FaceBoundingBox | null = null;
  private smoothedRightBox: FaceBoundingBox | null = null;
  private alpha: number = 0.35; // Smoothing factor (0.35 = responsive yet jitter-free)

  // Tracking state
  private lastLeftROI: EyeRegionROI | null = null;
  private lastRightROI: EyeRegionROI | null = null;
  private isDualEyeReliable: boolean = false;
  private isStabilized: boolean = false;
  private faceScale: number = 0.35;
  private adaptiveZoomFactor: number = 1.0;
  private repositionInstruction: string | null = null;

  // Telemetry & Benchmarking
  private frameTimestamps: number[] = [];
  private actualFps: number = 0;
  private faceDetectionMs: number = 0;
  private roiExtractionMs: number = 0;
  private featureExtractionMs: number = 0;
  private totalInferenceMs: number = 0;
  private trackingLossCount: number = 0;
  private consecutiveLossFrames: number = 0;
  private benchmarkSessions: BenchmarkComparisonSession[] = [];

  constructor(configMode: TrackingConfigMode = 'adaptive_dual_view') {
    this.configMode = configMode;
  }

  public setConfigMode(mode: TrackingConfigMode): void {
    this.configMode = mode;
  }

  public getConfigMode(): TrackingConfigMode {
    return this.configMode;
  }

  /**
   * Reset tracking state and smoothed bounding boxes
   */
  public reset(): void {
    this.smoothedLeftBox = null;
    this.smoothedRightBox = null;
    this.lastLeftROI = null;
    this.lastRightROI = null;
    this.isDualEyeReliable = false;
    this.isStabilized = false;
    this.consecutiveLossFrames = 0;
    this.frameTimestamps = [];
  }

  /**
   * Process a frame's landmarks and update adaptive eye tracking state
   */
  public processFrame(
    landmarks: NormalizedLandmark[] | null,
    headPose: HeadPose | null,
    videoWidth: number,
    videoHeight: number,
    perf?: { faceDetectionMs?: number; featureExtractionMs?: number }
  ): AdaptiveEyeTrackingState {
    const startRoiTime = performance.now();
    const now = performance.now();

    // Update rolling FPS
    this.updateFps(now);

    if (perf?.faceDetectionMs !== undefined) {
      this.faceDetectionMs = perf.faceDetectionMs;
    }
    if (perf?.featureExtractionMs !== undefined) {
      this.featureExtractionMs = perf.featureExtractionMs;
    }

    if (!landmarks || landmarks.length < 478) {
      this.consecutiveLossFrames++;
      if (this.consecutiveLossFrames === 3) {
        this.trackingLossCount++;
      }
      this.isDualEyeReliable = false;
      this.isStabilized = false;
      this.repositionInstruction = 'No face detected. Please position yourself in front of the camera.';

      const roiElapsed = performance.now() - startRoiTime;
      this.roiExtractionMs = roiElapsed;
      this.totalInferenceMs = this.faceDetectionMs + this.roiExtractionMs + this.featureExtractionMs;

      return this.getState();
    }

    this.consecutiveLossFrames = 0;

    // 1. Calculate face geometry and distance factor
    const faceLeft = landmarks[EyeFeatureExtractor.FACE_LEFT];
    const faceRight = landmarks[EyeFeatureExtractor.FACE_RIGHT];
    const faceTop = landmarks[EyeFeatureExtractor.FACE_TOP];
    const faceBottom = landmarks[EyeFeatureExtractor.FACE_BOTTOM];

    const currentFaceWidth = Math.hypot(faceRight.x - faceLeft.x, faceRight.y - faceLeft.y);
    this.faceScale = currentFaceWidth;

    // 2. Adaptive Zoom & Margin logic:
    // When face is centered & stable (~0.35 faceScale), standard 35% margin is maintained.
    // When user moves farther away (faceScale drops below 0.30), expand context margin up to 1.6x.
    let marginMultiplier = 1.0;
    if (this.configMode === 'adaptive_dual_view') {
      const distanceDeficit = Math.max(0, 0.35 - currentFaceWidth);
      marginMultiplier = 1.0 + Math.min(0.65, distanceDeficit * 2.5);
      this.adaptiveZoomFactor = marginMultiplier;
    } else {
      this.adaptiveZoomFactor = 1.0;
    }

    // 3. Extract Left Eye ROI (subject's right, camera left)
    const leftOuter = landmarks[EyeFeatureExtractor.LEFT_OUTER_CORNER];
    const leftInner = landmarks[EyeFeatureExtractor.LEFT_INNER_CORNER];
    const leftUpper = landmarks[EyeFeatureExtractor.LEFT_UPPER_LID];
    const leftLower = landmarks[EyeFeatureExtractor.LEFT_LOWER_LID];
    const leftIris = landmarks[EyeFeatureExtractor.LEFT_IRIS_CENTER];

    const leftRawWidth = Math.abs(leftInner.x - leftOuter.x);
    const leftRawHeight = Math.abs(leftLower.y - leftUpper.y);
    const leftMarginX = (leftRawWidth * 0.35) * marginMultiplier;
    const leftMarginY = (leftRawHeight * 0.45) * marginMultiplier;

    const leftTargetBox: FaceBoundingBox = {
      x: Math.max(0, Math.min(leftOuter.x, leftInner.x) - leftMarginX),
      y: Math.max(0, Math.min(leftUpper.y, leftLower.y) - leftMarginY),
      width: Math.min(1, leftRawWidth + leftMarginX * 2),
      height: Math.min(1, leftRawHeight + leftMarginY * 2),
    };

    // 4. Extract Right Eye ROI (subject's left, camera right)
    const rightOuter = landmarks[EyeFeatureExtractor.RIGHT_OUTER_CORNER];
    const rightInner = landmarks[EyeFeatureExtractor.RIGHT_INNER_CORNER];
    const rightUpper = landmarks[EyeFeatureExtractor.RIGHT_UPPER_LID];
    const rightLower = landmarks[EyeFeatureExtractor.RIGHT_LOWER_LID];
    const rightIris = landmarks[EyeFeatureExtractor.RIGHT_IRIS_CENTER];

    const rightRawWidth = Math.abs(rightOuter.x - rightInner.x);
    const rightRawHeight = Math.abs(rightLower.y - rightUpper.y);
    const rightMarginX = (rightRawWidth * 0.35) * marginMultiplier;
    const rightMarginY = (rightRawHeight * 0.45) * marginMultiplier;

    const rightTargetBox: FaceBoundingBox = {
      x: Math.max(0, Math.min(rightOuter.x, rightInner.x) - rightMarginX),
      y: Math.max(0, Math.min(rightUpper.y, rightLower.y) - rightMarginY),
      width: Math.min(1, rightRawWidth + rightMarginX * 2),
      height: Math.min(1, rightRawHeight + rightMarginY * 2),
    };

    // 5. Apply ROI Temporal Smoothing (eliminates boundary jitter & oscillation)
    if (this.configMode === 'adaptive_dual_view') {
      this.smoothedLeftBox = this.smoothBox(this.smoothedLeftBox, leftTargetBox);
      this.smoothedRightBox = this.smoothBox(this.smoothedRightBox, rightTargetBox);
    } else {
      this.smoothedLeftBox = leftTargetBox;
      this.smoothedRightBox = rightTargetBox;
    }

    // 6. Eye openness & dimensions
    const leftOpenness = leftRawWidth > 1e-4 ? leftRawHeight / leftRawWidth : 0.28;
    const rightOpenness = rightRawWidth > 1e-4 ? rightRawHeight / rightRawWidth : 0.28;

    const leftEyeValid = leftOpenness >= 0.15 && leftIris.x >= 0 && leftIris.x <= 1;
    const rightEyeValid = rightOpenness >= 0.15 && rightIris.x >= 0 && rightIris.x <= 1;

    this.lastLeftROI = {
      box: this.smoothedLeftBox,
      isDetected: true,
      isReliable: leftEyeValid,
      openness: leftOpenness,
      irisCenter: { x: leftIris.x, y: leftIris.y },
      innerCorner: { x: leftInner.x, y: leftInner.y },
      outerCorner: { x: leftOuter.x, y: leftOuter.y },
      upperLid: { x: leftUpper.x, y: leftUpper.y },
      lowerLid: { x: leftLower.x, y: leftLower.y },
    };

    this.lastRightROI = {
      box: this.smoothedRightBox,
      isDetected: true,
      isReliable: rightEyeValid,
      openness: rightOpenness,
      irisCenter: { x: rightIris.x, y: rightIris.y },
      innerCorner: { x: rightInner.x, y: rightInner.y },
      outerCorner: { x: rightOuter.x, y: rightOuter.y },
      upperLid: { x: rightUpper.x, y: rightUpper.y },
      lowerLid: { x: rightLower.x, y: rightLower.y },
    };

    this.isDualEyeReliable = leftEyeValid && rightEyeValid;

    // 7. Stability & Repositioning Advice
    this.evaluateStability(headPose, leftOpenness, rightOpenness);

    const roiElapsed = performance.now() - startRoiTime;
    this.roiExtractionMs = Math.round(roiElapsed * 10) / 10;
    this.totalInferenceMs = Math.round((this.faceDetectionMs + this.roiExtractionMs + this.featureExtractionMs) * 10) / 10;

    return this.getState();
  }

  /**
   * Smooth bounding box transitions using exponential moving average
   */
  private smoothBox(prev: FaceBoundingBox | null, target: FaceBoundingBox): FaceBoundingBox {
    if (!prev) return { ...target };
    return {
      x: prev.x + this.alpha * (target.x - prev.x),
      y: prev.y + this.alpha * (target.y - prev.y),
      width: prev.width + this.alpha * (target.width - prev.width),
      height: prev.height + this.alpha * (target.height - prev.height),
    };
  }

  /**
   * Evaluate tracking stability and construct user-friendly repositioning instructions
   */
  private evaluateStability(
    headPose: HeadPose | null,
    leftOpenness: number,
    rightOpenness: number
  ): void {
    if (this.faceScale < 0.18) {
      this.repositionInstruction = 'Face is too far. Please move slightly closer.';
      this.isStabilized = false;
      return;
    }
    if (this.faceScale > 0.65) {
      this.repositionInstruction = 'Face is too close. Please move back slightly.';
      this.isStabilized = false;
      return;
    }

    if (headPose) {
      if (Math.abs(headPose.yaw) > 0.42 || Math.abs(headPose.pitch) > 0.38) {
        this.repositionInstruction = 'Face is tilted. Please look straight ahead at the screen.';
        this.isStabilized = false;
        return;
      }
    }

    if (leftOpenness < 0.15 && rightOpenness < 0.15) {
      this.repositionInstruction = 'Eyes closed or blinking.';
      this.isStabilized = false;
      return;
    }

    if (leftOpenness < 0.14 || rightOpenness < 0.14) {
      this.repositionInstruction = 'One eye obscured. Ensure both eyes are clearly visible.';
      this.isStabilized = false;
      return;
    }

    this.repositionInstruction = 'Optimal eye tracking.';
    this.isStabilized = true;
  }

  /**
   * Rolling FPS calculator
   */
  private updateFps(now: number): void {
    this.frameTimestamps.push(now);
    // Keep window of last 1 second
    while (this.frameTimestamps.length > 0 && now - this.frameTimestamps[0] > 1000) {
      this.frameTimestamps.shift();
    }
    this.actualFps = this.frameTimestamps.length;
  }

  /**
   * Get current state snapshot
   */
  public getState(): AdaptiveEyeTrackingState {
    return {
      configMode: this.configMode,
      leftEyeROI: this.lastLeftROI,
      rightEyeROI: this.lastRightROI,
      isDualEyeReliable: this.isDualEyeReliable,
      isStabilized: this.isStabilized,
      faceScale: this.faceScale,
      adaptiveZoomFactor: this.adaptiveZoomFactor,
      repositionInstruction: this.repositionInstruction,
      telemetry: {
        actualFps: this.actualFps,
        faceDetectionMs: this.faceDetectionMs,
        roiExtractionMs: this.roiExtractionMs,
        featureExtractionMs: this.featureExtractionMs,
        totalInferenceMs: this.totalInferenceMs,
        trackingLossCount: this.trackingLossCount,
        trackingAvailability: this.isDualEyeReliable ? 100 : 0,
      },
    };
  }

  /**
   * Check if eye tracking is sufficiently stable for calibration sample collection
   */
  public isStableForCalibration(): boolean {
    return this.isDualEyeReliable && this.isStabilized;
  }

  /**
   * Map a normalized camera-frame point [0..1] into enlarged cropped canvas pixel space
   */
  public static mapToCrop(
    point: Point2D,
    roiBox: FaceBoundingBox,
    canvasWidth: number,
    canvasHeight: number
  ): Point2D {
    const rx = roiBox.width > 1e-4 ? (point.x - roiBox.x) / roiBox.width : 0.5;
    const ry = roiBox.height > 1e-4 ? (point.y - roiBox.y) / roiBox.height : 0.5;

    return {
      x: Math.max(0, Math.min(canvasWidth, rx * canvasWidth)),
      y: Math.max(0, Math.min(canvasHeight, ry * canvasHeight)),
    };
  }

  /**
   * Render enlarged diagnostic eye preview with high-quality interpolation onto a target canvas
   */
  public static renderEyeCropToCanvas(
    canvas: HTMLCanvasElement,
    video: HTMLVideoElement,
    roi: EyeRegionROI | null,
    isLeft: boolean,
    isMirrored: boolean = false
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx || !video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    if (!roi || !roi.isDetected) {
      ctx.fillStyle = '#1E2A25';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#A75B51';
      ctx.font = '12px Atkinson Hyperlegible, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${isLeft ? 'Left' : 'Right'} eye not detected`, w / 2, h / 2);
      ctx.restore();
      return;
    }

    // 1. High-quality bicubic/bilinear interpolation for digital enlargement
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Video crop coordinates in native video pixel space
    const sx = Math.max(0, roi.box.x * video.videoWidth);
    const sy = Math.max(0, roi.box.y * video.videoHeight);
    const sw = Math.min(video.videoWidth - sx, roi.box.width * video.videoWidth);
    const sh = Math.min(video.videoHeight - sy, roi.box.height * video.videoHeight);

    if (sw > 0 && sh > 0) {
      if (isMirrored) {
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h);

      // 2. Landmark overlays in crop coordinate space
      const irisPt = this.mapToCrop(roi.irisCenter, roi.box, w, h);
      const innerPt = this.mapToCrop(roi.innerCorner, roi.box, w, h);
      const outerPt = this.mapToCrop(roi.outerCorner, roi.box, w, h);
      const upperPt = this.mapToCrop(roi.upperLid, roi.box, w, h);
      const lowerPt = this.mapToCrop(roi.lowerLid, roi.box, w, h);

      // Eyelid curvature line
      ctx.strokeStyle = '#DCE7DE';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(outerPt.x, outerPt.y);
      ctx.quadraticCurveTo(upperPt.x, upperPt.y, innerPt.x, innerPt.y);
      ctx.quadraticCurveTo(lowerPt.x, lowerPt.y, outerPt.x, outerPt.y);
      ctx.stroke();

      // Corner markers
      ctx.fillStyle = '#F4A261';
      ctx.beginPath();
      ctx.arc(outerPt.x, outerPt.y, 2.5, 0, Math.PI * 2);
      ctx.arc(innerPt.x, innerPt.y, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Iris target marker (solid center + ring)
      ctx.fillStyle = '#2A9D8F';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(irisPt.x, irisPt.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Save benchmark session for configuration comparison
   */
  public recordBenchmarkSession(session: BenchmarkComparisonSession): void {
    this.benchmarkSessions.push(session);
    if (this.benchmarkSessions.length > 20) {
      this.benchmarkSessions.shift();
    }
  }

  public getBenchmarkSessions(): BenchmarkComparisonSession[] {
    return [...this.benchmarkSessions];
  }
}