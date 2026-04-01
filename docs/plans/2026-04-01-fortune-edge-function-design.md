# Fortune Edge Function 설계

## 개요
Supabase Edge Function으로 Claude API 기반 AI 운세 분석 API 구축.
로그인 사용자 전용 (JWT 인증).

## 아키텍처
```
fortune/page.tsx → supabase.functions.invoke('fortune', { body })
  → Edge Function (Deno) → Claude API (claude-sonnet-4-6) → JSON 응답
```

## 요청 타입
- `saju`: 사주 분석 (name, birth_date, birth_time, gender, year)
- `astrology`: 별자리 운세 (name, birth_date, zodiac, year)
- `couple`: 궁합 분석 (person1, person2, year)

## 응답
`{ ok: true, data: FortuneResult }` 또는 `{ ok: false, error: string }`

## 변경 파일
- Edge Function `fortune` (신규 배포)
- `src/app/fortune/page.tsx` (fetch → supabase.functions.invoke)
- Supabase secrets: ANTHROPIC_API_KEY
