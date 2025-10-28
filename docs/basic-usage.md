# 기본 사용법

ViewLogic Router의 기본적인 사용 방법을 소개합니다.

## 기본 설정

가장 간단한 라우터 설정입니다:

```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>ViewLogic Router</title>
</head>
<body>
    <div id="app"></div>

    <script src="https://cdn.jsdelivr.net/npm/vue@3/dist/vue.global.prod.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/viewlogic@1.2.10/dist/viewlogic-router.min.js"></script>

    <script>
        const router = new ViewLogicRouter({
            srcPath: '/app'
        });
    </script>
</body>
</html>
```

## 디렉토리 구조

ViewLogic Router는 **View-Logic 분리** 원칙을 따르는 파일 시스템 기반 라우팅을 사용합니다:

```
project/
├── index.html              # 메인 진입점
└── app/                    # srcPath: '/app'
    ├── views/              # HTML 템플릿 (순수 프레젠테이션)
    │   ├── home.html       → 라우트: / 또는 /home
    │   ├── contact.html    → 라우트: /contact
    │   ├── components.html → 라우트: /components
    │   ├── navigation.html → 라우트: /navigation
    │   ├── error.html      → 라우트: /error
    │   └── 404.html        → 존재하지 않는 라우트 폴백
    ├── logic/              # Vue 컴포넌트 로직 (순수 JavaScript)
    │   ├── home.js
    │   ├── contact.js
    │   ├── components.js
    │   ├── navigation.js
    │   ├── error.js
    │   ├── 404.js
    │   └── layout.js       # 레이아웃 관련 로직
    ├── styles/             # 페이지별 CSS 파일
    │   ├── home.css
    │   ├── contact.css
    │   ├── components.css
    │   └── 404.css
    ├── components/         # 재사용 가능한 UI 컴포넌트
    │   ├── Button.js
    │   ├── Modal.js
    │   ├── Tabs.js
    │   ├── Card.js
    │   └── ...             # 기타 컴포넌트들
    └── layouts/            # 레이아웃 템플릿
        └── default.html    # 기본 레이아웃 (헤더/푸터 등)
```

### 폴더별 역할

