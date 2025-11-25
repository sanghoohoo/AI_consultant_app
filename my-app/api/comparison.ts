// api/comparison.ts

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

// ===== Types =====

export interface InterestMajor {
  university: string;
  department: string;
}

export interface SetInterestMajorRequest {
  university: string;
  department: string;
  admission_type?: string;
}

// Backend returns these structures from database RPCs
export interface GradeStats {
  total_applicants?: number;
  avg_grade_average?: number;
  min_grade?: number;
  max_grade?: number;
}

export interface UserGrade {
  user_grade_average?: number;
  percentile_rank?: number;
}

export interface MockExamStats {
  user_avg_percentile?: number;
}

export interface ComparativeStats {
  major: InterestMajor;
  grade_stats: GradeStats | null;
  user_grade: UserGrade | null;
  mock_exam_stats: MockExamStats;
}

export interface PersonaTrait {
  trait: string;
  user_strength: number;
  average_strength: number;
  status: 'strong' | 'average' | 'weak';
}

export interface PersonaComparison {
  major: InterestMajor;
  traits: PersonaTrait[];
  overall_match: number;
  recommendations: string[];
}

export interface ComparisonReport {
  success: boolean;
  report: {
    raw: string;
    strengths: string[];
    improvements_needed: string[];
    recommended_activities: string[];
  };
  generated_at: string;
  message?: string;
}

// ===== API Functions =====

/**
 * 관심학과 설정
 */
export const setInterestMajor = async (
  request: SetInterestMajorRequest,
  token: string
): Promise<{ success: boolean; message: string; major?: InterestMajor }> => {
  const response = await fetch(`${API_URL}/api/interest-major`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || '관심학과 설정에 실패했습니다.');
  }

  return response.json();
};

/**
 * 현재 설정된 관심학과 조회
 */
export const getInterestMajor = async (
  token: string
): Promise<{ success: boolean; message?: string; major: InterestMajor | null }> => {
  const response = await fetch(`${API_URL}/api/interest-major`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('관심학과 조회에 실패했습니다.');
  }

  return response.json();
};

/**
 * 관심학과 삭제
 */
export const clearInterestMajor = async (
  token: string
): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_URL}/api/interest-major`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('관심학과 삭제에 실패했습니다.');
  }

  return response.json();
};

/**
 * 성적 비교 통계 조회
 */
export const getComparativeStats = async (
  token: string
): Promise<ComparativeStats> => {
  const response = await fetch(`${API_URL}/api/comparative-stats`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    let errorMessage = '성적 비교 조회에 실패했습니다.';
    try {
      const text = await response.text();
      const error = JSON.parse(text);
      errorMessage = error.detail || errorMessage;
    } catch (e) {
      // JSON 파싱 실패 시 기본 메시지 사용
      console.error('API Error (non-JSON):', response.status, response.statusText);
    }
    throw new Error(errorMessage);
  }

  return response.json();
};

/**
 * 생기부 특성 비교
 */
export const getPersonaComparison = async (
  token: string
): Promise<PersonaComparison> => {
  const response = await fetch(`${API_URL}/api/persona-comparison`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || '생기부 비교 조회에 실패했습니다.');
  }

  return response.json();
};

/**
 * 종합 비교 리포트 생성
 */
export const generateComparisonReport = async (
  token: string
): Promise<ComparisonReport> => {
  const response = await fetch(`${API_URL}/api/persona-comparison-report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || '종합 리포트 생성에 실패했습니다.');
  }

  return response.json();
};