# 테스트 스위트 분석 보고서

> 작성일: 2026-04-02 (최종 업데이트)
> 대상: `test/` 디렉토리 전체 (13개 파일, 515개 테스트 케이스) + `e2e/` (Playwright, 10개)
> 실행 환경: Jest + jsdom (단위/통합), Playwright + Chromium (E2E)

---

## 1. 전체 현황

| 항목 | 수치 |
|------|------|
| 단위/통합 테스트 파일 | 13개 |
| 단위/통합 테스트 케이스 | 515개 |
| E2E 테스트 케이스 | 10개 |
| 총 테스트 케이스 | **525개** |
| 통과 / 실패 | 525 / 0 |
| 전체 Stmts 커버리지 | **85.22%** |
| 전체 Lines 커버리지 | **86.10%** |

### 테스트 분포

```
test/                                 (Jest, 515개)
├── basic.test.js                 19개  (메인 라우터 기본)
├── integration.test.js           19개  (통합 테스트)
├── core/
│   ├── ViewLogicRouter.test.js   64개  ← +23개 (navigateTo, progress bar, cleanup, destroy)
│   ├── ApiHandler.test.js        51개
│   ├── ComponentLoader.test.js   25개
│   ├── ErrorHandler.test.js      22개
│   ├── FormHandler.test.js       41개  ← +15개
│   ├── RouteLoader.test.js       42개  ← +7개
│   └── StateHandler.test.js      35개
├── plugins/
│   ├── AuthManager.test.js       64개  ← +18개
│   ├── CacheManager.test.js      35개
│   ├── I18nManager.test.js       54개  ← +11개
│   └── QueryManager.test.js      41개
└── helpers/
    └── testHelpers.js            (팩토리 유틸리티)

e2e/                                  (Playwright, 10개)
└── router.spec.js                10개  (실제 브라우저 라우팅 검증)
```

---

## 2. 모듈별 커버리지 상세

```
모듈                    | Stmts  | Branch | Funcs  | Lines  | 등급
------------------------|--------|--------|--------|--------|------
StateHandler.js         | 100%   | 94.7%  | 100%   | 100%   | ★ A+
FormHandler.js          | 97.6%  | 86.4%  | 92.0%  | 98.3%  | ★ A+
AuthManager.js          | 98.0%  | 88.5%  | 100%   | 99.0%  | ★ A+
QueryManager.js         | 96.5%  | 91.8%  | 100%   | 98.7%  | ★ A
I18nManager.js          | 95.5%  | 84.4%  | 100%   | 95.5%  | ★ A
CacheManager.js         | 89.4%  | 75.6%  | 100%   | 90.6%  | A
ErrorHandler.js         | 87.5%  | 80.4%  | 93.8%  | 87.4%  | A
ApiHandler.js           | 82.6%  | 79.4%  | 73.2%  | 84.4%  | B
RouteLoader.js          | 77.5%  | 58.4%  | 60.5%  | 78.4%  | B
viewlogic-router.js     | 77.5%  | 80.6%  | 66.7%  | 78.2%  | B     ← C→B 승격
ComponentLoader.js      | 52.1%  | 52.4%  | 78.6%  | 52.6%  | D
```

---

## 3. 모듈별 효율성 평가

### A+등급 — 사실상 완벽 커버

| 모듈 | 커버리지 | 테스트 수 | 평가 |
|------|----------|-----------|------|
| StateHandler | **100%** | 35개 | 모든 분기, 에지 케이스, watch/unwatch 콜백까지 완벽 검증 |
| FormHandler | **98.3%** | 41개 | handleFormSubmit 전체 흐름, submitFormData JSON/FormData, bindAutoForms, cancelAllRequests, destroy |
| AuthManager | **99.0%** | 64개 | silent refresh, 쿠키 스토리지, setRefreshToken/removeRefreshToken 모든 스토리지 변형 |

### A등급 — 우수

