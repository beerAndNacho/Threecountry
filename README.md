# Threecountry — 천하일지

> **한 계절, 세 번의 선택. 천하는 당신의 기록이 된다.**

모바일 우선 싱글 플레이 삼국 전략 웹게임입니다. 대형 군주제 게임을 작게 복제하지 않고, **짧은 턴·장수 역할·읽히는 자동 전투·대체 역사 연대기**에 집중합니다.

## 바로 플레이

- https://beerandnacho.github.io/threecountry/

현재 공개판은 전체 MVP에 앞서 핵심 재미를 검증하는 **3도시 수직 슬라이스**입니다.

## 현재 플레이 가능 범위

- 군주 선택: 조조 / 유비
- 지도: 허창 / 진류 / 낙양
- 장수 12명
  - 조조군: 조조, 하후돈, 전위, 순욱, 곽가, 허저
  - 유비군: 유비, 관우, 장비, 조운, 서서, 미축
- 한 계절 행동점 3개
- 도시 내정: 개간 / 순찰 / 징병 / 인재 탐색
- 인재 접촉 및 등용
- 태수 임명
- 금 / 군량 / 명성 / 도시 치안 / 농업 / 성벽 / 병력
- 보병 / 기병 / 궁병 순환 상성
- 좌군 / 중군 / 우군 3라인 편성
- 어린진 / 방원진
- 무책 / 고무 책략
- 최대 6라운드 자동 전투
- 전투 승패 원인·라운드 로그·최고 활약 장수 표시
- 규칙 기반 상대 세력 AI
- 계절 사건 10종
- 자동 저장: IndexedDB, 미지원 환경은 localStorage 대체
- 저장 JSON 내보내기
- 상대 수도 점령 승리 및 24턴 판정
- 모바일 반응형 UI와 효과음
- 외부 AI/API 호출 없음

## 한 판의 흐름

```text
군주 선택
→ 계절 보고
→ 행동점 3개로 내정·탐색·징병
→ 장수 등용·태수 임명
→ 진류 진출
→ 부대 편성·진형·책략 선택
→ 3라인 전투
→ 계절 사건
→ 상대 수도 공략
→ 승리 연대기
```

처음에는 **조조 → 개간 → 진류 선택 → 공격 준비 → 추천 편성 → 전투** 순서로 진행하면 이해하기 쉽습니다.

## 게임 설계 핵심

1. **짧은 턴:** 한 계절에 행동점 3개만 사용합니다.
2. **장수의 역할:** 유명도보다 전투·내정·등용·보급 역할 조합이 중요합니다.
3. **설명 가능한 전투:** 같은 시드와 같은 편성은 같은 결과를 만들며, 상성·사기·진형·책략의 영향을 결과에서 확인할 수 있습니다.
4. **예고되는 위험:** 상대 AI의 행동과 사건 결과가 이유 없이 갑자기 발생하지 않도록 기록과 경고를 남깁니다.
5. **비용 없는 로컬 플레이:** 기본 AI와 게임 엔진은 브라우저에서만 계산합니다.

## 기술 구조

```text
src/
  types.ts       # 게임 상태와 명령·전투 타입
  content.ts     # 도시·세력·12장수·사건 데이터
  rng.ts         # 결정적 seeded RNG
  battle.ts      # 3라인·병종·진형·책략 전투 엔진
  engine.ts      # 턴·내정·등용·AI·승패 규칙
  storage.ts     # IndexedDB/localStorage 자동 저장
  main.ts        # 화면 흐름과 상호작용
  styles.css     # 모바일 우선 독자 UI

tests/
  engine.test.mjs
scripts/
  build.mjs
```

게임 규칙은 DOM과 분리된 순수 TypeScript 엔진으로 작성했습니다. `Math.random()`은 게임 결과에 사용하지 않으며, 상태에 저장된 시드와 난수 커서로 결과를 재현합니다.

## 로컬 실행

```bash
npm install
npm run dev
```

- 개발 주소: `http://localhost:4173`

빌드와 테스트:

```bash
npm run build
npm test
```

## 자동 검증

현재 엔진 테스트는 다음을 확인합니다.

- 3도시·양 세력 초기 상태
- 내정 비용과 행동점
- 행동점 초과 명령 거부
- 숨은 장수 탐색
- 동일 시드 전투 재현
- AI 계절 행동·수입·사건
- 사건 선택 효과
- 원정 시 최소 수비대 유지
- 조조·유비 양쪽의 첫 진류 전투
- 첫 계절의 과도한 AI 즉시 반격 방지
- 조조의 낙양 점령 승리 경로
- 유비의 허창 점령 승리 경로

GitHub Actions에서 설치, TypeScript 빌드, 엔진 테스트를 매 커밋 검증합니다.

## 현재 제한

- 전체 MVP의 12도시·7세력·48장수 중 일부만 구현했습니다.
- 장수 초상은 최종 일러스트가 아니라 CSS 기반 독자 미니어처 표현입니다.
- 외교·포로·장수 관계·관직 심화는 기획 문서만 완료된 상태입니다.
- 저장 슬롯은 현재 자동 저장 1개입니다.
- 온라인 PvP, 계정, 클라우드 저장, 생성형 AI는 없습니다.

## 기획·인계 문서

- [`docs/01-PRODUCT-VISION.md`](docs/01-PRODUCT-VISION.md)
- [`docs/02-GAME-DESIGN.md`](docs/02-GAME-DESIGN.md)
- [`docs/03-CONTENT-ART-BIBLE.md`](docs/03-CONTENT-ART-BIBLE.md)
- [`docs/04-TECHNICAL-ARCHITECTURE.md`](docs/04-TECHNICAL-ARCHITECTURE.md)
- [`docs/05-ROADMAP-QA.md`](docs/05-ROADMAP-QA.md)
- [`docs/06-SCREEN-FLOWS.md`](docs/06-SCREEN-FLOWS.md)
- [`docs/07-DECISION-LOG.md`](docs/07-DECISION-LOG.md)
- [`docs/08-CHARACTER-BIBLE.md`](docs/08-CHARACTER-BIBLE.md)
- [`docs/09-IMPLEMENTATION-HANDOFF.md`](docs/09-IMPLEMENTATION-HANDOFF.md)

### 48명 상세 캐릭터 설계

- [`docs/characters/01-LIU-BEI.md`](docs/characters/01-LIU-BEI.md)
- [`docs/characters/02-CAO-CAO.md`](docs/characters/02-CAO-CAO.md)
- [`docs/characters/03-SUN-JIAN.md`](docs/characters/03-SUN-JIAN.md)
- [`docs/characters/04-LU-BU.md`](docs/characters/04-LU-BU.md)
- [`docs/characters/05-YUAN-SHAO.md`](docs/characters/05-YUAN-SHAO.md)
- [`docs/characters/06-DONG-ZHUO.md`](docs/characters/06-DONG-ZHUO.md)
- [`docs/characters/07-LIU-BIAO.md`](docs/characters/07-LIU-BIAO.md)

다음 확장은 콘텐츠 숫자를 바로 늘리기보다, 공개판 플레이 피드백을 바탕으로 **전투 이해도·등용의 재미·AI 압박·모바일 조작**을 먼저 다듬는 순서로 진행합니다.
