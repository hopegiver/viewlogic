# Router 모듈

ViewLogic Router는 파일 시스템 기반의 자동 라우팅을 제공하는 SPA 라우터입니다.

## 개요

ViewLogic Router는 디렉토리 구조를 기반으로 자동으로 라우트를 생성하며, Vue 3와 완벽하게 통합되어 컴포넌트 기반 개발을 지원합니다.

## 생성자

### ViewLogicRouter(options)

새로운 라우터 인스턴스를 생성합니다.

```javascript
const router = new ViewLogicRouter({
    srcPath: '/app',
    mode: 'hash',
    base: '/'
});
```

**매개변수:**

- `options` (Object) - 라우터 설정 객체
  - `srcPath` (String, 필수) - 페이지 파일들이 위치한 디렉토리 경로
  - `mode` (String, 선택) - 라우팅 모드 ('hash' | 'history', 기본값: 'hash')
  - `base` (String, 선택) - 애플리케이션의 base URL (기본값: '/')

## 라우팅 모드

### Hash 모드

URL에 해시(`#`)를 사용하는 기본 모드입니다.

```javascript
const router = new ViewLogicRouter({
    srcPath: '/app',
    mode: 'hash'
});

// URL 예시: https://example.com/#/about
```

**장점:**
- 서버 설정 불필요
- 모든 환경에서 동작
- 브라우저 호환성 우수

**단점:**
- URL에 `#` 포함
- SEO 최적화 어려움

### History 모드

HTML5 History API를 사용하는 모드입니다.

```javascript
const router = new ViewLogicRouter({
    srcPath: '/app',
    mode: 'history'
});

// URL 예시: https://example.com/about
```

**장점:**
- 깔끔한 URL
- SEO 친화적

**단점:**
- 서버 설정 필요 (모든 경로를 index.html로 리다이렉트)

**서버 설정 예시 (Nginx):**

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

## 자동 라우팅

ViewLogic Router는 **View-Logic 분리** 원칙에 따라 `views/` 폴더의 파일 시스템 구조를 기반으로 자동으로 라우트를 생성합니다.

### 파일 구조 기반 라우팅

```
app/
├── views/               # HTML 템플릿 (View)
│   ├── home.html        → / 또는 /home
│   ├── contact.html     → /contact
│   ├── components.html  → /components
│   ├── navigation.html  → /navigation
│   ├── error.html       → /error
│   └── 404.html         → 존재하지 않는 라우트 폴백
├── logic/               # Vue 컴포넌트 로직 (Logic)
│   ├── home.js
│   ├── contact.js
│   ├── components.js
│   ├── navigation.js
│   ├── error.js
│   └── 404.js
├── styles/              # 페이지별 CSS
│   ├── home.css
│   ├── contact.css
│   ├── components.css
│   └── 404.css
├── components/          # 재사용 가능한 컴포넌트 (자동 등록)
│   ├── Button.js
│   ├── Modal.js
│   └── ...
└── layouts/             # 레이아웃 템플릿
    └── default.html
```

### View-Logic 매핑

각 페이지는 3개의 파일로 구성되며, ViewLogic이 자동으로 매핑합니다:

| View 파일 | Logic 파일 | Style 파일 | 라우트 |
|-----------|------------|------------|--------|
| `views/home.html` | `logic/home.js` | `styles/home.css` | `/` 또는 `/home` |
| `views/contact.html` | `logic/contact.js` | `styles/contact.css` | `/contact` |
| `views/user-profile.html` | `logic/user-profile.js` | `styles/user-profile.css` | `/user-profile` |
| `views/404.html` | `logic/404.js` | `styles/404.css` | 404 폴백 |

### 라우트 이름 규칙

- 파일명은 **하이픈(-)으로 구분**하여 작성
- `user-profile.html` → `/user-profile` 라우트 생성
- `home.html`은 루트 경로 `/`와 `/home` 모두에서 접근 가능
- 파일명이 그대로 URL 경로가 됨 (확장자 제외)

## 레이아웃 시스템

ViewLogic은 레이아웃을 통해 페이지의 공통 구조(헤더, 푸터 등)를 관리합니다.

### 레이아웃 파일 (app/layouts/default.html)

```html
<header>
    <DynamicInclude page="navigation" />
</header>

<main class="main-content">
    <div class="container">
        <!-- 페이지 컨텐츠가 {{ content }}에 삽입됨 -->
        {{ content }}
    </div>
</main>

<footer class="page-footer">
    <div class="container">
        <p>&copy; 2025 My Website. All rights reserved.</p>
    </div>
</footer>
```

