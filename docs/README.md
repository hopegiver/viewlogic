# ViewLogic Router

> **AI-First Vue 3 Framework**: View-Logic 분리 원칙을 따르는 차세대 웹 프레임워크

ViewLogic Router는 **View(프레젠테이션)와 Logic(비즈니스 로직)의 완전한 분리**를 통해 유지보수가 쉽고, 테스트 가능하며, AI 친화적인 웹 애플리케이션 개발을 지원합니다.

## 핵심 철학

### View-Logic 분리
**완전한 View와 Logic의 분리**. View는 순수 HTML 템플릿, Logic은 순수 JavaScript 컴포넌트입니다. 이 분리는 코드를 더욱 유지보수 가능하고, 테스트 가능하며, 확장 가능하게 만듭니다.

### Zero Build 개발
**빌드 단계 없이 개발 가능**. 소스 파일로 직접 작업하며, 컴파일, 번들링, 빌드 과정 없이 변경사항을 즉시 확인할 수 있습니다. 진정한 실시간 개발 경험을 제공합니다.

### AI-First 아키텍처
**AI 코딩 시대를 위해 처음부터 설계됨**. 명확한 컨벤션, 예측 가능한 패턴, 분리된 관심사로 AI 도구와 완벽하게 조화를 이룹니다.

## 주요 특징

- **파일 기반 라우팅** - 설정 없이 파일 구조로 라우트 자동 생성
- **자동 컴포넌트 등록** - components/ 폴더의 컴포넌트 자동 전역 등록
- **스마트 스타일 관리** - 페이지별 CSS 자동 로드/언로드
- **내장 인증 시스템** - JWT 인증과 다양한 스토리지 옵션
- **국제화(i18n)** - 지연 로딩을 통한 다국어 지원
- **스마트 캐싱** - TTL 및 LRU 제거를 통한 내장 캐싱
- **API 클라이언트** - 자동 토큰 주입 HTTP 클라이언트
- **혁명적인 폼 처리** - 파라미터 치환을 통한 자동 폼 처리

**작은 번들 크기** - 완전한 프레임워크가 단 **52KB minified / 18KB gzipped**!

## 빠른 시작

```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
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

## 문서 목차

### 시작하기
- [설치 가이드](installation.md) - 프로젝트에 ViewLogic Router 추가하기
- [기본 사용법](basic-usage.md) - 첫 번째 라우터 설정하기

### 심화 학습
- [Router 모듈](router.md) - 라우터 모듈 상세 가이드
- [API 참고](api.md) - 전체 API 레퍼런스

## 프로젝트 구조

ViewLogic Router는 명확하고 직관적인 폴더 구조를 따릅니다:

```
project/
├── index.html              # 메인 진입점
└── app/                    # srcPath: '/app'
    ├── views/              # HTML 템플릿 (순수 프레젠테이션)
    │   ├── home.html       → 라우트: / 또는 /home
    │   ├── contact.html    → 라우트: /contact
    │   ├── components.html → 라우트: /components
    │   └── 404.html        → 존재하지 않는 라우트 폴백
    ├── logic/              # Vue 컴포넌트 로직 (순수 JavaScript)
    │   ├── home.js
    │   ├── contact.js
    │   ├── components.js
    │   └── 404.js
    ├── styles/             # 페이지별 CSS 파일
    │   ├── home.css
    │   ├── contact.css
    │   └── 404.css
    ├── components/         # 재사용 가능한 UI 컴포넌트
    │   ├── Button.js
    │   ├── Modal.js
    │   └── Card.js
    └── layouts/            # 레이아웃 템플릿
        └── default.html    # 기본 레이아웃 (헤더/푸터 등)
```

## 첫 페이지 만들기

각 페이지는 3개의 파일로 구성됩니다:

### 1. View 파일 (app/views/home.html)
순수 HTML 템플릿 - 프레젠테이션만 담당:

```html
<div class="home-page">
    <h1>{{ message }}</h1>
    <button class="btn" @click="increment">
        Count: {{ count }}
    </button>
