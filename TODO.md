# AI Life Layer - TODO List

## 우선순위: 높음

### 1. ~~실제 AI API 연동~~ ✅ 완료
- **현재 상태**: AI Universe 시스템 구현 완료
- **위치**: `backend/server.py`
- **구현 완료**:
  - [x] OpenAI API 연동 (GPT-4o, o1, etc.)
  - [x] Anthropic API 연동 (Claude 3 Opus/Sonnet/Haiku)
  - [x] Google API 연동 (Gemini Pro/Flash)
  - [x] Ollama 로컬 모델 연동
  - [x] API 키 관리 시스템 (저장/삭제/상태확인)
  - [x] API Keys 모달 UI
  - [x] SharedContext 기반 AI 협업 메모리
  - [x] AI Universe 오케스트레이션
  - [x] 프론트엔드 이벤트 핸들링

### 2. RECENT ACTIVITY 자연어 번역 개선
- **현재 상태**: 데모 버전 (하드코딩된 영어 번역)
- **위치**: `frontend/src/scenes/UIScene.ts` - `humanize*` 함수들
- **할 일**:
  - AI 기반 자연어 생성으로 교체
  - 더 자연스러운 대화체 메시지
  - 다국어 지원 고려

---

## 우선순위: 중간

### 3. Supabase OAuth 테스트
- **현재 상태**: 프론트엔드 구현 완료
- **할 일**:
  - [ ] Supabase 대시보드에서 Google OAuth Provider 설정
  - [ ] Supabase 대시보드에서 GitHub OAuth Provider 설정
  - [ ] Redirect URL 설정 (`http://localhost:5173`)
  - [ ] 실제 로그인 테스트

### 4. 컨트롤 패널
- **현재 상태**: 미구현
- **할 일**:
  - 재생/일시정지 버튼
  - 속도 조절 슬라이더
  - 뷰 모드 전환

### 5. 단축키 시스템
- **현재 상태**: 부분 구현
- **할 일**:
  - 전체 단축키 매핑
  - 단축키 안내 UI

---

## 우선순위: 낮음

### 6. 에이전트 커스터마이징
- 커스텀 프롬프트 설정
- 에이전트 역할 정의
- 에이전트 이름/아이콘 변경

### 7. 더 풍부한 애니메이션
- 상호작용 시 파티클 효과
- 워크플로우 단계별 시각 효과
- 투표 결과 애니메이션

### 8. 데이터 저장/불러오기
- 세션 히스토리 저장
- 설정 저장
- 대화 내보내기

---

## 완료된 항목

- [x] 기본 UI 레이아웃 (MY AI, RECENT ACTIVITY, RESULT)
- [x] 에이전트 추가/삭제
- [x] 커맨드 입력 및 전송
- [x] 워크플로우 시각화
- [x] 투표 시스템
- [x] 결과 패널 + DISMISS 버튼
- [x] 상호작용 시 에이전트 움직임
- [x] RECENT ACTIVITY 데모 번역 (humanize 함수)
- [x] **OAuth 인증 UI** (Supabase + Google/GitHub)
- [x] **파일 시스템 권한 시스템**
  - 로그인 모달에 권한 동의 체크박스
  - Backend 파일 API (read/write/delete/move/list/mkdir)
  - Frontend 파일 시스템 서비스 (`src/lib/fileSystem.ts`)
  - 시스템 디렉토리 접근 제한 보안
- [x] **로그인 모달 픽셀 폰트 적용**
- [x] **AI API 연동** (2026-02-26)
  - Multi-Provider 지원 (OpenAI, Anthropic, Google, Ollama)
  - SharedContext 기반 AI 협업 시스템
  - AI Universe 오케스트레이션 (라운드 기반 대화)
  - API Keys 관리 UI 모달
  - 액션 파싱 시스템 (`[PROPOSE:]`, `[AGREE:]`, `[ACTION:]` 등)
  - 파일 생성 자동화 지원

---

*Last Updated: 2026-02-26*
