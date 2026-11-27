/**
 * SettingsDrawer
 * Accessible side overlay drawer for user preferences:
 * input mode, recalibration, dwell duration, text scaling, speech voices, emergency contact,
 * and calibration management.
 */

import React, { useEffect, useState } from 'react';
import { UserAccessibilitySettings, InputMode } from '../types/tracking';
import { DwellButton } from './DwellButton';
import { SpeechEngine } from '../speech/SpeechEngine';
import { CalibrationStorage } from '../storage/CalibrationStorage';
import { ExtensionBridge } from '../services/ExtensionBridge';
import { X, Volume2, Eye, Compass, RefreshCw, Trash2, Check, Chrome, Link } from 'lucide-react';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserAccessibilitySettings;
  onUpdateSettings: (updates: Partial<UserAccessibilitySettings>) => void;
  onNavigateRecalibrate: () => void;
  onCalibrationsDeleted: () => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onNavigateRecalibrate,
  onCalibrationsDeleted,
}) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const speech = SpeechEngine.getInstance();
      setVoices(speech.getAvailableVoices());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(40, 56, 49, 0.45)',
        backdropFilter: 'blur(2px)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-drawer-title"
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          height: '100%',
          backgroundColor: 'var(--surface)',
          boxShadow: 'var(--shadow-active)',
          borderLeft: '2px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          padding: '24px 28px',
          gap: '24px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 id="settings-drawer-title" style={{ fontSize: 'var(--font-size-lg)', color: 'var(--text-primary)' }}>
            Settings
          </h2>
          <DwellButton
            id="btn-close-settings"
            onClick={onClose}
            variant="ghost"
            ariaLabel="Close settings"
            style={{ minHeight: '48px', padding: '10px' }}
          >
            <X size={24} />
          </DwellButton>
        </div>

        {/* 1. Control Method */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: 'var(--font-size-md)', color: 'var(--text-secondary)' }}>
            Input Method
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <DwellButton
              id="setting-mode-eye"
              onClick={() => onUpdateSettings({ inputMode: 'eye' })}
              variant={settings.inputMode === 'eye' ? 'primary' : 'surface'}
              ariaLabel="Select Eye Gaze input method"
            >
              <Eye size={20} />
              <span>Eye Gaze</span>
            </DwellButton>

            <DwellButton
              id="setting-mode-head"
              onClick={() => onUpdateSettings({ inputMode: 'head' })}
              variant={settings.inputMode === 'head' ? 'primary' : 'surface'}
              ariaLabel="Select Head Movement input method"
            >
              <Compass size={20} />
              <span>Head Movement</span>
            </DwellButton>
          </div>

          {/* Gaze Direction Alignment */}
          <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <DwellButton
              id="setting-toggle-invert-x"
              onClick={() => onUpdateSettings({ invertGazeX: !settings.invertGazeX })}
              variant={settings.invertGazeX ? 'primary' : 'surface'}
              ariaLabel="Invert Horizontal Tracking Direction"
              style={{ width: '100%', minHeight: '44px', fontSize: '0.9rem' }}
            >
              <span>{settings.invertGazeX ? '⇄ Horizontal Inverted' : '⇄ Horizontal Normal'}</span>
            </DwellButton>
            <DwellButton
              id="setting-toggle-invert-y"
              onClick={() => onUpdateSettings({ invertGazeY: !settings.invertGazeY })}
              variant={settings.invertGazeY ? 'primary' : 'surface'}
              ariaLabel="Invert Vertical Tracking Direction"
              style={{ width: '100%', minHeight: '44px', fontSize: '0.9rem' }}
            >
              <span>{settings.invertGazeY ? '↕ Vertical Inverted' : '↕ Vertical Normal'}</span>
            </DwellButton>
          </div>
        </section>

        {/* 2. Recalibration */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: 'var(--font-size-md)', color: 'var(--text-secondary)' }}>
            Calibration
          </h3>
          <DwellButton
            id="setting-btn-recalibrate"
            onClick={() => {
              onClose();
              onNavigateRecalibrate();
            }}
            variant="sage"
            size="large"
            ariaLabel="Start Recalibration"
          >
            <RefreshCw size={22} />
            <span>Recalibrate Tracking</span>
          </DwellButton>
        </section>

        {/* 3. Dwell Duration */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: 'var(--font-size-md)', color: 'var(--text-secondary)' }}>
            Dwell Time (Hold gaze to click)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {[1000, 1500, 2000, 2500].map((ms) => (
              <DwellButton
                key={ms}
                id={`setting-dwell-${ms}`}
                onClick={() => onUpdateSettings({ dwellDurationMs: ms })}
                variant={settings.dwellDurationMs === ms ? 'primary' : 'surface'}
                ariaLabel={`Set dwell time to ${(ms / 1000).toFixed(1)} seconds`}
                style={{ padding: '12px 6px', fontSize: '1rem' }}
              >
                {(ms / 1000).toFixed(1)}s
              </DwellButton>
            ))}
          </div>
        </section>

        {/* 4. Display Size */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: 'var(--font-size-md)', color: 'var(--text-secondary)' }}>
            Display & Text Size
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {[
              { id: 'normal', label: 'Normal' },
              { id: 'large', label: 'Large' },
              { id: 'extra-large', label: 'Extra Large' },
            ].map((size) => (
              <DwellButton
                key={size.id}
                id={`setting-text-${size.id}`}
                onClick={() => onUpdateSettings({ textSize: size.id as any })}
                variant={settings.textSize === size.id ? 'primary' : 'surface'}
                ariaLabel={`Set text size to ${size.label}`}
                style={{ padding: '12px 6px', fontSize: '1rem' }}
              >
                {size.label}
              </DwellButton>
            ))}
          </div>
        </section>

        {/* 5. Speech Synthesis Settings */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: 'var(--font-size-md)', color: 'var(--text-secondary)' }}>
            Speech Voice
          </h3>
          {voices.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
              {voices.slice(0, 6).map((voice) => (
                <DwellButton
                  key={voice.voiceURI}
                  id={`setting-voice-${voice.name.replace(/\s+/g, '-').toLowerCase()}`}
                  onClick={() => {
                    onUpdateSettings({ speechVoiceURI: voice.voiceURI });
                    SpeechEngine.getInstance().updateSettings({ voiceURI: voice.voiceURI });
                    SpeechEngine.getInstance().speak('Voice selected');
                  }}
                  variant={settings.speechVoiceURI === voice.voiceURI ? 'primary' : 'surface'}
                  ariaLabel={`Select voice ${voice.name}`}
                  style={{ justifyContent: 'flex-start', textAlign: 'left', minHeight: '52px' }}
                >
                  <Volume2 size={18} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {voice.name}
                  </span>
                </DwellButton>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Default system voice active.
            </p>
          )}
        </section>

        {/* 6. Emergency Contact */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h3 style={{ fontSize: 'var(--font-size-md)', color: 'var(--text-secondary)' }}>
            Emergency Contact Phone
          </h3>
          <input
            type="tel"
            value={settings.emergencyContactPhone}
            onChange={(e) => onUpdateSettings({ emergencyContactPhone: e.target.value })}
            style={{
              padding: '14px',
              fontSize: 'var(--font-size-base)',
              borderRadius: 'var(--radius-sm)',
              border: '2px solid var(--border)',
              backgroundColor: 'var(--background)',
              color: 'var(--text-primary)',
            }}
            placeholder="+1 555-0199"
          />
        </section>

        {/* 7. Chrome Extension Real Web Controller */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#F8FAFC', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Chrome size={20} color="#0088FF" />
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Chrome Extension Link
            </h3>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
            Control real YouTube & India Today tabs. Paste your unpacked extension ID from <code>chrome://extensions</code>:
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              id="input-extension-id"
              type="text"
              defaultValue={ExtensionBridge.getInstance().getExtensionId() || ''}
              onChange={(e) => ExtensionBridge.getInstance().setExtensionId(e.target.value.trim())}
              placeholder="e.g. jfnbgclplh..."
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                fontSize: '0.85rem',
              }}
            />
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('input-extension-id') as HTMLInputElement;
                if (el) ExtensionBridge.getInstance().setExtensionId(el.value.trim());
              }}
              style={{
                padding: '8px 14px',
                backgroundColor: '#0088FF',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Connect
            </button>
          </div>
          <div style={{ fontSize: '0.78rem', color: ExtensionBridge.getInstance().getIsConnected() ? '#16A34A' : '#64748B', fontWeight: 600 }}>
            {ExtensionBridge.getInstance().getIsConnected() ? '✓ Connected to Chrome Extension' : 'Status: Ready to bridge'}
          </div>
        </section>

        {/* 7. Delete Saved Calibration */}
        <section style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
          {!showDeleteConfirm ? (
            <DwellButton
              id="setting-btn-delete-calib"
              onClick={() => setShowDeleteConfirm(true)}
              variant="emergency"
              ariaLabel="Delete saved calibration data"
            >
              <Trash2 size={20} />
              <span>Delete Saved Calibration</span>
            </DwellButton>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ color: 'var(--emergency)', fontWeight: 600 }}>
                Are you sure? Tracking will need to be calibrated again.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <DwellButton
                  id="setting-btn-confirm-delete"
                  onClick={async () => {
                    await CalibrationStorage.deleteCalibrations();
                    setShowDeleteConfirm(false);
                    onCalibrationsDeleted();
                  }}
                  variant="emergency"
                >
                  Confirm Delete
                </DwellButton>
                <DwellButton
                  id="setting-btn-cancel-delete"
                  onClick={() => setShowDeleteConfirm(false)}
                  variant="surface"
                >
                  Cancel
                </DwellButton>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
