import { supabase } from '../lib/supabaseClient';
import { Course } from '../types/timetable';

// 시간표 데이터 가져오기
export const getTimetable = async (userId: string, grade: number, semester: number) => {
  const { data, error } = await supabase
    .from('timetables')
    .select('courses')
    .eq('user_id', userId)
    .eq('grade', grade)
    .eq('semester', semester)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116: row not found
    throw error;
  }

  return data ? data.courses : null;
};

// 시간표 데이터 저장 (생성 또는 업데이트)
export const saveTimetable = async (userId: string, grade: number, semester: number, courses: Course[]) => {
  const { data, error } = await supabase
    .from('timetables')
    .upsert({
      user_id: userId,
      grade,
      semester,
      courses,
      updated_at: new Date(),
    }, {
      onConflict: 'user_id,grade,semester',
    })
    .select();

  if (error) {
    throw error;
  }

  return data;
};