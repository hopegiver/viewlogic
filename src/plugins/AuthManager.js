/**
 * ViewLogic Authentication Management System
 * 인증 관리 시스템
 */
export class AuthManager {
    constructor(router, options = {}) {
        this.config = {
            enabled: options.authEnabled || false,
            loginRoute: options.loginRoute || 'login',
            protectedRoutes: options.protectedRoutes || [],
            protectedPrefixes: options.protectedPrefixes || [],
            publicRoutes: options.publicRoutes || ['login', 'register', 'home'],
            checkAuthFunction: options.checkAuthFunction || null,
            redirectAfterLogin: options.redirectAfterLogin || 'home',
            // 쿠키/스토리지 설정
            authCookieName: options.authCookieName || 'authToken',
            authFallbackCookieNames: options.authFallbackCookieNames || ['accessToken', 'token', 'jwt'],
            authStorage: options.authStorage || 'cookie',
            authCookieOptions: options.authCookieOptions || {},
            authSkipValidation: options.authSkipValidation || false,
            debug: options.debug || false
        };
        
        // 라우터 인스턴스 참조 (필수 의존성)
        this.router = router;
        
        // 이벤트 리스너들
        this.eventListeners = new Map();
        
        this.log('info', 'AuthManager initialized', { enabled: this.config.enabled });
    }

    /**
     * 로깅 래퍼 메서드
     */
    log(level, ...args) {
        if (this.router?.errorHandler) {
            this.router.errorHandler.log(level, 'AuthManager', ...args);
        }
    }

    /**
     * 라우트 인증 확인
     */
    async checkAuthentication(routeName) {
        // 인증 시스템이 비활성화된 경우
        if (!this.config.enabled) {
            return { allowed: true, reason: 'auth_disabled' };
        }

        this.log('debug', `🔐 Checking authentication for route: ${routeName}`);

        // 공개 라우트인지 확인
        if (this.isPublicRoute(routeName)) {
            return { allowed: true, reason: 'public_route' };
        }

        // 보호된 라우트인지 확인
        const isProtected = this.isProtectedRoute(routeName);
        if (!isProtected) {
            return { allowed: true, reason: 'not_protected' };
        }

        // 사용자 정의 인증 체크 함수가 있는 경우
        if (typeof this.config.checkAuthFunction === 'function') {
            try {
                const isAuthenticated = await this.config.checkAuthFunction(routeName);
                return {
                    allowed: isAuthenticated, 
                    reason: isAuthenticated ? 'custom_auth_success' : 'custom_auth_failed',
                    routeName
                };
            } catch (error) {
                this.log('error', 'Custom auth function failed:', error);
                return { allowed: false, reason: 'custom_auth_error', error };
            }
        }

        // 기본 인증 확인
        const isAuthenticated = this.isUserAuthenticated();
        return {
            allowed: isAuthenticated, 
            reason: isAuthenticated ? 'authenticated' : 'not_authenticated',
            routeName
        };
    }

    /**
     * 사용자 인증 상태 확인
     */
    isUserAuthenticated() {
        this.log('debug', '🔍 Checking user authentication status');

        // 1. localStorage 확인
        const token = localStorage.getItem('authToken') || localStorage.getItem('accessToken');
        if (token) {
            try {
                if (token.includes('.')) {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    if (payload.exp && Date.now() >= payload.exp * 1000) {
                        this.log('debug', 'localStorage token expired, removing...');
                        localStorage.removeItem('authToken');
                        localStorage.removeItem('accessToken');
                        return false;
                    }
                }
                this.log('debug', '✅ Valid token found in localStorage');
                return true;
            } catch (error) {
                this.log('warn', 'Invalid token in localStorage:', error);
            }
        }

        // 2. sessionStorage 확인
        const sessionToken = sessionStorage.getItem('authToken') || sessionStorage.getItem('accessToken');
        if (sessionToken) {
            this.log('debug', '✅ Token found in sessionStorage');
            return true;
        }

        // 3. 쿠키 확인
        const authCookie = this.getAuthCookie();
        if (authCookie) {
            try {
                if (authCookie.includes('.')) {
                    const payload = JSON.parse(atob(authCookie.split('.')[1]));
                    if (payload.exp && Date.now() >= payload.exp * 1000) {
                        this.log('debug', 'Cookie token expired, removing...');
                        this.removeAuthCookie();
                        return false;
                    }
                }
                this.log('debug', '✅ Valid token found in cookies');
                return true;
            } catch (error) {
                this.log('warn', 'Cookie token validation failed:', error);
            }
        }

        // 4. 전역 변수 확인 (레거시 지원)
        if (window.user || window.isAuthenticated) {
            this.log('debug', '✅ Global authentication variable found');
            return true;
        }

        this.log('debug', '❌ No valid authentication found');
        return false;
    }

