# 04. 기술 아키텍처

## 1. 기술 목표

- 서버 없이도 한 캠페인을 끝까지 플레이할 수 있다.
- 같은 상태·명령·시드는 항상 같은 결과를 만든다.
- 게임 규칙은 UI와 분리되어 자동 테스트할 수 있다.
- 콘텐츠는 코드 수정 없이 데이터 파일로 추가할 수 있다.
- 모바일 브라우저에서 AI 턴 때문에 화면이 멈추지 않는다.
- 저장 데이터가 버전업 후에도 가능한 범위에서 복구된다.
- 향후 로그인·클라우드 저장을 붙여도 코어 엔진을 다시 만들지 않는다.

## 2. 권장 스택

| 영역 | 선택 | 이유 |
|---|---|---|
| 언어 | TypeScript strict | 규칙·데이터 키 오류를 조기에 차단 |
| UI | React | 지도·패널·사건·전투 화면 상태 조합에 적합 |
| 빌드 | Vite | 정적 배포, 빠른 개발·테스트 |
| 상태 | 코어 reducer + 얇은 Zustand UI store | 게임 규칙과 화면 상태 분리 |
| 스키마 | Zod | 콘텐츠·저장 파일 런타임 검증 |
| 테스트 | Vitest | 순수 엔진 단위·시뮬레이션 테스트 |
| E2E | Playwright | 새 게임부터 저장·복구까지 검증 |
| 저장 | IndexedDB, 설정은 localStorage | 캠페인·연대기 용량과 버전 관리 |
| 지도 | SVG | 반응형, 클릭 영역, 접근성, 애니메이션 |
| 애니메이션 | CSS + 제한적 Web Animations API | 가벼운 전투·지도 연출 |
| PWA | vite-plugin-pwa | 설치·오프라인 캐시 |

Next.js는 서버 기능이 필요한 단계에 다시 검토한다. MVP는 정적 클라이언트 게임이므로 Vite가 더 단순하다.

## 3. 계층 구조

```text
src/
  core/                 # 브라우저·React를 모르는 순수 게임 엔진
    commands/
    reducers/
    battle/
    ai/
    rng/
    scoring/
    rules/
    types/
  content/              # 장수·도시·세력·사건·특성 데이터
    officers/
    cities/
    factions/
    events/
    traits/
    scenarios/
    schemas/
  application/          # 턴 진행, 명령 큐, 자동저장, 화면 전환 조율
  adapters/
    storage/
    audio/
    analytics/
    worker/
  ui/
    screens/
    components/
    map/
    battle/
    hooks/
  assets/
  tests/
    fixtures/
    simulations/
```

### 의존 방향

```text
UI → application → core
                ↘ adapters
content → core schema validation
```

`core`는 React, DOM, localStorage, IndexedDB를 import하지 않는다.

## 4. 게임 상태 모델

게임 상태는 하나의 직렬화 가능한 객체로 관리한다.

```text
GameState
  meta
    saveVersion
    engineVersion
    campaignId
    scenarioId
    seed
    turn
    season
    difficulty
    status
  playerFactionId
  factions
  cities
  officers
  armies
  diplomacy
  eventFlags
  pendingCommands
  chronicle
  rngCursor
```

### 상태 규칙

- 함수·클래스 인스턴스·DOM 객체를 상태에 저장하지 않는다.
- `Map`, `Set`, `Date` 대신 JSON 직렬화 가능한 값 사용을 우선한다.
- 시간은 캠페인 턴과 숫자 타임스탬프로 표현한다.
- 모든 엔티티는 문자열 ID로 참조한다.
- 삭제보다 `status` 변경을 우선해 연대기 참조가 깨지지 않게 한다.

## 5. 명령 기반 엔진

UI가 상태를 직접 수정하지 않는다. 모든 변경은 명령을 거친다.

예시 명령:

- `DEVELOP_CITY`
- `RECRUIT_TROOPS`
- `SEARCH_OFFICER`
- `OFFER_RECRUITMENT`
- `APPOINT_OFFICER`
- `CREATE_ARMY`
- `MOVE_ARMY`
- `DECLARE_ATTACK`
- `SEND_ENVOY`
- `CHOOSE_EVENT_OPTION`
- `END_PLAYER_PHASE`

처리 구조:

```text
validateCommand(state, command)
  → reduceCommand(state, command, rng)
  → nextState + GameEvent[]
  → invariantCheck(nextState)
  → chronicle/animation용 이벤트 반환
```

### GameEvent 예시

- `RESOURCE_CHANGED`
- `CITY_DEVELOPED`
- `OFFICER_RECRUITED`
- `LOYALTY_CHANGED`
- `ARMY_MOVED`
- `BATTLE_STARTED`
- `TACTIC_TRIGGERED`
- `UNIT_ROUTED`
- `CITY_CAPTURED`
- `STORY_EVENT_TRIGGERED`

