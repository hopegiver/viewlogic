# ViewLogic Router

## Project Overview
Vue 3 SPA 라우터 프레임워크. 파일 시스템 기반 라우팅, 제로 빌드 개발, View-Logic 분리를 핵심 원칙으로 한다.
- **npm 패키지명**: `viewlogic`
- **Main entry**: `src/viewlogic-router.js` → class `ViewLogicRouter`
- **빌드 결과물**: `dist/viewlogic-router.esm.js` (ESM), `dist/viewlogic-router.min.js` (UMD)
- **빌드 도구**: esbuild (`build/build.js`)
- **테스트**: Jest + jsdom (`test/`)
- **문서 사이트**: Docsify (`docs/`)
- **예제 앱**: `examples/` (완전한 동작 예제)

## Core Architecture
```
src/
├── viewlogic-router.js           # 메인 라우터 클래스 (초기화, 라우트 전환, URL 관리)
├── core/
│   ├── RouteLoader.js            # 라우트 로딩, Vue 컴포넌트 생성, 레이아웃-페이지 스크립트 병합
│   ├── ApiHandler.js             # API 요청 ($api.get/post/put/patch/delete), 파라미터 치환
│   ├── ComponentLoader.js        # components/ 폴더 자동 발견 및 전역 등록
│   ├── FormHandler.js            # 폼 자동 처리, action URL {param} 치환
│   ├── ErrorHandler.js           # 에러 관리, 404/500 폴백 페이지
│   └── StateHandler.js           # 전역 상태 관리 ($state)
└── plugins/
    ├── AuthManager.js            # JWT 인증, 토큰 관리, 보호 라우트
    ├── CacheManager.js           # 메모리 캐시, TTL, LRU 퇴거
    ├── I18nManager.js            # 다국어 지원, 번역 키-값
    └── QueryManager.js           # 쿼리/라우트 파라미터 파싱
```

## Development Commands
- `npm run dev` — esbuild watch 모드
- `npm run build` — 프로덕션 빌드 (ESM + UMD)
- `npm run test` — Jest 테스트
- `npm run test:coverage` — 커버리지 포함 테스트
- `npm run serve` — http-server (포트 8080)
- `npm run examples` — 예제 앱 서버 (포트 3000)

## Key Design Decisions

### Options API 기반
이 프로젝트는 **Vue 3 Options API**를 사용한다. Composition API가 아닌 이유:
- 레이아웃-페이지 스크립트 병합 시 `data`, `methods`, `computed`, `watch` 등을 객체 스프레드로 단순 합칠 수 있음
- 사용자가 `logic/*.js`에서 plain object를 export하는 구조
- `this.$api`, `this.$state` 등 인스턴스 프로퍼티 주입이 자연스러움

### 라이프사이클 훅 병합 구조 (RouteLoader.js)
`_mergeLayoutAndPageScript()`에서 레이아웃/페이지의 라이프사이클 훅을 `_layout*`, `_page*` 프로퍼티로 보존하고, `createVueComponent()`에서 명시적 훅 내에서 순차 실행한다.
- **지원 훅**: `created`, `beforeMount`, `mounted`, `beforeUpdate`, `updated`, `beforeUnmount`, `unmounted`
- **실행 순서**: 레이아웃 먼저 → 페이지 실행
- **`layout: null`인 경우에도** `_page*` 프로퍼티를 모두 설정해야 함 (과거 버그 수정 이력 있음)
- `beforeCreate`는 data/methods 초기화 전이라 병합 대상이 아님

### 라우팅 방식
- **쿼리 기반**: `/users?id=123` (path parameter `/users/:id` 방식 아님)
- **파일 기반**: `views/page.html` + `logic/page.js` 쌍으로 자동 라우트 생성
- **레이아웃**: `views/layout/` + `logic/layout/` (기본값: `default`)
- **컴포넌트**: `components/*.js` 자동 전역 등록 (import 불필요)