| 모듈 | 커버리지 | 테스트 수 | 평가 |
|------|----------|-----------|------|
| QueryManager | **98.7%** | 41개 | URL 인코딩, 파라미터 파싱, 변경 감지 등 실전적 시나리오 |
| I18nManager | **95.5%** | 54개 | 초기화 실패, setLanguage 실패, 동시 로딩, fallback, 캐시 에러 처리 |
| CacheManager | **90.6%** | 35개 | TTL, LRU, 패턴 삭제, 자동 정리 등 포괄적 검증 |
| ErrorHandler | **87.4%** | 22개 | 로그 레벨 필터링, 에러 분류, fallback 페이지. `||`→`??` 버그 수정 검증 포함 |

### B등급 — 양호

| 모듈 | 커버리지 | 테스트 수 | 주요 약점 |
|------|----------|-----------|-----------|
| ApiHandler | **84.4%** | 51개 | 인터셉터, 토큰 갱신 일부 미커버. 전체적으로 양호 |
| RouteLoader | **78.4%** | 42개 | loadScript, 템플릿 컴파일 미커버. 라이프사이클 훅 순서, 레이아웃 병합 검증됨 |
| viewlogic-router.js | **78.2%** | 102개 | navigateTo 엣지 케이스, progress bar, cleanupPreviousPages, destroy 검증 완료. `renderComponentWithTransition`만 미커버 (E2E로 간접 검증) |

### D등급 — 실효성 낮음

| 모듈 | 커버리지 | 테스트 수 | 핵심 문제 |
|------|----------|-----------|-----------|
| ComponentLoader | **52.6%** | 25개 | `_loadComponentFromFile`의 실제 `import()` 경로 미테스트. mock으로 우회 |

---

## 4. 알려진 소스 코드 이슈

### ~~ErrorHandler `||` 연산자 버그~~ (수정 완료)

`ErrorHandler.js` 210-211줄에서 `||` 연산자가 `0`을 falsy로 처리하던 버그가 **`??` (nullish coalescing)으로 수정됨**.

- 수정 전: `logLevels.error`=0 → `0 || 2`=2 → `logLevel: 'error'`가 `logLevel: 'info'`처럼 동작
- 수정 후: `0 ?? 2`=0 → `logLevel: 'error'`가 정상적으로 error만 출력
- production 환경에서 error 로그가 누락되던 문제도 해결
- 테스트도 올바른 동작을 검증하도록 갱신됨

---

## 5. E2E 테스트 (Playwright)

### 구성

- **도구**: Playwright + Chromium (headless)
- **대상**: `examples/` 앱을 http-server로 실서비스
- **실행**: `npm run test:e2e` (또는 `npx playwright test`)

### 테스트 시나리오 (10개)

| 카테고리 | 테스트 | 검증 내용 |
|----------|--------|-----------|
| 기본 라우팅 | 홈 페이지 렌더링 | Vue 마운트, #app 자식 존재 |
| | 해시 네비게이션 | `/#/about` 이동, URL 확인 |
| | 존재하지 않는 라우트 | JS 에러 없이 graceful 처리 |
| 레이아웃 시스템 | 레이아웃 렌더링 | 레이아웃+페이지 콘텐츠 100자 이상 |
| | 라우트 전환 | home→about 콘텐츠 변경 확인 |
| Vue 렌더링 | 데이터 바인딩 | `data-v-app` 속성, Year 2026 렌더링 |
| | 컴포넌트 렌더링 | DOM 요소 존재 |
| 인증 흐름 | 보호 라우트 리다이렉트 | dashboard→login 리다이렉트 |
| | 공개 라우트 접근 | about 접근 가능 |
| 전환 안정성 | 빠른 라우트 전환 | about→contact→home 연속 전환, 크래시 없음 |

### jsdom 단위 테스트로 커버 불가능한 영역

| 영역 | E2E로 커버되는지 |
|------|------------------|
| `renderComponentWithTransition` (Vue createApp) | ✅ 간접 검증 (홈 렌더링, 라우트 전환) |
| 해시 라우팅 + hashchange 이벤트 | ✅ 직접 검증 |
| 인증 가드 (라우트 보호/리다이렉트) | ✅ 직접 검증 |
| 레이아웃-페이지 통합 렌더링 | ✅ 직접 검증 |
| Progress bar DOM 조작 | ✅ 단위 테스트 + 빠른 전환 E2E에서 간접 확인 |

