/**
 * EyeControl Main Application
 * Coordinates Camera, MediaPipe Vision, Eye/Head Tracking, Selection Engine,
 * and the 6 Main Screens.
 */

import React, { useEffect, useRef, useState } from 'react';
import { CameraManager } from './camera/CameraManager';
import { CameraDiagnostics } from './camera/CameraDiagnostics';
import { FaceLandmarkerService } from './vision/FaceLandmarker';
import { GazeModel } from './eyeTracking/GazeModel';
import { EyeTracker } from './eyeTracking/EyeTracker';
import { HeadTracker } from './headTracking/HeadTracker';
import { CalibrationManager } from './calibration/CalibrationManager';
import { SelectionManager } from './interaction/SelectionManager';
import { TrackingStateManager } from './interaction/TrackingStateManager';
import { AccessibilityManager, DEFAULT_SETTINGS } from './accessibility/AccessibilitySettings';
import { CalibrationStorage } from './storage/CalibrationStorage';
import { HeadPoseEstimator } from './vision/HeadPoseEstimator';
import { EyeFeatureExtractor, EyeDiagnosticData } from './vision/EyeFeatureExtractor';
import {
  CameraDiagnosticInfo,
  GazePrediction,
  InputMode,
  UserAccessibilitySettings,
  CalibrationResult,
  AdaptiveEyeTrackingState,
  TrackingConfigMode,
} from './types/tracking';

// UI Components & Pages
import { CameraStatus } from './components/CameraStatus';
import { EyeCursor } from './components/EyeCursor';
import { SettingsDrawer } from './components/SettingsDrawer';
import { DiagnosticPanel } from './components/DiagnosticPanel';
import { RestModeOverlay } from './components/RestModeOverlay';
import { TrackingRecoveryBanner } from './components/TrackingRecoveryBanner';
import { TrackingAcousticFeedback } from './services/TrackingAcousticFeedback';
import { ExtensionBridge } from './services/ExtensionBridge';
import { SosModal } from './components/SosModal';

import { SetupPage } from './pages/SetupPage';
import { CalibrationPage } from './pages/CalibrationPage';
import { HomePage } from './pages/HomePage';
import { SpeakPage } from './pages/SpeakPage';
import { NewsPage } from './pages/NewsPage';
import { YouTubePage } from './pages/YouTubePage';
import { ExplorePage } from './pages/ExplorePage';
import { HelpPage } from './pages/HelpPage';

export type ActivePage = 'setup' | 'calibration' | 'home' | 'speak' | 'youtube' | 'news' | 'explore' | 'help';

