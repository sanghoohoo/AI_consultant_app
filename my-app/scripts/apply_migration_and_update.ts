import { Client } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// .env 파일에서 환경 변수 로드
dotenv.config({ path: './.env' });

const connectionString = process.env.SUPABASE_DB_CONNECTION_STRING;

if (!connectionString) {
  throw new Error("Database connection string is missing in .env file. Please add SUPABASE_DB_CONNECTION_STRING.");
}

const runScript = async () => {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to the database.');

    // 1. "example_majors" 컬럼 추가 마이그레이션 실행
    console.log('Applying migration to add "example_majors" column...');
    const migrationSql = `
      ALTER TABLE public.major_fields
      ADD COLUMN IF NOT EXISTS example_majors TEXT;
    `;
    await client.query(migrationSql);
    console.log('Migration applied successfully (or column already existed).');

    // 2. 과목추천.txt 파일 파싱 및 DB 업데이트
    console.log('Parsing text file and updating database...');
    const filePath = path.join(__dirname, '..', '과목추천.txt');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n');

    const majorFieldUpdates = [];
    for (const line of lines) {
      if (line.startsWith('• ')) {
        const match = line.match(/•\s(.*?)\s\((.*?)\)/);
        if (match) {
          const name = match[1].trim();
          const examples = match[2].replace(/ 등\)/, '').split(',').map((s: string) => s.trim()).join(', ');
          majorFieldUpdates.push({ name, examples });
        }
      }
    }

    // 3. 데이터베이스 업데이트
    for (const update of majorFieldUpdates) {
      const updateQuery = {
        text: 'UPDATE public.major_fields SET example_majors = $1 WHERE name = $2',
        values: [update.examples, update.name],
      };
      const res = await client.query(updateQuery);
      console.log(`Successfully updated "${update.name}" (${res.rowCount} row(s)).`);
    }
    console.log('Finished updating example majors.');

  } catch (err) {
    console.error('An error occurred:', err);
  } finally {
    await client.end();
    console.log('Disconnected from the database.');
  }
};

runScript();