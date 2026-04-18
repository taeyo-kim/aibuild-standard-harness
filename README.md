# AI Build - Standard Harness

이 저장소는 일반적인 코딩 업무를 대상으로 AIBUILD 팀이 사용하는 GitHub Copilot 기반 하네스입니다.

주요 목적:

- 저장소별 작업 규칙을 정리해서 에이전트 탐색 비용 줄이기
- 세션 전후 자동 작업을 붙여서 실수 줄이기
- 구현, 리뷰, 디버깅, 문서화 같은 전형적인 코딩 업무를 재사용 가능한 단위로 정리하기

`.github/` 아래에 핵심 구성이 모여 있으며, GitHub Copilot과 관련된 저장소 로컬 운영 레이어를 담고 있습니다.

## GitHub 공식 개념과 이 저장소의 대응

GitHub 공식 문서 기준으로 Copilot은 저장소 안에서 사용자 정의 지침을 읽을 수 있습니다.

참고:

- GitHub Copilot 저장소 지침: https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions
- GitHub CODEOWNERS: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners

| 구분 | GitHub 공식 위치 | GitHub 공식 의미 | 이 저장소에서의 의미 |
|---|---|---|---|
| 저장소 전체 지침 | `.github/copilot-instructions.md` | 저장소 전체 요청에 적용되는 repository-wide custom instructions | 이 저장소는 같은 철학으로 `.github/` 아래에 작업용 하네스를 배치함 |
| 경로별 지침 | `.github/instructions/*.instructions.md` | 특정 파일 경로에만 적용되는 path-specific custom instructions | 현재 이 저장소의 `skills/`는 공식 `.instructions.md` 형식은 아니지만, 경로/상황별 작업 규칙을 문서로 정리한 운영 레이어 |
| 에이전트 지침 | `AGENTS.md` | AI agent가 읽는 agent instructions, 가장 가까운 파일이 우선 | 이 저장소의 `.github/agents/`는 공식 `AGENTS.md`와 별개로 역할 설명/정의 파일을 둘 공간 |
| 코드 소유권 | `.github/CODEOWNERS` 또는 루트/`docs/`의 `CODEOWNERS` | 코드 변경 시 리뷰 책임자 지정 | 이 저장소는 현재 CODEOWNERS 대신 하네스 문서 중심으로 구조 설명 |

중요한 점:

- `hooks`와 `skills`는 GitHub 공식 파일 타입이라기보다, 이 저장소가 일반적인 코딩 업무를 지원하려고 얹은 저장소 로컬 구조입니다.
- `AGENTS.md`는 GitHub가 공식적으로 설명하는 agent instructions 파일이고, `.github/agents/`는 이 저장소 내부 운영용 디렉터리입니다.

## 이 하네스에서 말하는 Hook, Agent, Skill

| 개념 | 이 저장소에서의 뜻 | 저장 위치 |
|---|---|---|
| Hook | 에이전트 세션이나 도구 실행 전후에 자동으로 수행되는 작업 | `.github/hooks/` |
| Agent | 특정 역할에 맞춘 전용 에이전트 정의를 둘 자리 | `.github/agents/` |
| Skill | 구현, 리뷰, 디버깅 같은 반복 업무를 표준화한 작업 지침 문서 | `.github/skills/` |

## 현재 활성 Hook 목록

활성 훅 설정은 `.github/hooks/hooks.json`에 있고, 실제 엔트리포인트는 `.github/hooks/scripts/*.mjs`입니다. `.github/hooks/hook-runner.mjs`는 호환용 디스패처로 남아 있습니다.

| 훅 이벤트 | 실행 액션 | 역할 | 구현 위치 |
|---|---|---|---|
| `sessionStart` | `log-session-start.mjs` | 세션 시작 로그 기록 | `.github/hooks/scripts/log-session-start.mjs` |
| `sessionEnd` | `log-session-end.mjs` | 세션 종료 로그 기록 | `.github/hooks/scripts/log-session-end.mjs` |
| `sessionEnd` | `scan-secrets.mjs` | 변경 파일 기준 시크릿 패턴 스캔 | `.github/hooks/scripts/scan-secrets.mjs` |
| `userPromptSubmitted` | `log-prompt.mjs` | 사용자 프롬프트 기록 | `.github/hooks/scripts/log-prompt.mjs` |
| `preToolUse` | `tool-guardian.mjs` | 위험한 명령 감지 및 가드 | `.github/hooks/scripts/tool-guardian.mjs` |
| `postToolUse` | `format-lint.mjs` | 파일 수정 후 포맷/린트 실행 | `.github/hooks/scripts/format-lint.mjs` |

추가 메모:

- `.github/hooks/scripts/`가 실제 활성 엔트리포인트입니다.
- 공용 로직은 `.github/hooks/lib/`로 분리되어 있습니다.
- `hook-runner.mjs`는 액션 이름으로 실행해야 할 때 사용할 수 있는 호환용 디스패처입니다.
- 이 방식은 macOS, Linux, Windows를 하나의 런타임으로 맞추기 위한 선택입니다.

## 현재 Agent 목록

현재 `.github/agents/` 아래에는 역할별 전용 에이전트 정의 파일이 있습니다.

