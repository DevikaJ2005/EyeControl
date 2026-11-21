/**
 * DwellButton
 * Accessible, large target button with integrated dwell selection,
 * radial progress feedback, keyboard/mouse fallback, and high-contrast focus states.
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
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [progress, setProgress] = useState(0);
  const [isDwelling, setIsDwelling] = useState(false);
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

    // Listen to dwell progress updates
    const unsubscribeDwell = selectionManager.getDwellEngine().subscribe((update: DwellProgressUpdate) => {
      if (update.targetId === id) {
        setProgress(update.progress);
        setIsDwelling(update.progress > 0 && update.progress < 1);
      } else {
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
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          background: isSelected ? 'var(--primary-active)' : 'var(--primary)',
          color: 'var(--text-inverse)',
          border: '2px solid var(--primary-hover)',
        };
      case 'emergency':
        return {
          background: isSelected ? 'var(--emergency-hover)' : 'var(--emergency-surface)',
          color: 'var(--emergency)',
          border: '3px solid var(--emergency)',
        };
      case 'sage':
        return {
          background: 'var(--surface-sage)',
          color: 'var(--text-primary)',
          border: '2px solid var(--border-strong)',
        };
      case 'ghost':
        return {
          background: 'transparent',
          color: 'var(--text-primary)',
          border: '2px solid var(--border)',
        };
      case 'surface':
      default:
        return {
          background: 'var(--surface)',
          color: 'var(--text-primary)',
          border: '2px solid var(--border)',
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'card':
        return {
          minHeight: '160px',
          padding: '24px',
          fontSize: 'var(--font-size-lg)',
          borderRadius: 'var(--radius-lg)',
        };
      case 'large':
        return {
          minHeight: '80px',
          padding: '18px 28px',
          fontSize: 'var(--font-size-md)',
          borderRadius: 'var(--radius-md)',
        };
      case 'normal':
      default:
        return {
          minHeight: '64px',
          padding: '14px 22px',
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
        boxShadow: isDwelling ? 'var(--shadow-active)' : 'var(--shadow-subtle)',
        outline: isDwelling ? '4px solid var(--focus)' : 'none',
        outlineOffset: '2px',
        transform: isDwelling ? 'scale(1.02)' : 'scale(1.0)',
        transition: 'transform var(--transition-fast), box-shadow var(--transition-fast), outline var(--transition-fast)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        overflow: 'hidden',
        ...variantStyle,
        ...sizeStyle,
        ...style,
      }}
      className={`dwell-button ${isDwelling ? 'is-dwelling' : ''} ${className}`}
    >
      {/* Background progress fill */}
      {progress > 0 && (
        <span
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: '6px',
            width: `${Math.round(progress * 100)}%`,
            backgroundColor: variant === 'emergency' ? 'var(--emergency)' : 'var(--focus)',
            transition: 'width 60ms linear',
            borderRadius: '0 0 var(--radius-md) var(--radius-md)',
          }}
        />
      )}

      {/* Circular dwell progress indicator on top right */}
      {isDwelling && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            width: '28px',
            height: '28px',
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        >
          <svg width="28" height="28" viewBox="0 0 36 36">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="rgba(66, 104, 90, 0.2)"
              strokeWidth="4"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke={variant === 'emergency' ? '#A75B51' : '#42685A'}
              strokeWidth="4"
              strokeDasharray={`${Math.round(progress * 100)}, 100`}
            />
          </svg>
        </div>
      )}

      <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
        {children}
      </span>
    </button>
  );
};
