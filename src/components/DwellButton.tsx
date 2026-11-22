/**
 * DwellButton
 * Accessible, gaze-optimized interactive button with:
 * - Prominent Blue Gaze Selection Ring (#0088FF) matching professional AT design
 * - Circular SVG progress indicator + linear baseline bar
 * - Magnetic attraction styling and active card lift
 * - Keyboard & mouse fallback for caregivers
 */

import React, { useEffect, useRef, useState } from 'react';
import { SelectionManager } from '../interaction/SelectionManager';
import { DwellProgressUpdate } from '../interaction/DwellEngine';

interface DwellButtonProps {
  id: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  variant?: 'primary' | 'surface' | 'emergency' | 'ghost' | 'sage';
  size?: 'normal' | 'large' | 'card';
  ariaLabel?: string;
  allowInRestMode?: boolean;
  showCenterRing?: boolean; // When true, renders the prominent center blue ring shown in reference designs
}

export const DwellButton: React.FC<DwellButtonProps> = ({
  id,
  onClick,
  children,
  className = '',
  style,
  disabled = false,
  variant = 'surface',
  size = 'normal',
  ariaLabel,
  allowInRestMode = false,
  showCenterRing = false,
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [progress, setProgress] = useState(0);
  const [isDwelling, setIsDwelling] = useState(false);
  const [isTargeted, setIsTargeted] = useState(false);
  const [isSelected, setIsSelected] = useState(false);

  useEffect(() => {
    const selectionManager = SelectionManager.getInstance();
    const element = buttonRef.current;
    if (!element) return;

    // Register with SelectionManager
    const unregister = selectionManager.registerTarget({
      id,
      element,
      rect: element.getBoundingClientRect(),
      onSelect: () => {
        setIsSelected(true);
        onClick();
        setTimeout(() => setIsSelected(false), 300);
      },
      label: ariaLabel || (typeof children === 'string' ? children : id),
      disabled,
      allowInRestMode,
    });

    // Listen to dwell/target progress updates
    const unsubscribeDwell = selectionManager.getDwellEngine().subscribe((update: DwellProgressUpdate) => {
      if (update.targetId === id) {
        setIsTargeted(true);
        setProgress(update.progress);
        setIsDwelling(update.progress > 0 && update.progress < 1);
      } else {
        setIsTargeted(false);
        setProgress(0);
        setIsDwelling(false);
      }
    });

    return () => {
      unregister();
      unsubscribeDwell();
    };
  }, [id, onClick, disabled, ariaLabel, children, allowInRestMode]);

  // Variant styling classes
  const isHighlighted = isDwelling || isTargeted;

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          background: isSelected ? '#0A1B28' : 'var(--primary)',
          color: 'var(--text-inverse)',
          border: isHighlighted ? '2.5px solid var(--gaze-blue)' : '2px solid var(--primary)',
          boxShadow: isHighlighted ? '0 0 16px rgba(0, 136, 255, 0.6)' : 'var(--shadow-subtle)',
        };
      case 'emergency':
        return {
          background: isSelected ? 'var(--emergency-hover)' : 'var(--emergency)',
          color: '#FFFFFF',
          border: isHighlighted ? '2.5px solid #FFFFFF' : '2px solid var(--emergency)',
          boxShadow: isHighlighted ? '0 0 0 3px rgba(220, 38, 38, 0.4)' : 'var(--shadow-subtle)',
        };
      case 'sage':
        return {
          background: isSelected ? 'var(--surface-blue-strong)' : 'var(--surface-blue)',
          color: 'var(--secondary)',
          border: isHighlighted ? '2.5px solid var(--gaze-blue)' : '2px solid #BFDBFE',
          boxShadow: isHighlighted ? '0 0 16px rgba(0, 136, 255, 0.6)' : 'var(--shadow-subtle)',
        };
      case 'ghost':
        return {
          background: isHighlighted ? 'var(--surface-blue)' : 'transparent',
          color: 'var(--text-primary)',
          border: isHighlighted ? '2.5px solid var(--gaze-blue)' : '2px solid var(--border)',
          boxShadow: isHighlighted ? '0 0 16px rgba(0, 136, 255, 0.6)' : 'none',
        };
      case 'surface':
      default:
        return {
          background: isHighlighted ? 'var(--surface-blue)' : 'var(--surface)',
          color: 'var(--text-primary)',
          border: isHighlighted ? '2.5px solid var(--gaze-blue)' : '2px solid var(--border)',
          boxShadow: isHighlighted ? '0 0 16px rgba(0, 136, 255, 0.6)' : 'var(--shadow-card)',
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'card':
        return {
          minHeight: '180px',
          padding: '24px',
          fontSize: 'var(--font-size-lg)',
          borderRadius: 'var(--radius-lg)',
        };
      case 'large':
        return {
          minHeight: '76px',
          padding: '16px 26px',
          fontSize: 'var(--font-size-md)',
          borderRadius: 'var(--radius-md)',
        };
      case 'normal':
      default:
        return {
          minHeight: '56px',
          padding: '12px 20px',
          fontSize: 'var(--font-size-base)',
          borderRadius: 'var(--radius-md)',
        };
    }
  };

  const variantStyle = getVariantStyles();
  const sizeStyle = getSizeStyles();

  return (
    <button
      ref={buttonRef}
      id={id}
      type="button"
      disabled={disabled}
      aria-label={ariaLabel}
      onClick={onClick}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        transform: isHighlighted ? 'scale(1.025)' : isSelected ? 'scale(0.98)' : 'scale(1.0)',
        transition: 'all 120ms ease-out',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        overflow: 'hidden',
        ...variantStyle,
        ...sizeStyle,
        ...style,
      }}
      className={`dwell-button ${isHighlighted ? 'is-dwelling' : ''} ${className}`}
    >
      {/* Background progress fill line */}
      {progress > 0 && (
        <span
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: '5px',
            width: `${Math.round(progress * 100)}%`,
            backgroundColor: variant === 'emergency' ? '#DC2626' : '#0088FF',
            transition: 'width 60ms linear',
            borderRadius: '0 0 var(--radius-md) var(--radius-md)',
            zIndex: 3,
          }}
        />
      )}

      {/* Prominent Blue Gaze Selection Ring for Card/Center Targets */}
      {(showCenterRing || size === 'card') && isHighlighted && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '120px',
            height: '120px',
            pointerEvents: 'none',
            zIndex: 4,
          }}
          aria-hidden="true"
        >
          <svg width="120" height="120" viewBox="0 0 120 120">
            {/* Soft background track */}
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="rgba(0, 136, 255, 0.08)"
              stroke="rgba(0, 136, 255, 0.25)"
              strokeWidth="5"
            />
            {/* Active animated stroke fill */}
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="#0088FF"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={326.7}
              strokeDashoffset={326.7 * (1 - progress)}
              style={{
                transform: 'rotate(-90deg)',
                transformOrigin: '50% 50%',
                filter: 'drop-shadow(0 0 6px rgba(0, 136, 255, 0.6))',
              }}
            />
          </svg>
        </div>
      )}

      {/* Standard top-right Blue Dwell Progress Ring */}
      {isDwelling && !showCenterRing && size !== 'card' && (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '28px',
            height: '28px',
            pointerEvents: 'none',
            zIndex: 4,
          }}
          aria-hidden="true"
        >
          <svg width="28" height="28" viewBox="0 0 36 36">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="rgba(0, 136, 255, 0.25)"
              strokeWidth="4"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#0088FF"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeDasharray={`${Math.round(progress * 100)}, 100`}
            />
          </svg>
        </div>
      )}

      <span style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '12px', width: '100%', height: '100%' }}>
        {children}
      </span>
    </button>
  );
};