UI는 결과 상태를 다시 계산하지 않고 `GameEvent[]`를 읽어 토스트·애니메이션·로그를 만든다.

## 6. 불변 조건

모든 명령 후 개발 환경과 테스트에서 검사한다.

- 금·군량·병력은 0 미만이 될 수 없음
- 도시는 정확히 한 세력 또는 중립에 속함
- 장수는 동시에 두 군단에 배치될 수 없음
- 군단 병력은 소속 도시에서 실제로 차감됨
- 포로는 태수·군단장 임무를 수행할 수 없음
- 게임 종료 후 일반 명령 처리 금지
- 조약 종료 턴은 시작 턴보다 큼
- 관계·충성·치안·사기는 허용 범위 안에 있음
- 존재하지 않는 엔티티 ID 참조 금지
- 한 턴의 행동점 소비가 보유량을 초과할 수 없음

불변 조건 실패는 조용히 보정하지 않고 개발 중 즉시 오류로 드러낸다.

## 7. 결정적 난수

### 요구사항

- 캠페인 시작 시 seed 생성
- 난수 함수는 시스템 전역에서 직접 호출하지 않음
- 각 결과가 몇 번째 난수를 사용했는지 추적
- 저장 후 복구해도 다음 결과가 달라지지 않음

### 사용 방식

```text
rng.next('recruitment')
rng.next('battle-round-2-left')
rng.next('season-event')
```

실제 구현은 단순하고 검증된 seeded PRNG를 사용한다. 엔진 상태에 seed와 cursor를 저장한다.

`Math.random()`은 UI 장식 애니메이션 외 게임 결과에 사용하지 않는다.

## 8. 전투 엔진

### 입력

- 공격·방어 군단 스냅샷
- 도시·지형·날씨
- 진형
- 책략
- 후퇴 기준
- RNG 상태

### 출력

- 전투 결과 상태
- 최대 6라운드의 상세 이벤트
- 사상자·부상·포로·공적
- 승패 요인 분석 데이터

### 전투 순수성

전투 함수는 캠페인 전체 상태를 직접 수정하지 않는다.

```text
resolveBattle(BattleInput) → BattleResult
applyBattleResult(GameState, BattleResult) → GameState
```

이렇게 분리하면 전투만 수천 번 자동 시뮬레이션할 수 있다.

### 승패 설명 데이터

전투 결과에 다음 기여도를 저장한다.

- 병력 차이
- 능력치 차이
- 병종 상성
- 사기
- 진형
- 지형
- 책략
- 특성
- 난수

설명기는 가장 큰 2~3개 요인을 자연어 템플릿에 넣는다. 생성형 AI는 필요하지 않다.

## 9. AI 구조

### 9.1 원칙

- AI도 플레이어와 같은 명령·비용·규칙을 사용
- 숨겨진 무한 자원 금지
- 난이도별로 평가 깊이와 정보 정확도를 조정
- 계산량이 큰 AI는 Web Worker에서 실행

### 9.2 단계

```text
관찰
  → 생존·경제·외교·전쟁 목표 생성
  → 가능한 명령 후보 생성
  → 후보 점수화
  → 예산 안에서 명령 조합 선택
  → 코어 엔진 검증
```

### 9.3 계획 단위

- 즉시 생존: 수도 방어, 군량 부족
- 1턴 계획: 개발, 이동, 공격
- 3~4턴 목표: 특정 권역 확보, 동맹 형성, 인재 확보

### 9.4 성능 예산

중급 모바일 기준:

- 이야기·군웅 AI 턴: 400ms 이하 목표
- 난세: 800ms 이하 목표
- 천명: 1,500ms 이하, 진행 표시 필요

제한 시간을 넘기면 현재까지 최고 후보를 선택한다.

## 10. 콘텐츠 데이터

### 데이터 파일

- 장수: JSON 또는 TypeScript data module
- 도시: JSON
- 사건: JSON
- 특성: JSON
- 시나리오: JSON

개발 편의를 위해 TypeScript로 작성하더라도 CI에서 JSON 형태로 직렬화·검증 가능해야 한다.

### 장수 스키마 개념

```text
OfficerDefinition
  id
  nameKo
  nameHanja
  sourceType
  factionAffinity[]
  role
  stats
  troopAptitudes
  traits[]
  relationships[]
  ambition
  loyaltyBaseline
  salaryTier
  dialogueSetId
  portraitId
  biography
```

### 사건 스키마 개념

```text
StoryEventDefinition
  id
  sourceType
  category
  priority
  once
  cooldown
  conditions[]
  participants[]
  intro
  options[]
    label
    preview
    requirements[]
    effects[]
    delayedEffects[]
    flags[]
    chronicleText
```

조건과 효과를 임의 JavaScript 함수로 작성하지 않고 선언형 연산자로 제한한다.

예:

- 조건: `resource.gte`, `officer.present`, `relation.lte`, `flag.absent`
- 효과: `resource.add`, `loyalty.add`, `trait.grant`, `event.schedule`

