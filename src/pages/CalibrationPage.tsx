/**
 * CalibrationPage (/calibration)
 * Guided sequential calibration and independent validation:
 * Step A (Positioning) -> Step B (Central Baseline) -> Step C (9-Point Calibration)
 * -> Step D (LOOCV Model Fitting) -> Step E (5-Point Independent Validation).
 * Includes Live Camera Preview, Caregiver manual controls, and comprehensive validation report.
 */

import React, { useEffect, useState } from 'react';
import { CalibrationManager, CalibrationState } from '../calibration/CalibrationManager';
import { HeadTracker } from '../headTracking/HeadTracker';
import {
  CalibrationResult,
  HeadNeutralPose,
  InputMode,
  CameraDiagnosticInfo,
  AdaptiveEyeTrackingState,
  TrackingConfigMode,
  BenchmarkComparisonSession,
} from '../types/tracking';
import { EyeDiagnosticData } from '../vision/EyeFeatureExtractor';
import { DwellButton } from '../components/DwellButton';
import { CameraPreviewOverlay } from '../components/CameraPreviewOverlay';
import { DualEyeRegionPreview } from '../components/DualEyeRegionPreview';
import { CalibrationStorage } from '../storage/CalibrationStorage';
import {
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Compass,
  Eye,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Download,
  Target,
  Sliders,
  BarChart2,
} from 'lucide-react';

interface CalibrationPageProps {
  calibrationManager: CalibrationManager;
  headTracker: HeadTracker;
  mode: InputMode;
  videoElement: HTMLVideoElement | null;
  diagnosticInfo: CameraDiagnosticInfo;
  overlayData: EyeDiagnosticData | null;
  adaptiveState?: AdaptiveEyeTrackingState | null;
  onToggleConfigMode?: (mode: TrackingConfigMode) => void;
  onCalibrationComplete: () => void;
  onNavigateHome: () => void;
}

