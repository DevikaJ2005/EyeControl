/**
 * EyeCursor
 * Renders the calibrated gaze or head tracking pointer on the screen.
 * Displays confidence states, blink indicators, and smooth movement.
 */

import React from 'react';
import { GazePrediction } from '../types/tracking';

interface EyeCursorProps {
  prediction: GazePrediction | null;
  mode: 'eye' | 'head';
  isResting: boolean;
  isPaused: boolean;
}

export const EyeCursor: React.FC<EyeCursorProps> = ({
  prediction,
  mode,
  isResting,
  isPaused,
}) => {
  if (isResting || isPaused || !prediction) {
    return null;
  }

  const { filteredX, filteredY, confidence } = prediction;
  const isReliable = confidence.isReliable;

  // Reject rendering if coordinates are out of bounds
  if (confidence.isOutOfBounds || filteredX < -20 || filteredY < -20) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: `${Math.round(filteredX)}px`,
        top: `${Math.round(filteredY)}px`,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 9999,
        transition: 'transform 40ms linear',
      }}
      aria-hidden="true"
    >
      {/* Outer focus halo */}
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: isReliable
            ? '3px solid rgba(66, 104, 90, 0.7)'
            : '3px dashed rgba(167, 91, 81, 0.7)',
          backgroundColor: isReliable
            ? 'rgba(66, 104, 90, 0.12)'
            : 'rgba(167, 91, 81, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        }}
      >
        {/* Center dot */}
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isReliable ? '#42685A' : '#A75B51',
          }}
        />
      </div>

      {/* Warning message if tracking confidence drops */}
      {!isReliable && confidence.reason && (
        <div
          style={{
            position: 'absolute',
            top: '36px',
            left: '50%',
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
            backgroundColor: 'rgba(40, 56, 49, 0.9)',
            color: '#F7F6F0',
            fontSize: '12px',
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: '6px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
          }}
        >
          {confidence.reason}
        </div>
      )}
    </div>
  );
};
