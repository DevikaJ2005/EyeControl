/**
 * CalibrationPoints
 * Generates screen calibration targets for standard 9-point, extended 17-point,
 * and independent held-out validation targets.
 */

import { CalibrationTarget } from '../types/tracking';

export class CalibrationPoints {
  /**
   * Generates standard 9-point calibration pattern (3x3 grid)
   * With 4 separate held-out validation points.
   */
  public static get9PointGrid(screenWidth: number, screenHeight: number): {
    trainTargets: CalibrationTarget[];
    validationTargets: CalibrationTarget[];
  } {
    // 3x3 grid coordinates at 10%, 50%, 90% of screen
    const xCoords = [0.10, 0.50, 0.90];
    const yCoords = [0.10, 0.50, 0.90];

    const trainTargets: CalibrationTarget[] = [];
    let idx = 1;

    for (const y of yCoords) {
      for (const x of xCoords) {
        trainTargets.push({
          id: `train-${idx}`,
          x: Math.round(x * screenWidth),
          y: Math.round(y * screenHeight),
          normalizedX: x,
          normalizedY: y,
          label: `Point ${idx}`,
          isValidationOnly: false,
        });
        idx++;
      }
    }

    // 4 held-out validation points in diamond layout between grid points
    // Never used for training weights
    const valCoords = [
      { x: 0.50, y: 0.28, id: 'val-top' },
      { x: 0.72, y: 0.50, id: 'val-right' },
      { x: 0.50, y: 0.72, id: 'val-bottom' },
      { x: 0.28, y: 0.50, id: 'val-left' },
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
