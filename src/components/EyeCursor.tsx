/**
 * EyeCursor
 * Renders the calibrated gaze or head tracking pointer on the screen.
 * Displays confidence states, blink indicators, smooth movement, and
 * an integrated radial dwell progress ring so users can see activation timing
 * directly at their point of gaze.
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

  const isDwelling = dwellProgress > 0 && dwellProgress < 1;

  return (
    <div
      style={{
        position: 'fixed',
        left: `${Math.round(filteredX)}px`,
        top: `${Math.round(filteredY)}px`,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 9999,
        transition: 'transform 30ms linear',
      }}
      aria-hidden="true"
    >
      {/* Outer focus halo & Dwell Progress Ring */}
      <div
        style={{
          position: 'relative',
          width: '38px',
          height: '38px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Background halo */}
        <div
          style={{
            position: 'absolute',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: isReliable
              ? '2px solid rgba(66, 104, 90, 0.6)'
              : '2px dashed rgba(167, 91, 81, 0.7)',
            backgroundColor: isReliable
              ? 'rgba(66, 104, 90, 0.12)'
              : 'rgba(167, 91, 81, 0.12)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            transform: isDwelling ? 'scale(1.15)' : 'scale(1.0)',
            transition: 'transform 100ms ease-out',
          }}
        />

        {/* Circular SVG dwell progress arc */}
        {dwellProgress > 0 && (
          <svg
            width="38"
            height="38"
            viewBox="0 0 38 38"
            style={{
              position: 'absolute',
              transform: 'rotate(-90deg)',
              pointerEvents: 'none',
            }}
          >
            <circle
              cx="19"
              cy="19"
              r="16"
              fill="none"
              stroke="#8CE4B2"
              strokeWidth="3.5"
              strokeDasharray="100.5"
              strokeDashoffset={100.5 * (1 - dwellProgress)}
              strokeLinecap="round"
            />
          </svg>
        )}

        {/* Center dot */}
        <div
          style={{
            width: isDwelling ? '10px' : '8px',
            height: isDwelling ? '10px' : '8px',
            borderRadius: '50%',
            backgroundColor: isReliable ? '#42685A' : '#A75B51',
            boxShadow: isDwelling ? '0 0 8px #8CE4B2' : 'none',
            transition: 'all 80ms ease-out',
          }}
        />
      </div>

      {/* Warning message if tracking confidence drops */}
      {!isReliable && confidence.reason && (
        <div
          style={{
            position: 'absolute',
            top: '42px',
            left: '50%',
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
            backgroundColor: 'rgba(30, 42, 37, 0.95)',
            color: '#F7F6F0',
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
