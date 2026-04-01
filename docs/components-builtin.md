# 내장 컴포넌트 (Built-in Components)

등록: `components: ['ComponentName']`

---

## DatePicker

날짜 선택 컴포넌트 (달력 드롭다운).

### Props

| Prop | Type | Default | 설명 |
|------|------|---------|------|
| `modelValue` | String | - | 선택된 날짜 (v-model) |
| `label` | String | - | 라벨 텍스트 |
| `placeholder` | String | - | 플레이스홀더 |
| `format` | String | `'YYYY-MM-DD'` | 날짜 포맷 |
| `disabled` | Boolean | `false` | 비활성화 |
| `clearable` | Boolean | `false` | 초기화 버튼 표시 |
| `showFooter` | Boolean | `false` | 하단 버튼 영역 |
| `minDate` | String | - | 최소 선택 가능 날짜 |
| `maxDate` | String | - | 최대 선택 가능 날짜 |
| `disabledDates` | Array | `[]` | 선택 불가 날짜 배열 |
| `highlightedDates` | Array | `[]` | 강조 표시 날짜 배열 |
| `firstDayOfWeek` | Number | `0` | 주 시작 요일 (0=일요일) |
| `size` | String | - | 크기 (`sm`, `lg`) |

### Events

| Event | Payload | 설명 |
|-------|---------|------|
| `update:modelValue` | String | 날짜 변경 시 |
| `change` | String | 날짜 선택 시 |
| `clear` | - | 초기화 시 |

### 사용 예시

```html
<DatePicker
    v-model="selectedDate"
    label="시작일"
    placeholder="날짜를 선택하세요"
    clearable
    min-date="2024-01-01"
    @change="handleDateChange" />
```

---

## FileUpload

파일 업로드 컴포넌트 (드래그 앤 드롭 지원).

### Props

| Prop | Type | Default | 설명 |
|------|------|---------|------|
| `modelValue` | Array | `[]` | 파일 목록 (v-model) |
| `label` | String | - | 라벨 텍스트 |
| `accept` | String | - | 허용 파일 타입 (예: `'image/*,.pdf'`) |
| `multiple` | Boolean | `false` | 다중 파일 허용 |
| `disabled` | Boolean | `false` | 비활성화 |
| `maxSize` | Number | - | 최대 파일 크기 (bytes) |
| `maxFiles` | Number | - | 최대 파일 수 |
| `autoUpload` | Boolean | `false` | 자동 업로드 |
| `uploadUrl` | String | - | 업로드 API URL |
| `uploadHeaders` | Object | `{}` | 업로드 요청 헤더 |
| `preview` | Boolean | `false` | 미리보기 표시 |
| `size` | String | - | 크기 (`sm`, `lg`) |

### Events

| Event | Payload | 설명 |
|-------|---------|------|
| `update:modelValue` | Array | 파일 목록 변경 |
| `change` | Array | 파일 추가/제거 |
| `upload` | - | 업로드 시작 |
| `progress` | Object | 업로드 진행률 |
| `upload-success` | Object | 업로드 성공 |
| `upload-error` | Object | 업로드 실패 |
| `error` | String | 유효성 검사 에러 |

### 사용 예시

```html
<FileUpload
    v-model="files"
    label="첨부파일"
    accept="image/*,.pdf"
    multiple
    :max-size="5242880"
    :max-files="3"
    upload-url="/api/upload"
    @upload-success="handleUploadSuccess" />
```

---

## Loading

로딩 스피너 컴포넌트.

### Props

| Prop | Type | Default | 설명 |
|------|------|---------|------|
| `visible` | Boolean | `false` | 표시 여부 |
| `text` | String | - | 로딩 텍스트 |
| `type` | String | `'circle'` | 스피너 유형 (`circle`, `dots`, `bars`, `pulse`, `ring`) |
| `size` | String | - | 크기 (`sm`, `lg`) |
| `color` | String | - | 색상 |
| `overlay` | Boolean | `false` | 배경 오버레이 |
| `backdrop` | Boolean | `false` | 배경 클릭 가능 여부 |
| `progress` | Number | - | 진행률 (0-100) |
| `cancelable` | Boolean | `false` | 취소 가능 여부 |

### Events

| Event | Payload | 설명 |
|-------|---------|------|
| `complete` | - | 완료 시 |
| `backdrop-click` | - | 배경 클릭 시 |
| `cancel` | - | 취소 시 |

### 사용 예시

```html
<Loading :visible="isLoading" text="데이터 로딩 중..." type="dots" overlay />
```

---

## Sidebar

사이드바/드로어 컴포넌트.

### Props

