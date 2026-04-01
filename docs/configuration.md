# 전체 설정 옵션 (Configuration)

## ViewLogicRouter 초기화 옵션

> **중요**: ViewLogic Router는 옵션 이름을 자동 변환하지 않습니다.
> 아래 표의 **정확한 키 이름**을 사용해야 합니다. 오타나 별칭은 무시됩니다.

```javascript
const router = new ViewLogicRouter({
    // ── 기본 설정 ──
    basePath: '/',                    // 앱 기본 경로
    srcPath: '/src',                  // 소스 파일 경로
    mode: 'hash',                     // 'hash' 또는 'history'
    defaultRoute: 'login',            // 기본 라우트 (미인증 시 진입점)
    environment: 'development',       // 'development' 또는 'production'

    // ── API ──
    apiBaseURL: 'http://127.0.0.1:8787',  // API 서버 주소

    // ── 캐싱 ──
    cacheMode: 'memory',              // 'memory', 'sessionStorage', 'localStorage', 'none'
    cacheTTL: 300000,                 // 캐시 유지 시간 (밀리초, 기본 5분)
    maxCacheSize: 50,                 // 최대 캐시 항목 수

    // ── 레이아웃 ──
    useLayout: true,                  // 레이아웃 사용 여부
    defaultLayout: 'default',         // 기본 레이아웃

    // ── 인증 ──
    auth: true,                       // 인증 활성화 (AuthManager 생성) — authEnabled도 가능
    loginRoute: 'login',              // 로그인 페이지 라우트명
    authFunction: () => {...},        // 페이지 접근 시 인증 상태 확인 함수 — checkAuthFunction도 가능
    protectedRoutes: [],              // 보호 라우트 목록 (와일드카드: 'admin/*')
    publicRoutes: ['login'],          // 인증 불필요 라우트
    redirectAfterLogin: 'home',       // 로그인 성공 후 이동 경로
    authStorage: 'localStorage',      // 토큰 저장소 ('localStorage'/'sessionStorage'/'cookie')
    authCookieName: 'authToken',      // 쿠키 모드 시 쿠키 이름

    // ── 토큰 갱신 ──
    refreshFunction: null,            // 토큰 갱신 콜백 함수 (null이면 비활성, refreshToken도 가능)

    // ── API 에러 처리 ──
    apiInterceptors: null,            // API 응답/에러 인터셉터 ({ response?, error? })
    errorHandlers: null,              // HTTP 상태 코드별 에러 핸들러 ({ 403: fn, '5xx': fn })

    // ── 다국어 ──
    useI18n: false,                   // 다국어 활성화
    defaultLanguage: 'ko',            // 기본 언어

    // ── 로깅 ──
    logLevel: 'info'                  // 'debug', 'info', 'warn', 'error'
});
```

---

## 인증 옵션 상세

### 올바른 키 이름 (필수)

| 키 | 타입 | 기본값 | 설명 |
|----|------|--------|------|
| `auth` | `boolean` | `false` | `true`여야 AuthManager 생성 + API 토큰 자동 주입. `authEnabled`도 가능 |
| `authFunction` | `function\|null` | `null` | 페이지 전환 시 인증 상태 확인. `true` 반환 시 통과. `checkAuthFunction`도 가능 |
| `loginRoute` | `string` | `'login'` | 미인증 시 리다이렉트할 라우트명 |
| `authStorage` | `string` | `'localStorage'` | 토큰 저장 위치 |
| `refreshFunction` | `function\|null` | `null` | 토큰 갱신 콜백 (`refreshToken`도 가능) |

### 키 별칭 (Alias)

| 권장 키 | 별칭 (호환) | 설명 |
|---------|-------------|------|
| `auth` | `authEnabled` | 인증 활성화 |
| `authFunction` | `checkAuthFunction` | 인증 확인 함수 |
| `refreshFunction` | `refreshToken` | 토큰 갱신 콜백 |

> 두 형태 모두 동작합니다. 새 프로젝트에서는 간결한 권장 키를 사용하세요.

### 틀리기 쉬운 키 이름 (동작하지 않음!)

