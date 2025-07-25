
// scripts/generate-embeddings.ts
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './my-app/.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL or Anon Key is missing in .env file.");
}

// 참고: 서버 사이드 스크립트이므로 서비스 키를 사용하는 것이 더 안전할 수 있지만,
// 여기서는 클라이언트와 동일한 anon 키를 사용합니다. RLS 정책이 허용해야 합니다.
// 이 스크립트는 anon 키로도 동작하도록 RLS가 설정되어 있다고 가정합니다.
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const generateEmbeddings = async () => {
  // 1. major_fields 테이블에서 임베딩이 없는 모든 데이터 가져오기
  const { data: fields, error: selectError } = await supabase
    .from('major_fields')
    .select('id, name')
    .is('embedding', null);

  if (selectError) {
    console.error('Error fetching major fields:', selectError);
    return;
  }

  if (!fields || fields.length === 0) {
    console.log('No major fields found without embeddings. All set!');
    return;
  }

  console.log(`Found ${fields.length} major fields to process. Generating embeddings...`);

  // 2. 각 name에 대해 임베딩 생성 및 업데이트
  for (const field of fields) {
    try {
      console.log(`Processing: ${field.name}`);
      // Edge function 호출하여 임베딩 생성
      const { data: embeddingData, error: functionError } = await supabase.functions.invoke(
        'create-embedding',
        { body: { text: field.name } }
      );

      if (functionError) {
        console.error(`Error generating embedding for "${field.name}":`, functionError.message);
        continue; // 다음 필드로 넘어감
      }

      if (!embeddingData || !embeddingData.embedding) {
        console.error(`Embedding data is invalid for "${field.name}"`);
        continue;
      }

      // embedding 컬럼 업데이트
      const { error: updateError } = await supabase
        .from('major_fields')
        .update({ embedding: embeddingData.embedding })
        .eq('id', field.id);

      if (updateError) {
        console.error(`Error updating embedding for "${field.name}":`, updateError.message);
      } else {
        console.log(`  -> Successfully saved embedding for "${field.name}"`);
      }
    } catch (e: any) {
      console.error(`An unexpected error occurred for field "${field.name}":`, e.message);
    }
  }

  console.log('Embedding generation complete.');
};

generateEmbeddings();
