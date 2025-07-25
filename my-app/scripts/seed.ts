
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// --- Type Definitions ---
interface Subject {
    id: string;
    name: string;
    subject_group: string | null;
}

interface MajorField {
    name: string;
    advice: string;
    subjects: Record<string, string[]>;
}

interface Recommendation {
    field_id: number;
    subject_id: string;
    category: string;
}

// --- Placeholder Mapping ---
const placeholderMap: Record<string, string> = {
    '제2외국어(선택)': '제2외국어',
    '제2외국어(관련 외국어 과목 선택)': '제2외국어',
    // Add other placeholders here if any, e.g., '과학탐구(선택)': '과학탐구'
};


// --- Supabase Client ---
function getSupabaseClient() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase URL or service key is not defined in .env file.');
    }
    return createClient(supabaseUrl, supabaseKey);
}

const supabase = getSupabaseClient();

// --- Data Parsing ---
const fileContent = `
• 경제·경영 관련 학과 (경제학과, 경영학과, 경제금융학과, 경제금융물류학과, 경제통상학과, 국제경영학과, 마케팅학과, 경영정보학과 등)
    ◦ 국어: 화법과 언어, 독서와 작문, 문학, 주제 탐구 독서, 독서 토론과 글쓰기, 매체 의사소통
    ◦ 수학: 대수, 미적분Ⅰ, 확률과 통계, 경제 수학, 실용 통계
    ◦ 영어: 영어Ⅰ, 영어Ⅱ, 영어 독해와 작문, 영어 발표와 토론, 실생활 영어 회화, 미디어 영어
    ◦ 사회: 세계시민과 지리, 세계사, 사회와 문화, 현대사회와 윤리, 법과 사회, 경제, 국제 관계의 이해, 사회문제 탐구, 금융과 경제생활, 기후변화와 지속가능한 세계
    ◦ 기술·가정/정보: 정보, 데이터 과학, 지식 재산 일반
    ◦ 제2외국어/한문: 제2외국어(선택)
    ◦ 교양: 인간과 심리, 인간과 경제활동
    ◦ 선배의 조언: 수리적 분석력과 판단력, 대량의 정보를 빠르게 습득·활용하는 능력이 중요하며, 수학 기초를 탄탄히 하는 것이 좋습니다. 경제와 연관된 다양한 사회과학 계열 과목을 공부하고, 다른 분야와의 융합 가능성도 고려해야 합니다. 어학 능력도 중요합니다.
• 인문·언어 관련 학과 (어문학과, 사범대 어문계열, 고고인류학과, 통번역학과, 언어학과, 사학과, 철학과, 문헌정보학과, 문화콘텐츠학과, 문화인류학과 등)
    ◦ 국어: 화법과 언어, 독서와 작문, 문학, 주제 탐구 독서, 문학과 영상, 독서 토론과 글쓰기, 언어생활 탐구
    ◦ 수학: 대수, 확률과 통계
    ◦ 영어: 영어Ⅰ, 영어Ⅱ, 영어 독해와 작문, 영미 문학 읽기, 영어 발표와 토론, 심화 영어, 심화 영어 독해와 작문, 실생활 영어 회화, 세계 문화와 영어
    ◦ 사회: 세계시민과 지리, 세계사, 사회와 문화, 동아시아 역사 기행, 인문학과 윤리, 국제 관계의 이해
    ◦ 제2외국어/한문: 제2외국어(관련 외국어 과목 선택), 한문
    ◦ 교양: 인간과 철학, 인간과 심리
    ◦ 선배의 조언: 능동성, 체계적인 독서 습관, 폭넓은 공부가 중요하며, 정확하게 읽고 잘 쓰는 능력과 발표를 통해 생각을 전달하는 연습이 필요합니다. 빠르고 정확한 독해력과 원문 독해를 위한 영어 또는 제2외국어 사용 능력도 중요합니다. 전공과 관련된 수업 및 목표 달성에 필요한 사회 교과를 선택하는 것이 좋습니다.
• 언론·광고 관련 학과 (신문방송학과, 언론정보학과, 언론방송학과, 방송영상학과, 광고홍보언론학과, 미디어커뮤니케이션학과, 미디어광고학과 등)
    ◦ 국어: 화법과 언어, 독서와 작문, 문학, 주제 탐구 독서, 독서 토론과 글쓰기, 매체 의사소통
    ◦ 수학: 대수, 확률과 통계, 실용 통계
    ◦ 영어: 영어Ⅰ, 영어Ⅱ, 영어 독해와 작문, 영어 발표와 토론, 실생활 영어 회화, 미디어 영어
    ◦ 사회: 세계시민과 지리, 세계사, 사회와 문화, 현대사회와 윤리, 정치, 법과 사회, 경제, 윤리와 사상, 국제 관계의 이해, 사회문제 탐구
    ◦ 기술·가정/정보: 정보, 아동발달과 부모
    ◦ 교양: 인간과 철학, 논리와 사고, 인간과 심리
    ◦ 선배의 조언: 매체를 이해하고 활용하기 위한 언어적 감각, 의사소통 능력, 사회 변화에 대한 민감성 및 전반적인 사회 이해 능력, 광고 전략 수립을 위한 논리적 사고, 창의력, 예술적 감수성이 필요합니다. 자료 분석 및 데이터 통계 가공을 위한 수리적 사고도 중요합니다.
• 사회과학 관련 학과 (심리학과, 상담심리학과, 사회학과, 사회복지학과, 아동학과, 노인복지학과 등)
    ◦ 국어: 화법과 언어, 독서와 작문, 문학, 주제 탐구 독서, 독서 토론과 글쓰기, 매체 의사소통
    ◦ 수학: 대수, 확률과 통계, 실용 통계
    ◦ 영어: 영어Ⅰ, 영어Ⅱ, 영어 독해와 작문, 영어 발표와 토론, 실생활 영어 회화, 미디어 영어
    ◦ 사회: 세계시민과 지리, 세계사, 사회와 문화, 현대사회와 윤리, 정치, 법과 사회, 경제, 윤리와 사상, 국제 관계의 이해, 사회문제 탐구
    ◦ 기술·가정/정보: 정보, 아동발달과 부모
    ◦ 교양: 인간과 철학, 논리와 사고, 인간과 심리
    ◦ 선배의 조언: 인문학과 사회과학 관련 독서 경험, 진로 관련 탐구보고서 작성 경험, 교과서 지문과 연관된 배경지식에 대한 토론 및 발표 연습, 사회적 이슈에 대한 흥미와 토론 학습 경험이 중요합니다.
• 법학·행정 관련 학과 (법학과, 행정학과, 경찰행정학과, 도시행정학과, 정치외교학과, 국제관계학과 등)
    ◦ 국어: 화법과 언어, 독서와 작문, 문학, 주제 탐구 독서, 독서 토론과 글쓰기, 매체 의사소통
    ◦ 수학: 대수, 확률과 통계, 실용 통계
    ◦ 영어: 영어Ⅰ, 영어Ⅱ, 영어 독해와 작문, 영어 발표와 토론, 실생활 영어 회화, 미디어 영어
    ◦ 사회: 세계시민과 지리, 세계사, 사회와 문화, 현대사회와 윤리, 정치, 법과 사회, 경제, 윤리와 사상, 국제 관계의 이해, 사회문제 탐구
    ◦ 기술·가정/정보: 정보, 아동발달과 부모
    ◦ 교양: 인간과 철학, 논리와 사고, 인간과 심리
    ◦ 선배의 조언: 국내 및 국제 사회 뉴스에 대한 관심, 시사 탐구나 토론 관련 동아리 활동, 사회 문제 해결에 대한 흥미, 다양한 시각을 가진 사람과의 소통 능력, 자료 객관적 분석 능력, 신문/TV/SNS 등 다양한 매체 활용 경험이 중요합니다.
• 의료·보건 관련 학과 (의예과, 치의예과, 수의예과, 한의학과, 약학과, 한약학과, 간호학과, 물리치료학과, 임상병리학과 등)
    ◦ 국어: 화법과 언어, 독서와 작문, 주제 탐구 독서, 독서 토론과 글쓰기
    ◦ 수학: 대수, 미적분Ⅰ, 확률과 통계, 미적분Ⅱ, 기하
    ◦ 영어: 영어Ⅰ, 영어Ⅱ, 영어 발표와 토론, 심화 영어, 심화 영어 독해와 작문
    ◦ 사회: 현대사회와 윤리
    ◦ 과학: 화학, 생명과학, 물질과 에너지, 화학 반응의 세계, 세포와 물질대사, 생물의 유전
    ◦ 교양: 보건
    ◦ 선배의 조언: 생명을 다루는 분야이므로 인성 함양이 중요하며, 환자 응대를 위한 의사소통, 심리적 지원 능력도 필요합니다. 면접이 입시 요소인 경우가 많으므로 자신의 생각을 표현하는 연습을 많이 하고, 의료 행위가 법과 제도 안에서 이루어지므로 사회 교과 이수도 도움이 될 수 있습니다.
• 농림·수산 관련 학과 (동물자원학과, 바이오시스템공학과, 식물생명과학과, 축산학과, 산림과학과, 산림조경학과, 수산양식학과 등)
    ◦ 국어: 화법과 언어, 독서와 작문
    ◦ 수학: 대수, 미적분Ⅰ, 미적분Ⅱ, 기하, 확률과 통계
    ◦ 영어: 영어Ⅰ, 영어Ⅱ
    ◦ 과학: 화학, 생명과학, 지구과학, 화학 반응의 세계, 세포와 물질대사, 생물의 유전, 지구시스템과학, 기후변화와 환경 생태
    ◦ 사회: 한국지리 탐구, 기후변화와 지속가능한 세계
    ◦ 교양: 생태와 환경
    ◦ 선배의 조언: 농림학, 산림학, 수산학 모두 전공 기초 과목으로 생명과학이 중요하며, 산림 분야는 화학, 기상·물·토양 분야는 지구과학과 물리학 관련 지식이 필요합니다. 수산 분야는 해양 관련 물리학, 지구과학, 화학 내용이 도움이 되며, 통계 및 분석 활동 역량을 위해 확률과 통계 이수를 추천합니다. 과학 분야의 다양한 실험에 적극적으로 참여하는 것이 좋습니다.
• 생활과학 관련 학과 (식품공학과, 식품생명공학과, 식품영양학과, 식품자원경제학과, 가정학과, 생활과학과, 소비자아동학과, 의류학과 등)
    ◦ 국어: 화법과 언어, 독서와 작문
    ◦ 수학: 대수, 미적분Ⅰ, 확률과 통계
    ◦ 영어: 영어Ⅰ, 영어Ⅱ, 영어 독해와 작문
    ◦ 사회: 사회와 문화, 경제
    ◦ 과학: 화학, 생명과학, 화학 반응의 세계, 세포와 물질대사, 생물의 유전
    ◦ 기술·가정: 기술·가정, 생활과학 탐구
    ◦ 예술: 미술, 미술창작(의류학과의 경우)
    ◦ 선배의 조언: 식품영양 관련 학과는 수학 및 과학 분야에 대한 이해가 필요하고, 식품 산업 이해를 위해 경제 과목도 좋습니다. 의류학과는 융합 학문이므로 국어, 수학, 영어, 사회와 문화, 화학, 기술·가정, 생활과학 탐구, 미술 등의 과목이 도움이 됩니다.
• 수리·물리·천문지구 관련 학과 (수학과, 수리과학과, 통계학과, 수학교육과, 물리학과, 응용물리학과, 천문학과, 우주과학과, 지질학과, 해양시스템학과 등)
    ◦ 국어: 화법과 언어, 독서와 작문
    ◦ 수학: 대수, 미적분Ⅰ, 확률과 통계, 기하, 미적분Ⅱ, 인공지능 수학, 실용 통계, 수학과제 탐구
    ◦ 영어: 영어Ⅰ, 영어Ⅱ, 영어 독해와 작문
    ◦ 과학: 물리학, 지구과학, 역학과 에너지, 전자기와 양자, 지구시스템과학, 행성우주과학
    ◦ 기술·가정/정보: 정보, 인공지능 기초, 데이터 과학
    ◦ 교양: 논리와 사고
    ◦ 선배의 조언: 논리를 바탕으로 수학 문제 해결 습관을 지니는 것이 중요하며, 컴퓨터 코딩 연습은 대학 생활 및 취업에 유리합니다. 통계학과에서는 대수, 미적분Ⅰ/Ⅱ, 기하 과목 수강이 필요하며, 데이터 활용을 위해 정보 교과 이수를 추천합니다.
• 화학·생명과학 관련 학과 (화학과, 생화학과, 정밀화학과, 응용화학과, 생명과학과, 생명자원학과, 의생명과학과, 분자생명과학과, 바이오생명정보학과 등)
    ◦ 국어: 화법과 언어, 독서와 작문, 주제 탐구 독서
    ◦ 수학: 대수, 미적분Ⅰ, 확률과 통계, 기하, 미적분Ⅱ
    ◦ 영어: 영어Ⅰ, 영어Ⅱ, 영어 독해와 작문
    ◦ 과학: 물리, 화학, 생명과학, 전자기와 양자, 물질과 에너지, 화학 반응의 세계, 세포와 물질대사, 생물의 유전, 기후변화와 환경생태
    ◦ 기술·가정/정보: 정보
    ◦ 예술: 생태와 환경
    ◦ 선배의 조언: 수학을 기초로 한 창의적 탐구 능력이 중요하며, 대학 일반화학 공부를 위해 전자기와 양자 과목의 양자역학을 미리 대비하면 좋습니다. 화학 관련 학과는 물질과 에너지, 화학 반응의 세계, 생명과학 관련 학과는 생물의 유전, 세포와 물질대사 과목 이수가 전공 학습에 유리합니다. 영어 자료를 많이 읽으므로 영어 실력을 쌓고, 다양한 실험을 위해 해당 교과의 기본 이론을 탄탄히 학습하는 것이 중요합니다.
• 기계·전자전기·컴퓨터 관련 학과 (기계공학과, 자동차공학과, 조선해양학과, 전산학과, 전자공학과, 정보통신공학과 등)
    ◦ 국어: 화법과 언어, 독서와 작문
    ◦ 수학: 대수, 미적분Ⅰ, 확률과 통계, 기하, 미적분Ⅱ, 인공지능 수학, 수학과제 탐구
    ◦ 영어: 영어Ⅰ, 영어Ⅱ, 영어 독해와 작문
    ◦ 과학: 물리학, 화학, 역학과 에너지, 전자기와 양자, 물질과 에너지, 화학 반응의 세계
    ◦ 기술·가정/정보: 기술·가정, 정보, 로봇과 공학세계, 인공지능 기초, 창의공학 설계
    ◦ 교양: 논리와 사고
    ◦ 선배의 조언: 고교 수학부터 미적분까지의 내용은 대학에서 심화된 내용으로 배우며, 대학에서 벡터를 많이 사용하므로 기하 과목을 공부하는 것을 추천합니다. 정보, 인공지능 기초 과목은 공학 공부에 밑거름이 되며, 물리학, 역학과 에너지, 전자기와 양자 교과를 이수하면 대학 공부에 도움이 됩니다.
• 재료·에너지·화학공학 관련 학과 (신소재공학과, 에너지공학과, 재료공학과, 화학공학과, 산업공학과 등)
    ◦ 국어: 화법과 언어, 독서와 작문
    ◦ 수학: 대수, 미적분Ⅰ, 확률과 통계, 기하, 미적분Ⅱ, 인공지능 수학, 수학과제 탐구
    ◦ 영어: 영어Ⅰ, 영어Ⅱ, 영어 독해와 작문
    ◦ 과학: 물리학, 화학, 역학과 에너지, 전자기와 양자, 물질과 에너지, 화학 반응의 세계
    ◦ 기술·가정/정보: 기술·가정, 정보, 로봇과 공학세계, 인공지능 기초, 창의공학 설계
    ◦ 교양: 논리와 사고
    ◦ 선배의 조언: 다양한 산업 재료의 구조와 성질에 관심이 많고 물질에 대한 지적 호기심이 많은 학생에게 추천합니다. 수학, 물리, 화학 등 기초과학을 바탕으로 한 첨단 기술을 통해 세계 발전을 이끌 수 있습니다. 특히 수학의 미적분과 기하에 대한 이해가 요구됩니다.
• 건축·토목·도시·환경공학 관련 학과 (건축학과, 건축공학과, 조경학과, 토목공학과, 도시공학과, 교통공학과, 해양공학과, 환경공학과 등)
    ◦ 국어: 화법과 언어, 독서와 작문
    ◦ 수학: 대수, 미적분Ⅰ, 미적분Ⅱ, 기하
    ◦ 과학: 물리학, 화학, 생명과학, 지구과학, 역학과 에너지, 전자기와 양자, 물질과 에너지, 화학 반응의 세계, 지구시스템과학, 기후변화와 환경생태
    ◦ 사회: 현대사회와 윤리, 기후변화와 지속가능한 세계
    ◦ 기술·가정/정보: 지식 재산 일반, 창의 공학 설계, 정보, 인공지능 기초, 데이터 과학, 소프트웨어와 생활
    ◦ 교양: 논리와 사고, 인간과 심리
    ◦ 선배의 조언: 벡터가 많이 사용되므로 기하 과목의 기본 내용을 확실하게 이해하고, 역학을 기본으로 배우기 때문에 물리학 공부가 필요합니다. 3D 기반 메이커 교육 체험과 컴퓨터 활용 능력이 있으면 좋습니다. 건축공학 전공에서는 미적분, 물리 등 역학 관련 공부가 일부 필요하며, 윤리 과목은 건축공학 실무에서 기본 소양으로 요구됩니다. 건축학 전공에서는 예술적 감각도 중요합니다.
`;

