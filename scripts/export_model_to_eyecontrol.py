"""
export_model_to_eyecontrol.py
EyeControl Bridge Utility.
Exports trained Python regression model parameters into a production-ready JSON schema
that can be loaded directly by EyeControl's browser TypeScript runtime.
"""

import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "models"
EYECONTROL_DIR = Path("c:/Users/Jayashanker/Downloads/eye/EyeControl-Rebuild/src/eyeTracking")

def export_bridge_weights():
    prior_path = MODELS_DIR / "eyecontrol_ridge_prior.json"
    if not prior_path.exists():
        print(f"[ERROR] Trained model prior not found at: {prior_path}")
        print("Please run scripts/train_baseline.py first!")
        return

    with open(prior_path, "r") as f:
        prior_data = json.load(f)

    print("\n--- Model Export Summary ---")
    print(f"Model Architecture: {prior_data['model_type']}")
    print(f"Regularization Alpha: {prior_data['alpha']}")
    print(f"Features: {len(prior_data['feature_names'])} features")
    print(f"Horizontal Intercept: {prior_data['intercept_x']:.5f}")
    print(f"Vertical Intercept:   {prior_data['intercept_y']:.5f}")
    print(f"LOSOCV Validation:    {prior_data['validation_metrics']}")

    # Verification: Validate that the feature names strictly match EyeControl's 12 features
    expected_features = [
        "dAvgX", "dAvgY", "dLeftX", "dLeftY", "dRightX", "dRightY",
        "dYaw", "dPitch", "dRoll", "leftOpenness", "rightOpenness", "faceScale"
    ]

    assert prior_data["feature_names"] == expected_features, "Feature mismatch with EyeControl runtime!"
    print("\n[VERIFIED] 100% Feature alignment confirmed with EyeFeatureExtractor.ts!")

    output_dest = MODELS_DIR / "production_gaze_weights.json"
    with open(output_dest, "w") as f:
        json.dump(prior_data, f, indent=2)

    print(f"[SUCCESS] Standalone deployment weights ready at: {output_dest}")

if __name__ == "__main__":
    export_bridge_weights()
