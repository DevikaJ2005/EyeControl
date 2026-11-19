/**
 * CalibrationPoints
 * Generates screen calibration targets for standard 9-point, extended 17-point,
 * and independent held-out validation targets.
 */

import { CalibrationTarget } from '../types/tracking';

export class CalibrationPoints {
  /**
   * Central baseline target for neutral head and iris baseline acquisition
   */
  public static getCentralBaselineTarget(screenWidth: number, screenHeight: number): CalibrationTarget {
    return {
      id: 'baseline-center',
      x: Math.round(0.50 * screenWidth),
      y: Math.round(0.50 * screenHeight),
      normalizedX: 0.50,
      normalizedY: 0.50,
      label: 'Central Baseline Fixation',
      isValidationOnly: false,
    };
  }

  /**
   * Generates standard 9-point calibration pattern (3x3 grid)
   * Targets kept comfortably away from extreme screen borders (15%, 50%, 85%)
   * With 5 independent held-out validation points.
   */
  public static get9PointGrid(screenWidth: number, screenHeight: number): {
    baselineTarget: CalibrationTarget;
    trainTargets: CalibrationTarget[];
    validationTargets: CalibrationTarget[];
  } {
    const baselineTarget = this.getCentralBaselineTarget(screenWidth, screenHeight);

    // 3x3 grid coordinates at 15%, 50%, 85% of screen (safe margins)
    const xCoords = [0.15, 0.50, 0.85];
    const yCoords = [0.15, 0.50, 0.85];

    const labels = [
      'Top-Left', 'Top-Centre', 'Top-Right',
      'Middle-Left', 'Centre', 'Middle-Right',
      'Bottom-Left', 'Bottom-Centre', 'Bottom-Right'
    ];

    const trainTargets: CalibrationTarget[] = [];
    let idx = 0;

    for (const y of yCoords) {
      for (const x of xCoords) {
        trainTargets.push({
          id: `train-${idx + 1}`,
          x: Math.round(x * screenWidth),
          y: Math.round(y * screenHeight),
          normalizedX: x,
          normalizedY: y,
          label: labels[idx],
          isValidationOnly: false,
        });
        idx++;
      }
    }

    // 5 independent held-out validation targets:
    // Centre, Upper-Left, Upper-Right, Lower-Left, Lower-Right
    const valCoords = [
      { x: 0.50, y: 0.50, id: 'val-center', label: 'Centre' },
      { x: 0.32, y: 0.32, id: 'val-upper-left', label: 'Upper-Left Region' },
      { x: 0.68, y: 0.32, id: 'val-upper-right', label: 'Upper-Right Region' },
      { x: 0.32, y: 0.68, id: 'val-lower-left', label: 'Lower-Left Region' },
      { x: 0.68, y: 0.68, id: 'val-lower-right', label: 'Lower-Right Region' },
    ];

    const validationTargets: CalibrationTarget[] = valCoords.map(c => ({
      id: c.id,
      x: Math.round(c.x * screenWidth),
      y: Math.round(c.y * screenHeight),
      normalizedX: c.x,
      normalizedY: c.y,
      label: c.label,
      isValidationOnly: true,
    }));

    return { baselineTarget, trainTargets, validationTargets };
  }

  /**
   * Generates extended 17-point calibration pattern for high-precision recalibration
   */
  public static get17PointGrid(screenWidth: number, screenHeight: number): {
    trainTargets: CalibrationTarget[];
    validationTargets: CalibrationTarget[];
  } {
    const coords = [
      // 9 primary
      { x: 0.08, y: 0.08 }, { x: 0.50, y: 0.08 }, { x: 0.92, y: 0.08 },
      { x: 0.08, y: 0.50 }, { x: 0.50, y: 0.50 }, { x: 0.92, y: 0.50 },
      { x: 0.08, y: 0.92 }, { x: 0.50, y: 0.92 }, { x: 0.92, y: 0.92 },
      // 8 intermediate
      { x: 0.29, y: 0.08 }, { x: 0.71, y: 0.08 },
      { x: 0.29, y: 0.50 }, { x: 0.71, y: 0.50 },
      { x: 0.29, y: 0.92 }, { x: 0.71, y: 0.92 },
      { x: 0.50, y: 0.29 }, { x: 0.50, y: 0.71 },
    ];

    const trainTargets: CalibrationTarget[] = coords.map((c, i) => ({
      id: `train-ext-${i + 1}`,
      x: Math.round(c.x * screenWidth),
      y: Math.round(c.y * screenHeight),
      normalizedX: c.x,
      normalizedY: c.y,
      label: `Point ${i + 1}`,
      isValidationOnly: false,
    }));

    // 4 held-out validation points
    const valCoords = [
      { x: 0.29, y: 0.29, id: 'val-top-left' },
      { x: 0.71, y: 0.29, id: 'val-top-right' },
      { x: 0.29, y: 0.71, id: 'val-bottom-left' },
      { x: 0.71, y: 0.71, id: 'val-bottom-right' },
    ];

    const validationTargets: CalibrationTarget[] = valCoords.map(c => ({
      id: c.id,
      x: Math.round(c.x * screenWidth),
      y: Math.round(c.y * screenHeight),
      normalizedX: c.x,
      normalizedY: c.y,
      label: `Validation ${c.id}`,
      isValidationOnly: true,
    }));

    return { trainTargets, validationTargets };
  }
}
