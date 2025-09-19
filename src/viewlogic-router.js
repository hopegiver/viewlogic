// ViewLogic Router - ES6 Module
import { I18nManager } from './plugins/I18nManager.js';
import { AuthManager } from './plugins/AuthManager.js';
import { CacheManager } from './plugins/CacheManager.js';
import { QueryManager } from './plugins/QueryManager.js';
import { RouteLoader } from './core/RouteLoader.js';
import { ErrorHandler } from './core/ErrorHandler.js';
import { StateHandler } from './core/StateHandler.js';

export class ViewLogicRouter {
    constructor(options = {}) {
        // 버전 정보
        this.version = options.version || '1.0.0';
        
        // 기본 환경설정 최적화
        this.config = this._buildConfig(options);
        
        this.currentHash = '';
        this.currentVueApp = null;
        this.previousVueApp = null; // 이전 Vue 앱 (전환 효과를 위해 보관)

        // LoadingManager가 없을 때를 위한 기본 전환 상태
        this.transitionInProgress = false;
        
        // 초기화 준비 상태
        this.isReady = false;
        this.readyPromise = null;
        
        // 이벤트 리스너 바인딩 최적화
        this._boundHandleRouteChange = this.handleRouteChange.bind(this);
        
        // 모든 초기화를 한번에 처리
        this.readyPromise = this.initialize();
    }

    /**
     * 설정 빌드 (분리하여 가독성 향상)
     */
    _buildConfig(options) {
        const currentOrigin = window.location.origin;
        
        const defaults = {
            basePath: '/',                  // 애플리케이션 기본 경로 (서브폴더 배포용)
            srcPath: '/src',               // 소스 파일 경로
            mode: 'hash',
            cacheMode: 'memory',
            cacheTTL: 300000,
            maxCacheSize: 50,
            useLayout: true,
            defaultLayout: 'default',
            environment: 'development',
            routesPath: '/routes',         // 프로덕션 라우트 경로
            enableErrorReporting: true,
            useI18n: false,
            defaultLanguage: 'ko',
            i18nPath: '/i18n',            // 다국어 파일 경로
            logLevel: 'info',
            apiBaseURL: '',
            requestTimeout: 30000,
            uploadTimeout: 300000,
            authEnabled: false,
            loginRoute: 'login',
            protectedRoutes: [],
            protectedPrefixes: [],
            publicRoutes: ['login', 'register', 'home'],
            checkAuthFunction: null,
            redirectAfterLogin: 'home',
            authCookieName: 'authToken',
            authStorage: 'localStorage'
        };
        
        const config = { ...defaults, ...options };
        
        // 절대 경로들을 basePath 기준으로 해결
        config.srcPath = this.resolvePath(config.srcPath, config.basePath);
        config.routesPath = this.resolvePath(config.routesPath, config.basePath);
        config.i18nPath = this.resolvePath(config.i18nPath, config.basePath);
        
        return config;
    }

    /**
     * 통합 경로 해결 - 서브폴더 배포 및 basePath 지원
     */
    resolvePath(path, basePath = null) {
        const currentOrigin = window.location.origin;
        
        // HTTP URL인 경우 그대로 반환
        if (path.startsWith('http')) {
            return path;
        }
        
        // 절대 경로인 경우
        if (path.startsWith('/')) {
            // basePath 제공된 경우 basePath와 조합
            if (basePath && basePath !== '/') {
                // 이중 슬래시 방지
                const cleanBasePath = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
                const cleanPath = path.startsWith('/') ? path : `/${path}`;
                const fullPath = `${cleanBasePath}${cleanPath}`;
                const fullUrl = `${currentOrigin}${fullPath}`;
                return fullUrl.replace(/([^:])\/{2,}/g, '$1/');
            }
            // 일반적인 절대 경로
            return `${currentOrigin}${path}`;
        }
        
        // 상대 경로인 경우 현재 경로 기준으로 해결
        const currentPathname = window.location.pathname;
        const currentBase = currentPathname.endsWith('/') 
            ? currentPathname 
            : currentPathname.substring(0, currentPathname.lastIndexOf('/') + 1);
        
        // 상대 경로 정규화
        const resolvedPath = this.normalizePath(currentBase + path);
        
        const fullUrl = `${currentOrigin}${resolvedPath}`;
        
        // HTTP URL의 이중 슬래시 제거
        return fullUrl.replace(/([^:])\/{2,}/g, '$1/');
    }

