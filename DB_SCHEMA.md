## AIConsult Supabase DB 스키마 문서

문서 생성 시점: 2025-10-16

- **프로젝트**: sjtdivvobekttbsxlcvn
- **포함 범위**: `auth`, `public`, `storage`, `net`, `realtime`, `supabase_migrations`, `vault` 스키마의 테이블/뷰(내부 `pg_catalog`, `information_schema` 제외)
- **표기 규칙**:
  - **RLS**: Row Level Security 활성 여부
  - 정책 명령어: r=SELECT, w=UPDATE, a=INSERT, d=DELETE, *=ALL

---

## 스키마별 개요

- **auth**: 인증/세션/토큰/SSO 관리
- **public**: 애플리케이션 도메인 데이터 (입시, 게시판, 사용자 학습 데이터 등)
- **storage**: 오브젝트 스토리지 메타데이터
- **net**: pg_net HTTP 큐/응답 테이블
- **realtime**: 실시간 메시지 및 구독 메타
- **supabase_migrations**: 마이그레이션 이력
- **vault**: 키 관리/시크릿 저장소

---

## ENUM 정의

### auth
- **aal_level**: aal1, aal2, aal3
- **code_challenge_method**: s256, plain
- **factor_status**: unverified, verified
- **factor_type**: totp, webauthn, phone
- **oauth_authorization_status**: pending, approved, denied, expired
- **oauth_client_type**: public, confidential
- **oauth_registration_type**: dynamic, manual
- **oauth_response_type**: code
- **one_time_token_type**: confirmation_token, reauthentication_token, recovery_token, email_change_token_new, email_change_token_current, phone_change_token

### net
- **request_status**: PENDING, SUCCESS, ERROR

### public
- **admission_type_enum**: 학생부위주(교과), 학생부위주(종합), 실기/실적위주, 논술위주, 수능위주, 기타
- **cut_type_enum**: 50cut, 60cut, 70cut, 80cut, 전체, 기타, 최고, 최저
- **score_type_enum**: 논술점수, 수능점수, 백분위, 등록률, 충원율, 표준편차, 기타, 수능등급, 내신등급, 수능최저충족률, 수능최저충족인원, 실질경쟁률
- **stat_group**: 최초합격자, 최종등록자
- **stat_type_enum**: 최고, 최저, 평균, 중앙값, 50cut, 60cut, 70cut, 80cut, 전체, 기타, 90cut
- **top_category_enum**: 수시, 정시, 정시(가), 정시(나), 정시(다)
- **unit_enum**: 점, %, 등급, 기타, 명, 대1

### realtime
- **action**: INSERT, UPDATE, DELETE, TRUNCATE, ERROR
- **equality_op**: eq, neq, lt, lte, gt, gte, in

### storage
- **buckettype**: STANDARD, ANALYTICS

---

## 테이블 상세 (public)

아래는 `public` 스키마의 핵심 테이블 구조입니다. 각 테이블은 컬럼, 키/제약조건, 인덱스, RLS, 정책, 트리거를 포함합니다.

### table: admission_experiences (RLS: false)
- **주요 용도**: 합격/입시 경험 텍스트 임베딩 소스
- **PK**: (id)

컬럼

| name | type | nullable | default |
|---|---|---|---|
| id | text | NO | |
| title | text | YES | |
| content | text | YES | |
| url | text | YES | |
| year | text | YES | |
| type | text | YES | |
| university | text | YES | |
| chunk_index | integer | YES | |
| total_chunks | integer | YES | |
| chunk_size | integer | YES | |
| embedding | vector | YES | |
| created_at | timestamp | YES | now() |

인덱스/제약조건 요약
- PK: admission_reviews_pkey(id)

트리거: 없음

---

### table: admission_results (RLS: false)
- **주요 용도**: 대학/모집단위별 전형 결과
- **PK**: (id)
- **Unique**: unique_admission_result(university, year, department, admission_type, selection_type)

컬럼 (발췌)

