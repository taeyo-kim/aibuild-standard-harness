# AI Build - Standard Harness

이 저장소는 일반적인 코딩 업무를 대상으로 AIBUILD 팀이 사용하는 GitHub Copilot 기반 하네스입니다.

이 하네스는 저장소 안에서 반복되는 코딩 작업을 더 예측 가능하게 만들기 위해 구성되어 있습니다. 핵심 구조는 `.github/` 아래에 모여 있으며, setup 이후 agent, hook, skill이 서로 연결되어 작동합니다.

## Setup

먼저 아래 도구가 준비되어 있어야 합니다.

| 구분 | 도구 | 설명 |
|---|---|---|
| 필수 | `git` | 저장소 상태 확인, diff 기반 시크릿 스캔 등에 필요 |
| 필수 | `node` | 활성 훅 스크립트와 공용 런타임 실행에 필요 |
| 선택 | `prettier` | JS/TS/JSON/YAML/Markdown/CSS/HTML 포맷팅 |
| 선택 | `ruff` | Python 린트/포맷팅 |

선택 도구가 없어도 하네스는 동작합니다. 다만 관련 포맷/린트 단계는 건너뛰고 설치 안내만 남깁니다.

운영체제별 기본 설치 예시는 아래와 같습니다.

| 운영체제 | 필수 설치 | 선택 설치 |
|---|---|---|
| macOS | `brew install git node` | `npm install --global prettier` / `python3 -m pip install ruff` |
| Windows | `winget install --id Git.Git -e`<br>`winget install --id OpenJS.NodeJS.LTS -e` | `npm install --global prettier` / `py -m pip install ruff` |
| Linux (Debian/Ubuntu) | `sudo apt-get update && sudo apt-get install -y git nodejs npm` | `npm install --global prettier` / `python3 -m pip install ruff` |

Windows에서는 `winget`이 없으면 공식 설치 프로그램이나 Chocolatey를 사용해도 됩니다. Fedora/RHEL 계열은 `apt-get` 대신 `dnf`를 사용하면 됩니다.

## Agents

Agent는 역할별로 분리된 전용 작업자입니다. 요청을 해석하고 조정하는 역할부터 구현, 디버깅, 디자인, 테스트, 배포, 문서화까지 각자 담당 범위가 나뉘어 있습니다.

| 에이전트 | 설명 |
|---|---|
| `orchestrator` | 전체 작업의 진입점으로 동작하며 단계 판별, 에이전트 라우팅, 결과 종합을 담당합니다. |
| `planner` | DAG 기반 실행 계획, 작업 분해, wave 스케줄링, 리스크 분석을 담당합니다. |
| `researcher` | 코드베이스 구조, 패턴, 의존성, 아키텍처를 조사해 구현 전 문맥을 정리합니다. |
| `implementer` | TDD 기반 구현, 기능 개발, 버그 수정, 리팩터링을 수행합니다. |
| `reviewer` | 보안 감사, 코드 리뷰, OWASP 점검, PRD 준수 여부 검증을 담당합니다. |
| `debugger` | 에러 재현, 스택 추적, 회귀 분석, 원인 진단에 집중합니다. |
| `critic` | 가정 검증, 엣지 케이스 탐색, 과설계와 논리 빈틈 점검을 담당합니다. |
| `code-simplifier` | 죽은 코드 제거, 복잡도 감소, 중복 정리, 가독성 개선에 집중합니다. |
| `designer` | UI/UX 설계, 레이아웃, 테마, 반응형, 접근성 검토를 담당합니다. |
| `browser-tester` | 브라우저 기반 E2E 테스트, 시각 검증, 접근성 확인을 수행합니다. |
| `devops` | 컨테이너, 배포, CI/CD, 인프라 설정과 운영 작업을 담당합니다. |
| `documentation-writer` | README, API 문서, 다이어그램, 워크스루 문서를 작성하거나 갱신합니다. |

## Hooks

Hook은 에이전트 세션이나 도구 실행 전후에 자동으로 실행되는 작업입니다. 이 저장소에서는 `.github/hooks/hooks.json`이 이벤트를 정의하고, `.github/hooks/scripts/*.mjs`가 실제 엔트리포인트 역할을 하며, 공용 로직은 `.github/hooks/lib/`에 분리되어 있습니다.

