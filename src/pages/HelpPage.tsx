/**
 * HelpPage (/help)
 * Page 6: Help & Emergency Assistance.
 * Immediate speech broadcast alert, phone call initiation with deliberate 2-step confirmation,
 * caregiver contact display, and return control.
 */

import React, { useState } from 'react';
import { DwellButton } from '../components/DwellButton';
import { SpeechEngine } from '../speech/SpeechEngine';
import { AlertOctagon, PhoneCall, Volume2, ArrowLeft, Check, ShieldAlert } from 'lucide-react';

interface HelpPageProps {
  emergencyContactName: string;
  emergencyContactPhone: string;
  onNavigateHome: () => void;
}

export const HelpPage: React.FC<HelpPageProps> = ({
  emergencyContactName,
  emergencyContactPhone,
  onNavigateHome,
}) => {
  const [isConfirmingCall, setIsConfirmingCall] = useState(false);
  const [callInitiated, setCallInitiated] = useState(false);
  const speechEngine = SpeechEngine.getInstance();

  const handleSpeakEmergency = () => {
    speechEngine.speak('I need urgent help! Please come here immediately.');
  };

  const handleInitiateCall = () => {
    setIsConfirmingCall(true);
  };

  const handleConfirmCall = () => {
    setCallInitiated(true);
    // Invoke device tel: handler (opens default phone/Skype dialer if available on device)
    window.location.href = `tel:${emergencyContactPhone}`;
    setTimeout(() => {
      setIsConfirmingCall(false);
      setCallInitiated(false);
    }, 4000);
  };

  return (
    <div
      style={{
        maxWidth: '960px',
        margin: '0 auto',
        padding: '36px 24px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
      }}
    >
      {/* Return to Home header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <DwellButton
          id="help-btn-return-home"
          onClick={onNavigateHome}
          variant="surface"
          size="normal"
          ariaLabel="Cancel and return to Home"
        >
          <ArrowLeft size={20} />
          <span>Return to Home</span>
        </DwellButton>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--emergency)', fontWeight: 700 }}>
          <ShieldAlert size={24} />
          <span>Assistance Center</span>
        </div>
      </div>

      {/* Emergency Header */}
      <div
        style={{
          backgroundColor: 'var(--emergency-surface)',
          border: '3px solid var(--emergency-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '28px 32px',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: '#E8C7C0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--emergency)',
            flexShrink: 0,
          }}
        >
          <AlertOctagon size={40} />
        </div>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-xl)', color: 'var(--emergency)', fontWeight: 700 }}>
            Emergency & Assistance
          </h1>
          <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--text-primary)', marginTop: '4px' }}>
            Primary Contact: <strong>{emergencyContactName}</strong> ({emergencyContactPhone})
          </p>
        </div>
      </div>

      {/* Two Large Action Targets */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Action 1: Speak Emergency Alert */}
        <DwellButton
          id="help-btn-speak-alert"
          onClick={handleSpeakEmergency}
          variant="emergency"
          size="card"
          style={{
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            minHeight: '220px',
            padding: '32px',
          }}
          ariaLabel="Speak emergency alert aloud"
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#E8C7C0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--emergency)',
            }}
          >
            <Volume2 size={30} />
          </div>

          <div>
            <h2 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--emergency)', fontWeight: 700 }}>
              Speak Emergency Alert
            </h2>
            <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 400 }}>
              Broadcasts "I need urgent help!" through the device speakers.
            </p>
          </div>
        </DwellButton>

        {/* Action 2: Call Primary Contact */}
        {!isConfirmingCall ? (
          <DwellButton
            id="help-btn-call-contact"
            onClick={handleInitiateCall}
            variant="surface"
            size="card"
            style={{
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              minHeight: '220px',
              padding: '32px',
            }}
            ariaLabel={`Call ${emergencyContactName}`}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--surface-sage)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
              }}
            >
              <PhoneCall size={30} />
            </div>

            <div>
              <h2 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--text-primary)', fontWeight: 700 }}>
                Call {emergencyContactName}
              </h2>
              <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 400 }}>
                Opens phone dialer for {emergencyContactPhone}.
              </p>
            </div>
          </DwellButton>
        ) : (
          /* Deliberate Confirmation Box to Prevent Accidental Dialing */
          <div
            style={{
              backgroundColor: 'var(--surface)',
              borderRadius: 'var(--radius-lg)',
              border: '3px solid var(--emergency)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '220px',
            }}
          >
            <div>
              <h2 style={{ fontSize: 'var(--font-size-md)', color: 'var(--emergency)', fontWeight: 700 }}>
                Confirm Calling {emergencyContactPhone}?
              </h2>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Select confirm to open your calling application.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <DwellButton
                id="help-btn-confirm-call"
                onClick={handleConfirmCall}
                variant="emergency"
                size="large"
                ariaLabel="Confirm call"
              >
                <Check size={20} />
                <span>Confirm Call</span>
              </DwellButton>

              <DwellButton
                id="help-btn-cancel-call"
                onClick={() => setIsConfirmingCall(false)}
                variant="surface"
                size="large"
                ariaLabel="Cancel call"
              >
                <span>Cancel</span>
              </DwellButton>
            </div>
          </div>
        )}
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
        Note: Device calling requires a compatible calling app or phone connectivity configured on this computer.
      </p>
    </div>
  );
};
