# API 호출 ($api)

## 기본 메서드

```javascript
// GET
const users = await this.$api.get('/api/users');
const filtered = await this.$api.get('/api/users', {
    params: { role: 'admin', active: true }
});

// POST
const created = await this.$api.post('/api/users', {
    name: 'John', email: 'john@example.com'
});

// PUT (전체 수정)
const updated = await this.$api.put('/api/users/123', { name: 'John Doe' });

// PATCH (부분 수정)
const patched = await this.$api.patch('/api/users/123', { email: 'new@example.com' });

// DELETE
const deleted = await this.$api.delete('/api/users/123');

// 커스텀 헤더
const response = await this.$api.get('/api/data', {
    headers: { 'X-Custom-Header': 'value' }
});
```

## 에러 처리

### 컴포넌트 레벨 (try/catch)

```javascript
methods: {
    async fetchData() {
        try {
            const response = await this.$api.get('/api/data');
            this.data = response.data;
        } catch (error) {
            // error.status: HTTP 상태 코드 (403, 500 등)
            // error.body: 응답 본문 (JSON 파싱 결과)
            // error.url: 요청 URL
            // error.method: HTTP 메서드
            console.error('상태 코드:', error.status);
            console.error('응답 본문:', error.body);
            console.error('에러 메시지:', error.message);
        }
    }
}
```

### 전역 레벨 (errorHandlers)

라우터 초기화 시 `errorHandlers`로 HTTP 상태 코드별 공통 에러 처리를 등록할 수 있습니다.

```javascript
const router = new ViewLogicRouter({
    apiBaseURL: '/api',
    errorHandlers: {
        // 정확한 상태 코드
        403({ status, body, url }) {
            alert('권한이 없습니다.');
            router.navigateTo('home');
        },
        // 값을 반환하면 에러가 억제되고 해당 값이 응답으로 사용
        500({ status, body }) {
            showToast('서버 오류가 발생했습니다.');
            return { data: [], error: true };
        },
        // 범위 핸들러: '4xx', '5xx' (개별 핸들러가 없는 코드에 적용)
        '5xx'({ status, body }) {
            console.error(`서버 에러 ${status}:`, body);
        }
    }
});
```

**실행 순서**: 정확한 코드(403) → 범위 핸들러('4xx') → `apiInterceptors.error`

> 자세한 내용은 [API 참고 > errorHandlers](api.md#errorhandlers)를 참조하세요.

### 전역 인터셉터 (apiInterceptors)

모든 API 응답과 에러를 전역에서 가로채 처리할 수 있습니다. `errorHandlers`보다 범용적인 처리에 적합합니다.

```javascript
const router = new ViewLogicRouter({
    apiBaseURL: '/api',
    apiInterceptors: {
        // 모든 성공 응답 후처리
        response(data, { url, method, status }) {
            // 응답 형식 표준화
            if (data.code !== undefined && data.result !== undefined) {
                return { success: data.code === 0, data: data.result };
            }
            return data;
        },
        // 모든 에러 후처리 (errorHandlers에서 처리되지 않은 에러)
        error(error, { url, method }) {
            // error.status, error.body로 상세 정보 접근 가능
            showToast(`API 오류: ${error.message}`);

            // 값을 반환하면 에러가 무시되고 fallback 데이터로 사용
            if (url.includes('/notifications')) {
                return { items: [], total: 0 };
            }
            // 반환하지 않으면 에러가 그대로 throw
        }
    }
});
```

**errorHandlers vs apiInterceptors:**

| | errorHandlers | apiInterceptors |
|---|---|---|
| 용도 | HTTP 상태 코드별 분기 | 모든 응답/에러 범용 처리 |
| 대상 | 에러 응답만 | 성공 + 에러 모두 |
| 실행 시점 | `throw` 전 | 성공: `return` 전 / 에러: `catch` 블록 |
| 코드 접근 | `context.status` | `error.status` |

> 자세한 내용은 [Router 모듈 > API Interceptors](router.md#api-interceptors)를 참조하세요.

## 자동 토큰 주입

인증 활성화 시(`auth: true`) 모든 API 요청에 자동으로 토큰 포함:
```
Authorization: Bearer YOUR_TOKEN
```
