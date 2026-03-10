# ViewLogic 프로젝트 메모리

## 작업 이력

### 2026-03-10 (v1.4.8 ~ v1.4.10)

**v1.4.8 — layout: null 라이프사이클 훅 버그 수정**
- `RouteLoader._mergeLayoutAndPageScript()`에서 `layoutScript`이 null일 때 `_pageData`만 설정하고 `_pageMounted` 등 라이프사이클 훅 매핑을 누락하는 버그 발견 및 수정
- 컴포넌트의 `mounted()` 등이 `mergedScript._pageMounted`를 통해서만 호출되므로, 매핑 누락 시 페이지 훅이 실행되지 않았음
- `_pageBeforeMount`, `_pageMounted`, `_pageBeforeUpdate`, `_pageUpdated`, `_pageBeforeUnmount`, `_pageUnmounted` 모두 추가

**v1.4.9 — created 라이프사이클 훅 지원 추가**
- `created` 훅이 레이아웃 병합 시 처리되지 않는 문제 수정
- 3곳 수정: `!layoutScript` 분기, 레이아웃 병합 분기, 컴포넌트 `created()` 핸들러 추가
- `beforeCreate`는 data/methods 초기화 전이라 병합 불필요로 판단하여 미포함

**v1.4.10 — CLAUDE.md 및 코딩 가이드 정비**
- CLAUDE.md를 프로젝트 전체 개요, 아키텍처, 설계 결정, 문서 참조 트리거 포함하여 재작성
- `.claude/rules/coding-guide.md` 생성 (한국어 소통, Options API 준수, 커밋+푸시만 등 핵심 규칙)
- Version Management: npm version 대신 package.json 직접 수정, 빌드/배포는 사용자가 수행

## 주요 학습 사항

### RouteLoader 라이프사이클 훅 구조
- `_mergeLayoutAndPageScript()`의 두 분기를 항상 동기화해야 함
- 컴포넌트에서 명시적으로 재정의되는 훅(mounted, beforeMount 등)은 `_page*`/`_layout*` 매핑 필수
- `created`는 명시적 재정의 추가 완료
- 스프레드로만 전달되는 프로퍼티(예: `setup`)는 별도 매핑 불필요

### 프로젝트 관례
- 사용자는 한국어로 소통
- 커밋 메시지는 영어
- 빌드/배포는 AI가 하지 않음 (사용자가 npm publish로 직접)
- npm version 명령은 preversion 훅 문제로 사용 불가
