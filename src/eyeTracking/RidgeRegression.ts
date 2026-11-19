/**
 * Custom Ridge Regression (L2 Regularized Linear / Polynomial Regression)
 * Implemented from scratch with Gauss-Jordan elimination with partial pivoting.
 * Designed for real-time calibration sample fitting with numerical stability.
 */

export interface NormalizerParams {
  mean: number[];
  std: number[];
}

export interface ModelFitResult {
  weights: number[];
  intercept: number;
  r2: number;
  mse: number;
  mae: number;
}

export class RidgeRegression {
  private lambda: number;
  private weights: number[] = [];
  private intercept: number = 0;
  private normalizer: NormalizerParams | null = null;
  private degree: number = 1; // 1 = linear, 2 = polynomial quadratic with interactions

  constructor(lambda: number = 1e-3, degree: number = 1) {
    this.lambda = lambda;
    this.degree = degree;
  }

  /**
   * Polynomial feature expansion for feature vector
   * If degree == 2: expands [x1, x2, ...] to [x1, x2, ..., x1^2, x2^2, ..., x1*x2, ...]
   */
  public expandFeatures(x: number[]): number[] {
    if (this.degree <= 1) return [...x];

    const expanded = [...x];
    const n = x.length;

    // Quadratic terms
    for (let i = 0; i < n; i++) {
      expanded.push(x[i] * x[i]);
    }

    // Cross/Interaction terms (e.g. iris * head pose)
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        expanded.push(x[i] * x[j]);
      }
    }

    return expanded;
  }

  /**
   * Calculate mean and standard deviation for standardization
   */
  public static computeNormalizer(X: number[][]): NormalizerParams {
    const numSamples = X.length;
    if (numSamples === 0) return { mean: [], std: [] };
    const numFeatures = X[0].length;

    const mean = new Array(numFeatures).fill(0);
    for (let i = 0; i < numSamples; i++) {
      for (let j = 0; j < numFeatures; j++) {
        mean[j] += X[i][j];
      }
    }
    for (let j = 0; j < numFeatures; j++) {
      mean[j] /= numSamples;
    }

    const std = new Array(numFeatures).fill(0);
    for (let i = 0; i < numSamples; i++) {
      for (let j = 0; j < numFeatures; j++) {
        const diff = X[i][j] - mean[j];
        std[j] += diff * diff;
      }
    }
    for (let j = 0; j < numFeatures; j++) {
      const variance = std[j] / numSamples;
      std[j] = Math.sqrt(variance);
      if (std[j] < 1e-7) {
        std[j] = 1.0; // Avoid division by zero for constant features
      }
    }

    return { mean, std };
  }

  /**
   * Standardize features using given normalizer
   */
  public static standardize(x: number[], normalizer: NormalizerParams): number[] {
    return x.map((val, idx) => {
      const m = normalizer.mean[idx] ?? 0;
      const s = normalizer.std[idx] ?? 1.0;
      return (val - m) / s;
    });
  }

  /**
   * Fit Ridge Regression weights using centered normal equations:
   * (X_c^T X_c + lambda * I) * w = X_c^T y_c
   * intercept = mean(y) - w^T * mean(X)
   */
  public fit(rawX: number[][], y: number[]): ModelFitResult {
    const numSamples = rawX.length;
    if (numSamples < 3) {
      throw new Error(`Insufficient samples for regression: ${numSamples}`);
    }

    // Step 1: Expand features
    const expandedX = rawX.map(sample => this.expandFeatures(sample));
    const numFeatures = expandedX[0].length;

    // Step 2: Compute standardization
    this.normalizer = RidgeRegression.computeNormalizer(expandedX);
    const X_std = expandedX.map(sample => RidgeRegression.standardize(sample, this.normalizer!));

    // Step 3: Center X and y
    const meanY = y.reduce((a, b) => a + b, 0) / numSamples;
    const y_c = y.map(v => v - meanY);

    // X_std is already roughly zero-mean, but compute exact column means of X_std:
    const meanX_std = new Array(numFeatures).fill(0);
    for (let i = 0; i < numSamples; i++) {
      for (let j = 0; j < numFeatures; j++) {
        meanX_std[j] += X_std[i][j];
      }
    }
    for (let j = 0; j < numFeatures; j++) meanX_std[j] /= numSamples;

    const X_c: number[][] = [];
    for (let i = 0; i < numSamples; i++) {
      const row: number[] = [];
      for (let j = 0; j < numFeatures; j++) {
        row.push(X_std[i][j] - meanX_std[j]);
      }
      X_c.push(row);
    }

    // Step 4: Compute A = X_c^T * X_c + lambda * I
    const A: number[][] = Array.from({ length: numFeatures }, () => new Array(numFeatures).fill(0));
    for (let i = 0; i < numFeatures; i++) {
      for (let j = 0; j < numFeatures; j++) {
        let sum = 0;
        for (let k = 0; k < numSamples; k++) {
          sum += X_c[k][i] * X_c[k][j];
        }
        A[i][j] = sum;
      }
      // Add L2 ridge penalty on diagonal
      A[i][i] += this.lambda;
    }

    // Step 5: Compute b = X_c^T * y_c
    const b: number[] = new Array(numFeatures).fill(0);
    for (let i = 0; i < numFeatures; i++) {
      let sum = 0;
      for (let k = 0; k < numSamples; k++) {
        sum += X_c[k][i] * y_c[k];
      }
      b[i] = sum;
    }

    // Step 6: Solve A * w = b using Gauss-Jordan elimination with partial pivoting
    this.weights = RidgeRegression.solveLinearSystem(A, b);

    // Step 7: Compute intercept
    let wDotMeanX = 0;
    for (let j = 0; j < numFeatures; j++) {
      wDotMeanX += this.weights[j] * meanX_std[j];
    }
    this.intercept = meanY - wDotMeanX;

    // Step 8: Compute fit statistics on training data
    const predictions = rawX.map(sample => this.predict(sample));
    const metrics = RidgeRegression.calculateMetrics(y, predictions);

    return {
      weights: [...this.weights],
      intercept: this.intercept,
      r2: metrics.r2,
      mse: metrics.mse,
      mae: metrics.mae,
    };
  }

  /**
   * Predict single sample
   */
  public predict(sample: number[]): number {
    if (!this.normalizer || this.weights.length === 0) {
      throw new Error('Model has not been fitted yet');
    }

    const expanded = this.expandFeatures(sample);
    const standardized = RidgeRegression.standardize(expanded, this.normalizer);

    let sum = this.intercept;
    for (let i = 0; i < this.weights.length; i++) {
      sum += this.weights[i] * standardized[i];
    }
    return sum;
  }

  /**
   * Solve A * x = b via Gauss-Jordan elimination with partial pivoting
   */
  public static solveLinearSystem(A: number[][], b: number[]): number[] {
    const n = b.length;
    // Augmented matrix [A | b]
    const M: number[][] = A.map((row, i) => [...row, b[i]]);

    for (let col = 0; col < n; col++) {
      // Find pivot row
      let maxRow = col;
      let maxVal = Math.abs(M[col][col]);
      for (let row = col + 1; row < n; row++) {
        const val = Math.abs(M[row][col]);
        if (val > maxVal) {
          maxVal = val;
          maxRow = row;
        }
      }

      // Swap rows
      if (maxRow !== col) {
        const temp = M[col];
        M[col] = M[maxRow];
        M[maxRow] = temp;
      }

      const pivot = M[col][col];
      if (Math.abs(pivot) < 1e-12) {
        // Singular or degenerate system, regularize pivot
        M[col][col] = 1e-6;
      }

      // Normalize pivot row
      const invPivot = 1.0 / M[col][col];
      for (let j = col; j <= n; j++) {
        M[col][j] *= invPivot;
      }

      // Eliminate column entries in other rows
      for (let row = 0; row < n; row++) {
        if (row !== col) {
          const factor = M[row][col];
          if (Math.abs(factor) > 1e-12) {
            for (let j = col; j <= n; j++) {
              M[row][j] -= factor * M[col][j];
            }
          }
        }
      }
    }

    // Solution is in the last column
    const x = new Array(n);
    for (let i = 0; i < n; i++) {
      x[i] = M[i][n];
      if (isNaN(x[i])) x[i] = 0;
    }
    return x;
  }

  public static calculateMetrics(actual: number[], predicted: number[]): { r2: number; mse: number; mae: number } {
    const n = actual.length;
    if (n === 0) return { r2: 0, mse: 0, mae: 0 };

    const meanActual = actual.reduce((a, b) => a + b, 0) / n;
    let ssTot = 0;
    let ssRes = 0;
    let sumAbsError = 0;

    for (let i = 0; i < n; i++) {
      const diff = actual[i] - predicted[i];
      ssRes += diff * diff;
      sumAbsError += Math.abs(diff);

      const dev = actual[i] - meanActual;
      ssTot += dev * dev;
    }

    const mse = ssRes / n;
    const mae = sumAbsError / n;
    const r2 = ssTot > 1e-9 ? 1.0 - ssRes / ssTot : 0.0;

    return { r2, mse, mae };
  }

  // Getters & serialization for saving to IndexedDB
  public getWeights(): number[] {
    return [...this.weights];
  }

  public getIntercept(): number {
    return this.intercept;
  }

  public getNormalizer(): NormalizerParams | null {
    return this.normalizer;
  }

  public getDegree(): number {
    return this.degree;
  }

  public loadModel(weights: number[], intercept: number, normalizer: NormalizerParams, degree: number = 1): void {
    this.weights = [...weights];
    this.intercept = intercept;
    this.normalizer = {
      mean: [...normalizer.mean],
      std: [...normalizer.std],
    };
    this.degree = degree;
  }
}