---

## 6. 미테스트 영역

### 남아있는 주요 갭

| 영역 | 위치 | 문제 |
|------|------|------|
| `_loadComponentFromFile()` 실제 경로 | ComponentLoader.js:72-114 | 동적 `import()` mock으로 우회. 실제 파일 로딩 미검증 |
| `loadScript()` | RouteLoader.js:39-70 | 스크립트 로딩/파싱 로직 미테스트 |
| `renderComponentWithTransition()` | viewlogic-router.js:379-465 | Vue `createApp()` 의존. E2E로 간접 검증됨 |
| 초기화 실패 경로 | viewlogic-router.js:188-210 | I18n/Auth 초기화 에러 시 graceful degradation |

### ~~해소된 갭~~

| 영역 | 해소 방법 |
|------|-----------|
| ~~`handleFormSubmit` 전체 흐름~~ | ✅ FormHandler.test.js에 15개 테스트 추가 (98.3% 커버리지) |
| ~~silent refresh, 쿠키 스토리지~~ | ✅ AuthManager.test.js에 18개 테스트 추가 (99.0% 커버리지) |
| ~~초기화 실패, setLanguage 실패~~ | ✅ I18nManager.test.js에 11개 테스트 추가 (95.5% 커버리지) |
| ~~라이프사이클 훅 순서, 레이아웃 병합~~ | ✅ RouteLoader.test.js에 7개 테스트 추가 (78.4% 커버리지) |
| ~~`renderComponentWithTransition`~~ | ✅ Playwright E2E로 간접 검증 |
| ~~`cleanupPreviousPages`~~ | ✅ ViewLogicRouter.test.js에 5개 테스트 추가 |
| ~~Progress bar 상태 관리~~ | ✅ ViewLogicRouter.test.js에 6개 테스트 추가 |
| ~~navigateTo 엣지 케이스~~ | ✅ ViewLogicRouter.test.js에 5개 테스트 추가 |
| ~~destroy Vue 앱 정리~~ | ✅ ViewLogicRouter.test.js에 4개 테스트 추가 |

---

## 7. 테스트 인프라 평가

### 잘 설계된 부분

- **testHelpers.js 팩토리 패턴**: `createMockRouter()`, `createJwtToken()`, `mockFetchSuccess()` 등이 일관성 있고 재사용 가능
- **setup.js 브라우저 환경 mock**: localStorage/sessionStorage, fetch, FormData, AbortController 등 필수 API를 포괄
- **테스트 격리**: `afterEach`에서 mock 초기화 및 storage 리셋
- **한국어 테스트 설명**: StateHandler, RouteLoader, ViewLogicRouter 등에서 일관된 한국어 describe/test 명명

### 개선된 부분 (1차 리팩토링)

- **핵심 라우팅 흐름 테스트 추가**: `combinePaths`, `resolvePath`, `_parseCurrentLocation`, `updateURL`, `handleRouteChange`, `init`, `loadRoute` 커버리지 확보
- **라이프사이클 훅 실행 순서 검증**: layout → page 순서 보장 테스트 추가
- **fetchData 메서드 검증**: string/object 모드, 에러 처리, $dataLoading 상태, 이벤트 발행
- **스모크 테스트 → 실제 검증**: `not.toThrow()` 패턴을 상태/값 검증으로 교체
- **통합 테스트 실질화**: 모듈 간 실제 데이터 흐름 검증 (queryManager set → get, cacheManager set → get 등)
- **중복 제거**: basic.test.js에서 5개 중복/불필요 테스트 제거

### 개선된 부분 (2차 커버리지 확장)

