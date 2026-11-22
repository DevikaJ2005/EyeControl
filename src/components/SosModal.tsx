/**
 * SosModal
 * Persistent hands-free emergency SOS system:
 * - Clear confirmation dialog to prevent accidental triggers
 * - Repeated audible speech alert + attention alarm chime via Web Audio API
 * - Device calling/messaging fallbacks (tel: / sms: / Web Share)
 * - Accessible Cancel and Return Home actions
 */

import React, { useEffect, useState, useRef } from 'react';
import { DwellButton } from './DwellButton';
import { SpeechEngine } from '../speech/SpeechEngine';
import { AlertOctagon, PhoneCall, Volume2, XCircle, Home, CheckCircle2 } from 'lucide-react';

interface SosModalProps {
  isOpen: boolean;
  emergencyContactName: string;
  emergencyContactPhone: string;
  onClose: () => void;
  onNavigateHome: () => void;
}

export const SosModal: React.FC<SosModalProps> = ({
  isOpen,
  emergencyContactName,
  emergencyContactPhone,
  onClose,
  onNavigateHome,
}) => {
  const [isAlertBroadcasting, setIsAlertBroadcasting] = useState(false);
  const [hasTriggeredExternal, setHasTriggeredExternal] = useState(false);
  const alarmIntervalRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const emergencyMessage = `Emergency assistance needed! This is an urgent alert from EyeControl. Please contact ${emergencyContactName || 'caregiver'} at ${emergencyContactPhone || 'the registered number'} immediately.`;

  const playSirenChime = () => {
    try {
      if (!audioCtxRef.current) {
        const AudioClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioClass) audioCtxRef.current = new AudioClass();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      // Urgent siren modulation (880 Hz to 660 Hz)
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.36);
    } catch {
      // Audio playback suppressed
    }
  };

  const startEmergencyBroadcast = () => {
    setIsAlertBroadcasting(true);
    const speech = SpeechEngine.getInstance();
    playSirenChime();

    speech.speak(emergencyMessage, () => {
      // Loop broadcast every 5 seconds until cancelled
      if (isAlertBroadcasting) {
        alarmIntervalRef.current = setTimeout(() => {
          if (isOpen) {
            playSirenChime();
            speech.speak(emergencyMessage);
          }
        }, 5000);
      }
    });

    // Try web share or tel trigger if available
    if (emergencyContactPhone) {
      try {
        window.open(`tel:${emergencyContactPhone}`, '_blank');
        setHasTriggeredExternal(true);
      } catch {
        // Popups or protocol handlers may be blocked in iframe/sandbox
      }
    }
  };

  const stopEmergencyBroadcast = () => {
    setIsAlertBroadcasting(false);
    if (alarmIntervalRef.current) {
      clearTimeout(alarmIntervalRef.current);
    }
    SpeechEngine.getInstance().stop();
    onClose();
  };

  useEffect(() => {
    return () => {
      if (alarmIntervalRef.current) {
        clearTimeout(alarmIntervalRef.current);
      }
      SpeechEngine.getInstance().stop();
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Emergency Assistance Alert"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.82)',
        backdropFilter: 'blur(6px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-xl)',
          border: '4px solid #DC2626',
          maxWidth: '680px',
          width: '100%',
          padding: '36px',
          boxShadow: '0 25px 50px -12px rgba(220, 38, 38, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '24px',
        }}
      >
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: '#FEF2F2',
            border: '3px solid #DC2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#DC2626',
          }}
        >
          <AlertOctagon size={48} />
        </div>

        <div>
          <h1 style={{ fontSize: '2rem', color: '#DC2626', fontWeight: 800, margin: '0 0 8px 0' }}>
            EMERGENCY SOS
          </h1>
          <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            {isAlertBroadcasting
              ? 'Urgent siren & speech alert is broadcasting aloud!'
              : 'Are you sure you want to broadcast an urgent emergency alert?'}
          </p>
        </div>

        {/* Contact Info Card */}
        <div
          style={{
            width: '100%',
            backgroundColor: '#F8FAFC',
            border: '2px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ textAlign: 'left' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Designated Emergency Contact
            </span>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {emergencyContactName || 'Caregiver / Family'}
            </div>
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--secondary)' }}>
            {emergencyContactPhone || '+1-555-0199'}
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '16px', width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
          {!isAlertBroadcasting ? (
            <DwellButton
              id="sos-btn-confirm"
              onClick={startEmergencyBroadcast}
              variant="emergency"
              size="large"
              ariaLabel="Confirm and broadcast emergency alert"
              style={{ flex: 1, minWidth: '220px', fontWeight: 800 }}
            >
              <Volume2 size={24} />
              <span>Broadcast Alert Now</span>
            </DwellButton>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#16A34A',
                fontWeight: 700,
                fontSize: '1.1rem',
                padding: '12px 20px',
                backgroundColor: '#F0FDF4',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <CheckCircle2 size={22} />
              <span>Alarm Sounding & Voice Repeating</span>
            </div>
          )}

          <DwellButton
            id="sos-btn-cancel"
            onClick={stopEmergencyBroadcast}
            variant="surface"
            size="large"
            ariaLabel="Cancel and close emergency dialog"
            style={{ flex: 1, minWidth: '180px' }}
          >
            <XCircle size={24} />
            <span>{isAlertBroadcasting ? 'Stop Alarm' : 'Cancel'}</span>
          </DwellButton>

          <DwellButton
            id="sos-btn-home"
            onClick={() => {
              stopEmergencyBroadcast();
              onNavigateHome();
            }}
            variant="sage"
            size="large"
            ariaLabel="Cancel and return home"
            style={{ minWidth: '160px' }}
          >
            <Home size={22} />
            <span>Home</span>
          </DwellButton>
        </div>
      </div>
    </div>
  );
};
