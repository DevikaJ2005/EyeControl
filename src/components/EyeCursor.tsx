/**
 * EyeCursor
 * Renders the calibrated gaze or head tracking pointer on the screen.
 * Displays:
 * - Magnetic target snapping coordinates
 * - Vibrant Blue Gaze Selection Ring (#0088FF) directly on cursor
 * - Confidence state indicators & blink rejection
 */

import React, { useEffect, useState } from 'react';
import { GazePrediction } from '../types/tracking';
import { SelectionManager } from '../interaction/SelectionManager';
import { DwellProgressUpdate } from '../interaction/DwellEngine';

interface EyeCursorProps {
  prediction: GazePrediction | null;
  mode: 'eye' | 'head';
  isResting: boolean;
  isPaused: boolean;
}

export const EyeCursor: React.FC<EyeCursorProps> = ({
  prediction,
  mode: _mode,
  isResting,
  isPaused,
}) => {
  const [dwellProgress, setDwellProgress] = useState(0);

  useEffect(() => {
    const dwellEngine = SelectionManager.getInstance().getDwellEngine();
    const unsub = dwellEngine.subscribe((update: DwellProgressUpdate) => {
      setDwellProgress(update.progress);
    });
    return () => unsub();
  }, []);

  if (isResting || isPaused || !prediction) {
    return null;
  }

  const { filteredX, filteredY, confidence } = prediction;
  const isReliable = confidence.isReliable;

  // Reject rendering if coordinates are out of bounds
  if (confidence.isOutOfBounds || filteredX < -20 || filteredY < -20) {
    return null;
  }

  // Check if magnetic target snapping is currently attracting the cursor
  const snappedPoint = SelectionManager.getInstance().getSnappedGazePoint();
  const renderX = snappedPoint ? snappedPoint.x : filteredX;
  const renderY = snappedPoint ? snappedPoint.y : filteredY;

  const isDwelling = dwellProgress > 0 && dwellProgress < 1;

  return (
    <div
      style={{
        position: 'fixed',
        left: `${Math.round(renderX)}px`,
        top: `${Math.round(renderY)}px`,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 9999,
        transition: snappedPoint ? 'transform 80ms ease-out' : 'transform 20ms linear',
      }}
      aria-hidden="true"
    >
      {/* Outer focus halo & Blue Selection Ring */}
      <div
        style={{
          position: 'relative',
          width: '42px',
          height: '42px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Background halo */}
        <div
          style={{
            position: 'absolute',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            border: isDwelling
              ? '2px solid rgba(0, 136, 255, 0.9)'
              : isReliable
                ? '2px solid rgba(15, 37, 55, 0.45)'
                : '2px solid rgba(37, 99, 235, 0.55)',
            backgroundColor: isDwelling
              ? 'rgba(0, 136, 255, 0.15)'
              : 'rgba(15, 37, 55, 0.06)',
            boxShadow: isDwelling
              ? '0 0 16px rgba(0, 136, 255, 0.55)'
              : '0 2px 8px rgba(15, 23, 42, 0.15)',
            transform: isDwelling ? 'scale(1.2)' : 'scale(1.0)',
            transition: 'all 100ms ease-out',
          }}
        />

        {/* Circular SVG Blue Gaze Progress Ring */}
        {dwellProgress > 0 && (
          <svg
            width="42"
            height="42"
            viewBox="0 0 42 42"
            style={{
              position: 'absolute',
              transform: 'rotate(-90deg)',
              pointerEvents: 'none',
            }}
          >
            <circle
              cx="21"
              cy="21"
              r="18"
              fill="none"
              stroke="#0088FF"
              strokeWidth="4"
              strokeDasharray="113.1"
              strokeDashoffset={113.1 * (1 - dwellProgress)}
              strokeLinecap="round"
              style={{
                filter: 'drop-shadow(0 0 4px rgba(0, 136, 255, 0.6))',
              }}
            />
          </svg>
        )}

        {/* Center dot */}
        <div
          style={{
            width: isDwelling ? '10px' : '8px',
            height: isDwelling ? '10px' : '8px',
            borderRadius: '50%',
            backgroundColor: isDwelling
              ? '#0088FF'
              : isReliable
                ? '#0F2537'
                : '#2563EB',
            boxShadow: isDwelling ? '0 0 8px #0088FF' : 'none',
            transition: 'all 80ms ease-out',
          }}
        />
      </div>

      {/* Warning message if tracking confidence drops */}
      {!isReliable && confidence.reason && (
        <div
          style={{
            position: 'absolute',
            top: '44px',
            left: '50%',
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            color: '#FFFFFF',
            fontSize: '11px',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: '6px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          {confidence.reason}
        </div>
      )}
    </div>
  );
};
