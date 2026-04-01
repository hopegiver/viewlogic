/**
 * ViewLogic Authentication Management System
 * 인증 관리 시스템
 */
export class AuthManager {
    constructor(router, options = {}) {
        this.config = {
            enabled: options.authEnabled ?? options.auth ?? false,
            loginRoute: options.loginRoute || 'login',
            protectedRoutes: options.protectedRoutes || [],
            publicRoutes: options.publicRoutes || ['login', 'register', 'home'],
            authFunction: options.authFunction ?? options.checkAuthFunction ?? null,
            redirectAfterLogin: options.redirectAfterLogin || 'home',
            authCookieName: options.authCookieName || 'authToken',
            authStorage: options.authStorage || 'localStorage'
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
        if (typeof this.config.authFunction === 'function') {
            try {
                // 가벼운 route 객체 생성 (컴포넌트와 동일한 API 경험 제공)
                const route = {
                    name: routeName,
                    $api: this.router.routeLoader.apiHandler.bindToComponent({}),
                    $state: this.router.stateHandler
                };

                const isAuthenticated = await this.config.authFunction(route);
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
        const isAuthenticated = this.isAuthenticated();
        return {
            allowed: isAuthenticated, 
            reason: isAuthenticated ? 'authenticated' : 'not_authenticated',
            routeName
        };
    }

    /**
     * JWT 토큰 검증
     */
    isTokenValid(token) {
        if (!token) return false;

        try {
            if (token.includes('.')) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                if (payload.exp && Date.now() >= payload.exp * 1000) {
                    return false; // 만료됨
                }
            }
            return true;
        } catch (error) {
            this.log('warn', 'Token validation failed:', error);
            return false;
        }
    }

    /**
     * 사용자 인증 상태 확인
     */
    isAuthenticated() {
        this.log('debug', '🔍 Checking user authentication status');

        const token = this.getAccessToken();
        if (!token) {
            this.log('debug', '❌ No token found');
            return false;
        }

        if (!this.isTokenValid(token)) {
            this.log('debug', 'Token expired, removing...');
            this.removeAccessToken();
            return false;
        }

        this.log('debug', '✅ Valid token found');
        return true;
    }

    /**
     * 사용자 인증 상태 확인 (단축 버전)
     * Alias for isAuthenticated()
     */
    isAuth() {
        return this.isAuthenticated();
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
        for (const route of this.config.protectedRoutes) {
            // 와일드카드 패턴 (예: 'admin/*')
            if (route.endsWith('/*')) {
                const prefix = route.slice(0, -2);
                if (routeName === prefix || routeName.startsWith(prefix + '/')) {
                    return true;
                }
            }
            // 정확한 일치
            else if (route === routeName) {
                return true;
            }
        }
        return false;
    }

    /**
     * 인증 쿠키 가져오기
     */
    getAuthCookie() {
        return this.getCookieValue(this.config.authCookieName);
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
        document.cookie = `${this.config.authCookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        this.log('debug', 'Auth cookie removed');
    }

    /**
     * 액세스 토큰 가져오기
     */
    getAccessToken() {
        // localStorage 우선 확인
        let token = localStorage.getItem('authToken');
        if (token) return token;

        // sessionStorage 확인
        token = sessionStorage.getItem('authToken');
        if (token) return token;

        // 쿠키 확인
        return this.getAuthCookie();
    }

    /**
     * 리프레시 토큰 가져오기
     */
    getRefreshToken() {
        let token = localStorage.getItem('refreshToken');
        if (token) return token;

        token = sessionStorage.getItem('refreshToken');
        if (token) return token;

        return this.getCookieValue('refreshToken');
    }

    /**
     * 리프레시 토큰 설정
     */
    setRefreshToken(token, options = {}) {
        if (!token) {
            this.log('warn', '빈 리프레시 토큰 제공됨');
            return false;
        }

        const storage = options.storage || this.config.authStorage;

        try {
            switch (storage) {
                case 'localStorage':
                    localStorage.setItem('refreshToken', token);
                    break;
                case 'sessionStorage':
                    sessionStorage.setItem('refreshToken', token);
                    break;
                case 'cookie':
                    const secure = window.location.protocol === 'https:';
                    let cookieString = `refreshToken=${encodeURIComponent(token)}; path=/; SameSite=Strict`;
                    if (secure) cookieString += '; Secure';
                    document.cookie = cookieString;
                    break;
                default:
                    localStorage.setItem('refreshToken', token);
            }

            this.emitAuthEvent('refresh_token_set', { storage });
            this.log('debug', `리프레시 토큰 저장됨: ${storage}`);
            return true;
        } catch (error) {
            this.log('error', '리프레시 토큰 저장 실패:', error);
            return false;
        }
    }

    /**
     * 리프레시 토큰 제거
     */
    removeRefreshToken(storage = 'all') {
        switch (storage) {
            case 'localStorage':
                localStorage.removeItem('refreshToken');
                break;
            case 'sessionStorage':
                sessionStorage.removeItem('refreshToken');
                break;
            case 'cookie':
                document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                break;
            case 'all':
            default:
                localStorage.removeItem('refreshToken');
                sessionStorage.removeItem('refreshToken');
                document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                break;
        }
        this.log('debug', `리프레시 토큰 제거됨: ${storage}`);
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
            cookieOptions = this.config.authCookieOptions
        } = options;

        try {
            // 토큰 검증
            if (!this.isTokenValid(token)) {
                this.log('warn', '❌ Token is expired or invalid');
                return false;
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
                    this.setAuthCookie(token);
                    break;

                default:
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
            this.log('error', 'Failed to set token:', error);
            return false;
        }
    }

    /**
     * 인증 쿠키 설정
     */
    setAuthCookie(token) {
        const secure = window.location.protocol === 'https:';
        let cookieString = `${this.config.authCookieName}=${encodeURIComponent(token)}; path=/; SameSite=Strict`;

        if (secure) {
            cookieString += '; Secure';
        }

        // JWT에서 만료 시간 추출
        if (token.includes('.')) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                if (payload.exp) {
                    const expireDate = new Date(payload.exp * 1000);
                    cookieString += `; Expires=${expireDate.toUTCString()}`;
                }
            } catch (error) {
                this.log('warn', 'Could not extract expiration from JWT token');
            }
        }

        document.cookie = cookieString;
        this.log('debug', 'Auth cookie set');
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
                sessionStorage.removeItem('authToken');
                this.removeAuthCookie();
                this.removeRefreshToken('all');
                break;
        }

        this.emitAuthEvent('token_removed', { storage });
        this.log('debug', `Token removed from: ${storage}`);
    }

    /**
     * 로그인 성공 처리
     */
    loginSuccess(targetRoute = null) {
        const redirectRoute = targetRoute || this.config.redirectAfterLogin;
        
        this.log('info', `🎉 Login success, redirecting to: ${redirectRoute}`);
        
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
    logout() {
        this.log('info', '👋 Logging out user');
        
        // 모든 저장소에서 토큰 제거
        this.removeAccessToken();
        this.removeRefreshToken();

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
                    this.log('error', 'Event listener error:', error);
                }
            });
        }
        
        this.log('debug', `🔔 Auth event emitted: ${eventType}`, data);
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
            isAuthenticated: this.isAuthenticated(),
            hasToken: !!this.getAccessToken(),
            protectedRoutesCount: this.config.protectedRoutes.length,
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