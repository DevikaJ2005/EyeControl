/**
 * EyeControl Type Definitions
 * Strict types for computer vision, eye tracking, head tracking,
 * calibration, interaction and accessibility.
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export type InputMode = 'eye' | 'head';

export interface CameraDiagnosticInfo {
  deviceId: string;
  label: string;
  width: number;
  height: number;
  actualFps: number;
  faceDetected: boolean;
  eyeRegionsClear: boolean;
  trackingLost: boolean;
  lightingQuality: 'good' | 'low' | 'harsh' | 'unknown';
}

export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
}

export interface EyeLandmarks {
  // Left eye
  leftIrisCenter: Point2D;
  leftInnerCorner: Point2D;
  leftOuterCorner: Point2D;
  leftUpperLid: Point2D;
  leftLowerLid: Point2D;
  leftEyeWidth: number;
  leftEyeHeight: number;
  leftOpenness: number; // height / width ratio
  leftNormalizedIris: Point2D; // Iris position relative to eye bounding box [0..1]

  // Right eye
  rightIrisCenter: Point2D;
  rightInnerCorner: Point2D;
  rightOuterCorner: Point2D;
  rightUpperLid: Point2D;
  rightLowerLid: Point2D;
  rightEyeWidth: number;
  rightEyeHeight: number;
  rightOpenness: number;
  rightNormalizedIris: Point2D;

  // Inter-pupillary distance normalized by face width
  normalizedIpd: number;
}

export interface HeadPose {
  yaw: number;   // Radians (left - / right +)
  pitch: number; // Radians (down - / up +)
  roll: number;  // Radians (tilt)
  translation: Point3D;
  rotationMatrix?: number[][];
}

export interface EyeFeatureVector {
  // Eye geometry features
  leftIrisX: number;
  leftIrisY: number;
  rightIrisX: number;
  rightIrisY: number;
  leftOpenness: number;
  rightOpenness: number;
  
  // Head pose compensation features
  headYaw: number;
  headPitch: number;
  headRoll: number;
  
  // Face center in camera frame
  faceCenterX: number;
  faceCenterY: number;
  faceScale: number; // Face width relative to frame width
  
  // Timestamp
  timestamp: number;
}

export interface GazeConfidenceResult {
  confidence: number; // 0.0 to 1.0
  isReliable: boolean;
  reason?: string;
  isBlinking: boolean;
  isFaceLost: boolean;
  isPoseExtreme: boolean;
  isOutOfBounds: boolean;
}

export interface GazePrediction {
  rawX: number; // Screen pixels
  rawY: number;
  filteredX: number; // OneEuroFiltered
  filteredY: number;
  normalizedX: number; // 0.0 to 1.0
  normalizedY: number;
  confidence: GazeConfidenceResult;
  timestamp: number;
}

export interface CalibrationTarget {
  id: string;
  x: number; // Screen pixels
  y: number;
  normalizedX: number; // 0..1
  normalizedY: number;
  label?: string;
  isValidationOnly?: boolean;
}

export interface CalibrationSample {
  target: CalibrationTarget;
  features: number[]; // Flattened & normalized feature vector
  rawFeatureVector: EyeFeatureVector;
  timestamp: number;
}

export interface ValidationMetric {
  targetId: string;
  targetPos: Point2D;
  averagePredictedPos: Point2D;
  pixelError: number;
  normalizedError: number;
  sampleCount: number;
}

export interface CalibrationResult {
  weightsX: number[];
  weightsY: number[];
  interceptX: number;
  interceptY: number;
  meanFeatures: number[];
  stdFeatures: number[];
  r2X: number;
  r2Y: number;
  meanValidationPixelError: number;
  maxValidationPixelError: number;
  overallAccuracyPercentage: number;
  targetMetrics: ValidationMetric[];
  calibratedAt: string;
  screenResolution: { width: number; height: number };
  calibrationMethod: '9-point' | '17-point';
  passed: boolean;
}

export interface HeadNeutralPose {
  neutralYaw: number;
  neutralPitch: number;
  neutralRoll: number;
  neutralFaceX: number;
  neutralFaceY: number;
}

export interface HeadTrackingConfig {
  sensitivityX: number; // Multiplier, e.g., 2.0
  sensitivityY: number;
  deadZoneYaw: number;   // Radians dead zone threshold
  deadZonePitch: number;
  smoothingMinCutoff: number;
  smoothingBeta: number;
}

export interface DwellConfig {
  dwellTimeMs: number; // Default 1500ms (1.5s), range 1000 - 3000ms
  rearmDelayMs: number; // Delay before rearming same target
  activationRadiusPx: number; // Stability radius around target
}

export interface DwellTarget {
  id: string;
  element: HTMLElement | null;
  rect: DOMRect;
  onSelect: () => void;
  label: string;
  disabled?: boolean;
  isArticleReadingArea?: boolean; // When true, locked out from dwell selection
}

export type DwellState = 'idle' | 'hovering' | 'dwelling' | 'selected' | 'rearming';

export interface UserAccessibilitySettings {
  inputMode: InputMode;
  dwellDurationMs: number;
  headSensitivity: number;
  textSize: 'normal' | 'large' | 'extra-large';
  speechVoiceURI: string;
  speechRate: number;
  speechPitch: number;
  speechVolume: number;
  emergencyContactName: string;
  emergencyContactPhone: string;
  reducedMotion: boolean;
  soundFeedback: boolean;
}
