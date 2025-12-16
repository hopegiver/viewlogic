# ViewLogic 사용 매뉴얼

> 실전 중심의 ViewLogic Router 완벽 가이드

## 목차
1. [빠른 시작](#빠른-시작)
2. [라우팅 사용법](#라우팅-사용법)
3. [데이터 페칭](#데이터-페칭)
4. [폼 처리](#폼-처리)
5. [API 호출](#api-호출)
6. [인증 처리](#인증-처리)
7. [다국어 지원](#다국어-지원)
8. [컴포넌트 사용](#컴포넌트-사용)
9. [레이아웃 시스템](#레이아웃-시스템)
10. [고급 기능](#고급-기능)

---

## 빠른 시작

### 1. 설치

```bash
npm install viewlogic
```

### 2. 프로젝트 구조 생성

```
project/
├── index.html              # 진입점
├── css/                    # CSS 파일
│   └── base.css
├── i18n/                   # 다국어 파일 (선택)
│   ├── ko.json
│   ├── en.json
│   └── ja.json
└── src/
    ├── views/              # HTML 템플릿
    │   ├── home.html
    │   └── about.html
    ├── logic/              # JavaScript 로직
    │   ├── home.js
    │   └── about.js
    ├── components/         # 재사용 컴포넌트
    └── layouts/            # 레이아웃 템플릿
```

### 3. index.html 설정

```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My ViewLogic App</title>

    <!-- Bootstrap 5 CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
    <div id="app"></div>

    <!-- Bootstrap 5 JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

    <!-- Vue 3 -->
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>

    <!-- ViewLogic Router -->
    <script src="https://cdn.jsdelivr.net/npm/viewlogic@latest/dist/viewlogic-router.min.js"></script>
    <script>
        const router = new ViewLogicRouter({
            basePath: '/',
            srcPath: '/src',
            mode: 'hash'  // 'hash' 또는 'history'
        });
    </script>
</body>
</html>
```

### 4. 첫 페이지 만들기

**src/views/home.html**
```html
<div class="container mt-5">
    <div class="row">
        <div class="col-md-8 mx-auto">
            <h1 class="mb-4">{{ title }}</h1>
            <p class="lead">{{ message }}</p>
            <button class="btn btn-primary" @click="handleClick">
                클릭하세요
            </button>
        </div>
    </div>
</div>
```

**src/logic/home.js**
```javascript
export default {
    name: 'Home',
    data() {
        return {
            title: '홈페이지',
            message: '환영합니다!'
        }
    },
    methods: {
        handleClick() {
            alert('버튼 클릭됨!');
        }
    }
}
```

---

## 라우팅 사용법

### 기본 라우팅

파일 이름이 곧 라우트입니다:
- `home.html` + `home.js` → `/#/home`
- `about.html` + `about.js` → `/#/about`
- `users/profile.html` + `users/profile.js` → `/#/users/profile`

### 페이지 이동

```javascript
// HTML에서
<a href="#/about">About 페이지로</a>
<button @click="navigateTo('/users')">사용자 페이지</button>

// JavaScript에서
this.navigateTo('/about');           // 슬래시 포함 (권장)
this.navigateTo('about');            // 슬래시 없이도 가능

// 루트 페이지로 이동
this.navigateTo('/');                // home으로 이동

// 파라미터와 함께
this.navigateTo('/users', { id: 123, tab: 'profile' });
// 결과: /#/users?id=123&tab=profile (hash 모드)
// 결과: /users?id=123&tab=profile (history 모드)

// 하위 경로
this.navigateTo('/admin/dashboard');
this.navigateTo('/users/profile');
```

**중요:** `navigateTo()`는 모드(hash/history)에 관계없이 동일하게 사용합니다. 라우터가 자동으로 적절한 URL 형식으로 변환합니다.

### 파라미터 받기

URL: `/#/users?id=123&tab=profile`

**방법 1: data()에서 받기**
```javascript
export default {
    name: 'Users',
    data() {
        return {
            userId: this.getParam('id'),      // URL에서: 123
            tab: this.getParam('tab')         // URL에서: 'profile'
        }
    }
}
```

**방법 2: mounted()에서 받기**
```javascript
export default {
    name: 'Users',
    data() {
        return {
            userId: null,
            tab: null,
            allParams: {}
        }
    },
    mounted() {
        // 개별 파라미터 받기
        this.userId = this.getParam('id');
        this.tab = this.getParam('tab');

        // 모든 파라미터 한번에
        this.allParams = this.getParams();

        // 기본값 지정
        const userId = this.getParam('id', 0);      // id가 없으면 0
        const page = this.getParam('page', 1);      // page가 없으면 1
    }
}
```

**방법 3: 메서드에서 사용**
```javascript
export default {
    name: 'Users',
    methods: {
        async loadUser() {
            const userId = this.getParam('id');
            const response = await this.$api.get(`/api/users/${userId}`);
            this.user = response.data;
        },

        changeTab(tabName) {
            // 현재 파라미터 유지하면서 tab만 변경
            this.navigateTo('/users', {
                ...this.getParams(),
                tab: tabName
            });
        }
    }
}
```

### 중첩 라우트 (하위 폴더)

```
src/
├── views/
│   └── admin/
│       ├── dashboard.html
│       └── users.html
├── logic/
│   └── admin/
│       ├── dashboard.js
│       └── users.js
```

접근: `/#/admin/dashboard`, `/#/admin/users`

---

## 데이터 페칭

### 자동 데이터 로딩 (dataURL)

가장 간단한 방법:

```javascript
export default {
    name: 'Users',
    dataURL: '/api/users',  // GET 요청 자동 실행
    data() {
        return {
            users: []  // API 응답으로 자동 채워짐
        }
    },
    mounted() {
        // this.users에 이미 데이터가 있음
        console.log(this.users);
    }
}
```

### 파라미터와 함께

```javascript
export default {
    name: 'UserDetail',
    dataURL: {
        url: '/api/users/{id}',  // {id}는 자동 치환
        method: 'GET'
    },
    data() {
        return {
            user: null
        }
    }
}
// 접근: /#/user-detail?id=123
// 실제 호출: GET /api/users/123
```

### 수동 API 호출

```javascript
export default {
    name: 'Products',
    data() {
        return {
            products: [],
            loading: false
        }
    },
    async mounted() {
        await this.loadProducts();
    },
    methods: {
        async loadProducts() {
            this.loading = true;
            try {
                const response = await this.$api.get('/api/products');
                this.products = response.data;
            } catch (error) {
                console.error('로딩 실패:', error);
            } finally {
                this.loading = false;
            }
        },

        async searchProducts(keyword) {
            const response = await this.$api.get('/api/products/search', {
                params: { q: keyword }
            });
            this.products = response.data;
        }
    }
}
```

---

## 폼 처리

### 기본 폼 제출

```html
<form @submit.prevent="handleSubmit">
    <input v-model="username" placeholder="사용자명">
    <input v-model="email" type="email" placeholder="이메일">
    <button type="submit">가입하기</button>
</form>
```

```javascript
export default {
    name: 'Signup',
    data() {
        return {
            username: '',
            email: ''
        }
    },
    methods: {
        async handleSubmit() {
            const response = await this.$api.post('/api/signup', {
                username: this.username,
                email: this.email
            });

            if (response.success) {
                this.navigateTo('/login');
            }
        }
    }
}
```

### 선언적 폼 (자동 처리)

ViewLogic의 강력한 폼 처리:

```html
<form
    action="/api/users/{userId}"
    method="PUT"
    data-success="handleSuccess"
    data-error="handleError"
    data-redirect="users">

    <input name="name" v-model="form.name">
    <input name="email" v-model="form.email">
    <button type="submit">수정</button>
</form>
```

```javascript
export default {
    name: 'UserEdit',
    data() {
        return {
            userId: this.getParam('id'),
            form: {
                name: '',
                email: ''
            }
        }
    },
    methods: {
        handleSuccess(response) {
            alert('저장되었습니다!');
            // data-redirect로 자동 이동
        },
        handleError(error) {
            alert('오류 발생: ' + error.message);
        }
    }
}
```

**폼 속성:**
- `action` - API 엔드포인트 (파라미터 치환 지원: `{userId}`)
- `method` - HTTP 메서드 (POST, PUT, DELETE 등)
- `data-success` - 성공 시 호출할 메서드명
- `data-error` - 실패 시 호출할 메서드명
- `data-loading` - 로딩 중 호출할 메서드명
- `data-redirect` - 성공 후 이동할 라우트

---

## API 호출

### $api 메서드

```javascript
// GET 요청
const users = await this.$api.get('/api/users');
const user = await this.$api.get('/api/users/123');
const filtered = await this.$api.get('/api/users', {
    params: { role: 'admin', active: true }
});

// POST 요청
const created = await this.$api.post('/api/users', {
    name: 'John',
    email: 'john@example.com'
});

// PUT 요청 (수정)
const updated = await this.$api.put('/api/users/123', {
    name: 'John Doe'
});

// PATCH 요청 (부분 수정)
const patched = await this.$api.patch('/api/users/123', {
    email: 'newemail@example.com'
});

// DELETE 요청
const deleted = await this.$api.delete('/api/users/123');

// 커스텀 헤더
const response = await this.$api.get('/api/data', {
    headers: {
        'X-Custom-Header': 'value'
    }
});
```

### 에러 처리

```javascript
methods: {
    async fetchData() {
        try {
            const response = await this.$api.get('/api/data');
            this.data = response.data;
        } catch (error) {
            if (error.response) {
                // 서버 응답 있음 (4xx, 5xx)
                console.error('상태 코드:', error.response.status);
                console.error('에러 메시지:', error.response.data);
            } else if (error.request) {
                // 요청은 갔으나 응답 없음
                console.error('서버 응답 없음');
            } else {
                // 요청 설정 중 오류
                console.error('요청 오류:', error.message);
            }
        }
    }
}
```

---

## 인증 처리

### 설정

```javascript
const router = new ViewLogicRouter({
    authEnabled: true,
    loginRoute: 'login',
    protectedRoutes: ['profile', 'admin/*'],  // 보호할 라우트
    authStorage: 'localStorage'  // 'cookie', 'sessionStorage', 'memory'
});
```

### 로그인 구현

```javascript
// src/logic/login.js
export default {
    name: 'Login',
    data() {
        return {
            username: '',
            password: '',
            error: ''
        }
    },
    methods: {
        async handleLogin() {
            try {
                const response = await this.$api.post('/api/login', {
                    username: this.username,
                    password: this.password
                });

                // 토큰 저장
                this.setToken(response.token);

                // 원래 가려던 페이지로 이동
                const redirect = this.getParam('redirect', 'home');
                this.navigateTo(`/${redirect}`);
            } catch (error) {
                this.error = '로그인 실패';
            }
        }
    }
}
```

### 로그아웃

```javascript
methods: {
    handleLogout() {
        this.logout();  // 자동으로 login 페이지로 이동
    }
}
```

### 인증 상태 확인

```javascript
export default {
    name: 'Profile',
    data() {
        return {
            token: null,
            isLoggedIn: false
        }
    },
    mounted() {
        // 로그인 여부 확인
        this.isLoggedIn = this.isAuth();      // 간단한 방법 (권장)

        // 토큰 가져오기
        this.token = this.getToken();

        if (this.isLoggedIn) {
            // 토큰이 있으면 사용자 정보 로드
            this.loadUserProfile();
        }
    },
    methods: {
        async loadUserProfile() {
            const response = await this.$api.get('/api/user/profile');
            this.user = response.data;
        }
    }
}
```

### 자동 토큰 주입

인증이 활성화되면 모든 API 요청에 자동으로 토큰이 포함됩니다:

```javascript
// Authorization 헤더 자동 추가
const response = await this.$api.get('/api/protected-data');
// 요청 헤더: Authorization: Bearer YOUR_TOKEN
```

---

## 다국어 지원

### 설정

```javascript
const router = new ViewLogicRouter({
    useI18n: true,
    defaultLanguage: 'ko'
});
```

### 메시지 파일 구조

```
project/
└── i18n/              # 프로젝트 루트에 위치
    ├── ko.json
    ├── en.json
    └── ja.json
```

**i18n/ko.json**
```json
{
    "welcome": "환영합니다",
    "hello": "안녕하세요, {name}님",
    "product": {
        "title": "제품",
        "description": "설명"
    }
}
```

**i18n/en.json**
```json
{
    "welcome": "Welcome",
    "hello": "Hello, {name}",
    "product": {
        "title": "Product",
        "description": "Description"
    }
}
```

### 사용법

```html
<div>
    <h1>{{ $t('welcome') }}</h1>
    <p>{{ $t('hello', { name: userName }) }}</p>
    <p>{{ $t('product.title') }}</p>
</div>
```

```javascript
export default {
    name: 'Home',
    data() {
        return {
            userName: 'John',
            currentLang: this.$lang  // 현재 언어
        }
    },
    methods: {
        changeLanguage(lang) {
            this.$i18n.setLanguage(lang);
        },

        getMessage() {
            // JavaScript에서 직접 사용
            const msg = this.$t('welcome');
            console.log(msg);
        }
    }
}
```

### 언어 전환 컴포넌트

```html
<div class="language-switcher">
    <button @click="$i18n.setLanguage('ko')"
            :class="{ active: $lang === 'ko' }">
        한국어
    </button>
    <button @click="$i18n.setLanguage('en')"
            :class="{ active: $lang === 'en' }">
        English
    </button>
    <button @click="$i18n.setLanguage('ja')"
            :class="{ active: $lang === 'ja' }">
        日本語
    </button>
</div>
```

---

## 컴포넌트 사용

### 컴포넌트 생성

**src/components/Button.js**
```javascript
export default {
    name: 'Button',
    props: {
        text: String,
        type: {
            type: String,
            default: 'primary'
        },
        disabled: Boolean
    },
    template: `
        <button
            :class="['btn', 'btn-' + type]"
            :disabled="disabled"
            @click="$emit('click', $event)">
            {{ text }}
        </button>
    `
}
```

### 페이지에서 사용

```javascript
// src/logic/home.js
export default {
    name: 'Home',
    components: ['Button'],  // 컴포넌트 이름만 명시
    data() {
        return {
            count: 0
        }
    },
    methods: {
        handleClick() {
            this.count++;
        }
    }
}
```

```html
<!-- src/views/home.html -->
<div>
    <h1>카운터: {{ count }}</h1>
    <Button
        text="증가"
        type="primary"
        @click="handleClick" />
</div>
```

### 다중 컴포넌트

```javascript
export default {
    name: 'Dashboard',
    components: ['Button', 'Card', 'Modal'],
    // ...
}
```

---

## 레이아웃 시스템

### 레이아웃 생성

**src/layouts/default.html**
```html
<div class="layout-default">
    <header>
        <nav>
            <a href="#/home">홈</a>
            <a href="#/about">소개</a>
            <a href="#/contact">연락</a>
        </nav>
    </header>

    <main>
        <slot></slot>  <!-- 페이지 컨텐츠가 여기에 -->
    </main>

    <footer>
        <p>&copy; 2024 My App</p>
    </footer>
</div>
```

**src/layouts/admin.html**
```html
<div class="layout-admin">
    <aside class="sidebar">
        <a href="#/admin/dashboard">대시보드</a>
        <a href="#/admin/users">사용자 관리</a>
    </aside>

    <main class="admin-content">
        <slot></slot>
    </main>
</div>
```

### 레이아웃 사용

```javascript
// src/logic/home.js
export default {
    name: 'Home',
    layout: 'default',  // layouts/default.html 사용
    // ...
}
```

```javascript
// src/logic/admin/dashboard.js
export default {
    name: 'AdminDashboard',
    layout: 'admin',  // layouts/admin.html 사용
    // ...
}
```

### 레이아웃 없이 사용

```javascript
export default {
    name: 'Login',
    layout: null,  // 레이아웃 사용 안 함
    // ...
}
```

---

## 고급 기능

### 1. 라이프사이클 훅

```javascript
export default {
    name: 'MyPage',

    // 데이터 로딩 전 (가장 먼저)
    async beforeMount() {
        console.log('컴포넌트 마운트 전');
    },

    // DOM 마운트 후
    async mounted() {
        console.log('컴포넌트 마운트 완료');
        await this.fetchData();
    },

    // 컴포넌트 업데이트 후
    updated() {
        console.log('데이터 변경됨');
    },

    // 컴포넌트 제거 전
    beforeUnmount() {
        console.log('정리 작업 수행');
    }
}
```

### 2. Computed 속성

```javascript
export default {
    name: 'Cart',
    data() {
        return {
            items: [
                { name: '상품1', price: 10000, qty: 2 },
                { name: '상품2', price: 20000, qty: 1 }
            ]
        }
    },
    computed: {
        totalPrice() {
            return this.items.reduce((sum, item) => {
                return sum + (item.price * item.qty);
            }, 0);
        },

        itemCount() {
            return this.items.length;
        }
    }
}
```

```html
<div>
    <p>총 {{ itemCount }}개 상품</p>
    <p>합계: {{ totalPrice.toLocaleString() }}원</p>
</div>
```

### 3. Watch (데이터 감시)

```javascript
export default {
    name: 'Search',
    data() {
        return {
            keyword: '',
            results: []
        }
    },
    watch: {
        keyword(newValue, oldValue) {
            console.log(`검색어 변경: ${oldValue} -> ${newValue}`);
            this.search();
        }
    },
    methods: {
        async search() {
            if (!this.keyword) {
                this.results = [];
                return;
            }
            const response = await this.$api.get('/api/search', {
                params: { q: this.keyword }
            });
            this.results = response.data;
        }
    }
}
```

### 4. 캐싱 제어

```javascript
const router = new ViewLogicRouter({
    cacheMode: 'memory',  // 'memory', 'sessionStorage', 'localStorage', 'none'
    cacheTTL: 300000,     // 5분 (밀리초)
    maxCacheSize: 50      // 최대 캐시 항목 수
});
```

```javascript
// 수동 캐시 제어
export default {
    name: 'MyPage',
    methods: {
        clearCache() {
            this.$cache.clear();  // 전체 캐시 삭제
        },

        clearSpecific() {
            this.$cache.delete('users');  // 특정 키 삭제
        }
    }
}
```

### 5. 에러 처리

**404 페이지**

```javascript
// src/logic/404.js
export default {
    name: 'NotFound',
    layout: null,
    data() {
        return {
            message: '페이지를 찾을 수 없습니다'
        }
    }
}
```

**전역 에러 핸들러**

```javascript
export default {
    name: 'MyPage',
    mounted() {
        // 라우트 에러 리스너
        window.addEventListener('route-error', (event) => {
            console.error('라우트 에러:', event.detail);
        });
    }
}
```

### 6. 스크롤 제어

페이지 이동 시 자동으로 스크롤이 맨 위로 이동합니다.

수동 제어:
```javascript
methods: {
    scrollToTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    scrollToElement() {
        const element = document.getElementById('section');
        element.scrollIntoView({ behavior: 'smooth' });
    }
}
```

### 7. 프로그레스 바

0.3초 이상 로딩 시 자동으로 상단에 프로그레스 바가 표시됩니다.

색상 커스터마이즈:
```css
#viewlogic-progress-bar {
    background-color: #your-color !important;
    height: 3px !important;
}
```

### 8. 상태 관리 (전역 상태)

```javascript
export default {
    name: 'Header',
    data() {
        return {
            user: null
        }
    },
    mounted() {
        // 전역 상태 가져오기
        this.user = this.$state.get('user');

        // 전역 상태 설정
        this.$state.set('user', { name: 'John', role: 'admin' });

        // 상태 변경 감지
        this.$state.watch('user', (newUser) => {
            console.log('사용자 변경:', newUser);
            this.user = newUser;
        });
    }
}
```

### 9. 히스토리 모드 설정

```javascript
const router = new ViewLogicRouter({
    mode: 'history',  // URL에서 # 제거
    basePath: '/'
});
```

서버 설정 필요 (모든 요청을 index.html로):

**Nginx**
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

**Apache (.htaccess)**
```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
</IfModule>
```

---

## 전체 설정 옵션

```javascript
const router = new ViewLogicRouter({
    // 기본 설정
    basePath: '/',                    // 앱 기본 경로
    srcPath: '/src',                  // 소스 파일 경로
    mode: 'hash',                     // 'hash' 또는 'history'
    environment: 'development',       // 'development' 또는 'production'

    // 캐싱
    cacheMode: 'memory',              // 'memory', 'sessionStorage', 'localStorage', 'none'
    cacheTTL: 300000,                 // 캐시 유지 시간 (밀리초)
    maxCacheSize: 50,                 // 최대 캐시 항목 수

    // 레이아웃
    useLayout: true,                  // 레이아웃 사용 여부
    defaultLayout: 'default',         // 기본 레이아웃

    // 인증
    authEnabled: false,               // 인증 활성화
    loginRoute: 'login',              // 로그인 라우트
    protectedRoutes: [],              // 보호할 라우트 목록
    authStorage: 'localStorage',      // 토큰 저장소

    // 다국어
    useI18n: false,                   // 다국어 활성화
    defaultLanguage: 'ko',            // 기본 언어

    // 로깅
    logLevel: 'info'                  // 'debug', 'info', 'warn', 'error'
});
```

---

## 디버깅 팁

### 1. 개발 모드 로깅

```javascript
const router = new ViewLogicRouter({
    environment: 'development',
    logLevel: 'debug'  // 모든 로그 출력
});
```

### 2. Vue Devtools 사용

브라우저에 Vue Devtools 확장 설치 후 컴포넌트 상태 확인

### 3. 라우트 정보 확인

```javascript
mounted() {
    console.log('현재 라우트:', this.getCurrentRoute());
    console.log('모든 파라미터:', this.getParams());
    console.log('특정 파라미터:', this.getParam('id'));
}
```

### 4. API 요청 디버깅

```javascript
methods: {
    async fetchData() {
        try {
            console.log('요청 시작...');
            const response = await this.$api.get('/api/data');
            console.log('응답:', response);
        } catch (error) {
            console.error('에러 상세:', {
                message: error.message,
                response: error.response,
                request: error.request
            });
        }
    }
}
```

---

## 프로덕션 배포

### 1. 빌드 (선택 사항)

ViewLogic은 빌드 없이 사용 가능하지만, 최적화를 원한다면:

```bash
npm run build
```

### 2. 환경 변수 설정

```javascript
const router = new ViewLogicRouter({
    environment: 'production',
    logLevel: 'error',  // 에러만 로깅
    cacheMode: 'memory',
    cacheTTL: 600000    // 10분
});
```

### 3. CDN 사용

```html
<!-- ViewLogic Router -->
<script src="https://cdn.jsdelivr.net/npm/viewlogic@latest/dist/viewlogic-router.min.js"></script>
<script>
    const router = new ViewLogicRouter({
        basePath: '/',
        srcPath: '/src',
        environment: 'production'
    });
</script>
```

---

## 자주 묻는 질문 (FAQ)

### Q1. 페이지가 로드되지 않아요
- `index.html`에 `<div id="app"></div>`가 있는지 확인
- 브라우저 콘솔에서 에러 메시지 확인
- 파일 경로가 올바른지 확인 (대소문자 구분)

### Q2. API 호출이 안 돼요
- 네트워크 탭에서 요청 확인
- CORS 설정 확인 (개발 서버 설정)
- API URL이 올바른지 확인

### Q3. 컴포넌트가 작동하지 않아요
- `components` 배열에 컴포넌트 이름 추가했는지 확인
- 컴포넌트 파일이 `src/components/` 폴더에 있는지 확인
- 컴포넌트 이름과 파일 이름이 일치하는지 확인

### Q4. 인증 토큰이 전달되지 않아요
- `authEnabled: true` 설정 확인
- `this.$auth.login(token)` 호출 확인
- 브라우저 개발자 도구에서 localStorage/cookie 확인

### Q5. 다국어가 적용되지 않아요
- `useI18n: true` 설정 확인
- `i18n/` 폴더에 언어 파일 있는지 확인 (프로젝트 루트)
- JSON 파일 형식이 올바른지 확인

---

## 추가 리소스

- **GitHub**: https://github.com/hopegiver/viewlogic
- **npm**: https://www.npmjs.com/package/viewlogic
- **이슈 리포트**: https://github.com/hopegiver/viewlogic/issues

---

## 라이선스

MIT License - 자유롭게 사용하세요!