### 페이지에서 레이아웃 지정

Logic 파일에서 레이아웃을 지정합니다:

```javascript
// app/logic/home.js
export default {
    name: 'Home',

    // 레이아웃 지정
    layout: 'default',  // layouts/default.html 사용

    // 또는 레이아웃 없이 페이지만 렌더링
    // layout: null,

    data() {
        return {
            message: 'Hello World'
        };
    }
}
```

### DynamicInclude 컴포넌트

레이아웃이나 페이지에서 다른 페이지를 포함할 수 있습니다:

```html
<!-- navigation 페이지 포함 -->
<DynamicInclude page="navigation" />

<!-- 동적으로 페이지 포함 -->
<DynamicInclude :page="currentPage" />
```

`DynamicInclude`는 `views/` 폴더의 HTML과 `logic/` 폴더의 JS를 자동으로 로드합니다.

## 페이지 라이프사이클

각 페이지 컴포넌트는 Vue 3의 라이프사이클 훅을 사용할 수 있습니다:

```javascript
export default {
    // 컴포넌트가 생성되기 전
    beforeCreate() {
        console.log('Before create');
    },

    // 컴포넌트가 생성된 후
    created() {
        console.log('Created');
    },

    // DOM에 마운트되기 전
    beforeMount() {
        console.log('Before mount');
    },

    // DOM에 마운트된 후
    mounted() {
        console.log('Mounted');
        // 데이터 로딩 등
    },

    // 컴포넌트가 업데이트되기 전
    beforeUpdate() {
        console.log('Before update');
    },

    // 컴포넌트가 업데이트된 후
    updated() {
        console.log('Updated');
    },

    // 컴포넌트가 제거되기 전
    beforeUnmount() {
        console.log('Before unmount');
        // 정리 작업
    },

    // 컴포넌트가 제거된 후
    unmounted() {
        console.log('Unmounted');
    }
}
```

## 컴포넌트 시스템

ViewLogic은 `components/` 폴더의 모든 컴포넌트를 자동으로 전역 등록합니다.

### 컴포넌트 작성 (app/components/Button.js)

```javascript
export default {
    name: 'Button',
    template: `
        <button
            :class="buttonClasses"
            :disabled="disabled"
            @click="handleClick"
        >
            <slot>{{ text }}</slot>
        </button>
    `,
    props: {
        variant: {
            type: String,
            default: 'primary'
        },
        disabled: Boolean,
        text: String
    },
    computed: {
        buttonClasses() {
            return ['btn', `btn-${this.variant}`];
        }
    },
    methods: {
        handleClick(event) {
            this.$emit('click', event);
        }
    }
}
```

### 컴포넌트 사용

Import 없이 바로 사용 가능:

```html
<!-- app/views/contact.html -->
<div class="contact-page">
    <h1>Contact Us</h1>

    <!-- Button 컴포넌트 자동으로 사용 가능 -->
    <Button variant="primary" @click="handleSubmit">
        Send Message
    </Button>

    <!-- Modal 컴포넌트도 자동으로 사용 가능 -->
    <Modal :show="showModal" @close="showModal = false">
        <p>Thank you for your message!</p>
    </Modal>
</div>
```

**컴포넌트 자동 등록 규칙:**
- `components/` 폴더의 모든 `.js` 파일이 자동으로 전역 등록됨
- 파일명이 컴포넌트 이름이 됨 (예: `Button.js` → `<Button>`)
- import나 등록 코드 불필요
- 모든 페이지에서 즉시 사용 가능

## 스타일 관리

ViewLogic은 페이지별 CSS를 자동으로 관리합니다.

### 페이지별 스타일 (app/styles/home.css)

```css
/* 이 스타일은 home 페이지에만 적용됨 */
.home-page {
    padding-top: 60px;
}

.hero-section {
    background: linear-gradient(135deg, #007bff, #0056b3);
    color: white;
    padding: 100px 0;
    text-align: center;
}

.features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 40px;
}
```

**스타일 로딩 규칙:**
- `styles/페이지명.css` 파일이 자동으로 해당 페이지에 로드됨
- 페이지 이동 시 자동으로 스타일 추가/제거
- 다른 페이지에는 영향을 주지 않음
- 전역 스타일은 `css/base.css`에 작성

### 전역 스타일 (css/base.css)

모든 페이지에 공통으로 적용되는 스타일:

```css
/* 모든 페이지에 적용 */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    line-height: 1.6;
    color: #333;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}
```

## 404 처리

존재하지 않는 라우트에 대한 폴백 페이지:

```
app/
├── views/
│   └── 404.html       # 404 페이지 템플릿
├── logic/
│   └── 404.js         # 404 페이지 로직
└── styles/
    └── 404.css        # 404 페이지 스타일
```

### app/views/404.html
```html
<div class="error-page">
    <div class="error-content">
        <h1 class="error-code">404</h1>
        <h2>Page Not Found</h2>
        <p>죄송합니다. 요청하신 페이지를 찾을 수 없습니다.</p>
        <button class="btn btn-primary" @click="navigateTo('home')">
            홈으로 돌아가기
        </button>
    </div>
</div>
```

### app/logic/404.js
```javascript
export default {
    name: 'NotFound',
    mounted() {
        console.log('404 page loaded');
    }
}
```

## 네비게이션

### navigateTo 메서드

페이지 이동을 위한 내장 메서드:

```javascript
// app/logic/home.js
export default {
    methods: {
        goToContact() {
            // 페이지 이름으로 이동
            this.navigateTo('contact');
        },

        goToUserProfile() {
            // 쿼리 파라미터와 함께 이동
            this.navigateTo('user-profile', {
                userId: 123,
                tab: 'settings'
            });
            // 결과: /user-profile?userId=123&tab=settings
        },

        goToComponents() {
            // 객체 형식으로 이동
            this.navigateTo({
                route: 'components',
                params: { section: 'buttons' }
            });
        }
    }
}
```

### 링크 네비게이션

View 템플릿에서 직접 링크 사용:

```html
<!-- app/views/home.html -->
<div class="home-page">
    <!-- 일반 링크 (hash 모드: #/contact, history 모드: /contact) -->
    <a href="#/contact">Contact Us</a>

    <!-- 버튼으로 네비게이션 -->
    <button @click="navigateTo('components')">
        View Components
    </button>

    <!-- 파라미터와 함께 이동 -->
    <button @click="navigateTo('search', { q: 'viewlogic' })">
        Search ViewLogic
    </button>
</div>
```

## 파라미터 접근

### getParam 메서드

URL 파라미터에 쉽게 접근:

```javascript
// URL: /search?q=viewlogic&page=2&category=tutorials

export default {
    computed: {
        searchQuery() {
            // getParam(키, 기본값)
            return this.getParam('q', '');
        },
        currentPage() {
            return this.getParam('page', 1);
        },
        category() {
            return this.getParam('category', 'all');
        }
    },

    methods: {
        async loadData() {
            const results = await this.$api.get('/api/search', {
                params: {
                    q: this.searchQuery,
                    page: this.currentPage,
                    category: this.category
                }
            });
        }
    }
}
```

## 요약

### 폴더별 파일 작성 규칙

| 폴더 | 파일 형식 | 용도 | 자동 처리 |
|------|-----------|------|-----------|
| `views/` | `.html` | 순수 HTML 템플릿 (프레젠테이션) | 파일명으로 라우트 생성 |
| `logic/` | `.js` | Vue 컴포넌트 로직 (비즈니스 로직) | 자동으로 해당 view와 매핑 |
| `styles/` | `.css` | 페이지별 스타일 | 해당 페이지에만 자동 로드 |
| `components/` | `.js` | 재사용 가능한 컴포넌트 | 전역 자동 등록 |
| `layouts/` | `.html` | 레이아웃 템플릿 | 페이지를 감싸는 구조 제공 |

### 새 페이지 만들기 예시

`/user-profile` 페이지를 만들려면:

1. **app/views/user-profile.html** - View (HTML 템플릿)
```html
<div class="user-profile">
    <h1>{{ userName }}</h1>
    <p>Email: {{ userEmail }}</p>
</div>
```

2. **app/logic/user-profile.js** - Logic (JavaScript)
```javascript
export default {
    name: 'UserProfile',
    layout: 'default',
    data() {
        return {
            userName: 'John Doe',
            userEmail: 'john@example.com'
        };
    }
}
```

3. **app/styles/user-profile.css** - Style (CSS, 선택사항)
```css
.user-profile {
    padding: 20px;
}
```

이렇게 3개 파일을 만들면 `/user-profile` 라우트가 자동으로 생성되고 작동합니다!

## 다음 단계

- [API 참고](api.md) - 전체 API 문서
- [기본 사용법](basic-usage.md) - 기초부터 시작하기