| Prop | Type | Default | 설명 |
|------|------|---------|------|
| `modelValue` | Boolean | `false` | 열림/닫힘 상태 (v-model) |
| `title` | String | - | 사이드바 제목 |
| `position` | String | `'left'` | 위치 (`left`, `right`) |
| `width` | String | - | 너비 |
| `collapsible` | Boolean | `false` | 접기 가능 여부 |
| `collapsed` | Boolean | `false` | 접힌 상태 |
| `collapsedWidth` | String | - | 접혔을 때 너비 |
| `overlay` | Boolean | `false` | 오버레이 표시 |
| `closable` | Boolean | `true` | 닫기 버튼 |
| `resizable` | Boolean | `false` | 너비 조절 가능 |
| `navigation` | Boolean | `false` | 네비게이션 모드 |
| `menuItems` | Array | `[]` | 메뉴 항목 배열 |
| `variant` | String | `'default'` | 테마 (`default`, `dark`, `light`) |

### Events

| Event | Payload | 설명 |
|-------|---------|------|
| `update:modelValue` | Boolean | 열림/닫힘 변경 |
| `toggle` | Boolean | 토글 시 |
| `open` | - | 열릴 때 |
| `close` | - | 닫힐 때 |
| `collapse` | - | 접힐 때 |
| `expand` | - | 펼쳐질 때 |
| `menu-click` | Object | 메뉴 클릭 시 |
| `resize` | Number | 너비 변경 시 |

### menuItems 구조

```javascript
menuItems: [
    { key: 'dashboard', label: '대시보드', icon: '📊', route: '/dashboard' },
    { key: 'users', label: '사용자', icon: '👥', children: [
        { key: 'user-list', label: '목록', route: '/users' },
        { key: 'user-add', label: '추가', route: '/users/add' }
    ]}
]
```

### 사용 예시

```html
<Sidebar
    v-model="sidebarOpen"
    title="관리자 메뉴"
    navigation
    :menu-items="menuItems"
    variant="dark"
    collapsible
    @menu-click="handleMenuClick" />
```

---

## Table

데이터 테이블 컴포넌트 (검색, 정렬, 페이지네이션).

### Props

| Prop | Type | Default | 설명 |
|------|------|---------|------|
| `data` | Array | `[]` | 테이블 데이터 |
| `columns` | Array | (필수) | 컬럼 정의 배열 |
| `loading` | Boolean | `false` | 로딩 상태 |
| `striped` | Boolean | `false` | 줄무늬 |
| `bordered` | Boolean | `false` | 테두리 |
| `hoverable` | Boolean | `false` | 호버 효과 |
| `compact` | Boolean | `false` | 컴팩트 모드 |
| `selectable` | Boolean | `false` | 행 선택 가능 |
| `searchable` | Boolean | `false` | 검색 기능 |
| `searchPlaceholder` | String | `'Search...'` | 검색 플레이스홀더 |
| `filterable` | Boolean | `false` | 필터 기능 |
| `filters` | Array | `[]` | 필터 정의 |
| `pagination` | Boolean | `false` | 페이지네이션 |
| `pageSize` | Number | `10` | 페이지 당 행 수 |
| `emptyText` | String | - | 빈 데이터 메시지 |
| `rowKey` | String | `'id'` | 행 고유 키 |

### columns 구조

```javascript
columns: [
    { key: 'name', label: '이름', sortable: true },
    { key: 'email', label: '이메일', sortable: true },
    { key: 'status', label: '상태', formatter: (val) => val ? '활성' : '비활성' },
    { key: 'created', label: '등록일', sortable: true }
]
```

### Events

| Event | Payload | 설명 |
|-------|---------|------|
| `sort` | Object | 정렬 변경 시 |
| `select` | Array | 행 선택 시 |
| `row-click` | Object | 행 클릭 시 |
| `cell-click` | Object | 셀 클릭 시 |
| `page-change` | Number | 페이지 변경 시 |

### 사용 예시

```html
<Table
    :data="users"
    :columns="columns"
    :loading="isLoading"
    searchable
    pagination
    :page-size="20"
    striped
    hoverable
    @row-click="handleRowClick" />
```

---

## DynamicInclude

동적 컴포넌트 로더. ViewLogic 라우터의 `createComponent()`를 사용하여 페이지를 동적 로드.

### Props

| Prop | Type | Default | 설명 |
|------|------|---------|------|
| `page` | String | (필수) | 로드할 페이지 경로 |

### 사용 예시

```html
<DynamicInclude page="components/user-card" />
```

---

## HtmlInclude

외부 HTML 콘텐츠를 동적으로 로드하고 삽입.

### Props

| Prop | Type | Default | 설명 |
|------|------|---------|------|
| `src` | String | (필수) | HTML 파일 경로 또는 URL |
| `sanitize` | Boolean | `true` | HTML 정화 (script/이벤트 핸들러 제거) |
| `loadingText` | String | `'Loading...'` | 로딩 중 표시 텍스트 |
| `wrapperClass` | String | `'html-include'` | 래퍼 CSS 클래스 |

### 사용 예시

```html
<HtmlInclude src="/partials/header.html" />
<HtmlInclude src="/content/notice.html" :sanitize="false" wrapper-class="notice-area" />
```
