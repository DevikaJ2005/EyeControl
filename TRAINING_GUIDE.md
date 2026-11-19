# EyeControl ML Lab — Training Guide

> **For:** Final-year CS students and developers working on the EyeControl assistive application.  
> **Environment:** Python 3.11.9 • Windows 10 • JupyterLab 4.6 • Ridge Regression baseline

---

## Table of Contents

1. [Quick Start — Open JupyterLab](#1-quick-start--open-jupyterlab)
2. [Project Structure](#2-project-structure)
3. [Which Notebook to Open First](#3-which-notebook-to-open-first)
4. [Running Each Notebook](#4-running-each-notebook)
5. [The Pipeline Scripts](#5-the-pipeline-scripts)
6. [Understanding the Feature Vector](#6-understanding-the-feature-vector)
7. [Datasets — What We Have and What We Need](#7-datasets--what-we-have-and-what-we-need)
8. [Exporting a Trained Model to EyeControl](#8-exporting-a-trained-model-to-eyecontrol)
9. [What Still Requires Manual Action](#9-what-still-requires-manual-action)
10. [Next Steps to Improve EyeControl](#10-next-steps-to-improve-eyecontrol)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Quick Start — Open JupyterLab

Open **Command Prompt** (not PowerShell) and run:

```bat
cd c:\Users\Jayashanker\Downloads\eye\EyeControl_ML_Lab
venv\Scripts\jupyter.exe lab
```

JupyterLab will open automatically in your default web browser at:

```
http://localhost:8888/
```

> **If the browser does not open automatically**, copy the URL shown in the terminal (it will look like `http://localhost:8888/lab?token=...`) and paste it into your browser.

> **Important:** Keep the terminal window open while JupyterLab is running. Closing the terminal will shut down the server.

**To use the correct Python kernel in any notebook:**
- Click the kernel selector in the top-right corner of the notebook.
- Select **"Python 3 (EyeControl ML Lab)"**.
- This ensures you use the venv with all packages installed.

---

## 2. Project Structure

```
EyeControl_ML_Lab/
├── data/
│   ├── raw/
│   │   └── mpiigaze_sample_features.csv    ← 1,350-row benchmark dataset
│   ├── processed/
│   │   └── eyecontrol_preprocessed.csv     ← cleaned, ready for training
│   └── calibration_samples/                ← put personal session CSVs here
├── models/
│   ├── ridge_x.joblib                      ← trained X-axis Ridge model
│   ├── ridge_y.joblib                      ← trained Y-axis Ridge model
│   ├── eyecontrol_ridge_prior.json         ← EyeControl-compatible export
│   ├── production_gaze_weights.json        ← simplified weight array
│   └── evaluation_benchmark_chart.png      ← performance visualisation
├── notebooks/
│   ├── 01_system_and_dataset_inspection.ipynb
│   ├── 02_dataset_visualisation.ipynb
│   ├── 03_preprocessing.ipynb
│   ├── 04_baseline_model.ipynb
│   ├── 05_model_comparison.ipynb
│   ├── 06_personal_calibration.ipynb
│   └── 07_final_evaluation.ipynb
├── scripts/
│   ├── download_dataset.py
│   ├── preprocess.py
│   ├── train_baseline.py
│   ├── evaluate.py
│   └── export_model_to_eyecontrol.py
├── venv/                                   ← Python 3.11.9 virtual environment
├── requirements.txt
├── SYSTEM_READINESS_REPORT.md
├── DATASET_RESEARCH_REPORT.md
└── TRAINING_GUIDE.md                       ← this file
```

---

## 3. Which Notebook to Open First

Always start with:

**`notebooks/01_system_and_dataset_inspection.ipynb`**

This notebook:
- Checks your Python version (must show 3.11.x)
- Verifies that all required packages are installed
- Loads the benchmark CSV and shows the first few rows
- Counts how many samples and subjects are present
- Reports any missing or corrupted data

Work through notebooks **in order**: 01 → 02 → 03 → 04 → 05 → 06 → 07.

---

## 4. Running Each Notebook

### To run one cell at a time:
Press **Shift + Enter** to run the current cell and move to the next.

### To run all cells at once:
Go to **Run menu → Run All Cells**.

### What each notebook does:

| Notebook | Purpose |
|---|---|
| `01` | Inspect hardware, dataset, image dimensions, labels |
| `02` | Visualise sample gaze targets and feature distributions |
| `03` | Preprocess features, normalise, remove outliers |
| `04` | Train a Ridge Regression baseline model |
| `05` | Compare Ridge vs Random Forest vs SVR |
| `06` | Record personal calibration sessions and fine-tune |
| `07` | Final evaluation: mean error, success rate, FPS |

---

## 5. The Pipeline Scripts

You can also run the pipeline from the command line without JupyterLab.  
Open **Command Prompt** in `EyeControl_ML_Lab` and run:

```bat
rem Step 1: Verify dataset
venv\Scripts\python.exe scripts\download_dataset.py

rem Step 2: Clean and prepare data
venv\Scripts\python.exe scripts\preprocess.py

rem Step 3: Train Ridge model (LOSOCV — may take 30–60 seconds)
venv\Scripts\python.exe scripts\train_baseline.py

rem Step 4: Evaluate the model
venv\Scripts\python.exe scripts\evaluate.py

rem Step 5: Export to EyeControl format
venv\Scripts\python.exe scripts\export_model_to_eyecontrol.py
```

> **Why LOSOCV?**  
> LOSOCV = Leave-One-Subject-Out Cross-Validation.  
> This tests whether your model works on a *new person* it has never seen before —  
> the most realistic test for an assistive application used by different users.

---

## 6. Understanding the Feature Vector

EyeControl uses exactly **12 features** to predict gaze position.  
These are computed by `EyeFeatureExtractor.ts` and match the training data exactly.

| # | Feature | Meaning |
|---|---|---|
| 1 | `dAvgX` | Average iris X offset from calibration centre |
| 2 | `dAvgY` | Average iris Y offset |
| 3 | `dLeftX` | Left iris X offset |
| 4 | `dLeftY` | Left iris Y offset |
| 5 | `dRightX` | Right iris X offset |
| 6 | `dRightY` | Right iris Y offset |
| 7 | `dYaw` | Head yaw angle (left-right turn) |
| 8 | `dPitch` | Head pitch angle (up-down tilt) |
| 9 | `dRoll` | Head roll angle (sideways tilt) |
| 10 | `leftOpenness` | Left eye openness ratio |
| 11 | `rightOpenness` | Right eye openness ratio |
| 12 | `faceScale` | Relative face size (distance proxy) |

**All coordinates are in normalised MediaPipe space** (0.0 to 1.0), not pixels.  
Do not mix pixel coordinates with normalised coordinates when processing data.

---

## 7. Datasets — What We Have and What We Need

### What we currently have

| Dataset | Status | Location | Rows |
|---|---|---|---|
| Benchmark CSV | ✅ Ready | `data/raw/mpiigaze_sample_features.csv` | 1,350 |

This benchmark CSV was generated to match the statistical properties of real MPIIGaze data.  
It is used for testing the pipeline and verifying that training scripts work.  
**It is not real recorded data and must not be used to claim accuracy on real users.**

### What you need to download (requires registration)

| Dataset | Why useful | How to access |
|---|---|---|
| **MPIIGaze** | 15 participants, real laptop webcam, normalised | Visit https://www.collaborative-ai.org/research/datasets/MPIIGaze/ and accept the academic licence |
| **MPIIFaceGaze** | Full-face images, good for head-pose features | Visit https://www.collaborative-ai.org/research/datasets/MPIIFaceGaze/ |
| **GazeCapture** | Large (1,474 participants, mobile devices) | Request access at https://gazecapture.csail.mit.edu/ |
| **EYEDIAP** | RGB webcam + depth, 16 participants | Requires institutional access at https://www.idiap.ch/en/scientific-research/data/eyediap |

> See `DATASET_RESEARCH_REPORT.md` for full details on each dataset.

### How to add your own personal calibration data

1. Run the EyeControl application and complete a 9-point calibration.
2. The app saves calibration samples to its local storage.
3. Export those samples as a CSV matching the 12-feature format.
4. Place the file in `data/calibration_samples/`.
5. Run notebook `06_personal_calibration.ipynb` to fine-tune the model on your data.

---

## 8. Exporting a Trained Model to EyeControl

After training, run:

```bat
venv\Scripts\python.exe scripts\export_model_to_eyecontrol.py
```

This produces:

```
models/eyecontrol_ridge_prior.json    ← Ridge coefficients in JSON format
models/production_gaze_weights.json   ← Simplified weight array for the app
```

To use the exported model in EyeControl:
1. Copy `models/eyecontrol_ridge_prior.json` to `EyeControl-Rebuild/src/ml/`.
2. Update `GazeModel.ts` to load coefficients from this file as the initial prior.
3. Run `npm run build` and test.

> **Never overwrite the EyeControl-Rebuild source files directly from this lab.**  
> Always review the exported JSON before integrating it.

---

## 9. What Still Requires Manual Action

| Action | Why | How |
|---|---|---|
| Register for MPIIGaze | Academic licence required | Visit https://www.collaborative-ai.org/research/datasets/MPIIGaze/ |
| Download MPIIGaze | ~3.6 GB compressed | Use the link emailed after registration |
| Record personal calibration | Real data needed for personalised model | Use the EyeControl app calibration screen |
| Validate accuracy on screen | Only real selection tests count | Test with at least 3 calibration sessions × 9 targets |

---

## 10. Next Steps to Improve EyeControl

### Immediate (can be done now)

1. **Run all 7 notebooks** in order and verify no errors occur.
2. **Record your own calibration session** using the EyeControl app (3 sessions minimum).
3. **Run notebook 06** with your personal calibration data.
4. **Compare prediction error** (notebook 07) before and after personal fine-tuning.

### Medium term (after dataset access)

5. **Register and download MPIIGaze** after accepting the academic licence.
6. **Re-run preprocess.py and train_baseline.py** with the real dataset.
7. **Run notebook 05** to compare Ridge vs Random Forest on real data.
8. **Export the best model** and integrate it into EyeControl.

### Longer term (advanced)

9. **Experiment with a small CNN** using MPIIFaceGaze images (requires Google Colab if you stay on this laptop).
10. **Collect multi-session personal data** (5+ sessions) for personalised head-pose-aware gaze estimation.
11. **Implement drift correction** — recalibrate automatically when tracking confidence drops below threshold.

---

## 11. Troubleshooting

### JupyterLab does not open

```bat
rem Check that the venv is intact
venv\Scripts\python.exe --version

rem Re-launch manually
venv\Scripts\jupyter.exe lab --no-browser --port=8888
rem Then open: http://localhost:8888/ in your browser
```

### Wrong kernel selected in notebook

- Click the kernel name in the top-right corner of the notebook.
- Select **"Python 3 (EyeControl ML Lab)"**.
- If it is missing, re-register it:
  ```bat
  venv\Scripts\python.exe -m ipykernel install --user --name eyecontrol_ml --display-name "Python 3 (EyeControl ML Lab)"
  ```

### `ModuleNotFoundError` in a notebook

The wrong kernel is selected. See above.

### Training is slow

Normal. LOSOCV on 1,350 rows and 15 subjects takes 30–60 seconds on Core i3.  
Do not interrupt it. It will complete.

### `preprocess.py` says "No input file found"

Run `download_dataset.py` first. It creates the benchmark CSV.

### PowerShell commands hang

Always use **Command Prompt (`cmd`)**, not PowerShell, for running Python scripts in this project.

---

*EyeControl ML Lab — created November 2026*  
*Python 3.11.9 • scikit-learn 1.9 • JupyterLab 4.6 • Ridge Regression*
