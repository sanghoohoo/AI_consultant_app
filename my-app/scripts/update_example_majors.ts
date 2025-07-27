import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// .env 파일에서 환경 변수 로드
dotenv.config({ path: './.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Supabase URL or Service Key is missing in .env file.");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const runUpdate = async () => {
  console.log('Starting to update example majors...');

  // 1. 과목추천.txt 파일 파싱
  console.log('Parsing text file...');
  const filePath = path.join(__dirname, '..', '과목추천.txt');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split('\n');

  const majorFieldUpdates = new Map<string, string>();
  for (const line of lines) {
    if (line.startsWith('• ')) {
      const match = line.match(/•\s(.*?)\s\((.*?)\)/);
      if (match) {
        const name = match[1].trim();
        const examples = match[2].replace(/ 등\)/, '').split(',').map((s: string) => s.trim()).join(', ');
        majorFieldUpdates.set(name, examples);
      }
    }
  }
  console.log(`Parsed ${majorFieldUpdates.size} major fields from the file.`);

  // 2. 데이터베이스의 모든 major_fields 가져오기
  const { data: existingFields, error: selectError } = await supabase
    .from('major_fields')
    .select('id, name');

  if (selectError) {
    console.error('Error fetching major fields from DB:', selectError);
    return;
  }

  // 3. 파싱된 데이터와 매칭하여 DB 업데이트
  console.log('Updating database records...');
  for (const field of existingFields) {
    if (majorFieldUpdates.has(field.name)) {
      const examples = majorFieldUpdates.get(field.name);
      const { error: updateError } = await supabase
        .from('major_fields')
        .update({ example_majors: examples })
        .eq('id', field.id);

      if (updateError) {
        console.error(`Error updating "${field.name}":`, updateError.message);
      } else {
        console.log(`  -> Successfully updated "${field.name}"`);
      }
    }
  }

  console.log('Finished updating example majors.');
};

// 마이그레이션은 별도로 처리하고, 여기서는 업데이트만 실행
// (이전 단계에서 마이그레이션이 실패했으므로, 수동 확인이 필요할 수 있음)
// 우선 업데이트 스크립트부터 실행해봅니다.
runUpdate();
