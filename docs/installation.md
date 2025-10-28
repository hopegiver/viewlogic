# 설치

ViewLogic Router를 프로젝트에 추가하는 방법을 안내합니다.

## CDN 사용 (권장)

가장 빠르고 간단한 방법입니다. HTML 파일에 다음 스크립트를 추가하세요:

```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>ViewLogic Router</title>
</head>
<body>
    <div id="app"></div>

    <!-- Vue 3 -->
    <script src="https://cdn.jsdelivr.net/npm/vue@3/dist/vue.global.prod.js"></script>

    <!-- ViewLogic Router -->
    <script src="https://cdn.jsdelivr.net/npm/viewlogic@1.2.10/dist/viewlogic-router.min.js"></script>

    <script>
        // 라우터 초기화
        const router = new ViewLogicRouter({
            srcPath: '/app'
        });
    </script>
</body>
</html>
```

### CDN 버전 선택

**최신 버전 (자동 업데이트)**
```html
<script src="https://cdn.jsdelivr.net/npm/viewlogic/dist/viewlogic-router.min.js"></script>
```

**특정 버전 (권장)**
```html
<script src="https://cdn.jsdelivr.net/npm/viewlogic@1.2.10/dist/viewlogic-router.min.js"></script>
```

**개발 버전 (압축되지 않음)**
```html
<script src="https://cdn.jsdelivr.net/npm/viewlogic@1.2.10/dist/viewlogic-router.js"></script>
```

## NPM 설치

패키지 매니저를 사용하는 프로젝트의 경우:

### NPM
```bash
npm install viewlogic
```

### Yarn
```bash
yarn add viewlogic
```

### PNPM
```bash
pnpm add viewlogic
```

## 모듈 사용

ES 모듈로 가져오기:

```javascript
import ViewLogicRouter from 'viewlogic/router';

const router = new ViewLogicRouter({
    srcPath: '/app'
});
```

CommonJS 방식:

```javascript
const ViewLogicRouter = require('viewlogic/router');

const router = new ViewLogicRouter({
    srcPath: '/app'
});
```

## 브라우저 지원

ViewLogic Router는 다음 브라우저를 지원합니다:

- Chrome (최신 2개 버전)
- Firefox (최신 2개 버전)
- Safari (최신 2개 버전)
- Edge (최신 2개 버전)

**IE11은 지원하지 않습니다.**

## 의존성

ViewLogic Router는 다음 라이브러리와 함께 사용하도록 설계되었습니다:

- **Vue 3** (필수): 컴포넌트 렌더링
- **ViewLogic Core** (포함됨): 기본 유틸리티

## 다음 단계

설치가 완료되었다면 [기본 사용법](basic-usage.md)을 확인하여 라우터를 설정해보세요.
