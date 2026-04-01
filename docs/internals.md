# ViewLogic 내부 동작 (Internals)

> 소스코드 분석 기반. 공식 문서에 없는 내부 메커니즘 설명.
> 소스 경로: `g:\workspace\viewlogic\src\`

---

## 1. 페이지 전환 메커니즘

`renderComponentWithTransition()` (viewlogic-router.js)이 모든 페이지 전환을 처리한다.

### 전환 순서

1. 새 `<div>` 컨테이너 생성 -- `page-pending` 클래스, `opacity:0`, `pointer-events:none`
2. `#app`에 append (이전 페이지 위에 숨겨진 상태)
3. Vue 앱(`createApp`)을 새 컨테이너에 마운트 -- 이 시점에서 `mounted()` 실행 시작
4. `_resolveMounted()` 시그널 대기 (Promise)
5. 타임아웃: `dataSettleTimeout` (기본 **5초**) -- 시그널이 안 오면 강제 진행
6. 기존 컨테이너에 `page-exiting` 클래스 추가
7. 새 컨테이너에서 `page-pending` 제거, `page-entered` 추가, 인라인 스타일 초기화
8. `window.scrollTo(0, 0)` -- 스크롤 리셋
9. `requestAnimationFrame`으로 이전 페이지 DOM 제거 + Vue 앱 `unmount()`

```javascript
// viewlogic-router.js (핵심 부분 요약)
const newPageContainer = document.createElement('div');
newPageContainer.className = 'page-container page-pending';
newPageContainer.style.cssText = 'position:absolute;top:0;left:0;width:100%;opacity:0;pointer-events:none;';
appElement.appendChild(newPageContainer);

// mounted 완료 시그널 Promise
let resolveMounted;
const mountedReady = new Promise(r => { resolveMounted = r; });
newVueApp.config.globalProperties._resolveMounted = resolveMounted;
newVueApp.mount(`#${newPageContainer.id}`);

// mounted() 완료 대기 (타임아웃 포함)
await Promise.race([
    mountedReady,
    new Promise(r => setTimeout(r, settleTimeout))  // 기본 5000ms
]);

// 전환 실행
existingContainers.forEach(c => c.classList.add('page-exiting'));
newPageContainer.classList.remove('page-pending');
newPageContainer.classList.add('page-entered');
newPageContainer.style.cssText = '';
window.scrollTo(0, 0);
```

**핵심 포인트**: mounted()가 완료(또는 타임아웃)될 때까지 페이지가 보이지 않는다. API 호출이 mounted() 안에서 await되면 데이터가 준비된 상태로 페이지가 표시된다.

---

## 2. mounted() 실행 순서

`RouteLoader.createVueComponent()`에서 정의하는 `mounted()` 훅의 내부 실행 순서:

```
1. $api 초기화        → apiHandler.bindToComponent(this)
2. $state 초기화      → router.stateHandler 할당
3. 레이아웃 mounted() → await mergedScript._layoutMounted.call(this)
4. 페이지 mounted()   → await mergedScript._pageMounted.call(this)
5. dataURL fetch      → await this.fetchData()  (script.dataURL이 있을 때)
6. $nextTick() await  → DOM 렌더링 완료 대기
7. formHandler        → formHandler.bindAutoForms(this)
8. _resolveMounted()  → 페이지 전환 시그널 발사
```

```javascript
// RouteLoader.js mounted() 구현
async mounted() {
    this.$api = router.routeLoader.apiHandler.bindToComponent(this);  // 1
    this.$state = router.stateHandler;                                 // 2

    if (mergedScript._layoutMounted) {
        await mergedScript._layoutMounted.call(this);                  // 3
    }
    if (mergedScript._pageMounted) {
        await mergedScript._pageMounted.call(this);                    // 4
    }
    if (script.dataURL) {
        await this.fetchData();                                        // 5
    }

    await this.$nextTick();                                            // 6
    router.routeLoader.formHandler.bindAutoForms(this);                // 7

    if (this._resolveMounted) {
        this._resolveMounted();                                        // 8
    }
}
```

**모든 단계가 await로 순차 실행된다.** mounted() 내에서 `await this.$api.get()`을 호출하면 데이터가 준비된 후에야 `_resolveMounted()`가 실행되고, 그래야 페이지가 표시된다.

**따라서 `v-if="loading"` 로딩 스피너는 불필요하다** -- 사용자는 페이지가 보이는 시점에 이미 데이터가 로드된 상태를 본다.

---

## 3. $api 쿼리 파라미터 자동 추가

`ApiHandler.fetchData()`는 현재 URL의 쿼리 파라미터를 API 요청에 자동 병합한다.

```javascript
// ApiHandler.js:136-137
const queryString = this.router.queryManager?.buildQueryString(
    this.router.queryManager?.getQueryParams()
) || '';
const fullURL = queryString ? `${processedURL}?${queryString}` : processedURL;
```

### 중복 버그 패턴

```javascript
// BAD -- 수동 쿼리 스트링 빌드 시 $api가 같은 파라미터를 다시 추가
this.$api.get('/api/goals?status=active')
// 결과: /api/goals?status=active?status=active  (중복!)

