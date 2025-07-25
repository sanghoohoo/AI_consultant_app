// api/roadmap.ts
import { supabase } from '../lib/supabaseClient';

export interface RecommendedSubject {
  category: string;
  subjects: { name: string }[];
}

export interface RoadmapDetails {
    name: string;
    advice: string;
    recommendedSubjects: RecommendedSubject[];
}

export const findMatchingFieldId = async (hopeMajor: string): Promise<number | null> => {
    // Supabase Edge Function을 호출하여 텍스트 임베딩 생성
    const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke('create-embedding', {
        body: { text: hopeMajor }
    });

    if (embeddingError || !embeddingData.embedding) {
        console.error('Error creating embedding:', embeddingError);
        return null;
    }
    
    const { data: matchData, error: matchError } = await supabase.rpc('match_major_fields', {
        query_embedding: embeddingData.embedding,
        match_threshold: 0.7, // 유사도 임계값 (조정 필요)
        match_count: 1
    });

    if (matchError || !matchData || matchData.length === 0) {
        console.error('Error matching major field:', matchError);
        return null;
    }

    return matchData[0].id;
}

export const getRoadmapByField = async (fieldId: number): Promise<RoadmapDetails | null> => {
  const { data: fieldData, error: fieldError } = await supabase
    .from('major_fields')
    .select('name, advice')
    .eq('id', fieldId)
    .single();

  if (fieldError || !fieldData) {
    console.error('Error fetching major field details:', fieldError);
    return null;
  }

  const { data: recommendationData, error: recommendationError } = await supabase
    .from('recommended_subjects')
    .select(`
      category,
      subjects ( name )
    `)
    .eq('field_id', fieldId)
    .order('id');

  if (recommendationError) {
    console.error('Error fetching recommendations:', recommendationError);
    return null;
  }

  // 데이터 그룹화
  const grouped: Record<string, { name: string }[]> = {};
  recommendationData.forEach((item: any) => {
    const category = item.category;
    if (!grouped[category]) {
      grouped[category] = [];
    }
    if(item.subjects) {
        grouped[category].push(item.subjects);
    }
  });

  const recommendedSubjects = Object.entries(grouped).map(([category, subjects]) => ({
    category,
    subjects,
  }));

  return {
      name: fieldData.name,
      advice: fieldData.advice,
      recommendedSubjects,
  };
};
