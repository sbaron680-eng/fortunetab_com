"""
사주 분석 API 테스트 스크립트
실행: python test_api.py

환경 변수 설정 필요:
- OPENAI_API_KEY=sk-...
"""

import os
import sys
sys.path.insert(0, '.')

from ai.services.destiny_analyzer import analyze_saju
from ai.services.saju_parser import parse_saju


def test_analyze_saju():
    print("=== 사주 분석 API 테스트 ===\n")
    
    # API 키 확인
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("❌ 오류: OPENAI_API_KEY 환경 변수가 설정되지 않았습니다.")
        print("\n설정 방법 (Windows):")
        print("  set OPENAI_API_KEY=sk-your-key-here")
        print("\n또는 .env 파일에 추가:")
        print("  OPENAI_API_KEY=sk-your-key-here")
        return
    
    print(f"✓ API Key 확인: {api_key[:10]}...")
    
    # 테스트
    year, month, day, hour = 1990, 5, 15, 14
    
    print(f"\n분석 요청: {year}년 {month}월 {day}일 {hour}시")
    print("-" * 40)
    
    try:
        print("⏳ 분석 중...")
        result = analyze_saju(year, month, day, hour, "full")
        
        print("\n=== 분석 결과 ===")
        print(result[:1000] + "..." if len(result) > 1000 else result)
        
    except Exception as e:
        print(f"❌ 오류: {e}")


if __name__ == "__main__":
    test_analyze_saju()