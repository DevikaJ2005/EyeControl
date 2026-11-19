/**
 * CameraPreviewOverlay
 * Interactive live camera preview with real-time face bounding box, eye regions,
 * iris landmarks, face-center crosshairs, mirror toggle, collapsible modes,
 * and high-contrast fixation warning.
 */

import React, { useEffect, useRef, useState } from 'react';
import { CameraDiagnosticInfo, Point2D, AdaptiveEyeTrackingState } from '../types/tracking';
import { EyeDiagnosticData } from '../vision/EyeFeatureExtractor';
import { AdaptiveEyeRegionTracker } from '../vision/AdaptiveEyeRegionTracker';
import { CoordinateManager } from '../calibration/CoordinateManager';
import { Camera, Eye, FlipHorizontal, EyeOff, ChevronDown, ChevronUp, AlertCircle, Maximize2 } from 'lucide-react';

interface CameraPreviewOverlayProps {
  videoElement: HTMLVideoElement | null;
  diagnosticInfo: CameraDiagnosticInfo;
  overlayData: EyeDiagnosticData | null;
  adaptiveState?: AdaptiveEyeTrackingState | null;
  mode?: 'full' | 'thumbnail' | 'calibration';
  showFixationWarning?: boolean;
}

export const CameraPreviewOverlay: React.FC<CameraPreviewOverlayProps> = ({
  videoElement,
  diagnosticInfo,
  overlayData,
  adaptiveState,
  mode = 'thumbnail',
  showFixationWarning = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const leftEyeCanvasRef = useRef<HTMLCanvasElement>(null);
  const rightEyeCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isMirrored, setIsMirrored] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(mode === 'calibration');
  const [showEyeCrops, setShowEyeCrops] = useState(mode === 'full');

  // Sync mode changes
  useEffect(() => {
    if (mode === 'calibration') {
      setIsCollapsed(true);
    }
  }, [mode]);

  // Render video feed + overlay decorations onto canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !videoElement || videoElement.videoWidth === 0 || isCollapsed) return;

    let animId: number;

    const render = () => {
      if (!canvas || !videoElement || videoElement.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        animId = requestAnimationFrame(render);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;

      ctx.save();
      ctx.clearRect(0, 0, w, h);

      // Handle mirror preview
      if (isMirrored) {
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
      }

      // 1. Draw raw video frame
      ctx.drawImage(videoElement, 0, 0, w, h);

      // 2. Draw annotations if face is detected
      if (overlayData && diagnosticInfo.faceDetected) {
        // Face bounding box
        const fb = overlayData.faceBox;
        ctx.strokeStyle = '#42685A';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(fb.x * w, fb.y * h, fb.width * w, fb.height * h);

        // Face center crosshair
        const fc = overlayData.faceCenter;
        const cx = fc.x * w;
        const cy = fc.y * h;
        ctx.strokeStyle = '#DCE7DE';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - 10, cy);
        ctx.lineTo(cx + 10, cy);
        ctx.moveTo(cx, cy - 10);
        ctx.lineTo(cx, cy + 10);
        ctx.stroke();

        // Eye bounding boxes
        ctx.strokeStyle = '#6FA88B';
        ctx.lineWidth = 1.5;
        const leb = overlayData.leftEyeBox;
        const reb = overlayData.rightEyeBox;
        ctx.strokeRect(leb.x * w, leb.y * h, leb.width * w, leb.height * h);
        ctx.strokeRect(reb.x * w, reb.y * h, reb.width * w, reb.height * h);

        // Iris markers
        ctx.fillStyle = '#42685A';
        ctx.beginPath();
        ctx.arc(overlayData.leftIris.x * w, overlayData.leftIris.y * h, 3.5, 0, 2 * Math.PI);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(overlayData.rightIris.x * w, overlayData.rightIris.y * h, 3.5, 0, 2 * Math.PI);
        ctx.fill();
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [videoElement, overlayData, diagnosticInfo.faceDetected, isMirrored, isCollapsed]);

  // Render enlarged eye crops when enabled
  useEffect(() => {
    if (isCollapsed || !showEyeCrops || !videoElement || !adaptiveState) return;

    let animId: number;
    const renderCrops = () => {
      if (
        leftEyeCanvasRef.current &&
        rightEyeCanvasRef.current &&
        videoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
      ) {
        AdaptiveEyeRegionTracker.renderEyeCropToCanvas(
          leftEyeCanvasRef.current,
          videoElement,
          adaptiveState.leftEyeROI,
          true,
          isMirrored
        );
        AdaptiveEyeRegionTracker.renderEyeCropToCanvas(
          rightEyeCanvasRef.current,
          videoElement,
          adaptiveState.rightEyeROI,
          false,
          isMirrored
        );
      }
      animId = requestAnimationFrame(renderCrops);
    };

    animId = requestAnimationFrame(renderCrops);
    return () => cancelAnimationFrame(animId);
  }, [videoElement, adaptiveState, isMirrored, isCollapsed, showEyeCrops]);

  const canvasWidth = mode === 'full' ? 440 : 220;
  const canvasHeight = mode === 'full' ? 330 : 165;

  return (
    <div
      style={{
        position: mode === 'calibration' ? 'fixed' : 'relative',
        bottom: mode === 'calibration' ? '20px' : undefined,
        right: mode === 'calibration' ? '20px' : undefined,
        zIndex: mode === 'calibration' ? 10000 : 10,
        backgroundColor: 'var(--surface)',
        borderRadius: 'var(--radius-md)',
        border: '2px solid var(--border)',
        boxShadow: 'var(--shadow-active)',
        overflow: 'hidden',
        maxWidth: `${canvasWidth + 20}px`,
        transition: 'all 200ms ease-out',
      }}
      aria-label="Camera positioning preview"
    >
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          backgroundColor: 'var(--surface-sage)',
          borderBottom: '1px solid var(--border)',
          fontSize: '0.85rem',
          fontWeight: 700,
          color: 'var(--primary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Camera size={16} />
          <span>Camera {diagnosticInfo.actualFps > 0 ? `(${diagnosticInfo.actualFps} FPS)` : ''}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setIsMirrored(!isMirrored)}
            title="Toggle mirror view"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: isMirrored ? 'var(--primary)' : 'var(--text-secondary)',
              padding: '2px',
              display: 'flex',
            }}
          >
            <FlipHorizontal size={16} />
          </button>

          {adaptiveState && (
            <button
              type="button"
              onClick={() => setShowEyeCrops(!showEyeCrops)}
              title={showEyeCrops ? 'Hide enlarged eye crops' : 'Show enlarged eye crops'}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: showEyeCrops ? 'var(--primary)' : 'var(--text-secondary)',
                padding: '2px',
                display: 'flex',
              }}
            >
              <Maximize2 size={16} />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand camera preview' : 'Collapse camera preview'}
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
        <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Canvas Video Viewport */}
          <div
            style={{
              position: 'relative',
              width: `${canvasWidth}px`,
              height: `${canvasHeight}px`,
              backgroundColor: '#1E2A25',
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
            }}
          >
            <canvas
              ref={canvasRef}
              width={canvasWidth}
              height={canvasHeight}
              style={{ width: '100%', height: '100%', display: 'block' }}
            />

            {/* Status overlay badge */}
            <div
              style={{
                position: 'absolute',
                top: '6px',
                left: '6px',
                padding: '3px 8px',
                borderRadius: '4px',
                backgroundColor: 'rgba(30, 42, 37, 0.85)',
                color: diagnosticInfo.faceDetected ? '#A3D9C0' : '#E89D93',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              {diagnosticInfo.faceDetected ? '✓ Face tracked' : 'No face detected'}
            </div>
          </div>

          {/* Fixation Warning during calibration */}
          {showFixationWarning && (
            <div
              style={{
                padding: '6px 10px',
                backgroundColor: 'var(--surface-sage)',
                borderRadius: '4px',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <AlertCircle size={14} />
              <span>Look at the target on screen, not at camera!</span>
            </div>
          )}

          {/* Enlarged Eye Crops (Adaptive Dual-View) */}
          {showEyeCrops && adaptiveState && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '2px' }}>
              <div style={{ backgroundColor: '#1E2A25', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ padding: '2px 4px', fontSize: '0.65rem', color: '#DCE7DE', fontWeight: 600 }}>
                  L-Eye ({Math.round((adaptiveState.leftEyeROI?.openness ?? 0) * 100)}%)
                </div>
                <canvas
                  ref={leftEyeCanvasRef}
                  width={canvasWidth / 2}
                  height={canvasHeight / 2}
                  style={{ width: '100%', height: '70px', display: 'block' }}
                />
              </div>

              <div style={{ backgroundColor: '#1E2A25', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ padding: '2px 4px', fontSize: '0.65rem', color: '#DCE7DE', fontWeight: 600 }}>
                  R-Eye ({Math.round((adaptiveState.rightEyeROI?.openness ?? 0) * 100)}%)
                </div>
                <canvas
                  ref={rightEyeCanvasRef}
                  width={canvasWidth / 2}
                  height={canvasHeight / 2}
                  style={{ width: '100%', height: '70px', display: 'block' }}
                />
              </div>
            </div>
          )}

          {/* Quick status bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              paddingTop: '2px',
            }}
          >
            <span>Eyes: {diagnosticInfo.eyeRegionsClear ? 'Clear' : 'Obscured'}</span>
            <span>Lighting: {diagnosticInfo.lightingQuality.toUpperCase()}</span>
          </div>
        </div>
      )}
    </div>
  );
};
