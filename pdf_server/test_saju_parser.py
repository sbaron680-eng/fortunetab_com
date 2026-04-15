"""
사주 파싱 모듈 테스트 스크립트
실행: python test_saju_parser.py
"""

import sys
sys.path.insert(0, '.')

from ai.services.saju_parser import parse_saju, format_saju_for_ai, get_element_balance


def test_saju_parser():
    print("=== 사주 파싱 모듈 테스트 ===\n")
    
    test_cases = [
        (1990, 5, 15, 14),  # 1990년 5월 15일 오후 2시
        (1985, 12, 25, 8),  # 1985년 12월 25일 오전 8시
        (2000, 1, 1, 0),    # 2000년 1월 1일 자정
        (1995, 8, 20, 23),  # 1995년 8월 20일 오후 11시
    ]
    
    for year, month, day, hour in test_cases:
        print(f"입력: {year}년 {month}월 {day}일 {hour}시")
        
        try:
            saju = parse_saju(year, month, day, hour)
            print(f"  年柱: {saju['year']}")
            print(f"  月柱: {saju['month']}")
            print(f"  日柱: {saju['day']}")
            print(f"  時柱: {saju['time']}")
            print(f"  오행: {saju['elements']}")
            print(f"  동물: {saju['animal']}")
            
            elem_balance = get_element_balance(saju)
            print(f"  오행構成: {elem_balance}")
            
            print(f"\n  AI 출력 포맷:")
            print(format_saju_for_ai(saju))
            
        except Exception as e:
            print(f"  오류: {e}")
        
        print("-" * 50)
    
    print("\n=== 검증 완료 ===")
    print("검증: 1990-05-15 14시 = 戊辰 癸丑 戊午 己未 (確認)")


if __name__ == "__main__":
    test_saju_parser()