| 이름 | 상태 | 역할 |
|---|---|---|
| `orchestrator` | 활성 | 멀티 에이전트 오케스트레이션과 작업 라우팅 |
| `planner` | 활성 | DAG 기반 계획 수립과 작업 분해 |
| `researcher` | 활성 | 코드베이스 탐색과 패턴 조사 |
| `implementer` | 활성 | 구현과 버그 수정 |
| `reviewer` | 활성 | 보안/품질/PRD 검증 |
| `debugger` | 활성 | 원인 분석과 재현 중심 진단 |
| `critic` | 활성 | 가정 검증, 엣지 케이스, 과설계 점검 |
| `code-simplifier` | 활성 | 리팩터링과 복잡도 축소 |
| `designer` | 활성 | UI/UX 설계와 시각 검토 |
| `browser-tester` | 활성 | 브라우저 기반 E2E 검증 |
| `devops` | 활성 | 배포, 인프라, CI/CD 작업 |
| `documentation-writer` | 활성 | README, 문서, 워크스루 작성 |

즉, 현재 이 저장소는 Hook, Skill, Agent를 모두 갖춘 하네스 구조입니다.

## 현재 Skill 목록

Skill은 전형적인 코딩 업무를 표준 절차로 문서화한 것입니다.

| Skill | 역할 |
|---|---|
| `api-and-interface-design` | API와 인터페이스 경계를 안정적으로 설계 |
| `browser-testing-with-devtools` | 브라우저에서 DOM, 콘솔, 네트워크, 성능을 실제로 확인하며 검증 |
| `ci-cd-and-automation` | CI/CD 파이프라인과 자동 품질 게이트 구성 |
| `code-review-and-quality` | correctness, security, performance를 포함한 다면 코드 리뷰 기준 |
| `code-simplification` | 동작은 유지하면서 코드를 더 단순하게 정리 |
| `context-engineering` | 작업 전에 어떤 문맥과 파일을 읽어야 하는지 정리 |
| `debugging-and-error-recovery` | 오류 재현, 원인 분석, 복구 절차 |
| `deprecation-and-migration` | 오래된 시스템 제거와 마이그레이션 계획 |
| `documentation-and-adrs` | README, ADR, 설계 문서를 남기는 기준 |
| `frontend-ui-engineering` | 프로덕션 품질 UI 구현 원칙 |
| `git-workflow-and-versioning` | 커밋 분리, 브랜치 전략, Git 작업 원칙 |
| `idea-refine` | 아이디어를 구현 가능한 방향으로 정리 |
| `incremental-implementation` | 큰 작업을 작은 단위로 끊어 구현 |
| `planning-and-task-breakdown` | 요구사항을 실행 가능한 작업으로 분해 |
| `security-and-hardening` | 입력 검증, 비밀정보, 권한, 외부 연동 보안 강화 |
| `shipping-and-launch` | 배포 전 점검, 롤백, 모니터링 준비 |
| `spec-driven-development` | 구현 전에 스펙부터 명확히 정리 |
| `test-driven-development` | 테스트를 먼저 쓰고 구현 |
| `using-agent-skills` | 상황별로 어떤 skill을 써야 하는지 안내하는 메타 스킬 |

## 디렉터리 구조

| 경로 | 역할 |
|---|---|
| `.github/hooks/` | 훅 설정, 기능별 엔트리포인트, 공용 유틸 보관 |
| `.github/skills/` | 코딩 업무용 작업 지침서 보관 |
| `.github/agents/` | 역할별 에이전트 정의를 둘 공간 |
| `.github/logs/` | 훅 실행 중 생기는 로컬 런타임 로그 |

## 필수 설치

| 구분 | 도구 | 설명 |
|---|---|---|
| 필수 | `git` | 저장소 상태 확인, diff 기반 시크릿 스캔 등에 필요 |
| 필수 | `node` | 활성 훅 스크립트와 공용 런타임 실행에 필요 |
| 선택 | `prettier` | JS/TS/JSON/YAML/Markdown/CSS/HTML 포맷팅 |
| 선택 | `ruff` | Python 린트/포맷팅 |

선택 도구가 없어도 하네스는 동작합니다. 다만 관련 포맷/린트 단계는 건너뛰고 설치 안내만 남깁니다.

## 운영체제별 설치

### macOS

```bash
brew install git node
```

선택 도구:

```bash
npm install --global prettier
python3 -m pip install ruff
```

### Windows

```powershell
winget install --id Git.Git -e
winget install --id OpenJS.NodeJS.LTS -e
```

선택 도구:

```powershell
npm install --global prettier
py -m pip install ruff
```

`winget`이 없으면 공식 설치 프로그램이나 Chocolatey를 사용해도 됩니다.

### Linux

Debian/Ubuntu 예시:

```bash
sudo apt-get update
sudo apt-get install -y git nodejs npm
```

선택 도구:

```bash
npm install --global prettier
python3 -m pip install ruff
```

Fedora/RHEL 계열은 `apt-get` 대신 `dnf`를 사용하면 됩니다.

## 실행 및 관리 메모

- 활성 훅은 `.github/hooks/hooks.json`에 정의되어 있습니다.
- 로그 디렉터리인 `.github/logs/`는 런타임 산출물이므로 커밋 대상에서 제외하는 운영이 적절합니다.
- 더 자세한 `.github` 구조 설명은 `.github/README.md`에 있습니다.