    /**
     * URL 경로 정규화 (이중 슬래시 제거 및 ../, ./ 처리)
     */
    normalizePath(path) {
        // 이중 슬래시 제거
        path = path.replace(/\/+/g, '/');
        const parts = path.split('/').filter(part => part !== '' && part !== '.');
        const stack = [];
        
        for (const part of parts) {
            if (part === '..') {
                if (stack.length > 0 && stack[stack.length - 1] !== '..') {
                    stack.pop();
                } else if (!path.startsWith('/')) {
                    stack.push(part);
                }
            } else {
                stack.push(part);
            }
        }
        
        const normalized = '/' + stack.join('/');
        return normalized === '/' ? '/' : normalized;
    }


    /**
     * 로깅 래퍼 메서드
     */
    log(level, ...args) {
        if (this.errorHandler) {
            this.errorHandler.log(level, 'Router', ...args);
        }
    }

    /**
     * 통합 초기화 - 매니저 생성 → 비동기 로딩 → 라우터 시작
     */
    async initialize() {
        try {
            // 1. 매니저 초기화 (동기)
            // 항상 필요한 매니저들
            this.cacheManager = new CacheManager(this, this.config);
            this.stateHandler = new StateHandler(this);
            this.routeLoader = new RouteLoader(this, this.config);
            this.queryManager = new QueryManager(this);
            this.errorHandler = new ErrorHandler(this, this.config);
            
            // 조건부 매니저들
            if (this.config.useI18n) {
                try {
                    this.i18nManager = new I18nManager(this, this.config);
                    if (this.i18nManager.initPromise) {
                        await this.i18nManager.initPromise;
                    }
                    this.log('info', 'I18nManager initialized successfully');
                } catch (i18nError) {
                    this.log('warn', 'I18nManager initialization failed, continuing without i18n:', i18nError.message);
                    this.i18nManager = null; // i18n 매니저 비활성화
                    this.config.useI18n = false; // i18n 비활성화
                }
            }
            
            if (this.config.authEnabled) {
                this.authManager = new AuthManager(this, this.config);
            }
            
            
            // 2. 라우터 시작
            this.isReady = true;
            this.init();
            
        } catch (error) {
            this.log('error', 'Router initialization failed:', error);
            // 실패해도 라우터는 시작 (graceful degradation)
            this.isReady = true;
            this.init();
        }
    }

    /**
     * 라우터가 준비될 때까지 대기
     */
    async waitForReady() {
        if (this.isReady) return true;
        if (this.readyPromise) {
            await this.readyPromise;
        }
        return this.isReady;
    }