- **FormHandler 전체 흐름 검증** (+15개): handleFormSubmit success/error/abort, submitFormData JSON/FormData, bindAutoForms, cancelAllRequests, destroy
- **AuthManager 인증 경로 완성** (+18개): silent refresh 성공/실패, 쿠키 스토리지 전체 경로, setRefreshToken/removeRefreshToken 모든 스토리지 변형
- **I18nManager 에러 경로 검증** (+11개): 초기화 실패, setLanguage 실패, 동시 요청, fallback, 캐시 에러
- **RouteLoader 라이프사이클 강화** (+7개): loadLayoutScript 캐시/실패, main-content 경로, 라이프사이클 훅 순서, componentLoader 에러 fallback
- **Playwright E2E 도입** (+10개): 실제 브라우저에서 Vue 마운트, 라우트 전환, 인증 가드, 레이아웃 시스템 검증

### 개선된 부분 (3차 viewlogic-router.js 보강)

- **navigateTo 엣지 케이스** (+5개): 객체 파라미터 분해, 앞 슬래시 제거, 빈 문자열 처리, 쿼리 파라미터 초기화
- **Progress bar 전체 흐름** (+6개): _createProgressBar 생성, _showProgressBar 0.3초 딜레이, 기존 타이머 초기화, _hideProgressBar 100%→0% 전환, null 안전성
- **cleanupPreviousPages** (+5개): page-exiting 제거, 이전 Vue 앱 unmount, unmount 에러 무시, 로딩 엘리먼트 제거, appElement null 안전성
- **destroy 상세** (+4개): currentVueApp/previousVueApp unmount, 동시 unmount, DOM 정리
- **초기화/waitForReady** (+3개): 즉시 반환, refreshToken 별칭, init hash 설정

---

## 8. 테스트 유효성 분류

```
단위/통합 515개 + E2E 10개 = 전체 525개 기준:

  실효성 있는 테스트     ~500개 (95%)  ← 실제 동작/상태 검증, 에지 케이스 포함
  인프라 한계로 제한      ~18개 ( 3%)  ← mock 우회로 실제 경로 미검증 (ComponentLoader 등)
  경량 검증              ~7개  ( 2%)  ← 프로퍼티 존재 확인 수준이나 다른 테스트와 보완적
```

---

## 9. 커버리지 변화 요약

| 항목 | 초기 | 1차 개선 | 2차 개선 | 3차 개선 | 총 변화 |
|------|------|----------|----------|----------|---------|
| 전체 Stmts | 70.62% | 74.30% | 83.50% | **85.22%** | **+14.60%** |
| 전체 Lines | 71.35% | 75.03% | 84.45% | **86.10%** | **+14.75%** |
| viewlogic-router.js Lines | 56.72% | 66.80% | 66.8% | **78.15%** | **+21.43%** |
| FormHandler Lines | 70.8% | 70.8% | **98.3%** | 98.3% | **+27.5%** |
| AuthManager Lines | 73.9% | 73.9% | **99.0%** | 99.0% | **+25.1%** |
| I18nManager Lines | 75.8% | 75.8% | **95.5%** | 95.5% | **+19.7%** |
| RouteLoader Lines | 45.94% | 60.36% | **78.4%** | 78.4% | **+32.5%** |
| ErrorHandler Lines | 82.75% | 87.35% | 87.4% | 87.4% | **+4.65%** |
| 단위/통합 테스트 수 | 385개 | 438개 | 492개 | **515개** | **+130개** |
| E2E 테스트 수 | 0개 | 0개 | **10개** | 10개 | **+10개** |
| 테스트 파일 수 | 12개 | 13개 | 14개 | **14개** | **+2개** |

---

## 10. 권장 추가 조치 (우선순위)

1. ~~**ErrorHandler `||` → `??` 버그 수정**~~ ✅ 완료
2. ~~**E2E 테스트 도입**~~ ✅ 완료 (Playwright + Chromium, 10개 시나리오)
3. ~~**FormHandler 전체 흐름 테스트**~~ ✅ 완료 (98.3% 커버리지)
4. ~~**viewlogic-router.js 커버리지 개선**~~ ✅ 완료 (66.8% → 78.2%, navigateTo/progress bar/cleanup/destroy)
5. **ComponentLoader `import()` 전략 개선** — Jest의 `jest.unstable_mockModule` 또는 빌드 타임 변환으로 실제 import 경로 테스트
6. **loadScript 테스트 추가** — RouteLoader의 스크립트 로딩/파싱 로직 (현재 78.4%)
