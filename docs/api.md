# API 참고

ViewLogic Router의 전체 API 레퍼런스입니다.

## 생성자

### ViewLogicRouter(options)

새로운 라우터 인스턴스를 생성합니다.

**매개변수:**

| 이름 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| options | Object | 예 | - | 라우터 설정 객체 |
| options.srcPath | String | 예 | - | 페이지 파일들이 위치한 디렉토리 경로 |
| options.mode | String | 아니오 | 'hash' | 라우팅 모드 ('hash' 또는 'history') |
| options.base | String | 아니오 | '/' | 애플리케이션의 base URL |
| options.scrollBehavior | Function | 아니오 | - | 스크롤 동작 함수 |

**반환값:** `ViewLogicRouter` 인스턴스

**예제:**

```javascript
const router = new ViewLogicRouter({
    srcPath: '/app',
    mode: 'history',
    base: '/my-app/',
    scrollBehavior(to, from, savedPosition) {
        if (savedPosition) {
            return savedPosition;
        }
        return { top: 0 };
    }
});
```

## 인스턴스 속성

### router.currentRoute

현재 활성화된 라우트 정보를 반환합니다.

**타입:** `Object`

**속성:**
- `path` (String) - 현재 경로
- `params` (Object) - URL 매개변수
- `query` (Object) - 쿼리 파라미터
- `hash` (String) - URL 해시
- `meta` (Object) - 라우트 메타 정보

**예제:**

```javascript
console.log(router.currentRoute.path);    // '/user/123'
console.log(router.currentRoute.params);  // { id: '123' }
console.log(router.currentRoute.query);   // { tab: 'profile' }
```

### router.mode

현재 라우팅 모드를 반환합니다.

**타입:** `String` ('hash' | 'history')

**예제:**

```javascript
console.log(router.mode); // 'history'
```

## 네비게이션 메서드

### router.push(location)

새로운 경로로 이동합니다. 히스토리 스택에 새 항목을 추가합니다.

**매개변수:**

| 이름 | 타입 | 설명 |
|------|------|------|
| location | String \| Object | 이동할 경로 |

**반환값:** `Promise<void>`

**예제:**

```javascript
// 문자열 경로
router.push('/user/123');

// 객체
router.push({
    path: '/user/123',
    query: { tab: 'profile' }
});

// 매개변수와 함께
router.push({
    path: '/user',
    params: { id: 123 }
});
```

### router.replace(location)

현재 경로를 새로운 경로로 교체합니다. 히스토리 스택에 추가하지 않습니다.

**매개변수:**

| 이름 | 타입 | 설명 |
|------|------|------|
| location | String \| Object | 교체할 경로 |

**반환값:** `Promise<void>`

**예제:**

```javascript
router.replace('/login');
```

### router.back()

히스토리에서 한 단계 뒤로 이동합니다.

**반환값:** `void`

**예제:**

```javascript
router.back();
```

### router.forward()

히스토리에서 한 단계 앞으로 이동합니다.

**반환값:** `void`

**예제:**

```javascript
router.forward();
```

### router.go(n)

히스토리에서 n 단계 이동합니다.

**매개변수:**

| 이름 | 타입 | 설명 |
|------|------|------|
| n | Number | 이동할 단계 (음수는 뒤로, 양수는 앞으로) |

**반환값:** `void`

**예제:**

```javascript
router.go(-2);  // 2단계 뒤로
router.go(1);   // 1단계 앞으로
```

## 네비게이션 가드

### router.beforeEach(guard)

전역 before 가드를 등록합니다. 모든 네비게이션 전에 실행됩니다.

**매개변수:**

| 이름 | 타입 | 설명 |
|------|------|------|
| guard | Function | 가드 함수 (to, from, next) => void |

**반환값:** `Function` - 가드 제거 함수

**예제:**

```javascript
router.beforeEach((to, from, next) => {
    // 인증 체크
    if (to.meta.requiresAuth && !isAuthenticated()) {
        next('/login');
    } else {
        next();
    }
});
```

