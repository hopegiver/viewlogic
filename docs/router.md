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
│   ├── 404.html         → 존재하지 않는 라우트 폴백
│   └── layout/          # 레이아웃 템플릿
│       └── default.html
├── logic/               # Vue 컴포넌트 로직 (Logic)
│   ├── home.js
│   ├── contact.js
│   ├── components.js
│   ├── navigation.js
│   ├── error.js
│   ├── 404.js
│   └── layout/          # 레이아웃 로직
│       └── default.js
```

### View-Logic 매핑

각 페이지는 View와 Logic 파일로 구성되며, ViewLogic이 자동으로 매핑합니다:

| View 파일 | Logic 파일 | 라우트 |
|-----------|------------|--------|
| `views/home.html` | `logic/home.js` | `/` 또는 `/home` |
| `views/contact.html` | `logic/contact.js` | `/contact` |
| `views/user-profile.html` | `logic/user-profile.js` | `/user-profile` |
| `views/404.html` | `logic/404.js` | 404 폴백 |

### 라우트 이름 규칙

- 파일명은 **하이픈(-)으로 구분**하여 작성
- `user-profile.html` → `/user-profile` 라우트 생성
- `home.html`은 루트 경로 `/`와 `/home` 모두에서 접근 가능
- 파일명이 그대로 URL 경로가 됨 (확장자 제외)

## 레이아웃 시스템

ViewLogic은 레이아웃을 통해 페이지의 공통 구조(헤더, 푸터 등)를 관리합니다.

### 레이아웃 파일 (app/views/layout/default.html)

```html
<header>
    <nav class="navbar">
        <a @click="navigateTo('/home')">Home</a>
        <a @click="navigateTo('/about')">About</a>
        <a @click="navigateTo('/contact')">Contact</a>
    </nav>
</header>

<main class="main-content">
    <div class="container">
        <!-- 페이지 컨텐츠가 {{ content }}에 삽입됨 -->
        {{ content }}
    </div>
</main>

<footer class="page-footer">
    <p>&copy; 2025 My Website</p>
</footer>
```

`{{ content }}`는 각 페이지의 HTML이 삽입되는 슬롯입니다.

### 페이지에서 레이아웃 지정

Logic 파일에서 레이아웃을 지정합니다:

```javascript
// app/logic/home.js
export default {
    name: 'Home',

    // 레이아웃 지정
    layout: 'default',  // views/layout/default.html + logic/layout/default.js 사용

    // 또는 레이아웃 없이 페이지만 렌더링
    // layout: null,

    data() {
        return {
            message: 'Hello World'
        };
    }
}
```

### DynamicInclude (선택사항)

다른 페이지를 현재 페이지나 레이아웃에 포함할 수 있는 내장 컴포넌트입니다. 지정한 페이지의 `views/` HTML과 `logic/` JS를 자동으로 로드합니다.

```html
<DynamicInclude page="navigation" />
<DynamicInclude :page="currentPage" />
```

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

## 404 처리

존재하지 않는 라우트에 대한 폴백 페이지:

```
app/
├── views/
│   └── 404.html       # 404 페이지 템플릿
└── logic/
    └── 404.js         # 404 페이지 로직
```

### app/views/404.html
```html
<div class="error-page">
    <div class="error-content">
        <h1 class="error-code">404</h1>
        <h2>Page Not Found</h2>
        <p>죄송합니다. 요청하신 페이지를 찾을 수 없습니다.</p>
        <button class="btn btn-primary" @click="navigateTo('/home')">
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
            this.navigateTo('/contact');
        },

        goToUserProfile() {
            // 쿼리 파라미터와 함께 이동
            this.navigateTo('/user-profile', {
                userId: 123,
                tab: 'settings'
            });
            // 결과: /user-profile?userId=123&tab=settings
        },

        goToComponents() {
            // 객체 형식으로 이동
            this.navigateTo({
                route: '/components',
                params: { section: 'buttons' }
            });
        }
    }
}
```

### 템플릿에서 네비게이션

View 템플릿에서 `navigateTo`를 직접 사용:

```html
<!-- app/views/home.html -->
<div class="home-page">
    <a @click="navigateTo('/contact')">Contact Us</a>

    <button @click="navigateTo('/components')">
        View Components
    </button>

    <!-- 파라미터와 함께 이동 -->
    <button @click="navigateTo('/search', { q: 'viewlogic' })">
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
| `views/layout/` | `.html` | 레이아웃 템플릿 | 페이지를 감싸는 구조 제공 |
| `logic/layout/` | `.js` | 레이아웃 로직 | 레이아웃 view와 매핑 |

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

이렇게 2개 파일을 만들면 `/user-profile` 라우트가 자동으로 생성되고 작동합니다!

## API Interceptors

API 응답과 에러를 전역에서 가로채 처리할 수 있는 인터셉터 시스템입니다. Axios의 interceptors와 유사한 패턴으로, 모든 `$api` 호출에 자동 적용됩니다.

### 기본 설정

