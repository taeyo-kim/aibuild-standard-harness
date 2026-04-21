# Harness Engineering with GitHub Copilot

GitHub Copilot 기반으로 일상 개발에 바로 적용할 수 있는 하네스를 정리한 저장소입니다.

이 저장소는 MSFT AIBUILD 팀이 실제 프로젝트와 일상 개발에서 사용하는 하네스 중, 도메인 특화 요소를 제외하고 범용적으로 재사용 가능한 구성만 추려서 정리한 예시입니다. 핵심 구성은 Agent, Hooks, Skills 세 축이며, 관련 자산은 대부분 `.github/` 아래에 모여 있습니다.

프로젝트에 맞게 그대로 가져다 쓰거나, 팀 규칙과 도메인에 맞춰 수정해서 사용할 수 있습니다.

## Overview

이 저장소는 아래 세 가지를 한 번에 다룹니다.

| 구성 | 역할 | 위치 |
|---|---|---|
| Agents | 역할별 전문 작업자를 정의 | `.github/agents/` |
| Hooks | 세션 시작/종료, tool 실행 전후에 자동화 로직을 연결 | `.github/hooks/` |
| Skills | 반복적으로 쓰는 작업 방식을 실행 가능한 가이드로 문서화 | `.github/skills/` |

추가로 `spec/` 아래에는 예시 스펙 구조가 포함되어 있어, 스펙 기반으로 점진적으로 작업을 쪼개는 방식도 함께 참고할 수 있습니다.

## Repository Layout

```text
.
├── .github/
│   ├── agents/
│   ├── hooks/
│   ├── logs/
│   └── skills/
├── spec/
│   └── board-game/
└── README.md
```

## Quick Start

### 1. Prerequisites

먼저 아래 도구가 준비되어 있어야 합니다.

| 구분 | 도구 | 설명 |
|---|---|---|
| 필수 | `git` | 저장소 상태 확인, diff 기반 시크릿 검사 등에 필요 |
| 필수 | `node` | 활성 hook 스크립트와 공용 런타임 실행에 필요 |
| 선택 | `prettier` | JS/TS/JSON/YAML/Markdown/CSS/HTML 포맷팅 |
| 선택 | `ruff` | Python 린트/포맷팅 |

선택 도구가 없어도 하네스 자체는 동작합니다. 다만 관련 포맷팅과 린트 단계는 건너뛰고 설치 안내만 남기도록 구성하는 편이 일반적입니다.

운영체제별 기본 설치 예시는 아래와 같습니다.

| 운영체제 | 필수 설치 | 선택 설치 |
|---|---|---|
| macOS | `brew install git node` | `npm install --global prettier` / `python3 -m pip install ruff` |
| Windows | `winget install --id Git.Git -e`<br>`winget install --id OpenJS.NodeJS.LTS -e` | `npm install --global prettier` / `py -m pip install ruff` |
| Linux (Debian/Ubuntu) | `sudo apt-get update && sudo apt-get install -y git nodejs npm` | `npm install --global prettier` / `python3 -m pip install ruff` |

Windows에서 `winget`을 쓰지 않는다면 공식 설치 프로그램이나 Chocolatey를 사용해도 됩니다. Fedora/RHEL 계열은 `apt-get` 대신 `dnf`를 사용하면 됩니다.

### 2. Use It from Chat or CLI

이 하네스는 둘 다를 기준으로 사용할 수 있습니다.

- GitHub Copilot Chat
- GitHub Copilot CLI

즉, VS Code의 Copilot Chat에서 사용해도 되고, 터미널에서 Copilot CLI로 사용해도 됩니다. 복잡한 작업은 Agent와 Skill을 적극 활용하고, 작은 작업은 바로 프롬프트로 처리하는 방식이 가장 실용적입니다.

## Recommended Operating Model

> [!NOTE]
> 복잡한 멀티스텝 작업, 여러 파일에 걸친 변경, 조사와 계획이 먼저 필요한 작업은 `orchestrator`부터 시작하는 것을 권장합니다. `orchestrator`가 작업을 분류하고, 필요하면 다른 agent로 라우팅하며, 전체 흐름을 조정하는 진입점 역할을 합니다.

> [!TIP]
> 단순한 코드 수정, 짧은 문서 수정, 한두 파일 수준의 리팩터링, 빠른 질의응답은 agent를 굳이 따로 호출하지 않고 GitHub Copilot Chat 또는 Copilot CLI에서 바로 처리해도 충분합니다.

실무에서는 보통 아래처럼 나누면 됩니다.