// GOOD -- $api가 URL 파라미터를 자동 추가하므로 경로만 전달
this.$api.get('/api/goals')
// URL이 /#/goals?status=active 이면
// 결과: /api/goals?status=active  (정상)
```

### 올바른 서버 필터링 패턴

```javascript
// 필터 적용
applyFilters() {
    this.navigateTo('/goals/my-goals', {
        status: this.filterStatus,
        period: this.filterPeriod
    });
    // navigateTo → URL 변경 → hashchange → 페이지 리마운트
}

// 데이터 로딩 (mounted에서 호출)
async loadData() {
    const response = await this.$api.get('/api/goals');
    // $api가 URL의 ?status=active&period=2024Q1 을 자동 추가
    this.goals = response.data;
}
```

---

## 4. 토큰 갱신 (refreshToken)

`ApiHandler`가 401 응답을 감지하면 토큰 갱신을 시도한다.

### 갱신 흐름

```
API 요청 → 401 응답 감지
  ├─ refreshToken 콜백이 없거나 이미 재시도(_isRetry) → 에러 throw
  └─ refreshToken 콜백 있음 → _handleTokenRefresh()
       ├─ 이미 갱신 중 (_refreshingToken) → 기존 Promise 대기
       └─ 최초 갱신 → _executeTokenRefresh()
            ├─ 성공 → 새 토큰 저장 → 원래 요청 재시도 (1회, _isRetry: true)
            └─ 실패 → _handleRefreshFailure() → 로그아웃 + 로그인 페이지
```

### 동시 401 처리

여러 API 요청이 동시에 401을 받아도 토큰 갱신은 **1회만** 실행된다:

```javascript
// ApiHandler.js
async _handleTokenRefresh() {
    // 이미 갱신 중이면 기존 Promise를 대기
    if (this._refreshingToken && this._refreshPromise) {
        return await this._refreshPromise;  // 같은 Promise 공유
    }

    this._refreshingToken = true;
    this._refreshPromise = this._executeTokenRefresh();

    try {
        return await this._refreshPromise;
    } finally {
        this._refreshingToken = false;
        this._refreshPromise = null;
    }
}
```

### 무한 재시도 방지

재시도 요청에는 `_isRetry: true` 플래그가 설정되어 2번째 401에서는 갱신을 시도하지 않는다:

```javascript
// 재시도 (1회만)
async _retryRequest(dataURL, component, options) {
    return await this.fetchData(dataURL, component, { ...options, _isRetry: true });
}
```

---

## 5. errorHandlers (상태 코드별 에러 핸들러)

`ApiHandler.fetchData()`에서 HTTP 에러 응답 시 `errorHandlers`를 실행한다.

### 실행 흐름

```
!response.ok
  │
  ├─ 401 + refreshToken → 토큰 갱신 시도 (기존 로직, 위 §4 참조)
  │
  ├─ response.json() 파싱 → body 객체 생성
  │
  ├─ errorHandlers 실행
  │   ├─ 1순위: 정확한 코드 (예: errorHandlers[403])
  │   └─ 2순위: 범위 핸들러 (예: errorHandlers['4xx'])
  │       └─ 반환값 있으면 → 에러 억제, 해당 값을 응답으로 반환
  │       └─ 반환값 없으면 → 에러 계속 전파
  │
  ├─ throw Error (status, body, url, method 속성 포함)
  │
  └─ catch → apiInterceptors.error 호출 (기존 동작)