</div>
```

### 2. Logic 파일 (app/logic/home.js)
순수 JavaScript - 비즈니스 로직만 담당:

```javascript
export default {
    name: 'Home',
    layout: 'default',  // layouts/default.html 사용

    data() {
        return {
            message: 'Welcome to ViewLogic!',
            count: 0
        };
    },

    methods: {
        increment() {
            this.count++;
        }
    }
}
```

### 3. Style 파일 (app/styles/home.css) - 선택사항
페이지별 스타일 - 자동으로 해당 페이지에만 로드:

```css
.home-page {
    padding: 2rem;
    text-align: center;
}

.home-page h1 {
    color: #2c3e50;
    margin-bottom: 1rem;
}
```

이렇게 3개 파일을 만들면 `/` 또는 `/home` 라우트가 자동으로 생성되고 작동합니다!

## 레이아웃 시스템

공통 구조(헤더, 푸터)를 레이아웃으로 관리:

### app/layouts/default.html
```html
<header>
    <DynamicInclude page="navigation" />
</header>

<main class="main-content">
    <div class="container">
        <!-- 페이지 컨텐츠가 여기에 삽입됨 -->
        {{ content }}
    </div>
</main>

<footer class="page-footer">
    <p>&copy; 2025 My Website. All rights reserved.</p>
</footer>
```

## 컴포넌트 자동 등록

`components/` 폴더의 컴포넌트는 자동으로 전역 등록됩니다:

### app/components/Button.js
```javascript
export default {
    name: 'Button',
    template: `
        <button :class="['btn', variant]" @click="$emit('click')">
            <slot>{{ text }}</slot>
        </button>
    `,
    props: {
        variant: { type: String, default: 'primary' },
        text: String
    }
}
```

### 페이지에서 사용
```html
<!-- import 없이 바로 사용 가능! -->
<Button variant="primary" @click="handleSubmit">
    Send Message
</Button>
```

## 주요 기능

| 기능 | 설명 |
|------|------|
| **파일 기반 라우팅** | 파일명이 자동으로 라우트가 됨 (설정 불필요) |
| **View-Logic 분리** | HTML과 JS가 완전히 분리되어 유지보수 쉬움 |
| **자동 컴포넌트 등록** | components/ 폴더의 컴포넌트 자동 전역 등록 |
| **스마트 스타일 관리** | 페이지별 CSS 자동 로드/언로드 |
| **Zero Build 개발** | 빌드 없이 실시간 개발 가능 |
| **작은 번들 크기** | 52KB minified / 18KB gzipped |

## 네비게이션 및 파라미터

### 페이지 이동
```javascript
// app/logic/home.js
export default {
    methods: {
        goToContact() {
            this.navigateTo('contact');
        },

        searchWithParams() {
            this.navigateTo('search', {
                q: 'viewlogic',
                page: 1
            });
            // 결과: /search?q=viewlogic&page=1
        }
    }
}
```

### 파라미터 접근
```javascript
// URL: /search?q=viewlogic&page=2

export default {
    computed: {
        searchQuery() {
            return this.getParam('q', '');  // 'viewlogic'
        },
        currentPage() {
            return this.getParam('page', 1);  // 2
        }
    }
}
```

## API 통합

내장 API 클라이언트로 간편한 데이터 로딩:

```javascript
export default {
    // 자동 데이터 로딩
    dataURL: {
        profile: '/api/user/profile',
        posts: '/api/posts?userId={userId}'
    },

    mounted() {
        // 데이터가 자동으로 로드되어 사용 가능
        console.log(this.profile);
        console.log(this.posts);
    },

    methods: {
        async createPost() {
            const result = await this.$api.post('/api/posts', {
                title: 'New Post',
                content: 'Hello World'
            });
        }
    }
}
```

## 상태 관리

내장 상태 관리 시스템:

```javascript
// 상태 설정
this.$state.set('user', { name: 'John', age: 30 });

// 상태 가져오기
const user = this.$state.get('user');

// 상태 변경 감지
this.$state.watch('user', (newValue, oldValue) => {
    console.log('User changed:', newValue);
});
```

## 유용한 링크

- [NPM 패키지](https://www.npmjs.com/package/viewlogic)
- [CDN 링크](https://cdn.jsdelivr.net/npm/viewlogic@1.2.10/dist/viewlogic-router.min.js)
- [GitHub 저장소](https://github.com/hopegiver/viewlogic)

## 라이센스

MIT License - 자유롭게 사용하세요!

---

**준비되셨나요?** [설치 가이드](installation.md)에서 시작하거나 [기본 사용법](basic-usage.md)을 확인해보세요!
