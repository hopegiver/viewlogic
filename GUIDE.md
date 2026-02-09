# ViewLogic 사용 매뉴얼

> 실전 중심의 ViewLogic Router 완벽 가이드

## 목차
1. [빠른 시작](#빠른-시작)
2. [핵심 개념](#핵심-개념)
3. [라우팅 사용법](#라우팅-사용법)
4. [데이터 관리](#데이터-관리)
5. [폼 처리](#폼-처리)
6. [인증 처리](#인증-처리)
7. [다국어 지원](#다국어-지원)
8. [컴포넌트 사용](#컴포넌트-사용)
9. [레이아웃 시스템](#레이아웃-시스템)
10. [고급 기능](#고급-기능)
11. [프로덕션 배포](#프로덕션-배포)
12. [디버깅 팁](#디버깅-팁)
13. [자주 묻는 질문](#자주-묻는-질문-faq)
14. [부록](#부록)

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
    │   ├── home.html       # 루트(/) 및 /home 라우트
    │   ├── about.html
    │   └── layout/         # 레이아웃 템플릿
    │       └── default.html
    ├── logic/              # JavaScript 로직
    │   ├── home.js
    │   ├── about.js
    │   └── layout/         # 레이아웃 로직
    │       └── default.js
    └── components/         # 재사용 컴포넌트
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

## 핵심 개념

### 파일 기반 라우팅

ViewLogic은 파일 이름과 구조가 곧 라우트입니다:

```
src/views/home.html + src/logic/home.js → /#/home (또는 /)
src/views/about.html + src/logic/about.js → /#/about
src/views/users/profile.html + src/logic/users/profile.js → /#/users/profile
```

### View-Logic 분리

- **View (HTML)**: 템플릿만 담당 (`src/views/`)
- **Logic (JS)**: 데이터와 로직만 담당 (`src/logic/`)
- **레이아웃**: 공통 구조와 로직 (`src/views/layout/`, `src/logic/layout/`)

### 데이터 로딩 방식 선택 가이드

<!-- DECISION_GUIDE: 데이터 로딩 방법 선택 -->

```
데이터를 어떻게 로드해야 할까?

┌─ 페이지 로드 시 자동으로 단순 GET 요청이 필요한가?
│  └─ YES → dataURL 사용 (자동 로딩)
│
├─ 조건부로 데이터를 로드해야 하는가?
│  └─ YES → $api 수동 호출
│
├─ 복잡한 에러 처리나 로딩 상태 제어가 필요한가?
│  └─ YES → $api 수동 호출
│
├─ 사용자 액션(버튼 클릭 등)에 따라 데이터를 로드하는가?
│  └─ YES → $api 수동 호출
│
└─ POST, PUT, DELETE 등 다양한 HTTP 메서드를 사용하는가?
   └─ YES → $api 수동 호출
```

**비교 표:**

| 기능 | dataURL (자동) | $api (수동) |
|------|----------------|-------------|
| 자동 로딩 | ✅ mounted 전에 자동 실행 | ❌ 직접 호출 필요 |
| HTTP 메서드 | GET만 가능 | GET, POST, PUT, DELETE 등 모두 가능 |
| 에러 처리 | 자동 (기본 처리) | ✅ 세밀한 제어 가능 |
| 로딩 상태 | 자동 ($dataLoading) | ✅ 직접 제어 |
| 조건부 로드 | ❌ 불가능 | ✅ 가능 |
| 파라미터 치환 | ✅ {id} 형식 지원 | 수동으로 처리 |
| 사용 난이도 | 쉬움 | 중간 |
| 권장 사용처 | 단순 목록 조회, 상세 조회 | 검색, 필터링, CUD 작업, 복잡한 로직 |

### 폼 처리 방식 선택 가이드

<!-- DECISION_GUIDE: 폼 처리 방법 선택 -->

```
폼을 어떻게 처리해야 할까?

┌─ 단순한 CRUD 폼인가? (생성, 수정, 삭제)
│  └─ YES → 선언적 폼 (action, method 속성) 사용
│
├─ 복잡한 유효성 검증이 필요한가?
│  └─ YES → 전통적 폼 (@submit.prevent + 메서드)
│
├─ 제출 전 여러 단계 처리가 필요한가?
│  └─ YES → 전통적 폼
│
└─ 파일 업로드가 포함되는가?
   └─ YES → 전통적 폼 (FormData 사용)
```

**비교 표:**

| 기능 | 선언적 폼 (권장) | 전통적 폼 |
|------|------------------|----------|
| 코드량 | ✅ 적음 | 많음 |
| 파라미터 치환 | ✅ {userId} 자동 치환 | 수동 처리 |
| 성공 후 리다이렉트 | ✅ data-redirect 속성 | 수동 처리 |
| 에러 처리 | 콜백 함수 지정 | try-catch 직접 작성 |
| 유효성 검증 | 제한적 | ✅ 세밀한 제어 |
| 권장 사용처 | 일반적인 CRUD | 복잡한 폼, 다단계 처리 |

---

## 라우팅 사용법

### 기본 라우팅

파일 이름이 곧 라우트입니다:
- `home.html` + `home.js` → `/#/home` (또는 루트 `/#/`)
- `about.html` + `about.js` → `/#/about`
- `users/profile.html` + `users/profile.js` → `/#/users/profile`

**기본 라우트 변경:**
```javascript
const router = new ViewLogicRouter({
    defaultRoute: 'dashboard'  // /#/ 접근 시 dashboard로 이동
});
```
이렇게 설정하면 `/#/` 또는 `/` 접근 시 `home` 대신 `dashboard` 페이지가 로드됩니다.

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

<!-- USE_CASE: URL 파라미터 받기 -->
<!-- API: getParam(), getParams() -->

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

## 데이터 관리

<!-- CONCEPT: 데이터 로딩 및 API 호출 -->

ViewLogic은 두 가지 데이터 로딩 방식을 제공합니다. 상황에 맞게 선택하세요.

### 방법 1: 자동 데이터 로딩 (dataURL) ⭐ 권장 (단순 GET)

<!-- USE_CASE: 페이지 로드 시 자동 데이터 로딩 -->

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

#### 파라미터와 함께

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

### 방법 2: 수동 API 호출 ($api) ⭐ 권장 (복잡한 로직)

<!-- USE_CASE: 조건부 데이터 로딩, 에러 처리, 다양한 HTTP 메서드 -->
<!-- API: $api.get(), $api.post(), $api.put(), $api.delete() -->

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

### $api 메서드 전체 목록

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

### 에러 처리 패턴

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

## 폼 처리

### 방법 1: 선언적 폼 (자동 처리) ⭐ 권장

<!-- USE_CASE: 단순 CRUD 폼, 파라미터 치환 필요 -->

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

### 방법 2: 전통적 폼 처리

<!-- USE_CASE: 복잡한 유효성 검증, 다단계 처리 -->

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

---

## 인증 처리

<!-- CONCEPT: 인증 및 토큰 관리 -->

### 설정

```javascript
const router = new ViewLogicRouter({
    authEnabled: true,
    loginRoute: 'login',
    protectedRoutes: ['profile', 'admin/*'],  // 보호할 라우트
    authStorage: 'localStorage'  // 'cookie', 'sessionStorage', 'memory'
});
```

**authStorage 옵션:**
- `localStorage`: 브라우저를 닫아도 유지 (기본값, 권장)
- `sessionStorage`: 탭을 닫으면 삭제
- `cookie`: 쿠키로 저장 (서버와 공유 가능)
- `memory`: 페이지 새로고침 시 삭제

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

<!-- CONCEPT: Internationalization (i18n) -->

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

<!-- CONCEPT: 재사용 가능한 Vue 컴포넌트 -->

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

ViewLogic은 **템플릿 기반 자동 컴포넌트 발견**을 사용합니다. 템플릿에서 사용된 컴포넌트를 자동으로 찾아 로드합니다.

**src/views/home.html**
```html
<div>
    <h1>카운터: {{ count }}</h1>
    <!-- Button 컴포넌트 사용 - 자동으로 로드됨 -->
    <Button
        text="증가"
        type="primary"
        @click="handleClick" />
</div>
```

**src/logic/home.js**
```javascript
export default {
    name: 'Home',
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

**작동 방식:**
1. 템플릿에서 `<Button>` 태그 발견
2. `src/components/Button.js` 자동 로드
3. 컴포넌트로 등록 및 사용

### 다중 컴포넌트

```html
<!-- src/views/dashboard.html -->
<div>
    <Button text="클릭" />
    <Card title="제목" />
    <Modal :show="showModal" />
</div>
```

템플릿에 사용된 `Button`, `Card`, `Modal` 모두 자동으로 로드됩니다.

---

## 레이아웃 시스템

<!-- CONCEPT: 공통 레이아웃과 페이지별 컨텐츠 분리 -->

### 레이아웃 템플릿 생성

**src/views/layout/default.html**
```html
<div class="layout-default">
    <header>
        <nav>
            <a href="#/home">홈</a>
            <a href="#/about">소개</a>
            <div v-if="layoutData.user">
                <span>{{ layoutData.user.name }}</span>
                <button @click="handleLogout">로그아웃</button>
            </div>
        </nav>
    </header>

    <main>
        {{ content }}  <!-- 페이지 컨텐츠가 여기에 -->
    </main>

    <footer>
        <p>&copy; {{ layoutData.currentYear }} My App</p>
    </footer>
</div>
```

### 레이아웃 로직 생성 (선택)

**src/logic/layout/default.js**
```javascript
export default {
    data() {
        return {
            layoutData: {  // ⭐ 중요: layoutData 네임스페이스 사용
                user: null,
                currentYear: new Date().getFullYear()
            }
        }
    },
    async mounted() {
        // 레이아웃에서 공통으로 실행할 로직
        console.log('Layout mounted!');

        if (this.isAuth()) {
            const response = await this.$api.get('/api/user');
            this.layoutData.user = response.data;
            this.$state.set('user', response.data);
        }
    },
    methods: {
        async handleLogout() {
            await this.$api.post('/api/logout');
            this.logout();
        }
    }
}
```

### 페이지에서 사용

```javascript
// src/logic/home.js
export default {
    name: 'Home',
    layout: 'default',  // views/layout/default.html 사용
    data() {
        return {
            posts: []
        }
    },
    async mounted() {
        // 페이지 로직
        console.log('Page mounted!');
        console.log('User from layout:', this.layoutData.user);  // 레이아웃 데이터 접근

        await this.loadPosts();
    },
    methods: {
        async loadPosts() {
            const response = await this.$api.get('/api/posts');
            this.posts = response.data;
        }
    }
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

### 레이아웃 스크립트 병합 동작

<!-- CONCEPT: 레이아웃과 페이지 스크립트 병합 규칙 -->

레이아웃 로직(layout/default.js)과 페이지 로직(home.js)이 자동으로 병합됩니다:

| 속성 | 병합 동작 | 설명 | 권장사항 |
|------|----------|------|----------|
| `data` | ⚠️ 페이지 우선, 레이아웃도 보존 | 둘 다 호출되지만 같은 키는 페이지가 덮어씀 | **레이아웃은 `layoutData` 네임스페이스 권장** |
| `methods` | ✅ 병합됨, 페이지 우선 | 같은 이름이면 페이지 메서드가 우선 | 자유롭게 사용 |
| `computed` | ✅ 병합됨, 페이지 우선 | 같은 이름이면 페이지 computed가 우선 | 자유롭게 사용 |
| `watch` | ✅ 병합됨, 페이지 우선 | 같은 이름이면 페이지 watch가 우선 | 자유롭게 사용 |
| `mounted` | ✅ 순차 실행 | 레이아웃 mounted → 페이지 mounted | 레이아웃과 페이지 모두 사용 가능 |
| `beforeMount` | ✅ 순차 실행 | 레이아웃 → 페이지 순서 | 레이아웃과 페이지 모두 사용 가능 |
| `beforeUnmount` | ✅ 순차 실행 | 레이아웃 → 페이지 순서 | 레이아웃과 페이지 모두 사용 가능 |
| `name` | ⚠️ 페이지 우선 | 컴포넌트 이름은 페이지 것 사용 | 페이지에서만 정의 |
| `components` | ✅ 병합됨 | 레이아웃과 페이지 컴포넌트 모두 사용 가능 | 자유롭게 사용 |

**권장 패턴:**
```javascript
// ✅ 좋은 예 - 레이아웃 data는 layoutData 네임스페이스 사용
// src/logic/layout/default.js
export default {
    data() {
        return {
            layoutData: {  // ✅ layoutData로 감싸기 (Vue 3에서 $ 접두사 사용 불가)
                user: null,
                settings: {},
                currentYear: 2025
            }
        }
    },
    methods: {
        commonMethod() { }  // ✅ methods는 자유롭게
    }
}

// ❌ 나쁜 예 - 직접 속성 사용
export default {
    data() {
        return {
            user: null  // ❌ 페이지 data의 user와 충돌 가능
        }
    }
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

**캐시 모드 비교:**

| 모드 | 유지 범위 | 사용 사례 |
|------|----------|----------|
| `memory` | 페이지 새로고침 전까지 | 개발 환경, 빠른 성능 (권장) |
| `sessionStorage` | 탭을 닫기 전까지 | 세션 기반 데이터 |
| `localStorage` | 브라우저를 닫아도 유지 | 장기 캐시, 오프라인 지원 |
| `none` | 캐시 안 함 | 항상 최신 데이터 필요 시 |

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

### 8. 전역 상태 관리

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
- 컴포넌트 파일이 `src/components/` 폴더에 있는지 확인
- 컴포넌트 이름과 파일 이름이 일치하는지 확인 (예: `<Button>` → `Button.js`)
- 템플릿에서 PascalCase로 사용했는지 확인 (예: `<Button>`, `<MyCard>`)

### Q4. 인증 토큰이 전달되지 않아요
- `authEnabled: true` 설정 확인
- `this.setToken(token)` 호출 확인
- 브라우저 개발자 도구에서 localStorage/cookie 확인

### Q5. 다국어가 적용되지 않아요
- `useI18n: true` 설정 확인
- `i18n/` 폴더에 언어 파일 있는지 확인 (프로젝트 루트)
- JSON 파일 형식이 올바른지 확인

### Q6. 레이아웃 데이터가 페이지에서 보이지 않아요
- 레이아웃 로직에서 `layoutData` 네임스페이스를 사용했는지 확인
- 템플릿에서 `{{ layoutData.user }}` 형식으로 접근했는지 확인
- 페이지 로직에서 `layout: 'default'` 속성을 설정했는지 확인

---

## 부록

### A. 라우트 스크립트 API 레퍼런스

<!-- API_REFERENCE: 모든 라우트 스크립트에서 사용 가능한 메서드 -->

모든 라우트 스크립트(페이지/레이아웃)에서 사용 가능한 메서드들:

#### 라우팅

| 메서드 | 설명 | 예제 |
|--------|------|------|
| `navigateTo(route, params?)` | 페이지 이동 | `this.navigateTo('/users', { id: 123 })` |
| `getCurrentRoute()` | 현재 라우트 이름 반환 | `const route = this.getCurrentRoute()` |

#### 파라미터 관리

| 메서드 | 설명 | 예제 |
|--------|------|------|
| `getParams()` | 모든 파라미터 객체 반환 | `const params = this.getParams()` |
| `getParam(key, defaultValue?)` | 특정 파라미터 가져오기 | `const id = this.getParam('id', 0)` |

#### 인증

| 메서드 | 설명 | 예제 |
|--------|------|------|
| `isAuth()` | 로그인 여부 확인 | `if (this.isAuth()) { }` |
| `getToken()` | 토큰 가져오기 | `const token = this.getToken()` |
| `setToken(token, options?)` | 토큰 설정 | `this.setToken('new-token')` |
| `logout()` | 로그아웃 (자동 리다이렉트) | `this.logout()` |

#### API 호출

| 메서드 | 설명 | 예제 |
|--------|------|------|
| `$api.get(url, config?)` | GET 요청 | `await this.$api.get('/api/users')` |
| `$api.post(url, data?, config?)` | POST 요청 | `await this.$api.post('/api/users', data)` |
| `$api.put(url, data?, config?)` | PUT 요청 | `await this.$api.put('/api/users/1', data)` |
| `$api.patch(url, data?, config?)` | PATCH 요청 | `await this.$api.patch('/api/users/1', data)` |
| `$api.delete(url, config?)` | DELETE 요청 | `await this.$api.delete('/api/users/1')` |

#### 다국어 (i18n)

| 메서드/속성 | 설명 | 예제 |
|-------------|------|------|
| `$t(key, params?)` | 번역 | `this.$t('welcome')` |
| `$lang` | 현재 언어 코드 | `const lang = this.$lang` |
| `$i18n.setLanguage(lang)` | 언어 변경 | `this.$i18n.setLanguage('en')` |

#### 전역 상태 관리

| 메서드 | 설명 | 예제 |
|--------|------|------|
| `$state.set(key, value)` | 상태 저장 | `this.$state.set('user', user)` |
| `$state.get(key, defaultValue?)` | 상태 가져오기 | `const user = this.$state.get('user')` |
| `$state.watch(key, callback)` | 상태 감시 | `this.$state.watch('user', (val) => {})` |
| `$state.clear(key)` | 상태 삭제 | `this.$state.clear('user')` |

#### 캐시 제어

| 메서드 | 설명 | 예제 |
|--------|------|------|
| `$cache.clear()` | 전체 캐시 삭제 | `this.$cache.clear()` |
| `$cache.delete(key)` | 특정 캐시 삭제 | `this.$cache.delete('users')` |

#### 로깅

| 메서드 | 설명 | 예제 |
|--------|------|------|
| `log(level, ...args)` | 로그 출력 | `this.log('info', 'Message')` |

---

### B. 전역 $router 객체

`window.$router` 또는 HTML에서 직접 사용 가능:

#### HTML 템플릿에서
```html
<!-- 페이지 이동 -->
<button @click="$router.navigateTo('/about')">About</button>

<!-- 현재 라우트 확인 -->
<div v-if="$router.currentRoute === 'home'">
    홈 페이지입니다
</div>

<!-- 인증 상태 -->
<div v-if="$router.authManager?.isAuthenticated()">
    로그인됨
</div>
```

#### JavaScript에서
```javascript
// 전역 접근
window.$router.navigateTo('/about')

// 라우터 정보
console.log(window.$router.config)
console.log(window.$router.currentRoute)

// 매니저 접근
window.$router.authManager.isAuthenticated()
window.$router.i18nManager.setLanguage('en')
window.$router.stateHandler.set('key', 'value')
```

**참고:** 라우트 스크립트 내부에서는 `this.navigateTo()` 등을 사용하는 것이 더 간편합니다.

---

### C. 전체 설정 옵션

```javascript
const router = new ViewLogicRouter({
    // 기본 설정
    basePath: '/',                    // 앱 기본 경로
    srcPath: '/src',                  // 소스 파일 경로
    mode: 'hash',                     // 'hash' 또는 'history'
    environment: 'development',       // 'development' 또는 'production'
    defaultRoute: 'home',             // 기본 라우트 (/#/ 또는 / 접근 시)

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
    authStorage: 'localStorage',      // 'localStorage', 'sessionStorage', 'cookie', 'memory'

    // 다국어
    useI18n: false,                   // 다국어 활성화
    defaultLanguage: 'ko',            // 기본 언어

    // 로깅
    logLevel: 'info'                  // 'debug', 'info', 'warn', 'error'
});
```

---

### D. 일반적인 함정 및 주의사항

<!-- PITFALLS: 자주 발생하는 문제와 해결 방법 -->

#### 1. 레이아웃 데이터 충돌

**문제:**
```javascript
// ❌ 레이아웃과 페이지에서 같은 속성명 사용
// layout/default.js
data() {
    return { user: null }  // ❌
}

// home.js
data() {
    return { user: null }  // ❌ 충돌!
}
```

**해결:**
```javascript
// ✅ 레이아웃은 layoutData 네임스페이스 사용
// layout/default.js
data() {
    return {
        layoutData: { user: null }  // ✅
    }
}

// home.js
data() {
    return { user: null }  // ✅ 충돌 없음
}
```

#### 2. 파라미터 치환 미작동

**문제:**
```javascript
// ❌ 파라미터 이름과 URL 파라미터 불일치
dataURL: '/api/users/{userId}'  // userId 기대
// 접근: /#/user?id=123  // ❌ id로 전달
```

**해결:**
```javascript
// ✅ 일치시키기
dataURL: '/api/users/{id}'  // id 사용
// 접근: /#/user?id=123  // ✅ 작동
```

#### 3. 인증 토큰 자동 주입 안 됨

**문제:**
```javascript
// ❌ authEnabled가 false
const router = new ViewLogicRouter({
    authEnabled: false  // ❌
});
```

**해결:**
```javascript
// ✅ authEnabled를 true로
const router = new ViewLogicRouter({
    authEnabled: true  // ✅
});
```

#### 4. 컴포넌트 로딩 실패

**문제:**
```javascript
// 컴포넌트 파일이 잘못된 위치에 있음
src/component/Button.js  // ❌ 잘못된 경로 (component는 단수형)
```
```html
<Button text="클릭" />  <!-- ❌ 작동 안 함 -->
```

**해결:**
```javascript
// ✅ 올바른 경로에 컴포넌트 배치
src/components/Button.js  // ✅ components는 복수형
```

**참고:** ViewLogic은 템플릿에서 컴포넌트를 자동으로 발견합니다. 템플릿에 `<Button>`을 사용하면 자동으로 `src/components/Button.js`를 로드합니다.

#### 5. 히스토리 모드 404 에러

**문제:**
```javascript
// history 모드 사용 중
const router = new ViewLogicRouter({
    mode: 'history'  // ✅
});
// 하지만 서버 설정 없음 → 새로고침 시 404 ❌
```

**해결:**
서버에서 모든 요청을 index.html로 리다이렉트하도록 설정 (Nginx, Apache 등)

---

## 추가 리소스

- **GitHub**: https://github.com/hopegiver/viewlogic
- **npm**: https://www.npmjs.com/package/viewlogic
- **이슈 리포트**: https://github.com/hopegiver/viewlogic/issues

---

## 라이선스

MIT License - 자유롭게 사용하세요!
