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
} from './types/tracking';

// UI Components & Pages
import { CameraStatus } from './components/CameraStatus';
import { EyeCursor } from './components/EyeCursor';
import { SettingsDrawer } from './components/SettingsDrawer';
import { DiagnosticPanel } from './components/DiagnosticPanel';

import { SetupPage } from './pages/SetupPage';
import { CalibrationPage } from './pages/CalibrationPage';
import { HomePage } from './pages/HomePage';
import { SpeakPage } from './pages/SpeakPage';
import { ExplorePage } from './pages/ExplorePage';
import { HelpPage } from './pages/HelpPage';

export type ActivePage = 'setup' | 'calibration' | 'home' | 'speak' | 'explore' | 'help';

export const App: React.FC = () => {
  // Navigation & Settings State
  const [currentPage, setCurrentPage] = useState<ActivePage>('setup');
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
            const result = FaceLandmarkerService.getInstance().detectVideoFrame(video, timestamp);
            if (result && result.faceLandmarks && result.faceLandmarks[0]) {
              const landmarks = result.faceLandmarks[0];
              const diag = EyeFeatureExtractor.getDiagnosticOverlayData(landmarks);
              setOverlayData(diag);

              const matrix = result.facialTransformationMatrixes?.[0]?.data;
              const pose = HeadPoseEstimator.estimate(landmarks, matrix);
              const fv = EyeFeatureExtractor.buildFeatureVector(landmarks, pose, timestamp);

              cameraManager.updateVisionDiagnostics(
                true,
                true,
                lighting,
                diag?.faceBox,
                calibState.step === 'validating' ? 'validating' : 'calibrating'
              );

              if (fv) {
                calibrationManager.processFeatureVector(fv, window.innerWidth, window.innerHeight);
              }
            } else {
              setOverlayData(null);
              cameraManager.updateVisionDiagnostics(false, false, lighting, undefined, 'face_not_detected');
            }
          } else {
            // Normal eye gaze tracking
            const pred = eyeTracker.processFrame(video, timestamp);
            if (pred) {
              setCurrentPrediction(pred);
              cameraManager.updateVisionDiagnostics(
                !pred.confidence.isFaceLost,
                !pred.confidence.isBlinking,
                lighting,
                undefined,
                pred.confidence.systemStatus
              );
              // Update selection engine with gaze point
              selectionManager.update(
                { x: pred.filteredX, y: pred.filteredY },
                pred.confidence
              );
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
            cameraManager.updateVisionDiagnostics(
              !pred.confidence.isFaceLost,
              true,
              lighting,
              undefined,
              isCalibrated ? 'validated_tracking' : 'calibration_required'
            );
            // Update selection engine with head pointer point
            selectionManager.update(
              { x: pred.filteredX, y: pred.filteredY },
              pred.confidence
            );
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

      {/* Persistent Accessible Header Bar */}
      <CameraStatus
        diagnosticInfo={diagnosticInfo}
        mode={settings.inputMode}
        isResting={isResting}
        isPaused={isPaused}
        onToggleRest={handleToggleRest}
        onOpenSettings={() => setIsSettingsOpen(true)}
        showBackHome={currentPage !== 'home' && currentPage !== 'setup'}
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
            onCalibrationComplete={handleCalibrationComplete}
            onNavigateHome={() => setCurrentPage('home')}
          />
        )}

        {currentPage === 'home' && (
          <HomePage onNavigate={(p) => setCurrentPage(p)} />
        )}

        {currentPage === 'speak' && (
          <SpeakPage />
        )}

        {currentPage === 'explore' && (
          <ExplorePage />
        )}

        {currentPage === 'help' && (
          <HelpPage
            emergencyContactName={settings.emergencyContactName}
            emergencyContactPhone={settings.emergencyContactPhone}
            onNavigateHome={() => setCurrentPage('home')}
          />
        )}
      </div>

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
