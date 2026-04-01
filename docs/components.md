# 컴포넌트 사용 (Components)

## 컴포넌트 생성

파일 위치: `src/components/ComponentName.js`

```javascript
export default {
    name: 'Button',
    props: {
        text: String,
        type: { type: String, default: 'primary' },
        disabled: Boolean
    },
    template: `
        <button :class="['btn', 'btn-' + type]" :disabled="disabled"
                @click="$emit('click', $event)">
            {{ text }}
        </button>
    `
}
```

## 페이지에서 등록 및 사용

```javascript
// src/logic/home.js
export default {
    name: 'Home',
    components: ['Button'],  // 컴포넌트 이름만 배열로 명시
    data() { return { count: 0 } },
    methods: {
        handleClick() { this.count++; }
    }
}
```

```html
<!-- src/views/home.html -->
<div>
    <h1>카운터: {{ count }}</h1>
    <Button text="증가" type="primary" @click="handleClick" />
</div>
```

## 다중 컴포넌트 등록

```javascript
components: ['Button', 'Card', 'Modal'],
```

## 내장 컴포넌트 목록

| 컴포넌트 | 설명 |
|----------|------|
| `DatePicker` | 날짜 선택기 (달력 드롭다운) |
| `FileUpload` | 파일 업로드 (드래그 앤 드롭 지원) |
| `Loading` | 로딩 스피너 (여러 스타일) |
| `Sidebar` | 사이드바/드로어 (접기/펼치기, 리사이즈) |
| `Table` | 데이터 테이블 (검색, 정렬, 페이지네이션) |
| `DynamicInclude` | 동적 컴포넌트 로더 |
| `HtmlInclude` | HTML 콘텐츠 동적 로더 |
