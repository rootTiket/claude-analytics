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

## 🚀 Usage

### Start the Dashboard
By default, the dashboard starts in **background mode**:
```bash
claude-cli-analytics
```
This will open your browser to `http://localhost:3001` and run the server in the background.

### Stop the Dashboard
To stop the background process:
```bash
claude-cli-analytics exit
```

### Check Status
Check if the dashboard is running:
```bash
claude-cli-analytics status
```

### Options
```bash
claude-cli-analytics --port 8080     # Run on custom port
claude-cli-analytics --path /foo     # Custom projects directory
claude-cli-analytics --foreground    # Run in foreground (Ctrl+C to stop)
claude-cli-analytics --help          # Show help
```

### 경로 탐색 우선순위

1. `CLAUDE_PROJECTS_DIR` 환경변수 (최우선)
2. 저장된 설정 파일 (`~/.claude-analytics/config.json`)
3. 자동 탐색 (`~/.claude/projects`, `$XDG_CONFIG_HOME/claude/projects`)
4. 기본 경로 (`~/.claude/projects`)

### 커스텀 경로 사용

```bash
# 환경변수로 지정
CLAUDE_PROJECTS_DIR=/path/to/claude/projects claude-cli-analytics
```

## 📈 분석 지표 (Anthropic Skill Evaluation Framework)

> Anthropic의 공식 스킬 평가 프레임워크를 기반으로 구성된 지표입니다.

---

### 📊 정량적 지표 (Quantitative Metrics)

#### 1. 컨텍스트 자동 탐색 성공률 (Skill Trigger Rate)

> *Anthropic 기준: 관련 쿼리의 90%에서 스킬이 트리거됨*

| 지표 | 계산 방식 | 목표 | 의미 |
|------|----------|------|------|
| **캐시 히트율** | `cache_read / (input + cache_read) × 100` | ≥ 70% | 스킬(컨텍스트)이 자동으로 로드된 비율 |
| **스펙 컨텍스트 활용률** | `spec 파일 읽은 세션 / 전체 세션 × 100` | ≥ 90% | `.claude/` 스펙이 자동 트리거된 비율 |
| **위험 레벨** | `<20K: 최적, 20-50K: 주의, >50K: 위험` | 최적 | 컨텍스트 과부하 경고 |
| **리미트 영향도** | `(총 컨텍스트 / 44,000) × 100%` | — | Claude Pro 5시간 한도 대비 사용량 |

**측정 방법**: 테스트 쿼리 10~20개를 실행하여, 자동으로 캐시 히트가 되는 비율과 스펙 컨텍스트가 로드되는 비율을 추적합니다.

#### 2. 도구 호출 효율성 (Tool Call Efficiency)

> *Anthropic 기준: X도구 호출로 워크플로우 완료*

| 지표 | 계산 방식 | 목표 | 의미 |
|------|----------|------|------|
| **Read/Edit 비율** | `Read도구 횟수 / Edit도구 횟수` | ≥ 5:1 | 수정 전 충분한 탐색 여부 |
| **수정당 토큰** | `총 컨텍스트 / Edit 횟수` | < 50K | 수정 1회당 소비된 토큰 |
| **중복 읽기율** | `(전체읽기 - 고유파일) / 전체읽기 × 100` | < 20% | 불필요한 반복 읽기 비율 |
| **반복 수정율** | `(전체수정 - 고유파일) / 전체수정 × 100` | < 20% | 같은 파일 반복 수정 비율 |

**측정 방법**: 스킬(스펙 컨텍스트) 활성화 전후 동일 작업을 비교하여 도구 호출 횟수와 총 토큰 소비량을 집계합니다.

#### 3. API 실패율 (Failed API Calls per Workflow)

> *Anthropic 기준: 워크플로당 실패한 API 호출 0회*

| 지표 | 계산 방식 | 목표 | 의미 |
|------|----------|------|------|
| **도구 오류율** | `오류 도구 호출 / 전체 도구 호출 × 100` | 0% | 실패한 도구 호출 비율 |
| **오류 상세** | 도구별 오류 메시지 및 빈도 집계 | — | 재시도율 및 오류 코드 추적 |
| **세션 종료 유형** | `clean / forced / unknown` | clean | 비정상 종료 여부 |

**측정 방법**: 테스트 실행 중 도구 호출 로그를 모니터링하며, 재시도율 및 오류 코드를 추적합니다.

---

### 🎯 정성적 지표 (Qualitative Metrics)

#### 4. 사용자 개입 빈도 (User Intervention Frequency)

> *Anthropic 기준: 사용자가 Claude에게 다음 단계를 묻지 않아도 됨*

| 지표 | 계산 방식 | 목표 | 의미 |
|------|----------|------|------|
| **Human Turns** | 사용자 메시지(명령 포함) 횟수 | 최소화 | 사용자가 방향 전환/명확화한 횟수 |
| **Auto Turns** | 자동 실행된 턴 수 | 최대화 | 사용자 개입 없이 진행된 턴 수 |
| **HT/Edit 비율** | `Human Turns / Edit 횟수` | < 1.0 | 수정당 사용자 개입 빈도 |

**측정 방법**: 테스트 중 사용자가 방향을 전환하거나 명확히 설명해야 하는 빈도를 기록합니다.

#### 5. 워크플로우 자립 완료율 (Workflow Autonomy)

> *Anthropic 기준: 사용자 수정 없이 완료되는 워크플로우*

| 지표 | 계산 방식 | 목표 | 의미 |
|------|----------|------|------|
| **반복 수정율** | `(전체수정 - 고유파일) / 전체수정 × 100` | < 20% | 재작업 없이 완료된 비율 |
| **효율성 점수** | 캐시·오류·작업 효율 종합 (100점) | ≥ 80 | 워크플로우 자립 완성도 |
| **SEI** | `(Accuracy × 100) / log₁₀(Spec Volume + 1)` | — | 스펙 문서의 실효성 |

**측정 방법**: 동일 요청을 3~5회 실행하여 구조적 일관성과 품질 측면에서 출력을 비교합니다.

#### 6. 세션 간 일관성 (Cross-Session Consistency)

> *Anthropic 기준: 세션 간 일관된 결과*

| 지표 | 계산 방식 | 목표 | 의미 |
|------|----------|------|------|
| **Engineering Grade** | Efficiency(40%) + Stability(30%) + Precision(30%) - Penalty | S급 | 세션별 품질 등급 일관성 |
| **등급 분포** | S/A/B/C 세션 비율 | S·A ≥ 80% | 전체 세션의 품질 편차 |
| **스펙 유무 비교** | 스펙 있는 세션 vs 없는 세션 성과 차이 | — | 컨텍스트 효과의 일관성 |

**측정 방법**: 신규 사용자가 최소한의 안내만으로 첫 시도에서 작업을 완료할 수 있는지 평가합니다.

```
🏆 S급 (90+): Elite — 최적화된 워크플로우, 일관된 고품질
⭐ A급 (80+): Good — 우수한 효율성, 안정적 결과
✅ B급 (60+): Average — 개선 여지 있음, 세션 간 편차 존재
⚠️ C급 (40+): Below Average — 최적화 필요, 일관성 부족
```

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