```javascript
const router = new ViewLogicRouter({
    srcPath: '/app',
    apiBaseURL: 'https://api.example.com/v1',
    apiInterceptors: {
        response(data, { url, method, status }) {
            // 모든 API 성공 응답이 이 함수를 거침
            return data;
        },
        error(error, { url, method }) {
            // 모든 API 에러가 이 함수를 거침
        }
    }
});
```

### Response Interceptor

모든 API 성공 응답을 가로채 변환하거나 검증할 수 있습니다.

**매개변수:**
- `data` (Object) - API 응답 데이터 (JSON 파싱 완료)
- `context` (Object) - 요청 컨텍스트
  - `url` (String) - 요청 URL (apiBaseURL 포함)
  - `method` (String) - HTTP 메서드 ('GET', 'POST' 등)
  - `status` (Number) - HTTP 상태 코드 (200, 201 등)

**반환값:** 변환된 데이터 (컴포넌트에서 사용할 최종 응답)

```javascript
apiInterceptors: {
    response(data, { url, method, status }) {
        // 예시 1: 응답 형식 검증
        if (!data.success && !data.data) {
            console.warn(`[API] ${url}: 표준 응답 형식 아님`, data);
        }

        // 예시 2: 응답 데이터 변환 (래핑된 응답에서 실제 데이터 추출)
        if (data.result && data.result.items) {
            return data.result;  // 반환값이 원래 data를 대체
        }

        return data;
    }
}
```

### Error Interceptor

모든 API 에러를 가로채 전역에서 처리할 수 있습니다.

**매개변수:**
- `error` (Error) - 발생한 에러 객체
- `context` (Object) - 요청 컨텍스트
  - `url` (String) - 요청 URL
  - `method` (String) - HTTP 메서드

**반환값:**
- `undefined` (아무것도 반환하지 않음) → 기존대로 에러가 throw됨
- 값을 반환 → 에러를 무시하고 해당 값을 응답 데이터로 사용 (fallback)

```javascript
apiInterceptors: {
    error(error, { url, method }) {
        // 예시 1: 전역 에러 알림 (에러는 그대로 전파)
        showToast(`API 오류: ${error.message}`);

        // 예시 2: 특정 API의 에러를 무시하고 기본값 반환
        if (url.includes('/notifications')) {
            return { items: [], total: 0 };  // fallback 데이터
        }

        // 아무것도 반환하지 않으면 에러가 그대로 throw됨
    }
}
```

### 실전 사용 예시

#### 응답 형식 표준화

서버 응답 구조가 일관되지 않을 때 interceptor에서 통일:

```javascript
apiInterceptors: {
    response(data, { url }) {
        // 서버마다 다른 응답 구조를 통일
        // { code: 0, result: [...] } → { success: true, data: [...] }
        if (data.code !== undefined && data.result !== undefined) {
            return {
                success: data.code === 0,
                data: data.result,
                message: data.msg || ''
            };
        }
        return data;
    }
}
```

#### 전역 에러 처리 + 디버그 로깅

```javascript
apiInterceptors: {
    response(data, { url, method, status }) {
        // 개발 환경에서만 모든 응답 로깅
        if (location.hostname === 'localhost') {
            console.log(`[API] ${method} ${url} → ${status}`, data);
        }
        return data;
    },
    error(error, { url, method }) {
        // 전역 에러 UI 표시
        const toast = document.getElementById('error-toast');
        if (toast) {
            toast.textContent = `${method} ${url} 실패: ${error.message}`;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3000);
        }

        // 중요하지 않은 API의 에러는 무시
        const optionalAPIs = ['/analytics', '/tracking', '/notifications'];
        if (optionalAPIs.some(api => url.includes(api))) {
            return { data: [] };  // 빈 데이터로 대체
        }
    }
}
```

#### 컴포넌트에서의 동작

인터셉터는 `this.$api`의 모든 메서드에 자동 적용됩니다:

```javascript
// logic/users.js
export default {
    data() {
        return { users: [] };
    },
    async mounted() {
        // response interceptor가 자동으로 데이터를 변환/검증
        // error interceptor가 에러 발생 시 자동 처리
        const data = await this.$api.get('/users');
        this.users = data.items || [];
    },
    methods: {
        async deleteUser(id) {
            await this.$api.delete(`/users/${id}`);
            // 에러 발생 시 error interceptor에서 토스트 자동 표시
        }
    }
}
```

### 주의사항

- interceptor 함수 자체에서 에러가 발생해도 원래 요청 흐름에 영향을 주지 않습니다 (graceful degradation)
- response interceptor에서 `undefined`를 반환하면 원래 데이터가 유지됩니다
- error interceptor에서 값을 반환하면 에러가 **완전히 무시**됩니다 — 의도적으로만 사용하세요
- 두 interceptor 모두 `async` 함수를 지원합니다

## 다음 단계

- [API 참고](api.md) - 전체 API 문서
- [기본 사용법](basic-usage.md) - 기초부터 시작하기
