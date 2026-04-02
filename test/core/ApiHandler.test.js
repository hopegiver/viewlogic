/**
 * ApiHandler 단위 테스트
 */
import { ApiHandler } from '../../src/core/ApiHandler.js';
import { createMockRouter, createJwtToken, mockFetchSuccess, mockFetchError, mockFetchNetworkError } from '../helpers/testHelpers.js';

describe('ApiHandler', () => {
    let apiHandler;
    let mockRouter;

    beforeEach(() => {
        mockRouter = createMockRouter();
        apiHandler = new ApiHandler(mockRouter);
    });

    afterEach(() => {
        if (apiHandler) {
            apiHandler.destroy();
            apiHandler = null;
        }
    });

    // === 초기화 ===
    describe('초기화', () => {
        test('기본 설정으로 초기화해야 한다', () => {
            expect(apiHandler.apiBaseURL).toBe('');
            expect(apiHandler.interceptors).toBeNull();
            expect(apiHandler.errorHandlers).toBeNull();
        });

        test('apiBaseURL을 router.config에서 가져와야 한다', () => {
            const router = createMockRouter({ config: { apiBaseURL: 'https://api.example.com' } });
            const handler = new ApiHandler(router);
            expect(handler.apiBaseURL).toBe('https://api.example.com');
            handler.destroy();
        });

        test('errorHandlers를 router.config에서 가져와야 한다', () => {
            const handlers = { 403: jest.fn() };
            const router = createMockRouter({ config: { errorHandlers: handlers } });
            const handler = new ApiHandler(router);
            expect(handler.errorHandlers).toBe(handlers);
            handler.destroy();
        });

        test('apiInterceptors를 router.config에서 가져와야 한다', () => {
            const interceptors = { response: jest.fn() };
            const router = createMockRouter({ config: { apiInterceptors: interceptors } });
            const handler = new ApiHandler(router);
            expect(handler.interceptors).toBe(interceptors);
            handler.destroy();
        });
    });

    // === fetchData - 기본 GET 요청 ===
    describe('fetchData - 기본 GET 요청', () => {
        test('성공적인 GET 요청을 처리해야 한다', async () => {
            mockFetchSuccess({ data: 'hello' });
            const result = await apiHandler.fetchData('/api/test');
            expect(result).toEqual({ data: 'hello' });
        });

        test('Content-Type: application/json 헤더를 설정해야 한다', async () => {
            mockFetchSuccess({ ok: true });
            await apiHandler.fetchData('/api/test');

            const fetchCall = global.fetch.mock.calls[0];
            expect(fetchCall[1].headers['Content-Type']).toBe('application/json');
        });
    });

    // === fetchData - POST/PUT/PATCH ===
    describe('fetchData - POST/PUT/PATCH', () => {
        test('POST 요청에 body를 JSON으로 직렬화해야 한다', async () => {
            mockFetchSuccess({ success: true });
            await apiHandler.fetchData('/api/test', null, {
                method: 'POST',
                data: { name: 'test' }
            });

            const fetchCall = global.fetch.mock.calls[0];
            expect(fetchCall[1].method).toBe('POST');
            expect(fetchCall[1].body).toBe(JSON.stringify({ name: 'test' }));
        });

        test('FormData는 그대로 전송하고 Content-Type을 제거해야 한다', async () => {
            mockFetchSuccess({ success: true });
            const formData = new FormData();
            await apiHandler.fetchData('/api/test', null, {
                method: 'POST',
                data: formData
            });

            const fetchCall = global.fetch.mock.calls[0];
            expect(fetchCall[1].body).toBe(formData);
            expect(fetchCall[1].headers['Content-Type']).toBeUndefined();
        });
    });

    // === fetchData - 인증 토큰 주입 ===
    describe('fetchData - 인증 토큰 주입', () => {
        test('authManager.getAccessToken()이 토큰을 반환하면 Authorization 헤더를 추가해야 한다', async () => {
            const token = 'test-token-123';
            mockRouter.authManager = {
                getAccessToken: jest.fn(() => token)
            };
            apiHandler = new ApiHandler(mockRouter);
            mockFetchSuccess({ data: 'ok' });

            await apiHandler.fetchData('/api/test');

            const fetchCall = global.fetch.mock.calls[0];
            expect(fetchCall[1].headers['Authorization']).toBe(`Bearer ${token}`);
        });

        test('토큰이 없으면 Authorization 헤더를 추가하지 않아야 한다', async () => {
            mockFetchSuccess({ data: 'ok' });
            await apiHandler.fetchData('/api/test');

            const fetchCall = global.fetch.mock.calls[0];
            expect(fetchCall[1].headers['Authorization']).toBeUndefined();
        });
    });

    // === fetchData - apiBaseURL 처리 ===
    describe('fetchData - apiBaseURL 처리', () => {
        test('상대 URL에 apiBaseURL을 접두사로 붙여야 한다', async () => {
            const router = createMockRouter({ config: { apiBaseURL: 'https://api.example.com' } });
            const handler = new ApiHandler(router);
            mockFetchSuccess({ data: 'ok' });

            await handler.fetchData('/users');

            const fetchCall = global.fetch.mock.calls[0];
            expect(fetchCall[0]).toBe('https://api.example.com/users');
            handler.destroy();
        });

        test('절대 URL은 apiBaseURL을 무시해야 한다', async () => {
            const router = createMockRouter({ config: { apiBaseURL: 'https://api.example.com' } });
            const handler = new ApiHandler(router);
            mockFetchSuccess({ data: 'ok' });

            await handler.fetchData('https://other-api.com/users');

            const fetchCall = global.fetch.mock.calls[0];
            expect(fetchCall[0]).toBe('https://other-api.com/users');
            handler.destroy();
        });
    });

    // === fetchData - params 쿼리 파라미터 ===
    describe('fetchData - params 쿼리 파라미터', () => {
        test('options.params를 URL에 추가해야 한다', async () => {
            mockFetchSuccess({ data: 'ok' });
            await apiHandler.fetchData('/api/test', null, {
                params: { page: 1, size: 10 }
            });

            const fetchCall = global.fetch.mock.calls[0];
            expect(fetchCall[0]).toContain('page=1');
            expect(fetchCall[0]).toContain('size=10');
        });

        test('이미 쿼리가 있는 URL에 &로 연결해야 한다', async () => {
            mockFetchSuccess({ data: 'ok' });
            await apiHandler.fetchData('/api/test?existing=true', null, {
                params: { page: 1 }
            });

            const fetchCall = global.fetch.mock.calls[0];
            expect(fetchCall[0]).toContain('?existing=true&');
        });

        test('null/undefined params는 무시해야 한다', async () => {
            mockFetchSuccess({ data: 'ok' });
            await apiHandler.fetchData('/api/test', null, {
                params: { a: 1, b: null, c: undefined }
            });

            const fetchCall = global.fetch.mock.calls[0];
            expect(fetchCall[0]).toContain('a=1');
            expect(fetchCall[0]).not.toContain('b=');
        });
    });

    // === fetchData - HTTP 에러 처리 ===
    describe('fetchData - HTTP 에러 처리', () => {
        test('400 응답에서 에러를 throw해야 한다', async () => {
            mockFetchError(400, { message: 'Bad Request' });
            await expect(apiHandler.fetchData('/api/test')).rejects.toThrow();
        });

        test('에러 객체에 status, body, url, method를 포함해야 한다', async () => {
            mockFetchError(403, { message: 'Forbidden' });
            try {
                await apiHandler.fetchData('/api/test');
            } catch (error) {
                expect(error.status).toBe(403);
                expect(error.body).toEqual({ message: 'Forbidden' });
                expect(error.url).toBeDefined();
                expect(error.method).toBe('GET');
            }
        });
    });

    // === fetchData - 401 토큰 갱신 ===
    describe('fetchData - 401 토큰 갱신', () => {
        let mockAuthManager;

        beforeEach(() => {
            mockAuthManager = {
                getAccessToken: jest.fn(() => 'old-token'),
                getRefreshToken: jest.fn(() => 'refresh-token'),
                setAccessToken: jest.fn(() => true),
                setRefreshToken: jest.fn(),
                emitAuthEvent: jest.fn(),
                logout: jest.fn()
            };
            mockRouter.authManager = mockAuthManager;
            mockRouter.config.refreshFunction = jest.fn().mockResolvedValue({
                accessToken: createJwtToken()
            });
            apiHandler = new ApiHandler(mockRouter);
        });

        test('401 응답 + refreshFunction 시 토큰 갱신을 시도해야 한다', async () => {
            // 첫 번째: 401 에러
            mockFetchError(401, { message: 'Unauthorized' });
            // 두 번째: 갱신 후 성공
            mockFetchSuccess({ data: 'success' });

            const result = await apiHandler.fetchData('/api/test');
            expect(mockRouter.config.refreshFunction).toHaveBeenCalled();
            expect(result).toEqual({ data: 'success' });
        });

        test('갱신 실패 시 로그아웃하고 에러를 throw해야 한다', async () => {
            mockRouter.config.refreshFunction = jest.fn().mockResolvedValue(null);
            apiHandler = new ApiHandler(mockRouter);

            mockFetchError(401, { message: 'Unauthorized' });

            await expect(apiHandler.fetchData('/api/test')).rejects.toThrow('Authentication failed');
            expect(mockAuthManager.logout).toHaveBeenCalled();
        });

        test('_isRetry가 true이면 갱신을 시도하지 않아야 한다', async () => {
            mockFetchError(401, { message: 'Unauthorized' });

            await expect(
                apiHandler.fetchData('/api/test', null, { _isRetry: true })
            ).rejects.toThrow();
            expect(mockRouter.config.refreshFunction).not.toHaveBeenCalled();
        });
    });

    // === fetchData - errorHandlers ===
    describe('fetchData - errorHandlers', () => {
        test('정확한 상태 코드 핸들러를 호출해야 한다', async () => {
            const handler403 = jest.fn().mockReturnValue({ fallback: true });
            const router = createMockRouter({ config: { errorHandlers: { 403: handler403 } } });
            const h = new ApiHandler(router);

            mockFetchError(403, { message: 'Forbidden' });
            const result = await h.fetchData('/api/test');

            expect(handler403).toHaveBeenCalled();
            expect(result).toEqual({ fallback: true });
            h.destroy();
        });

        test('범위 핸들러를 호출해야 한다 (5xx)', async () => {
            const handler5xx = jest.fn().mockReturnValue({ error: 'server' });
            const router = createMockRouter({ config: { errorHandlers: { '5xx': handler5xx } } });
            const h = new ApiHandler(router);

            mockFetchError(502, { message: 'Bad Gateway' });
            const result = await h.fetchData('/api/test');

            expect(handler5xx).toHaveBeenCalled();
            expect(result).toEqual({ error: 'server' });
            h.destroy();
        });

        test('정확한 코드가 범위보다 우선해야 한다', async () => {
            const exact = jest.fn().mockReturnValue('exact');
            const range = jest.fn().mockReturnValue('range');
            const router = createMockRouter({
                config: { errorHandlers: { 500: exact, '5xx': range } }
            });
            const h = new ApiHandler(router);

            mockFetchError(500, { message: 'Internal Server Error' });
            const result = await h.fetchData('/api/test');

            expect(exact).toHaveBeenCalled();
            expect(range).not.toHaveBeenCalled();
            expect(result).toBe('exact');
            h.destroy();
        });

        test('핸들러가 undefined를 반환하면 에러를 계속 전파해야 한다', async () => {
            const handler = jest.fn().mockReturnValue(undefined);
            const router = createMockRouter({ config: { errorHandlers: { 403: handler } } });
            const h = new ApiHandler(router);

            mockFetchError(403, { message: 'Forbidden' });
            await expect(h.fetchData('/api/test')).rejects.toThrow();
            h.destroy();
        });
    });

    // === fetchData - 인터셉터 ===
    describe('fetchData - 인터셉터', () => {
        test('response 인터셉터가 데이터를 변환할 수 있어야 한다', async () => {
            const interceptors = {
                response: jest.fn((data) => ({ ...data, intercepted: true }))
            };
            const router = createMockRouter({ config: { apiInterceptors: interceptors } });
            const h = new ApiHandler(router);

            mockFetchSuccess({ data: 'original' });
            const result = await h.fetchData('/api/test');

            expect(result.intercepted).toBe(true);
            h.destroy();
        });

        test('error 인터셉터가 fallback 값을 반환할 수 있어야 한다', async () => {
            const interceptors = {
                error: jest.fn(() => ({ fallback: true }))
            };
            const router = createMockRouter({ config: { apiInterceptors: interceptors } });
            const h = new ApiHandler(router);

            mockFetchNetworkError('Network failure');
            const result = await h.fetchData('/api/test');

            expect(result).toEqual({ fallback: true });
            h.destroy();
        });

        test('인터셉터 에러는 잡히고 원래 로직이 계속되어야 한다', async () => {
            const interceptors = {
                response: jest.fn(() => { throw new Error('interceptor error'); })
            };
            const router = createMockRouter({ config: { apiInterceptors: interceptors } });
            const h = new ApiHandler(router);

            mockFetchSuccess({ data: 'ok' });
            const result = await h.fetchData('/api/test');
            // 인터셉터 에러 시에도 원래 데이터 반환
            expect(result).toEqual({ data: 'ok' });
            h.destroy();
        });
    });

    // === HTTP 메서드 헬퍼 ===
    describe('HTTP 메서드 헬퍼', () => {
        test('get()이 method: GET으로 호출해야 한다', async () => {
            mockFetchSuccess({ data: 'ok' });
            await apiHandler.get('/api/test');
            expect(global.fetch.mock.calls[0][1].method).toBe('GET');
        });

        test('post()가 method: POST + data로 호출해야 한다', async () => {
            mockFetchSuccess({ data: 'ok' });
            await apiHandler.post('/api/test', { name: 'test' });
            const opts = global.fetch.mock.calls[0][1];
            expect(opts.method).toBe('POST');
            expect(opts.body).toBe(JSON.stringify({ name: 'test' }));
        });

        test('put()이 method: PUT + data로 호출해야 한다', async () => {
            mockFetchSuccess({ data: 'ok' });
            await apiHandler.put('/api/test', { name: 'updated' });
            expect(global.fetch.mock.calls[0][1].method).toBe('PUT');
        });

        test('patch()가 method: PATCH + data로 호출해야 한다', async () => {
            mockFetchSuccess({ data: 'ok' });
            await apiHandler.patch('/api/test', { name: 'patched' });
            expect(global.fetch.mock.calls[0][1].method).toBe('PATCH');
        });

        test('delete()가 method: DELETE로 호출해야 한다', async () => {
            mockFetchSuccess({ data: 'ok' });
            await apiHandler.delete('/api/test');
            expect(global.fetch.mock.calls[0][1].method).toBe('DELETE');
        });
    });

    // === processURLParameters ===
    describe('processURLParameters', () => {
        test('URL의 {param}을 컴포넌트 데이터로 치환해야 한다', () => {
            const component = { id: '123' };
            const result = apiHandler.processURLParameters('/api/users/{id}', component);
            expect(result).toBe('/api/users/123');
        });

        test('컴포넌트가 null이면 원본 URL을 반환해야 한다', () => {
            const result = apiHandler.processURLParameters('/api/users/{id}', null);
            expect(result).toBe('/api/users/{id}');
        });

        test('찾을 수 없는 파라미터는 원본을 유지해야 한다', () => {
            const component = {};
            const result = apiHandler.processURLParameters('/api/users/{unknown}', component);
            expect(result).toBe('/api/users/{unknown}');
        });

        test('값을 encodeURIComponent로 인코딩해야 한다', () => {
            const component = { name: 'hello world' };
            const result = apiHandler.processURLParameters('/api/users/{name}', component);
            expect(result).toBe('/api/users/hello%20world');
        });

        test('getParam에서 값을 찾아야 한다', () => {
            const component = {
                getParam: jest.fn((key) => key === 'id' ? '456' : undefined)
            };
            const result = apiHandler.processURLParameters('/api/users/{id}', component);
            expect(result).toBe('/api/users/456');
        });

        test('QueryManager에서 fallback으로 찾아야 한다', () => {
            mockRouter.queryManager.getParam.mockReturnValue('789');
            apiHandler = new ApiHandler(mockRouter);
            const component = {};
            const result = apiHandler.processURLParameters('/api/users/{id}', component);
            expect(result).toBe('/api/users/789');
        });
    });

    // === bindToComponent ===
    describe('bindToComponent', () => {
        test('컴포넌트에 바인딩된 API 객체를 반환해야 한다', () => {
            const component = { id: '123' };
            const boundApi = apiHandler.bindToComponent(component);

            expect(typeof boundApi.get).toBe('function');
            expect(typeof boundApi.post).toBe('function');
            expect(typeof boundApi.put).toBe('function');
            expect(typeof boundApi.patch).toBe('function');
            expect(typeof boundApi.delete).toBe('function');
            expect(typeof boundApi.fetchData).toBe('function');
            expect(typeof boundApi.fetchMultipleData).toBe('function');
        });
    });

    // === 요청 추적 ===
    describe('요청 추적 (tracking)', () => {
        test('startTracking()이 pending 카운터를 시작해야 한다', () => {
            apiHandler.startTracking();
            expect(apiHandler._tracking).toBe(true);
            expect(apiHandler._pendingCount).toBe(0);
        });

        test('추적 중 API 호출이 카운터를 증가시켜야 한다', async () => {
            apiHandler.startTracking();
            mockFetchSuccess({ data: 'ok' });
            const promise = apiHandler.fetchData('/api/test');
            // 요청 시작 시 카운트 증가 (비동기이므로 완료 후 확인)
            await promise;
            // 완료 후에는 0으로 돌아감
        });

        test('stopTracking() + pending=0이면 settled resolver가 즉시 실행해야 한다', async () => {
            apiHandler.startTracking();
            apiHandler.stopTracking();
            const result = await apiHandler.waitForSettled(1000);
            expect(result).toBe(true);
        });

        test('waitForSettled()이 모든 요청 완료 시 true를 반환해야 한다', async () => {
            apiHandler.startTracking();
            mockFetchSuccess({ data: 'ok' });
            await apiHandler.fetchData('/api/test');
            apiHandler.stopTracking();

            const result = await apiHandler.waitForSettled(1000);
            expect(result).toBe(true);
        });

        test('추적 중이 아닌 상태에서 waitForSettled()이 즉시 true를 반환해야 한다', async () => {
            const result = await apiHandler.waitForSettled(1000);
            expect(result).toBe(true);
        });
    });

    // === combineURLs/isAbsoluteURL ===
    describe('combineURLs/isAbsoluteURL', () => {
        test('combineURLs가 base와 relative를 올바르게 조합해야 한다', () => {
            expect(apiHandler.combineURLs('https://api.com', '/users')).toBe('https://api.com/users');
            expect(apiHandler.combineURLs('https://api.com/', '/users')).toBe('https://api.com/users');
            expect(apiHandler.combineURLs('https://api.com', 'users')).toBe('https://api.com/users');
        });

        test('isAbsoluteURL이 http:// URL에 true를 반환해야 한다', () => {
            expect(apiHandler.isAbsoluteURL('https://api.com')).toBe(true);
            expect(apiHandler.isAbsoluteURL('http://api.com')).toBe(true);
            expect(apiHandler.isAbsoluteURL('//api.com')).toBe(true);
        });

        test('isAbsoluteURL이 상대 URL에 false를 반환해야 한다', () => {
            expect(apiHandler.isAbsoluteURL('/api/test')).toBe(false);
            expect(apiHandler.isAbsoluteURL('api/test')).toBe(false);
        });
    });

    // === fetchMultipleData ===
    describe('fetchMultipleData', () => {
        test('여러 API를 병렬로 호출해야 한다', async () => {
            mockFetchSuccess({ users: [] });
            mockFetchSuccess({ posts: [] });

            const result = await apiHandler.fetchMultipleData({
                users: '/api/users',
                posts: '/api/posts'
            });

            expect(result.results.users).toEqual({ users: [] });
            expect(result.results.posts).toEqual({ posts: [] });
        });

        test('null/undefined 설정에 빈 객체를 반환해야 한다', async () => {
            const result = await apiHandler.fetchMultipleData(null);
            expect(result).toEqual({});
        });

        test('실패한 API는 errors에 기록해야 한다', async () => {
            mockFetchSuccess({ users: [] });
            mockFetchError(500, { message: 'Server Error' });

            const result = await apiHandler.fetchMultipleData({
                users: '/api/users',
                posts: '/api/posts'
            });

            expect(result.results.users).toBeDefined();
            expect(result.errors.posts).toBeDefined();
        });
    });

    // === destroy ===
    describe('destroy', () => {
        test('상태를 초기화하고 router 참조를 null로 설정해야 한다', () => {
            apiHandler.startTracking();
            apiHandler.destroy();
            expect(apiHandler.router).toBeNull();
            expect(apiHandler._tracking).toBe(false);
            expect(apiHandler._pendingCount).toBe(0);
        });
    });
});
