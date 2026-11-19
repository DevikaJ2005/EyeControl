/**
 * Pretrained Baseline Prior Weights
 * Generated from Leave-One-Subject-Out Cross-Validation (LOSOCV)
 * trained in EyeControl ML Lab on 12-dimensional eye and head features.
 */

export interface NormalizerParams {
  mean: number[];
  std: number[];
}

export interface GazePriorConfig {
  weightsX: number[];
  interceptX: number;
  weightsY: number[];
  interceptY: number;
  featureNames: string[];
  normalizer: NormalizerParams;
}

export const PRETRAINED_GAZE_PRIOR: GazePriorConfig = {
  featureNames: [
    "dAvgX", "dAvgY", "dLeftX", "dLeftY", "dRightX", "dRightY",
    "dYaw", "dPitch", "dRoll", "leftOpenness", "rightOpenness", "faceScale"
  ],
  weightsX: [
    2.531721698412964,
    0.0775947986432769,
    2.4696963114758437,
    0.0564256287417284,
    2.4959377121096513,
    0.03374141108059008,
    0.8554260218085747,
    -0.05056349382862869,
    -0.013515585168216989,
    -0.05136602403659003,
    -0.048028629391557616,
    0.044489257710292406
  ],
  interceptX: 0.5117590609859265,
  weightsY: [
    0.04047808538118518,
    2.90274449088721,
    0.03133612245823567,
    2.786707218880097,
    0.05669589201792991,
    2.828658907844013,
    -0.020610962545983623,
    1.0337344662687915,
    0.0563893513418314,
    -0.021578219325562743,
    -0.023786985934467448,
    0.16588289120735616
  ],
  interceptY: 0.46448394790130687,
  normalizer: {
    mean: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    std: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  }
};
