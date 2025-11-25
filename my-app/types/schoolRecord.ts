// 생기부 관련 타입 정의

// 수능 과목별 점수
export interface SubjectScore {
  grade: string;
  percentile?: string;
}

// 수능 정보
export interface SuneungData {
  korean: SubjectScore;
  math: SubjectScore;
  english: { grade: string };
  koreanHistory: { grade: string };
  inquiry1: SubjectScore;
  inquiry2: SubjectScore;
}

// 학생 기본 정보
export interface StudentBasicInfo {
  id?: string;
  user_profile_id?: string;
  student_name?: string;
  school_name?: string | null;
  gender?: string;
  address?: string;
  graduation_year?: number | null;
  created_at?: string;
  updated_at?: string;
  // 하위 호환성을 위한 필드
  name?: string;
  school?: string;
  grade?: number;
  birth_date?: string;
}

// 출결 상황
export interface StudentAttendance {
  grade_level: number;
  class_days?: number;
  absence_days?: number;
  lateness?: number;
  early_leave?: number;
  class_absence?: number;
  disease_absence?: number;
  other_absence?: number;
  disease_absence_days?: number;
  other_absence_days?: number;
}

// 수상 경력
export interface StudentAward {
  grade_level: number;
  award_name: string;
  rank?: string;
  awarding_institution?: string;
  date?: string;
  participation_number?: number;
}

// 자격증
export interface StudentCertification {
  grade_level: number;
  type?: string;
  name: string;
  acquisition_date?: string;
  issuing_institution?: string;
}

// 진로 희망 사항
export interface StudentCareerHope {
  grade_level: number;
  student_hope?: string;
  parent_hope?: string;
  reason?: string;
}

// 창의적 체험활동 - 자율활동
export interface StudentCreativeActivityAutonomous {
  grade_level: number;
  activity_type: string;
  activity_details: string;
}

// 창의적 체험활동 - 동아리활동
export interface StudentCreativeActivityClub {
  grade_level: number;
  activity_type: string;
  club_name?: string;
  activity_details: string;
}

// 창의적 체험활동 - 봉사활동
export interface StudentCreativeActivityVolunteer {
  grade_level: number;
  place_or_agency?: string;
  hours?: number;
  activity_details: string;
}

// 창의적 체험활동 - 진로활동
export interface StudentCreativeActivityCareer {
  grade_level: number;
  activity_type: string;
  activity_details: string;
}

// 교과 학습 발달 상황
export interface StudentSubject {
  grade_level: number;
  semester: number;
  subject_name: string;
  credits?: number;
  achievement?: string;
  achievement_score?: number;
  average_score?: number;
  standard_deviation?: number;
  rank?: number;
  total_students?: number;
  notes?: string;
}

// 독서 활동
export interface StudentReadingActivity {
  grade_level: number;
  book_title_and_author: string;
  subject_or_area?: string;
}

// 행동 특성 및 종합 의견
export interface StudentOpinion {
  grade_level: number;
  opinion: string;
}

// 내신 등급 평균
export interface StudentGradeAverage {
  grade_level: number;
  semester?: number;
  average_type: string;
  grade_average: number;
}

// 전체 학생 프로필
export interface StudentProfile {
  personal_info?: StudentBasicInfo;
  attendance?: StudentAttendance[];
  awards?: StudentAward[];
  certifications?: StudentCertification[];
  career_hopes?: StudentCareerHope[];
  creative_activities_autonomous?: StudentCreativeActivityAutonomous[];
  creative_activities_club?: StudentCreativeActivityClub[];
  creative_activities_volunteer?: StudentCreativeActivityVolunteer[];
  creative_activities_career?: StudentCreativeActivityCareer[];
  subject_grades?: StudentSubject[];
  reading_activities?: StudentReadingActivity[];
  behavioral_traits?: StudentOpinion[];
  grade_averages?: StudentGradeAverage[];
}

// PDF 업로드 응답
export interface UploadResponse {
  success: boolean;
  total_records?: number;
  message: string;
  task_id?: string;
}

// 작업 상태
export interface TaskStatus {
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  current_step: string;
  error?: string;
}

// API 응답 (학생 데이터 조회)
export interface StudentDataResponse {
  success: boolean;
  data?: {
    '인적사항'?: StudentBasicInfo | StudentBasicInfo[];
    '출결상황'?: { records: StudentAttendance[] } | StudentAttendance[];
    '수상경력'?: { awards: StudentAward[] } | StudentAward[];
    '자격증및인증취득상황'?: { certifications: StudentCertification[] } | StudentCertification[];
    '진로희망사항'?: { career_hopes: StudentCareerHope[] } | StudentCareerHope[];
    '창의적체험활동상황'?: {
      autonomous?: StudentCreativeActivityAutonomous[];
      club?: StudentCreativeActivityClub[];
      volunteer?: StudentCreativeActivityVolunteer[];
      career?: StudentCreativeActivityCareer[];
      자율활동?: StudentCreativeActivityAutonomous[];
      동아리활동?: StudentCreativeActivityClub[];
      봉사활동?: StudentCreativeActivityVolunteer[];
      진로활동?: StudentCreativeActivityCareer[];
    };
    '교과학습발달상황'?: { grades: StudentSubject[] } | StudentSubject[];
    '독서활동상황'?: { reading_activities: StudentReadingActivity[] } | StudentReadingActivity[];
    '행동특성및종합의견'?: { opinions: StudentOpinion[] } | StudentOpinion[];
    '내신등급평균'?: { grade_averages: StudentGradeAverage[] } | StudentGradeAverage[];
  };
  message?: string;
}