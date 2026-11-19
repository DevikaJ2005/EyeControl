/**
 * DiagnosticPanel
 * Clinician / Developer technical diagnostics overlay.
 * Hidden behind a discrete button so standard AAC communication is uncluttered.
 */

import React, { useState } from 'react';
import { CameraDiagnosticInfo, GazePrediction, CalibrationResult } from '../types/tracking';
import { Activity, ChevronDown, ChevronUp } from 'lucide-react';

interface DiagnosticPanelProps {
  diagnosticInfo: CameraDiagnosticInfo;
  prediction: GazePrediction | null;
  calibrationResult: CalibrationResult | null;
  mode: 'eye' | 'head';
}

export const DiagnosticPanel: React.FC<DiagnosticPanelProps> = ({
  diagnosticInfo,
  prediction,
  calibrationResult,
  mode,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '12px',
        left: '12px',
        zIndex: 500,
        fontFamily: 'monospace',
        fontSize: '12px',
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          backgroundColor: 'rgba(40, 56, 49, 0.85)',
          color: '#F7F6F0',
          borderRadius: 'var(--radius-sm)',
          fontSize: '11px',
          letterSpacing: '0.5px',
        }}
        aria-expanded={isOpen}
      >
        <Activity size={14} />
        <span>DIAGNOSTICS</span>
        {isOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>

      {isOpen && (
        <div
          style={{
            marginTop: '8px',
            padding: '14px',
            backgroundColor: 'rgba(30, 42, 37, 0.95)',
            color: '#E0E7E3',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-active)',
            border: '1px solid rgba(255,255,255,0.1)',
            width: '320px',
            lineHeight: 1.6,
          }}
        >
          <div style={{ fontWeight: 'bold', color: '#97CAB5', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '4px', marginBottom: '8px' }}>
            TRACKING TELEMETRY ({mode.toUpperCase()})
          </div>

          <div><strong>Camera:</strong> {diagnosticInfo.width}×{diagnosticInfo.height} @ {diagnosticInfo.actualFps} FPS</div>
          <div><strong>Face Detected:</strong> {diagnosticInfo.faceDetected ? 'YES' : 'NO'}</div>
          <div><strong>Lighting:</strong> {diagnosticInfo.lightingQuality.toUpperCase()}</div>
          
          {prediction && (
            <>
              <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                <strong>Cursor Screen:</strong> ({Math.round(prediction.filteredX)}, {Math.round(prediction.filteredY)})
              </div>
              <div>
                <strong>Confidence:</strong> {(prediction.confidence.confidence * 100).toFixed(0)}% ({prediction.confidence.isReliable ? 'RELIABLE' : 'UNRELIABLE'})
              </div>
              {prediction.confidence.reason && (
                <div style={{ color: '#E89D93' }}>
                  <strong>Notice:</strong> {prediction.confidence.reason}
                </div>
              )}
            </>
          )}

          {calibrationResult && (
            <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
              <div><strong>Gaze Model Fit:</strong> R²X: {calibrationResult.r2X.toFixed(2)}, R²Y: {calibrationResult.r2Y.toFixed(2)}</div>
              <div><strong>Held-Out Accuracy:</strong> {calibrationResult.overallAccuracyPercentage}%</div>
              <div><strong>Mean Val Error:</strong> {calibrationResult.meanValidationPixelError} px</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