이를 통해 저장 안정성, 편집 도구, 자동 검증을 확보한다.

## 11. 저장 시스템

### 저장 슬롯

수직 슬라이스:

- 자동 저장 1개

MVP:

- 자동 저장 1개
- 수동 저장 3개
- 캠페인 종료 기록

### 저장 시점

- 명령 확정 후
- 전투 종료 후
- 사건 선택 후
- 턴 종료 후
- 앱이 백그라운드로 갈 때 가능한 범위에서

전투 애니메이션 도중이 아니라 전투 입력 또는 결과 상태를 저장한다.

### 저장 버전

```text
saveVersion: 1
engineVersion: semver
contentVersion: semver
```

마이그레이션:

```text
v1 → migrateV1ToV2 → v2 → ... → current
```

지원할 수 없는 오래된 저장은 삭제하지 않고 원본 백업 내보내기를 제공한다.

### 저장 내보내기

- JSON 파일 내보내기
- 불러오기 전에 Zod 검증
- 파일 크기 제한
- 알 수 없는 키 무시 또는 명시적 거부
- 코드 실행 가능한 문자열을 해석하지 않음

## 12. 연대기 시스템

연대기는 모든 세부 로그가 아니라 기억할 사건을 저장한다.

```text
ChronicleEntry
  turn
  category
  title
  summary
  actorIds[]
  cityIds[]
  importance
  sourceEventId?
```

중요도 기준:

- 1: 개발·포상
- 2: 등용·외교
- 3: 전투·도시 점령
- 4: 세력 멸망·대형 분기
- 5: 승리·특별 엔딩

캠페인 종료 시 중요도 3 이상을 조합해 공유용 연대기 카드를 만든다.

## 13. 화면 상태와 게임 상태 분리

게임 저장에 포함하지 않을 UI 상태:

- 열린 모달
- 지도 확대 배율
- 선택 중인 탭
- 애니메이션 진행 프레임
- 임시 호버

설정 저장:

- 효과음
- 음악
- 진동
- 애니메이션 감소
- 숫자 상세 표시
- 튜토리얼 여부

## 14. 오프라인과 PWA

- 첫 로드 이후 핵심 게임은 오프라인 실행
- 앱 셸·콘텐츠·이미지·효과음 캐시
- 새 버전이 있으면 턴 진행 중 강제 새로고침 금지
- 안전한 저장 후 업데이트 버튼 제공
- 캐시 버전과 콘텐츠 버전을 구분

## 15. 배포

### 1차

- GitHub Pages 공개 체험
- 정적 번들
- 모든 자산 저장소 내부 포함

### 2차

- Vercel 또는 독립 도메인
- 미리보기 배포
- 오류 수집 선택 도입

### 3차 선택

- Supabase 로그인·클라우드 저장
- 서버리스 공유 시드·연대기

백엔드가 없어도 모든 게임 기능이 동작해야 한다.

## 16. 보안·개인정보

- API 키 없음
- 사용자 계정 없음
- 외부 AI 호출 없음
- 불필요한 쿠키 없음
- 외부 스크립트 최소화
- `eval`, 동적 코드 실행 금지
- 저장 불러오기 입력 검증
- 사용자 작성 이름은 HTML 이스케이프
- CSP 적용 가능한 구조 유지
- 분석 도구 도입 전 동의와 수집 항목 문서화

## 17. 성능 예산

- 초기 JS: gzip 350KB 이하 목표
- 초기 핵심 화면 표시: 중급 모바일 2.5초 이하 목표
- 지도 입력 반응: 100ms 이하
- 일반 화면 전환: 200ms 이하
- 저장 크기: 캠페인당 1MB 이하
- 전투 이벤트: 최대 300개
- 한 프레임에 대규모 DOM 업데이트 금지
- 이미지: WebP/AVIF, 모바일 해상도 분기

## 18. 오류 복구

- 엔진 명령 실패: 상태 변경 없이 이유 반환
- 저장 실패: 메모리 플레이 유지 + 경고
- 콘텐츠 누락: 해당 콘텐츠 비활성화 + 개발 오류 로그
- AI 명령 무효: 다음 후보 선택, 전부 실패하면 안전 행동
- 전투 계산 예외: 전투 전 자동 저장으로 복구
- 마이그레이션 실패: 원본 저장 보존

## 19. 개발 규칙

- 게임 수치 변경은 문서 또는 밸런스 변경 기록을 남긴다.
- UI 컴포넌트 안에서 자원·피해 공식 계산 금지
- `Math.random()` 게임 로직 사용 금지
- 엔티티 이름을 ID로 사용하지 않음
- 콘텐츠 데이터에서 직접 HTML 사용 금지
- 한 테스트가 다른 테스트의 시드·상태에 의존하지 않음
- 버그 수정에는 가능하면 회귀 테스트를 먼저 추가
