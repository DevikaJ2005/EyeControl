/**
 * CameraStatus / AppHeader
 * Slim professional header bar:
 * - EyeControl logo (compact)
 * - Live tracking status pill
 * - Date + time
 * - Rest and Settings (icon-only to save space)
 * - NO prominent SOS button — emergency is in Help page
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
  const [currentDateTime, setCurrentDateTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
      const timeStr = now.toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      setCurrentDateTime(`${dateStr} • ${timeStr}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Tracking status
  let statusText = 'Camera offline';
  let statusDot = '#DC2626';
  const fps = diagnosticInfo.actualFps;
  const isFpsLow = fps > 0 && fps < 18;

  if (!diagnosticInfo.faceDetected || diagnosticInfo.systemStatus === 'camera_unavailable') {
    statusText = diagnosticInfo.systemStatus === 'camera_unavailable' ? 'Camera unavailable' : 'No face detected';
    statusDot = '#DC2626';
  } else if (!diagnosticInfo.eyeRegionsClear) {
    statusText = 'Eyes obscured';
    statusDot = '#D97706';
  } else if (!isCalibrated && mode === 'eye') {
    statusText = 'Calibration needed';
    statusDot = '#2563EB';
  } else if (diagnosticInfo.systemStatus === 'temporarily_unavailable') {
    statusText = diagnosticInfo.diagnosticReason || 'Tracking unavailable';
    statusDot = '#D97706';
  } else if (diagnosticInfo.faceDetected && diagnosticInfo.eyeRegionsClear && isCalibrated) {
    statusText = isFpsLow ? `Tracking • ${fps} FPS` : 'Tracking Active';
    statusDot = '#16A34A';
  } else if (mode === 'head' && diagnosticInfo.faceDetected) {
    statusText = isCalibrated ? 'Head Tracking' : 'Set neutral posture';
    statusDot = isCalibrated ? '#16A34A' : '#2563EB';
  }

  const handleCancel = () => {
    SelectionManager.getInstance().cancel();
    if (onCancelAction) onCancelAction();
  };

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid var(--border)',
        height: '56px',
        minHeight: '56px',
        gap: '12px',
        zIndex: 100,
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {/* LEFT: Brand + optional back-home */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {showBackHome && onNavigateHome && (
          <DwellButton
            id="nav-back-home"
            onClick={onNavigateHome}
            size="normal"
            variant="sage"
            ariaLabel="Return to Home screen"
            style={{ minHeight: '40px', padding: '6px 14px', fontSize: '0.9rem' }}
          >
            <Home size={18} />
            <span>Home</span>
          </DwellButton>
        )}

        <DwellButton
          id="btn-emergency-cancel"
          onClick={handleCancel}
          size="normal"
          variant="ghost"
          ariaLabel="Cancel current dwell action"
          style={{ minHeight: '40px', padding: '6px 10px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}
        >
          <XCircle size={16} />
          <span>Cancel</span>
        </DwellButton>

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              flexShrink: 0,
            }}
          >
            {mode === 'eye' ? <Eye size={18} /> : <Compass size={18} />}
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)', lineHeight: 1 }}>
              EyeControl
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.3px' }}>
              Look • Select • Speak
            </div>
          </div>
        </div>
      </div>

      {/* CENTER: Status + date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Status pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            padding: '5px 14px',
            borderRadius: '99px',
            border: `1px solid ${statusDot}30`,
            backgroundColor: `${statusDot}10`,
            fontSize: '0.85rem',
            fontWeight: 700,
            color: '#0F172A',
            whiteSpace: 'nowrap',
          }}
          aria-live="polite"
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: statusDot,
              flexShrink: 0,
            }}
          />
          <span>{statusText}</span>
          {isFpsLow && <AlertTriangle size={13} color="#D97706" />}
        </div>

        {/* Date + time */}
        <div
          style={{
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            whiteSpace: 'nowrap',
          }}
        >
          {currentDateTime}
        </div>
      </div>

      {/* RIGHT: Rest + Settings */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <DwellButton
          id="btn-toggle-rest"
          onClick={onToggleRest}
          allowInRestMode={true}
          variant={isResting ? 'primary' : 'ghost'}
          size="normal"
          ariaLabel={isResting ? 'Resume tracking' : 'Enter Rest Mode'}
          style={{ minHeight: '40px', padding: '6px 12px', fontSize: '0.9rem' }}
        >
          {isResting ? <Play size={16} /> : <Moon size={16} />}
          <span>{isResting ? 'Resume' : 'Rest'}</span>
        </DwellButton>

        <DwellButton
          id="btn-open-settings"
          onClick={onOpenSettings}
          variant="ghost"
          size="normal"
          ariaLabel="Open accessibility settings"
          style={{ minHeight: '40px', padding: '6px 10px' }}
        >
          <Settings size={18} />
        </DwellButton>
      </div>
    </header>
  );
};
