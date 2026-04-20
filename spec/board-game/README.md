# 주사위 기반 부동산 보드게임 Spec 문서 모음

이 문서는 원본 IP를 복제하지 않는 독자적인 주사위 기반 부동산 보드게임을 만들기 위한 기능 명세서 모음입니다.

## 권장 구현 순서

1. `001-game-session-core`
2. `002-board-and-tile-system`
3. `003-turn-dice-movement`
4. `004-property-economy`
5. `005-special-tile-card-system`
6. `006-game-end-result`
7. `007-bot-local-mvp`

## MVP 기준

`001`부터 `006`까지 구현하면 기본적인 게임 한 판이 성립합니다.  
혼자 테스트 가능한 로컬 MVP까지 만들려면 `007`도 구현합니다.
