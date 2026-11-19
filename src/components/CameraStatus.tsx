/**
 * CameraStatus
 * Header navigation bar with tracking health indicators, input mode badge,
 * Rest/Pause dwell control, and Settings toggle.
 */

import React from 'react';
import { CameraDiagnosticInfo, InputMode } from '../types/tracking';
import { DwellButton } from './DwellButton';
import { Settings, Eye, Compass, Moon, Play, ArrowLeft } from 'lucide-react';

interface CameraStatusProps {
  diagnosticInfo: CameraDiagnosticInfo;
  mode: InputMode;
  isResting: boolean;
  isPaused: boolean;
  onToggleRest: () => void;
  onOpenSettings: () => void;
  onNavigateHome?: () => void;
  showBackHome?: boolean;
}

export const CameraStatus: React.FC<CameraStatusProps> = ({
  diagnosticInfo,
  mode,
  isResting,
  isPaused,
  onToggleRest,
  onOpenSettings,
  onNavigateHome,
  showBackHome = false,
}) => {
  const isHealthy = diagnosticInfo.faceDetected && !diagnosticInfo.trackingLost;

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
      }}
    >
      {/* Left: Brand + Optional Back Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {showBackHome && onNavigateHome && (
          <DwellButton
            id="nav-back-home"
            onClick={onNavigateHome}
            size="normal"
            variant="sage"
            ariaLabel="Return to Home screen"
            style={{ minHeight: '52px', padding: '10px 18px' }}
          >
            <ArrowLeft size={22} />
            <span>Home</span>
          </DwellButton>
        )}

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
          gap: '12px',
          padding: '6px 14px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: isHealthy ? 'var(--surface-sage)' : 'var(--surface-sand)',
          border: '1px solid var(--border)',
          fontSize: '0.95rem',
          fontWeight: 600,
        }}
        aria-live="polite"
      >
        <span
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: isHealthy ? '#42685A' : '#A75B51',
            display: 'inline-block',
          }}
        />
        <span>
          {isHealthy
            ? `Tracking Stable (${diagnosticInfo.actualFps || 30} FPS)`
            : diagnosticInfo.faceDetected
            ? 'Adjust Lighting / Face Screen'
            : 'Looking for Face...'}
        </span>
      </div>

      {/* Right: Rest / Pause + Settings controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <DwellButton
          id="btn-toggle-rest"
          onClick={onToggleRest}
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
