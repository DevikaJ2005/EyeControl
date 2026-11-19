/**
 * DualEyeRegionPreview
 * Real-time diagnostic viewer for Dual-View Adaptive Eye Tracking.
 * Displays enlarged, stabilized Left & Right eye crops with landmark indicators,
 * live openness metrics, adaptive zoom factor, and repositioning guidance.
 * Collapsible to prevent user distraction during calibration fixations.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  AdaptiveEyeTrackingState,
  CameraDiagnosticInfo,
  TrackingConfigMode,
} from '../types/tracking';
import { AdaptiveEyeRegionTracker } from '../vision/AdaptiveEyeRegionTracker';
import { Eye, ChevronDown, ChevronUp, AlertCircle, FlipHorizontal, Activity, Sliders } from 'lucide-react';

interface DualEyeRegionPreviewProps {
  videoElement: HTMLVideoElement | null;
  diagnosticInfo: CameraDiagnosticInfo;
  adaptiveState: AdaptiveEyeTrackingState;
  onToggleConfigMode?: (mode: TrackingConfigMode) => void;
  isCalibrationMode?: boolean;
}

export const DualEyeRegionPreview: React.FC<DualEyeRegionPreviewProps> = ({
  videoElement,
  diagnosticInfo,
  adaptiveState,
  onToggleConfigMode,
  isCalibrationMode = false,
}) => {
  const leftCanvasRef = useRef<HTMLCanvasElement>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement>(null);

  const [isMirrored, setIsMirrored] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(isCalibrationMode);
  const [showBenchmarkDetails, setShowBenchmarkDetails] = useState(false);

  // Sync calibration mode collapse state
  useEffect(() => {
    if (isCalibrationMode) {
      setIsCollapsed(true);
    }
  }, [isCalibrationMode]);

  // Render loop for both eye crops
  useEffect(() => {
    if (isCollapsed || !videoElement) return;

    let animId: number;

    const render = () => {
      if (
        leftCanvasRef.current &&
        rightCanvasRef.current &&
        videoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
      ) {
        AdaptiveEyeRegionTracker.renderEyeCropToCanvas(
          leftCanvasRef.current,
          videoElement,
          adaptiveState.leftEyeROI,
          true,
          isMirrored
        );

        AdaptiveEyeRegionTracker.renderEyeCropToCanvas(
          rightCanvasRef.current,
          videoElement,
          adaptiveState.rightEyeROI,
          false,
          isMirrored
        );
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [videoElement, adaptiveState, isMirrored, isCollapsed]);

  const leftOpenPercent = Math.round((adaptiveState.leftEyeROI?.openness ?? 0) * 100);
  const rightOpenPercent = Math.round((adaptiveState.rightEyeROI?.openness ?? 0) * 100);

  return (
    <div
      style={{
        backgroundColor: 'var(--surface)',
        borderRadius: 'var(--radius-md)',
        border: '2px solid var(--border)',
        boxShadow: 'var(--shadow-subtle)',
        overflow: 'hidden',
        fontSize: '0.85rem',
      }}
      aria-label="Dual-view adaptive eye tracking preview"
    >
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          backgroundColor: 'var(--surface-sage)',
          borderBottom: '1px solid var(--border)',
          fontWeight: 700,
          color: 'var(--primary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Eye size={16} />
          <span>Adaptive Dual-View Eye Tracking</span>
          {adaptiveState.telemetry.actualFps > 0 && (
            <span
              style={{
                fontSize: '0.75rem',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: 'rgba(66, 104, 90, 0.15)',
              }}
            >
              {adaptiveState.telemetry.actualFps} FPS
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setIsMirrored(!isMirrored)}
            title="Mirror preview"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: isMirrored ? 'var(--primary)' : 'var(--text-secondary)',
              padding: '2px',
              display: 'flex',
            }}
          >
            <FlipHorizontal size={15} />
          </button>

          <button
            type="button"
            onClick={() => setShowBenchmarkDetails(!showBenchmarkDetails)}
            title="Toggle telemetry metrics"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: showBenchmarkDetails ? 'var(--primary)' : 'var(--text-secondary)',
              padding: '2px',
              display: 'flex',
            }}
          >
            <Activity size={15} />
          </button>

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand eye zoom preview' : 'Collapse eye zoom preview'}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--primary)',
              padding: '2px',
              display: 'flex',
            }}
          >
            {isCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Fixation Warning */}
          {isCalibrationMode && (
            <div
              style={{
                padding: '6px 10px',
                backgroundColor: '#FFF7ED',
                border: '1px solid #FFEDD5',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#9A3412',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <AlertCircle size={14} />
              <span>Look at the target on your screen, not at your eye preview.</span>
            </div>
          )}

          {/* Dual Eye Crops View */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {/* Left Eye Box */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                backgroundColor: '#1E2A25',
                padding: '6px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  color: '#DCE7DE',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                <span>Left Eye</span>
                <span
                  style={{
                    color: adaptiveState.leftEyeROI?.isReliable ? '#A3D9C0' : '#E89D93',
                  }}
                >
                  {adaptiveState.leftEyeROI?.isReliable ? `Open (${leftOpenPercent}%)` : 'Closed / Lost'}
                </span>
              </div>

              <div
                style={{
                  width: '100%',
                  height: '110px',
                  borderRadius: '3px',
                  overflow: 'hidden',
                  backgroundColor: '#141E1A',
                }}
              >
                <canvas
                  ref={leftCanvasRef}
                  width={180}
                  height={110}
                  style={{ width: '100%', height: '100%', display: 'block' }}
                />
              </div>
            </div>

            {/* Right Eye Box */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                backgroundColor: '#1E2A25',
                padding: '6px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  color: '#DCE7DE',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                <span>Right Eye</span>
                <span
                  style={{
                    color: adaptiveState.rightEyeROI?.isReliable ? '#A3D9C0' : '#E89D93',
                  }}
                >
                  {adaptiveState.rightEyeROI?.isReliable ? `Open (${rightOpenPercent}%)` : 'Closed / Lost'}
                </span>
              </div>

              <div
                style={{
                  width: '100%',
                  height: '110px',
                  borderRadius: '3px',
                  overflow: 'hidden',
                  backgroundColor: '#141E1A',
                }}
              >
                <canvas
                  ref={rightCanvasRef}
                  width={180}
                  height={110}
                  style={{ width: '100%', height: '100%', display: 'block' }}
                />
              </div>
            </div>
          </div>

          {/* Repositioning Guidance / Status Banner */}
          <div
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: adaptiveState.isStabilized ? 'var(--surface-sage)' : '#FEF3C7',
              border: `1px solid ${adaptiveState.isStabilized ? 'var(--border)' : '#FDE68A'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.8rem',
            }}
          >
            <span style={{ fontWeight: 600, color: adaptiveState.isStabilized ? 'var(--primary)' : '#92400E' }}>
              {adaptiveState.repositionInstruction || 'Ready'}
            </span>

            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Zoom: {adaptiveState.adaptiveZoomFactor.toFixed(1)}x {adaptiveState.adaptiveZoomFactor > 1.1 ? '(Distance Boost)' : '(Standard)'}
            </span>
          </div>

          {/* Benchmark / Telemetry Breakdown (Toggleable) */}
          {showBenchmarkDetails && (
            <div
              style={{
                backgroundColor: 'var(--background)',
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '6px',
                fontSize: '0.75rem',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Face Latency</span>
                <div style={{ fontWeight: 700 }}>{adaptiveState.telemetry.faceDetectionMs} ms</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>ROI Latency</span>
                <div style={{ fontWeight: 700 }}>{adaptiveState.telemetry.roiExtractionMs} ms</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Total Inference</span>
                <div style={{ fontWeight: 700 }}>{adaptiveState.telemetry.totalInferenceMs} ms</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Tracking Losses</span>
                <div style={{ fontWeight: 700 }}>{adaptiveState.telemetry.trackingLossCount}</div>
              </div>
            </div>
          )}

          {/* Configuration Mode Switcher */}
          {onToggleConfigMode && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '4px',
                borderTop: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                <Sliders size={13} />
                <span>Configuration:</span>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => onToggleConfigMode('standard')}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                    backgroundColor: adaptiveState.configMode === 'standard' ? 'var(--primary)' : 'var(--surface)',
                    color: adaptiveState.configMode === 'standard' ? '#FFFFFF' : 'var(--text-primary)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Config A (Standard)
                </button>

                <button
                  type="button"
                  onClick={() => onToggleConfigMode('adaptive_dual_view')}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                    backgroundColor: adaptiveState.configMode === 'adaptive_dual_view' ? 'var(--primary)' : 'var(--surface)',
                    color: adaptiveState.configMode === 'adaptive_dual_view' ? '#FFFFFF' : 'var(--text-primary)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Config B (Dual-View Adaptive)
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};