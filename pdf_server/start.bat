@echo off
title FortuneTab PDF Server
echo ============================================
echo  FortuneTab 유료 플래너 PDF 생성 서버
echo  http://localhost:8710
echo ============================================
echo.

cd /d "%~dp0"

:: 가상환경이 있으면 활성화
if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
    echo [OK] 가상환경 활성화
) else (
    echo [INFO] 가상환경 없음 - 시스템 Python 사용
    echo [TIP]  처음 실행 시: pip install -r requirements.txt
)

echo.
echo [START] 서버 시작 중...
python -m uvicorn main:app --host 0.0.0.0 --port 8710 --reload

pause
