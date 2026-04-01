# 고급 기능 (Advanced)

## 1. 라이프사이클 훅

```javascript
export default {
    async beforeMount() { },   // 데이터 로딩 전
    async mounted() { },       // DOM 마운트 후 (가장 많이 사용)
    updated() { },             // 데이터 변경 후
    beforeUnmount() { }        // 컴포넌트 제거 전 (정리 작업)
}
```

## 2. Computed 속성

자주 변경되지 않는 계산값에 사용 (캐싱됨):

```javascript
computed: {
    totalPrice() {
        return this.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
    },
    itemCount() {
        return this.items.length;
    }
}
```

```html
<p>합계: {{ totalPrice.toLocaleString() }}원</p>
```

## 3. Watch (데이터 감시)

```javascript
watch: {
    keyword(newValue, oldValue) {
        this.search();
    }
}
```

## 4. 캐싱 제어

### 라우터 설정
```javascript
const router = new ViewLogicRouter({
    cacheMode: 'memory',       // 'memory', 'sessionStorage', 'localStorage', 'none'
    cacheTTL: 300000,          // 5분 (밀리초)
    maxCacheSize: 50
});
```

### 수동 캐시 제어
```javascript
this.$cache.clear();           // 전체 캐시 삭제
this.$cache.delete('users');   // 특정 키 삭제
```

## 5. 에러 처리

### 404 페이지
`src/views/404.html` + `src/logic/404.js` 파일 생성 시 자동 매핑.

### 전역 에러 핸들러
```javascript
window.addEventListener('route-error', (event) => {
    console.error('라우트 에러:', event.detail);
});
```

## 6. 프로그레스 바

0.3초 이상 로딩 시 자동 표시. 색상 커스터마이즈:
```css
#viewlogic-progress-bar {
    background-color: var(--primary-color) !important;
    height: 3px !important;
}
```

## 7. 상태 관리 (전역 상태)

```javascript
this.$state.get('user');                              // 가져오기
this.$state.set('user', { name: 'John' });           // 설정
this.$state.watch('user', (newUser) => {             // 변경 감시
    this.user = newUser;
});
```

## 8. 히스토리 모드

```javascript
const router = new ViewLogicRouter({
    mode: 'history',
    basePath: '/'
});
```

서버에서 모든 요청을 `index.html`로 라우팅 필요:

**Nginx**: `try_files $uri $uri/ /index.html;`

**Apache (.htaccess)**:
```apache
RewriteEngine On
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```