### 컴포넌트에 자동 주입되는 메서드/프로퍼티
`createVueComponent()` 내에서 주입:
- `this.$api` — ApiHandler 바인딩 (mounted에서 초기화)
- `this.$state` — StateHandler
- `this.$query`, `this.$params` — 쿼리/라우트 파라미터
- `this.$dataLoading` — 데이터 로딩 상태
- `this.navigateTo(route, params)` — 라우트 이동
- `this.getCurrentRoute()` — 현재 라우트
- `this.getParam(key, default)` — 파라미터 접근
- `this.$t(key, params)` — i18n 번역
- `this.isAuth()`, `this.getToken()`, `this.setToken()`, `this.logout()` — 인증
- `this.fetchData(config?)` — dataURL 기반 API 호출

## Configuration Options
```javascript
new ViewLogicRouter({
  basePath: '/',              // 앱 베이스 경로 (기본: '/')
  srcPath: '/src',            // 소스 파일 경로 (기본: '/src')
  mode: 'hash',               // 'hash' | 'history' (기본: 'hash')
  defaultRoute: 'home',       // 기본 라우트 (기본: 'home')
  defaultLayout: 'default',   // 기본 레이아웃 (기본: 'default')
  cacheMode: 'memory',        // 캐시 모드 (기본: 'memory')
  cacheTTL: 300000,           // 캐시 TTL ms (기본: 300000)
  useI18n: false,             // i18n 활성화 (기본: false)
  defaultLanguage: 'ko',      // 기본 언어 (기본: 'ko')
  auth: false,                // 인증 활성화 (기본: false) — authEnabled도 가능
  authFunction: null,         // 인증 확인 함수 — checkAuthFunction도 가능
  loginRoute: 'login',        // 로그인 라우트 (기본: 'login')
  protectedRoutes: [],        // 비어있으면 publicRoutes 외 전부 보호
  environment: 'development', // 'development' | 'production'
  logLevel: 'info',            // 로그 레벨
  errorHandlers: null           // HTTP 상태 코드별 에러 핸들러 ({ 403: fn, '5xx': fn })
})
```

## Examples App Structure
```
examples/src/
├── views/                    # HTML 템플릿
│   ├── home.html, about.html, contact.html, ...
│   └── layout/default.html   # 레이아웃 템플릿 ({{ content }} 슬롯)
├── logic/                    # JS 로직
│   ├── home.js, about.js, contact.js, ...
│   └── layout/default.js     # 레이아웃 로직
└── components/               # 재사용 UI 컴포넌트 (30+개)
    ├── Button.js, Modal.js, Table.js, Tabs.js, ...
```

## Documentation Reference
문서 관련 질문이나 작업 시 아래 파일을 참조:
- `docs/basic-usage.md` — 기본 사용법, 디렉토리 구조, 페이지 작성법
- `docs/router.md` — 라우팅 모드, 레이아웃 시스템, 컴포넌트 시스템, 네비게이션
- `docs/api.md` — API 레퍼런스 (메서드, 속성, 네비게이션 가드, 타입 정의)
- `docs/installation.md` — 설치 방법
- `README.md` — 프로젝트 소개 및 퀵스타트
- `GUIDE.md` — 종합 사용자 가이드 (43KB, 상세)

## Version & Release
- 버전업: `package.json`의 `version` 필드 직접 수정 (npm version 훅이 dist gitignore 문제로 실패하므로)
- 빌드/배포: 사용자가 `npm run build` → `npm login` → `npm publish`로 직접 수행
- AI 역할: 코드 수정 후 **커밋 + 푸시만** 수행. 빌드/배포는 하지 않음

## Code Conventions
- 한국어 주석 사용
- 클래스 기반 모듈 구조 (각 파일이 하나의 클래스 export)
- 로깅: `this.log(level, ...args)` → ErrorHandler 위임
- 에러 처리: 핵심 기능 실패 시에도 라우터 계속 작동 (graceful degradation)
- 캐시 키 네이밍: `component_${routeName}`, `layout_html_${name}`, `layout_script_${name}`