| name | type | nullable | default |
|---|---|---|---|
| id | bigint | NO | nextval('admission_results_id_seq') |
| university | text | NO | |
| year | integer | YES | |
| admission_type | admission_type_enum | YES | |
| selection_type | text | YES | |
| department | text | YES | |
| quota | integer | YES | |
| applicants | integer | YES | |
| competition_rate | numeric | YES | |
| pass_rank | integer | YES | |
| candidate_rank | integer | YES | |
| created_at | timestamptz | YES | now() |
| top_category | top_category_enum | YES | |
| note | text | YES | |
| effective_competition_rate | numeric | YES | |
| merged_from_ids | text[] | YES | |

외래키
- term_embeddings.admission_result_id → admission_results.id
- admission_scores.admission_result_id → admission_results.id

인덱스/제약조건 요약
- PK: admission_results_pkey(id)
- UNIQUE: unique_admission_result(...)

---

### table: admission_scores (RLS: false)
- **주요 용도**: 전형 결과의 세부 점수/지표
- **PK**: (id)

컬럼 (발췌)

| name | type | nullable | default |
|---|---|---|---|
| id | bigint | NO | nextval('admission_scores_id_seq') |
| admission_result_id | bigint | YES | |
| score_type | score_type_enum | YES | |
| stat_type | stat_type_enum | YES | |
| value | numeric | YES | |
| unit | unit_enum | YES | |
| note | text | YES | |

외래키
- admission_scores.admission_result_id → admission_results.id (ON DELETE CASCADE)

인덱스/제약조건 요약
- PK: admission_scores_pkey(id)
- UNIQUE: unique_admission_score_with_note(admission_result_id, score_type, stat_type, note)

---

### table: board_categories (RLS: true)
- **PK**: (id)
- **Unique**: name

컬럼 (발췌)

| name | type | nullable | default |
|---|---|---|---|
| id | bigint | NO | nextval('board_categories_id_seq') |
| name | text | NO | |
| description | text | YES | |
| icon | text | YES | |
| is_active | boolean | YES | true |
| sort_order | integer | YES | 0 |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |

외래키
- board_posts.category_id → board_categories.id

정책
- 개발용: 카테고리 완전 개방 (*, using: true) to role authenticated

트리거: 없음

---

### table: board_posts (RLS: true)
- **PK**: (id)

주요 컬럼: category_id, title, content, author_id, tags[], counters, created_at/updated_at

외래키
- board_posts.author_id → auth.users.id
- board_posts.category_id → board_categories.id
- board_comments.post_id → board_posts.id
- board_views.post_id → board_posts.id
- board_likes.post_id → board_posts.id

정책
- 개발용: 게시판 완전 개방 (*, using: true) to role authenticated

트리거
- update_board_posts_updated_at (BEFORE UPDATE) → update_updated_at_column()

---

### table: board_comments (RLS: true)
- **PK**: (id)

외래키
- author_id → auth.users.id
- post_id → board_posts.id
- parent_id → board_comments.id

정책
- 개발용: 댓글 완전 개방 (*, using: true) to role authenticated

트리거
- update_board_comments_updated_at (BEFORE UPDATE)
- update_post_comment_count_trigger (AFTER INSERT/DELETE)

---

### table: board_likes (RLS: true)
- **PK**: (id)
- **Unique**: (user_id, post_id), (user_id, comment_id)

외래키: user_id → auth.users.id, post_id → board_posts.id, comment_id → board_comments.id

정책
- 개발용: 좋아요 완전 개방 (*, using: true) to role authenticated

트리거
- update_like_count_trigger (AFTER INSERT/DELETE)

---

### table: board_views (RLS: true)
- **PK**: (id)
- **Unique**: (post_id, ip_address, view_date), (post_id, user_id, view_date)

외래키: user_id → auth.users.id, post_id → board_posts.id

정책
- 개발용: 조회수 완전 개방 (*, using: true) to role authenticated

트리거
- update_view_count_trigger (AFTER INSERT)

---

### table: chat_sessions (RLS: true)
- **PK**: (id)

외래키: chat_messages.session_id → chat_sessions.id

정책
- r: 인증된 사용자는 모든 세션 조회 가능 (using: true) to authenticated
- *: 자신의 세션만 수정/삭제 (using/check: auth.uid() = user_id) to authenticated

