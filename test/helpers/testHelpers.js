/**
 * ViewLogic Router 테스트 공유 헬퍼
 * Mock 객체, 팩토리 함수, 유틸리티
 */

/**
 * Mock Router 팩토리
 * 모든 모듈이 생성자에서 받는 최소한의 router mock
 */
export function createMockRouter(overrides = {}) {
    const errorHandler = {
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
        handleRouteError: jest.fn(),
        ...(overrides.errorHandler || {})
    };

    const cacheManager = {
        get: jest.fn(() => null),
        set: jest.fn(),
        has: jest.fn(() => false),
        deleteByPattern: jest.fn(() => 0),
        deleteComponent: jest.fn(() => 0),
        deleteAllComponents: jest.fn(() => 0),
        clearAll: jest.fn(() => 0),
        cleanExpired: jest.fn(() => 0),
        getStats: jest.fn(() => ({ size: 0 })),
        ...(overrides.cacheManager || {})
    };

    const queryManager = {
        getQueryParams: jest.fn(() => ({})),
        getRouteParams: jest.fn(() => ({})),
        getAllParams: jest.fn(() => ({})),
        getParam: jest.fn(() => undefined),
        parseQueryString: jest.fn(() => ({})),
        buildQueryString: jest.fn(() => ''),
        setCurrentQueryParams: jest.fn(),
        setCurrentRouteParams: jest.fn(),
        hasQueryParamsChanged: jest.fn(() => false),
        ...(overrides.queryManager || {})
    };

    const stateHandler = {
        get: jest.fn(),
        set: jest.fn(),
        has: jest.fn(() => false),
        delete: jest.fn(),
        clear: jest.fn(),
        ...(overrides.stateHandler || {})
    };

    const authManager = overrides.authManager !== undefined ? overrides.authManager : null;
    const i18nManager = overrides.i18nManager !== undefined ? overrides.i18nManager : null;

    const routeLoader = overrides.routeLoader !== undefined ? overrides.routeLoader : {
        apiHandler: {
            processURLParameters: jest.fn((url) => url),
            fetchData: jest.fn(),
            bindToComponent: jest.fn(() => ({
                get: jest.fn(),
                post: jest.fn(),
                put: jest.fn(),
                patch: jest.fn(),
                delete: jest.fn()
            }))
        },
        formHandler: {
            bindAutoForms: jest.fn()
        }
    };

    const router = {
        config: {
            basePath: '/',
            srcPath: 'http://localhost/src',
            routesPath: '/routes',
            mode: 'hash',
            defaultRoute: 'home',
            defaultLayout: 'default',
            environment: 'development',
            cacheMode: 'memory',
            cacheTTL: 300000,
            maxCacheSize: 50,
            useI18n: false,
            defaultLanguage: 'ko',
            i18nPath: '/i18n',
            logLevel: 'info',
            apiBaseURL: '',
            requestTimeout: 30000,
            uploadTimeout: 300000,
            authEnabled: false,
            loginRoute: 'login',
            protectedRoutes: [],
            publicRoutes: ['login', 'register', 'home'],
            authFunction: null,
            refreshFunction: null,
            apiInterceptors: null,
            errorHandlers: null,
            ...(overrides.config || {})
        },
        errorHandler,
        cacheManager,
        queryManager,
        stateHandler,
        authManager,
        i18nManager,
        routeLoader,
        navigateTo: jest.fn(),
        getCurrentRoute: jest.fn(() => 'home'),
        updateURL: jest.fn(),
        resolvePath: jest.fn((path) => `http://localhost${path}`),
        combinePaths: jest.fn((base, rel) => `${base}${rel}`),
        currentHash: 'home',
        isReady: true
    };

    // 추가 오버라이드 적용
    if (overrides.currentHash !== undefined) router.currentHash = overrides.currentHash;
    if (overrides.isReady !== undefined) router.isReady = overrides.isReady;
    if (overrides.navigateTo) router.navigateTo = overrides.navigateTo;

    return router;
}

/**
 * 유효한 JWT 토큰 생성
 */
export function createJwtToken(payload = {}, expiresInSeconds = 3600) {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = btoa(JSON.stringify({
        sub: '1234567890',
        name: 'Test User',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
        ...payload
    }));
    const signature = btoa('test-signature');
    return `${header}.${body}.${signature}`;
}

/**
 * 만료된 JWT 토큰 생성
 */
export function createExpiredJwtToken(payload = {}) {
    return createJwtToken(payload, -3600);
}

/**
 * fetch 성공 응답 mock
 */
export function mockFetchSuccess(data, status = 200) {
    global.fetch.mockResolvedValueOnce({
        ok: status >= 200 && status < 300,
        status,
        statusText: 'OK',
        json: jest.fn().mockResolvedValue(data),
        text: jest.fn().mockResolvedValue(typeof data === 'string' ? data : JSON.stringify(data)),
        headers: new Map()
    });
}

/**
 * fetch 에러 응답 mock
 */
export function mockFetchError(status, body = {}) {
    global.fetch.mockResolvedValueOnce({
        ok: false,
        status,
        statusText: `Error ${status}`,
        json: jest.fn().mockResolvedValue(body),
        text: jest.fn().mockResolvedValue(JSON.stringify(body)),
        headers: new Map()
    });
}

/**
 * fetch 네트워크 에러 mock
 */
export function mockFetchNetworkError(message = 'Network error') {
    global.fetch.mockRejectedValueOnce(new TypeError(message));
}

/**
 * Mock form element 생성
 */
export function createMockForm(options = {}) {
    const inputs = (options.inputs || []).map(inputDef => ({
        type: inputDef.type || 'text',
        name: inputDef.name || '',
        value: inputDef.value || '',
        files: inputDef.files || [],
        checkValidity: jest.fn(() => inputDef.valid !== false),
        getAttribute: jest.fn((attr) => inputDef[attr] || null),
        classList: {
            add: jest.fn(),
            remove: jest.fn()
        }
    }));

    const form = {
        getAttribute: jest.fn((attr) => options[attr] || null),
        setAttribute: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        querySelectorAll: jest.fn(() => inputs),
        elements: inputs,
        _isSubmitting: false,
        _boundSubmitHandler: null
    };

    return form;
}
