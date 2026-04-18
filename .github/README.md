# .github 안내서

이 디렉터리는 이 저장소의 AI 코딩 하네스 본체입니다.

핵심 목적은 일반적인 코딩 업무를 더 안정적으로 수행하게 만드는 것입니다.

- 훅으로 자동 검증과 기록 수행
- 스킬로 작업 방식 표준화
- 에이전트 정의로 역할 분리 가능하게 준비

## 디렉터리 구성

### `hooks/`

에이전트 세션 중 자동으로 실행되는 훅 구현입니다.

주요 파일:

- `hooks.json`: 훅 이벤트 설정
- `scripts/*.mjs`: 기능별 훅 엔트리포인트
- `lib/*.mjs`: 기능별 로직과 공용 유틸
- `hook-runner.mjs`: 호환용 액션 디스패처
- `README.md`: 훅 전용 설명서

#### 각 훅 설명

| 훅 | 역할 |
|---|---|
| `sessionStart` | 세션 시작 시점 기록 |
| `sessionEnd` | 세션 종료 기록 및 변경 파일 기반 시크릿 스캔 |
| `userPromptSubmitted` | 사용자가 보낸 프롬프트를 기록 |
| `preToolUse` | 위험한 명령 실행 전에 가드 검사 |
| `postToolUse` | 파일 수정 뒤 포맷/린트 작업 수행 |

#### 훅이 하는 실제 일

- 세션 로그 남김
- 프롬프트 로그 남김
- 위험한 명령 감지
- Python 파일에 `ruff` 적용 가능 시 실행
- 웹/문서 계열 파일에 `prettier` 적용 가능 시 실행
- 변경 파일에서 시크릿 패턴 탐지

#### 왜 Node 기반인가

- macOS, Linux, Windows에서 같은 실행 경로를 쓸 수 있음
- Bash 전용 도구 의존도를 줄일 수 있음
- JSON 처리와 프로세스 실행을 한 구현으로 관리할 수 있음
- 기능별 파일로 분리해서 유지보수하기 쉬움

### `skills/`

에이전트가 일반적인 개발 업무를 수행할 때 참고하는 작업 지침 문서 모음입니다.

이 문서들은 실행 파일이 아니라, 작업 절차와 품질 기준을 정리한 운영 문서입니다.

#### 각 스킬 설명

| 스킬 | 역할 |
|---|---|
| `api-and-interface-design` | API와 모듈 경계를 안정적으로 설계하는 기준 |
| `browser-testing-with-devtools` | 브라우저 런타임 검증과 DevTools 기반 디버깅 절차 |
| `ci-cd-and-automation` | CI/CD 파이프라인과 자동화 체크 구성 가이드 |
| `code-review-and-quality` | 코드 리뷰 시 correctness, security, performance 등을 점검하는 기준 |
| `code-simplification` | 동작은 유지하면서 코드를 더 단순하게 만드는 기준 |
| `context-engineering` | 에이전트가 어떤 문맥을 먼저 읽어야 하는지 정리 |
| `debugging-and-error-recovery` | 오류 재현, 원인 파악, 복구 절차 |
| `deprecation-and-migration` | 오래된 시스템 제거와 마이그레이션 절차 |
| `documentation-and-adrs` | README, ADR, 설계 문서를 어떻게 남길지에 대한 기준 |
| `frontend-ui-engineering` | 프로덕션 품질의 UI 구현 원칙 |
| `git-workflow-and-versioning` | 커밋 분리, 브랜치 전략, 히스토리 관리 기준 |
| `idea-refine` | 아이디어를 구현 가능한 형태로 다듬는 절차 |
| `incremental-implementation` | 큰 작업을 작은 단위로 나눠 구현하는 방법 |
| `performance-optimization` | 성능 병목을 측정하고 최적화하는 절차 |
| `planning-and-task-breakdown` | 요구사항을 작업 단위로 쪼개는 방법 |
| `security-and-hardening` | 입력 검증, 인증, 비밀정보, 권한 처리 등 보안 기준 |
| `shipping-and-launch` | 배포 전 체크리스트와 롤백 계획 |
| `spec-driven-development` | 구현 전 스펙을 먼저 정리하는 방식 |
| `test-driven-development` | 테스트를 먼저 작성하고 구현하는 절차 |
| `using-agent-skills` | 어떤 상황에 어떤 스킬을 써야 하는지 설명하는 메타 스킬 |

즉, 이 `skills/`는 일반적인 코딩 업무 전반을 커버하는 작업 플레이북이라고 보면 됩니다.

### `agents/`

전용 에이전트 정의를 두는 영역입니다.

현재 상태:

- 활성 에이전트 정의 파일 없음

이 디렉터리는 나중에 특정 역할 전용 에이전트를 둘 수 있도록 남겨둔 자리입니다.

예를 들면 아래 같은 식으로 역할을 분리할 수 있습니다.

- 구현 전용 에이전트
- 리뷰 전용 에이전트
- 디버깅 전용 에이전트
- 문서 작성 전용 에이전트

전용 에이전트 파일들은 현재 `.github/agents/` 아래에서 관리됩니다.

### `logs/`

훅 실행 중 생성되는 로컬 로그입니다.

예시:

- `session.log`
- `prompts.log`
- `tool-guardian.log`
- `format-lint.log`
- `scan.log`

이 디렉터리는 소스가 아니라 실행 결과물이므로 Git에 올리지 않습니다.

## GitHub 공식 `.github` 기능과 이 저장소의 차이

GitHub는 `.github/`를 저장소 설정용으로 공식 사용합니다.

대표 예시:

- `CODEOWNERS`
- `copilot-instructions.md`
- `.github/instructions/*.instructions.md`
- 각종 workflow, template 파일

이 저장소는 여기에 더해 `.github/`를 일반 코딩 업무용 AI 하네스 공간으로 사용합니다.

즉, GitHub 공식 기능을 대체하는 게 아니라, 그 위에 운영용 구조를 더 얹은 형태입니다.

## 수정 원칙

- `hooks/`는 실행 코드로 취급
- `skills/`는 작업 지침 문서로 취급
- `agents/`는 역할별 에이전트 정의 영역으로 취급
- `logs/`는 로컬 산출물로 취급하며 커밋하지 않음