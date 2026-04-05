const API_BASE = process.env.NEXT_PUBLIC_PDF_SERVER_URL || 'http://localhost:8710';

export interface SajuAnalysisRequest {
  birth_year: number;
  birth_month: number;
  birth_day: number;
  birth_hour: number;
  analysis_type?: 'full' | 'love' | 'career';
}

export interface CompatibilityRequest {
  birth_year1: number;
  birth_month1: number;
  birth_day1: number;
  birth_hour1: number;
  birth_year2: number;
  birth_month2: number;
  birth_day2: number;
  birth_hour2: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  birth_year: number;
  birth_month: number;
  birth_day: number;
  birth_hour: number;
  message: string;
  history?: ChatMessage[];
}

async function fetchWithTimeout(url: string, options: RequestInit, timeout = 30000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export async function analyzeSaju(data: SajuAnalysisRequest): Promise<{ success: boolean; result: string }> {
  const response = await fetchWithTimeout(`${API_BASE}/ai/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`분석 실패: ${response.status}`);
  }
  
  return response.json();
}

export async function analyzeCompatibility(data: CompatibilityRequest): Promise<{ success: boolean; result: string }> {
  const response = await fetchWithTimeout(`${API_BASE}/ai/compatibility`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`궁합 분석 실패: ${response.status}`);
  }
  
  return response.json();
}

export async function chatWithSaju(data: ChatRequest): Promise<{ success: boolean; result: string }> {
  const response = await fetchWithTimeout(`${API_BASE}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`대화 실패: ${response.status}`);
  }
  
  return response.json();
}

export async function analyzeCareer(data: SajuAnalysisRequest): Promise<{ success: boolean; result: string }> {
  const response = await fetchWithTimeout(`${API_BASE}/ai/career`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`직장운 분석 실패: ${response.status}`);
  }
  
  return response.json();
}