export const App: React.FC = () => {
  // Navigation & Settings State
  const [currentPage, setCurrentPage] = useState<ActivePage>('setup');
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [settings, setSettings] = useState<UserAccessibilitySettings>(DEFAULT_SETTINGS);
  const settingsRef = useRef<UserAccessibilitySettings>(DEFAULT_SETTINGS);
  settingsRef.current = settings;

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isResting, setIsResting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Vision & Tracking Diagnostics State
  const [diagnosticInfo, setDiagnosticInfo] = useState<CameraDiagnosticInfo>({
    deviceId: '',
    label: '',
    width: 640,
    height: 480,
    actualFps: 0,
    faceDetected: false,
    eyeRegionsClear: false,
    trackingLost: false,
    lightingQuality: 'unknown',
  });

  const [currentPrediction, setCurrentPrediction] = useState<GazePrediction | null>(null);
  const [calibrationResult, setCalibrationResult] = useState<CalibrationResult | null>(null);
  const [overlayData, setOverlayData] = useState<EyeDiagnosticData | null>(null);

  const [adaptiveState, setAdaptiveState] = useState<AdaptiveEyeTrackingState>({
    configMode: 'adaptive_dual_view',
    leftEyeROI: null,
    rightEyeROI: null,
    isDualEyeReliable: false,
    isStabilized: false,
    faceScale: 0.35,
    adaptiveZoomFactor: 1.0,
    repositionInstruction: null,
    telemetry: {
      actualFps: 0,
      faceDetectionMs: 0,
      roiExtractionMs: 0,
      featureExtractionMs: 0,
      totalInferenceMs: 0,
      trackingLossCount: 0,
      trackingAvailability: 0,
    },
  });

  // Engine Singletons & Managers
  const cameraManagerRef = useRef<CameraManager | null>(null);
  const gazeModelRef = useRef<GazeModel | null>(null);
  const eyeTrackerRef = useRef<EyeTracker | null>(null);
  const headTrackerRef = useRef<HeadTracker | null>(null);
  const calibrationManagerRef = useRef<CalibrationManager | null>(null);
  const hiddenVideoRef = useRef<HTMLVideoElement>(null);

  // Initialize engine once on mount
  useEffect(() => {
    // 1. Gaze Model & Trackers
    const gazeModel = new GazeModel(0.01, 1);
    gazeModelRef.current = gazeModel;

    const eyeTracker = new EyeTracker(gazeModel);
    eyeTrackerRef.current = eyeTracker;

    const headTracker = new HeadTracker();
    headTrackerRef.current = headTracker;

    const calibrationManager = new CalibrationManager(gazeModel);
    calibrationManagerRef.current = calibrationManager;

    const selectionManager = SelectionManager.getInstance();

    // 2. Camera Manager with frame dispatch
    const cameraManager = new CameraManager({
      onFrame: (video, timestamp) => {
        // Fast lighting diagnostic (throttled inside analyzeLighting)
        const lighting = CameraDiagnostics.analyzeLighting(video);

        const activeMode = settingsRef.current.inputMode;

        if (activeMode === 'eye') {
          // If currently in calibration page and actively recording baseline, target or validation
          const calibState = calibrationManager.getState();
          if (
            calibState.step === 'baseline' ||
            calibState.step === 'calibrating' ||
            calibState.step === 'validating'
          ) {
            const t0 = performance.now();
            const result = FaceLandmarkerService.getInstance().detectVideoFrame(video, timestamp);
            const faceDetectionMs = Math.round((performance.now() - t0) * 10) / 10;

            if (result && result.faceLandmarks && result.faceLandmarks[0]) {
              const landmarks = result.faceLandmarks[0];
              const diag = EyeFeatureExtractor.getDiagnosticOverlayData(landmarks);
              setOverlayData(diag);

              const matrix = result.facialTransformationMatrixes?.[0]?.data;
              const pose = HeadPoseEstimator.estimate(landmarks, matrix);

              const tFv0 = performance.now();
              const fv = EyeFeatureExtractor.buildFeatureVector(landmarks, pose, timestamp);
              const featureExtractionMs = Math.round((performance.now() - tFv0) * 10) / 10;

              // Process Adaptive Dual-View Eye Region
              const adaptiveTracker = eyeTracker.getAdaptiveTracker();
              const adState = adaptiveTracker.processFrame(
                landmarks,
                pose,
                video.videoWidth || 640,
                video.videoHeight || 480,
                { faceDetectionMs, featureExtractionMs }
              );
              setAdaptiveState(adState);
              const isStable = adaptiveTracker.isStableForCalibration();

              cameraManager.updateVisionDiagnostics(
                true,
                true,
                lighting,
                diag?.faceBox,
                calibState.step === 'validating' ? 'validating' : 'calibrating'
              );

              if (fv) {
                calibrationManager.processFeatureVector(fv, window.innerWidth, window.innerHeight, isStable);
              }
            } else {
              setOverlayData(null);
              eyeTracker.getAdaptiveTracker().processFrame(null, null, video.videoWidth || 640, video.videoHeight || 480);
              setAdaptiveState(eyeTracker.getAdaptiveTracker().getState());
              cameraManager.updateVisionDiagnostics(false, false, lighting, undefined, 'face_not_detected');
            }
          } else {
            // Normal eye gaze tracking
            const pred = eyeTracker.processFrame(video, timestamp);
            if (pred) {
              setCurrentPrediction(pred);
              const adState = eyeTracker.getAdaptiveTracker().getState();
              setAdaptiveState(adState);

              const faceOk = !pred.confidence.isFaceLost;
              TrackingAcousticFeedback.getInstance().update(faceOk, settings.soundFeedback ?? true, timestamp);

              cameraManager.updateVisionDiagnostics(
                faceOk,
                !pred.confidence.isBlinking,
                lighting,
                undefined,
                pred.confidence.systemStatus,
                pred.confidence.reason
              );

              // Update selection engine only when gaze is reliable; otherwise pause/cancel
              if (pred.confidence.isReliable) {
                selectionManager.update(
                  { x: pred.filteredX, y: pred.filteredY },
                  pred.confidence
                );
              } else {
                selectionManager.cancel();
              }

              // Always stream gaze coordinates to Chrome Extension when face is detected and not blinking
              if (!pred.confidence.isFaceLost && !pred.confidence.isBlinking) {
                ExtensionBridge.getInstance().sendGazePoint(
                  pred.filteredX,
                  pred.filteredY,
                  pred.confidence.confidence
                );
              }
            }
          }
        } else {
          // Head tracking mode
          const result = FaceLandmarkerService.getInstance().detectVideoFrame(video, timestamp);
          if (result && result.faceLandmarks && result.faceLandmarks[0]) {
            const diag = EyeFeatureExtractor.getDiagnosticOverlayData(result.faceLandmarks[0]);
            setOverlayData(diag);
          }

          const pred = headTracker.processFrame(video, timestamp);
          if (pred) {
            setCurrentPrediction(pred);
            const isCalibrated = !!headTracker.getNeutralPose();
            const faceOk = !pred.confidence.isFaceLost;
            TrackingAcousticFeedback.getInstance().update(faceOk, settings.soundFeedback ?? true, timestamp);

            cameraManager.updateVisionDiagnostics(
              faceOk,
              true,
              lighting,
              undefined,
              isCalibrated ? 'validated_tracking' : 'calibration_required',
              pred.confidence.reason
            );
            // Update selection engine with head pointer point
            selectionManager.update(
              { x: pred.filteredX, y: pred.filteredY },
              pred.confidence
            );
            ExtensionBridge.getInstance().sendGazePoint(pred.filteredX, pred.filteredY, pred.confidence);
          }
        }
      },
      onStatusChange: (info) => {
        setDiagnosticInfo({ ...info });
      },
      onError: (err) => {
        console.error('Camera error:', err);
      },
    });
    cameraManagerRef.current = cameraManager;

    // 3. Load saved settings & calibration from IndexedDB
    AccessibilityManager.getInstance().initialize().then((loadedSettings) => {
      setSettings(loadedSettings);
      selectionManager.getDwellEngine().setDwellDuration(loadedSettings.dwellDurationMs);
      selectionManager.setSoundFeedback(loadedSettings.soundFeedback);
      headTracker.setSensitivity(loadedSettings.headSensitivity);

      // Initialize FaceLandmarker
      FaceLandmarkerService.getInstance().initialize();

      // Load saved eye calibration
      CalibrationStorage.loadEyeCalibration().then((savedCalib) => {
        if (savedCalib && savedCalib.passed) {
          gazeModel.deserialize(savedCalib);
          setCalibrationResult(savedCalib);
          TrackingStateManager.getInstance().setHasCalibratedEye(true);
        }
      });

      // Load saved head neutral
      CalibrationStorage.loadHeadNeutral().then((savedHead) => {
        if (savedHead) {
          headTracker.setNeutralPose(savedHead);
          TrackingStateManager.getInstance().setHasCalibratedHead(true);
        }
      });
    });

    return () => {
      cameraManager.stopCamera();
    };
  }, []);

  // Update tracking manager whenever mode or rest changes
  const handleSelectMode = (mode: InputMode) => {
    setSettings((prev) => ({ ...prev, inputMode: mode }));
    TrackingStateManager.getInstance().setMode(mode);
    AccessibilityManager.getInstance().updateSettings({ inputMode: mode });
    if (mode === 'head') {
      headTrackerRef.current?.start();
    } else {
      eyeTrackerRef.current?.start();
    }
  };

  const handleToggleRest = () => {
    const nextRest = !isResting;
    setIsResting(nextRest);
    SelectionManager.getInstance().setRestMode(nextRest);
    TrackingStateManager.getInstance().setResting(nextRest);
  };

  const handleUpdateSettings = (updates: Partial<UserAccessibilitySettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      AccessibilityManager.getInstance().updateSettings(updates);
      if (updates.dwellDurationMs) {
        SelectionManager.getInstance().getDwellEngine().setDwellDuration(updates.dwellDurationMs);
      }
      if (updates.headSensitivity && headTrackerRef.current) {
        headTrackerRef.current.setSensitivity(updates.headSensitivity);
      }
      return next;
    });
  };

  const handleCalibrationComplete = () => {
    if (gazeModelRef.current) {
      setCalibrationResult(gazeModelRef.current.getLastCalibrationResult());
    }
    // Start tracking in eye or head tracker
    if (settings.inputMode === 'eye') {
      eyeTrackerRef.current?.start();
    } else {
      headTrackerRef.current?.start();
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: 'var(--background)',
      }}
    >
      {/* Persistent video element for computer vision pipeline (remains active across all pages) */}
      <video
        ref={hiddenVideoRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '640px',
          height: '480px',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: -1,
        }}
        playsInline
        muted
      />

      {/* Persistent Accessible Header Bar with Live Clock & SOS */}
      <CameraStatus
        diagnosticInfo={diagnosticInfo}
        mode={settings.inputMode}
        isResting={isResting}
        isPaused={isPaused}
        onToggleRest={handleToggleRest}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onTriggerSos={() => setIsSosOpen(true)}
        showBackHome={currentPage !== 'home'}
        onNavigateHome={() => setCurrentPage('home')}
        isCalibrated={!!calibrationResult?.passed}
      />

      {/* Active Screen Rendering */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {currentPage === 'setup' && cameraManagerRef.current && (
          <SetupPage
            cameraManager={cameraManagerRef.current}
            persistentVideoElement={hiddenVideoRef.current}
            diagnosticInfo={diagnosticInfo}
            overlayData={overlayData}
            adaptiveState={adaptiveState}
            selectedMode={settings.inputMode}
            onSelectMode={handleSelectMode}
            onCameraStarted={() => {
              if (settings.inputMode === 'eye') {
                eyeTrackerRef.current?.start();
              } else {
                headTrackerRef.current?.start();
              }
            }}
            onCameraStopped={() => {
              eyeTrackerRef.current?.stop();
              headTrackerRef.current?.stop();
            }}
            onProceedToCalibration={() => setCurrentPage('calibration')}
            onSkipToHome={() => setCurrentPage('home')}
          />
        )}

        {currentPage === 'calibration' && calibrationManagerRef.current && headTrackerRef.current && (
          <CalibrationPage
            calibrationManager={calibrationManagerRef.current}
            headTracker={headTrackerRef.current}
            mode={settings.inputMode}
            videoElement={cameraManagerRef.current?.getVideoElement() ?? null}
            diagnosticInfo={diagnosticInfo}
            overlayData={overlayData}
            adaptiveState={adaptiveState}
            onToggleConfigMode={(m) => {
              eyeTrackerRef.current?.setConfigMode(m);
              setAdaptiveState((prev) => ({ ...prev, configMode: m }));
            }}
            onCalibrationComplete={handleCalibrationComplete}
            onNavigateHome={() => setCurrentPage('home')}
          />
        )}

        {currentPage === 'home' && (
          <HomePage
            onNavigate={(p) => {
              if (p === 'settings') {
                setIsSettingsOpen(true);
              } else if (p === 'calibration') {
                setCurrentPage('calibration');
              } else {
                setCurrentPage(p as ActivePage);
              }
            }}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onToggleRest={handleToggleRest}
          />
        )}

        {currentPage === 'news' && (
          <NewsPage onNavigateHome={() => setCurrentPage('home')} />
        )}

        {currentPage === 'youtube' && (
          <YouTubePage onNavigateHome={() => setCurrentPage('home')} />
        )}

        {currentPage === 'speak' && (
          <SpeakPage onNavigateHome={() => setCurrentPage('home')} />
        )}

        {currentPage === 'explore' && (
          <NewsPage onNavigateHome={() => setCurrentPage('home')} />
        )}

        {currentPage === 'help' && (
          <HelpPage
            emergencyContactName={settings.emergencyContactName}
            emergencyContactPhone={settings.emergencyContactPhone}
            onNavigateHome={() => setCurrentPage('home')}
          />
        )}
      </div>

      {/* Persistent SOS Emergency Modal Dialog */}
      <SosModal
        isOpen={isSosOpen}
        emergencyContactName={settings.emergencyContactName}
        emergencyContactPhone={settings.emergencyContactPhone}
        onClose={() => setIsSosOpen(false)}
        onNavigateHome={() => {
          setIsSosOpen(false);
          setCurrentPage('home');
        }}
      />

      {/* Visual Tracking Recovery Alert Banner */}
      <TrackingRecoveryBanner
        diagnosticInfo={diagnosticInfo}
        isResting={isResting}
        isPaused={isPaused}
      />

      {/* Rest Mode Fullscreen Overlay with Hands-Free Wake Up Dwell Button */}
      <RestModeOverlay
        isOpen={isResting}
        onResume={handleToggleRest}
      />

      {/* Calibrated Gaze / Head Tracking Pointer Cursor */}
      <EyeCursor
        prediction={currentPrediction}
        mode={settings.inputMode}
        isResting={isResting}
        isPaused={isPaused}
      />

      {/* Accessible Settings Drawer */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onNavigateRecalibrate={() => setCurrentPage('calibration')}
        onCalibrationsDeleted={() => {
          setCalibrationResult(null);
          setCurrentPage('setup');
        }}
      />

      {/* Technical Diagnostics Panel */}
      <DiagnosticPanel
        diagnosticInfo={diagnosticInfo}
        prediction={currentPrediction}
        calibrationResult={calibrationResult}
        mode={settings.inputMode}
      />
    </div>
  );
};
