import os
from typing import Optional
from openai import OpenAI
from .saju_parser import parse_saju, format_saju_for_ai


client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


SYSTEM_PROMPT_PATH = os.path.join(os.path.dirname(__file__), "..", "prompts", "saju_system.md")


def load_system_prompt() -> str:
    with open(SYSTEM_PROMPT_PATH, "r", encoding="utf-8") as f:
        return f.read()


def analyze_saju(
    birth_year: int,
    birth_month: int,
    birth_day: int,
    birth_hour: int,
    analysis_type: str = "full"
) -> str:
    saju = parse_saju(birth_year, birth_month, birth_day, birth_hour)
    saju_info = format_saju_for_ai(saju)
    
    system_prompt = load_system_prompt()
    
    if analysis_type == "full":
        user_prompt = f"""
{saju_info}

위의 사주를 바탕으로 다음 항목들을 상세하게 분석해주세요:
1. 기본 성격과 장단점
2. 연애운/결혼운
3. 직장운/사업운
4. 금전운
5. 건강운
6. 조언과 마무리
"""
    elif analysis_type == "love":
        user_prompt = f"""
{saju_info}

연애와 결혼에 초점을 맞추어 분석해주세요:
1. 연애 스타일
2. 이상형 유형
3. 결혼適龄
4. 연애 시 주의점
5. 적합한 결혼 상대를 찾는 방법
"""
    elif analysis_type == "career":
        user_prompt = f"""
{saju_info}

직장/사업에 초점을 맞추어 분석해주세요:
1. 적절한 직업 분야
2. 조직 내 적응 스타일
3. 승진/사업 성공运气
4. 주요 고민과 해결 방안
5. 구체적 실천 조언
"""
    else:
        user_prompt = f"""
{saju_info}

전체적인 사주 분석을 제공해주세요.
"""
    
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.7,
        max_tokens=2000
    )
    
    return response.choices[0].message.content


def analyze_compatibility(
    birth_year1: int,
    birth_month1: int,
    birth_day1: int,
    birth_hour1: int,
    birth_year2: int,
    birth_month2: int,
    birth_day2: int,
    birth_hour2: int
) -> str:
    saju1 = parse_saju(birth_year1, birth_month1, birth_day1, birth_hour1)
    saju2 = parse_saju(birth_year2, birth_month2, birth_day2, birth_hour2)
    
    saju_info1 = format_saju_for_ai(saju1)
    saju_info2 = format_saju_for_ai(saju2)
    
    system_prompt = load_system_prompt()
    
    user_prompt = f"""
**첫 번째 사람:**
{saju_info1}

**두 번째 사람:**
{saju_info2}

두 사람의 사주를 바탕으로 궁합을 분석해주세요:
1. 오행상生剋 관계
2. 일주합 여부
3. 해피라인 여부
4. 신살/장애 확인
5. 종합 점수와 결론
6. 서로 맞춰가는 방법
"""
    
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.7,
        max_tokens=2000
    )
    
    return response.choices[0].message.content


def chat_with_saju(
    birth_year: int,
    birth_month: int,
    birth_day: int,
    birth_hour: int,
    user_message: str,
    conversation_history: list = None
) -> str:
    saju = parse_saju(birth_year, birth_month, birth_day, birth_hour)
    saju_info = format_saju_for_ai(saju)
    
    system_prompt = load_system_prompt()
    
    messages = [
        {"role": "system", "content": system_prompt + f"\n\n사용자의 사주 정보:\n{saju_info}"}
    ]
    
    if conversation_history:
        for msg in conversation_history:
            messages.append(msg)
    
    messages.append({"role": "user", "content": user_message})
    
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        temperature=0.8,
        max_tokens=1500
    )
    
    return response.choices[0].message.content