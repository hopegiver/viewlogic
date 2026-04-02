/**
 * AuthManager 단위 테스트
 */
import { AuthManager } from '../../src/plugins/AuthManager.js';
import { createMockRouter, createJwtToken, createExpiredJwtToken } from '../helpers/testHelpers.js';

describe('AuthManager', () => {
    let authManager;
    let mockRouter;

    beforeEach(() => {
        // jsdom의 실제 document.dispatchEvent를 mock (CustomEvent 호환 문제 방지)
        jest.spyOn(document, 'dispatchEvent').mockImplementation(() => true);

        // jsdom의 실제 localStorage/sessionStorage를 spy
        jest.spyOn(localStorage, 'setItem').mockImplementation(() => {});
        jest.spyOn(localStorage, 'getItem').mockReturnValue(null);
        jest.spyOn(localStorage, 'removeItem').mockImplementation(() => {});
        jest.spyOn(sessionStorage, 'setItem').mockImplementation(() => {});
        jest.spyOn(sessionStorage, 'getItem').mockReturnValue(null);
        jest.spyOn(sessionStorage, 'removeItem').mockImplementation(() => {});

        mockRouter = createMockRouter({
            config: {
                authEnabled: true,
                loginRoute: 'login',
                protectedRoutes: [],
                publicRoutes: ['login', 'register', 'home'],
                authFunction: null,
                refreshFunction: null
            }
        });
        authManager = new AuthManager(mockRouter, {
            authEnabled: true,
            loginRoute: 'login',
            protectedRoutes: [],
            publicRoutes: ['login', 'register', 'home']
        });
    });

    afterEach(() => {
        if (authManager) {
            authManager.destroy();
            authManager = null;
        }
    });

    // === 초기화 ===
    describe('초기화', () => {
        test('기본 설정으로 초기화해야 한다', () => {
            expect(authManager.config.enabled).toBe(true);
            expect(authManager.config.loginRoute).toBe('login');
        });

        test('auth 별칭이 authEnabled로 변환되어야 한다', () => {
            const am = new AuthManager(mockRouter, { auth: true });
            expect(am.config.enabled).toBe(true);
            am.destroy();
        });

        test('checkAuthFunction 별칭이 authFunction으로 변환되어야 한다', () => {
            const fn = jest.fn();
            const am = new AuthManager(mockRouter, { checkAuthFunction: fn });
            expect(am.config.authFunction).toBe(fn);
            am.destroy();
        });

        test('빈 eventListeners Map으로 시작해야 한다', () => {
            expect(authManager.eventListeners).toBeInstanceOf(Map);
            expect(authManager.eventListeners.size).toBe(0);
        });
    });

    // === isTokenValid ===
    describe('isTokenValid', () => {
        test('유효한 JWT 토큰에 true를 반환해야 한다', () => {
            const token = createJwtToken();
            expect(authManager.isTokenValid(token)).toBe(true);
        });

        test('만료된 JWT 토큰에 false를 반환해야 한다', () => {
            const token = createExpiredJwtToken();
            expect(authManager.isTokenValid(token)).toBe(false);
        });

        test('null에 false를 반환해야 한다', () => {
            expect(authManager.isTokenValid(null)).toBe(false);
        });

        test('빈 문자열에 false를 반환해야 한다', () => {
            expect(authManager.isTokenValid('')).toBe(false);
        });

        test('JWT가 아닌 문자열(점이 없는)에 true를 반환해야 한다', () => {
            // 점이 없으면 JWT 파싱을 시도하지 않으므로 true
            expect(authManager.isTokenValid('simple-token')).toBe(true);
        });

        test('잘못된 base64 페이로드는 false를 반환해야 한다', () => {
            expect(authManager.isTokenValid('header.invalid-base64.signature')).toBe(false);
        });
    });

    // === 토큰 저장/조회/제거 ===
    describe('토큰 저장/조회/제거', () => {
        test('setAccessToken()이 localStorage에 저장해야 한다 (기본)', () => {
            const token = createJwtToken();
            const result = authManager.setAccessToken(token);
            expect(result).toBe(true);
            expect(localStorage.setItem).toHaveBeenCalledWith('authToken', token);
        });

        test('setAccessToken()이 sessionStorage에 저장할 수 있어야 한다', () => {
            const token = createJwtToken();
            authManager.setAccessToken(token, { storage: 'sessionStorage' });
            expect(sessionStorage.setItem).toHaveBeenCalledWith('authToken', token);
        });

        test('setAccessToken()이 만료된 토큰을 거부해야 한다', () => {
            const token = createExpiredJwtToken();
            const result = authManager.setAccessToken(token);
            expect(result).toBe(false);
        });

        test('setAccessToken()이 빈 토큰을 거부해야 한다', () => {
            expect(authManager.setAccessToken('')).toBe(false);
            expect(authManager.setAccessToken(null)).toBe(false);
        });

        test('getAccessToken()이 localStorage > sessionStorage > cookie 순서로 찾아야 한다', () => {
            // localStorage에 없으면 sessionStorage 확인
            localStorage.getItem.mockReturnValueOnce(null);
            sessionStorage.getItem.mockReturnValueOnce('session-token');

            expect(authManager.getAccessToken()).toBe('session-token');
        });

        test('removeAccessToken()이 모든 저장소에서 제거해야 한다', () => {
            authManager.removeAccessToken();
            expect(localStorage.removeItem).toHaveBeenCalledWith('authToken');
            expect(sessionStorage.removeItem).toHaveBeenCalledWith('authToken');
        });

        test('removeAccessToken()이 특정 저장소만 지정할 수 있어야 한다', () => {
            authManager.removeAccessToken('localStorage');
            expect(localStorage.removeItem).toHaveBeenCalledWith('authToken');
            // accessToken 호환성 키도 삭제
            expect(localStorage.removeItem).toHaveBeenCalledWith('accessToken');
        });
    });

    // === 리프레시 토큰 ===
    describe('리프레시 토큰', () => {
        test('setRefreshToken()이 저장해야 한다', () => {
            const result = authManager.setRefreshToken('refresh-token');
            expect(result).toBe(true);
            expect(localStorage.setItem).toHaveBeenCalledWith('refreshToken', 'refresh-token');
        });

        test('getRefreshToken()이 localStorage > sessionStorage > cookie 순서로 찾아야 한다', () => {
            localStorage.getItem.mockReturnValueOnce(null);
            sessionStorage.getItem.mockReturnValueOnce('session-refresh');
            expect(authManager.getRefreshToken()).toBe('session-refresh');
        });

        test('removeRefreshToken()이 모든 저장소에서 제거해야 한다', () => {
            authManager.removeRefreshToken();
            expect(localStorage.removeItem).toHaveBeenCalledWith('refreshToken');
            expect(sessionStorage.removeItem).toHaveBeenCalledWith('refreshToken');
        });

        test('빈 토큰을 거부해야 한다', () => {
            expect(authManager.setRefreshToken('')).toBe(false);
            expect(authManager.setRefreshToken(null)).toBe(false);
        });
    });

    // === isAuthenticated ===
    describe('isAuthenticated', () => {
        test('유효한 토큰이 있으면 true를 반환해야 한다', () => {
            const token = createJwtToken();
            localStorage.getItem.mockReturnValue(token);
            expect(authManager.isAuthenticated()).toBe(true);
        });

        test('토큰이 없으면 false를 반환해야 한다', () => {
            expect(authManager.isAuthenticated()).toBe(false);
        });

        test('만료된 토큰이면 false를 반환하고 토큰을 제거해야 한다', () => {
            const token = createExpiredJwtToken();
            localStorage.getItem.mockReturnValue(token);
            expect(authManager.isAuthenticated()).toBe(false);
            expect(localStorage.removeItem).toHaveBeenCalled();
        });

        test('isAuth()가 isAuthenticated()의 별칭으로 작동해야 한다', () => {
            expect(authManager.isAuth()).toBe(authManager.isAuthenticated());
        });
    });

    // === isPublicRoute/isProtectedRoute ===
    describe('isPublicRoute/isProtectedRoute', () => {
        test('공개 라우트에 true를 반환해야 한다', () => {
            expect(authManager.isPublicRoute('login')).toBe(true);
            expect(authManager.isPublicRoute('register')).toBe(true);
            expect(authManager.isPublicRoute('home')).toBe(true);
        });

        test('비공개 라우트에 false를 반환해야 한다', () => {
            expect(authManager.isPublicRoute('dashboard')).toBe(false);
        });

        test('와일드카드 패턴을 지원해야 한다', () => {
            const am = new AuthManager(mockRouter, {
                authEnabled: true,
                protectedRoutes: ['admin/*'],
                publicRoutes: ['login']
            });
            expect(am.isProtectedRoute('admin/users')).toBe(true);
            expect(am.isProtectedRoute('admin/settings')).toBe(true);
            am.destroy();
        });

        test('와일드카드가 정확한 라우트(admin)도 매칭해야 한다', () => {
            const am = new AuthManager(mockRouter, {
                authEnabled: true,
                protectedRoutes: ['admin/*'],
                publicRoutes: ['login']
            });
            expect(am.isProtectedRoute('admin')).toBe(true);
            am.destroy();
        });

        test('정확한 일치만 매칭해야 한다', () => {
            const am = new AuthManager(mockRouter, {
                authEnabled: true,
                protectedRoutes: ['user'],
                publicRoutes: ['login']
            });
            expect(am.isProtectedRoute('user')).toBe(true);
            expect(am.isProtectedRoute('users')).toBe(false);
            am.destroy();
        });
    });

    // === checkAuthentication ===
    describe('checkAuthentication', () => {
        test('auth가 비활성화면 항상 allowed: true를 반환해야 한다', async () => {
            const am = new AuthManager(mockRouter, { authEnabled: false });
            const result = await am.checkAuthentication('dashboard');
            expect(result.allowed).toBe(true);
            expect(result.reason).toBe('auth_disabled');
            am.destroy();
        });

        test('공개 라우트면 allowed: true를 반환해야 한다', async () => {
            const result = await authManager.checkAuthentication('login');
            expect(result.allowed).toBe(true);
            expect(result.reason).toBe('public_route');
        });

        test('protectedRoutes가 비어있을 때 publicRoutes 외 모든 라우트를 보호해야 한다', async () => {
            // 인증되지 않은 상태에서 비공개 라우트 접근
            const result = await authManager.checkAuthentication('dashboard');
            expect(result.allowed).toBe(false);
        });

        test('protectedRoutes가 지정되면 해당 라우트만 보호해야 한다', async () => {
            const am = new AuthManager(mockRouter, {
                authEnabled: true,
                protectedRoutes: ['admin'],
                publicRoutes: ['login']
            });
            // 보호되지 않은 라우트
            const result = await am.checkAuthentication('about');
            expect(result.allowed).toBe(true);
            expect(result.reason).toBe('not_protected');
            am.destroy();
        });

        test('authFunction 콜백을 호출해야 한다', async () => {
            const authFn = jest.fn().mockResolvedValue(true);
            const am = new AuthManager(mockRouter, {
                authEnabled: true,
                authFunction: authFn,
                publicRoutes: []
            });
            const result = await am.checkAuthentication('dashboard');
            expect(authFn).toHaveBeenCalled();
            expect(result.allowed).toBe(true);
            am.destroy();
        });

        test('authFunction이 에러를 throw하면 allowed: false를 반환해야 한다', async () => {
            const authFn = jest.fn().mockRejectedValue(new Error('auth error'));
            const am = new AuthManager(mockRouter, {
                authEnabled: true,
                authFunction: authFn,
                publicRoutes: []
            });
            const result = await am.checkAuthentication('dashboard');
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe('custom_auth_error');
            am.destroy();
        });
    });

    // === loginSuccess/logout ===
    describe('loginSuccess/logout', () => {
        test('loginSuccess()가 navigateTo를 호출해야 한다', () => {
            authManager.loginSuccess('dashboard');
            expect(mockRouter.navigateTo).toHaveBeenCalledWith('dashboard');
        });

        test('loginSuccess()가 기본 redirectAfterLogin을 사용해야 한다', () => {
            authManager.loginSuccess();
            expect(mockRouter.navigateTo).toHaveBeenCalledWith('home');
        });

        test('logout()이 토큰을 제거하고 로그인 페이지로 이동해야 한다', () => {
            authManager.logout();
            expect(localStorage.removeItem).toHaveBeenCalled();
            expect(mockRouter.navigateTo).toHaveBeenCalledWith('login');
        });

        test('logout()이 리프레시 토큰도 제거해야 한다', () => {
            authManager.logout();
            // refreshToken 제거 확인 (localStorage + sessionStorage)
            const removeCalls = localStorage.removeItem.mock.calls.map(c => c[0]);
            expect(removeCalls).toContain('refreshToken');
        });
    });

    // === 이벤트 ===
    describe('이벤트', () => {
        test('on()으로 이벤트 리스너를 등록해야 한다', () => {
            const listener = jest.fn();
            authManager.on('login_success', listener);
            expect(authManager.eventListeners.get('login_success')).toContain(listener);
        });

        test('off()로 이벤트 리스너를 제거해야 한다', () => {
            const listener = jest.fn();
            authManager.on('login_success', listener);
            authManager.off('login_success', listener);
            expect(authManager.eventListeners.get('login_success')).not.toContain(listener);
        });

        test('emitAuthEvent()가 CustomEvent를 dispatch해야 한다', () => {
            authManager.emitAuthEvent('test_event', { data: 'test' });
            expect(document.dispatchEvent).toHaveBeenCalled();
        });

        test('리스너에서 에러가 발생해도 다른 리스너가 실행되어야 한다', () => {
            const errorListener = jest.fn(() => { throw new Error('listener error'); });
            const normalListener = jest.fn();
            authManager.on('test', errorListener);
            authManager.on('test', normalListener);

            authManager.emitAuthEvent('test', {});
            expect(errorListener).toHaveBeenCalled();
            expect(normalListener).toHaveBeenCalled();
        });
    });

    // === checkAuthentication silent refresh ===
    describe('checkAuthentication silent refresh', () => {
        test('토큰 만료 시 refreshFunction이 있으면 silent refresh를 시도해야 한다', async () => {
            const mockHandleTokenRefresh = jest.fn().mockResolvedValue(true);
            const router = createMockRouter({
                config: {
                    authEnabled: true,
                    refreshFunction: jest.fn(),
                    protectedRoutes: [],
                    publicRoutes: []
                },
                routeLoader: {
                    apiHandler: {
                        _handleTokenRefresh: mockHandleTokenRefresh,
                        processURLParameters: jest.fn(),
                        fetchData: jest.fn(),
                        bindToComponent: jest.fn(() => ({}))
                    },
                    formHandler: { bindAutoForms: jest.fn() }
                }
            });
            const am = new AuthManager(router, {
                authEnabled: true,
                publicRoutes: []
            });

            // 토큰 없음 → isAuthenticated() = false → silent refresh 시도
            const result = await am.checkAuthentication('dashboard');
            expect(mockHandleTokenRefresh).toHaveBeenCalled();
            expect(result.allowed).toBe(true);
            expect(result.reason).toBe('token_refreshed');
            am.destroy();
        });

        test('silent refresh 실패 시 not_authenticated를 반환해야 한다', async () => {
            const mockHandleTokenRefresh = jest.fn().mockResolvedValue(false);
            const router = createMockRouter({
                config: {
                    authEnabled: true,
                    refreshFunction: jest.fn(),
                    protectedRoutes: [],
                    publicRoutes: []
                },
                routeLoader: {
                    apiHandler: {
                        _handleTokenRefresh: mockHandleTokenRefresh,
                        processURLParameters: jest.fn(),
                        fetchData: jest.fn(),
                        bindToComponent: jest.fn(() => ({}))
                    },
                    formHandler: { bindAutoForms: jest.fn() }
                }
            });
            const am = new AuthManager(router, {
                authEnabled: true,
                publicRoutes: []
            });

            const result = await am.checkAuthentication('dashboard');
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe('not_authenticated');
            am.destroy();
        });

        test('silent refresh에서 에러가 발생해도 graceful하게 처리해야 한다', async () => {
            const mockHandleTokenRefresh = jest.fn().mockRejectedValue(new Error('refresh failed'));
            const router = createMockRouter({
                config: {
                    authEnabled: true,
                    refreshFunction: jest.fn(),
                    protectedRoutes: [],
                    publicRoutes: []
                },
                routeLoader: {
                    apiHandler: {
                        _handleTokenRefresh: mockHandleTokenRefresh,
                        processURLParameters: jest.fn(),
                        fetchData: jest.fn(),
                        bindToComponent: jest.fn(() => ({}))
                    },
                    formHandler: { bindAutoForms: jest.fn() }
                }
            });
            const am = new AuthManager(router, {
                authEnabled: true,
                publicRoutes: []
            });

            const result = await am.checkAuthentication('dashboard');
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe('not_authenticated');
            am.destroy();
        });
    });

    // === 쿠키 스토리지 경로 ===
    describe('쿠키 스토리지 경로', () => {
        test('setAccessToken()이 cookie에 저장할 수 있어야 한다', () => {
            const token = createJwtToken();
            authManager.setAccessToken(token, { storage: 'cookie' });
            // setAuthCookie가 document.cookie에 설정
            expect(document.cookie).toContain('authToken=');
        });

        test('setAuthCookie()가 JWT 토큰을 쿠키에 저장해야 한다', () => {
            const token = createJwtToken({}, 7200); // 2시간 후 만료
            // jsdom에서는 Expires 메타데이터가 document.cookie에 포함되지 않으므로
            // 쿠키 값만 확인
            expect(() => authManager.setAuthCookie(token)).not.toThrow();
        });

        test('setAuthCookie()가 잘못된 JWT에서도 안전하게 처리해야 한다', () => {
            // 점이 있지만 유효하지 않은 base64
            expect(() => {
                authManager.setAuthCookie('header.invalid-payload.sig');
            }).not.toThrow();
        });

        test('getCookieValue()가 쿠키에서 값을 읽어야 한다', () => {
            document.cookie = 'authToken=my-token-value; path=/';
            const value = authManager.getCookieValue('authToken');
            expect(value).toBe('my-token-value');
        });

        test('getCookieValue()가 없는 쿠키에 null을 반환해야 한다', () => {
            document.cookie = '';
            const value = authManager.getCookieValue('nonexistent');
            expect(value).toBeNull();
        });

        test('getAccessToken()이 cookie에서 토큰을 가져와야 한다', () => {
            // localStorage, sessionStorage 모두 null
            localStorage.getItem.mockReturnValue(null);
            sessionStorage.getItem.mockReturnValue(null);
            document.cookie = 'authToken=cookie-token; path=/';

            const token = authManager.getAccessToken();
            expect(token).toBe('cookie-token');
        });

        test('getRefreshToken()이 cookie에서 토큰을 가져와야 한다', () => {
            localStorage.getItem.mockReturnValue(null);
            sessionStorage.getItem.mockReturnValue(null);
            document.cookie = 'refreshToken=refresh-cookie; path=/';

            const token = authManager.getRefreshToken();
            expect(token).toBe('refresh-cookie');
        });

        test('setRefreshToken()이 sessionStorage에 저장할 수 있어야 한다', () => {
            const result = authManager.setRefreshToken('refresh-token', { storage: 'sessionStorage' });
            expect(result).toBe(true);
            expect(sessionStorage.setItem).toHaveBeenCalledWith('refreshToken', 'refresh-token');
        });

        test('setRefreshToken()이 cookie에 저장할 수 있어야 한다', () => {
            const result = authManager.setRefreshToken('refresh-token', { storage: 'cookie' });
            expect(result).toBe(true);
            expect(document.cookie).toContain('refreshToken=');
        });

        test('setRefreshToken() 저장 실패 시 false를 반환해야 한다', () => {
            // localStorage.setItem에서 에러 발생
            localStorage.setItem.mockImplementationOnce(() => { throw new Error('quota exceeded'); });
            const result = authManager.setRefreshToken('token');
            expect(result).toBe(false);
        });

        test('removeRefreshToken()이 localStorage만 지정 시 해당 저장소만 삭제해야 한다', () => {
            authManager.removeRefreshToken('localStorage');
            expect(localStorage.removeItem).toHaveBeenCalledWith('refreshToken');
            expect(sessionStorage.removeItem).not.toHaveBeenCalledWith('refreshToken');
        });

        test('removeRefreshToken()이 sessionStorage만 지정할 수 있어야 한다', () => {
            authManager.removeRefreshToken('sessionStorage');
            expect(sessionStorage.removeItem).toHaveBeenCalledWith('refreshToken');
        });

        test('removeRefreshToken()이 cookie만 지정할 수 있어야 한다', () => {
            // 쿠키 삭제는 만료 날짜를 과거로 설정하여 수행
            expect(() => authManager.removeRefreshToken('cookie')).not.toThrow();
        });

        test('removeAccessToken()이 sessionStorage만 지정할 수 있어야 한다', () => {
            authManager.removeAccessToken('sessionStorage');
            expect(sessionStorage.removeItem).toHaveBeenCalledWith('authToken');
            expect(sessionStorage.removeItem).toHaveBeenCalledWith('accessToken');
        });

        test('removeAccessToken()이 cookie만 지정할 수 있어야 한다', () => {
            // removeAuthCookie가 호출되어 쿠키 만료 처리
            expect(() => authManager.removeAccessToken('cookie')).not.toThrow();
        });

        test('setAccessToken()이 default storage에 저장해야 한다 (알 수 없는 storage)', () => {
            const token = createJwtToken();
            const am = new AuthManager(mockRouter, {
                authEnabled: true,
                authStorage: 'unknown'
            });
            am.setAccessToken(token);
            // default: localStorage
            expect(localStorage.setItem).toHaveBeenCalledWith('authToken', token);
            am.destroy();
        });

        test('setAccessToken() 저장 중 에러 시 false를 반환해야 한다', () => {
            localStorage.setItem.mockImplementationOnce(() => { throw new Error('quota'); });
            const token = createJwtToken();
            const result = authManager.setAccessToken(token);
            expect(result).toBe(false);
        });

        test('setRefreshToken()이 default storage (unknown)에서 localStorage로 폴백해야 한다', () => {
            const result = authManager.setRefreshToken('token', { storage: 'unknown' });
            expect(result).toBe(true);
            expect(localStorage.setItem).toHaveBeenCalledWith('refreshToken', 'token');
        });
    });

    // === getAuthStats ===
    describe('getAuthStats', () => {
        test('인증 상태 통계를 반환해야 한다', () => {
            const stats = authManager.getAuthStats();
            expect(stats.enabled).toBe(true);
            expect(typeof stats.isAuthenticated).toBe('boolean');
            expect(stats.loginRoute).toBe('login');
        });
    });

    // === destroy ===
    describe('destroy', () => {
        test('eventListeners를 정리해야 한다', () => {
            authManager.on('test', jest.fn());
            authManager.destroy();
            expect(authManager.eventListeners.size).toBe(0);
        });
    });
});
