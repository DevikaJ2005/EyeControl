/**
 * CoordinateManager
 * Single source of truth for coordinate conversion across EyeControl.
 * Handles viewport CSS pixels, normalized [0..1] coordinates, devicePixelRatio,
 * bounding client rect mappings, and strict out-of-bounds rejection.
 */

import { Point2D } from '../types/tracking';

export interface ViewportDimensions {
  width: number;
  height: number;
  devicePixelRatio: number;
  scrollX: number;
  scrollY: number;
}

export class CoordinateManager {
  /**
   * Get current viewport dimensions and metrics
   */
  public static getViewport(): ViewportDimensions {
    if (typeof window === 'undefined') {
      return {
        width: 1920,
        height: 1080,
        devicePixelRatio: 1,
        scrollX: 0,
        scrollY: 0,
      };
    }

    return {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1,
      scrollX: window.scrollX || window.pageXOffset || 0,
      scrollY: window.scrollY || window.pageYOffset || 0,
    };
  }

  /**
   * Convert normalized [0..1] coordinate to browser viewport CSS pixels.
   * Viewport coordinates are relative to the visible window (0,0 is top-left of viewport).
   */
  public static normalizedToViewportPixels(norm: Point2D, viewport?: { width: number; height: number }): Point2D {
    const vp = viewport || this.getViewport();
    return {
      x: norm.x * vp.width,
      y: norm.y * vp.height,
    };
  }

  /**
   * Convert browser viewport CSS pixels to normalized [0..1] coordinates.
   */
  public static viewportPixelsToNormalized(pixel: Point2D, viewport?: { width: number; height: number }): Point2D {
    const vp = viewport || this.getViewport();
    const w = Math.max(1, vp.width);
    const h = Math.max(1, vp.height);
    return {
      x: pixel.x / w,
      y: pixel.y / h,
    };
  }

  /**
   * Derive normalized coordinate of the center of any DOM element using its live getBoundingClientRect().
   * This is immune to page scroll and layout shifts because getBoundingClientRect() is relative to the viewport.
   */
  public static elementToNormalizedCenter(element: HTMLElement, viewport?: { width: number; height: number }): Point2D {
    const rect = element.getBoundingClientRect();
    const vp = viewport || this.getViewport();

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    return {
      x: centerX / vp.width,
      y: centerY / vp.height,
    };
  }

  /**
   * Derive viewport CSS pixel center of any DOM element.
   */
  public static elementToViewportCenter(element: HTMLElement): Point2D {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  /**
   * Check whether a normalized coordinate is inside valid screen margins.
   * Allowed margin factor (e.g. 0.05 = 5% outside screen edges).
   */
  public static isWithinBounds(norm: Point2D, marginFactor: number = 0.05): boolean {
    return (
      norm.x >= -marginFactor &&
      norm.x <= 1 + marginFactor &&
      norm.y >= -marginFactor &&
      norm.y <= 1 + marginFactor
    );
  }

  /**
   * Compute Euclidean distance between two points in CSS pixels
   */
  public static euclideanDistance(p1: Point2D, p2: Point2D): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.hypot(dx, dy);
  }

  /**
   * Scale canvas drawing context to account for high-DPI displays (devicePixelRatio).
   * Ensures 1 CSS pixel corresponds accurately to display coordinates without blurring.
   */
  public static setupHiDPICanvas(canvas: HTMLCanvasElement, cssWidth: number, cssHeight: number): CanvasRenderingContext2D | null {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
    return ctx;
  }
}
