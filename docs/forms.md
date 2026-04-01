# 폼 처리 (Forms)

## 기본 폼 제출 (명령형)

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
        return { username: '', email: '' }
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

## 선언적 폼 (자동 처리)

HTML 속성으로 폼 동작을 선언:

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
            form: { name: '', email: '' }
        }
    },
    methods: {
        handleSuccess(response) {
            alert('저장되었습니다!');
        },
        handleError(error) {
            alert('오류 발생: ' + error.message);
        }
    }
}
```

### 폼 속성 목록

| 속성 | 설명 |
|------|------|
| `action` | API 엔드포인트 (파라미터 치환: `{userId}`) |
| `method` | HTTP 메서드 (POST, PUT, DELETE 등) |
| `data-success` | 성공 시 호출할 메서드명 |
| `data-error` | 실패 시 호출할 메서드명 |
| `data-loading` | 로딩 중 호출할 메서드명 |
| `data-redirect` | 성공 후 이동할 라우트 |
