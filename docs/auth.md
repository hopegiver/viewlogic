# 인증 처리 (Authentication)

## 라우터 설정

```javascript
const router = new ViewLogicRouter({
    auth: true,
    loginRoute: 'login',
    protectedRoutes: ['profile', 'admin/*'],
    authStorage: 'localStorage'  // 'cookie', 'sessionStorage', 'memory'
});
```

## 로그인 구현

```javascript
export default {
    name: 'Login',
    data() {
        return { username: '', password: '', error: '' }
    },
    methods: {
        async handleLogin() {
            try {
                const response = await this.$api.post('/api/login', {
                    username: this.username,
                    password: this.password
                });
                this.setToken(response.token);
                const redirect = this.getParam('redirect', 'home');
                this.navigateTo(`/${redirect}`);
            } catch (error) {
                this.error = '로그인 실패';
            }
        }
    }
}
```

## 로그아웃

```javascript
this.logout();  // 자동으로 login 페이지로 이동
```

## 인증 상태 확인

```javascript
mounted() {
    this.isLoggedIn = this.isAuth();      // 로그인 여부
    this.token = this.getToken();         // 토큰 가져오기
    if (this.isLoggedIn) {
        this.loadUserProfile();
    }
}
```

## 토큰 갱신 (Refresh Token)

### 기본 설정

`refreshToken` 옵션에 콜백 함수를 전달하면, API 요청에서 401 응답을 받았을 때 자동으로 토큰 갱신을 시도합니다.

```javascript
const router = new ViewLogicRouter({
    auth: true,
    loginRoute: 'auth/login',
    publicRoutes: ['home', 'auth/login', 'auth/register'],
    apiBaseURL: window.API_BASE_URL,
    refreshToken: async () => {
        const rt = localStorage.getItem('refresh_token');
        if (!rt) throw new Error('No refresh token');

        const res = await fetch(window.API_BASE_URL + '/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: rt })
        });
        if (!res.ok) throw new Error('Refresh failed');

        const data = await res.json();
        const result = data.data || data;

        // 서버가 새 refresh_token도 반환하면 갱신
        if (result.refresh_token) {
            localStorage.setItem('refresh_token', result.refresh_token);
        }

        // 새 access_token 반환 (필수)
        return result.access_token;
    }
});
```

### 갱신 흐름

```
API 요청 → 401 응답 감지
  ├─ refreshToken 콜백 없음 또는 이미 재시도 → 에러 throw
  └─ refreshToken 콜백 있음 → 토큰 갱신 시도
       ├─ 성공 → 새 access_token 저장 → 원래 요청 1회 재시도
       └─ 실패 → 로그아웃 + 로그인 페이지 이동
```

### 콜백 함수 규약

| 항목 | 설명 |
|------|------|
| **반환값** | 새 `access_token` 문자열 (필수) |
| **실패 시** | `throw`하면 갱신 실패 처리 (로그아웃) |
| **refresh_token 갱신** | 콜백 내에서 직접 저장하거나, 반환 객체에 `refreshToken` 포함 |

### 동시 요청 처리

여러 API 요청이 동시에 401을 받아도 토큰 갱신은 **1회만** 실행됩니다. 나머지 요청은 갱신 완료를 대기한 후 새 토큰으로 재시도합니다.

### 무한 재시도 방지

갱신된 토큰으로 재시도한 요청이 다시 401을 받으면, 추가 갱신 없이 즉시 에러를 발생시킵니다.

### 관련 설정 옵션

| 키 | 타입 | 기본값 | 설명 |
|----|------|--------|------|
| `refreshToken` | `function\|null` | `null` | 401 시 호출되는 토큰 갱신 콜백 |

### 로그인 시 토큰 저장 예시

```javascript
export default {
    methods: {
        async handleLogin() {
            const response = await this.$api.post('/auth/login', {
                email: this.email,
                password: this.password
            });
            const result = response.data || response;

            // access_token 저장 (ViewLogic 내장 메서드)
            this.setToken(result.access_token);

            // refresh_token 저장 (직접 관리)
            if (result.refresh_token) {
                localStorage.setItem('refresh_token', result.refresh_token);
            }

            this.navigateTo('/home');
        }
    }
}
```

## 자동 토큰 주입

인증 활성화 시 모든 API 요청에 자동으로 Authorization 헤더 추가:
```
Authorization: Bearer YOUR_TOKEN
```
