// ViewLogic Router - ES6 Module
import { I18nManager } from './plugins/I18nManager.js';
import { AuthManager } from './plugins/AuthManager.js';
import { CacheManager } from './plugins/CacheManager.js';
import { QueryManager } from './plugins/QueryManager.js';
import { RouteLoader } from './core/RouteLoader.js';
import { ErrorHandler } from './core/ErrorHandler.js';
import { ComponentLoader } from './core/ComponentLoader.js';

export class ViewLogicRouter {
    constructor(options = {}) {
        // 버전 정보
        this.version = options.version || '1.0.0';
        
        // 기본 환경설정 최적화
        this.config = this._buildConfig(options);
        
        this.currentHash = '';
        this.currentVueApp = null;
        this.previousVueApp = null; // 이전 Vue 앱 (전환 효과를 위해 보관)
        this.componentLoader = null; // 컴포넌트 로더 인스턴스

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
        const defaults = {
            basePath: '/src',
            mode: 'hash',
            cacheMode: 'memory',
            cacheTTL: 300000,
            maxCacheSize: 50,
            useLayout: true,
            defaultLayout: 'default',
            environment: 'development',
            routesPath: '/routes',
            enableErrorReporting: true,
            useComponents: true,
            componentNames: ['Button', 'Modal', 'Card', 'Toast', 'Input', 'Tabs', 'Checkbox', 'Alert', 'DynamicInclude', 'HtmlInclude'],
            useI18n: true,
            defaultLanguage: 'ko',
            logLevel: 'info',
            authEnabled: false,
            loginRoute: 'login',
            protectedRoutes: [],
            protectedPrefixes: [],
            publicRoutes: ['login', 'register', 'home'],
            checkAuthFunction: null,
            redirectAfterLogin: 'home',
            authCookieName: 'authToken',
            authFallbackCookieNames: ['accessToken', 'token', 'jwt'],
            authStorage: 'cookie',
            authCookieOptions: {},
            authSkipValidation: false,
            enableParameterValidation: true,
            maxParameterLength: 1000,
            maxParameterCount: 50,
            maxArraySize: 100,
            allowedKeyPattern: /^[a-zA-Z0-9_-]+$/,
            logSecurityWarnings: true
        };
        
        return { ...defaults, ...options };
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
            this.routeLoader = new RouteLoader(this, this.config);
            this.queryManager = new QueryManager(this, this.config);
            this.errorHandler = new ErrorHandler(this, this.config);
            
            // 조건부 매니저들
            if (this.config.useI18n) {
                this.i18nManager = new I18nManager(this, this.config);
                if (this.i18nManager.initPromise) {
                    await this.i18nManager.initPromise;
                }
            }
            
            if (this.config.authEnabled) {
                this.authManager = new AuthManager(this, this.config);
            }
            
            if (this.config.useComponents) {
                this.componentLoader = new ComponentLoader(this, {
                    ...this.config,
                    basePath: this.config.basePath + '/components',
                    cache: true,
                    componentNames: this.config.componentNames
                });
                await this.componentLoader.loadAllComponents();
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
            return {
                route: window.location.pathname.slice(1) || 'home',
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
                    const redirectUrl = routeName !== this.config.loginRoute ? 
                        `${this.config.loginRoute}?redirect=${encodeURIComponent(routeName)}` : 
                        this.config.loginRoute;
                    this.navigateTo(redirectUrl);
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
            getQueryParams: () => this.queryManager?.getQueryParams() || {},
            getQueryParam: (key) => this.queryManager?.getQueryParam(key),
            setQueryParams: (params, replace) => this.queryManager?.setQueryParams(params, replace),
            removeQueryParams: (keys) => this.queryManager?.removeQueryParams(keys),
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
        
        // Update URL with new route and params
        this.updateURL(routeName, params);
    }

    getCurrentRoute() {
        return this.currentHash;
    }


    updateURL(route, params = null) {
        const queryParams = params || this.queryManager?.getQueryParams() || {};
        const queryString = this.queryManager?.buildQueryString(queryParams) || '';
        
        // URL 빌드 최적화
        const buildURL = (route, queryString, isHash = true) => {
            const base = route === 'home' ? '/' : `/${route}`;
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
            const isSameRoute = window.location.pathname === (route === 'home' ? '/' : `/${route}`);
            
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