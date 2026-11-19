# Public Eye-Gaze Dataset Research & Engineering Assessment Report

**Project:** EyeControl Machine Learning Training & Adaptation  
**Target Device:** Standard Laptop Webcam (640 × 480 @ 12-30 FPS)  
**Target Environment:** Windows 10, Core i3 CPU, Local Python/JupyterLab  
**Author:** Senior Machine Learning & Assistive Technology Researcher  

---

## 1. Comparative Dataset Matrix

| Dataset | Primary Source | Participants & Samples | Camera & Conditions | Download Size | Access & License | Suitability for Laptop Webcam | Suitability for EyeControl |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **MPIIGaze** | Collaborative AI / MPI-INF | 15 subjects<br>213,659 frames | Built-in laptop webcams<br>Everyday natural illumination | **~2.6 GB** (Evaluation subset)<br>~18 GB (Full raw) | Non-commercial academic research.<br>Direct download with license acceptance. | **EXCELLENT (10/10)**<br>Specifically recorded on laptop webcams. | **VERY HIGH**<br>Matches webcam distance and natural head motions. |
| **MPIIFaceGaze** | Collaborative AI / MPI-INF | 15 subjects<br>37,667 face crops | Built-in laptop webcams<br>Natural laptop usage | **~5.2 GB** (Full subset) | Academic research only.<br>Direct download with license acceptance. | **EXCELLENT (10/10)**<br>Full-face context at 224×224. | **HIGHEST (10/10)**<br>Directly matches EyeControl's dual-view face+eye design. |
| **GazeCapture** | MIT CSAIL | 1,450+ subjects<br>2.4M frames | Mobile phones / Tablets<br>(iPhone & iPad front cameras) | **~140 GB** | **Requires manual institutional approval** & formal Data User Agreement. | **MODERATE (6/10)**<br>Mobile optics & hand-held distance differ from laptop webcams. | **LOW-MEDIUM**<br>Huge storage footprint; mobile screen coordinates differ from laptop displays. |
| **EYEDIAP** | Idiap Research Institute | 16 subjects<br>94 video sessions | HD RGB webcam + Kinect<br>Controlled lab environment | **~40 GB** (Videos) | Academic license with Idiap registration. | **GOOD (7/10)**<br>Has screen-target sessions. | **MEDIUM**<br>Raw video format requires heavy video parsing; large download. |

> [!CAUTION]
> **Important Dataset Clarification regarding BraTS:**  
> The BraTS (Brain Tumor Segmentation) dataset is a clinical neuro-imaging MRI benchmark for brain oncology. It contains zero eye-gaze or facial tracking data. It must never be used or downloaded for EyeControl.

---

## 2. In-Depth Evaluation of Each Candidate

### Candidate 1: MPIIGaze (Primary Baseline Candidate)
- **Official Portal:** `https://www.collaborative-ai.org/research/datasets/MPIIGaze/`
- **What it contains:** Over 213,000 real-world frames captured from 15 laptop users over the course of several months during regular daily work.
- **Recording Environment:** Users worked in home offices, universities, and dormitories across varying day and night lighting conditions with zero artificial constraints.
- **Annotations Provided:**
  - 2D gaze targets on screen (in screen pixels: $(x, y)$ coordinate system).
  - 3D head pose rotation vectors and translation vectors.
  - 3D gaze direction vectors in camera coordinate space.
  - 6 facial landmarks (corners of both eyes, mouth corners).
  - Pre-normalized eye patches ($60 \times 36$ pixels).
- **Engineering Verdict for EyeControl:**  
  MPIIGaze is the **premier real-world benchmark** for laptop eye tracking. The recording geometry (laptop screen below webcam, user sitting 45–60 cm away) is identical to your EyeControl user profile.

---

### Candidate 2: MPIIFaceGaze (Optimal for Dual-View Face + Eye Pipeline)
- **Official Portal:** `https://www.collaborative-ai.org/research/datasets/MPIIFaceGaze/`
- **What it contains:** The standardized full-face extension of MPIIGaze. Contains 37,667 normalized full-face images ($224 \times 224$ pixels) evenly sampled across the 15 participants (~2,500 images per person).
- **Annotations Provided:**
  - 3D gaze target and direction.
  - 3D head pose.
  - Screen gaze coordinates $(x, y)$ in mm and pixels.
  - Camera intrinsic calibration matrices.
- **Engineering Verdict for EyeControl:**  
  Because EyeControl already uses MediaPipe FaceMesh to extract face bounding boxes and eye ROIs, MPIIFaceGaze allows us to run MediaPipe directly on the dataset images and generate the **exact same 12-dimensional feature vector** (`leftIrisX`, `leftIrisY`, `rightIrisX`, `rightIrisY`, `leftOpenness`, `rightOpenness`, `headYaw`, `headPitch`, `headRoll`, `faceCenterX`, `faceCenterY`, `faceScale`) that EyeControl computes in real time!

---

### Candidate 3: GazeCapture (MIT CSAIL)
- **Official Portal:** `https://gazecapture.csail.mit.edu/`
- **Characteristics:** Unprecedented scale (1,450 subjects, 2.4 million frames).
- **Why it is NOT recommended for Phase 1:**
  1. **Storage Footprint:** ~140 GB download. While your disk has 705 GB free, downloading and unpacking 140 GB takes hours and creates excessive I/O overhead on a dual-core laptop.
  2. **Domain Gap:** GazeCapture was captured on handheld mobile devices (iPhone/iPad). Users hold mobile devices closer (20–35 cm) at varying tilt angles. EyeControl operates on stationary laptop screens at 50–65 cm.
  3. **Access Wall:** Requires manual institutional approval from MIT CSAIL administrators, taking several days to weeks.

---

### Candidate 4: EYEDIAP (Idiap Research Institute)
- **Official Portal:** `https://www.idiap.ch/en/scientific-research/data/eyediap`
- **Characteristics:** 94 sessions from 16 participants. Contains both floating target (3D ball) and screen target sessions.
- **Why it is secondary:** The screen-target subset is distributed as raw video archives (~40 GB). Extracting frames and synchronizing timestamps introduces significant preprocessing overhead compared to the clean `.mat` and `.h5` files of MPIIGaze.

---

## 3. Recommended Dataset Strategy for EyeControl

To maximize tracking accuracy while respecting your computer's dual-core CPU:

1. **Step 1: Download the MPIIFaceGaze / MPIIGaze Evaluation Subset (~2.5 GB).**
   - Contains pre-computed normalized crops and ground-truth screen gaze coordinates.
2. **Step 2: Generate Compatible MediaPipe Landmark Features.**
   - Run our automated preprocessing script to extract the exact EyeControl feature vector from the dataset frames.
3. **Step 3: Combine with Personal Calibration Samples.**
   - Combine generic dataset weights (pre-trained prior) with 9-point personal webcam calibration data from the user. This "transfer calibration" eliminates inter-person differences (cornea curvature, camera mounting angle) while retaining the robust head-pose compensation learned from MPIIGaze.