트리거
- ensure_user_id (BEFORE INSERT) → set_user_id()

---

### table: chat_messages (RLS: true)
- **PK**: (id)
- 외래키: session_id → chat_sessions.id

정책
- a: 인증 사용자 생성 가능 (check: true) to authenticated
- r: 인증 사용자 조회 가능 (using: true) to authenticated

---

### table: chat_turns (RLS: true)
- **PK**: (id)
- 외래키: user_profile_id → user_profile.id; 여러 캐시 테이블에서 참조

정책
- r/w/d: 본인(`user_profile_id = auth.uid()`)만 접근/수정/삭제
- a: insert 시 check(user_profile_id = auth.uid())

트리거
- set_updated_at_on_chat_turns (BEFORE UPDATE)
- trg_sync_chat_feedback (AFTER UPDATE)

---

### table: fallback_sentences (RLS: false)
- **PK**: (id)
- 주요 컬럼: sentence, embedding(vector), 메타데이터 텍스트

인덱스
- idx_fallback_sentences_vector_hnsw (embedding HNSW)

---

### table: major_fields (RLS: false)
- **PK**: (id)
- **Unique**: name

---

### table: pending_qa_cache (RLS: true)
- **PK**: (id)
- 외래키: user_profile_id → user_profile.id, original_chat_turn_id → chat_turns.id

정책
- *: (auth.uid()::text = user_profile_id::text)

트리거
- trigger_pending_qa_cache_updated_at (BEFORE UPDATE)

---

### table: persona_characteristics (RLS: false)
- **PK**: (id)
- 외래키: user_profile_id → user_profile.id
- CHECK: kind in ['competency','weakness',...,'academic_metric']

---

### table: public_qa_cache (RLS: true)
- **PK**: (id)
- **Unique**: question_hash

정책
- r: is_active=true
- *: auth.role() = 'service_role'

트리거
- trigger_public_qa_cache_updated_at (BEFORE UPDATE)

---

### table: qa_cache (RLS: false)
- **PK**: (id)
- **Unique(조건부)**: normalized_hash, question_hash

---

### table: recommended_subjects (RLS: false)
- **PK**: (id)
- 외래키: field_id → major_fields.id, subject_id → subjects.id

---

### table: student_basic_info (RLS: true)
- **PK**: (id)
- 외래키: user_profile_id → user_profile.id

정책
- *: auth.uid() = user_profile_id

---

### table: student_reports_backup (RLS: true)
- **PK**: (id)
- 외래키: user_profile_id → user_profile.id

정책
- *: auth.uid() = user_profile_id

---

### table: student_subjects (RLS: false)
- **PK**: (id)
- 외래키: user_profile_id → user_profile.id

---

### table: student_grade_averages (RLS: false)
- **PK**: (id)
- **Unique**: (user_profile_id, COALESCE(grade_level,-1), COALESCE(semester,-1), average_type)
- 외래키: user_profile_id → user_profile.id

---

### table: student_awards (RLS: false)
- **PK**: (id)
- 외래키: user_profile_id → user_profile.id

---

### table: student_creative_activities (RLS: false)
- **PK**: (id)
- 외래키: user_profile_id → user_profile.id

---

### table: student_career_hopes (RLS: false)
- **PK**: (id)
- 외래키: user_profile_id → user_profile.id

---

### table: student_reading_activities (RLS: false)
- **PK**: (id)
- 외래키: user_profile_id → user_profile.id

---

### table: student_attendance (RLS: false)
- **PK**: (id)
- 외래키: user_profile_id → user_profile.id

---

### table: student_certifications (RLS: false)
- **PK**: (id)
- 외래키: user_profile_id → user_profile.id

---

### table: user_interest_majors (RLS: true)
- **주요 용도**: 사용자 관심학과 설정 (n개 가능)
- **PK**: (id)
- **Unique**: (user_profile_id, university, department, admission_type)

컬럼

| name | type | nullable | default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| user_profile_id | uuid | NO | |
| university | text | NO | |
| department | text | NO | |
| admission_type | admission_type_enum | YES | |
| top_category | top_category_enum | YES | |
| priority | integer | YES | 1 |
| is_active | boolean | YES | true |
| notes | text | YES | |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |

