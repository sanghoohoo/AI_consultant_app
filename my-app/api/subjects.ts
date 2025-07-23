
import { supabase } from '../lib/supabaseClient';

export interface Subject {
  id: string;
  name: string;
  // 필요하다면 여기에 학점, 담당 교사 등 추가 필드를 정의할 수 있습니다.
}

export const getAllSubjects = async (): Promise<Subject[]> => {
  const { data, error } = await supabase
    .from('subjects')
    .select('id, name')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching all subjects:', error);
    throw error;
  }

  return data || [];
};

export const searchSubjects = async (query: string): Promise<Subject[]> => {
  if (!query.trim()) {
    return [];
  }

  const { data, error } = await supabase
    .from('subjects')
    .select('id, name')
    .ilike('name', `%${query}%`)
    .limit(10);

  if (error) {
    console.error('Error searching subjects:', error);
    throw error;
  }

  return data || [];
};