| 잘못된 키 | 올바른 키 |
|-----------|-----------|
| ~~`Auth`~~ | `auth` |
| ~~`useAuth`~~ | `auth` |
| ~~`authCheck`~~ | `authFunction` |
| ~~`authRedirect`~~ | `loginRoute` |

> ViewLogic Router의 `_buildConfig`는 `{...defaults, ...userOptions}`로 단순 병합합니다.
> 기본값에 없는 키는 무시되므로, 반드시 정확한 키 이름을 사용해야 합니다.

---

## 초기화 예제

### 최소 설정 (인증 없음)

정적 페이지나 내부 도구에 적합합니다:

```javascript
const router = new ViewLogicRouter({
    srcPath: '/src',
    apiBaseURL: 'http://localhost:8787'
});
```

이것만으로 해시 모드 라우팅, API 호출(`this.$api`), 컴포넌트 자동 등록이 동작합니다.

### 인증 포함 설정

대부분의 실무 앱에서 사용하는 구조입니다:

```javascript
const router = new ViewLogicRouter({
    // ── 기본 ──
    srcPath: '/src',
    mode: 'hash',
    defaultRoute: 'login',            // 앱 진입점 (미인증 상태)
    apiBaseURL: 'http://localhost:8787',

    // ── 인증 ──
    auth: true,                        // AuthManager 활성화 + API 토큰 자동 주입
    loginRoute: 'login',               // 미인증 시 리다이렉트 대상
    publicRoutes: ['login', 'register', 'home'],  // 인증 없이 접근 가능
    protectedRoutes: ['admin/*'],      // 인증 필수 (와일드카드 지원)
    authFunction: () => {
        // true 반환 시 통과, false면 loginRoute로 리다이렉트
        return !!localStorage.getItem('user');
    },

    // ── 토큰 갱신 (선택) ──
    refreshFunction: async (refreshToken) => {
        if (!refreshToken) throw new Error('No refresh token');

        const res = await fetch('http://localhost:8787/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken })
        });
        if (!res.ok) throw new Error('Refresh failed');

        const data = await res.json();
        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token
        };
    }
});
```

**인증 흐름 요약:**

```
사용자 접근 → authFunction() 실행
  ├─ true → 페이지 표시
  └─ false → loginRoute로 리다이렉트 (?redirect=원래경로)

API 요청 → Authorization: Bearer {token} 자동 추가
  ├─ 200 → 정상 응답
  └─ 401 → refreshFunction() 호출
       ├─ 성공 → 새 토큰으로 재시도 (1회)
       └─ 실패 → 로그아웃 + loginRoute 이동
```

> 로그인/로그아웃 구현은 [인증 처리](auth.md)를 참조하세요.

### 인증 + 에러 처리 + 인터셉터 (풀 설정)

```javascript
const router = new ViewLogicRouter({
    srcPath: '/src',
    apiBaseURL: 'http://localhost:8787',

    // 인증
    auth: true,
    loginRoute: 'login',
    publicRoutes: ['login', 'register'],
    authFunction: () => !!localStorage.getItem('user'),
    refreshFunction: async (refreshToken) => {
        // ... (위 예제 참조)
    },

    // HTTP 상태 코드별 에러 처리
    errorHandlers: {
        403({ status, body, url }) {
            alert('권한이 없습니다.');
            router.navigateTo('home');
        },
        500({ status, body }) {
            showToast('서버 오류가 발생했습니다.');
            return { data: [], error: true };  // 에러 억제
        },
        '5xx'({ status }) {
            console.error('서버 에러:', status);
        }
    },

    // API 응답/에러 인터셉터
    apiInterceptors: {
        response(data, { url, method, status }) {
            // 응답 형식 표준화
            if (data.code !== undefined && data.result !== undefined) {
                return { success: data.code === 0, data: data.result };
            }
            return data;
        },
        error(error, { url, method }) {
            // errorHandlers에서 처리되지 않은 에러만 도달
            console.error(`[API] ${method} ${url}:`, error.status, error.message);
        }
    },

    // 프로덕션 설정
    environment: 'production',
    logLevel: 'error',
    cacheTTL: 600000
});
```

## 프로덕션 권장 설정

```javascript
const router = new ViewLogicRouter({
    environment: 'production',
    logLevel: 'error',
    cacheMode: 'memory',
    cacheTTL: 600000     // 10분
});
```
