#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "============================================"
echo " FortuneTab 유료 플래너 PDF 생성 서버"
echo " http://localhost:8710"
echo "============================================"
echo ""

# 가상환경 활성화 (있으면)
if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
    echo "[OK] 가상환경 활성화"
else
    echo "[INFO] 가상환경 없음 - 시스템 Python 사용"
    echo "[TIP]  처음 실행 시: pip install -r requirements.txt"
fi

echo ""
echo "[START] 서버 시작 중..."
python -m uvicorn main:app --host 0.0.0.0 --port 8710 --reload
