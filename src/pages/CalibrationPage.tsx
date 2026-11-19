/**
 * CalibrationPage (/calibration)
 * Page 2: Guided 9-point & extended eye gaze calibration or head neutral calibration
 * with independent validation on held-out points.
 */

import React, { useEffect, useState, useRef } from 'react';
import { CalibrationManager, CalibrationState } from '../calibration/CalibrationManager';
import { HeadCalibration } from '../headTracking/HeadCalibration';
import { HeadTracker } from '../headTracking/HeadTracker';
import { CalibrationResult, HeadNeutralPose, InputMode } from '../types/tracking';
import { DwellButton } from '../components/DwellButton';
import { CalibrationStorage } from '../storage/CalibrationStorage';
import { RefreshCw, CheckCircle, AlertTriangle, ArrowRight, Compass, Eye } from 'lucide-react';

interface CalibrationPageProps {
  calibrationManager: CalibrationManager;
  headTracker: HeadTracker;
  mode: InputMode;
  onCalibrationComplete: () => void;
  onNavigateHome: () => void;
}

export const CalibrationPage: React.FC<CalibrationPageProps> = ({
  calibrationManager,
  headTracker,
  mode,
  onCalibrationComplete,
  onNavigateHome,
}) => {
  // Eye calibration state
  const [calibState, setCalibState] = useState<CalibrationState>(calibrationManager.getState());
  const [isCalibratingEye, setIsCalibratingEye] = useState(false);

  // Head calibration state
  const [headStep, setHeadStep] = useState<'idle' | 'recording_neutral' | 'testing' | 'completed'>('idle');
  const [headProgress, setHeadProgress] = useState(0);
  const [neutralPose, setNeutralPose] = useState<HeadNeutralPose | null>(null);

  useEffect(() => {
    if (mode === 'eye') {
      const unsub = calibrationManager.subscribe((state) => {
        setCalibState(state);
        if (state.step === 'completed' && state.result?.passed) {
          setIsCalibratingEye(false);
          // Persist fitted model to IndexedDB
          CalibrationStorage.saveEyeCalibration(state.result);
          onCalibrationComplete();
        }
      });
      return unsub;
    }
  }, [mode, calibrationManager, onCalibrationComplete]);

  // Start eye calibration
  const startEyeCalibration = (method: '9-point' | '17-point' = '9-point') => {
    setIsCalibratingEye(true);
    calibrationManager.start(window.innerWidth, window.innerHeight, method);
  };

  // Start head neutral calibration
  const startHeadCalibration = () => {
    setHeadStep('recording_neutral');
    setHeadProgress(0);
    const headCalib = headTracker.getCalibration();
    headCalib.startRecording(25);

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
    }, 50);
  };

  // Render Fullscreen Calibration Overlay for Eye Targets
  if (isCalibratingEye && (calibState.step === 'calibrating' || calibState.step === 'validating')) {
    const target = calibState.currentTarget;
    if (!target) return null;

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#EEF0E9',
          zIndex: 9999,
          cursor: 'none',
        }}
        aria-live="assertive"
      >
        {/* Instruction banner */}
        <div
          style={{
            position: 'absolute',
            top: '24px',
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
          }}
        >
          {calibState.step === 'validating' ? 'Validating Gaze Accuracy' : 'Follow the Circle'} —{' '}
          Target {calibState.targetIndex} of {calibState.totalTargets}
        </div>

        {/* Active Target Circle */}
        <div
          style={{
            position: 'absolute',
            left: `${target.x}px`,
            top: `${target.y}px`,
            transform: 'translate(-50%, -50%)',
            width: '90px',
            height: '90px',
            borderRadius: '50%',
            backgroundColor: 'var(--surface)',
            border: '4px solid var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(40, 56, 49, 0.15)',
            transition: 'left 250ms ease-out, top 250ms ease-out',
          }}
        >
          {/* Circular radial progress fill */}
          <svg
            width="82"
            height="82"
            viewBox="0 0 36 36"
            style={{ position: 'absolute', transform: 'rotate(-90deg)' }}
          >
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#DCE7DE"
              strokeWidth="4"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#42685A"
              strokeWidth="4"
              strokeDasharray={`${Math.round(calibState.targetProgress * 100)}, 100`}
            />
          </svg>

          {/* Center fixation point */}
          <div
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary)',
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '36px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
      }}
    >
      <div>
        <h1 style={{ fontSize: 'var(--font-size-xl)', color: 'var(--text-primary)', marginBottom: '8px' }}>
          {mode === 'eye' ? 'Eye-Gaze Calibration' : 'Head-Movement Calibration'}
        </h1>
        <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--text-secondary)' }}>
          {mode === 'eye'
            ? 'We will calibrate 9 target points across your screen and independently validate your gaze accuracy.'
            : 'We will record your comfortable, resting head posture as neutral center.'}
        </p>
      </div>

      {mode === 'eye' ? (
        /* Eye Mode Calibration Panel */
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
                9-Point Calibration Pattern
              </h2>
              <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--text-secondary)' }}>
                9 training circles + 4 held-out validation points.
              </p>
            </div>
          </div>

          {/* Calibration Status Message */}
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
              <RefreshCw size={24} color="#56675F" />
            )}
            <div>
              <div style={{ fontWeight: 700, fontSize: 'var(--font-size-base)' }}>
                {calibState.statusMessage}
              </div>
              {calibState.result && (
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Validation Accuracy: {calibState.result.overallAccuracyPercentage}% | Mean Error: {calibState.result.meanValidationPixelError} px
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <DwellButton
              id="btn-start-9point-calib"
              onClick={() => startEyeCalibration('9-point')}
              variant="primary"
              size="large"
              ariaLabel="Start 9-Point Calibration"
            >
              <RefreshCw size={22} />
              <span>{calibState.result ? 'Recalibrate (9 Points)' : 'Start Calibration'}</span>
            </DwellButton>

            {calibState.step === 'failed' && (
              <DwellButton
                id="btn-start-17point-calib"
                onClick={() => startEyeCalibration('17-point')}
                variant="sage"
                size="large"
                ariaLabel="Start Extended 17-Point Calibration"
              >
                <span>Extended Calibration (17 Points)</span>
              </DwellButton>
            )}

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
      ) : (
        /* Head Mode Calibration Panel */
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
                Face the center of your screen in a relaxed, comfortable position.
              </p>
            </div>
          </div>

          {headStep === 'recording_neutral' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontWeight: 600 }}>Recording Neutral Head Position... Keep Still</div>
              <div style={{ width: '100%', height: '12px', backgroundColor: 'var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.round(headProgress * 100)}%`, height: '100%', backgroundColor: 'var(--primary)', transition: 'width 60ms linear' }} />
              </div>
            </div>
          )}

          {headStep === 'completed' && (
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
                <strong>Neutral Head Position Recorded!</strong>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Gentle head tilts up, down, left and right will now navigate the pointer.
                </p>
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

            {headStep === 'completed' && (
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
      )}
    </div>
  );
};