| 작업 유형 | 추천 방식 |
|---|---|
| 조사, 계획, 구현, 리뷰가 모두 필요한 큰 작업 | `orchestrator`부터 시작 |
| 특정 역할이 분명한 작업 | 해당 agent를 직접 호출 |
| 간단한 수정, 짧은 문서 작업, 빠른 질의응답 | Copilot Chat 또는 Copilot CLI로 직접 처리 |

## Agents

Agent는 역할별로 분리된 전용 작업자입니다. 이 저장소에서는 `.github/agents/*.agent.md` 파일로 정의되어 있으며, 요청을 해석하고 조정하는 역할부터 구현, 디버깅, 디자인, 테스트, 배포, 문서화까지 담당 범위를 나눠서 운영합니다.

| Agent | 설명 |
|---|---|
| `orchestrator` | 전체 작업의 진입점입니다. 작업 분류, agent 라우팅, 결과 종합을 담당합니다. |
| `planner` | DAG 기반 실행 계획, 작업 분해, 스케줄링, 리스크 분석을 담당합니다. |
| `researcher` | 코드베이스 구조, 패턴, 의존성, 아키텍처를 조사해 구현 전 문맥을 정리합니다. |
| `implementer` | TDD 기반 구현, 기능 개발, 버그 수정, 리팩터링을 수행합니다. |
| `reviewer` | 보안 감사, 코드 리뷰, OWASP 점검, 요구사항 준수 여부 검증을 담당합니다. |
| `debugger` | 오류 재현, 스택 추적, 회귀 분석, 원인 진단에 집중합니다. |
| `critic` | 가정 검증, 엣지 케이스 탐색, 과설계 여부와 논리 빈틈 점검을 담당합니다. |
| `code-simplifier` | 죽은 코드 제거, 복잡도 감소, 중복 정리, 가독성 개선에 집중합니다. |
| `designer` | UI/UX 설계, 레이아웃, 테마, 반응형, 접근성 검토를 담당합니다. |
| `browser-tester` | 브라우저 기반 E2E 테스트, 시각 검증, 접근성 확인을 수행합니다. |
| `devops` | 컨테이너, 배포, CI/CD, 인프라 설정과 운영 작업을 담당합니다. |
| `documentation-writer` | README, API 문서, 다이어그램, 워크스루 문서를 작성하거나 갱신합니다. |

## Hooks

Hook은 agent 세션이나 tool 실행 전후에 자동으로 실행되는 작업입니다. 이 저장소에서는 `.github/hooks/hooks.json`이 이벤트를 정의하고, OS별 wrapper와 `.github/hooks/hook-runner.mjs`가 실행 경로를 연결하며, 공용 로직은 `.github/hooks/lib/`에 분리되어 있습니다.

현재 hook 런타임은 Node 기반으로 정리되어 있어 macOS, Linux, Windows에서 같은 흐름으로 운영하기 쉽습니다.

다만 이 구성은 어디에나 그대로 복사해 쓰기 위한 완성형이라기보다, 여러 환경에서 출발점으로 재사용할 수 있는 범용 베이스라인에 가깝습니다. 특히 hook은 로컬 셸, 런타임 경로, 보안 정책, CI 제약, 팀의 승인 규칙에 직접 영향을 받기 때문에, 실제 도입 시에는 개인 개발 환경과 팀 운영 방식에 맞게 재설계하거나 최소한 명시적으로 조정하는 것을 권장합니다.

| Hook 이벤트 | 실행 액션 | 설명 | 구현 위치 |
|---|---|---|---|
| `sessionStart` | `log-session-start.mjs` | 세션 시작 시 작업 시작 정보를 로그에 남깁니다. | `.github/hooks/scripts/log-session-start.mjs` |
| `sessionEnd` | `log-session-end.mjs` | 세션 종료 시 종료 사유와 세션 종료 기록을 남깁니다. | `.github/hooks/scripts/log-session-end.mjs` |
| `sessionEnd` | `scan-secrets.mjs` | 세션 중 변경된 파일을 기준으로 시크릿 패턴을 검사합니다. | `.github/hooks/scripts/scan-secrets.mjs` |
| `userPromptSubmitted` | `log-prompt.mjs` | 사용자 프롬프트를 기록해 세션 흐름을 추적할 수 있게 합니다. | `.github/hooks/scripts/log-prompt.mjs` |
| `preToolUse` | `tool-guardian.mjs` | 위험한 명령이나 파괴적 작업을 감지해 가드 역할을 합니다. | `.github/hooks/scripts/tool-guardian.mjs` |
| `postToolUse` | `format-lint.mjs` | 파일 수정 후 포맷팅과 린트 작업을 자동으로 시도합니다. | `.github/hooks/scripts/format-lint.mjs` |

세부 구조와 런타임 메모는 `.github/hooks/README.md`를 참고하면 됩니다.

## Skills