    /**
     * 공개 라우트인지 확인
     */
    isPublicRoute(routeName) {
        return this.config.publicRoutes.includes(routeName);
    }

    /**
     * 보호된 라우트인지 확인
     */
    isProtectedRoute(routeName) {
        // 특정 라우트가 보호된 라우트 목록에 있는지 확인
        if (this.config.protectedRoutes.includes(routeName)) {
            return true;
        }

        // prefix로 보호된 라우트인지 확인
        for (const prefix of this.config.protectedPrefixes) {
            if (routeName.startsWith(prefix)) {
                return true;
            }
        }

        return false;
    }

    /**
     * 인증 쿠키 가져오기
     */
    getAuthCookie() {
        // 주 쿠키 이름 확인
        const primaryCookie = this.getCookieValue(this.config.authCookieName);
        if (primaryCookie) {
            return primaryCookie;
        }

        // 대체 쿠키 이름들 확인
        for (const cookieName of this.config.authFallbackCookieNames) {
            const cookieValue = this.getCookieValue(cookieName);
            if (cookieValue) {
                this.log('debug', `Found auth token in fallback cookie: ${cookieName}`);
                return cookieValue;
            }
        }

        return null;
    }

    /**
     * 쿠키 값 가져오기
     */
    getCookieValue(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) {
            return decodeURIComponent(parts.pop().split(';').shift());
        }
        return null;
    }

    /**
     * 인증 쿠키 제거
     */
    removeAuthCookie() {
        const cookiesToRemove = [this.config.authCookieName, ...this.config.authFallbackCookieNames];
        
        cookiesToRemove.forEach(cookieName => {
            // 현재 경로와 루트 경로에서 모두 제거
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${window.location.pathname};`;
        });
        
        this.log('debug', 'Auth cookies removed');
    }

    /**
     * 액세스 토큰 가져오기
     */
    getAccessToken() {
        // localStorage 확인
        let token = localStorage.getItem('authToken') || localStorage.getItem('accessToken');
        if (token) return token;

        // sessionStorage 확인
        token = sessionStorage.getItem('authToken') || sessionStorage.getItem('accessToken');
        if (token) return token;

        // 쿠키 확인
        token = this.getAuthCookie();
        if (token) return token;

        return null;
    }

    /**
     * 액세스 토큰 설정
     */
    setAccessToken(token, options = {}) {
        if (!token) {
            this.log('warn', 'Empty token provided');
            return false;
        }

        const {
            storage = this.config.authStorage,
            cookieOptions = this.config.authCookieOptions,
            skipValidation = this.config.authSkipValidation
        } = options;

        try {
            // JWT 토큰 검증 (옵션)
            if (!skipValidation && token.includes('.')) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    if (payload.exp && Date.now() >= payload.exp * 1000) {
                        this.log('warn', '❌ Token is expired');
                        return false;
                    }
                    this.log('debug', '✅ JWT token validated');
                } catch (error) {
                    this.log('warn', '⚠️ JWT validation failed, but proceeding:', error.message);
                }
            }

            // 스토리지별 저장
            switch (storage) {
                case 'localStorage':
                    localStorage.setItem('authToken', token);
                    this.log('debug', 'Token saved to localStorage');
                    break;

                case 'sessionStorage':
                    sessionStorage.setItem('authToken', token);
                    this.log('debug', 'Token saved to sessionStorage');
                    break;

                case 'cookie':
                    this.setAuthCookie(token, cookieOptions);
                    break;

                default:
                    // 기본값: localStorage
                    localStorage.setItem('authToken', token);
                    this.log('debug', 'Token saved to localStorage (default)');
            }

            this.emitAuthEvent('token_set', { 
                storage,
                tokenLength: token.length,
                hasExpiration: token.includes('.')
            });

            return true;

        } catch (error) {
            this.log('Failed to set token:', error);
            return false;
        }
    }

    /**
     * 인증 쿠키 설정
     */
    setAuthCookie(token, options = {}) {
        const {
            cookieName = this.config.authCookieName,
            secure = window.location.protocol === 'https:',
            sameSite = 'Strict',
            path = '/',
            domain = null
        } = options;

        let cookieString = `${cookieName}=${encodeURIComponent(token)}; path=${path}`;

        if (secure) {
            cookieString += '; Secure';
        }

        if (sameSite) {
            cookieString += `; SameSite=${sameSite}`;
        }

        if (domain) {
            cookieString += `; Domain=${domain}`;
        }

        // JWT에서 만료 시간 추출
        try {
            if (token.includes('.')) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    if (payload.exp) {
                        const expireDate = new Date(payload.exp * 1000);
                        cookieString += `; Expires=${expireDate.toUTCString()}`;
                    }
                } catch (error) {
                    this.log('Could not extract expiration from JWT token');
                }
            }
        } catch (error) {
            this.log('Token processing error:', error);
        }

        document.cookie = cookieString;
        this.log(`Auth cookie set: ${cookieName}`);
    }

    /**
     * 토큰 제거
     */
    removeAccessToken(storage = 'all') {
        switch (storage) {
            case 'localStorage':
                localStorage.removeItem('authToken');
                localStorage.removeItem('accessToken');
                break;

            case 'sessionStorage':
                sessionStorage.removeItem('authToken');
                sessionStorage.removeItem('accessToken');
                break;

            case 'cookie':
                this.removeAuthCookie();
                break;

            case 'all':
            default:
                localStorage.removeItem('authToken');
                localStorage.removeItem('accessToken');
                sessionStorage.removeItem('authToken');
                sessionStorage.removeItem('accessToken');
                this.removeAuthCookie();
                break;
        }

        this.emitAuthEvent('token_removed', { storage });
        this.log(`Token removed from: ${storage}`);
    }

    /**
     * 로그인 성공 처리
     */
    handleLoginSuccess(targetRoute = null) {
        const redirectRoute = targetRoute || this.config.redirectAfterLogin;
        
        this.log(`🎉 Login success, redirecting to: ${redirectRoute}`);
        
        this.emitAuthEvent('login_success', { targetRoute: redirectRoute });
        
        // 라우터 인스턴스가 있으면 직접 네비게이션
        if (this.router && typeof this.router.navigateTo === 'function') {
            this.router.navigateTo(redirectRoute);
        }
        
        return redirectRoute;
    }

    /**
     * 로그아웃 처리
     */
    handleLogout() {
        this.log('👋 Logging out user');
        
        // 모든 저장소에서 토큰 제거
        this.removeAccessToken();
        
        // 전역 변수 정리
        if (window.user) window.user = null;
        if (window.isAuthenticated) window.isAuthenticated = false;
        
        this.emitAuthEvent('logout', {});
        
        // 라우터 인스턴스가 있으면 직접 네비게이션
        if (this.router && typeof this.router.navigateTo === 'function') {
            this.router.navigateTo(this.config.loginRoute);
        }
        
        return this.config.loginRoute;
    }

    /**
     * 인증 이벤트 발생
     */
    emitAuthEvent(eventType, data) {
        const event = new CustomEvent('router:auth', {
            detail: {
                type: eventType,
                timestamp: Date.now(),
                ...data
            }
        });
        
        document.dispatchEvent(event);
        
        // 내부 리스너들에게도 알림
        if (this.eventListeners.has(eventType)) {
            this.eventListeners.get(eventType).forEach(listener => {
                try {
                    listener(data);
                } catch (error) {
                    this.log('Event listener error:', error);
                }
            });
        }
        
        this.log(`🔔 Auth event emitted: ${eventType}`, data);
    }

    /**
     * 이벤트 리스너 등록
     */
    on(eventType, listener) {
        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, []);
        }
        this.eventListeners.get(eventType).push(listener);
    }

    /**
     * 이벤트 리스너 제거
     */
    off(eventType, listener) {
        if (this.eventListeners.has(eventType)) {
            const listeners = this.eventListeners.get(eventType);
            const index = listeners.indexOf(listener);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * 인증 상태 통계
     */
    getAuthStats() {
        return {
            enabled: this.config.enabled,
            isAuthenticated: this.isUserAuthenticated(),
            hasToken: !!this.getAccessToken(),
            protectedRoutesCount: this.config.protectedRoutes.length,
            protectedPrefixesCount: this.config.protectedPrefixes.length,
            publicRoutesCount: this.config.publicRoutes.length,
            storage: this.config.authStorage,
            loginRoute: this.config.loginRoute
        };
    }

    /**
     * 정리 (메모리 누수 방지)
     */
    destroy() {
        this.eventListeners.clear();
        this.log('debug', 'AuthManager destroyed');
    }
}