function parseMajorFields(text: string): MajorField[] {
    const fields: MajorField[] = [];
    const fieldBlocks = text.trim().split('• ').slice(1);

    for (const block of fieldBlocks) {
        const lines = block.trim().split('\n');
        const name = lines[0].split('(')[0].trim();
        const adviceLine = lines.find(line => line.trim().startsWith('◦ 선배의 조언:'));
        const advice = adviceLine ? adviceLine.split(':')[1].trim() : '조언 정보가 없습니다.';
        
        const subjects: Record<string, string[]> = {};
        lines.filter(line => line.trim().startsWith('◦') && !line.includes('선배의 조언:'))
             .forEach(line => {
                 const parts = line.replace('◦', '').split(':');
                 if (parts.length < 2) return;
                 const category = parts[0].trim();
                 const subjectList = parts[1].split(',').map(s => s.trim());
                 subjects[category] = subjectList;
             });

        fields.push({ name, advice, subjects });
    }
    return fields;
}

async function seedDatabase() {
    console.log('Starting database seeding...');

    // 1. Parse the file content
    const majorFieldsData = parseMajorFields(fileContent);
    console.log(`Parsed ${majorFieldsData.length} major fields from the file.`);

    // 2. Fetch all existing subjects from the database
    const { data: existingSubjects, error: fetchError } = await supabase
        .from('subjects')
        .select('id, name, subject_group');

    if (fetchError) {
        console.error('Error fetching subjects:', fetchError);
        return;
    }
    const subjectMap = new Map(existingSubjects.map((s: Subject) => [s.name, s.id]));
    const subjectsByGroup = new Map<string, string[]>();
    existingSubjects.forEach((s: Subject) => {
        if (s.subject_group) {
            const group = subjectsByGroup.get(s.subject_group) || [];
            group.push(s.id);
            subjectsByGroup.set(s.subject_group, group);
        }
    });
    console.log(`Successfully fetched ${subjectMap.size} subjects and mapped ${subjectsByGroup.size} groups.`);

    // 3. Upsert major fields and get their IDs
    const fieldUpsertPromises = majorFieldsData.map(field =>
        supabase.from('major_fields').upsert({ name: field.name, advice: field.advice }, { onConflict: 'name' }).select('id, name').single()
    );
    
    const fieldResults = await Promise.all(fieldUpsertPromises);
    const fieldMap = new Map<string, number>();
    fieldResults.forEach(result => {
        if (result.data) {
            fieldMap.set(result.data.name, result.data.id);
        }
        if (result.error) {
            console.error(`Error upserting major field: ${result.error.message}`);
        }
    });
    console.log(`Processed ${fieldMap.size} major fields.`);

    // 4. Prepare recommendations, expanding placeholders
    const recommendations: Recommendation[] = [];
    const notFoundSubjects = new Set<string>();

    for (const field of majorFieldsData) {
        const fieldId = fieldMap.get(field.name);
        if (!fieldId) continue;

        for (const [category, subjectList] of Object.entries(field.subjects)) {
            for (const subjectName of subjectList) {
                // Handle placeholders
                if (placeholderMap[subjectName]) {
                    const groupName = placeholderMap[subjectName];
                    const groupSubjectIds = subjectsByGroup.get(groupName) || [];
                    groupSubjectIds.forEach(subjectId => {
                        recommendations.push({
                            field_id: fieldId,
                            subject_id: subjectId,
                            category: category
                        });
                    });
                } else { // Handle regular subjects
                    const subjectId = subjectMap.get(subjectName);
                    if (subjectId) {
                        recommendations.push({
                            field_id: fieldId,
                            subject_id: subjectId,
                            category: category
                        });
                    } else {
                        notFoundSubjects.add(subjectName);
                    }
                }
            }
        }
    }
    
    if (notFoundSubjects.size > 0) {
        console.warn('The following subjects were not found and were skipped:');
        console.warn([...notFoundSubjects].join(', '));
    }

    // 5. Clear existing recommendations and insert new ones
    console.log('Deleting old recommendations...');
    const { error: deleteError } = await supabase.from('recommended_subjects').delete().neq('id', -1);
    if (deleteError) {
        console.error('Error deleting old recommendations:', deleteError);
        return;
    }

    console.log(`Inserting ${recommendations.length} new recommendations...`);
    const { error: insertError } = await supabase.from('recommended_subjects').insert(recommendations);

    if (insertError) {
        console.error('Error inserting new recommendations:', insertError);
    } else {
        console.log('Successfully inserted new recommendations.');
    }

    console.log('Database seeding finished.');
}

seedDatabase().catch(console.error);
