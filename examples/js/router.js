class ViewLogicRouter {
    constructor(options = {}) {
        // 기본 환경설정
        this.config = {
            basePath: options.basePath || '/src',
            mode: options.mode || 'hash', // 'hash' 또는 'history'
            cacheMode: options.cacheMode || 'memory', // 'memory' 또는 'lru'
            cacheTTL: options.cacheTTL || 300000, // 5분 (밀리초)
            maxCacheSize: options.maxCacheSize || 50, // LRU 캐시 최대 크기
            useLayout: options.useLayout || false, // 레이아웃 사용 여부
            defaultLayout: options.defaultLayout || 'default', // 기본 레이아웃
            environment: options.environment || 'development', // 'development' 또는 'production'
            routesPath: options.routesPath || '/routes', // 프로덕션 모드에서 사용할 경로
            preloadRoutes: options.preloadRoutes || [], // 프리로드할 라우트들
            preloadDelay: options.preloadDelay || 1000, // 프리로드 시작 지연 시간 (밀리초)
            preloadInterval: options.preloadInterval || 500, // 프리로드 간격 (밀리초)
            showLoadingProgress: options.showLoadingProgress === true, // 로딩 프로그레스 바 표시
            loadingMinDuration: options.loadingMinDuration || 300, // 최소 로딩 시간 (UX 개선)
            enableErrorReporting: options.enableErrorReporting !== false, // 에러 리포팅 활성화
            useComponents: options.useComponents !== false, // 컴포넌트 시스템 사용 여부
            // i18n 설정
            useI18n: options.useI18n !== false, // 다국어 시스템 사용 여부
            i18nDefaultLanguage: options.i18nDefaultLanguage || 'ko', // 기본 언어 (폴백 언어로도 사용)
            // 인증 설정
            authEnabled: options.authEnabled || false, // 인증 시스템 사용 여부
            loginRoute: options.loginRoute || 'login', // 로그인 페이지 라우트
            protectedRoutes: options.protectedRoutes || [], // 보호된 특정 라우트들
            protectedPrefixes: options.protectedPrefixes || [], // 보호된 prefix들 (예: ['admin', 'dashboard'])
            publicRoutes: options.publicRoutes || ['login', 'register', 'home'], // 공개 라우트들
            checkAuthFunction: options.checkAuthFunction || null, // 사용자 정의 인증 체크 함수
            redirectAfterLogin: options.redirectAfterLogin || 'home', // 로그인 후 리다이렉트할 페이지
            // 쿠키 기반 인증 설정
            authCookieName: options.authCookieName || 'authToken', // 인증 쿠키 이름
            authFallbackCookieNames: options.authFallbackCookieNames || ['accessToken', 'token', 'jwt'], // 대체 쿠키 이름들
            // 스토리지 설정
            authStorage: options.authStorage || 'cookie', // 인증 토큰 저장소: 'localStorage', 'sessionStorage', 'cookie'
            authCookieOptions: options.authCookieOptions || {}, // 쿠키 저장 시 옵션
            authSkipValidation: options.authSkipValidation || false, // JWT 토큰 유효성 검사 스킵 여부
            // 보안 설정
            security: {
                enableParameterValidation: options.security?.enableParameterValidation !== false,
                maxParameterLength: options.security?.maxParameterLength || 1000,
                maxParameterCount: options.security?.maxParameterCount || 50,
                maxArraySize: options.security?.maxArraySize || 100,
                allowedKeyPattern: options.security?.allowedKeyPattern || /^[a-zA-Z0-9_-]+$/,
                logSecurityWarnings: options.security?.logSecurityWarnings !== false
            }            
        };
        
        this.currentHash = '';
        this.currentQueryParams = {};
        this.currentVueApp = null;
        this.previousVueApp = null; // 이전 Vue 앱 (전환 효과를 위해 보관)
        this.cache = new Map();
        this.cacheTimestamps = new Map();
        this.lruOrder = []; // LRU 순서 추적
        this.preloadedRoutes = new Set(); // 프리로드된 라우트 추적
        this.preloadQueue = []; // 프리로드 대기열
        this.transitionInProgress = false; // 전환 중 플래그
        this.loadingStartTime = null; // 로딩 시작 시간
        this.progressBar = null; // 프로그레스 바 엘리먼트
        this.loadingOverlay = null; // 로딩 오버레이 엘리먼트
        this.componentLoader = null; // 컴포넌트 로더 인스턴스
        this.mobileMenuOpen = false; // 모바일 메뉴 상태

        this.init();        
        this.i18nInitPromise = this.initializeI18n();        
        this.initializeLoadingComponents();
        this.initializeComponentSystem();

        // 초기 라우트 로드 후 프리로딩 시작 (설정된 지연 시간 후)
        setTimeout(() => this.startPreloading(), this.config.preloadDelay);
        
        // 개발 편의를 위한 전역 캐시 관리 함수 노출
        if (this.config.environment === 'development') {
            window.routerCache = {
                clear: () => this.clearCache(),
                clearComponents: () => this.clearComponentCache(),
                invalidateComponent: (routeName) => this.invalidateComponentCache(routeName),
                stats: () => ({
                    totalEntries: this.cache.size,
                    componentEntries: Array.from(this.cache.keys()).filter(key => key.startsWith('component_')).length,
                    scriptEntries: Array.from(this.cache.keys()).filter(key => key.startsWith('script_')).length
                })
            };
        }
    }

    /**
     * 모바일 메뉴 토글
     */
    toggleMobileMenu() {
        this.mobileMenuOpen = !this.mobileMenuOpen;
        
        // 현재 Vue 앱에서 상태 업데이트
        if (this.currentVueApp) {
            this.currentVueApp.config.globalProperties.mobileMenuOpen = this.mobileMenuOpen;
            // 강제 업데이트를 위한 이벤트 발생
            this.updateMobileMenuState();
        }
    }

    /**
     * 모바일 메뉴 닫기
     */
    closeMobileMenu() {
        this.mobileMenuOpen = false;
        
        // 현재 Vue 앱에서 상태 업데이트
        if (this.currentVueApp) {
            this.currentVueApp.config.globalProperties.mobileMenuOpen = this.mobileMenuOpen;
            // 강제 업데이트를 위한 이벤트 발생
            this.updateMobileMenuState();
        }
    }

    /**
     * 모바일 메뉴 상태 업데이트
     */
    updateMobileMenuState() {
        // 모바일 메뉴 상태를 DOM에 반영
        const navMenus = document.querySelectorAll('.nav-menu, .nav-auth');
        const navToggle = document.querySelector('.nav-toggle');
        
        navMenus.forEach(menu => {
            if (this.mobileMenuOpen) {
                menu.classList.add('active');
            } else {
                menu.classList.remove('active');
            }
        });
        
        if (navToggle) {
            if (this.mobileMenuOpen) {
                navToggle.classList.add('active');
            } else {
                navToggle.classList.remove('active');
            }
        }
        
        // body 스크롤 제어
        if (this.mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }

    /**
     * 윈도우 리사이즈 시 모바일 메뉴 정리
     */
    handleWindowResize() {
        if (window.innerWidth > 768) {
            this.closeMobileMenu();
        }
    }

    init() {
        if (this.config.mode === 'hash') {
            window.addEventListener('hashchange', () => this.handleRouteChange());
            
            // DOM이 준비되면 즉시 라우트 로딩 시작
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.handleRouteChange());
            } else {
                // 이미 로드된 경우 즉시 실행
                setTimeout(() => this.handleRouteChange(), 0);
            }
            
            // 윈도우 리사이즈 이벤트 리스너 추가
            window.addEventListener('resize', () => this.handleWindowResize());
            
            if (!window.location.hash) {
                window.location.hash = '#/';
            }
        } else {
            // History 모드
            window.addEventListener('popstate', () => this.handleRouteChange());
            
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.handleRouteChange());
            } else {
                setTimeout(() => this.handleRouteChange(), 0);
            }
            
            if (window.location.pathname === '/') {
                this.navigateTo('home');
            }
        }
    }

    initializeLoadingComponents() {
        // 프로그레스 바 생성
        if (this.config.showLoadingProgress) {
            this.createProgressBar();
        }
    }

    createProgressBar() {
        const progressContainer = document.createElement('div');
        progressContainer.className = 'loading-progress';
        progressContainer.style.display = 'none';
        
        const progressBar = document.createElement('div');
        progressBar.className = 'loading-progress-bar';
        
        progressContainer.appendChild(progressBar);
        document.body.appendChild(progressContainer);
        
        this.progressBar = {
            container: progressContainer,
            bar: progressBar
        };
    }

    showLoading() {
        this.loadingStartTime = Date.now();
        
        if (this.config.showLoadingProgress && this.progressBar) {
            this.progressBar.container.style.display = 'block';
            this.progressBar.bar.style.width = '0%';
            
            // 프로그레스 애니메이션
            this.animateProgress();
        }
    }

    animateProgress() {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 90) progress = 90;
            
            if (this.progressBar && this.progressBar.bar) {
                this.progressBar.bar.style.width = progress + '%';
            }
            
            if (!this.transitionInProgress) {
                clearInterval(interval);
                if (this.progressBar && this.progressBar.bar) {
                    this.progressBar.bar.style.width = '100%';
                }
            }
        }, 100);
    }

    async hideLoading() {
        const loadingDuration = Date.now() - this.loadingStartTime;
        const minDuration = this.config.loadingMinDuration;
        
        // 최소 로딩 시간 보장
        if (loadingDuration < minDuration) {
            await new Promise(resolve => setTimeout(resolve, minDuration - loadingDuration));
        }
        
        if (this.progressBar) {
            this.progressBar.bar.style.width = '100%';
            
            setTimeout(() => {
                if (this.progressBar) {
                    this.progressBar.container.style.display = 'none';
                    this.progressBar.bar.style.width = '0%';
                }
            }, 200);
        }
        
        if (this.loadingOverlay) {
            this.loadingOverlay.style.opacity = '0';
            setTimeout(() => {
                if (this.loadingOverlay && this.loadingOverlay.parentNode) {
                    this.loadingOverlay.remove();
                    this.loadingOverlay = null;
                }
            }, 300);
        }
    }

    showFullPageLoading(message = '로딩 중...') {
        this.hideLoading(); // 기존 로딩 숨기기
        
        const overlay = document.createElement('div');
        overlay.className = 'page-loading-overlay';
        overlay.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner">
                    <div class="spinner-ring"></div>
                    <div class="spinner-ring"></div>
                    <div class="spinner-ring"></div>
                    <div class="spinner-ring"></div>
                </div>
                <p class="loading-text">${message}</p>
            </div>
        `;
        
        document.body.appendChild(overlay);
        this.loadingOverlay = overlay;
        
        // 스타일이 로드되지 않은 경우를 위한 인라인 스타일
        this.addLoadingStyles();
    }

    async initializeComponentSystem() {
        if (!this.config.useComponents) {
            return;
        }

        try {
            // 프로덕션 모드에서는 통합 components.js 로드
            if (this.config.environment === 'production') {
                console.log('🧩 Production mode: Loading unified components system');
                await this.loadUnifiedComponents();
                return;
            }

            // 개발 모드에서만 ComponentLoader 동적 로드
            const { getComponentLoader } = await import(this.config.basePath + '/components/ComponentLoader.js');
            
            this.componentLoader = getComponentLoader({
                basePath: this.config.basePath + '/components',
                cache: true
            });

            console.log('🧩 Component system initialized (development mode)');
            
            // 컴포넌트는 필요시 동적으로 로드됨

        } catch (error) {
            console.warn('⚠️ Component system initialization failed:', error);
            this.config.useComponents = false;
        }
    }

    async loadUnifiedComponents() {
        try {
            // 통합 _components.js 파일 로드 (성능 최적화된 통합 컴포넌트)
            const componentsPath = `${this.config.routesPath}/_components.js`;
            console.log(`📦 Loading unified components from: ${componentsPath}`);
            
            // 브라우저에서 상대 경로 import를 위해 현재 origin 추가
            const fullPath = window.location.origin + componentsPath;
            console.log(`📦 Full path: ${fullPath}`);
            
            const componentsModule = await import(componentsPath);
            console.log('📦 Components module loaded:', componentsModule);
            
            // 컴포넌트 등록 함수가 있는지 확인
            if (typeof componentsModule.registerComponents === 'function') {
                // 글로벌 Vue 앱이 없으면 임시로 저장
                this.unifiedComponentsModule = componentsModule;
                console.log('📦 Unified components loaded and ready for registration');
                console.log('📦 Available components:', Object.keys(componentsModule.components || {}));
                return true;
            } else {
                throw new Error('registerComponents function not found in components module');
            }
            
        } catch (error) {
            console.error('❌ Failed to load unified components:', error);
            console.error('❌ Error details:', error.stack);
            this.config.useComponents = false;
            throw error;
        }
    }

    async initializeI18n() {
        try {
            // 라우터에서 i18n이 비활성화된 경우 초기화하지 않음
            if (!this.config.useI18n) {
                console.log('I18n system disabled in router config, skipping initialization');
                return;
            }
            
            // i18n 스크립트 로드 (ES6 모듈 동적 import 사용)
            if (typeof window.i18n === 'undefined') {
                try {
                    await import('./i18n.js');
                    console.log('I18n module loaded successfully');
                } catch (error) {
                    console.error('Failed to load i18n module:', error);
                    throw error;
                }
            }
            
            // i18n 시스템 초기화 (활성화된 경우에만)
            if (window.i18n) {
                // 라우터 설정으로 i18n 설정 업데이트
                if (window.i18n.updateConfig) {
                    window.i18n.updateConfig({
                        enabled: this.config.useI18n,
                        defaultLanguage: this.config.i18nDefaultLanguage,
                        fallbackLanguage: this.config.i18nDefaultLanguage, // 폴백 언어는 기본 언어와 동일
                        debug: this.config.environment === 'development' // 개발 환경에서만 디버그 활성화
                    });
                }
                
                // i18n이 비활성화된 경우 초기화하지 않음
                if (!window.i18n.isEnabled()) {
                    console.log('I18n system is disabled, skipping initialization');
                    return;
                }
                
                await window.i18n.initialize();
                
                // URL 쿼리 파라미터에서 언어 설정 확인 및 적용
                const langFromQuery = this.getQueryParam('lang');
                if (langFromQuery && langFromQuery !== window.i18n.getCurrentLanguage()) {
                    console.log('Setting language from URL parameter:', langFromQuery);
                    await window.i18n.setLanguage(langFromQuery);
                }
                
                // 언어 변경 이벤트 리스너 등록
                window.i18n.on('languageChanged', (data) => {
                    this.onLanguageChanged(data);
                });
                
                console.log('I18n system initialized successfully with router config');
            }
        } catch (error) {
            console.warn('Failed to initialize i18n system:', error);
        }
    }

    async loadExternalScript(src, options = {}) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = src;
            
            // ES6 모듈 지원
            if (options.type === 'module' || src.includes('i18n.js')) {
                script.type = 'module';
            }
            
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    onLanguageChanged(data) {
        // 언어 변경 시 현재 페이지 다시 렌더링
        if (this.currentVueApp) {
            // 현재 라우트 다시 로드하여 번역 적용
            this.loadRoute(this.currentHash, true);
        }
        
        console.log('Language changed from', data.from, 'to', data.to);
    }

    updateI18nGlobalProperties(app) {
        if (app) {
            // 라우터에서 i18n이 비활성화된 경우 더미 함수 제공
            if (!this.config.useI18n || (window.i18n && !window.i18n.isEnabled())) {
                app.config.globalProperties.$t = (key, params) => key;
                app.config.globalProperties.$i18n = null;
                app.config.globalProperties.$lang = this.config.i18nDefaultLanguage;
            } else if (window.i18n) {
                app.config.globalProperties.$t = (key, params) => window.i18n.t(key, params);
                app.config.globalProperties.$i18n = window.i18n;
                app.config.globalProperties.$lang = window.i18n.getCurrentLanguage();
            } else {
                // i18n이 아직 로드되지 않은 경우 더미 함수 제공
                app.config.globalProperties.$t = (key, params) => key;
                app.config.globalProperties.$i18n = null;
                app.config.globalProperties.$lang = this.config.i18nDefaultLanguage;
            }
        }
    }

    // DEPRECATED: 컴포넌트는 이제 createVueComponent 단계에서 포함됨
    registerComponentsToVueApp(vueApp) {
        if (!this.config.useComponents || !vueApp) {
            if (this.config.environment === 'development') {
                console.log('⚠️ Components not enabled or Vue app not provided');
            }
            return;
        }

        // 컴포넌트 등록은 각 Vue 앱마다 필요하므로 항상 수행
        // 하지만 컴포넌트 모듈은 이미 로드되어 있어서 빠르게 등록됨

        if (this.config.environment === 'development') {
            console.log('🔧 Registering components to Vue app...');
            console.log('🔧 Environment:', this.config.environment);
            console.log('🔧 Unified components module available:', !!this.unifiedComponentsModule);
        }

        try {
            // 프로덕션 모드에서 통합 컴포넌트 등록
            if (this.config.environment === 'production' && this.unifiedComponentsModule) {
                if (this.config.environment === 'development') {
                    console.log('🔧 Calling registerComponents function...');
                }
                this.unifiedComponentsModule.registerComponents(vueApp);
                if (this.config.environment === 'development') {
                    console.log('✅ Components registered successfully');
                }
                return true;
            }

            // 개발 모드에서 ComponentLoader 사용
            if (this.componentLoader) {
                if (this.config.environment === 'development') {
                    console.log('🔧 Using ComponentLoader for development mode...');
                }
                this.componentLoader.registerGlobalComponents(vueApp);
                return true;
            }

            console.warn('⚠️ No component registration method available');

        } catch (error) {
            console.error('❌ Failed to register components to Vue app:', error);
            console.error('❌ Error details:', error.stack);
            return false;
        }

        return false;
    }


    async registerComponentsForVueApp(vueApp) {
        if (!this.config.useComponents || !vueApp) {
            return { successful: [], failed: [] };
        }

        // 프로덕션 모드에서는 컴포넌트가 라우트에 인라인으로 포함되어 있음
        if (this.config.environment === 'production') {
            // 프로덕션 모드에서는 컴포넌트가 라우트에 인라인으로 포함되어 있음
            return { successful: [], failed: [] };
        }

        if (!this.componentLoader) {
            return { successful: [], failed: [] };
        }

        try {
            console.log('📝 Registering global components with Vue app (development mode)...');
            const result = await this.componentLoader.registerGlobalComponents(vueApp);
            
            // 컴포넌트 스타일은 이제 base.css에 통합되어 있음
            
            return result;
        } catch (error) {
            console.warn('Component registration failed:', error);
            return { successful: [], failed: [] };
        }
    }

    handleRouteChange() {
        let route, queryParams;
        
        if (this.config.mode === 'hash') {
            let hashPath = window.location.hash.slice(1) || '/';
            
            // Extract query parameters from hash
            const hashParts = hashPath.split('?');
            const pathPart = hashParts[0];
            const queryPart = hashParts[1] || window.location.search.slice(1);
            
            // Handle both /#/ and /#/home formats
            if (pathPart === '/' || pathPart === '') {
                route = 'home';
            } else if (pathPart.startsWith('/')) {
                route = pathPart.slice(1) || 'home';
            } else {
                // Legacy format support (#home)
                route = pathPart || 'home';
            }
            
            queryParams = this.parseQueryString(queryPart);
        } else {
            // History mode
            route = window.location.pathname.slice(1) || 'home';
            queryParams = this.parseQueryString(window.location.search.slice(1));
        }
        
        // Store current query parameters
        this.currentQueryParams = queryParams;
        
        if (route !== this.currentHash || this.hasQueryParamsChanged(queryParams)) {
            this.currentHash = route;
            this.loadRoute(route);
        }
    }

    async loadRoute(routeName) {
        // 전환이 진행 중이면 무시
        if (this.transitionInProgress) {
            return;
        }

        try {
            this.transitionInProgress = true;
            this.showLoading();
            
            // 인증 체크
            const authResult = await this.checkAuthentication(routeName);
            if (!authResult.allowed) {
                // 인증 실패 시 로그인 페이지로 리다이렉트
                await this.hideLoading();
                this.redirectToLogin(routeName);
                return;
            }
            
            const appElement = document.getElementById('app');
            if (!appElement) {
                throw new Error('App element not found');
            }

            // Vue 컴포넌트 생성 (백그라운드에서)
            const component = await this.createVueComponent(routeName);
            
            // 새로운 페이지를 오버레이로 렌더링
            await this.renderComponentWithTransition(component, routeName);
            
            // 로딩 완료
            await this.hideLoading();
            
        } catch (error) {
            console.error('라우트 로딩 오류:', error);
            
            await this.hideLoading();
            
            // 에러 타입에 따른 처리 (transitionInProgress는 에러 처리 후에 리셋)
            await this.handleRouteError(routeName, error);
        } finally {
            // 모든 처리가 완료된 후 전환 상태 리셋
            this.transitionInProgress = false;
        }
    }

    async handleRouteError(routeName, error) {
        let errorCode = 500;
        let errorMessage = '페이지를 로드할 수 없습니다.';
        
        console.log('에러 상세:', error.message, error.name);
        
        // 에러 타입 분석 (더 정확한 404 감지)
        if (error.message.includes('not found') || 
            error.message.includes('404') ||
            error.message.includes('Failed to resolve') ||
            error.message.includes('Failed to fetch') ||
            (error.name === 'TypeError' && error.message.includes('resolve'))) {
            errorCode = 404;
            errorMessage = `'${routeName}' 페이지를 찾을 수 없습니다.`;
        } else if (error.message.includes('network') && !error.message.includes('not found')) {
            errorCode = 503;
            errorMessage = '네트워크 연결을 확인해 주세요.';
        } else if (error.message.includes('permission') || error.message.includes('403')) {
            errorCode = 403;
            errorMessage = '페이지에 접근할 권한이 없습니다.';
        }
        
        console.log(`에러 코드 결정: ${errorCode} (라우트: ${routeName})`);
        
        // 에러 리포팅
        if (this.config.enableErrorReporting) {
            this.reportError(routeName, error, errorCode);
        }
        
        try {
            // 404 페이지 전용 처리
            if (errorCode === 404) {
                await this.load404Page();
            } else {
                // 일반 에러 페이지
                await this.loadErrorPage(errorCode, errorMessage);
            }
        } catch (fallbackError) {
            console.error('에러 페이지 로딩 실패:', fallbackError);
            // 모든 에러 페이지가 실패했을 때 최후의 폴백 페이지 표시
            this.showFallbackErrorPage(errorCode, errorMessage);
        }
    }

    async load404Page() {
        try {
            console.log('🔍 Loading 404 page...');
            const component = await this.createVueComponent('404');
            await this.renderComponentWithTransition(component, '404');
            console.log('✅ 404 page loaded successfully');
        } catch (error) {
            console.error('❌ 404 page loading failed:', error);
            // 404 페이지도 없으면 간단한 에러 메시지 표시
            this.showFallbackErrorPage('404', '페이지를 찾을 수 없습니다.');
        }
    }

    async loadErrorPage(errorCode, errorMessage) {
        try {
            console.log(`🔍 Loading error page for ${errorCode}...`);
            
            // 에러 컴포넌트 생성
            const errorComponent = await this.createErrorComponent(errorCode, errorMessage);
            await this.renderComponentWithTransition(errorComponent, 'error');
            console.log(`✅ Error page ${errorCode} loaded successfully`);
        } catch (error) {
            console.error(`❌ Error page ${errorCode} loading failed:`, error);
            // 에러 페이지도 로딩 실패하면 폴백 표시
            this.showFallbackErrorPage(errorCode, errorMessage);
        }
    }

    async createErrorComponent(errorCode, errorMessage) {
        try {
            // 에러 컴포넌트를 동적으로 로드
            const component = await this.createVueComponent('error');
            
            // 에러 정보를 props로 전달
            const errorComponent = {
                ...component,
                data() {
                    const originalData = component.data ? component.data() : {};
                    return {
                        ...originalData,
                        errorCode,
                        errorMessage,
                        showRetry: true,
                        showGoHome: true
                    };
                }
            };
            
            return errorComponent;
        } catch (error) {
            // 에러 컴포넌트도 로드할 수 없는 경우 간단한 에러 표시
            console.error('Error component load failed:', error);
            throw new Error(`Cannot load error page: ${error.message}`);
        }
    }

    /**
     * 폴백 에러 페이지 표시 (모든 에러 페이지가 실패했을 때)
     */
    showFallbackErrorPage(errorCode, errorMessage) {
        const appElement = document.getElementById('app');
        if (!appElement) return;

        const fallbackHTML = `
            <div class="fallback-error-page" style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                padding: 2rem;
                text-align: center;
                background: #f8f9fa;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            ">
                <div style="
                    background: white;
                    padding: 3rem;
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                    max-width: 500px;
                ">
                    <h1 style="
                        font-size: 4rem;
                        margin: 0;
                        color: #dc3545;
                        font-weight: 300;
                    ">${errorCode}</h1>
                    <h2 style="
                        margin: 1rem 0;
                        color: #495057;
                        font-weight: 400;
                    ">${errorMessage}</h2>
                    <p style="
                        color: #6c757d;
                        margin-bottom: 2rem;
                        line-height: 1.5;
                    ">요청하신 페이지를 찾을 수 없습니다.</p>
                    <button onclick="window.location.hash = '#/'" style="
                        background: #007bff;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 1rem;
                        transition: background 0.2s;
                    " onmouseover="this.style.background='#0056b3'" onmouseout="this.style.background='#007bff'">
                        홈으로 돌아가기
                    </button>
                </div>
            </div>
        `;

        // 기존 컨테이너들 정리
        appElement.innerHTML = fallbackHTML;
        
        console.log(`📄 Fallback error page displayed for ${errorCode}`);
    }

    reportError(routeName, error, errorCode) {
        const errorReport = {
            route: routeName,
            errorCode,
            errorMessage: error.message,
            stack: error.stack,
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            routerConfig: {
                environment: this.config.environment,
                mode: this.config.mode
            }
        };
        
        console.error('라우터 에러 리포트:', errorReport);
        
        // 추후 에러 추적 서비스로 전송할 수 있음
        // 예: analytics.track('router_error', errorReport);
    }

    async createVueComponent(routeName) {
        // 캐시된 Vue 컴포넌트가 있는지 확인
        const cacheKey = `component_${routeName}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            console.log(`📦 Using cached Vue component: ${routeName}`);
            return cached;
        }
        
        // i18n 초기화가 완료될 때까지 대기
        if (this.config.useI18n && this.i18nInitPromise) {
            try {
                await this.i18nInitPromise;
                console.log('📄 I18n initialization completed before component creation');
                
                // i18n이 제대로 로드되었는지 확인하고 추가 대기
                if (window.i18n && window.i18n.isReady) {
                    await window.i18n.isReady();
                }
            } catch (error) {
                console.warn('⚠️ I18n initialization failed, proceeding without translations:', error);
            }
        }
        
        const script = await this.loadScript(routeName);
        
        if (this.config.environment === 'production') {
            // 프로덕션 모드: 빌드된 컴포넌트는 이미 완성되어 있음
            const router = this; // 라우터 인스턴스 참조를 컴포넌트 정의 밖에서 저장
            const component = {
                ...script,
                // name이 없으면 라우트명을 자동으로 설정 (PascalCase로 변환)
                name: script.name || this.toPascalCase(routeName),
                // template이 없으면 기본 템플릿 생성
                template: script.template || this.generateDefaultTemplate(routeName),
                // UI 컴포넌트들을 컴포넌트 레벨에서 등록
                components: await this.getUIComponents(),
                data() {
                    const originalData = script.data ? script.data() : {};
                    return {
                        ...originalData,
                        currentRoute: routeName,
                        pageTitle: script.pageTitle || router.generatePageTitle(routeName),
                        showHeader: script.showHeader !== false,
                        headerTitle: script.headerTitle || router.generatePageTitle(routeName),
                        headerSubtitle: script.headerSubtitle,
                        $query: router.currentQueryParams || {},
                        // i18n 관련 데이터
                        $lang: router.getCurrentLanguage(),
                        // dataURL 관련 로딩 상태
                        $dataLoading: false
                    };
                },
                async mounted() {
                    // 원래 mounted 함수 실행
                    if (script.mounted) {
                        await script.mounted.call(this);
                    }
                    
                    // dataURL이 있으면 데이터 가져오기
                    if (script.dataURL) {
                        await this.$fetchData();
                    }
                },
                methods: {
                    ...script.methods,
                    navigateTo: (route, params) => router.navigateTo(route, params),
                    getCurrentRoute: () => router.getCurrentRoute(),
                    getQueryParams: () => router.getQueryParams(),
                    getQueryParam: (key) => router.getQueryParam(key),
                    setQueryParams: (params, replace) => router.setQueryParams(params, replace),
                    removeQueryParams: (keys) => router.removeQueryParams(keys),
                    // i18n 함수들을 메서드로 포함
                    $t: this.getI18nTranslateFunction(),
                    $i18n: () => window.i18n || null,
                    // 인증 관련 메서드
                    $isAuthenticated: () => router.isUserAuthenticated(),
                    $logout: () => router.handleLogout(),
                    $loginSuccess: () => router.handleLoginSuccess(),
                    $checkAuth: (route) => router.checkAuthentication(route),
                    $getToken: () => router.getAccessToken(),
                    $setToken: (token, options) => router.setAccessToken(token, options),
                    $removeToken: (storage) => router.removeToken(storage),
                    $getAuthCookie: () => router.getAuthCookie(),
                    $getCookie: (name) => router.getCookieValue(name),
                    // 데이터 fetch 메서드
                    async $fetchData() {
                        if (!script.dataURL) return;
                        
                        this.$dataLoading = true;
                        try {
                            const data = await router.fetchComponentData(script.dataURL);
                            console.log(`📊 Data fetched for ${routeName}:`, data);
                            
                            // 데이터를 컴포넌트에 직접 할당
                            Object.assign(this, data);
                            
                            this.$emit('data-loaded', data);
                        } catch (error) {
                            console.warn(`⚠️ Failed to fetch data for ${routeName}:`, error);
                            this.$emit('data-error', error);
                        } finally {
                            this.$dataLoading = false;
                        }
                    }
                },
                _routeName: routeName
            };
            
            // 캐시에 저장
            this.setCache(cacheKey, component);
            console.log(`💾 Cached Vue component: ${routeName}`);
            
            return component;
        } else {
            // 개발 모드: 개별 파일들을 로드하고 병합
            const template = await this.loadTemplate(routeName);
            const style = await this.loadStyle(routeName);
            const layout = this.config.useLayout && script.layout !== null ? await this.loadLayout(script.layout || this.config.defaultLayout) : null;
            
            const router = this; // 라우터 인스턴스 참조를 컴포넌트 정의 밖에서 저장
            const component = {
                ...script,
                // name이 없으면 라우트명을 자동으로 설정 (PascalCase로 변환)
                name: script.name || this.toPascalCase(routeName),
                template: layout ? this.mergeLayoutWithTemplate(routeName, layout, template) : template,
                // UI 컴포넌트들을 컴포넌트 레벨에서 등록
                components: await this.getUIComponents(),
                data() {
                    const originalData = script.data ? script.data() : {};
                    return {
                        ...originalData,
                        currentRoute: routeName,
                        pageTitle: script.pageTitle || router.generatePageTitle(routeName),
                        pageStyle: style,
                        showHeader: script.showHeader !== false,
                        headerTitle: script.headerTitle || router.generatePageTitle(routeName),
                        headerSubtitle: script.headerSubtitle,
                        $query: router.currentQueryParams || {},
                        // i18n 관련 데이터
                        $lang: router.getCurrentLanguage(),
                        // dataURL 관련 로딩 상태
                        $dataLoading: false
                    };
                },
                async mounted() {
                    // 원래 mounted 함수 실행
                    if (script.mounted) {
                        await script.mounted.call(this);
                    }
                    
                    // dataURL이 있으면 데이터 가져오기
                    if (script.dataURL) {
                        await this.$fetchData();
                    }
                },
                methods: {
                    ...script.methods,
                    navigateTo: (route, params) => router.navigateTo(route, params),
                    getCurrentRoute: () => router.getCurrentRoute(),
                    getQueryParams: () => router.getQueryParams(),
                    getQueryParam: (key) => router.getQueryParam(key),
                    setQueryParams: (params, replace) => router.setQueryParams(params, replace),
                    removeQueryParams: (keys) => router.removeQueryParams(keys),
                    // i18n 함수들을 메서드로 포함
                    $t: this.getI18nTranslateFunction(),
                    $i18n: () => window.i18n || null,
                    // 인증 관련 메서드
                    $isAuthenticated: () => router.isUserAuthenticated(),
                    $logout: () => router.handleLogout(),
                    $loginSuccess: () => router.handleLoginSuccess(),
                    $checkAuth: (route) => router.checkAuthentication(route),
                    $getToken: () => router.getAccessToken(),
                    $setToken: (token, options) => router.setAccessToken(token, options),
                    $removeToken: (storage) => router.removeToken(storage),
                    $getAuthCookie: () => router.getAuthCookie(),
                    $getCookie: (name) => router.getCookieValue(name),
                    // 데이터 fetch 메서드
                    async $fetchData() {
                        if (!script.dataURL) return;
                        
                        this.$dataLoading = true;
                        try {
                            const data = await router.fetchComponentData(script.dataURL);
                            console.log(`📊 Data fetched for ${routeName}:`, data);
                            
                            // 데이터를 컴포넌트에 직접 할당
                            Object.assign(this, data);
                            
                            this.$emit('data-loaded', data);
                        } catch (error) {
                            console.warn(`⚠️ Failed to fetch data for ${routeName}:`, error);
                            this.$emit('data-error', error);
                        } finally {
                            this.$dataLoading = false;
                        }
                    }
                },
                _style: style,
                _routeName: routeName,
                _layout: layout
            };
            
            // 캐시에 저장
            this.setCache(cacheKey, component);
            console.log(`💾 Cached Vue component: ${routeName}`);
            
            return component;
        }
    }

    /**
     * i18n 번역 함수 생성
     */
    getI18nTranslateFunction() {
        if (!this.config.useI18n || (window.i18n && !window.i18n.isEnabled())) {
            // i18n이 비활성화된 경우 키를 그대로 반환하는 더미 함수
            return (key, params) => key;
        } else if (window.i18n && typeof window.i18n.t === 'function') {
            // i18n이 활성화된 경우 실제 번역 함수
            return (key, params) => window.i18n.t(key, params);
        } else {
            // i18n이 아직 로드되지 않은 경우 키를 반환하는 더미 함수
            return (key, params) => key;
        }
    }

    /**
     * 현재 언어 가져오기
     */
    getCurrentLanguage() {
        if (!this.config.useI18n || (window.i18n && !window.i18n.isEnabled())) {
            // i18n이 비활성화된 경우 기본 언어 반환
            return this.config.i18nDefaultLanguage;
        } else if (window.i18n && typeof window.i18n.getCurrentLanguage === 'function') {
            // i18n이 활성화된 경우 현재 언어 반환
            return window.i18n.getCurrentLanguage();
        } else {
            // i18n이 아직 로드되지 않은 경우 기본 언어 반환
            return this.config.i18nDefaultLanguage;
        }
    }

    /**
     * 문자열을 PascalCase로 변환
     */
    toPascalCase(str) {
        return str
            .split(/[-_\s]+/) // 하이픈, 언더스코어, 공백으로 분리
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('');
    }

    /**
     * 페이지 제목 생성
     */
    generatePageTitle(routeName) {
        return this.toPascalCase(routeName).replace(/([A-Z])/g, ' $1').trim();
    }

    /**
     * 기본 템플릿 생성
     */
    generateDefaultTemplate(routeName) {
        const title = this.generatePageTitle(routeName);
        return `
<div class="page-container">
    <header v-if="showHeader" class="page-header">
        <div class="container">
            <h1>{{ headerTitle || pageTitle }}</h1>
            <p v-if="headerSubtitle" class="subtitle">{{ headerSubtitle }}</p>
        </div>
    </header>
    
    <main class="main-content">
        <div class="container">
            <div v-if="$dataLoading" class="loading-state">
                <div class="loading-spinner"></div>
                <p>데이터를 불러오는 중...</p>
            </div>
            
            <div v-else class="content">
                <h2>${title}</h2>
                <p>이 페이지는 자동으로 생성된 기본 템플릿입니다.</p>
                
                <!-- 데이터가 있으면 표시 -->
                <div v-if="Object.keys($data).some(key => !key.startsWith('$') && !['currentRoute', 'pageTitle', 'showHeader', 'headerTitle', 'headerSubtitle'].includes(key))" class="data-display">
                    <h3>데이터</h3>
                    <pre>{{ JSON.stringify($data, null, 2) }}</pre>
                </div>
            </div>
        </div>
    </main>
</div>
        `.trim();
    }

    /**
     * 인증 체크
     */
    async checkAuthentication(routeName) {
        // 인증 시스템이 비활성화된 경우 모든 접근 허용
        if (!this.config.authEnabled) {
            return { allowed: true, reason: 'auth_disabled' };
        }

        // 공개 라우트 체크
        if (this.config.publicRoutes.includes(routeName)) {
            return { allowed: true, reason: 'public_route' };
        }

        // 보호된 라우트 체크
        const isProtectedRoute = this.config.protectedRoutes.includes(routeName);
        const isProtectedPrefix = this.config.protectedPrefixes.some(prefix => 
            routeName.startsWith(prefix + '/') || routeName === prefix
        );

        // 보호된 라우트가 아니면 접근 허용
        if (!isProtectedRoute && !isProtectedPrefix) {
            return { allowed: true, reason: 'not_protected' };
        }

        // 사용자 정의 인증 체크 함수가 있으면 사용
        if (typeof this.config.checkAuthFunction === 'function') {
            try {
                const isAuthenticated = await this.config.checkAuthFunction(routeName);
                return { 
                    allowed: isAuthenticated, 
                    reason: isAuthenticated ? 'custom_auth_success' : 'custom_auth_failed',
                    route: routeName
                };
            } catch (error) {
                console.error('Custom auth function failed:', error);
                return { allowed: false, reason: 'custom_auth_error', error };
            }
        }

        // 기본 인증 체크 (토큰 기반)
        const isAuthenticated = this.isUserAuthenticated();
        return { 
            allowed: isAuthenticated, 
            reason: isAuthenticated ? 'authenticated' : 'not_authenticated',
            route: routeName
        };
    }

    /**
     * 기본 사용자 인증 상태 체크
     */
    isUserAuthenticated() {
        // 여러 방법으로 인증 상태 확인
        
        // 1. localStorage에서 토큰 확인
        const token = localStorage.getItem('authToken') || localStorage.getItem('accessToken');
        if (token) {
            try {
                // JWT 토큰인 경우 만료 시간 체크
                if (token.includes('.')) {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    const isExpired = payload.exp && payload.exp * 1000 < Date.now();
                    if (isExpired) {
                        localStorage.removeItem('authToken');
                        localStorage.removeItem('accessToken');
                        return false;
                    }
                }
                return true;
            } catch (error) {
                console.warn('Token validation failed:', error);
                return false;
            }
        }

        // 2. sessionStorage 확인
        const sessionToken = sessionStorage.getItem('authToken') || sessionStorage.getItem('accessToken');
        if (sessionToken) {
            return true;
        }

        // 3. 쿠키 확인 (설정된 쿠키 이름들 확인)
        const authCookie = this.getAuthCookie();
        if (authCookie) {
            try {
                // JWT 토큰인 경우 만료 시간 체크
                if (authCookie.includes('.')) {
                    const payload = JSON.parse(atob(authCookie.split('.')[1]));
                    const isExpired = payload.exp && payload.exp * 1000 < Date.now();
                    if (isExpired) {
                        this.removeAuthCookie();
                        return false;
                    }
                }
                return true;
            } catch (error) {
                console.warn('Cookie token validation failed:', error);
                return false;
            }
        }

        // 4. 전역 변수 확인
        if (window.user || window.isAuthenticated) {
            return true;
        }

        return false;
    }

    /**
     * 인증 쿠키 값 가져오기
     */
    getAuthCookie() {
        // 기본 쿠키 이름 확인
        const primaryCookie = this.getCookieValue(this.config.authCookieName);
        if (primaryCookie) {
            return primaryCookie;
        }

        // 대체 쿠키 이름들 확인
        for (const cookieName of this.config.authFallbackCookieNames) {
            const cookieValue = this.getCookieValue(cookieName);
            if (cookieValue) {
                return cookieValue;
            }
        }

        return null;
    }

    /**
     * 특정 쿠키 값 가져오기
     */
    getCookieValue(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) {
            return parts.pop().split(';').shift();
        }
        return null;
    }

    /**
     * 인증 쿠키 제거
     */
    removeAuthCookie() {
        const cookiesToRemove = [this.config.authCookieName, ...this.config.authFallbackCookieNames];
        
        for (const cookieName of cookiesToRemove) {
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            // 도메인별로도 제거 시도
            const hostname = window.location.hostname;
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${hostname};`;
        }
    }

    /**
     * 액세스 토큰 가져오기 (컴포넌트에서 사용)
     */
    getAccessToken() {
        // 1. localStorage 확인
        let token = localStorage.getItem('authToken') || localStorage.getItem('accessToken');
        if (token) return token;

        // 2. sessionStorage 확인
        token = sessionStorage.getItem('authToken') || sessionStorage.getItem('accessToken');
        if (token) return token;

        // 3. 쿠키 확인
        token = this.getAuthCookie();
        if (token) return token;

        return null;
    }

    /**
     * 액세스 토큰 설정 (컴포넌트에서 사용)
     */
    setAccessToken(token, options = {}) {
        if (!token) {
            console.warn('Token is required');
            return false;
        }

        const {
            storage = this.config.authStorage, // 'localStorage', 'sessionStorage', 'cookie'
            cookieOptions = this.config.authCookieOptions,
            skipValidation = this.config.authSkipValidation
        } = options;

        // JWT 토큰 유효성 검사 (선택사항)
        if (!skipValidation && token.includes('.')) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const isExpired = payload.exp && payload.exp * 1000 < Date.now();
                if (isExpired) {
                    console.warn('Token is already expired');
                    return false;
                }
                console.log(`Token expires at: ${new Date(payload.exp * 1000).toISOString()}`);
            } catch (error) {
                console.warn('Token validation failed:', error);
                if (!skipValidation) {
                    return false;
                }
            }
        }

        try {
            switch (storage) {
                case 'localStorage':
                    localStorage.setItem('authToken', token);
                    console.log('✅ Token saved to localStorage');
                    break;
                
                case 'sessionStorage':
                    sessionStorage.setItem('authToken', token);
                    console.log('✅ Token saved to sessionStorage');
                    break;
                
                case 'cookie':
                    this.setAuthCookie(token, cookieOptions);
                    console.log('✅ Token saved to cookie');
                    break;
                
                default:
                    // 기본적으로 localStorage에 저장
                    localStorage.setItem('authToken', token);
                    console.log('✅ Token saved to localStorage (default)');
            }

            // 인증 이벤트 발생
            this.emitAuthEvent('token_set', { 
                storage, 
                tokenLength: token.length,
                hasExpiration: token.includes('.')
            });

            return true;
        } catch (error) {
            console.error('Failed to set token:', error);
            return false;
        }
    }

    /**
     * 인증 쿠키 설정
     */
    setAuthCookie(token, options = {}) {
        const {
            cookieName = this.config.authCookieName,
            expires = null, // Date 객체 또는 일수 (숫자)
            path = '/',
            domain = null,
            secure = window.location.protocol === 'https:',
            sameSite = 'Lax'
        } = options;

        let cookieString = `${cookieName}=${encodeURIComponent(token)}; path=${path}`;

        // 만료 시간 설정
        if (expires) {
            if (typeof expires === 'number') {
                // 일수로 지정된 경우
                const expireDate = new Date();
                expireDate.setDate(expireDate.getDate() + expires);
                cookieString += `; expires=${expireDate.toUTCString()}`;
            } else if (expires instanceof Date) {
                // Date 객체로 지정된 경우
                cookieString += `; expires=${expires.toUTCString()}`;
            }
        } else {
            // JWT 토큰에서 만료시간 추출
            if (token.includes('.')) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    if (payload.exp) {
                        const expireDate = new Date(payload.exp * 1000);
                        cookieString += `; expires=${expireDate.toUTCString()}`;
                    }
                } catch (error) {
                    console.debug('Could not extract expiration from JWT token');
                }
            }
        }

        // 도메인 설정
        if (domain) {
            cookieString += `; domain=${domain}`;
        }

        // Secure 플래그
        if (secure) {
            cookieString += '; secure';
        }

        // SameSite 설정
        cookieString += `; samesite=${sameSite}`;

        document.cookie = cookieString;
        console.log(`🍪 Cookie set: ${cookieName}`);
    }

    /**
     * 토큰 제거
     */
    removeToken(storage = 'all') {
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

        // 인증 이벤트 발생
        this.emitAuthEvent('token_removed', { storage });
        console.log(`🗑️ Token removed from ${storage}`);
    }

    /**
     * 로그인 페이지로 리다이렉트
     */
    redirectToLogin(originalRoute) {
        console.log(`🔒 Authentication required for route: ${originalRoute}`);
        
        // 원래 요청한 페이지를 쿼리 파라미터로 저장
        const redirectUrl = originalRoute !== this.config.loginRoute ? 
            `${this.config.loginRoute}?redirect=${encodeURIComponent(originalRoute)}` : 
            this.config.loginRoute;
        
        // 로그인 페이지로 이동
        this.navigateTo(redirectUrl);
        
        // 인증 이벤트 발생
        this.emitAuthEvent('auth_required', { 
            originalRoute, 
            loginRoute: this.config.loginRoute 
        });
    }

    /**
     * 로그인 성공 후 원래 페이지로 리다이렉트
     */
    handleLoginSuccess() {
        const redirectParam = this.getQueryParam('redirect');
        const targetRoute = redirectParam || this.config.redirectAfterLogin;
        
        console.log(`✅ Login successful, redirecting to: ${targetRoute}`);
        
        // 리다이렉트 파라미터 제거하고 이동
        this.navigateTo(targetRoute);
        
        // 인증 이벤트 발생
        this.emitAuthEvent('login_success', { targetRoute });
    }

    /**
     * 로그아웃 처리
     */
    handleLogout() {
        // 토큰 제거
        localStorage.removeItem('authToken');
        localStorage.removeItem('accessToken');
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('accessToken');
        
        // 설정된 쿠키들 제거
        this.removeAuthCookie();
        
        // 전역 변수 제거
        if (window.user) delete window.user;
        if (window.isAuthenticated) window.isAuthenticated = false;
        
        console.log('🚪 User logged out');
        
        // 로그인 페이지로 이동
        this.navigateTo(this.config.loginRoute);
        
        // 인증 이벤트 발생
        this.emitAuthEvent('logout', {});
    }

    /**
     * 인증 이벤트 발생
     */
    emitAuthEvent(eventType, data) {
        const event = new CustomEvent('router:auth', {
            detail: { type: eventType, data, timestamp: Date.now() }
        });
        window.dispatchEvent(event);
    }

    /**
     * 컴포넌트 데이터 가져오기 (dataURL 사용)
     */
    async fetchComponentData(dataURL) {
        try {
            // 현재 쿼리 파라미터를 URL에 추가
            const queryString = this.buildQueryString(this.currentQueryParams || {});
            const fullURL = queryString ? `${dataURL}?${queryString}` : dataURL;
            
            console.log(`🌐 Fetching data from: ${fullURL}`);
            
            const response = await fetch(fullURL, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // 데이터 유효성 검사
            if (typeof data !== 'object' || data === null) {
                throw new Error('Invalid data format: expected object');
            }
            
            return data;
            
        } catch (error) {
            console.error('Failed to fetch component data:', error);
            throw error;
        }
    }

    /**
     * UI 컴포넌트들을 가져오기
     */
    async getUIComponents() {
        if (this.config.environment === 'production') {
            // 프로덕션 모드: 통합 컴포넌트에서 가져오기
            if (this.unifiedComponentsModule) {
                // components export 확인
                if (this.unifiedComponentsModule.components) {
                    return this.unifiedComponentsModule.components;
                }
                // registerComponents 함수가 있는 경우 (기존 방식 호환)
                console.debug('Using legacy component registration method');
                return {};
            }
            return {};
        } else {
            // 개발 모드: ComponentLoader에서 필요한 컴포넌트들 로드
            if (this.componentLoader) {
                try {
                    // 기본 UI 컴포넌트들 로드
                    const componentNames = ['Button', 'Modal', 'Card', 'Toast', 'Input', 'Tabs', 'LanguageSwitcher'];
                    const components = {};
                    
                    for (const name of componentNames) {
                        try {
                            const component = await this.componentLoader.loadComponent(name);
                            if (component) {
                                components[name] = component;
                            }
                        } catch (error) {
                            console.debug(`Failed to load component ${name}:`, error.message);
                        }
                    }
                    
                    return components;
                } catch (error) {
                    console.warn('Failed to load UI components:', error);
                    return {};
                }
            }
            return {};
        }
    }

    /**
     * Vue 컴포넌트 캐시 무효화
     */
    invalidateComponentCache(routeName) {
        const cacheKey = `component_${routeName}`;
        this.removeFromCache(cacheKey);
        console.log(`🗑️ Invalidated component cache: ${routeName}`);
    }

    /**
     * 모든 Vue 컴포넌트 캐시 지우기
     */
    clearComponentCache() {
        const componentKeys = Array.from(this.cache.keys()).filter(key => key.startsWith('component_'));
        componentKeys.forEach(key => this.cache.delete(key));
        console.log(`🗑️ Cleared ${componentKeys.length} component cache entries`);
    }

    async loadLayout(layoutName) {
        const cacheKey = `layout_${layoutName}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            console.log(`🔄 Loading layout: ${this.config.basePath}/layouts/${layoutName}.html`);
            const response = await fetch(`${this.config.basePath}/layouts/${layoutName}.html`);
            if (!response.ok) throw new Error(`Layout not found: ${response.status}`);
            const layout = await response.text();
            
            console.log(`✓ Layout '${layoutName}' loaded successfully`);
            this.setCache(cacheKey, layout);
            return layout;
        } catch (error) {
            console.warn(`❌ Layout '${layoutName}' not found:`, error.message);
            return null;
        }
    }

    mergeLayoutWithTemplate(routeName, layout, template) {

        const cacheKey = `merge_${routeName}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        console.log('🔄 Merging layout with template...');
        
        let result;
        // 레이아웃에서 <slot name="content"> 부분을 템플릿으로 교체
        if (layout.includes('{{ content }}')) {
            result = layout.replace(
                /{{ content }}/s,
                template
            );
        }
        // slot이 없으면 main-content 클래스 내용 교체
        else if (layout.includes('class="main-content"')) {
            console.log('✓ Using main-content replacement');
            result = layout.replace(
                /(<div class="container">).*?(<\/div>\s*<\/main>)/s,
                `$1${template}$2`
            );
        }
        // 마지막 대안: 전체 레이아웃을 템플릿으로 감싸기
        else {
            console.log('✓ Wrapping template with layout');
            result = `${layout}\n${template}`;
        }
        
        console.log('✓ Layout merge completed');
        this.setCache(cacheKey, result);
        return result;
    }

    async loadTemplate(routeName) {
        const cacheKey = `template_${routeName}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        const response = await fetch(`${this.config.basePath}/views/${routeName}.html`);
        if (!response.ok) throw new Error('Template not found');
        const template = await response.text();
        
        this.setCache(cacheKey, template);
        return template;
    }

    async loadScript(routeName) {
        const cacheKey = `script_${routeName}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        let script;
        try {
            if (this.config.environment === 'production') {
                // 프로덕션 모드: routes 폴더에서 빌드된 JS 로드 (절대 경로)
                const importPath = `${this.config.routesPath}/${routeName}.js`;
                console.log(`📦 Loading production route: ${importPath}`);
                const module = await import(importPath);
                script = module.default;
            } else {
                // 개발 모드: src 폴더에서 로드 (절대 경로)
                const importPath = `${this.config.basePath}/logic/${routeName}.js`;
                console.log(`🛠️ Loading development route: ${importPath}`);
                const module = await import(importPath);
                script = module.default;
            }
            
            if (!script) {
                throw new Error(`Route '${routeName}' not found - no default export`);
            }
            
        } catch (error) {
            // import 에러를 404로 분류
            if (error.message.includes('Failed to resolve') || 
                error.message.includes('Failed to fetch') ||
                error.message.includes('not found') ||
                error.name === 'TypeError') {
                throw new Error(`Route '${routeName}' not found - 404`);
            }
            // 다른 에러는 그대로 전파
            throw error;
        }
        
        this.setCache(cacheKey, script);
        return script;
    }

    async loadStyle(routeName) {
        const cacheKey = `style_${routeName}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        const response = await fetch(`${this.config.basePath}/styles/${routeName}.css`);
        if (!response.ok) throw new Error('Style not found');
        const style = await response.text();
        
        this.setCache(cacheKey, style);
        return style;
    }

    async renderComponent(vueComponent, routeName) {
        // 첫 번째 로드인 경우에만 사용 (이후는 renderComponentWithTransition 사용)
        const appElement = document.getElementById('app');
        if (!appElement) return;

        // 로딩 텍스트가 있으면 첫 로드임
        const loadingElement = appElement.querySelector('.loading');
        if (loadingElement) {
            // 첫 로드: 기존 방식으로 직접 마운트
            loadingElement.classList.add('fade-out');
            setTimeout(() => {
                if (loadingElement && loadingElement.parentNode) {
                    loadingElement.remove();
                }
            }, 300);

            // 개발 모드에서만 스타일 적용
            if (this.config.environment === 'development' && vueComponent._style) {
                this.applyStyle(vueComponent._style, routeName);
            }
            
            // Vue 3 앱 생성 및 마운트
            const { createApp } = Vue;
            this.currentVueApp = createApp(vueComponent);
            
            // Vue 3 전역 속성 설정
            this.currentVueApp.config.globalProperties.$router = {
                navigateTo: (route, params) => this.navigateTo(route, params),
                getCurrentRoute: () => this.getCurrentRoute(),
                getQueryParams: () => this.getQueryParams(),
                getQueryParam: (key) => this.getQueryParam(key),
                setQueryParams: (params, replace) => this.setQueryParams(params, replace),
                removeQueryParams: (keys) => this.removeQueryParams(keys),
                currentRoute: this.currentHash,
                currentQuery: this.currentQueryParams || {}
            };

            // 모바일 메뉴 전역 함수 추가
            this.currentVueApp.config.globalProperties.mobileMenuOpen = this.mobileMenuOpen;
            this.currentVueApp.config.globalProperties.toggleMobileMenu = () => this.toggleMobileMenu();
            this.currentVueApp.config.globalProperties.closeMobileMenu = () => this.closeMobileMenu();

            this.currentVueApp.mount('#app');
            
            this.transitionInProgress = false;
        } else {
            // 이후 로드들은 전환 효과 사용
            await this.renderComponentWithTransition(vueComponent, routeName);
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
            getQueryParams: () => this.getQueryParams(),
            getQueryParam: (key) => this.getQueryParam(key),
            setQueryParams: (params, replace) => this.setQueryParams(params, replace),
            removeQueryParams: (keys) => this.removeQueryParams(keys),
            currentRoute: this.currentHash,
            currentQuery: this.currentQueryParams || {}
        };

        // 모바일 메뉴 전역 함수 추가
        newVueApp.config.globalProperties.mobileMenuOpen = this.mobileMenuOpen;
        newVueApp.config.globalProperties.toggleMobileMenu = () => this.toggleMobileMenu();
        newVueApp.config.globalProperties.closeMobileMenu = () => this.closeMobileMenu();

        newVueApp.mount(`#${newPageContainer.id}`);

        // 즉시 이전 페이지들 정리
        setTimeout(() => {
            this.cleanupPreviousPages();
            this.transitionInProgress = false;
        }, 50); // 최소한의 지연만

        // 이전 앱 정리 준비
        if (this.currentVueApp) {
            this.previousVueApp = this.currentVueApp;
        }
        
        this.currentVueApp = newVueApp;
    }

    cleanupPreviousPages() {
        const appElement = document.getElementById('app');
        if (!appElement) return;

        // exiting 상태의 컨테이너들 제거
        const exitingContainers = appElement.querySelectorAll('.page-container.page-exiting');
        exitingContainers.forEach(container => {
            if (container.parentNode) {
                container.remove();
            }
        });

        // 이전 Vue 앱 정리
        if (this.previousVueApp) {
            try {
                this.previousVueApp.unmount();
            } catch (error) {
                console.debug('Previous Vue app already unmounted:', error);
            }
            this.previousVueApp = null;
        }

        // 로딩 텍스트 제거 (첫 로드 시)
        const loadingElement = appElement.querySelector('.loading');
        if (loadingElement) {
            loadingElement.remove();
        }
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
        if (routeName !== this.currentHash) {
            this.currentQueryParams = {};
        }
        
        // Update URL with new route and params
        this.updateURL(routeName, params);
    }

    getCurrentRoute() {
        return this.currentHash;
    }

    // 보안 필터링 메서드들
    sanitizeParameter(value) {
        if (typeof value !== 'string') return value;
        
        // XSS 방어: HTML 태그와 스크립트 제거
        let sanitized = value
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // script 태그 제거
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // iframe 태그 제거
            .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '') // object 태그 제거
            .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '') // embed 태그 제거
            .replace(/<link\b[^<]*>/gi, '') // link 태그 제거
            .replace(/<meta\b[^<]*>/gi, '') // meta 태그 제거
            .replace(/javascript:/gi, '') // javascript: 프로토콜 제거
            .replace(/vbscript:/gi, '') // vbscript: 프로토콜 제거
            .replace(/data:/gi, '') // data: 프로토콜 제거
            .replace(/on\w+\s*=/gi, '') // 이벤트 핸들러 제거 (onclick, onload 등)
            .replace(/expression\s*\(/gi, '') // CSS expression 제거
            .replace(/url\s*\(/gi, ''); // CSS url() 제거
        
        // SQL Injection 방어: 위험한 SQL 키워드 필터링
        const sqlPatterns = [
            /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute|sp_|xp_)\b)/gi,
            /(;|\||&|\*|%|<|>)/g, // 위험한 특수문자
            /(--|\/\*|\*\/)/g, // SQL 주석
            /(\bor\b.*\b=\b|\band\b.*\b=\b)/gi, // OR/AND 조건문
            /('.*'|".*")/g, // 따옴표로 둘러싸인 문자열
            /(\\\w+)/g // 백슬래시 이스케이프
        ];
        
        for (const pattern of sqlPatterns) {
            sanitized = sanitized.replace(pattern, '');
        }
        
        // 추가 보안: 연속된 특수문자 제거
        sanitized = sanitized.replace(/[<>'"&]{2,}/g, '');
        
        // 길이 제한 (DoS 방어) - 설정 가능
        if (sanitized.length > this.config.security.maxParameterLength) {
            sanitized = sanitized.substring(0, this.config.security.maxParameterLength);
        }
        
        return sanitized.trim();
    }

    validateParameter(key, value) {
        // 보안 검증이 비활성화된 경우 통과
        if (!this.config.security.enableParameterValidation) {
            return true;
        }
        
        // 파라미터 키 검증
        if (typeof key !== 'string' || key.length === 0) {
            return false;
        }
        
        // 키 이름 제한 (설정 가능한 패턴 사용)
        if (!this.config.security.allowedKeyPattern.test(key)) {
            if (this.config.security.logSecurityWarnings) {
                console.warn(`Invalid parameter key format: ${key}`);
            }
            return false;
        }
        
        // 키 길이 제한
        if (key.length > 50) {
            if (this.config.security.logSecurityWarnings) {
                console.warn(`Parameter key too long: ${key}`);
            }
            return false;
        }
        
        // 값 타입 검증
        if (value !== null && value !== undefined) {
            if (typeof value === 'string') {
                // 문자열 길이 제한 (설정 가능)
                if (value.length > this.config.security.maxParameterLength) {
                    if (this.config.security.logSecurityWarnings) {
                        console.warn(`Parameter value too long for key: ${key}`);
                    }
                    return false;
                }
                
                // 위험한 패턴 감지
                const dangerousPatterns = [
                    /<script|<iframe|<object|<embed/gi,
                    /javascript:|vbscript:|data:/gi,
                    /union.*select|insert.*into|delete.*from/gi,
                    /\.\.\//g, // 경로 탐색 공격
                    /[<>'"&]{3,}/g // 연속된 특수문자
                ];
                
                for (const pattern of dangerousPatterns) {
                    if (pattern.test(value)) {
                        if (this.config.security.logSecurityWarnings) {
                            console.warn(`Dangerous pattern detected in parameter ${key}:`, value);
                        }
                        return false;
                    }
                }
            } else if (Array.isArray(value)) {
                // 배열 길이 제한 (설정 가능)
                if (value.length > this.config.security.maxArraySize) {
                    if (this.config.security.logSecurityWarnings) {
                        console.warn(`Parameter array too large for key: ${key}`);
                    }
                    return false;
                }
                
                // 배열 각 요소 검증
                for (const item of value) {
                    if (!this.validateParameter(`${key}[]`, item)) {
                        return false;
                    }
                }
            }
        }
        
        return true;
    }

    // 쿼리스트링 파라미터 관리 메서드들
    parseQueryString(queryString) {
        const params = {};
        if (!queryString) return params;
        
        const pairs = queryString.split('&');
        for (const pair of pairs) {
            try {
                const [rawKey, rawValue] = pair.split('=');
                if (!rawKey) continue;
                
                let key, value;
                try {
                    key = decodeURIComponent(rawKey);
                    value = rawValue ? decodeURIComponent(rawValue) : '';
                } catch (e) {
                    console.warn('Failed to decode URI component:', pair);
                    continue;
                }
                
                // 보안 검증
                if (!this.validateParameter(key, value)) {
                    console.warn(`Parameter rejected by security filter: ${key}`);
                    continue;
                }
                
                // 값 sanitize
                const sanitizedValue = this.sanitizeParameter(value);
                
                // 배열 형태의 파라미터 처리 (예: tags[]=a&tags[]=b)
                if (key.endsWith('[]')) {
                    const arrayKey = key.slice(0, -2);
                    
                    // 배열 키도 검증
                    if (!this.validateParameter(arrayKey, [])) {
                        continue;
                    }
                    
                    if (!params[arrayKey]) params[arrayKey] = [];
                    
                    // 배열 크기 제한 (설정 가능)
                    if (params[arrayKey].length < this.config.security.maxArraySize) {
                        params[arrayKey].push(sanitizedValue);
                    } else {
                        if (this.config.security.logSecurityWarnings) {
                            console.warn(`Array parameter ${arrayKey} size limit exceeded`);
                        }
                    }
                } else {
                    params[key] = sanitizedValue;
                }
            } catch (error) {
                console.warn('Error parsing query parameter:', pair, error);
            }
        }
        
        // 전체 파라미터 개수 제한 (설정 가능)
        const paramCount = Object.keys(params).length;
        if (paramCount > this.config.security.maxParameterCount) {
            if (this.config.security.logSecurityWarnings) {
                console.warn(`Too many parameters (${paramCount}). Limiting to first ${this.config.security.maxParameterCount}.`);
            }
            const limitedParams = {};
            let count = 0;
            for (const [key, value] of Object.entries(params)) {
                if (count >= this.config.security.maxParameterCount) break;
                limitedParams[key] = value;
                count++;
            }
            return limitedParams;
        }
        
        return params;
    }

    buildQueryString(params) {
        if (!params || Object.keys(params).length === 0) return '';
        
        const pairs = [];
        for (const [key, value] of Object.entries(params)) {
            if (Array.isArray(value)) {
                // 배열 파라미터 처리
                for (const item of value) {
                    pairs.push(`${encodeURIComponent(key)}[]=${encodeURIComponent(item)}`);
                }
            } else if (value !== undefined && value !== null) {
                pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
            }
        }
        return pairs.join('&');
    }

    hasQueryParamsChanged(newParams) {
        if (!this.currentQueryParams && !newParams) return false;
        if (!this.currentQueryParams || !newParams) return true;
        
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

    getQueryParams() {
        return { ...this.currentQueryParams };
    }

    getQueryParam(key) {
        return this.currentQueryParams ? this.currentQueryParams[key] : undefined;
    }

    setQueryParams(params, replace = false) {
        if (!params || typeof params !== 'object') {
            console.warn('Invalid parameters object provided to setQueryParams');
            return;
        }
        
        const currentParams = replace ? {} : { ...this.currentQueryParams };
        const sanitizedParams = {};
        
        // 파라미터 검증 및 sanitize
        for (const [key, value] of Object.entries(params)) {
            // 키와 값 검증
            if (!this.validateParameter(key, value)) {
                console.warn(`Parameter ${key} rejected by security filter`);
                continue;
            }
            
            // 값 sanitize
            if (value !== undefined && value !== null) {
                if (Array.isArray(value)) {
                    sanitizedParams[key] = value.map(item => this.sanitizeParameter(item));
                } else {
                    sanitizedParams[key] = this.sanitizeParameter(value);
                }
            }
        }
        
        const newParams = { ...currentParams, ...sanitizedParams };
        
        // Remove undefined/null values
        for (const key of Object.keys(newParams)) {
            if (newParams[key] === undefined || newParams[key] === null || newParams[key] === '') {
                delete newParams[key];
            }
        }
        
        // 전체 파라미터 개수 제한 (설정 가능)
        if (Object.keys(newParams).length > this.config.security.maxParameterCount) {
            if (this.config.security.logSecurityWarnings) {
                console.warn('Too many query parameters. Some may be ignored.');
            }
            return;
        }
        
        this.updateURL(this.currentHash, newParams);
    }

    removeQueryParams(keys) {
        const newParams = { ...this.currentQueryParams };
        const keysToRemove = Array.isArray(keys) ? keys : [keys];
        
        for (const key of keysToRemove) {
            delete newParams[key];
        }
        
        this.updateURL(this.currentHash, newParams);
    }

    updateURL(route, params = null) {
        const queryParams = params || this.currentQueryParams || {};
        const queryString = this.buildQueryString(queryParams);
        
        if (this.config.mode === 'hash') {
            let newHash;
            if (route === 'home') {
                newHash = queryString ? `#/?${queryString}` : '#/';
            } else {
                newHash = queryString ? `#/${route}?${queryString}` : `#/${route}`;
            }
            
            // Prevent triggering hashchange if URL is the same
            if (window.location.hash !== newHash) {
                window.location.hash = newHash;
            }
        } else {
            let newPath;
            if (route === 'home') {
                newPath = queryString ? `/?${queryString}` : '/';
            } else {
                newPath = queryString ? `/${route}?${queryString}` : `/${route}`;
            }
            
            // Use replaceState to avoid adding to history when only query params change
            const isSameRoute = window.location.pathname === (route === 'home' ? '/' : `/${route}`);
            if (isSameRoute) {
                window.history.replaceState({}, '', newPath);
            } else {
                window.history.pushState({}, '', newPath);
            }
            this.handleRouteChange();
        }
    }
    
    // 캐시 관리 메서드들
    setCache(key, value) {
        const now = Date.now();
        
        if (this.config.cacheMode === 'lru') {
            // LRU 캐시 관리
            if (this.cache.size >= this.config.maxCacheSize && !this.cache.has(key)) {
                const oldestKey = this.lruOrder.shift();
                this.cache.delete(oldestKey);
                this.cacheTimestamps.delete(oldestKey);
            }
            
            // 기존 키가 있으면 LRU 순서에서 제거
            const existingIndex = this.lruOrder.indexOf(key);
            if (existingIndex > -1) {
                this.lruOrder.splice(existingIndex, 1);
            }
            
            // 최신 순서로 추가
            this.lruOrder.push(key);
        }
        
        this.cache.set(key, value);
        this.cacheTimestamps.set(key, now);
    }
    
    getFromCache(key) {
        const now = Date.now();
        const timestamp = this.cacheTimestamps.get(key);
        
        // TTL 체크
        if (timestamp && (now - timestamp) > this.config.cacheTTL) {
            this.cache.delete(key);
            this.cacheTimestamps.delete(key);
            
            if (this.config.cacheMode === 'lru') {
                const index = this.lruOrder.indexOf(key);
                if (index > -1) {
                    this.lruOrder.splice(index, 1);
                }
            }
            
            return null;
        }
        
        const value = this.cache.get(key);
        
        if (value && this.config.cacheMode === 'lru') {
            // LRU 순서 업데이트
            const index = this.lruOrder.indexOf(key);
            if (index > -1) {
                this.lruOrder.splice(index, 1);
                this.lruOrder.push(key);
            }
        }
        
        return value;
    }
    
    clearCache() {
        this.cache.clear();
        this.cacheTimestamps.clear();
        this.lruOrder = [];
    }
    
    getCacheStats() {
        return {
            size: this.cache.size,
            maxSize: this.config.maxCacheSize,
            mode: this.config.cacheMode,
            ttl: this.config.cacheTTL
        };
    }
    
    // 프리로딩 기능
    async startPreloading() {
        // 설정된 라우트들을 프리로드 대기열에 추가
        console.log(`🚀 Starting preload for routes: [${this.config.preloadRoutes.join(', ')}]`);
        
        for (const route of this.config.preloadRoutes) {
            if (!this.preloadedRoutes.has(route) && route !== this.currentHash) {
                this.preloadQueue.push(route);
            }
        }
        
        // 프리로드 실행
        this.processPreloadQueue();
    }
    
    async processPreloadQueue() {
        if (this.preloadQueue.length === 0) return;
        
        const routeName = this.preloadQueue.shift();
        
        try {
            console.log(`🔄 Preloading route: ${routeName}`);
            await this.preloadRoute(routeName);
            this.preloadedRoutes.add(routeName);
            console.log(`✅ Preloaded route: ${routeName}`);
            
            // 다음 라우트를 설정된 간격 후에 프리로드 (부드러운 백그라운드 로딩)
            setTimeout(() => this.processPreloadQueue(), this.config.preloadInterval);
        } catch (error) {
            console.warn(`⚠️ Failed to preload route ${routeName}:`, error.message);
            // 실패해도 다음 라우트 계속 처리
            setTimeout(() => this.processPreloadQueue(), this.config.preloadInterval);
        }
    }
    
    async preloadRoute(routeName) {
        // 이미 캐시된 경우 스킵
        if (this.getFromCache(`script_${routeName}`)) {
            return;
        }
        
        // 스크립트만 프리로드 (가장 시간이 오래 걸리는 부분)
        await this.loadScript(routeName);
        
        if (this.config.environment === 'development') {
            // 개발 모드에서는 템플릿과 스타일도 프리로드
            try {
                await this.loadTemplate(routeName);
                await this.loadStyle(routeName);
                
                // 레이아웃도 프리로드 (스크립트에 layout 정보가 있는 경우)
                const script = this.getFromCache(`script_${routeName}`);
                if (script && script.layout && script.layout !== null && this.config.useLayout) {
                    await this.loadLayout(script.layout);
                }
            } catch (error) {
                // 템플릿이나 스타일이 없어도 괜찮음
                console.debug(`Optional files not found for ${routeName}:`, error.message);
            }
        }
    }
    
    // 특정 라우트를 즉시 프리로드
    preloadSpecificRoute(routeName) {
        if (!this.preloadedRoutes.has(routeName) && routeName !== this.currentHash) {
            this.preloadQueue.unshift(routeName); // 큐의 맨 앞에 추가
            this.processPreloadQueue();
        }
    }
}
// 전역 라우터는 index.html에서 환경설정과 함께 생성됨