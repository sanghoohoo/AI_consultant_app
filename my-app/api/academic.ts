// 생기부 관련 API 함수

import * as FileSystem from 'expo-file-system';
import {
  UploadResponse,
  TaskStatus,
  StudentDataResponse,
  StudentProfile,
} from '../types/schoolRecord';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * PDF 파일을 업로드하고 생기부 처리 시작
 */
export const uploadSchoolRecordPDF = async (
  fileUri: string,
  fileName: string,
  userEmail: string,
  accessToken: string
): Promise<UploadResponse> => {
  try {
    // FormData 생성
    const formData = new FormData();

    // 파일 추가 (React Native FormData 형식)
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: 'application/pdf',
    } as any);

    formData.append('user_email', userEmail);

    const response = await fetch(`${API_URL}/api/academic/upload-pdf`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`업로드 실패: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('PDF 업로드 오류:', error);
    throw new Error(error.message || '파일 업로드 중 오류가 발생했습니다.');
  }
};

/**
 * 작업 상태 확인 (폴링용)
 */
export const checkTaskStatus = async (
  taskId: string,
  accessToken: string
): Promise<TaskStatus> => {
  try {
    const response = await fetch(`${API_URL}/task-status/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`상태 확인 실패: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('작업 상태 확인 오류:', error);
    throw new Error(error.message || '작업 상태를 확인할 수 없습니다.');
  }
};

/**
 * 학생 데이터 조회
 */
export const fetchStudentData = async (
  accessToken: string
): Promise<StudentProfile | null> => {
  try {
    console.log('🔍 생기부 데이터 조회 시작:', `${API_URL}/api/academic/me/student-data`);

    const response = await fetch(`${API_URL}/api/academic/me/student-data`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('📡 API 응답 상태:', response.status);

    if (response.status === 404) {
      // 데이터가 없는 경우 (정상)
      console.log('❌ 404: 생기부 데이터가 없습니다');
      return null;
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API 오류:', response.status, errorText);
      throw new Error(`데이터 조회 실패: ${response.status}`);
    }

    const result: StudentDataResponse = await response.json();
    console.log('✅ API 응답 받음:', result);

    if (!result.success || !result.data) {
      console.log('❌ 응답 형식 오류:', { success: result.success, hasData: !!result.data });
      return null;
    }

    // API 응답을 StudentProfile 형식으로 변환
    const profile: StudentProfile = {
      personal_info: result.data['인적사항'], // 객체로 직접 할당
      attendance: result.data['출결상황']?.records || result.data['출결상황'],
      awards: result.data['수상경력']?.awards || result.data['수상경력'],
      certifications: result.data['자격증및인증취득상황']?.certifications || result.data['자격증및인증취득상황'],
      career_hopes: result.data['진로희망사항']?.career_hopes || result.data['진로희망사항'],
      creative_activities_autonomous: result.data['창의적체험활동상황']?.autonomous || result.data['창의적체험활동상황']?.자율활동,
      creative_activities_club: result.data['창의적체험활동상황']?.club || result.data['창의적체험활동상황']?.동아리활동,
      creative_activities_volunteer: result.data['창의적체험활동상황']?.volunteer || result.data['창의적체험활동상황']?.봉사활동,
      creative_activities_career: result.data['창의적체험활동상황']?.career || result.data['창의적체험활동상황']?.진로활동,
      subject_grades: result.data['교과학습발달상황']?.grades || result.data['교과학습발달상황'],
      reading_activities: result.data['독서활동상황']?.reading_activities || result.data['독서활동상황'],
      behavioral_traits: result.data['행동특성및종합의견']?.opinions || result.data['행동특성및종합의견'],
      grade_averages: result.data['내신등급평균']?.grade_averages || result.data['내신등급평균'],
    };

    console.log('✅ 생기부 데이터 파싱 완료:', profile);
    return profile;
  } catch (error: any) {
    console.error('❌ 학생 데이터 조회 오류:', error);
    throw new Error(error.message || '데이터를 불러올 수 없습니다.');
  }
};

/**
 * 학생 데이터 저장
 */
export const saveStudentData = async (
  data: StudentProfile,
  accessToken: string
): Promise<{ success: boolean; message?: string }> => {
  try {
    const response = await fetch(`${API_URL}/api/academic/me/student-data`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`데이터 저장 실패: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error('학생 데이터 저장 오류:', error);
    throw new Error(error.message || '데이터 저장 중 오류가 발생했습니다.');
  }
};

/**
 * 내신 등급 계산 트리거
 */
export const calculateGradeAverages = async (
  accessToken: string
): Promise<void> => {
  try {
    const response = await fetch(`${API_URL}/api/academic/me/calculate-grade-averages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`내신 계산 실패: ${response.status}`);
    }
  } catch (error: any) {
    console.error('내신 등급 계산 오류:', error);
    throw new Error(error.message || '내신 등급을 계산할 수 없습니다.');
  }
};

/**
 * 업로드 재시도 로직 (지수 백오프)
 */
export const uploadWithRetry = async (
  fileUri: string,
  fileName: string,
  userEmail: string,
  accessToken: string,
  maxRetries: number = 3
): Promise<UploadResponse> => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await uploadSchoolRecordPDF(fileUri, fileName, userEmail, accessToken);
    } catch (error: any) {
      lastError = error;

      if (attempt < maxRetries) {
        // 지수 백오프: 1초, 2초, 4초
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('업로드 실패');
};

/**
 * 작업 상태 폴링 (지수 백오프)
 */
export const pollTaskStatus = async (
  taskId: string,
  accessToken: string,
  maxAttempts: number = 40,
  onProgress?: (status: TaskStatus) => void
): Promise<TaskStatus> => {
  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      const status = await checkTaskStatus(taskId, accessToken);

      if (onProgress) {
        onProgress(status);
      }

      if (status.status === 'completed') {
        return status;
      }

      if (status.status === 'failed') {
        throw new Error(status.error || '처리 중 오류가 발생했습니다.');
      }

      // 지수 백오프: 1초, 2초, 4초, 8초, 최대 10초
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));

      attempt++;
    } catch (error: any) {
      console.error('상태 폴링 오류:', error);

      if (attempt >= maxAttempts - 1) {
        throw error;
      }

      // 에러 발생 시에도 재시도
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
      attempt++;
    }
  }

  throw new Error('처리 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.');
};