```

### 핸들러 매칭 로직

```javascript
// ApiHandler.js — _executeErrorHandler()
async _executeErrorHandler(status, context) {
    // 1순위: 정확한 상태 코드 (숫자/문자열 모두 가능)
    const exactHandler = this.errorHandlers[status];    // obj[403] == obj['403']
    if (typeof exactHandler === 'function') {
        const result = await exactHandler(context);
        if (result !== undefined) return result;        // 에러 억제
    }

    // 2순위: 범위 핸들러
    const rangeKey = `${Math.floor(status / 100)}xx`;   // 403 → '4xx'
    const rangeHandler = this.errorHandlers[rangeKey];
    if (typeof rangeHandler === 'function') {
        const result = await rangeHandler(context);
        if (result !== undefined) return result;
    }

    return undefined;  // 에러 전파
}
```

### Error 객체 확장

`errorHandlers`를 거치지 않아도 throw되는 Error 객체에 다음 속성이 추가된다:

```javascript
const error = new Error(body.message || `HTTP ${status}`);
error.status = status;      // HTTP 상태 코드 (number)
error.body = body;          // 응답 본문 (object)
error.url = fullURL;        // 요청 URL (string)
error.method = method;      // HTTP 메서드 (string)
```

이를 통해 `apiInterceptors.error`나 컴포넌트의 `catch` 블록에서도 `error.status`로 상태 코드에 접근할 수 있다.

### 401과의 관계

| 시나리오 | errorHandlers 호출 여부 |
|----------|------------------------|
| 401 + refreshToken 성공 → 재시도 | 호출 안 됨 (재시도 성공) |
| 401 + refreshToken 실패 → 로그아웃 | 호출 안 됨 (즉시 throw) |
| 401 + refreshToken 미설정 | **호출됨** (errorHandlers[401]) |
| 401 + 재시도도 401 (_isRetry) | **호출됨** (errorHandlers[401]) |

### Graceful Degradation

핸들러 내부에서 예외가 발생해도 `try/catch`로 감싸서 warn 로그만 출력하고 에러 전파를 계속한다:

```javascript
try {
    const result = await exactHandler(context);
    if (result !== undefined) return result;
} catch (handlerError) {
    this.log('warn', `errorHandler[${status}] 실행 에러:`, handlerError);
}
```

---

## 6. 레이아웃 + 페이지 스크립트 병합

`_mergeLayoutAndPageScript()`가 레이아웃과 페이지의 스크립트를 하나로 합친다.

### 병합 규칙

| 항목 | 병합 방식 | 우선순위 |
|------|-----------|----------|
| `data()` | `Object.assign(layoutData, pageData)` | 페이지가 우선 |
| `methods` | 스프레드 병합 `{...layout, ...page}` | 페이지가 오버라이드 |
| `computed` | 스프레드 병합 `{...layout, ...page}` | 페이지가 오버라이드 |
| `watch` | 스프레드 병합 `{...layout, ...page}` | 페이지가 오버라이드 |
| 라이프사이클 훅 | 레이아웃 먼저 실행 후 페이지 실행 | 순차 실행 (await) |
| `name` | `pageScript.name \|\| layoutScript.name` | 페이지가 우선 |
| `components` | 스프레드 병합 | 페이지가 오버라이드 |

### 라이프사이클 실행 순서

모든 라이프사이클 훅은 **레이아웃 -> 페이지** 순서로 실행된다:

```javascript
// 병합된 mounted() 예시 (RouteLoader.js에서 생성)
async mounted() {
    // ...초기화...
    if (mergedScript._layoutMounted) {
        await mergedScript._layoutMounted.call(this);   // 레이아웃 먼저
    }
    if (mergedScript._pageMounted) {
        await mergedScript._pageMounted.call(this);     // 페이지 다음
    }
    // ...나머지...
}
```

대상 훅: `created`, `beforeMount`, `mounted`, `beforeUpdate`, `updated`, `beforeUnmount`, `unmounted`

### data() 병합 상세

```javascript
// createVueComponent()의 data() 함수
data() {
    const layoutData = mergedScript._layoutData ? mergedScript._layoutData.call(this) : {};
    const pageData = mergedScript._pageData ? mergedScript._pageData.call(this) : {};

    return {
        ...layoutData,          // 레이아웃 데이터
        ...pageData,            // 페이지 데이터 (같은 키는 덮어씀)
        currentRoute: routeName,
        $query: router.queryManager?.getQueryParams() || {},
        $params: router.queryManager?.getRouteParams() || {},
        $lang: '...',
        $dataLoading: false
    };
}
```

---

## 7. 컴포넌트 자동 발견

`ComponentLoader`가 HTML 템플릿에서 PascalCase 태그를 감지하여 컴포넌트를 자동 로드한다.

### 개발 모드

HTML에서 PascalCase 태그를 정규식으로 탐색:

```javascript
// ComponentLoader.js
const componentPattern = /<([A-Z][a-zA-Z0-9]*)(?:\s[^>]*)?\/?>|<\/([A-Z][a-zA-Z0-9]*)\s*>/gs;
```

예: `<StatusBadge>`, `<UserAvatar />` -> `['StatusBadge', 'UserAvatar']`

HTML 기본 태그(대문자여도)는 제외된다 (`_isHtmlTag()` 필터).

레이아웃의 컴포넌트는 캐시되어 매번 파싱하지 않는다:
```javascript
// 레이아웃 컴포넌트 캐시 키: layout_components_{layoutName}
const cacheKey = `layout_components_${layoutName}`;
```

### 프로덕션 모드

`_components.js` 파일에서 일괄 로드:

```javascript
// routes/_components.js에서 모든 컴포넌트를 한 번에 로드
const componentsModule = await import(`${basePath}/routes/_components.js`);
this.unifiedComponents = componentsModule.components || {};
```

### 로드 경로

개발 모드에서 컴포넌트 파일 위치: `{srcPath}/components/{ComponentName}.js`

```javascript
const componentRelativePath = `${this.config.componentsPath}/${componentName}.js`;
// 예: /src/components/StatusBadge.js
```

---

## 8. 페이지 전환 CSS 클래스

```css
/* 페이지 전환 상태 */
.page-container.page-pending {
    /* 숨겨진 상태: DOM에 존재하지만 보이지 않음 */
    opacity: 0;
    pointer-events: none;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
}