- **views/**: 순수 HTML 템플릿만 포함. Vue 템플릿 문법 사용 가능
- **logic/**: 각 페이지의 Vue 컴포넌트 로직 (data, methods, computed 등)
- **styles/**: 페이지별 CSS 스타일 (자동으로 해당 페이지에 로드됨)
- **components/**: 재사용 가능한 Vue 컴포넌트 (자동으로 전역 등록됨)
- **layouts/**: 페이지를 감싸는 레이아웃 템플릿

## 페이지 작성

ViewLogic은 **View(뷰)와 Logic(로직)을 완전히 분리**합니다. 각 페이지는 3개의 파일로 구성됩니다:

### 1. View 파일 (app/views/home.html)

순수 HTML 템플릿 - 프레젠테이션만 담당:

```html
<div class="home-page">
    <div class="hero-section">
        <div class="container">
            <h1>{{ heroTitle }}</h1>
            <p>{{ heroSubtitle }}</p>
            <button class="btn btn-primary" @click="navigateTo('contact')">
                Get Started
            </button>
        </div>
    </div>

    <div class="features-section">
        <div class="features-grid">
            <div v-for="feature in features" :key="feature.title" class="feature-item">
                <div class="feature-icon">{{ feature.icon }}</div>
                <h3>{{ feature.title }}</h3>
                <p>{{ feature.description }}</p>
            </div>
        </div>
    </div>
</div>
```

### 2. Logic 파일 (app/logic/home.js)

순수 JavaScript - 비즈니스 로직만 담당:

```javascript
export default {
    name: 'Home',

    // 선택사항: 레이아웃 지정
    layout: 'default',  // layouts/default.html 사용
    // layout: null,    // 레이아웃 없이 페이지만 렌더링

    data() {
        return {
            heroTitle: 'Welcome to Our Website',
            heroSubtitle: 'Create amazing experiences',
            features: [
                {
                    icon: '🚀',
                    title: 'Fast & Reliable',
                    description: 'Built for speed and performance'
                },
                {
                    icon: '🎯',
                    title: 'Easy to Use',
                    description: 'Intuitive interface'
                }
            ]
        };
    },

    mounted() {
        console.log('Home page loaded');
    }
}
```

### 3. Style 파일 (app/styles/home.css)

페이지별 스타일 - 자동으로 해당 페이지에만 로드됨:

```css
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

### 레이아웃 파일 (app/layouts/default.html)

모든 페이지를 감싸는 공통 레이아웃:

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
    <div class="container">
        <p>&copy; 2025 My Website. All rights reserved.</p>
    </div>
</footer>
```

## 파일 네이밍 규칙

### 라우트 매핑 방식

ViewLogic은 `views/` 폴더의 파일명을 기반으로 자동으로 라우트를 생성합니다:

| 파일 경로 | 라우트 | 로직 파일 | 스타일 파일 |
|-----------|--------|-----------|-------------|
| `views/home.html` | `/` 또는 `/home` | `logic/home.js` | `styles/home.css` |
| `views/contact.html` | `/contact` | `logic/contact.js` | `styles/contact.css` |
| `views/components.html` | `/components` | `logic/components.js` | `styles/components.css` |
| `views/404.html` | 존재하지 않는 라우트 | `logic/404.js` | `styles/404.css` |

**중요**: 파일명은 **하이픈(-)을 사용**하여 작성합니다 (예: `user-profile.html`, `user-profile.js`, `user-profile.css`)

## 라우터 옵션

### srcPath
페이지 파일들이 위치한 디렉토리를 지정합니다.

```javascript
const router = new ViewLogicRouter({
    srcPath: '/app'  // /app 폴더에서 페이지를 찾음
});
```

### mode
라우팅 모드를 설정합니다.

```javascript
const router = new ViewLogicRouter({
    srcPath: '/app',
    mode: 'history'  // 'hash' 또는 'history' (기본값: 'hash')
});
```

- **hash 모드**: URL에 `#`을 사용 (예: `/#/about`)
- **history 모드**: HTML5 History API 사용 (예: `/about`)

### base
애플리케이션의 base URL을 설정합니다.

```javascript
const router = new ViewLogicRouter({
    srcPath: '/app',
    base: '/my-app/'  // 앱이 서브 디렉토리에 있을 경우
});
```

## 네비게이션

### 링크 사용

일반 HTML 앵커 태그를 사용하면 자동으로 라우터가 처리합니다:

```html
<a href="/about">소개 페이지로 이동</a>
<a href="/user/profile">프로필 보기</a>
```

### 프로그래밍 방식 네비게이션

JavaScript로 페이지를 이동할 수 있습니다:

```javascript
// 새 페이지로 이동
router.push('/about');

// 매개변수와 함께 이동
router.push('/user/profile', { userId: 123 });

// 뒤로 가기
router.back();

// 앞으로 가기
router.forward();
```

## 컴포넌트 작성

`components/` 폴더의 컴포넌트는 자동으로 전역 등록되어 모든 페이지에서 사용할 수 있습니다:

### 컴포넌트 파일 (app/components/Button.js)

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
        disabled: {
            type: Boolean,
            default: false
        },
        text: {
            type: String,
            default: ''
        }
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

### 페이지에서 컴포넌트 사용

컴포넌트는 import 없이 바로 사용할 수 있습니다:

```html
<div class="contact-page">
    <h1>Contact Us</h1>

    <!-- Button 컴포넌트 사용 -->
    <Button variant="primary" @click="handleSubmit">
        Send Message
    </Button>

    <!-- Modal 컴포넌트 사용 -->
    <Modal :show="showModal" @close="showModal = false">
        <h3>Thank you!</h3>
        <p>Your message has been sent.</p>
    </Modal>
</div>
```

## 쿼리 파라미터

URL 쿼리 파라미터에 접근할 수 있습니다:

```javascript
// URL: /search?q=viewlogic&page=2

export default {
    computed: {
        searchQuery() {
            return this.getParam('q', '');
        },
        currentPage() {
            return this.getParam('page', 1);
        }
    },
    methods: {
        async loadData() {
            // URL 파라미터를 사용하여 데이터 로드
            const results = await this.$api.get('/api/search', {
                params: {
                    q: this.searchQuery,
                    page: this.currentPage
                }
            });
        }
    }
}
```

## 404 페이지

찾을 수 없는 페이지를 처리하기 위한 404 페이지를 만들 수 있습니다:

### 파일 구조
```
app/
├── views/
│   └── 404.html
├── logic/
│   └── 404.js
└── styles/
    └── 404.css
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

## 새 페이지 만들기 체크리스트

새 페이지를 만들 때는 다음 3개 파일을 생성합니다:

1. **View 파일** (`app/views/페이지명.html`)
   - 순수 HTML 템플릿
   - Vue 템플릿 문법 사용 ({{ }}, v-for, v-if, @click 등)
   - 프레젠테이션 로직만 포함

2. **Logic 파일** (`app/logic/페이지명.js`)
   - Vue 컴포넌트 객체 export
   - data, methods, computed, mounted 등
   - 비즈니스 로직 포함

3. **Style 파일** (`app/styles/페이지명.css`) - 선택사항
   - 해당 페이지에만 적용되는 스타일
   - 페이지 로드 시 자동으로 주입됨

**예시**: `/user-profile` 페이지를 만들려면
- `app/views/user-profile.html`
- `app/logic/user-profile.js`
- `app/styles/user-profile.css`

파일명은 자동으로 라우트로 변환됩니다: `user-profile` → `/user-profile`

## 다음 단계

- [Router 모듈](router.md) - 고급 라우터 기능
- [API 참고](api.md) - 전체 API 문서
