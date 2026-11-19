/**
 * SetupPage (/setup)
 * Page 1: Guided camera permission, device verification, face alignment check,
 * lighting guidance, and input method selection.
 */

import React, { useEffect, useRef, useState } from 'react';
import { CameraManager } from '../camera/CameraManager';
import { CameraDiagnosticInfo, InputMode } from '../types/tracking';
import { EyeDiagnosticData } from '../vision/EyeFeatureExtractor';
import { DwellButton } from '../components/DwellButton';
import { CameraPreviewOverlay } from '../components/CameraPreviewOverlay';
import { Camera, CheckCircle2, AlertTriangle, Eye, Compass, ArrowRight, VideoOff } from 'lucide-react';

interface SetupPageProps {
  cameraManager: CameraManager;
  persistentVideoElement: HTMLVideoElement | null;
  diagnosticInfo: CameraDiagnosticInfo;
  overlayData: EyeDiagnosticData | null;
  selectedMode: InputMode;
  onSelectMode: (mode: InputMode) => void;
  onCameraStarted: () => void;
  onCameraStopped: () => void;
  onProceedToCalibration: () => void;
}

export const SetupPage: React.FC<SetupPageProps> = ({
  cameraManager,
  persistentVideoElement,
  diagnosticInfo,
  overlayData,
  selectedMode,
  onSelectMode,
  onCameraStarted,
  onCameraStopped,
  onProceedToCalibration,
}) => {
  const [isCameraActive, setIsCameraActive] = useState(cameraManager.getIsRunning());
  const [isStarting, setIsStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const startCamera = async () => {
    const targetVideo = persistentVideoElement;
    if (!targetVideo) {
      setCameraError('Video element initialization pending.');
      return;
    }

    setIsStarting(true);
    setCameraError(null);

    const success = await cameraManager.startCamera(targetVideo);
    setIsStarting(false);

    if (success) {
      setIsCameraActive(true);
      onCameraStarted();
    } else {
      setCameraError('Unable to access webcam. Please ensure camera permissions are allowed in your browser.');
    }
  };

  const stopCamera = () => {
    cameraManager.stopCamera();
    setIsCameraActive(false);
    onCameraStopped();
  };

  const isReadyToProceed = isCameraActive && diagnosticInfo.faceDetected;

  return (
    <div
      style={{
        maxWidth: '1080px',
        margin: '0 auto',
        padding: '36px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
      }}
    >
      {/* Title & Introduction */}
      <div>
        <h1 style={{ fontSize: 'var(--font-size-xl)', color: 'var(--text-primary)', marginBottom: '8px' }}>
          EyeControl Setup
        </h1>
        <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--text-secondary)', maxWidth: '720px' }}>
          Welcome. We will prepare your webcam for hands-free control. Position your camera directly facing you at eye level with steady, soft lighting.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '32px', alignItems: 'start' }}>
        {/* Left Column: Live Camera Preview & Camera Controls */}
        <div
          style={{
            backgroundColor: 'var(--surface)',
            borderRadius: 'var(--radius-lg)',
            border: '2px solid var(--border)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 'var(--font-size-md)', color: 'var(--text-primary)' }}>
              Camera Preview
            </h2>
            {isCameraActive && (
              <span
                style={{
                  fontSize: '0.85rem',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--surface-sage)',
                  color: 'var(--primary)',
                  fontWeight: 600,
                }}
              >
                {diagnosticInfo.width}×{diagnosticInfo.height}
              </span>
            )}
          </div>

          {/* Video Container */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              minHeight: '330px',
              backgroundColor: '#1E2A25',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isCameraActive ? (
              <CameraPreviewOverlay
                videoElement={cameraManager.getVideoElement()}
                diagnosticInfo={diagnosticInfo}
                overlayData={overlayData}
                mode="full"
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '24px', color: '#B8C4B8' }}>
                <Camera size={48} style={{ margin: '0 auto 12px auto', opacity: 0.7 }} />
                <p style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
                  Camera is turned off
                </p>
                <p style={{ fontSize: '0.9rem', color: '#8E9E95', marginTop: '4px' }}>
                  Click Start Camera below to begin.
                </p>
              </div>
            )}
          </div>

          {/* Camera Buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {!isCameraActive ? (
              <DwellButton
                id="btn-start-camera"
                onClick={startCamera}
                variant="primary"
                size="large"
                style={{ flex: 1 }}
                ariaLabel="Turn on camera"
              >
                <Camera size={22} />
                <span>{isStarting ? 'Connecting...' : 'Start Camera'}</span>
              </DwellButton>
            ) : (
              <DwellButton
                id="btn-stop-camera"
                onClick={stopCamera}
                variant="surface"
                size="large"
                style={{ flex: 1 }}
                ariaLabel="Stop camera"
              >
                <VideoOff size={22} />
                <span>Stop Camera</span>
              </DwellButton>
            )}
          </div>

          {cameraError && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: 'var(--emergency-surface)',
                color: 'var(--emergency)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertTriangle size={18} />
              <span>{cameraError}</span>
            </div>
          )}
        </div>

        {/* Right Column: Input Mode Selection & Positioning Guidance */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Input Method Chooser */}
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
            <h2 style={{ fontSize: 'var(--font-size-md)', color: 'var(--text-primary)' }}>
              Choose Your Input Method
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <DwellButton
                id="select-eye-mode"
                onClick={() => onSelectMode('eye')}
                variant={selectedMode === 'eye' ? 'primary' : 'surface'}
                size="card"
                ariaLabel="Choose Eye-Gaze Control"
                style={{ minHeight: '140px', flexDirection: 'column', gap: '10px' }}
              >
                <Eye size={36} />
                <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>Eye Gaze</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 400, opacity: 0.9 }}>
                  Control with your eyes
                </span>
              </DwellButton>

              <DwellButton
                id="select-head-mode"
                onClick={() => onSelectMode('head')}
                variant={selectedMode === 'head' ? 'primary' : 'surface'}
                size="card"
                ariaLabel="Choose Head-Movement Control"
                style={{ minHeight: '140px', flexDirection: 'column', gap: '10px' }}
              >
                <Compass size={36} />
                <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>Head Movement</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 400, opacity: 0.9 }}>
                  Control by tilting head
                </span>
              </DwellButton>
            </div>
          </div>

          {/* Positioning & Lighting Guidance */}
          <div
            style={{
              backgroundColor: 'var(--surface-sage)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
              padding: '20px 24px',
              fontSize: '0.95rem',
              color: 'var(--text-primary)',
              lineHeight: 1.6,
            }}
          >
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '8px', color: 'var(--primary)' }}>
              Positioning Tips
            </h3>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>Place camera roughly 50–70 cm (arm's length) away at eye level.</li>
              <li>Avoid strong backlights or windows directly behind you.</li>
              <li>If wearing glasses, angle the screen slightly to minimize glare on lenses.</li>
            </ul>
          </div>

          {/* Continue to Calibration Button */}
          <DwellButton
            id="btn-proceed-calibration"
            onClick={onProceedToCalibration}
            disabled={!isReadyToProceed}
            variant="primary"
            size="large"
            ariaLabel="Proceed to calibration"
            style={{ minHeight: '72px' }}
          >
            <span>Continue to Calibration</span>
            <ArrowRight size={22} />
          </DwellButton>
          {!isReadyToProceed && (
            <p style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              {!isCameraActive ? 'Start the camera first.' : 'Center your face in the camera frame to proceed.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
