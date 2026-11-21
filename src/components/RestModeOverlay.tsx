/**
 * RestModeOverlay
 * Full-screen restful interface when Rest Mode is active.
 * Prevents eye strain / involuntary activations while preserving hands-free wake-up:
 * The large center "Wake Up & Resume Control" DwellButton remains dwellable
 * so the user is never trapped or dependent on a caregiver mouse click!
 */

import React, { useEffect } from 'react';
import { DwellButton } from './DwellButton';
import { Moon, Play, Sparkles } from 'lucide-react';

interface RestModeOverlayProps {
  isOpen: boolean;
  onResume: () => void;
}

export const RestModeOverlay: React.FC<RestModeOverlayProps> = ({
  isOpen,
  onResume,
}) => {
  // Allow Spacebar or Escape key as secondary caregiver shortcut
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === 'Escape') {
        e.preventDefault();
        onResume();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onResume]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Rest Mode Active"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(20, 32, 28, 0.94)',
        backdropFilter: 'blur(8px)',
        zIndex: 9990,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#F4F7F5',
        padding: '32px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          color: '#E0E7E3',
        }}
      >
        <Moon size={42} />
      </div>

      <h1
        style={{
          fontSize: '2.4rem',
          fontWeight: 700,
          margin: '0 0 12px 0',
          color: '#FFFFFF',
          letterSpacing: '-0.5px',
        }}
      >
        Rest Mode Active
      </h1>

      <p
        style={{
          fontSize: '1.25rem',
          maxWidth: '560px',
          lineHeight: 1.6,
          color: '#B5C4BC',
          margin: '0 0 40px 0',
        }}
      >
        Tracking is resting. Take a break to relieve eye fatigue.
        When you are ready, look at the button below or press Space.
      </p>

      {/* Primary Hands-Free Dwell Wake Button */}
      <DwellButton
        id="btn-wake-up"
        onClick={onResume}
        allowInRestMode={true}
        variant="primary"
        size="large"
        ariaLabel="Wake up and resume tracking"
        style={{
          minHeight: '84px',
          minWidth: '320px',
          fontSize: '1.35rem',
          boxShadow: '0 8px 32px rgba(66, 104, 90, 0.6)',
          border: '3px solid #8CE4B2',
        }}
      >
        <Play size={28} fill="currentColor" />
        <span>Wake Up & Resume Control</span>
      </DwellButton>

      <div
        style={{
          marginTop: '36px',
          fontSize: '0.95rem',
          color: '#8A9E93',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Sparkles size={16} />
        <span>Caregiver tip: Press Space or click anywhere to resume instantly</span>
      </div>
    </div>
  );
};