    init() {
        const isHashMode = this.config.mode === 'hash';
        
        // 이벤트 리스너 등록 (메모리 최적화)
        window.addEventListener(
            isHashMode ? 'hashchange' : 'popstate',
            this._boundHandleRouteChange
        );
        
        // DOM 로드 처리 통합
        const initRoute = () => {
            if (isHashMode && !window.location.hash) {
                window.location.hash = '#/';
            } else if (!isHashMode && window.location.pathname === '/') {
                this.navigateTo('home');
            } else {
                this.handleRouteChange();
            }
        };
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initRoute);
        } else {
            // requestAnimationFrame으로 성능 개선
            requestAnimationFrame(initRoute);
        }
    }

    handleRouteChange() {
        const { route, queryParams } = this._parseCurrentLocation();
        
        // Store current query parameters in QueryManager
        this.queryManager?.setCurrentQueryParams(queryParams);
        
        // 변경사항이 있을 때만 로드 (성능 최적화)
        if (route !== this.currentHash || this.queryManager?.hasQueryParamsChanged(queryParams)) {
            this.currentHash = route;
            this.loadRoute(route);
        }
    }

    /**
     * 현재 위치 파싱 (분리하여 가독성 향상)
     */
    _parseCurrentLocation() {
        if (this.config.mode === 'hash') {
            const hashPath = window.location.hash.slice(1) || '/';
            const [pathPart, queryPart] = hashPath.split('?');
            
            // 경로 파싱 최적화
            let route = 'home';
            if (pathPart && pathPart !== '/') {
                route = pathPart.startsWith('/') ? pathPart.slice(1) : pathPart;
            }
            
            return {
                route: route || 'home',
                queryParams: this.queryManager?.parseQueryString(queryPart || window.location.search.slice(1)) || {}
            };
        } else {
            // History Mode - 서브폴더 배포 지원
            const fullPath = window.location.pathname;
            const basePath = this.config.basePath || '/';
            
            // base path 제거하여 실제 route 추출
            let route = fullPath;
            if (basePath !== '/' && fullPath.startsWith(basePath)) {
                route = fullPath.slice(basePath.length);
            }
            
            // 맨 앞의 / 제거
            if (route.startsWith('/')) {
                route = route.slice(1);
            }
            
            return {
                route: route || 'home',
                queryParams: this.queryManager?.parseQueryString(window.location.search.slice(1)) || {}
            };
        }
    }

    async loadRoute(routeName) {
        // 전환이 진행 중이면 무시
        const inProgress = this.transitionInProgress;
        
        if (inProgress) {
            return;
        }

        try {
            this.transitionInProgress = true;
            
            // 인증 체크
            const authResult = this.authManager ? 
                await this.authManager.checkAuthentication(routeName) :
                { allowed: true, reason: 'auth_disabled' };
            if (!authResult.allowed) {
                // 인증 실패 시 로그인 페이지로 리다이렉트
                if (this.authManager) {
                    this.authManager.emitAuthEvent('auth_required', { 
                        originalRoute: routeName,
                        loginRoute: this.config.loginRoute 
                    });
                    
                    // navigateTo를 사용하여 이전 페이지로 돌아가기 지원
                    if (routeName !== this.config.loginRoute) {
                        this.navigateTo(this.config.loginRoute, { redirect: routeName });
                    } else {
                        this.navigateTo(this.config.loginRoute);
                    }
                }
                return;
            }
            
            const appElement = document.getElementById('app');
            if (!appElement) {
                throw new Error('App element not found');
            }

            // Vue 컴포넌트 생성 (백그라운드에서)
            const component = await this.routeLoader.createVueComponent(routeName);
            
            // 새로운 페이지를 오버레이로 렌더링
            await this.renderComponentWithTransition(component, routeName);
            
            // 로딩 완료
            
        } catch (error) {
            this.log('error', `Route loading failed [${routeName}]:`, error.message);
            
            
            // 에러 타입에 따른 처리
            if (this.errorHandler) {
                await this.errorHandler.handleRouteError(routeName, error);
            } else {
                console.error('[Router] No error handler available');
            }
        } finally {
            // 모든 처리가 완료된 후 전환 상태 리셋
            this.transitionInProgress = false;
        }
    }

    async renderComponentWithTransition(vueComponent, routeName) {
        const appElement = document.getElementById('app');
        if (!appElement) return;

        // 새로운 페이지 컨테이너 생성
        const newPageContainer = document.createElement('div');
        newPageContainer.className = 'page-container page-entered';
        newPageContainer.id = `page-${routeName}-${Date.now()}`;
        
        // 기존 컨테이너가 있다면 즉시 숨기기
        const existingContainers = appElement.querySelectorAll('.page-container');
        existingContainers.forEach(container => {
            container.classList.remove('page-entered');
            container.classList.add('page-exiting');
        });

        // 새 컨테이너를 앱에 추가
        appElement.appendChild(newPageContainer);

        // 개발 모드에서만 스타일 적용 (프로덕션 모드는 빌드된 JS에서 자동 처리)
        if (this.config.environment === 'development' && vueComponent._style) {
            this.applyStyle(vueComponent._style, routeName);
        }
        
        // 새로운 Vue 앱을 새 컨테이너에 마운트
        const { createApp } = Vue;
        const newVueApp = createApp(vueComponent);
        
        // Vue 3 전역 속성 설정
        newVueApp.config.globalProperties.$router = {
            navigateTo: (route, params) => this.navigateTo(route, params),
            getCurrentRoute: () => this.getCurrentRoute(),
            
            // 통합된 파라미터 관리 (라우팅 + 쿼리 파라미터)
            getParams: () => this.queryManager?.getAllParams() || {},
            getParam: (key, defaultValue) => this.queryManager?.getParam(key, defaultValue),
            
            // 쿼리 파라미터 전용 메서드 (하위 호환성)
            getQueryParams: () => this.queryManager?.getQueryParams() || {},
            getQueryParam: (key, defaultValue) => this.queryManager?.getQueryParam(key, defaultValue),
            setQueryParams: (params, replace) => this.queryManager?.setQueryParams(params, replace),
            removeQueryParams: (keys) => this.queryManager?.removeQueryParams(keys),
            
            // 라우팅 파라미터 전용 메서드
            getRouteParams: () => this.queryManager?.getRouteParams() || {},
            getRouteParam: (key, defaultValue) => this.queryManager?.getRouteParam(key, defaultValue),
            
            currentRoute: this.currentHash,
            currentQuery: this.queryManager?.getQueryParams() || {}
        };

        // 모바일 메뉴 전역 함수 추가

        newVueApp.mount(`#${newPageContainer.id}`);

        // requestAnimationFrame으로 성능 개선
        requestAnimationFrame(() => {
            this.cleanupPreviousPages();
            this.transitionInProgress = false;
        });

        // 이전 앱 정리 준비
        if (this.currentVueApp) {
            this.previousVueApp = this.currentVueApp;
        }
        
        this.currentVueApp = newVueApp;
    }

    cleanupPreviousPages() {
        const appElement = document.getElementById('app');
        if (!appElement) return;

        // 배치 DOM 조작으로 성능 개선
        const fragment = document.createDocumentFragment();
        const exitingContainers = appElement.querySelectorAll('.page-container.page-exiting');
        
        // 한번에 제거
        exitingContainers.forEach(container => container.remove());

        // 이전 Vue 앱 정리
        if (this.previousVueApp) {
            try {
                this.previousVueApp.unmount();
            } catch (error) {
                // 무시 (이미 언마운트된 경우)
            }
            this.previousVueApp = null;
        }

        // 로딩 엘리먼트 제거
 
            appElement.querySelector('.loading')?.remove();
    }

    applyStyle(css, routeName) {
        // 기존 스타일 제거
        const existing = document.querySelector(`style[data-route="${routeName}"]`);
        if (existing) existing.remove();

        if (css) {
            const style = document.createElement('style');
            style.textContent = css;
            style.setAttribute('data-route', routeName);
            document.head.appendChild(style);
        }
    }


    navigateTo(routeName, params = null) {
        // If routeName is an object, treat it as {route, params}
        if (typeof routeName === 'object') {
            params = routeName.params || null;
            routeName = routeName.route;
        }
        
        // Clear current query params if navigating to a different route
        if (routeName !== this.currentHash && this.queryManager) {
            this.queryManager.clearQueryParams();
        }
        
        // Set route parameters
        if (this.queryManager) {
            this.queryManager.setCurrentRouteParams(params);
        }
        
        // Update URL with new route and params
        this.updateURL(routeName, params);
    }

    getCurrentRoute() {
        return this.currentHash;
    }


    updateURL(route, params = null) {
        const queryParams = params || this.queryManager?.getQueryParams() || {};
        const queryString = this.queryManager?.buildQueryString(queryParams) || '';
        
        // URL 빌드 최적화 - 서브폴더 배포 지원
        const buildURL = (route, queryString, isHash = true) => {
            let base = route === 'home' ? '/' : `/${route}`;
            
            // History Mode에서 basePath 경로 추가
            if (!isHash && this.config.basePath && this.config.basePath !== '/') {
                base = `${this.config.basePath}${base}`;
            }
            
            const url = queryString ? `${base}?${queryString}` : base;
            return isHash ? `#${url}` : url;
        };
        
        if (this.config.mode === 'hash') {
            const newHash = buildURL(route, queryString);
            
            // 동일한 URL이면 업데이트하지 않음 (성능 최적화)
            if (window.location.hash !== newHash) {
                window.location.hash = newHash;
            }
        } else {
            const newPath = buildURL(route, queryString, false);
            
            // 서브폴더 배포를 고려한 경로 비교
            let expectedPath = route === 'home' ? '/' : `/${route}`;
            if (this.config.basePath && this.config.basePath !== '/') {
                expectedPath = `${this.config.basePath}${expectedPath}`;
            }
            
            const isSameRoute = window.location.pathname === expectedPath;
            
            if (isSameRoute) {
                window.history.replaceState({}, '', newPath);
            } else {
                window.history.pushState({}, '', newPath);
            }
            this.handleRouteChange();
        }
    }

    /**
     * 라우터 정리 (메모리 누수 방지)
     */
    destroy() {
        // 이벤트 리스너 제거
        window.removeEventListener(
            this.config.mode === 'hash' ? 'hashchange' : 'popstate',
            this._boundHandleRouteChange
        );
        
        // 현재 Vue 앱 언마운트
        if (this.currentVueApp) {
            this.currentVueApp.unmount();
            this.currentVueApp = null;
        }
        
        // 이전 Vue 앱 언마운트
        if (this.previousVueApp) {
            this.previousVueApp.unmount();
            this.previousVueApp = null;
        }
        
        // 매니저 정리
        Object.values(this).forEach(manager => {
            if (manager && typeof manager.destroy === 'function') {
                manager.destroy();
            }
        });
        
        // 캐시 클리어
        this.cacheManager?.clearAll();
        
        // DOM 정리
        const appElement = document.getElementById('app');
        if (appElement) {
            appElement.innerHTML = '';
        }
        
        this.log('info', 'Router destroyed');
    }
}
// 전역 라우터는 index.html에서 환경설정과 함께 생성됨