.page-container.page-entered {
    /* 활성 페이지: 스타일 초기화되어 정상 표시 */
    opacity: 1;
    /* style.cssText = '' 로 인라인 스타일 제거 */
}

.page-container.page-exiting {
    /* 이전 페이지: requestAnimationFrame에서 DOM 제거 */
    display: none;  /* 즉시 숨김 처리 */
}
```

### 전환 타이밍

1. 새 페이지 생성: `page-pending` (숨김)
2. mounted() 완료 대기
3. 이전 페이지: `page-entered` -> `page-exiting`
4. 새 페이지: `page-pending` -> `page-entered` + `style.cssText = ''`
5. 다음 프레임(rAF): `page-exiting` 컨테이너 DOM에서 제거

CSS 애니메이션은 프레임워크에 내장되어 있지 않다. 필요시 `page-entered`에 transition을 추가하면 된다.

---

## 9. 캐시 시스템

`CacheManager`가 컴포넌트, 레이아웃, 스크립트를 메모리에 캐시한다.

### 캐시 모드

| 모드 | 설명 |
|------|------|
| `memory` | 단순 Map 기반 저장. 크기 제한 없음 (TTL만 적용) |
| `lru` | LRU 순서 추적 + `maxCacheSize` 초과 시 가장 오래된 항목 제거 |

### 캐시 키 패턴

| 키 패턴 | 저장 대상 | 설정 위치 |
|---------|-----------|-----------|
| `component_{routeName}` | 생성된 Vue 컴포넌트 옵션 | `RouteLoader.createVueComponent()` |
| `layout_html_{layoutName}` | 레이아웃 HTML 문자열 | `RouteLoader.loadLayout()` |
| `layout_script_{layoutName}` | 레이아웃 스크립트 모듈 | `RouteLoader.loadLayoutScript()` |
| `layout_components_{layoutName}` | 레이아웃에서 발견된 컴포넌트 Set | `ComponentLoader._getLayoutComponents()` |
| `component_{componentName}` | 개별 컴포넌트 모듈 | `ComponentLoader.loadComponent()` |

### TTL 기반 만료

기본 TTL: **300,000ms (5분)**. `get()` 호출 시 만료 체크:

```javascript
get(key) {
    const timestamp = this.cacheTimestamps.get(key);
    if (timestamp && (now - timestamp) > this.config.cacheTTL) {
        this.cache.delete(key);          // 만료된 항목 제거
        this.cacheTimestamps.delete(key);
        return null;
    }
    // LRU 모드: 접근 시 순서 업데이트
    return this.cache.get(key);
}
```

### 캐시 무효화 API

```javascript
// 특정 라우트의 캐시 삭제
cacheManager.deleteComponent('goals/my-goals');

// 패턴으로 삭제
cacheManager.deleteByPattern('layout_');

// 전체 삭제
cacheManager.clearAll();