| 훅 이벤트 | 실행 액션 | 설명 | 구현 위치 |
|---|---|---|---|
| `sessionStart` | `log-session-start.mjs` | 세션 시작 시 작업 시작 정보를 로그에 남깁니다. | `.github/hooks/scripts/log-session-start.mjs` |
| `sessionEnd` | `log-session-end.mjs` | 세션 종료 시 종료 사유와 세션 종료 기록을 남깁니다. | `.github/hooks/scripts/log-session-end.mjs` |
| `sessionEnd` | `scan-secrets.mjs` | 세션 중 변경된 파일을 기준으로 시크릿 패턴을 검사합니다. | `.github/hooks/scripts/scan-secrets.mjs` |
| `userPromptSubmitted` | `log-prompt.mjs` | 사용자 프롬프트를 기록해 세션 흐름을 추적할 수 있게 합니다. | `.github/hooks/scripts/log-prompt.mjs` |
| `preToolUse` | `tool-guardian.mjs` | 위험한 명령이나 파괴적 작업을 감지해 가드 역할을 합니다. | `.github/hooks/scripts/tool-guardian.mjs` |
| `postToolUse` | `format-lint.mjs` | 파일 수정 후 포맷팅과 린트 작업을 자동으로 시도합니다. | `.github/hooks/scripts/format-lint.mjs` |

이 구조는 macOS, Linux, Windows에서 같은 런타임 흐름을 유지하려는 목적에 맞춰 정리되어 있습니다.

## Skills

Skill은 반복적으로 쓰는 작업 방식을 문서화한 실행 가이드입니다. 에이전트가 작업을 시작하기 전에 어떤 기준과 절차를 따라야 하는지 빠르게 불러올 수 있도록 정리되어 있습니다.

| 스킬 | 설명 |
|---|---|
| `api-and-interface-design` | 안정적인 API와 인터페이스 경계를 설계할 때 사용하는 가이드입니다. |
| `browser-testing-with-devtools` | 브라우저에서 DOM, 콘솔, 네트워크, 성능을 실제로 검증하는 방법을 정리합니다. |
| `ci-cd-and-automation` | CI/CD 파이프라인, 자동화, 품질 게이트 구성을 다룹니다. |
| `code-review-and-quality` | 코드 리뷰 시 정확성, 보안, 성능, 리스크를 점검하는 기준을 제공합니다. |
| `code-simplification` | 동작을 바꾸지 않고 복잡도를 줄이며 코드를 단순화하는 절차를 다룹니다. |
| `context-engineering` | 작업 시작 전에 어떤 문맥과 규칙을 먼저 읽어야 하는지 정리합니다. |
| `debugging-and-error-recovery` | 오류 재현, 원인 분석, 복구 절차를 체계적으로 수행하는 방법을 다룹니다. |
| `deprecation-and-migration` | 기존 시스템 제거, 전환, 사용자 마이그레이션 전략을 정리합니다. |
| `documentation-and-adrs` | README, 설계 문서, ADR처럼 의사결정 기록을 남기는 기준을 제공합니다. |
| `frontend-ui-engineering` | 프로덕션 품질 UI 구현, 상호작용, 시각 완성도를 위한 가이드입니다. |
| `git-workflow-and-versioning` | 브랜치, 커밋, 변경 범위 분리 등 Git 작업 원칙을 정리합니다. |
| `idea-refine` | 모호한 아이디어를 구현 가능한 방향으로 구체화하는 데 사용합니다. |
| `incremental-implementation` | 큰 구현 작업을 작은 단위로 나누어 점진적으로 진행하는 방법을 다룹니다. |
| `planning-and-task-breakdown` | 요구사항을 실행 가능한 작업 단위로 분해하고 순서를 정리합니다. |
| `security-and-hardening` | 입력 검증, 인증, 권한, 외부 연동 등 보안 강화 포인트를 다룹니다. |
| `shipping-and-launch` | 배포 전 체크리스트, 롤아웃, 모니터링, 롤백 준비를 정리합니다. |
| `spec-driven-development` | 구현 전에 요구사항과 스펙을 먼저 명확히 하는 절차를 제공합니다. |
| `test-driven-development` | 테스트를 먼저 작성하고 구현하는 TDD 흐름을 정리합니다. |
| `using-agent-skills` | 어떤 상황에서 어떤 skill을 읽어야 하는지 연결해 주는 메타 가이드입니다. |

## 실행 및 관리 메모

- 활성 훅은 `.github/hooks/hooks.json`에 정의되어 있습니다.
- 로그 디렉터리인 `.github/logs/`는 런타임 산출물이므로 커밋 대상에서 제외하는 운영이 적절합니다.
- 더 자세한 `.github` 구조 설명은 `.github/README.md`에 있습니다.