Skill은 반복적으로 쓰는 작업 방식을 문서화한 실행 가이드입니다. 에이전트나 Copilot이 작업을 시작하기 전에 어떤 기준과 절차를 따라야 하는지 빠르게 불러올 수 있도록 정리되어 있습니다.

보통 간단하고 항상 필요한 규칙은 custom instructions에 두고, 길고 전문적인 절차는 skill로 분리하는 방식이 유지보수에 유리합니다.

| Skill | 설명 |
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

## Official GitHub Docs

아래 링크는 이 저장소의 구조를 GitHub Copilot 공식 기능과 연결해서 이해할 때 가장 먼저 보면 좋은 문서들입니다.

### Agent 관련 문서

- [Use GitHub Copilot agents](https://docs.github.com/en/copilot/how-tos/use-copilot-agents): GitHub에서 agent 기능 전체를 어떻게 쓰는지 보는 시작점
- [About custom agents](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-custom-agents): custom agent 개념과 agent profile 형식 설명
- [Creating custom agents for Copilot cloud agent](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/create-custom-agents): GitHub, VS Code 등에서 custom agent를 만드는 방법
- [Using GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli-agents/overview): Copilot CLI에서 agentic workflow를 사용하는 방법
- [Invoking custom agents](https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli-agents/invoke-custom-agents): Copilot CLI에서 특정 agent를 직접 호출하는 방법
- [Creating and using custom agents for GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/create-custom-agents-for-cli): CLI 전용 custom agent 작성과 사용 방법
- [GitHub Copilot Chat](https://docs.github.com/en/copilot/how-tos/chat-with-copilot): IDE와 여러 환경에서 Copilot Chat을 사용하는 공식 가이드
- [About GitHub Copilot Chat](https://docs.github.com/en/copilot/concepts/chat): Chat 기능의 범위와 환경별 동작 개요

### Hook 관련 문서

- [About hooks](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-hooks): hook 개념, 지원 이벤트, 보안과 성능 고려사항 정리
- [Using hooks with GitHub Copilot agents](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/use-hooks): `.github/hooks/*.json`을 실제로 작성하고 디버깅하는 방법
- [Hooks configuration](https://docs.github.com/en/copilot/reference/hooks-configuration): hook input/output JSON, trigger별 포맷, 스크립트 모범 사례 레퍼런스
- [About GitHub Copilot CLI](https://docs.github.com/en/copilot/concepts/agents/copilot-cli/about-copilot-cli): Copilot CLI에서 hooks, tools, approval 모델을 함께 이해할 때 참고할 문서

### Skill 관련 문서

- [About agent skills](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills): skill의 개념과 지원 환경 정리
- [Adding agent skills for GitHub Copilot](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/add-skills): Copilot agent와 VS Code agent mode에서 skill을 추가하는 방법
- [Adding agent skills for GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills): Copilot CLI 기준 skill 작성, 배치, 재로딩 방법
- [Adding custom instructions for GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions): skill과 custom instructions를 어떻게 나눠 쓸지 볼 때 유용한 문서
- [About customizing GitHub Copilot responses](https://docs.github.com/en/copilot/concepts/prompting/response-customization): repository instructions, path-specific instructions, agent instructions의 개념 정리
- [Support for different types of custom instructions](https://docs.github.com/en/copilot/reference/custom-instructions-support): VS Code, GitHub.com, Copilot CLI별 지원 범위를 확인할 때 필요한 레퍼런스

### MCP와 확장 문서

이 저장소는 Hooks, Agents, Skills 중심이지만, 실제 운영에서는 MCP를 함께 붙이는 경우가 많습니다.

- [Extending GitHub Copilot Chat with Model Context Protocol (MCP) servers](https://docs.github.com/en/copilot/how-tos/provide-context/use-mcp-in-your-ide/extend-copilot-chat-with-mcp): VS Code Chat과 agent mode에 MCP를 연결하는 방법
- [Using the GitHub MCP Server in your IDE](https://docs.github.com/en/copilot/how-tos/provide-context/use-mcp-in-your-ide/use-the-github-mcp-server): GitHub 리소스를 Chat과 agent mode에서 직접 다루는 방법

## Local Notes

- 활성 hook 설정은 `.github/hooks/hooks.json`에 정의되어 있습니다.
- hook 스크립트는 `.github/hooks/scripts/`에, 공용 로직은 `.github/hooks/lib/`에 분리되어 있습니다.
- 로그 디렉터리인 `.github/logs/`는 런타임 산출물 성격이므로 보통 커밋 대상에서 제외하는 운영이 적절합니다.
- hook 런타임 메모는 `.github/hooks/README.md`에서 바로 확인할 수 있습니다.