외래키
- user_interest_majors.user_profile_id → user_profile.id (ON DELETE CASCADE)

인덱스
- idx_user_interest_majors_user(user_profile_id)
- idx_user_interest_majors_dept(university, department)

정책
- r/w/a/d: 본인만 접근 (auth.uid() = user_profile_id)

트리거
- update_user_interest_majors_updated_at (BEFORE UPDATE)

---

### table: student_mock_exam_scores (RLS: true)
- **주요 용도**: 모의고사 성적 상세 저장
- **PK**: (id)

컬럼

| name | type | nullable | default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| user_profile_id | uuid | NO | |
| exam_date | date | NO | |
| exam_name | text | NO | |
| grade_level | integer | NO | |
| exam_type | text | YES | |
| korean_raw_score | numeric | YES | |
| korean_standard_score | numeric | YES | |
| korean_percentile | numeric | YES | |
| korean_grade | integer | YES | |
| math_raw_score | numeric | YES | |
| math_standard_score | numeric | YES | |
| math_percentile | numeric | YES | |
| math_grade | integer | YES | |
| english_raw_score | numeric | YES | |
| english_grade | integer | YES | |
| korean_history_raw_score | numeric | YES | |
| korean_history_grade | integer | YES | |
| inquiry1_subject | text | YES | |
| inquiry1_raw_score | numeric | YES | |
| inquiry1_standard_score | numeric | YES | |
| inquiry1_percentile | numeric | YES | |
| inquiry1_grade | integer | YES | |
| inquiry2_subject | text | YES | |
| inquiry2_raw_score | numeric | YES | |
| inquiry2_standard_score | numeric | YES | |
| inquiry2_percentile | numeric | YES | |
| inquiry2_grade | integer | YES | |
| second_language_subject | text | YES | |
| second_language_raw_score | numeric | YES | |
| second_language_grade | integer | YES | |
| total_standard_score | numeric | YES | |
| avg_percentile | numeric | YES | |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |

외래키
- student_mock_exam_scores.user_profile_id → user_profile.id (ON DELETE CASCADE)

인덱스
- idx_student_mock_exam_user(user_profile_id)
- idx_student_mock_exam_date(exam_date DESC)
- idx_student_mock_exam_grade(grade_level)

정책
- *: 본인만 접근 (auth.uid() = user_profile_id)

트리거
- update_student_mock_exam_scores_updated_at (BEFORE UPDATE)

---

### table: subjects (RLS: false)
- **PK**: (id)
- 설명 컬럼 다수, recommended_subjects에서 참조

---

### table: term_embeddings (RLS: false)
- **PK**: (id)
- **Unique**: (term_text, term_type, university_name, year), (term_text, term_type, admission_result_id)
- 외래키: admission_result_id → admission_results.id
- 인덱스: embedding(HNSW), type/name/결과ID 보조 인덱스

---

### table: text_embeddings (RLS: false)
- **PK**: (id)
- 인덱스: embedding(HNSW/IVFFLAT 조건부), source 관련 인덱스

---

### table: timetables (RLS: true)
- **PK**: (id)
- **Unique**: (user_id, grade, semester)
- 외래키: user_id → auth.users.id

정책
- r/w/d: auth.uid() = user_id
- a: insert check(auth.uid() = user_id)

트리거
- on_timetables_updated (BEFORE UPDATE)

---

### table: university_embeddings (RLS: false)
- **PK**: (id)
- **Unique**: university_name
- 인덱스: embedding(IVFFLAT)

---

### table: university_name_mappings (RLS: false)
- **PK**: (id)
- **Unique**: (input_variant, target_university)
- 인덱스: input/target/embedding(IVFFLAT)

---

### table: user_files (RLS: true)
- **PK**: (id)
- 외래키: user_id → auth.users.id

정책
- r: 인증된 사용자 모두 조회 (using: true)
- *: 본인만 관리 (using/check: auth.uid() = user_id)

---

### table: user_profile (RLS: true)
- **PK**: (id)
- 외래키: id → auth.users.id

정책
- r: 인증된 사용자 모두 조회 (using: true)
- *: 본인만 수정 (using/check: auth.uid() = id)

