/**
 * ViewLogicRouter 핵심 메서드 단위 테스트
 * 라우팅 흐름, URL 파싱/생성, 경로 유틸리티 테스트
 */
import { ViewLogicRouter } from '../../src/viewlogic-router.js';

describe('ViewLogicRouter', () => {
    let router;
    let addEventSpy;
    let removeEventSpy;
    let pushStateSpy;
    let rAFSpy;

    beforeEach(() => {
        // jsdom의 window 메서드를 spy로 감시
        addEventSpy = jest.spyOn(window, 'addEventListener');
        removeEventSpy = jest.spyOn(window, 'removeEventListener');
        pushStateSpy = jest.spyOn(window.history, 'pushState').mockImplementation(() => {});
        rAFSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => setTimeout(cb, 0));
    });

    afterEach(() => {
        if (router) {
            router.destroy();
            router = null;
        }
        // 해시 초기화
        window.location.hash = '#/';
        jest.restoreAllMocks();
    });

    // === combinePaths (순수 함수) ===
    describe('combinePaths', () => {
        beforeEach(() => {
            router = new ViewLogicRouter({ mode: 'hash' });
        });

        test('루트 basePath에서 상대 경로를 정규화해야 한다', () => {
            expect(router.combinePaths('/', '/about')).toBe('/about');
        });

        test('basePath와 relativePath를 결합해야 한다', () => {
            expect(router.combinePaths('/app', '/users')).toBe('/app/users');
        });

        test('basePath의 끝 슬래시를 제거해야 한다', () => {
            expect(router.combinePaths('/app/', '/users')).toBe('/app/users');
        });

        test('relativePath에 앞 슬래시가 없으면 추가해야 한다', () => {
            expect(router.combinePaths('/app', 'users')).toBe('/app/users');
        });

        test('이중 슬래시를 제거해야 한다', () => {
            expect(router.combinePaths('/app/', '//users')).toBe('/app/users');
        });

        test('빈 basePath는 루트로 처리해야 한다', () => {
            expect(router.combinePaths('', '/about')).toBe('/about');
        });
    });

    // === resolvePath ===
    describe('resolvePath', () => {
        beforeEach(() => {
            router = new ViewLogicRouter({ mode: 'hash', basePath: '/' });
        });

        test('HTTP URL은 그대로 반환해야 한다', () => {
            expect(router.resolvePath('http://api.example.com/data')).toBe('http://api.example.com/data');
        });

        test('HTTPS URL도 그대로 반환해야 한다', () => {
            expect(router.resolvePath('https://cdn.example.com/lib.js')).toBe('https://cdn.example.com/lib.js');
        });

        test('절대 경로를 origin과 결합해야 한다', () => {
            const result = router.resolvePath('/src/views');
            expect(result).toContain('/src/views');
            expect(result).toMatch(/^http/);
        });

        test('basePath가 있으면 절대 경로에 포함해야 한다', () => {
            const result = router.resolvePath('/src/views', '/examples');
            expect(result).toContain('/examples/src/views');
        });

        test('상대 경로에 origin을 포함해야 한다', () => {
            const result = router.resolvePath('views/home.html');
            expect(result).toMatch(/^http/);
            expect(result).toContain('views/home.html');
        });
    });

    // === _parseCurrentLocation ===
    describe('_parseCurrentLocation', () => {
        describe('hash 모드', () => {
            beforeEach(() => {
                router = new ViewLogicRouter({ mode: 'hash', defaultRoute: 'home' });
            });

            test('빈 해시일 때 defaultRoute를 반환해야 한다', () => {
                window.location.hash = '';
                const result = router._parseCurrentLocation();
                expect(result.route).toBe('home');
            });

            test('#/ 해시에서 defaultRoute를 반환해야 한다', () => {
                window.location.hash = '#/';
                const result = router._parseCurrentLocation();
                expect(result.route).toBe('home');
            });

            test('#/users 해시에서 users 라우트를 파싱해야 한다', () => {
                window.location.hash = '#/users';
                const result = router._parseCurrentLocation();
                expect(result.route).toBe('users');
            });

            test('앞 슬래시 없는 해시도 파싱해야 한다', () => {
                window.location.hash = '#about';
                const result = router._parseCurrentLocation();
                expect(result.route).toBe('about');
            });

            test('중첩 경로를 파싱해야 한다', () => {
                window.location.hash = '#/admin/users';
                const result = router._parseCurrentLocation();
                expect(result.route).toBe('admin/users');
            });

            test('쿼리 파라미터를 분리해서 파싱해야 한다', () => {
                window.location.hash = '#/users?id=123&tab=profile';
                const result = router._parseCurrentLocation();
                expect(result.route).toBe('users');
                expect(result.queryParams).toBeDefined();
            });
        });

        describe('history 모드', () => {
            test('_parseCurrentLocation이 history 모드에서 pathname을 사용해야 한다', () => {
                router = new ViewLogicRouter({ mode: 'history', basePath: '/', defaultRoute: 'home' });
                // history 모드는 window.location.pathname을 읽음 (jsdom에서 '/')
                const result = router._parseCurrentLocation();
                expect(result.route).toBe('home');
                expect(result.queryParams).toBeDefined();
            });

            test('basePath가 있는 history 모드에서 경로를 파싱해야 한다', () => {
                router = new ViewLogicRouter({ mode: 'history', basePath: '/app', defaultRoute: 'home' });
                // jsdom의 pathname은 '/'이므로 basePath '/app'이 매치되지 않음 → defaultRoute
                const result = router._parseCurrentLocation();
                expect(result.route).toBe('home');
            });
        });
    });

    // === updateURL ===
    describe('updateURL', () => {
        describe('hash 모드', () => {
            beforeEach(() => {
                router = new ViewLogicRouter({ mode: 'hash', defaultRoute: 'home' });
            });

            test('기본 라우트면 #/ 로 설정해야 한다', () => {
                router.updateURL('home');
                expect(window.location.hash).toBe('#/');
            });

            test('일반 라우트를 해시에 설정해야 한다', () => {
                router.updateURL('users');
                expect(window.location.hash).toBe('#/users');
            });

            test('쿼리 파라미터를 포함해야 한다', () => {
                router.updateURL('users', { id: '123' });
                expect(window.location.hash).toContain('#/users');
                expect(window.location.hash).toContain('id=123');
            });

            test('동일한 URL이면 업데이트하지 않아야 한다', () => {
                window.location.hash = '#/users';
                router.updateURL('users');
                expect(window.location.hash).toBe('#/users');
            });
        });

        describe('history 모드', () => {
            beforeEach(() => {
                router = new ViewLogicRouter({ mode: 'history', basePath: '/', defaultRoute: 'home' });
                // handleRouteChange → loadRoute 호출 방지
                jest.spyOn(router, 'loadRoute').mockResolvedValue();
            });

            test('pushState를 호출해야 한다', () => {
                router.updateURL('about');
                expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/about');
            });

            test('기본 라우트면 / 로 pushState해야 한다', () => {
                router.updateURL('home');
                expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/');
            });

            test('basePath를 포함해야 한다', () => {
                router.destroy();
                router = new ViewLogicRouter({ mode: 'history', basePath: '/app', defaultRoute: 'home' });
                jest.spyOn(router, 'loadRoute').mockResolvedValue();
                router.updateURL('users');
                expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/app/users');
            });
        });
    });

    // === handleRouteChange ===
    describe('handleRouteChange', () => {
        beforeEach(() => {
            router = new ViewLogicRouter({ mode: 'hash', defaultRoute: 'home' });
        });

        test('라우트가 변경되면 loadRoute를 호출해야 한다', () => {
            const loadRouteSpy = jest.spyOn(router, 'loadRoute').mockResolvedValue();
            router.currentHash = 'home';
            window.location.hash = '#/users';

            router.handleRouteChange();

            expect(loadRouteSpy).toHaveBeenCalledWith('users');
            expect(router.currentHash).toBe('users');
        });

        test('라우트가 동일하고 파라미터도 동일하면 loadRoute를 호출하지 않아야 한다', () => {
            const loadRouteSpy = jest.spyOn(router, 'loadRoute').mockResolvedValue();
            router.currentHash = 'users';
            window.location.hash = '#/users';

            router.handleRouteChange();

            expect(loadRouteSpy).not.toHaveBeenCalled();
        });

        test('라우트는 같지만 파라미터가 변경되면 loadRoute를 호출해야 한다', () => {
            const loadRouteSpy = jest.spyOn(router, 'loadRoute').mockResolvedValue();
            jest.spyOn(router.queryManager, 'hasQueryParamsChanged').mockReturnValue(true);
            router.currentHash = 'users';
            window.location.hash = '#/users?id=456';

            router.handleRouteChange();

            expect(loadRouteSpy).toHaveBeenCalledWith('users');
        });

        test('currentHash를 업데이트해야 한다', () => {
            jest.spyOn(router, 'loadRoute').mockResolvedValue();
            router.currentHash = '';
            window.location.hash = '#/dashboard';

            router.handleRouteChange();

            expect(router.currentHash).toBe('dashboard');
        });
    });

    // === init ===
    describe('init', () => {
        test('hash 모드에서 hashchange 리스너를 등록해야 한다', () => {
            router = new ViewLogicRouter({ mode: 'hash' });
            expect(addEventSpy).toHaveBeenCalledWith('hashchange', expect.any(Function));
        });

        test('history 모드에서 popstate 리스너를 등록해야 한다', () => {
            router = new ViewLogicRouter({ mode: 'history' });
            expect(addEventSpy).toHaveBeenCalledWith('popstate', expect.any(Function));
        });

        test('destroy 시 이벤트 리스너를 제거해야 한다', () => {
            router = new ViewLogicRouter({ mode: 'hash' });
            router.destroy();
            expect(removeEventSpy).toHaveBeenCalledWith('hashchange', expect.any(Function));
        });

        test('DOM 로드 후 라우트를 초기화해야 한다', () => {
            router = new ViewLogicRouter({ mode: 'hash' });
            expect(rAFSpy).toHaveBeenCalled();
        });
    });

    // === navigateTo 엣지 케이스 ===
    describe('navigateTo', () => {
        beforeEach(() => {
            router = new ViewLogicRouter({ mode: 'hash', defaultRoute: 'home' });
            jest.spyOn(router, 'updateURL').mockImplementation(() => {});
        });

        test('객체 파라미터를 분해해야 한다', () => {
            router.navigateTo({ route: 'users', params: { id: '123' } });
            expect(router.updateURL).toHaveBeenCalledWith('users', { id: '123' });
        });

        test('객체에 params가 없으면 null로 처리해야 한다', () => {
            router.navigateTo({ route: 'about' });
            expect(router.updateURL).toHaveBeenCalledWith('about', null);
        });

        test('앞 슬래시를 제거해야 한다', () => {
            router.navigateTo('/about');
            expect(router.updateURL).toHaveBeenCalledWith('about', null);
        });

        test('빈 문자열이면 defaultRoute로 이동해야 한다', () => {
            router.navigateTo('');
            expect(router.updateURL).toHaveBeenCalledWith('home', null);
        });

        test('다른 라우트로 이동 시 쿼리 파라미터를 초기화해야 한다', () => {
            router.currentHash = 'home';
            const clearSpy = jest.spyOn(router.queryManager, 'clearQueryParams');
            router.navigateTo('users');
            expect(clearSpy).toHaveBeenCalled();
        });
    });

    // === Progress Bar ===
    describe('Progress Bar', () => {
        beforeEach(() => {
            router = new ViewLogicRouter({ mode: 'hash' });
            // loadRoute가 트리거되지 않도록 격리
            jest.spyOn(router, 'loadRoute').mockResolvedValue();
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('_createProgressBar가 DOM에 프로그레스 바를 생성해야 한다', () => {
            expect(router.progressBarElement).toBeDefined();
            expect(router.progressBarElement.id).toBe('viewlogic-progress-bar');
            // body에 추가된 것은 progressBarElement 참조로 검증
            expect(router.progressBarElement.style).toBeDefined();
        });

        test('_showProgressBar가 0.3초 후 프로그레스 바를 표시해야 한다', () => {
            const mockEl = { style: { opacity: '0', width: '0%' } };
            router.progressBarElement = mockEl;
            router._showProgressBar();

            // 0.3초 전에는 변하지 않음
            expect(mockEl.style.opacity).toBe('0');

            // 0.3초 후 표시
            jest.advanceTimersByTime(300);
            expect(mockEl.style.opacity).toBe('1');
            expect(mockEl.style.width).toBe('70%');
        });

        test('_showProgressBar가 기존 타이머를 초기화해야 한다', () => {
            router.progressBarTimer = 12345; // 가짜 타이머 ID
            const clearSpy = jest.spyOn(global, 'clearTimeout');
            router._showProgressBar();
            expect(clearSpy).toHaveBeenCalledWith(12345);
        });

        test('_hideProgressBar가 프로그레스 바를 숨겨야 한다', () => {
            const mockEl = { style: { opacity: '1', width: '70%' } };
            router.progressBarElement = mockEl;
            router.progressBarTimer = 12345;

            router._hideProgressBar();

            // 즉시 width 100%
            expect(mockEl.style.width).toBe('100%');
            expect(router.progressBarTimer).toBeNull();

            // 0.2초 후 opacity 0
            jest.advanceTimersByTime(200);
            expect(mockEl.style.opacity).toBe('0');
            expect(mockEl.style.width).toBe('0%');
        });

        test('_hideProgressBar가 progressBarElement 없이도 안전해야 한다', () => {
            router.progressBarElement = null;
            expect(() => router._hideProgressBar()).not.toThrow();
        });

        test('_showProgressBar가 progressBarElement 없이도 안전해야 한다', () => {
            router.progressBarElement = null;
            router._showProgressBar();
            jest.advanceTimersByTime(300);
            // 에러 없이 완료
        });
    });

    // === cleanupPreviousPages ===
    describe('cleanupPreviousPages', () => {
        beforeEach(() => {
            router = new ViewLogicRouter({ mode: 'hash' });
        });

        test('page-exiting 컨테이너를 제거해야 한다', () => {
            const exitingEl = { remove: jest.fn(), classList: { contains: jest.fn(() => true) } };
            jest.spyOn(document, 'getElementById').mockReturnValue({
                querySelectorAll: jest.fn(() => [exitingEl]),
                querySelector: jest.fn(() => null)
            });

            router.cleanupPreviousPages();
            expect(exitingEl.remove).toHaveBeenCalled();
        });

        test('이전 Vue 앱을 unmount해야 한다', () => {
            const mockApp = { unmount: jest.fn() };
            router.previousVueApp = mockApp;
            jest.spyOn(document, 'getElementById').mockReturnValue({
                querySelectorAll: jest.fn(() => []),
                querySelector: jest.fn(() => null)
            });

            router.cleanupPreviousPages();
            expect(mockApp.unmount).toHaveBeenCalled();
            expect(router.previousVueApp).toBeNull();
        });

        test('unmount 에러를 무시해야 한다', () => {
            router.previousVueApp = { unmount: jest.fn(() => { throw new Error('already unmounted'); }) };
            jest.spyOn(document, 'getElementById').mockReturnValue({
                querySelectorAll: jest.fn(() => []),
                querySelector: jest.fn(() => null)
            });

            expect(() => router.cleanupPreviousPages()).not.toThrow();
            expect(router.previousVueApp).toBeNull();
        });

        test('로딩 엘리먼트를 제거해야 한다', () => {
            const loadingEl = { remove: jest.fn() };
            jest.spyOn(document, 'getElementById').mockReturnValue({
                querySelectorAll: jest.fn(() => []),
                querySelector: jest.fn((sel) => sel === '.loading' ? loadingEl : null)
            });

            router.cleanupPreviousPages();
            expect(loadingEl.remove).toHaveBeenCalled();
        });

        test('appElement가 없으면 즉시 반환해야 한다', () => {
            jest.spyOn(document, 'getElementById').mockReturnValue(null);
            expect(() => router.cleanupPreviousPages()).not.toThrow();
        });
    });

    // === destroy 상세 ===
    describe('destroy', () => {
        test('currentVueApp을 unmount해야 한다', () => {
            router = new ViewLogicRouter({ mode: 'hash' });
            const mockApp = { unmount: jest.fn() };
            router.currentVueApp = mockApp;
            router.destroy();
            expect(mockApp.unmount).toHaveBeenCalled();
            expect(router.currentVueApp).toBeNull();
        });

        test('previousVueApp을 unmount해야 한다', () => {
            router = new ViewLogicRouter({ mode: 'hash' });
            const mockApp = { unmount: jest.fn() };
            router.previousVueApp = mockApp;
            router.destroy();
            expect(mockApp.unmount).toHaveBeenCalled();
            expect(router.previousVueApp).toBeNull();
        });

        test('currentVueApp과 previousVueApp 모두 unmount해야 한다', () => {
            router = new ViewLogicRouter({ mode: 'hash' });
            const mockCurrent = { unmount: jest.fn() };
            const mockPrevious = { unmount: jest.fn() };
            router.currentVueApp = mockCurrent;
            router.previousVueApp = mockPrevious;
            router.destroy();
            expect(mockCurrent.unmount).toHaveBeenCalled();
            expect(mockPrevious.unmount).toHaveBeenCalled();
        });

        test('앱 DOM을 정리해야 한다', () => {
            router = new ViewLogicRouter({ mode: 'hash' });
            const appEl = { innerHTML: '<div>content</div>' };
            jest.spyOn(document, 'getElementById').mockReturnValue(appEl);
            router.destroy();
            expect(appEl.innerHTML).toBe('');
        });
    });

    // === 초기화 실패 및 waitForReady ===
    describe('초기화 및 waitForReady', () => {
        test('waitForReady가 이미 준비되었으면 즉시 반환해야 한다', async () => {
            router = new ViewLogicRouter({ mode: 'hash' });
            router.isReady = true;
            const result = await router.waitForReady();
            expect(result).toBe(true);
        });

        test('refreshToken 옵션이 refreshFunction으로 매핑되어야 한다', () => {
            const fn = jest.fn();
            router = new ViewLogicRouter({ mode: 'hash', refreshToken: fn });
            expect(router.config.refreshFunction).toBe(fn);
        });

        test('init에서 hash가 없으면 #/로 설정해야 한다', () => {
            window.location.hash = '';
            router = new ViewLogicRouter({ mode: 'hash' });
            // loadRoute가 트리거되지 않도록 격리
            jest.spyOn(router, 'loadRoute').mockResolvedValue();
            // rAF 콜백이 실행되면 hash가 설정됨
            const lastCall = rAFSpy.mock.calls[rAFSpy.mock.calls.length - 1];
            if (lastCall) {
                lastCall[0]();
                expect(window.location.hash).toBe('#/');
            }
        });
    });

    // === loadRoute ===
    describe('loadRoute', () => {
        beforeEach(() => {
            router = new ViewLogicRouter({ mode: 'hash' });
            // 핵심 의존성 mock
            jest.spyOn(router.routeLoader, 'createVueComponent')
                .mockResolvedValue({ name: 'TestComp', template: '<div>test</div>' });
            jest.spyOn(router, 'renderComponentWithTransition')
                .mockResolvedValue();
        });

        test('transitionInProgress가 true이면 즉시 반환해야 한다', async () => {
            router.transitionInProgress = true;
            await router.loadRoute('users');
            expect(router.routeLoader.createVueComponent).not.toHaveBeenCalled();
        });

        test('transitionInProgress 플래그를 관리해야 한다', async () => {
            expect(router.transitionInProgress).toBe(false);
            const promise = router.loadRoute('home');
            expect(router.transitionInProgress).toBe(true);
            await promise;
            expect(router.transitionInProgress).toBe(false);
        });

        test('성공 흐름: createVueComponent → renderComponentWithTransition', async () => {
            // document.getElementById('app')이 유효한 요소를 반환하도록 mock
            jest.spyOn(document, 'getElementById').mockReturnValue({
                appendChild: jest.fn(),
                innerHTML: '',
                querySelectorAll: jest.fn(() => [])
            });

            await router.loadRoute('home');

            expect(router.routeLoader.createVueComponent).toHaveBeenCalledWith('home');
            expect(router.renderComponentWithTransition).toHaveBeenCalled();
        });

        test('인증 실패 시 loginRoute로 리다이렉트해야 한다', async () => {
            router.authManager = {
                checkAuthentication: jest.fn().mockResolvedValue({ allowed: false }),
                emitAuthEvent: jest.fn()
            };
            const navigateSpy = jest.spyOn(router, 'navigateTo').mockImplementation(() => {});

            await router.loadRoute('dashboard');

            expect(navigateSpy).toHaveBeenCalledWith('login', { redirect: 'dashboard' });
            expect(router.routeLoader.createVueComponent).not.toHaveBeenCalled();
        });

        test('loginRoute 자체 접근 시 redirect 파라미터 없이 이동해야 한다', async () => {
            router.authManager = {
                checkAuthentication: jest.fn().mockResolvedValue({ allowed: false }),
                emitAuthEvent: jest.fn()
            };
            const navigateSpy = jest.spyOn(router, 'navigateTo').mockImplementation(() => {});

            await router.loadRoute('login');

            expect(navigateSpy).toHaveBeenCalledWith('login');
        });

        test('에러 발생 시 errorHandler.handleRouteError를 호출해야 한다', async () => {
            jest.spyOn(document, 'getElementById').mockReturnValue({
                appendChild: jest.fn(),
                innerHTML: '',
                querySelectorAll: jest.fn(() => [])
            });
            router.routeLoader.createVueComponent.mockRejectedValue(new Error('Route not found'));
            jest.spyOn(router.errorHandler, 'handleRouteError').mockResolvedValue();

            await router.loadRoute('nonexistent');

            expect(router.errorHandler.handleRouteError).toHaveBeenCalledWith('nonexistent', expect.any(Error));
            expect(router.transitionInProgress).toBe(false);
        });

        test('authManager가 없으면 인증을 건너뛰어야 한다', async () => {
            jest.spyOn(document, 'getElementById').mockReturnValue({
                appendChild: jest.fn(),
                innerHTML: '',
                querySelectorAll: jest.fn(() => [])
            });
            router.authManager = null;
            await router.loadRoute('home');

            expect(router.routeLoader.createVueComponent).toHaveBeenCalledWith('home');
            expect(router.renderComponentWithTransition).toHaveBeenCalled();
        });
    });
});