**가드 함수 매개변수:**

| 이름 | 타입 | 설명 |
|------|------|------|
| to | Route | 이동할 라우트 |
| from | Route | 현재 라우트 |
| next | Function | 다음 단계로 진행하는 함수 |

**next() 사용법:**

```javascript
// 네비게이션 계속 진행
next();

// 네비게이션 중단
next(false);

// 다른 경로로 리다이렉트
next('/login');

// 에러 전달
next(new Error('권한이 없습니다'));
```

### router.afterEach(hook)

전역 after 훅을 등록합니다. 모든 네비게이션 후에 실행됩니다.

**매개변수:**

| 이름 | 타입 | 설명 |
|------|------|------|
| hook | Function | 훅 함수 (to, from) => void |

**반환값:** `Function` - 훅 제거 함수

**예제:**

```javascript
router.afterEach((to, from) => {
    // 페이지 제목 업데이트
    document.title = to.meta.title || 'ViewLogic Router';

    // 분석 전송
    analytics.track('pageview', {
        path: to.path
    });
});
```

## 라우트 객체

각 라우트는 다음 속성을 가집니다:

### Route 속성

| 속성 | 타입 | 설명 |
|------|------|------|
| path | String | 현재 경로 |
| name | String | 라우트 이름 |
| params | Object | URL 매개변수 |
| query | Object | 쿼리 파라미터 |
| hash | String | URL 해시 |
| fullPath | String | 전체 URL 경로 |
| meta | Object | 라우트 메타 정보 |
| matched | Array | 매칭된 라우트 설정 배열 |

**예제:**

```javascript
// URL: /user/123?tab=profile#section
{
    path: '/user/123',
    params: { id: '123' },
    query: { tab: 'profile' },
    hash: '#section',
    fullPath: '/user/123?tab=profile#section',
    meta: { requiresAuth: true },
    matched: [...]
}
```

## 컴포넌트 내 라우터 접근

### this.$router

컴포넌트 내에서 라우터 인스턴스에 접근합니다.

**예제:**

```javascript
export default {
    methods: {
        goToProfile() {
            this.$router.push('/profile');
        }
    }
}
```

### this.$route

컴포넌트 내에서 현재 라우트 정보에 접근합니다.

**예제:**

```javascript
export default {
    computed: {
        userId() {
            return this.$route.params.id;
        }
    }
}
```

## 유틸리티

### router.resolve(location)

경로를 정규화된 라우트 객체로 변환합니다.

**매개변수:**

| 이름 | 타입 | 설명 |
|------|------|------|
| location | String \| Object | 변환할 경로 |

**반환값:** `Object` - 정규화된 라우트 객체

**예제:**

```javascript
const resolved = router.resolve('/user/123');
console.log(resolved.path);    // '/user/123'
console.log(resolved.params);  // { id: '123' }
```

### router.isReady()

라우터가 초기화를 완료했는지 확인합니다.

**반환값:** `Promise<void>`

**예제:**

```javascript
await router.isReady();
console.log('라우터 준비 완료');
```

## 에러 처리

### router.onError(handler)

네비게이션 에러 핸들러를 등록합니다.

**매개변수:**

| 이름 | 타입 | 설명 |
|------|------|------|
| handler | Function | 에러 핸들러 (error) => void |

**예제:**

```javascript
router.onError((error) => {
    console.error('네비게이션 에러:', error);

    if (error.type === 'NavigationDuplicated') {
        // 중복 네비게이션 무시
        return;
    }

    // 에러 페이지로 이동
    router.push('/error');
});
```

## 타입 정의

### NavigationFailure

네비게이션 실패 유형:

```typescript
enum NavigationFailureType {
    aborted = 4,      // 네비게이션 가드에서 중단됨
    cancelled = 8,    // 새로운 네비게이션으로 취소됨
    duplicated = 16   // 같은 경로로 중복 네비게이션
}
```

## 다음 단계

- [Router 모듈](router.md) - 고급 라우터 기능
- [예제](examples.md) - 실제 사용 예제
