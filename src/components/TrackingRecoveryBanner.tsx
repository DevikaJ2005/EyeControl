/**
 * TrackingRecoveryBanner
 * High-visibility assistive status banner that provides clear physical guidance
 * when tracking drops (e.g. face out of frame, eyes obscured, extreme head angle)
 * and confirms restoration with positive feedback.
 */

import React, { useEffect, useState } from 'react';
import { CameraDiagnosticInfo } from '../types/tracking';
import { AlertCircle, CheckCircle2, VideoOff, EyeOff } from 'lucide-react';

interface TrackingRecoveryBannerProps {
  diagnosticInfo: CameraDiagnosticInfo;
  isResting: boolean;
  isPaused: boolean;
}

export const TrackingRecoveryBanner: React.FC<TrackingRecoveryBannerProps> = ({
  diagnosticInfo,
  isResting,
  isPaused,
}) => {
  const [showRestored, setShowRestored] = useState(false);
  const [prevDetected, setPrevDetected] = useState(diagnosticInfo.faceDetected);

  useEffect(() => {
    // Detect transition from lost to restored
    if (!prevDetected && diagnosticInfo.faceDetected && diagnosticInfo.eyeRegionsClear) {
      setShowRestored(true);
      const timer = setTimeout(() => setShowRestored(false), 2400);
      return () => clearTimeout(timer);
    }
    setPrevDetected(diagnosticInfo.faceDetected);
  }, [diagnosticInfo.faceDetected, diagnosticInfo.eyeRegionsClear, prevDetected]);

  if (isResting || isPaused) return null;

  // 1. Success Flash when tracking is restored
  if (showRestored) {
    return (
      <div
        role="status"
        aria-live="assertive"
        style={{
          position: 'fixed',
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#42685A',
          color: '#FFFFFF',
          padding: '12px 28px',
          borderRadius: 'var(--radius-full)',
          boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '1.05rem',
          fontWeight: 700,
          zIndex: 9998,
          animation: 'fadeInOut 2.4s ease-in-out',
        }}
      >
        <CheckCircle2 size={24} color="#8CE4B2" />
        <span>Tracking Restored — Control Active</span>
      </div>
    );
  }

  // 2. Alert Banner when tracking is physically lost or obscured
  const isFaceLost = !diagnosticInfo.faceDetected;
  const isEyesObscured = diagnosticInfo.faceDetected && !diagnosticInfo.eyeRegionsClear;

  if (!isFaceLost && !isEyesObscured) {
    return null;
  }

  const title = isFaceLost
    ? 'Face Not Detected by Camera'
    : 'Eyes Obscured or Out of Alignment';

  const instruction = isFaceLost
    ? 'Center your face in front of the camera and look toward the screen.'
    : 'Keep both eyes open and check that lighting is not causing severe glare.';

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        top: '84px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: '#7A2E26',
        color: '#FFFFFF',
        padding: '14px 28px',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        maxWidth: '90vw',
        zIndex: 9998,
        border: '2px solid #FF8E85',
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {isFaceLost ? <VideoOff size={22} color="#FFF" /> : <EyeOff size={22} color="#FFF" />}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.2px' }}>
          {title}
        </div>
        <div style={{ fontSize: '0.95rem', opacity: 0.95 }}>
          {instruction}
        </div>
      </div>
    </div>
  );
};
