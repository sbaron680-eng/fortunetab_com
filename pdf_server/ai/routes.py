from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from .services.destiny_analyzer import (
    analyze_saju,
    analyze_compatibility,
    chat_with_saju
)


router = APIRouter(prefix="/ai", tags=["AI Analysis"])


class SajuAnalysisRequest(BaseModel):
    birth_year: int
    birth_month: int
    birth_day: int
    birth_hour: int
    analysis_type: Optional[str] = "full"


class CompatibilityRequest(BaseModel):
    birth_year1: int
    birth_month1: int
    birth_day1: int
    birth_hour1: int
    birth_year2: int
    birth_month2: int
    birth_day2: int
    birth_hour2: int


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    birth_year: int
    birth_month: int
    birth_day: int
    birth_hour: int
    message: str
    history: Optional[List[ChatMessage]] = None


@router.post("/analyze")
async def analyze(request: SajuAnalysisRequest):
    try:
        result = analyze_saju(
            birth_year=request.birth_year,
            birth_month=request.birth_month,
            birth_day=request.birth_day,
            birth_hour=request.birth_hour,
            analysis_type=request.analysis_type
        )
        return {"success": True, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/compatibility")
async def compatibility(request: CompatibilityRequest):
    try:
        result = analyze_compatibility(
            birth_year1=request.birth_year1,
            birth_month1=request.birth_month1,
            birth_day1=request.birth_day1,
            birth_hour1=request.birth_hour1,
            birth_year2=request.birth_year2,
            birth_month2=request.birth_month2,
            birth_day2=request.birth_day2,
            birth_hour2=request.birth_hour2
        )
        return {"success": True, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat")
async def chat(request: ChatRequest):
    try:
        history = None
        if request.history:
            history = [{"role": msg.role, "content": msg.content} for msg in request.history]
        
        result = chat_with_saju(
            birth_year=request.birth_year,
            birth_month=request.birth_month,
            birth_day=request.birth_day,
            birth_hour=request.birth_hour,
            user_message=request.message,
            conversation_history=history
        )
        return {"success": True, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/career")
async def career(request: SajuAnalysisRequest):
    try:
        result = analyze_saju(
            birth_year=request.birth_year,
            birth_month=request.birth_month,
            birth_day=request.birth_day,
            birth_hour=request.birth_hour,
            analysis_type="career"
        )
        return {"success": True, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))