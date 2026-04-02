# Changelog

## [1.8.1] - 2026-04-01

### Added
- `auth` 설정 키 추가 (`authEnabled`의 간결한 별칭)
- `authFunction` 설정 키 추가 (`checkAuthFunction`의 간결한 별칭)
- 인증 테스트 예제 페이지 (login, dashboard)

### Changed
- 내부 기본 키를 `authFunction`으로 변경 (기존 `checkAuthFunction`은 별칭으로 유지)
- 문서 전체에서 권장 키 이름을 `auth` / `authFunction`으로 통일

## [1.8.0] - 2026-04-01

### Added
- HTTP 상태 코드별 에러 핸들러 (`errorHandlers` 옵션)
- MCP 서버 (`mcp-server/`)
- 쿼리 파라미터 변경 시 라우트 재로딩 지원

### Changed
- 문서 전면 개편 (configuration.md, auth.md, api-usage.md 등)

### Fixed
- 주소창에서 쿼리 파라미터 변경 시 라우트가 리로드되지 않는 버그

## [1.7.1] - 2026-03-19

### Added
- `data-ready` 페이지 전환 (API settle 추적)
- API 응답/에러 인터셉터 (`apiInterceptors` 옵션)
- JWT 토큰 갱신 콜백 (`refreshToken` 옵션)
- `setRefreshToken` 컴포넌트 직접 메서드
- `created` 라이프사이클 훅 지원
- `defaultRoute` 설정 옵션
- 레이아웃 HTML 캐싱

### Fixed
- `data-ready` 전환이 `mounted()` 완료를 기다리지 않는 버그
- JWT 토큰이 API 요청 헤더에 주입되지 않는 버그
- `requestTimeout`, `uploadTimeout`이 FormHandler에 전달되지 않는 버그
- `apiBaseURL`이 ApiHandler에 전달되지 않는 버그
- 레이아웃이 null일 때 라이프사이클 훅이 실행되지 않는 버그
- `getCurrentRoute()`가 선행 슬래시 없이 반환되는 버그
- 레이아웃이 null일 때 `data()` 초기화 오류
- `defaultRoute`가 history 모드에서 동작하지 않는 버그
- 레이아웃/페이지 스크립트 병합 버그

### Changed
- `$layout` → `layoutData`로 이름 변경 (Vue 3 호환성)

## [1.4.0] - 2025-12-22

### Added
- 레이아웃 로직 지원 (`logic/layout/`)
- 레이아웃-페이지 스크립트 병합 시스템

## [1.3.3] - 2025-12-16

### Added
- `$createComponent` 메서드
- `apiBaseURL` 설정
- 라우트 이동 시 자동 스크롤 맨 위 이동

### Changed
- 빌드 시스템 최적화 (ESM + UMD only)
- Docsify 기반 문서 구조 개편
- 경로 처리 시스템 리팩터링

## [1.2.4] - 2025-09-18

### Added
- `StateHandler` 전역 상태 관리 (`$state`)
- `$params` 지원
- 종합 단위/통합 테스트

### Changed
- QueryManager 간소화
- CacheManager API 일관성 개선
- 모든 매니저 최적화 및 간소화

### Fixed
- ErrorHandler null safety

## [1.2.2] - 2025-09-16

### Added
- `$api` 패턴 (`bindToComponent` 방식)

### Changed
- FormHandler 핵심 기능 중심 간소화
- RouteLoader 아키텍처 최적화
- 코어 시스템 관심사 분리 리팩터링

## [1.1.3] - 2025-09-12

### Fixed
- History 모드에서 서브폴더 배포 라우팅
- i18n 메시지 파일 로딩 실패 시 라우터 복원력

### Changed
- `basePath`/`srcPath` 개념 리팩터링
- 스마트 경로 해석 시스템

## [1.1.1] - 2025-09-12

### Added
- 초기 릴리스
- 해시/히스토리 모드 라우팅
- 파일 기반 자동 라우팅 (`views/` + `logic/`)
- 레이아웃 시스템
- 컴포넌트 자동 전역 등록
- `dataURL` 자동 페칭
- 폼 자동 처리
- JWT 인증 (AuthManager)
- 메모리 캐시 (CacheManager)
- 다국어 지원 (I18nManager)
- 쿼리/라우트 파라미터 (QueryManager)
- CDN 및 ESM 지원
