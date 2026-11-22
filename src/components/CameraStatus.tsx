/**
 * CameraStatus / AppHeader
 * Header navigation bar with:
 * - EyeControl brand & tagline ("Look • Select • Speak")
 * - Live Tracking & Calibration Health indicator
 * - Real-time live date and time clock ("Wed, Apr 23, 2025 10:24 AM")
 * - Persistent Red SOS Emergency button (accessible on every screen)
 * - Navigation return home, Rest mode toggle, and Settings
 */

import React, { useEffect, useState } from 'react';
import { CameraDiagnosticInfo, InputMode } from '../types/tracking';
import { DwellButton } from './DwellButton';
import { SelectionManager } from '../interaction/SelectionManager';
import {
  Settings,
  Eye,
  Compass,
  Moon,
  Play,
  Home,
  AlertTriangle,
  XCircle,
  AlertOctagon,
  Calendar,
} from 'lucide-react';

interface CameraStatusProps {
  diagnosticInfo: CameraDiagnosticInfo;
  mode: InputMode;
  isResting: boolean;
  isPaused: boolean;
  onToggleRest: () => void;
  onOpenSettings: () => void;
  onTriggerSos?: () => void;
  onNavigateHome?: () => void;
  onCancelAction?: () => void;
  showBackHome?: boolean;
  isCalibrated?: boolean;
}

