/**
 * CameraStatus
 * Header navigation bar with tracking health indicators, input mode badge,
 * always-accessible Emergency Return Home dwell button, Cancel Action mechanism,
 * Rest/Pause dwell control, and Settings toggle.
 */

import React from 'react';
import { CameraDiagnosticInfo, InputMode } from '../types/tracking';
import { DwellButton } from './DwellButton';
import { SelectionManager } from '../interaction/SelectionManager';
import { Settings, Eye, Compass, Moon, Play, Home, AlertTriangle, XCircle } from 'lucide-react';

interface CameraStatusProps {
  diagnosticInfo: CameraDiagnosticInfo;
  mode: InputMode;
  isResting: boolean;
  isPaused: boolean;
  onToggleRest: () => void;
  onOpenSettings: () => void;
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
  onNavigateHome,
  onCancelAction,
  showBackHome = false,
  isCalibrated = false,
}) => {
  // Determine distinct system status
  let statusText = 'Camera unavailable';
  let statusColor = '#A75B51';
  let statusBg = 'var(--surface-sand)';
  const fps = diagnosticInfo.actualFps;
  const isFpsLow = fps > 0 && fps < 18;

  if (diagnosticInfo.systemStatus === 'camera_unavailable') {
    statusText = 'Camera unavailable';
    statusColor = '#A75B51';
  } else if (!diagnosticInfo.faceDetected) {
    statusText = 'Face not detected';
    statusColor = '#A75B51';
  } else if (!diagnosticInfo.eyeRegionsClear) {
    statusText = 'Eyes obscured';
    statusColor = '#C48324';
  } else if (!isCalibrated && mode === 'eye') {
    statusText = 'Calibration required';
    statusColor = '#56675F';
    statusBg = 'var(--surface-sage)';
  } else if (diagnosticInfo.systemStatus === 'calibration_required') {
    statusText = 'Calibration required';
    statusColor = '#56675F';
  } else if (diagnosticInfo.systemStatus === 'calibrating') {
    statusText = 'Calibration in progress';
    statusColor = '#42685A';
    statusBg = 'var(--surface-sage)';
  } else if (diagnosticInfo.systemStatus === 'validating') {
    statusText = 'Validation in progress';
    statusColor = '#42685A';
    statusBg = 'var(--surface-sage)';
  } else if (diagnosticInfo.systemStatus === 'validation_failed') {
    statusText = 'Validation failed';
    statusColor = '#A75B51';
  } else if (diagnosticInfo.systemStatus === 'temporarily_unavailable') {
    statusText = diagnosticInfo.diagnosticReason || 'Tracking temporarily unavailable';
    statusColor = '#C48324';
  } else if (diagnosticInfo.faceDetected && diagnosticInfo.eyeRegionsClear && isCalibrated) {
    statusText = isFpsLow ? `Tracking Validated (${fps} FPS — Slow)` : `Tracking Validated (${fps || 30} FPS)`;
    statusColor = '#42685A';
    statusBg = 'var(--surface-sage)';
  } else if (mode === 'head' && diagnosticInfo.faceDetected) {
    statusText = `Head Tracking Active (${fps || 30} FPS)`;
    statusColor = '#42685A';
    statusBg = 'var(--surface-sage)';
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
        padding: '12px 24px',
        backgroundColor: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        minHeight: '72px',
        gap: '16px',
        zIndex: 100,
        position: 'relative',
      }}
    >
      {/* Left: Brand + Always-Accessible Return Home */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {showBackHome && onNavigateHome && (
          <DwellButton
            id="nav-emergency-home"
            onClick={onNavigateHome}
            size="normal"
            variant="emergency"
            ariaLabel="Emergency return to Home screen"
            style={{
              minHeight: '52px',
              padding: '10px 18px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Home size={22} />
            <span>Emergency Home</span>
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
            minHeight: '52px',
            padding: '10px 14px',
            color: 'var(--text-secondary)',
          }}
        >
          <XCircle size={20} />
          <span>Cancel Dwell</span>
        </DwellButton>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-inverse)',
            }}
          >
            {mode === 'eye' ? <Eye size={20} /> : <Compass size={20} />}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-primary)', lineHeight: 1.1 }}>
              EyeControl
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {mode === 'eye' ? 'Eye-Gaze Mode' : 'Head-Movement Mode'}
            </div>
          </div>
        </div>
      </div>

      {/* Center: Live Camera Tracking Status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '6px 18px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: statusBg,
          border: '1px solid var(--border)',
          fontSize: '0.95rem',
          fontWeight: 600,
          maxWidth: '380px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
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
            flexShrink: 0,
          }}
        />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{statusText}</span>
        {isFpsLow && (
          <span title="Low frame rate warning" style={{ flexShrink: 0 }}>
            <AlertTriangle size={15} color="#C48324" />
          </span>
        )}
      </div>

      {/* Right: Rest / Pause + Settings controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <DwellButton
          id="btn-toggle-rest"
          onClick={onToggleRest}
          allowInRestMode={true}
          variant={isResting ? 'primary' : 'surface'}
          size="normal"
          ariaLabel={isResting ? 'Resume tracking' : 'Pause and rest eyes'}
          style={{ minHeight: '52px', padding: '10px 18px' }}
        >
          {isResting ? <Play size={20} /> : <Moon size={20} />}
          <span>{isResting ? 'Resume' : 'Rest'}</span>
        </DwellButton>

        <DwellButton
          id="btn-open-settings"
          onClick={onOpenSettings}
          variant="ghost"
          size="normal"
          ariaLabel="Open accessibility settings"
          style={{ minHeight: '52px', padding: '10px 16px' }}
        >
          <Settings size={22} />
          <span className="sr-only">Settings</span>
        </DwellButton>
      </div>
    </header>
  );
};
