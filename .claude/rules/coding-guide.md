# ViewLogic 코딩 가이드 (필수 규칙)

## 언어 및 소통
- 사용자와의 소통은 **한국어**로 한다.
- 코드 주석도 한국어로 작성한다.

## 코드 수정 원칙
- 코드 수정 전에 반드시 해당 파일을 먼저 읽는다.
- Options API 패턴을 따른다. Composition API(setup)를 사용하지 않는다.
- 라이프사이클 훅 수정 시 `_mergeLayoutAndPageScript()`의 두 분기(`!layoutScript`와 레이아웃 병합)를 **모두** 확인한다.
- 새 기능 추가 시 graceful degradation을 유지한다 (실패해도 라우터가 멈추지 않도록).

## 커밋 및 배포
- 코드 수정 후에는 **커밋 + 푸시만** 수행한다.
- 빌드(`npm run build`)와 배포(`npm publish`)는 절대 실행하지 않는다. 사용자가 직접 한다.
- 버전업이 필요하면 `package.json`의 `version` 필드를 직접 수정한다. `npm version` 명령은 사용하지 않는다.
- 커밋 메시지는 영어로 작성하고, 변경의 "why"를 담는다.

## 문서 참조
- API나 사용법 관련 질문 시 `docs/` 폴더의 문서를 참조한다.
- 구조적 변경 시 CLAUDE.md도 함께 업데이트한다.