export const CameraStatus: React.FC<CameraStatusProps> = ({
  diagnosticInfo,
  mode,
  isResting,
  isPaused,
  onToggleRest,
  onOpenSettings,
  onTriggerSos,
  onNavigateHome,
  onCancelAction,
  showBackHome = false,
  isCalibrated = false,
}) => {
  // Live Date and Time
  const [currentDateTime, setCurrentDateTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      };
      setCurrentDateTime(now.toLocaleDateString('en-US', options));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Determine distinct system status
  let statusText = 'Camera offline';
  let statusColor = '#DC2626';
  let statusBg = '#FEF2F2';
  const fps = diagnosticInfo.actualFps;
  const isFpsLow = fps > 0 && fps < 18;

  if (diagnosticInfo.systemStatus === 'camera_unavailable') {
    statusText = 'Camera unavailable';
    statusColor = '#DC2626';
    statusBg = '#FEF2F2';
  } else if (!diagnosticInfo.faceDetected) {
    statusText = 'Face not detected';
    statusColor = '#DC2626';
    statusBg = '#FEF2F2';
  } else if (!diagnosticInfo.eyeRegionsClear) {
    statusText = 'Eyes obscured';
    statusColor = '#D97706';
    statusBg = '#FFFBEB';
  } else if (!isCalibrated && mode === 'eye') {
    statusText = 'Calibration required';
    statusColor = '#2563EB';
    statusBg = '#EFF6FF';
  } else if (diagnosticInfo.systemStatus === 'calibration_required') {
    statusText = 'Calibration required';
    statusColor = '#2563EB';
    statusBg = '#EFF6FF';
  } else if (diagnosticInfo.systemStatus === 'calibrating') {
    statusText = 'Calibration in progress';
    statusColor = '#0088FF';
    statusBg = '#EFF6FF';
  } else if (diagnosticInfo.systemStatus === 'validating') {
    statusText = 'Validation in progress';
    statusColor = '#0088FF';
    statusBg = '#EFF6FF';
  } else if (diagnosticInfo.systemStatus === 'validation_failed') {
    statusText = 'Validation failed';
    statusColor = '#DC2626';
    statusBg = '#FEF2F2';
  } else if (diagnosticInfo.systemStatus === 'temporarily_unavailable') {
    statusText = diagnosticInfo.diagnosticReason || 'Tracking temporarily unavailable';
    statusColor = '#D97706';
    statusBg = '#FFFBEB';
  } else if (diagnosticInfo.faceDetected && diagnosticInfo.eyeRegionsClear && isCalibrated) {
    statusText = isFpsLow ? `Tracking Active • ${fps} FPS` : 'Tracking Active • Calibration: Good';
    statusColor = '#16A34A';
    statusBg = '#F0FDF4';
  } else if (mode === 'head' && diagnosticInfo.faceDetected) {
    statusText = isCalibrated ? 'Head Tracking Active • Good' : 'Neutral Posture Required';
    statusColor = isCalibrated ? '#16A34A' : '#2563EB';
    statusBg = isCalibrated ? '#F0FDF4' : '#EFF6FF';
  }

  const handleCancel = () => {
    SelectionManager.getInstance().cancel();
    if (onCancelAction) {
      onCancelAction();
    }
  };

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 24px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid var(--border)',
        minHeight: '74px',
        gap: '16px',
        zIndex: 100,
        position: 'relative',
        boxShadow: 'var(--shadow-subtle)',
      }}
    >
      {/* Left: Brand + Navigation Back */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {showBackHome && onNavigateHome && (
          <DwellButton
            id="nav-back-home"
            onClick={onNavigateHome}
            size="normal"
            variant="sage"
            ariaLabel="Return to Home screen"
            style={{
              minHeight: '48px',
              padding: '8px 16px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Home size={20} />
            <span>Home</span>
          </DwellButton>
        )}

        {/* Global Cancel / Abort Current Dwell */}
        <DwellButton
          id="btn-emergency-cancel"
          onClick={handleCancel}
          size="normal"
          variant="ghost"
          ariaLabel="Cancel current dwell action"
          style={{
            minHeight: '48px',
            padding: '8px 12px',
            color: 'var(--text-secondary)',
          }}
        >
          <XCircle size={18} />
          <span>Cancel</span>
        </DwellButton>

        {/* Brand Logo & Subtitle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 2px 6px rgba(15, 37, 55, 0.25)',
            }}
          >
            {mode === 'eye' ? <Eye size={22} /> : <Compass size={22} />}
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--primary)', lineHeight: 1.1, letterSpacing: '-0.3px' }}>
              EyeControl
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Look • Select • Speak
            </div>
          </div>
        </div>
      </div>

      {/* Center: Live Camera Tracking Status Pill & Live Clock */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: statusBg,
            border: `1.5px solid ${statusColor}40`,
            fontSize: '0.9rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
          }}
          aria-live="polite"
        >
          <span
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: statusColor,
              display: 'inline-block',
              boxShadow: `0 0 6px ${statusColor}`,
            }}
          />
          <span>{statusText}</span>
          {isFpsLow && (
            <span title="Low frame rate warning" style={{ display: 'flex' }}>
              <AlertTriangle size={15} color="#D97706" />
            </span>
          )}
        </div>

        {/* Live Date and Time */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.95rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            backgroundColor: '#F8FAFC',
            border: '1px solid var(--border)',
            padding: '6px 14px',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <Calendar size={16} color="var(--secondary)" />
          <span>{currentDateTime || 'Loading date...'}</span>
        </div>
      </div>

      {/* Right: Rest Mode + Settings + Persistent Red SOS Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <DwellButton
          id="btn-toggle-rest"
          onClick={onToggleRest}
          allowInRestMode={true}
          variant={isResting ? 'primary' : 'surface'}
          size="normal"
          ariaLabel={isResting ? 'Resume tracking' : 'Pause and rest eyes'}
          style={{ minHeight: '48px', padding: '8px 16px' }}
        >
          {isResting ? <Play size={18} /> : <Moon size={18} />}
          <span>{isResting ? 'Resume' : 'Rest'}</span>
        </DwellButton>

        <DwellButton
          id="btn-open-settings"
          onClick={onOpenSettings}
          variant="ghost"
          size="normal"
          ariaLabel="Open accessibility settings"
          style={{ minHeight: '48px', padding: '8px 14px' }}
        >
          <Settings size={20} />
          <span className="sr-only">Settings</span>
        </DwellButton>

        {/* Persistent Red SOS Emergency Button */}
        {onTriggerSos && (
          <DwellButton
            id="nav-persistent-sos"
            onClick={onTriggerSos}
            variant="emergency"
            size="normal"
            ariaLabel="Emergency Assistance SOS"
            style={{
              minHeight: '48px',
              padding: '8px 18px',
              fontWeight: 800,
              fontSize: '1rem',
              letterSpacing: '0.5px',
              backgroundColor: '#DC2626',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.35)',
            }}
          >
            <AlertOctagon size={20} />
            <span>SOS</span>
          </DwellButton>
        )}
      </div>
    </header>
  );
};
