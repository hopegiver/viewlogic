# 레이아웃 시스템 (Layout)

## 레이아웃 파일 위치

```
src/
├── views/layout/default.html   # 레이아웃 HTML 템플릿
└── logic/layout/default.js     # 레이아웃 스크립트 (선택)
```

## 레이아웃 HTML 구조

`{{ content }}` 위치에 페이지 컨텐츠가 삽입됨:

```html
<div class="layout-default">
    <header>
        <nav>
            <a href="#/home">홈</a>
            <a href="#/about">소개</a>
        </nav>
    </header>
    <main>
        {{ content }}
    </main>
    <footer>
        <p>&copy; 2024 My App</p>
    </footer>
</div>
```

## 레이아웃 스크립트 (선택사항)

```javascript
// src/logic/layout/default.js
export default {
    name: 'defaultLayout',
    data() { return {} },
    mounted() { },
    methods: { }
}
```

## 페이지에서 레이아웃 지정

```javascript
// default 레이아웃 사용
export default {
    layout: 'default',
    // ...
}

// admin 레이아웃 사용
export default {
    layout: 'admin',
    // ...
}

// 레이아웃 없이 (로그인, 에러 페이지 등)
export default {
    layout: null,
    // ...
}
```

> `layout: false`는 금지. 반드시 `null` 사용.
