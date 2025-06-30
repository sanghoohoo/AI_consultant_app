# AI 교육 상담 챗봇 앱 📱

AI를 활용한 개인화된 교육 상담 서비스를 제공하는 React Native 앱입니다.

## 📋 필요한 환경

### 1. 개발 환경 설정
- **Node.js**: 18.0.0 이상
- **npm** 또는 **yarn**
- **Expo CLI**: `npm install -g @expo/cli`

### 2. 모바일 개발 환경 (선택사항)
- **iOS**: Xcode (macOS만 해당)
- **Android**: Android Studio + Android SDK
- **또는 Expo Go 앱** (가장 간단한 테스트 방법)

## 🚀 설치 및 실행

### 1. 프로젝트 클론
```bash
git clone https://github.com/sanghoohoo/AI_consultant_app.git
cd AI_consultant_app/my-app
```

### 2. 패키지 설치
```bash
npm install
```

### 3. 환경 설정
프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
# Supabase 설정
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# 백엔드 API URL
EXPO_PUBLIC_API_URL=http://localhost:8000
```

### 4. 앱 실행
```bash
npm start
```

## 📦 주요 패키지

### 핵심 의존성
- **Expo**: React Native 개발 플랫폼
- **@supabase/supabase-js**: 데이터베이스 및 인증
- **@react-navigation/drawer**: 네비게이션 (사이드바)
- **@react-navigation/native**: 네비게이션 기본

### UI/UX 패키지
- **@expo/vector-icons**: 아이콘
- **react-native-gesture-handler**: 제스처 처리
- **react-native-reanimated**: 애니메이션
- **react-native-safe-area-context**: 안전 영역 처리
- **react-native-screens**: 화면 최적화

### 개발 도구
- **TypeScript**: 타입 안전성
- **Jest**: 테스트 프레임워크
- **Babel**: JavaScript 컴파일러

## 🔧 백엔드 설정

이 앱은 별도의 FastAPI 백엔드 서버가 필요합니다.

### 1. 백엔드 레포지토리 클론
```bash
git clone https://github.com/sanghoohoo/ai_consultant_back.git
cd ai_consultant_back
```

### 2. Python 가상환경 설정
```bash
python -m venv venv
.\venv\Scripts\Activate.ps1  # Windows
source venv/bin/activate     # macOS/Linux
```

### 3. 백엔드 패키지 설치 및 실행
```bash
pip install -r requirements.txt
python main.py
```

## 🏗️ Supabase 설정

### 1. Supabase 프로젝트 생성
1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. 프로젝트 URL과 anon key 복사

### 2. 데이터베이스 테이블 생성
다음 SQL을 Supabase SQL 에디터에서 실행:

```sql
-- 사용자 프로필 테이블
CREATE TABLE user_profile (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name TEXT,
  grade TEXT,
  gpa NUMERIC,
  interests TEXT[],
  goals TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 채팅 세션 테이블
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 채팅 메시지 테이블
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id),
  content TEXT NOT NULL,
  sender TEXT NOT NULL CHECK (sender IN ('user', 'assistant')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. Row Level Security (RLS) 설정
```sql
-- 사용자 프로필 정책
ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON user_profile FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profile FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON user_profile FOR INSERT WITH CHECK (auth.uid() = id);

-- 채팅 세션 정책
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own sessions" ON chat_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own sessions" ON chat_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON chat_sessions FOR UPDATE USING (auth.uid() = user_id);

-- 채팅 메시지 정책
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own messages" ON chat_messages FOR SELECT USING (
  auth.uid() IN (
    SELECT user_id FROM chat_sessions WHERE id = chat_messages.session_id
  )
);
CREATE POLICY "Users can create own messages" ON chat_messages FOR INSERT WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM chat_sessions WHERE id = chat_messages.session_id
  )
);
```

## 📱 앱 테스트 방법

### 1. Expo Go 앱 사용 (추천)
1. 스마트폰에 Expo Go 앱 설치
2. `npm start` 실행 후 QR 코드 스캔
3. 실시간으로 앱 테스트 가능

### 2. 웹 브라우저
```bash
npm run web
```

### 3. iOS 시뮬레이터 (macOS만 해당)
```bash
npm run ios
```

### 4. Android 에뮬레이터
```bash
npm run android
```

## 🔑 주요 기능

- 📝 **사용자 프로필 관리**: 학년, 성적, 관심분야 등 개인화 정보
- 💬 **AI 채팅**: 실시간 스트리밍 채팅 인터페이스
- 📚 **세션 관리**: 채팅 기록 저장 및 요약
- 🔐 **인증**: Supabase를 통한 안전한 사용자 인증
- 📱 **반응형 UI**: 모바일 최적화된 인터페이스

## 🛠️ 개발 가이드

### 코드 구조
```
my-app/
├── app/                  # 주요 화면들
│   ├── (auth)/          # 인증 관련 화면
│   └── (tabs)/          # 메인 탭 화면
├── components/          # 재사용 가능한 컴포넌트
├── lib/                 # 라이브러리 설정 (Supabase 등)
└── constants/           # 상수 정의
```

### 빌드 및 배포
```bash
# 프로덕션 빌드
expo build:android
expo build:ios

# 또는 EAS Build 사용
eas build --platform android
eas build --platform ios
```

## 🐛 문제 해결

### 일반적인 문제들
1. **Metro 서버 오류**: `npx expo start --clear` 실행
2. **패키지 충돌**: `rm -rf node_modules && npm install`
3. **iOS 빌드 오류**: Xcode에서 Clean Build Folder
4. **Android 빌드 오류**: Android Studio에서 Gradle Sync

### 로그 확인
```bash
# 앱 로그 확인
npx expo logs
```

## 📞 지원

문제가 발생하면 GitHub Issues에 문제를 등록해주세요:
- [AI_consultant_app Issues](https://github.com/sanghoohoo/AI_consultant_app/issues)
- [ai_consultant_back Issues](https://github.com/sanghoohoo/ai_consultant_back/issues)

## 📄 라이선스

이 프로젝트는 0BSD 라이선스 하에 배포됩니다. 