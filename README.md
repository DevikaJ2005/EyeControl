# EyeControl-Rebuild

An accessible, webcam-based assistive communication website for people with limited or no upper-limb mobility (ALS, cerebral palsy, spinal cord injury, muscular dystrophy).

## Key Architectural Principles

1. **Dual Independent Input Modes**:
   - Eye-gaze control (iris tracking + head pose compensation + personalized Ridge regression + OneEuroFilter).
   - Head-movement control (facial transformation matrix yaw/pitch + dead zone + OneEuroFilter).
2. **100% Local Processing & Privacy**:
   - Zero facial data leaves the machine. No cloud tracking APIs, no external CDN dependencies for models or WASM.
   - MediaPipe Face Landmarker model (`face_landmarker.task`) and WASM binaries served locally.
3. **Rigorous Validation & No Fake Tracking**:
   - Real-time confidence estimation based on face presence, iris geometry, blink detection, and pose stability.
   - Independent validation on held-out target coordinates.
   - Measurable target selection accuracy.
   - Saved eye calibrations include the neutral baseline and feature version; legacy calibrations require recalibration.
4. **Accessible Selection Engine**:
   - Dwell selection (adjustable 1.0s – 3.0s, default 1.5s) with circular progress indicators.
   - Accidental selection lockouts, blink suspension, rest mode, and reading mode lockouts.
5. **Six Dedicated Screens**:
   - `/setup`: Camera detection, positioning guidelines, lighting check, input mode selection.
   - `/calibration`: 9-point & 17-point eye calibration or head neutral calibration with independent validation.
   - `/home`: 3 large action cards (Speak, Read & Watch, Help) + status + rest/settings.
   - `/speak`: High-contrast AAC phrase board with Web Speech API TTS, categories, clear/repeat.
   - `/explore`: News reader with reading protection mode and curated video player.
   - `/help`: High-visibility emergency assistance screen with deliberate confirmation and emergency contact.
   - Accessible Settings Drawer for dwell time, speech voices, sensitivity, and calibration management.

## Running on Windows

```powershell
cd EyeControl-Rebuild
npm install
npm run dev
```

Run automated tests:
```powershell
npm test
```
