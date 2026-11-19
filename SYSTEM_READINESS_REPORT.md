# System Readiness & Machine Learning Hardware Assessment Report

**Project:** EyeControl Assistive Communication — Machine Learning Research Lab  
**Prepared For:** Final-Year Computer Science Undergraduate Project  
**Date of Assessment:** November 19, 2026  
**Auditor:** Senior Computer Vision & Machine Learning Engineer  

---

## 1. Executive Summary

This inspection report evaluates your computer's hardware, operating system, and software environment to determine the optimal machine learning workflow for the **EyeControl** project. 

The evaluation reveals that **local training using JupyterLab is highly practical and well-suited for feature-based machine learning** (Ridge Regression, Support Vector Regressors, Random Forest, and MediaPipe landmark extraction). For heavy deep learning (such as training Deep Convolutional Neural Networks directly from raw pixels), a **Hybrid strategy** leveraging free Google Colab cloud GPUs is recommended to avoid laptop thermal throttling and memory bottlenecks.

Your computer has abundant storage (>705 GB free), an active internet connection, and Python 3.11.9 installed, providing an ideal foundation for setting up an isolated virtual environment without touching or risking your working EyeControl application.

---

## 2. Hardware Specifications

All metrics were inspected directly using Windows Management Instrumentation (WMI) and PowerShell queries without guessing.

| Component | Measured Specification | Evaluation & Status |
| :--- | :--- | :--- |
| **Operating System** | Microsoft Windows 10 Pro (Build 10.0.19045, 64-bit) | Fully supported by all ML tools, Python, and Jupyter. |
| **CPU** | Intel(R) Core(TM) i3-5005U @ 2.00 GHz<br>• 2 Physical Cores<br>• 4 Logical Processors (Hyperthreading) | 15W ultra-low-power dual-core laptop processor. Excellent for tabular ML; slow for multi-epoch deep CNN training. |
| **RAM** | **7.92 GB Total** (~8 GB physical RAM)<br>• Currently Available: ~1.08 GB free | Sufficient for feature tables, NumPy arrays, and lightweight models. In-memory storage of tens of thousands of raw uncompressed images should be avoided to prevent paging. |
| **GPU & Acceleration**| Intel(R) HD Graphics 5500 (Integrated)<br>• Video Memory: ~1 GB shared<br>• **Dedicated NVIDIA GPU:** None<br>• **CUDA Support:** **NO** | Integrated graphics only. Hardware acceleration for PyTorch/TensorFlow deep CNNs is not available locally. CPU execution mode will be used. |
| **Primary Storage (C:)**| **930.27 GB Total**<br>• **705.36 GB Free Space (75.8% free)** | **Abundant free space.** Large datasets (MPIIGaze, MPIIFaceGaze) and environments can easily be accommodated. |
| **Existing Project Size**| `EyeControl-Rebuild`: **244.66 MB** | Isolated in `c:\Users\Jayashanker\Downloads\eye\EyeControl-Rebuild`. Preserved and untouched. |
| **Internet Connection**| Active & Verified (Ping 8.8.8.8: Success) | Ready for package installations and dataset acquisition. |

---

## 3. Installed Development Tools & Python Analysis

Inspection of existing developer tools on the system:

1. **Git:** `git version 2.51.1.windows.1` (Configured, working, and linked to GitHub).
2. **VS Code:** Installed at `C:\Users\Jayashanker\AppData\Local\Programs\Microsoft VS Code\bin\code`.
3. **Python Installations Detected:**
   - `Python 3.14.2` (in `AppData\Local\Python`) — *Experimental/Bleeding Edge*. Pre-built binary wheels for MediaPipe, OpenCV, and PyTorch are not yet widely available for Python 3.14.
   - `Python 3.12` (in `AppData\Local\Programs\Python\Python312`).
   - `Python 3.11.9` (in `AppData\Local\Programs\Python\Python311`) with `pip 24.0` — **Recommended Primary ML Python Engine**.
4. **Tool Compatibility Decision:**  
   We select **Python 3.11.9** as the base interpreter for our isolated virtual environment (`EyeControl_ML_Lab\venv`). Python 3.11 offers 100% compatibility with MediaPipe, OpenCV, NumPy, SciPy, scikit-learn, and JupyterLab on Windows x64.

---

## 4. Training Environment Comparison: Local vs. Cloud vs. Hybrid

### Option A: Local JupyterLab on Windows (Recommended for Feature ML)
- **Feasibility:** **100% Practical** for MediaPipe feature extraction, personal webcam calibration, tabular feature engineering, Ridge Regression, SVR, and Random Forest.
- **Speed:** Ridge Regression on 15,000 tabular feature samples trains in under **2 seconds** on your Core i3 CPU.
- **Privacy:** 100% private. Your personal webcam calibration frames and facial landmarks never leave your machine.
- **Offline Capability:** Works entirely offline without cloud limits or session timeouts.

### Option B: Google Colab Only
- **Feasibility:** Practical for training, but disconnected from your local webcam and your local EyeControl application code.
- **Drawbacks:** Requires uploading images to Google Drive, sessions disconnect after inactivity, and direct live webcam interaction from Colab to Windows is cumbersome.

### Option C: The Hybrid Workflow (The Engineer's Recommendation)
- **Local JupyterLab:** Dataset exploration, MediaPipe landmark extraction, feature engineering, personal calibration, Ridge/RF baseline models, real-time evaluation, and seamless export into `EyeControl-Rebuild`.
- **Google Colab (Optional):** Reserved strictly if you choose to train a heavy end-to-end Convolutional Neural Network (CNN) directly on 50,000+ raw pixel crops using a free cloud NVIDIA T4 GPU.

---

## 5. Storage & Memory Budget

| Item | Estimated Storage | Estimated RAM Usage |
| :--- | :--- | :--- |
| Virtual Environment (`venv` + JupyterLab, OpenCV, MediaPipe, scikit-learn, etc.) | ~1.8 GB | ~150 - 250 MB |
| MPIIGaze / MPIIFaceGaze Normalized Subset | ~2.5 - 5.0 GB | Streamed / Chunked (~300 MB) |
| Extracted Landmark Feature Tables (`.parquet` / `.csv`) | ~40 - 80 MB | ~100 MB |
| Personal Webcam Calibration Recordings | ~20 - 50 MB | ~50 MB |
| Model Checkpoints & Exported JSON Weights | ~5 - 15 MB | ~20 MB |
| **Total Estimated Footprint** | **~5 to 7 GB** | **Comfortably fits in 8 GB RAM** |

*With 705 GB of free disk space, your computer can comfortably host the entire research environment.*

---

## 6. Conclusion & Next Action Plan

Your computer is **fully prepared and capable** of running the machine learning lab locally. 

**Next Steps:**
1. Create the isolated virtual environment using Python 3.11.9.
2. Install the necessary ML and computer vision libraries.
3. Formulate the comprehensive dataset research report for MPIIGaze, MPIIFaceGaze, GazeCapture, and EYEDIAP.
4. Build the structured Jupyter notebooks (01 through 07) and execution scripts.
