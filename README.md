# Claude CLI Analytics Dashboard

Claude CLI 대화 로그를 분석하여 토큰 효율성, 캐시 활용률, 컨텍스트 사용 패턴을 시각화하는 대시보드

## ✨ Features

- 📊 **Dashboard**: 전체 효율성 지표, 토큰 분포, 트렌드 차트
- 📝 **Session Detail**: 세션별 대화 타임라인, 질문별 읽은 컨텍스트 로그
- 🔄 **Real-time Refresh**: 새로고침 버튼으로 최신 데이터 로드
- 🏆 **Engineering Grade**: S/A/B/C 등급 + SEI (Spec Efficiency Index) 분석
- 🔍 **Auto-detection**: `.claude/projects` 경로 자동 탐색 — init 불필요
- 📦 **NPM 패키지**: `npm install -g`로 어디서든 설치 가능

## 🚀 설치 및 실행

### ✅ NPM (권장)

```bash
# 글로벌 설치
npm install -g claude-cli-analytics

# 실행 (자동으로 ~/.claude/projects 탐색)
claude-cli-analytics
```

### 📦 npx (설치 없이 실행)

```bash
npx claude-cli-analytics
```

### 🛠️ 소스에서 빌드 (기여용)

```bash
git clone https://github.com/igeunpyo/claude-analytics.git
cd claude-analytics
npm install
npm run build
npm start

# 또는 글로벌로 링크하여 사용
npm link
claude-cli-analytics
```

### ⚡ 개발 모드

```bash
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## 🛠️ Requirements

- Node.js 18+ (권장: 20+)
- npm 9+

## 🔍 .claude 경로 자동 탐색

**별도의 `init` 과정이 필요 없습니다.** 서버 시작 시 자동으로 Claude Code의 데이터 디렉토리를 탐색합니다.

Claude Code는 설치 방법에 관계없이 항상 `~/.claude/projects`에 세션 데이터를 저장합니다:

| 설치 방법 | 데이터 경로 |
|----------|-----------|
| `brew install --cask claude-code` | `~/.claude/projects` |
| `npm install -g @anthropic-ai/claude-code` | `~/.claude/projects` |
| 직접 다운로드 | `~/.claude/projects` |

### 경로 탐색 우선순위

1. `CLAUDE_PROJECTS_DIR` 환경변수 (최우선)
2. 저장된 설정 파일 (`~/.claude-analytics/config.json`)
3. 자동 탐색 (`~/.claude/projects`, `$XDG_CONFIG_HOME/claude/projects`)
4. 기본 경로 (`~/.claude/projects`)

### 커스텀 경로 사용

```bash
# 환경변수로 지정
CLAUDE_PROJECTS_DIR=/path/to/claude/projects claude-cli-analytics

# CLI 옵션으로 지정
claude-cli-analytics --path /path/to/claude/projects

# 포트 변경
claude-cli-analytics --port 8080
```

## 📈 분석 지표

### 1. 컨텍스트 지표

| 지표 | 계산 방식 | 의미 |
|------|----------|------|
| **평균 컨텍스트** | `(input_tokens + cache_read) / 요청수` | 요청당 평균 컨텍스트 크기 |
| **위험 레벨** | `<20K: 안전, 20-50K: 주의, >50K: 위험` | 컨텍스트 과부하 경고 |
| **리미트 영향도** | `(총 컨텍스트 / 44,000) × 100%` | Claude Pro 5시간 한도 대비 사용량 |

### 2. 품질 지표

| 지표 | 계산 방식 | 목표 | 의미 |
|------|----------|------|------|
| **중복 읽기율** | `(전체읽기 - 고유파일) / 전체읽기 × 100` | <20% | 같은 파일을 여러 번 읽은 비율 |
| **Read/Edit 비율** | `Read도구 횟수 / Edit도구 횟수` | ≥5:1 | 수정 전 충분한 탐색 여부 |
| **반복 수정율** | `(전체수정 - 고유파일) / 전체수정 × 100` | <20% | 같은 파일을 여러 번 수정한 비율 |
| **수정당 토큰** | `총 컨텍스트 / Edit 횟수` | <50K | 수정 1회당 소비된 토큰 |

### 3. Engineering Grade (S/A/B/C)

100점 만점 종합 점수로 산출:
- **Efficiency (40%)**: 캐시 히트율 기반
- **Stability (30%)**: 도구 오류율 기반
- **Precision (30%)**: Read/Edit 비율 기반
- **Penalty**: 팬텀 파일 접근 횟수 × 5

```
🏆 S급 (90+): Elite — 최적화된 워크플로우
⭐ A급 (80+): Good — 우수한 효율성
✅ B급 (60+): Average — 개선 여지 있음
⚠️ C급 (40+): Below Average — 최적화 필요
```

### 4. Spec Efficiency Index (SEI)

```
SEI = (Accuracy × 100) / log₁₀(Spec Volume + 1)
```

`.claude/` 컨텍스트 파일 읽기 후 오류율을 측정하여 스펙 문서의 실효성을 평가합니다.

## 🔧 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/analytics` | 전체 요약 통계 |
| `GET /api/sessions` | 세션 목록 (SEI + Grade 포함) |
| `GET /api/sessions/:id` | 세션 상세 (메시지, 토큰, 파일) |
| `GET /api/projects` | 프로젝트 목록 |
| `GET /api/config` | 현재 설정 + 자동 탐색 결과 |
| `GET /api/health` | 서버 상태 확인 |
| `POST /api/refresh` | 데이터 새로고침 |

## 📁 Project Structure

```
claude-cli-analytics/
├── src/                      # React Frontend
│   ├── pages/
│   │   ├── Dashboard.tsx     # 메인 대시보드
│   │   └── SessionDetail.tsx # 세션 상세 페이지
│   ├── App.tsx               # 라우팅
│   └── index.css             # Tailwind CSS
├── server/
│   ├── index.ts              # Express API 서버
│   ├── config.ts             # 설정 + 자동 탐색
│   ├── analyzer.ts           # 세션 분석 로직
│   ├── parser.ts             # JSONL 파서
│   └── types.ts              # 타입 정의
├── bin/
│   └── cli.js                # CLI 진입점 (--port, --path, --help)
├── dist/
│   ├── client/               # 빌드된 프론트엔드
│   └── server/               # 빌드된 백엔드
├── package.json
├── tsconfig.server.json      # 서버 빌드 설정
└── vite.config.ts
```

## 📄 License

MIT