export const CalibrationPage: React.FC<CalibrationPageProps> = ({
  calibrationManager,
  headTracker,
  mode,
  videoElement,
  diagnosticInfo,
  overlayData,
  adaptiveState,
  onToggleConfigMode,
  onCalibrationComplete,
  onNavigateHome,
}) => {
  const [calibState, setCalibState] = useState<CalibrationState>(calibrationManager.getState());
  const [isCalibratingEye, setIsCalibratingEye] = useState(false);

  // Head calibration state
  const [headStep, setHeadStep] = useState<'idle' | 'recording_neutral' | 'completed'>(
    headTracker.getNeutralPose() ? 'completed' : 'idle'
  );
  const [headProgress, setHeadProgress] = useState(0);
  const [neutralPose, setNeutralPose] = useState<HeadNeutralPose | null>(headTracker.getNeutralPose());
  const [testedDirections, setTestedDirections] = useState<Record<string, boolean>>({
    up: false,
    down: false,
    left: false,
    right: false,
  });

  // Keep neutralPose synced if headTracker has it
  useEffect(() => {
    if (mode === 'head') {
      headTracker.start();
      const existing = headTracker.getNeutralPose();
      if (existing) {
        setNeutralPose(existing);
        setHeadStep('completed');
      }
    }
  }, [mode, headTracker]);

  // Subscribe to eye calibration manager
  useEffect(() => {
    if (mode === 'eye') {
      const unsub = calibrationManager.subscribe((state) => {
        setCalibState(state);
        if (state.step === 'completed' && state.result?.passed) {
          setIsCalibratingEye(false);
          CalibrationStorage.saveEyeCalibration(state.result);
          onCalibrationComplete();
        } else if (state.step === 'failed') {
          setIsCalibratingEye(false);
        }
      });
      return unsub;
    }
  }, [mode, calibrationManager, onCalibrationComplete]);

  // Keyboard controls for caregiver/tester
  useEffect(() => {
    if (!isCalibratingEye) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        calibrationManager.togglePause();
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        calibrationManager.retryCurrentTarget();
      } else if (e.code === 'Enter') {
        e.preventDefault();
        calibrationManager.advanceTarget();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCalibratingEye, calibrationManager]);

  // Start eye calibration sequence
  const startEyeCalibration = () => {
    setIsCalibratingEye(true);
    calibrationManager.start(window.innerWidth, window.innerHeight, '9-point');
  };

  // Start head neutral calibration
  const startHeadCalibration = () => {
    setHeadStep('recording_neutral');
    setHeadProgress(0);
    headTracker.start(); // Ensure head tracking inference loop is running
    const headCalib = headTracker.getCalibration();
    headCalib.startRecording(30);

    const interval = setInterval(() => {
      const prog = headCalib.getProgress();
      setHeadProgress(prog);

      if (!headCalib.getIsCollecting()) {
        clearInterval(interval);
        const neutral = headCalib.computeNeutralPose();
        if (neutral) {
          setNeutralPose(neutral);
          headTracker.setNeutralPose(neutral);
          CalibrationStorage.saveHeadNeutral(neutral);
          setHeadStep('completed');
          onCalibrationComplete();
        } else {
          setHeadStep('idle');
        }
      }
    }, 40);
  };

  // Export calibration and validation telemetry as JSON
  const exportTelemetry = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      mode,
      camera: {
        resolution: `${diagnosticInfo.width}x${diagnosticInfo.height}`,
        fps: diagnosticInfo.actualFps,
      },
      calibrationResult: calibState.result,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eyecontrol_calibration_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ACTIVE FULLSCREEN OVERLAY DURING CALIBRATION TARGETS
  if (
    isCalibratingEye &&
    (calibState.step === 'baseline' ||
      calibState.step === 'calibrating' ||
      calibState.step === 'fitting' ||
      calibState.step === 'validating')
  ) {
    const target = calibState.currentTarget;

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#EEF0E9',
          zIndex: 9999,
          cursor: 'none',
          userSelect: 'none',
        }}
        aria-live="assertive"
      >
        {/* Always-Accessible Hands-Free Abort & Return Home DwellButton */}
        <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 10001 }}>
          <DwellButton
            id="btn-fullscreen-abort-calib"
            onClick={() => {
              calibrationManager.cancel();
              setIsCalibratingEye(false);
              onNavigateHome();
            }}
            variant="emergency"
            size="normal"
            ariaLabel="Abort calibration and return to Home"
          >
            <span>Abort & Return Home 🏠</span>
          </DwellButton>
        </div>

        {/* Instruction and Progress Banner */}
        <div
          style={{
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'var(--surface)',
            padding: '12px 28px',
            borderRadius: 'var(--radius-full)',
            border: '2px solid var(--border)',
            boxShadow: 'var(--shadow-subtle)',
            fontSize: 'var(--font-size-base)',
            fontWeight: 700,
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span>{calibState.statusMessage}</span>
          {calibState.step !== 'fitting' && (
            <span
              style={{
                fontSize: '0.85rem',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--surface-sage)',
                color: 'var(--primary)',
              }}
            >
              {calibState.step === 'baseline'
                ? 'Central Baseline'
                : calibState.step === 'validating'
                ? `Validation ${calibState.targetIndex}/${calibState.totalTargets}`
                : `Target ${calibState.targetIndex}/${calibState.totalTargets}`}
            </span>
          )}
        </div>

        {/* Active Target Circle */}
        {target && calibState.step !== 'fitting' && (
          <div
            style={{
              position: 'absolute',
              left: `${target.x}px`,
              top: `${target.y}px`,
              transform: 'translate(-50%, -50%)',
              width: calibState.step === 'baseline' ? '120px' : '90px',
              height: calibState.step === 'baseline' ? '120px' : '90px',
              borderRadius: '50%',
              backgroundColor: 'var(--surface)',
              border: `4px solid ${calibState.step === 'validating' ? '#5E8B75' : 'var(--primary)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(40, 56, 49, 0.18)',
              transition: 'left 300ms ease-out, top 300ms ease-out',
            }}
          >
            {/* Radial circular progress svg */}
            <svg
              width={calibState.step === 'baseline' ? '110' : '82'}
              height={calibState.step === 'baseline' ? '110' : '82'}
              viewBox="0 0 36 36"
              style={{ position: 'absolute', transform: 'rotate(-90deg)' }}
            >
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#DCE7DE"
                strokeWidth="3.5"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#42685A"
                strokeWidth="3.5"
                strokeDasharray={`${Math.round(calibState.targetProgress * 100)}, 100`}
              />
            </svg>

            {/* Fixation center bullseye */}
            <div
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary)',
              }}
            />
          </div>
        )}

        {/* Model Fitting Spinner */}
        {calibState.step === 'fitting' && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
            }}
          >
            <RefreshCw size={54} color="#42685A" style={{ animation: 'spin 1.5s linear infinite' }} />
            <h2 style={{ marginTop: '16px', color: 'var(--text-primary)' }}>Computing Optimal Gaze Model</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Evaluating candidate regressions with Cross-Validation...</p>
          </div>
        )}

        {/* Floating Caregiver / Tester Controls */}
        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '24px',
            display: 'flex',
            gap: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.92)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-subtle)',
            fontSize: '0.85rem',
            cursor: 'default',
          }}
        >
          <button
            type="button"
            onClick={() => calibrationManager.togglePause()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {calibState.isPaused ? <Play size={14} /> : <Pause size={14} />}
            <span>{calibState.isPaused ? 'Resume' : 'Pause'} (Space)</span>
          </button>

          <button
            type="button"
            onClick={() => calibrationManager.retryCurrentTarget()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            <RotateCcw size={14} />
            <span>Retry (R)</span>
          </button>

          <button
            type="button"
            onClick={() => calibrationManager.advanceTarget()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            <SkipForward size={14} />
            <span>Advance (Enter)</span>
          </button>
        </div>

        {/* Live Camera Preview Overlay (Collapsible in corner with fixation warning) */}
        <CameraPreviewOverlay
          videoElement={videoElement}
          diagnosticInfo={diagnosticInfo}
          overlayData={overlayData}
          adaptiveState={adaptiveState}
          mode="calibration"
          showFixationWarning
        />
      </div>
    );
  }

  // STANDARD CALIBRATION DASHBOARD VIEW
  return (
    <div
      style={{
        maxWidth: '960px',
        margin: '0 auto',
        padding: '36px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-xl)', color: 'var(--text-primary)', marginBottom: '8px' }}>
            {mode === 'eye' ? 'Eye-Gaze Calibration' : 'Head-Movement Calibration'}
          </h1>
          <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--text-secondary)', margin: 0 }}>
            {mode === 'eye'
              ? 'We will set your central baseline, calibrate 9 points across your screen, and independently test accuracy on 5 validation targets.'
              : 'We will record your comfortable resting head posture as neutral center.'}
          </p>
        </div>

        <DwellButton
          id="btn-calib-return-home-header"
          onClick={onNavigateHome}
          variant="sage"
          size="normal"
          ariaLabel="Return to Home screen"
          style={{ minHeight: '52px', padding: '10px 20px' }}
        >
          <span>Return Home 🏠</span>
        </DwellButton>
      </div>

      {mode === 'eye' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>
          {/* Main Calibration & Benchmarking Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div
              style={{
                backgroundColor: 'var(--surface)',
                borderRadius: 'var(--radius-lg)',
                border: '2px solid var(--border)',
                padding: '32px',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
              }}
            >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--surface-sage)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)',
                  }}
                >
                  <Eye size={28} />
                </div>
                <div>
                  <h2 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--text-primary)' }}>
                    Sequential 9-Point Calibration + 5 Validation Targets
                  </h2>
                  <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--text-secondary)' }}>
                    Cross-validated Ridge regression with central baseline compensation.
                  </p>
                </div>
              </div>

              {calibState.result && (
                <button
                  type="button"
                  onClick={exportTelemetry}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface-sage)',
                    color: 'var(--primary)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Download size={16} />
                  <span>Export JSON</span>
                </button>
              )}
            </div>

            {/* Status Message Banner */}
            <div
              style={{
                padding: '16px 20px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: calibState.result?.passed
                  ? 'var(--surface-sage)'
                  : calibState.step === 'failed'
                  ? 'var(--emergency-surface)'
                  : 'var(--background)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              {calibState.result?.passed ? (
                <CheckCircle size={24} color="#42685A" />
              ) : calibState.step === 'failed' ? (
                <AlertTriangle size={24} color="#A75B51" />
              ) : (
                <Target size={24} color="#56675F" />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 'var(--font-size-base)' }}>
                  {calibState.statusMessage}
                </div>
                {calibState.result && (
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Model: {calibState.result.modelType || 'Ridge'} | LOOCV Score: {calibState.result.cvScore || 'N/A'}
                  </div>
                )}
              </div>
            </div>

            {/* Validation Metrics Breakdown if result exists */}
            {calibState.result && (
              <div
                style={{
                  backgroundColor: 'var(--background)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Independent Held-Out Validation Report (5 Targets)
                </h3>

                {/* Metric Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  <div style={{ backgroundColor: 'var(--surface)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Accuracy</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: calibState.result.passed ? '#42685A' : '#A75B51' }}>
                      {calibState.result.overallAccuracyPercentage}%
                    </div>
                  </div>

                  <div style={{ backgroundColor: 'var(--surface)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Mean Error</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {calibState.result.meanValidationPixelError} px
                    </div>
                  </div>

                  <div style={{ backgroundColor: 'var(--surface)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Median Error</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {calibState.result.medianValidationPixelError} px
                    </div>
                  </div>

                  <div style={{ backgroundColor: 'var(--surface)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tracking Loss</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {calibState.result.trackingLossPercentage}%
                    </div>
                  </div>
                </div>

                {/* Per-Region Targets Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                        <th style={{ padding: '6px 8px' }}>Region Target</th>
                        <th style={{ padding: '6px 8px' }}>Target Pos</th>
                        <th style={{ padding: '6px 8px' }}>Predicted Pos</th>
                        <th style={{ padding: '6px 8px' }}>Pixel Error</th>
                        <th style={{ padding: '6px 8px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calibState.result.targetMetrics.map((m) => (
                        <tr key={m.targetId} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                          <td style={{ padding: '6px 8px', fontWeight: 600 }}>{m.regionName || m.targetId}</td>
                          <td style={{ padding: '6px 8px' }}>({Math.round(m.targetPos.x)}, {Math.round(m.targetPos.y)})</td>
                          <td style={{ padding: '6px 8px' }}>({Math.round(m.averagePredictedPos.x)}, {Math.round(m.averagePredictedPos.y)})</td>
                          <td style={{ padding: '6px 8px' }}>{m.pixelError} px</td>
                          <td style={{ padding: '6px 8px' }}>
                            <span style={{ color: m.isHit ? '#42685A' : '#A75B51', fontWeight: 700 }}>
                              {m.isHit ? '✓ Hit' : '✗ Miss'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <DwellButton
                id="btn-start-9point-calib"
                onClick={startEyeCalibration}
                variant="primary"
                size="large"
                ariaLabel="Start Calibration"
              >
                <RefreshCw size={22} />
                <span>{calibState.result ? 'Recalibrate (9 Points)' : 'Start Calibration'}</span>
              </DwellButton>

              {calibState.result?.passed && (
                <DwellButton
                  id="btn-goto-home-from-calib"
                  onClick={onNavigateHome}
                  variant="sage"
                  size="large"
                  ariaLabel="Proceed to Home screen"
                >
                  <span>Go to Home Screen</span>
                  <ArrowRight size={22} />
                </DwellButton>
              )}
            </div>
          </div>

          {/* Configuration Comparison & Validation Benchmarking Card */}
          <div
            style={{
              backgroundColor: 'var(--surface)',
              borderRadius: 'var(--radius-lg)',
              border: '2px solid var(--border)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BarChart2 size={20} color="#42685A" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Tracking Configuration Benchmark & Latency Profiling
                </h3>
              </div>

              {onToggleConfigMode && adaptiveState && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => onToggleConfigMode('standard')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                      backgroundColor: adaptiveState.configMode === 'standard' ? 'var(--primary)' : 'var(--surface)',
                      color: adaptiveState.configMode === 'standard' ? '#FFFFFF' : 'var(--text-primary)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Config A: Standard
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleConfigMode('adaptive_dual_view')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                      backgroundColor: adaptiveState.configMode === 'adaptive_dual_view' ? 'var(--primary)' : 'var(--surface)',
                      color: adaptiveState.configMode === 'adaptive_dual_view' ? '#FFFFFF' : 'var(--text-primary)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Config B: Adaptive Dual-View
                  </button>
                </div>
              )}
            </div>

            {/* Benchmark Live Metric Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              <div style={{ backgroundColor: 'var(--background)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Actual Camera FPS</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>
                  {adaptiveState?.telemetry.actualFps || diagnosticInfo.actualFps || 0} FPS
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--background)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Face Detection</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {adaptiveState?.telemetry.faceDetectionMs || 0} ms
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--background)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ROI & Features</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {((adaptiveState?.telemetry.roiExtractionMs || 0) + (adaptiveState?.telemetry.featureExtractionMs || 0)).toFixed(1)} ms
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--background)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Latency</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {adaptiveState?.telemetry.totalInferenceMs || 0} ms
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Dual-view adaptive tracking maintains the full-frame 640×480 face matrix while extracting high-precision smoothed eye ROIs with adaptive zoom ({adaptiveState?.adaptiveZoomFactor.toFixed(1)}x) for steady saccade tracking without jitter.
            </div>
          </div>
        </div>

        {/* Right Sidebar: Dual-View Adaptive Eye Zoom & Camera Positioning */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {adaptiveState && (
            <DualEyeRegionPreview
              videoElement={videoElement}
              diagnosticInfo={diagnosticInfo}
              adaptiveState={adaptiveState}
              onToggleConfigMode={onToggleConfigMode}
            />
          )}

          <CameraPreviewOverlay
            videoElement={videoElement}
            diagnosticInfo={diagnosticInfo}
            overlayData={overlayData}
            adaptiveState={adaptiveState}
            mode="thumbnail"
          />
        </div>
      </div>
      ) : (
        /* Head Mode Calibration Panel */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px', alignItems: 'start' }}>
          <div
            style={{
              backgroundColor: 'var(--surface)',
              borderRadius: 'var(--radius-lg)',
              border: '2px solid var(--border)',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--surface-blue)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)',
                }}
              >
                <Compass size={28} />
              </div>
              <div>
                <h2 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--text-primary)' }}>
                  Neutral Head Posture Calibration
                </h2>
                <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--text-secondary)' }}>
                  Sit in your natural resting posture looking at the screen center, then click Set Neutral Posture.
                </p>
              </div>
            </div>

            {headStep === 'recording_neutral' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontWeight: 600, color: 'var(--primary)' }}>
                  Recording Neutral Head Position... Keep Your Head Still
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '14px',
                    backgroundColor: 'var(--border)',
                    borderRadius: '7px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.round(headProgress * 100)}%`,
                      height: '100%',
                      backgroundColor: 'var(--primary)',
                      transition: 'width 60ms linear',
                    }}
                  />
                </div>
              </div>
            )}

            {neutralPose && (
              <div
                style={{
                  padding: '16px',
                  backgroundColor: 'var(--surface-sage)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <CheckCircle size={24} color="#42685A" />
                <div>
                  <strong>Neutral Head Posture Calibrated!</strong>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Center calibrated at Yaw: {(neutralPose.neutralYaw * 57.3).toFixed(1)}°, Pitch: {(neutralPose.neutralPitch * 57.3).toFixed(1)}°. Gentle head tilts will now guide the cursor.
                  </p>
                </div>
              </div>
            )}

            {/* Interactive Head Direction Verification Area */}
            {neutralPose && (
              <div
                style={{
                  padding: '20px',
                  backgroundColor: 'var(--background)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  Interactive Direction Test: Tilt head to dwell on any target below
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  <DwellButton
                    id="test-head-up"
                    onClick={() => setTestedDirections(prev => ({ ...prev, up: true }))}
                    variant={testedDirections.up ? 'primary' : 'surface'}
                    size="normal"
                    ariaLabel="Test head tilt up"
                    style={{ minHeight: '60px', flexDirection: 'column', gap: '4px' }}
                  >
                    <span>Tilt UP</span>
                    <span style={{ fontSize: '0.75rem' }}>{testedDirections.up ? '✓ Tested' : 'Try tilt'}</span>
                  </DwellButton>

                  <DwellButton
                    id="test-head-down"
                    onClick={() => setTestedDirections(prev => ({ ...prev, down: true }))}
                    variant={testedDirections.down ? 'primary' : 'surface'}
                    size="normal"
                    ariaLabel="Test head tilt down"
                    style={{ minHeight: '60px', flexDirection: 'column', gap: '4px' }}
                  >
                    <span>Tilt DOWN</span>
                    <span style={{ fontSize: '0.75rem' }}>{testedDirections.down ? '✓ Tested' : 'Try tilt'}</span>
                  </DwellButton>

                  <DwellButton
                    id="test-head-left"
                    onClick={() => setTestedDirections(prev => ({ ...prev, left: true }))}
                    variant={testedDirections.left ? 'primary' : 'surface'}
                    size="normal"
                    ariaLabel="Test head tilt left"
                    style={{ minHeight: '60px', flexDirection: 'column', gap: '4px' }}
                  >
                    <span>Tilt LEFT</span>
                    <span style={{ fontSize: '0.75rem' }}>{testedDirections.left ? '✓ Tested' : 'Try tilt'}</span>
                  </DwellButton>

                  <DwellButton
                    id="test-head-right"
                    onClick={() => setTestedDirections(prev => ({ ...prev, right: true }))}
                    variant={testedDirections.right ? 'primary' : 'surface'}
                    size="normal"
                    ariaLabel="Test head tilt right"
                    style={{ minHeight: '60px', flexDirection: 'column', gap: '4px' }}
                  >
                    <span>Tilt RIGHT</span>
                    <span style={{ fontSize: '0.75rem' }}>{testedDirections.right ? '✓ Tested' : 'Try tilt'}</span>
                  </DwellButton>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <DwellButton
                id="btn-record-head-neutral"
                onClick={startHeadCalibration}
                variant="primary"
                size="large"
                ariaLabel="Record Neutral Head Position"
              >
                <Compass size={22} />
                <span>{neutralPose ? 'Recalibrate Neutral Posture' : 'Set Neutral Posture'}</span>
              </DwellButton>

              {neutralPose && (
                <DwellButton
                  id="btn-head-goto-home"
                  onClick={onNavigateHome}
                  variant="sage"
                  size="large"
                  ariaLabel="Proceed to Home screen"
                >
                  <span>Go to Home Screen</span>
                  <ArrowRight size={22} />
                </DwellButton>
              )}
            </div>
          </div>

          {/* Right Column: Live Camera Preview in Head Mode */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <CameraPreviewOverlay
              videoElement={videoElement}
              diagnosticInfo={diagnosticInfo}
              overlayData={overlayData}
              mode="thumbnail"
            />
          </div>
        </div>
      )}
    </div>
  );
};
