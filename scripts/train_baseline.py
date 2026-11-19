"""
train_baseline.py
Model Training & Leave-One-Subject-Out Cross-Validation (LOSOCV) Engine.
Trains Dual Ridge Regression and Random Forest baseline models.
Exports trained weights to models/ for evaluation and integration.
"""

import sys
import json
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error
import joblib

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_PROCESSED = BASE_DIR / "data" / "processed"
MODELS_DIR = BASE_DIR / "models"

FEATURE_NAMES = [
    "dAvgX", "dAvgY", "dLeftX", "dLeftY", "dRightX", "dRightY",
    "dYaw", "dPitch", "dRoll", "leftOpenness", "rightOpenness", "faceScale"
]

def train_and_evaluate_models():
    dataset_path = DATA_PROCESSED / "eyecontrol_preprocessed.csv"
    if not dataset_path.exists():
        print("[ERROR] Preprocessed dataset not found. Running preprocessor...")
        from preprocess import load_and_preprocess
        load_and_preprocess()

    df = pd.read_csv(dataset_path)
    X = df[FEATURE_NAMES].values
    y_x = df["target_norm_x"].values
    y_y = df["target_norm_y"].values
    subjects = df["subject"].values
    unique_subjects = np.unique(subjects)

    print(f"\n[DATASET] Loaded {len(df)} samples across {len(unique_subjects)} subjects.")

    # -------------------------------------------------------------
    # 1. Leave-One-Subject-Out Cross-Validation (LOSOCV)
    # -------------------------------------------------------------
    print("\n--- Running Leave-One-Subject-Out Cross-Validation (LOSOCV) ---")
    ridge_errors_px = []
    rf_errors_px = []

    # Display screen resolution standard (1920 x 1080) for real-world pixel evaluation
    SCREEN_W, SCREEN_H = 1920, 1080

    for test_subj in unique_subjects:
        train_mask = (subjects != test_subj)
        test_mask = (subjects == test_subj)

        X_train, y_x_train, y_y_train = X[train_mask], y_x[train_mask], y_y[train_mask]
        X_test, y_x_test, y_y_test = X[test_mask], y_x[test_mask], y_y[test_mask]

        # Model A: Dual Ridge Regression (lambda = 0.05)
        ridge_x = Ridge(alpha=0.05).fit(X_train, y_x_train)
        ridge_y = Ridge(alpha=0.05).fit(X_train, y_y_train)

        pred_rx = ridge_x.predict(X_test)
        pred_ry = ridge_y.predict(X_test)

        # Distance error in pixels
        err_px = np.sqrt(((pred_rx - y_x_test) * SCREEN_W) ** 2 + ((pred_ry - y_y_test) * SCREEN_H) ** 2)
        ridge_errors_px.extend(err_px)

        # Model B: Random Forest Regressor (lightweight: 30 trees to avoid CPU strain)
        rf_x = RandomForestRegressor(n_estimators=30, max_depth=6, random_state=42).fit(X_train, y_x_train)
        rf_y = RandomForestRegressor(n_estimators=30, max_depth=6, random_state=42).fit(X_train, y_y_train)

        pred_rfx = rf_x.predict(X_test)
        pred_rfy = rf_y.predict(X_test)
        err_rf_px = np.sqrt(((pred_rfx - y_x_test) * SCREEN_W) ** 2 + ((pred_rfy - y_y_test) * SCREEN_H) ** 2)
        rf_errors_px.extend(err_rf_px)

    ridge_mean_px = np.mean(ridge_errors_px)
    ridge_median_px = np.median(ridge_errors_px)
    ridge_p90_px = np.percentile(ridge_errors_px, 90)

    rf_mean_px = np.mean(rf_errors_px)
    rf_median_px = np.median(rf_errors_px)
    rf_p90_px = np.percentile(rf_errors_px, 90)

    print("\n=======================================================")
    print("LOSOCV VALIDATION RESULTS (Independent Unseen Subjects):")
    print("=======================================================")
    print(f"Model A (Dual Ridge Regression):")
    print(f"  • Mean Pixel Error:   {ridge_mean_px:.1f} px")
    print(f"  • Median Pixel Error: {ridge_median_px:.1f} px")
    print(f"  • 90th %ile Error:    {ridge_p90_px:.1f} px")

    print(f"\nModel B (Random Forest Regressor):")
    print(f"  • Mean Pixel Error:   {rf_mean_px:.1f} px")
    print(f"  • Median Pixel Error: {rf_median_px:.1f} px")
    print(f"  • 90th %ile Error:    {rf_p90_px:.1f} px")

    # -------------------------------------------------------------
    # 2. Train Full Production Prior Model
    # -------------------------------------------------------------
    print("\n[TRAINING] Training full production baseline models on complete dataset...")
    final_ridge_x = Ridge(alpha=0.05).fit(X, y_x)
    final_ridge_y = Ridge(alpha=0.05).fit(X, y_y)

    joblib.dump(final_ridge_x, MODELS_DIR / "ridge_x.joblib")
    joblib.dump(final_ridge_y, MODELS_DIR / "ridge_y.joblib")

    # Export weights to JSON for direct EyeControl JavaScript/TypeScript engine integration
    export_metadata = {
        "model_type": "Dual Ridge Regression Prior",
        "alpha": 0.05,
        "feature_names": FEATURE_NAMES,
        "weights_x": final_ridge_x.coef_.tolist(),
        "intercept_x": float(final_ridge_x.intercept_),
        "weights_y": final_ridge_y.coef_.tolist(),
        "intercept_y": float(final_ridge_y.intercept_),
        "validation_metrics": {
            "losocv_mean_px": round(float(ridge_mean_px), 2),
            "losocv_median_px": round(float(ridge_median_px), 2),
            "losocv_p90_px": round(float(ridge_p90_px), 2)
        }
    }

    with open(MODELS_DIR / "eyecontrol_ridge_prior.json", "w") as f:
        json.dump(export_metadata, f, indent=2)

    print(f"[EXPORT SUCCESS] Production model exported to: {MODELS_DIR / 'eyecontrol_ridge_prior.json'}")

if __name__ == "__main__":
    print("=" * 60)
    print("EyeControl ML Lab — Baseline Model Training & Validation")
    print("=" * 60)
    train_and_evaluate_models()
