# 데이터 페칭 (Data Fetching)

## 자동 데이터 로딩 (dataURL)

`dataURL` 속성 지정 시 마운트 전에 자동 GET 요청.

### 문자열 형태 (단일 API)

응답 데이터가 data()의 속성들에 자동 매핑:

```javascript
export default {
    name: 'Users',
    dataURL: '/api/users',
    data() {
        return { users: [] }  // API 응답으로 자동 채워짐
    }
}
```

### 객체 형태 (다중 API)

key가 data()의 변수명, value가 API URL:

```javascript
export default {
    name: 'Dashboard',
    dataURL: {
        users: '/api/users',
        stats: '/api/stats'
    },
    data() {
        return {
            users: [],   // /api/users 응답 → this.users
            stats: null   // /api/stats 응답 → this.stats
        }
    }
}
```

URL에 `{param}` 포함 시 쿼리 파라미터에서 자동 치환:

```javascript
dataURL: {
    user: '/api/users/{id}'
}
// /#/user-detail?id=123 → GET /api/users/123 → this.user
```

## 수동 API 호출

> **mounted()에서 API 호출 시 주의사항**
>
> | 페이지 유형 | mounted 형태 | 이유 |
> |---|---|---|
> | API 호출이 있는 페이지 | `async mounted()` + `await` | 데이터가 준비된 후 렌더링되어 깜빡임 방지 |
> | 정적/동기 초기화만 있는 페이지 | 일반 `mounted()` | async가 불필요 |
>
> `await` 없이 API를 호출하면 데이터가 도착하기 전에 빈 화면이 잠깐 보이는 깜빡임이 발생합니다.

```javascript
export default {
    name: 'Products',
    data() {
        return { products: [], loading: false }
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
