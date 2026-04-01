# 라우팅 (Routing)

## 파일 기반 라우팅

파일 이름이 곧 라우트:
- `home.html` + `home.js` → `/#/home`
- `about.html` + `about.js` → `/#/about`
- `users/profile.html` + `users/profile.js` → `/#/users/profile`

## 페이지 이동

### HTML에서
```html
<a href="#/about">About 페이지로</a>
<button @click="navigateTo('/users')">사용자 페이지</button>
```

### JavaScript에서
```javascript
this.navigateTo('/about');                              // 기본 이동
this.navigateTo('/users', { id: 123, tab: 'profile' }); // 파라미터 포함
this.navigateTo('/');                                    // 홈으로 이동
this.navigateTo('/admin/dashboard');                     // 하위 경로
```

> `navigateTo()`는 모드(hash/history)에 관계없이 동일하게 사용. 라우터가 자동 URL 변환.

## 파라미터 받기

URL: `/#/users?id=123&tab=profile`

### data()에서 받기
```javascript
data() {
    return {
        userId: this.getParam('id'),       // '123'
        tab: this.getParam('tab')          // 'profile'
    }
}
```

### mounted()에서 받기
```javascript
mounted() {
    this.userId = this.getParam('id');
    this.allParams = this.getParams();            // 전체 파라미터 객체
    const page = this.getParam('page', 1);        // 기본값 지정
}
```

### 메서드에서 사용
```javascript
methods: {
    async loadUser() {
        const userId = this.getParam('id');
        const response = await this.$api.get(`/api/users/${userId}`);
        this.user = response.data;
    },
    changeTab(tabName) {
        this.navigateTo('/users', { ...this.getParams(), tab: tabName });
    }
}
```

## 중첩 라우트 (하위 폴더)

```
src/
├── views/admin/dashboard.html
├── logic/admin/dashboard.js
```

접근: `/#/admin/dashboard`
