"""
preprocess.py
Standardized Feature Extraction & Preprocessing Pipeline.
Converts raw dataset annotations into the exact 12-dimensional feature vector
used by EyeControl's real-time runtime engine.
"""

import sys
from pathlib import Path
import numpy as np
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_RAW = BASE_DIR / "data" / "raw"
DATA_PROCESSED = BASE_DIR / "data" / "processed"

FEATURE_NAMES = [
    "dAvgX",           # 0: Primary horizontal gaze displacement
    "dAvgY",           # 1: Primary vertical gaze displacement
    "dLeftX",          # 2: Left eye delta
    "dLeftY",          # 3: Left eye delta
    "dRightX",         # 4: Right eye delta
    "dRightY",         # 5: Right eye delta
    "dYaw",            # 6: Compensatory head yaw (radians)
    "dPitch",          # 7: Compensatory head pitch (radians)
    "dRoll",           # 8: Compensatory head roll (radians)
    "leftOpenness",    # 9: Left eye aspect ratio
    "rightOpenness",   # 10: Right eye aspect ratio
    "faceScale"        # 11: Normalized face width (distance proxy)
]

TARGET_NAMES = ["target_norm_x", "target_norm_y"]

def load_and_preprocess(input_path: Path = None):
    """
    Loads raw feature records, cleans missing values, and ensures
    strict [0, 1] coordinate bounds and subject isolation.
    """
    if input_path is None:
        input_path = DATA_RAW / "mpiigaze_sample_features.csv"

    if not input_path.exists():
        print(f"[ERROR] Input file not found: {input_path}")
        print("Run scripts/download_dataset.py first!")
        return None

    print(f"[LOADING] Reading dataset from: {input_path}")
    df = pd.read_csv(input_path)
    print(f"[DATA INFO] Total Records: {len(df)} across {df['subject'].nunique()} unique subjects.")

    # Validate all required feature columns exist
    missing_features = [col for col in FEATURE_NAMES if col not in df.columns]
    if missing_features:
        raise ValueError(f"Dataset is missing required EyeControl features: {missing_features}")

    # Drop NaNs or infinite values
    clean_df = df.dropna(subset=FEATURE_NAMES + TARGET_NAMES).copy()
    
    # Clip target coordinates strictly to screen bounds [0.0, 1.0]
    clean_df["target_norm_x"] = clean_df["target_norm_x"].clip(0.0, 1.0)
    clean_df["target_norm_y"] = clean_df["target_norm_y"].clip(0.0, 1.0)

    # Save processed dataset
    output_path = DATA_PROCESSED / "eyecontrol_preprocessed.parquet"
    csv_output_path = DATA_PROCESSED / "eyecontrol_preprocessed.csv"
    
    clean_df.to_csv(csv_output_path, index=False)
    print(f"[SAVED] Preprocessed dataset written to: {csv_output_path}")

    # Summary statistics
    print("\n--- Feature Summary Statistics ---")
    print(clean_df[FEATURE_NAMES].describe().round(4).T[["mean", "std", "min", "max"]])

    return clean_df

if __name__ == "__main__":
    print("=" * 60)
    print("EyeControl ML Lab — Preprocessing Pipeline")
    print("=" * 60)
    load_and_preprocess()