// 만료된 항목만 정리
cacheManager.cleanExpired();
```

---

## 10. 쿼리 파라미터 변경 감지

`handleRouteChange()`에서 `QueryManager.hasQueryParamsChanged()`를 사용하여 쿼리 파라미터 변경을 감지한다.

```javascript
// viewlogic-router.js
handleRouteChange() {
    const { route, queryParams } = this._parseCurrentLocation();

    const paramsChanged = this.queryManager?.hasQueryParamsChanged(queryParams);
    this.queryManager?.setCurrentQueryParams(queryParams);

    // 라우트 또는 쿼리 파라미터가 변경되면 페이지 로드
    if (route !== this.currentHash || paramsChanged) {
        this.currentHash = route;
        this.loadRoute(route);  // 새 Vue 앱 마운트 (리마운트)
    }
}
```

### 변경 감지 로직

```javascript
// QueryManager.js
hasQueryParamsChanged(newParams) {
    const oldKeys = Object.keys(this.currentQueryParams);
    const newKeys = Object.keys(newParams);

    if (oldKeys.length !== newKeys.length) return true;

    for (const key of oldKeys) {
        if (JSON.stringify(this.currentQueryParams[key]) !== JSON.stringify(newParams[key])) {
            return true;
        }
    }
    return false;
}
```

**쿼리 파라미터만 변경되어도 `loadRoute()`가 호출된다** -- 새 Vue 앱이 마운트되므로 **완전한 리마운트**가 발생한다. 이것이 `navigateTo` + 서버 필터링 패턴이 작동하는 이유다.

### navigateTo와 쿼리 파라미터

```javascript
// navigateTo('goals/my-goals', { status: 'active' })
navigateTo(routeName, params) {
    // 다른 라우트로 이동 시 기존 쿼리 파라미터 초기화
    if (routeName !== this.currentHash && this.queryManager) {
        this.queryManager.clearQueryParams();
    }
    this.queryManager.setCurrentRouteParams(params);
    this.updateURL(routeName, params);  // URL 변경 → hashchange → handleRouteChange
}
```

---

## 11. 프로그레스 바

화면 상단에 표시되는 로딩 프로그레스 바.

### 동작 방식

- **0.3초 지연 후 표시**: 빠른 페이지 로드에서는 프로그레스 바가 보이지 않음
- 표시 시: `opacity: 1`, `width: 70%`로 전환
- 로드 완료 시: `width: 100%` -> 0.2초 후 `opacity: 0`, `width: 0%`로 리셋

```javascript
// _showProgressBar()
this.progressBarTimer = setTimeout(() => {
    this.progressBarElement.style.opacity = '1';
    this.progressBarElement.style.width = '70%';
}, 300);  // 0.3초 지연

// _hideProgressBar()
clearTimeout(this.progressBarTimer);  // 0.3초 전에 완료되면 타이머 취소
this.progressBarElement.style.width = '100%';
setTimeout(() => {
    this.progressBarElement.style.opacity = '0';
    this.progressBarElement.style.width = '0%';
}, 200);
```

### 프로그레스 바 스타일

```javascript
// _createProgressBar()
progressBar.style.cssText = `
    position: fixed;
    top: 0; left: 0;
    width: 0%; height: 2px;
    background-color: rgba(59, 130, 246, 0.6);
    transition: width 0.3s ease-out, opacity 0.3s ease-out;
    z-index: 9999;
    opacity: 0;
`;
```

### 타이밍 정리

| 이벤트 | 시점 |
|--------|------|
| `_showProgressBar()` 호출 | `loadRoute()` 시작 |
| 프로그레스 바 실제 표시 | 0.3초 후 (300ms 지연) |
| `_hideProgressBar()` 호출 | `renderComponentWithTransition()` 완료 또는 에러 발생 |
| 프로그레스 바 페이드 아웃 | 100% 도달 후 0.2초 후 |

---

## 부록: 전체 라우트 로딩 타임라인

```
1. hashchange 이벤트
2. handleRouteChange() → 라우트/쿼리 변경 감지
3. loadRoute(routeName)
   3a. transitionInProgress 체크 (진행 중이면 무시)
   3b. _showProgressBar() (0.3초 지연)
   3c. authManager.checkAuthentication() (인증 체크)
   3d. routeLoader.createVueComponent(routeName)
       - loadScript() → import('logic/{name}.js')
       - loadTemplate() → fetch('views/{name}.html')
       - loadLayout() → fetch('views/layout/{name}.html') (캐시 확인)
       - loadLayoutScript() → import('logic/layout/{name}.js') (캐시 확인)
       - componentLoader.getComponentNames() → HTML에서 PascalCase 태그 탐색
       - componentLoader.loadAllComponents() → 병렬 import
       - _mergeLayoutAndPageScript() → 스크립트 병합
       - 캐시 저장
   3e. renderComponentWithTransition(component, routeName)
       - 새 컨테이너 생성 (page-pending)
       - Vue.createApp(component).mount()
       - mounted() 실행 (위 #2 참조)
       - _resolveMounted() 대기 (최대 5초)
       - 페이지 전환 (CSS 클래스 전환)
       - 스크롤 리셋
       - 이전 페이지 정리
   3f. _hideProgressBar()
```
