@echo off
setlocal

set VENV=c:\Users\Jayashanker\Downloads\eye\EyeControl_ML_Lab\venv\Scripts\python.exe
set LAB=c:\Users\Jayashanker\Downloads\eye\EyeControl_ML_Lab

echo ============================================
echo STEP 1: Register Jupyter kernel
echo ============================================
%VENV% -m ipykernel install --user --name eyecontrol_ml --display-name "Python 3 (EyeControl ML Lab)"
if %errorlevel% neq 0 (echo [FAIL] Kernel registration failed & goto :eof)
echo [OK] Kernel registered

echo.
echo ============================================
echo STEP 2: Download / generate dataset
echo ============================================
%VENV% %LAB%\scripts\download_dataset.py
if %errorlevel% neq 0 (echo [FAIL] download_dataset.py failed & goto :eof)
echo [OK] Dataset ready

echo.
echo ============================================
echo STEP 3: Preprocess
echo ============================================
%VENV% %LAB%\scripts\preprocess.py
if %errorlevel% neq 0 (echo [FAIL] preprocess.py failed & goto :eof)
echo [OK] Preprocessing done

echo.
echo ============================================
echo STEP 4: Train baseline model
echo ============================================
%VENV% %LAB%\scripts\train_baseline.py
if %errorlevel% neq 0 (echo [FAIL] train_baseline.py failed & goto :eof)
echo [OK] Training done

echo.
echo ============================================
echo STEP 5: Evaluate
echo ============================================
%VENV% %LAB%\scripts\evaluate.py
if %errorlevel% neq 0 (echo [FAIL] evaluate.py failed & goto :eof)
echo [OK] Evaluation done

echo.
echo ============================================
echo STEP 6: Export model
echo ============================================
%VENV% %LAB%\scripts\export_model_to_eyecontrol.py
if %errorlevel% neq 0 (echo [FAIL] export failed & goto :eof)
echo [OK] Export done

echo.
echo ============================================
echo ALL STEPS COMPLETED SUCCESSFULLY
echo ============================================
endlocal