---

### table: user_qa_cache (RLS: true)
- **PK**: (id)
- **Unique**: (user_profile_id, question_hash, context_hash)

정책
- *: (auth.uid()::text = user_profile_id::text)

트리거
- trg_enqueue_cache_promotion (AFTER UPDATE)
- trigger_user_qa_cache_updated_at (BEFORE UPDATE)

---

## 테이블 목록 (기타 스키마)

스키마별로 RLS 활성 현황과 핵심 용도를 요약합니다. 세부 컬럼은 시스템 스키마 특성상 생략합니다.

### auth (대부분 RLS: true)
- audit_log_entries (RLS: true) — 인증 감사 로그
- flow_state (RLS: true) — OAuth/PKCE 흐름 상태
- identities (RLS: true) — 외부 아이덴티티
- instances (RLS: true)
- mfa_amr_claims/challenges/factors (RLS: true) — MFA 관리
- oauth_authorizations/clients/consents (RLS: false 일부) — OAuth 클라이언트/승인
- one_time_tokens (RLS: true)
- refresh_tokens (RLS: true)
- saml_providers/relay_states (RLS: true)
- sessions (RLS: true)
- sso_domains/sso_providers (RLS: true)
- users (RLS: true)

트리거(발췌)
- auth.users: on_auth_user_created (AFTER INSERT) → handle_new_user()

### storage (RLS: true 다수)
- buckets/prefixes/objects 등 버킷/경로/오브젝트 메타
- RLS는 버킷 정책에 따라 활성화됨 (예: chat-uploads 공개 읽기/업로드 정책)

정책(발췌, storage.objects)
- r: bucket_id='chat-uploads' 공개 읽기
- a: bucket_id='chat-uploads' 업로드 허용 (authenticated)
- d: 본인 소유 파일 삭제 허용 (authenticated)

트리거(발췌)
- 이름/경로 계층 유지 및 updated_at 관리 트리거 다수

### net
- _http_response, http_request_queue (RLS: false)

### realtime
- messages(+daily 파티션), subscription, schema_migrations
- messages 본체는 RLS: true, 파티션 테이블은 RLS: false

### supabase_migrations
- schema_migrations — 마이그레이션 이력 (RLS: false)

### vault
- secrets (RLS: false), decrypted_secrets(view)

---

## 인덱스 하이라이트 (발췌)

- 벡터 검색
  - public.chat_turns.question_embedding: IVFFLAT(lists=100)
  - public.qa_cache.question_embedding: IVFFLAT(lists=100)
  - public.fallback_sentences.embedding: HNSW(cosine)
  - public.term_embeddings.embedding: HNSW(cosine)
  - public.text_embeddings.embedding: HNSW/IVFFLAT 조건부
  - public.university_embeddings.embedding: IVFFLAT(lists=50)

- 유니크 키
  - admission_results: (university, year, department, admission_type, selection_type)
  - admission_scores: (admission_result_id, score_type, stat_type, note)
  - term_embeddings: (term_text, term_type, university_name, year) 및 (term_text, term_type, admission_result_id)
  - user_qa_cache: (user_profile_id, question_hash, context_hash)
  - timetables: (user_id, grade, semester)
  - board_likes: (user_id, post_id) / (user_id, comment_id)
  - university_embeddings: (university_name)
  - university_name_mappings: (input_variant, target_university)
  - board_categories: (name)

---

## RLS 개요 (public)

- RLS 활성: board_*(categories/comments/likes/posts/views), chat_messages, chat_sessions, chat_turns, pending_qa_cache, public_qa_cache, student_basic_info, student_mock_exam_scores, student_reports_backup, timetables, user_files, user_interest_majors, user_profile, user_qa_cache
- RLS 비활성: admission_*(experiences/results/scores), embeddings/subjects/recommended_subjects 등 통계/컨텐츠 테이블

---

## 참고

- 본 문서는 Supabase 메타데이터에서 자동 수집한 내용을 기반으로 합니다. 운영 중 스키마 변경이 발생할 수 있으므로, 최신 상태는 DB 메타 질의를 통해 확인하세요.


