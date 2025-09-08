/**
 * ViewLogic Route Loading System
 * 라우트 로딩 및 컴포넌트 관리 시스템
 */
export class RouteLoader {
    constructor(router, options = {}) {
        this.config = {
            basePath: options.basePath || '/src',
            routesPath: options.routesPath || '/routes',
            environment: options.environment || 'development',
            useLayout: options.useLayout !== false,
            defaultLayout: options.defaultLayout || 'default',
            useComponents: options.useComponents !== false,
            debug: options.debug || false
        };
        
        // 라우터 인스턴스 참조
        this.router = router;
        this.log('debug', 'RouteLoader initialized with config:', this.config);
    }

    /**
     * 스크립트 파일 로드
     */
    async loadScript(routeName) {
        let script;
        try {
            if (this.config.environment === 'production') {
                // 프로덕션 모드: routes 폴더에서 빌드된 JS 로드 (절대 경로)
                const importPath = `${this.config.routesPath}/${routeName}.js`;
                this.log('debug', `Loading production route: ${importPath}`);
                const module = await import(importPath);
                script = module.default;
            } else {
                // 개발 모드: src 폴더에서 로드 (절대 경로)
                const importPath = `${this.config.basePath}/logic/${routeName}.js`;
                this.log('debug', `Loading development route: ${importPath}`);
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
        
        return script;
    }

    /**
     * 템플릿 파일 로드 (실패시 기본값 반환)
     */
    async loadTemplate(routeName) {
        try {
            const response = await fetch(`${this.config.basePath}/views/${routeName}.html`);
            if (!response.ok) throw new Error(`Template not found: ${response.status}`);
            const template = await response.text();
            this.log('debug', `Template '${routeName}' loaded successfully`);
            return template;
        } catch (error) {
            this.log('warn', `Template '${routeName}' not found, using default:`, error.message);
            // 기본 템플릿 반환
            return this.generateDefaultTemplate(routeName);
        }
    }

    /**
     * 스타일 파일 로드 (실패시 빈 문자열 반환)
     */
    async loadStyle(routeName) {
        try {
            const response = await fetch(`${this.config.basePath}/styles/${routeName}.css`);
            if (!response.ok) throw new Error(`Style not found: ${response.status}`);
            const style = await response.text();
            this.log('debug', `Style '${routeName}' loaded successfully`);
            return style;
        } catch (error) {
            this.log('debug', `Style '${routeName}' not found, no styles applied:`, error.message);
            // 스타일이 없으면 빈 문자열 반환
            return '';
        }
    }

    /**
     * 레이아웃 파일 로드 (실패시 null 반환)
     */
    async loadLayout(layoutName) {
        try {
            const response = await fetch(`${this.config.basePath}/layouts/${layoutName}.html`);
            if (!response.ok) throw new Error(`Layout not found: ${response.status}`);
            const layout = await response.text();
            
            this.log('debug', `Layout '${layoutName}' loaded successfully`);
            return layout;
        } catch (error) {
            this.log('debug', `Layout '${layoutName}' not found, no layout applied:`, error.message);
            return null;
        }
    }

    /**
     * 레이아웃과 템플릿 병합
     */
    mergeLayoutWithTemplate(routeName, layout, template) {
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
            this.log('debug', 'Using main-content replacement');
            result = layout.replace(
                /(<div class="container">).*?(<\/div>\s*<\/main>)/s,
                `$1${template}$2`
            );
        }
        // 마지막 대안: 전체 레이아웃을 템플릿으로 감싸기
        else {
            this.log('debug', 'Wrapping template with layout');
            result = `${layout}\n${template}`;
        }
        
        return result;
    }


    /**
     * Vue 컴포넌트 생성
     */
    async createVueComponent(routeName) {
        // 캐시된 Vue 컴포넌트가 있는지 확인
        const cacheKey = `component_${routeName}`;
        const cached = this.router.cacheManager?.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }
        
        const script = await this.loadScript(routeName);
        const router = this.router;
        const isProduction = this.config.environment === 'production';
        
        // 환경별 리소스 로딩
        let template, style = '', layout = null;
        
        if (isProduction) {
            // 프로덕션: 스크립트에 있는 템플릿 사용 또는 기본값
            template = script.template || this.generateDefaultTemplate(routeName);
        } else {
            // 개발: 개별 파일들 로드
            template = await this.loadTemplate(routeName);
            style = await this.loadStyle(routeName);
            layout = this.config.useLayout && script.layout !== null ? 
                await this.loadLayout(script.layout || this.config.defaultLayout) : null;
            
            // 레이아웃과 템플릿 병합
            if (layout) {
                template = this.mergeLayoutWithTemplate(routeName, layout, template);
            }
        }
        
        // 단일 컴포넌트 생성
        const component = {
            ...script,
            name: script.name || this.toPascalCase(routeName),
            template,
            components: this.config.useComponents && router.componentLoader ? 
                await router.componentLoader.loadAllComponents() : {},
            data() {
                const originalData = script.data ? script.data() : {};
                const commonData = {
                    ...originalData,
                    currentRoute: routeName,
                    pageTitle: script.pageTitle || router.routeLoader.generatePageTitle(routeName),
                    showHeader: script.showHeader !== false,
                    headerTitle: script.headerTitle || router.routeLoader.generatePageTitle(routeName),
                    headerSubtitle: script.headerSubtitle,
                    $query: router.queryManager?.getQueryParams() || {},
                    $lang: router.i18nManager?.getCurrentLanguage() || router.config.i18nDefaultLanguage,
                    $dataLoading: false
                };
                
                return commonData;
            },
            computed: {
                ...(script.computed || {}),
                params() {
                    return router.queryManager?.getQueryParams() || {};
                }
            },
            async mounted() {
                if (script.mounted) {
                    await script.mounted.call(this);
                }
                if (script.dataURL) {
                    await this.$fetchData();
                }
            },
            methods: {
                ...script.methods,
                // 라우팅 관련
                navigateTo: (route, params) => router.navigateTo(route, params),
                getCurrentRoute: () => router.getCurrentRoute(),
                getQueryParams: () => router.queryManager?.getQueryParams() || {},
                getQueryParam: (key) => router.queryManager?.getQueryParam(key),
                setQueryParams: (params, replace) => router.queryManager?.setQueryParams(params, replace),
                removeQueryParams: (keys) => router.queryManager?.removeQueryParams(keys),
                // i18n 관련
                $t: (key, params) => router.i18nManager?.t(key, params) || key,
                $i18n: () => router.i18nManager || null,
                // 인증 관련
                $isAuthenticated: () => router.authManager?.isUserAuthenticated() || false,
                $logout: () => router.authManager ? router.navigateTo(router.authManager.handleLogout()) : null,
                $loginSuccess: (target) => router.authManager ? router.navigateTo(router.authManager.handleLoginSuccess(target)) : null,
                $checkAuth: (route) => router.authManager ? router.authManager.checkAuthentication(route) : Promise.resolve({ allowed: true, reason: 'auth_disabled' }),
                $getToken: () => router.authManager?.getAccessToken() || null,
                $setToken: (token, options) => router.authManager?.setAccessToken(token, options) || false,
                $removeToken: (storage) => router.authManager?.removeAccessToken(storage) || null,
                $getAuthCookie: () => router.authManager?.getAuthCookie() || null,
                $getCookie: (name) => router.authManager?.getCookieValue(name) || null,
                // 데이터 fetch
                async $fetchData() {
                    if (!script.dataURL) return;
                    
                    this.$dataLoading = true;
                    try {
                        const data = await router.routeLoader.fetchComponentData(script.dataURL);
                        if (router.errorHandler) router.errorHandler.debug('RouteLoader', `Data fetched for ${routeName}:`, data);
                        Object.assign(this, data);
                        this.$emit('data-loaded', data);
                    } catch (error) {
                        if (router.errorHandler) router.errorHandler.warn('RouteLoader', `Failed to fetch data for ${routeName}:`, error);
                        this.$emit('data-error', error);
                    } finally {
                        this.$dataLoading = false;
                    }
                }
            },
            _routeName: routeName
        };
        
        // 개발 모드에서만 스타일 메타데이터 저장 (렌더링 시 주입용)
        if (!isProduction && style) {
            component._style = style;
        }
        
        // 캐시에 저장
        this.router.cacheManager?.setCache(cacheKey, component);
        
        return component;
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
     * 기본 템플릿 생성
     */
    generateDefaultTemplate(routeName) {
        return `<div class="route-${routeName}"><h1>Route: ${routeName}</h1></div>`;
    }

    /**
     * 컴포넌트 데이터 가져오기
     */
    async fetchComponentData(dataURL) {
        try {
            // 현재 쿼리 파라미터를 URL에 추가
            const queryString = this.router.queryManager?.buildQueryString(this.router.queryManager?.getQueryParams()) || '';
            const fullURL = queryString ? `${dataURL}?${queryString}` : dataURL;
            
            this.log('debug', `Fetching data from: ${fullURL}`);
            
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
            this.log('error', 'Failed to fetch component data:', error);
            throw error;
        }
    }

    /**
     * 캐시 무효화
     */
    invalidateCache(routeName) {
        if (this.router.cacheManager) {
            this.router.cacheManager.invalidateComponentCache(routeName);
        }
        this.log('debug', `Cache invalidated for route: ${routeName}`);
    }

    /**
     * 통계 정보 반환
     */
    getStats() {
        return {
            environment: this.config.environment,
            basePath: this.config.basePath,
            routesPath: this.config.routesPath,
            useLayout: this.config.useLayout,
            useComponents: this.config.useComponents
        };
    }

    /**
     * 페이지 제목 생성
     */
    generatePageTitle(routeName) {
        return this.toPascalCase(routeName).replace(/([A-Z])/g, ' $1').trim();
    }

    /**
     * 로깅 래퍼 메서드
     */
    log(level, ...args) {
        if (this.router?.errorHandler) {
            this.router.errorHandler.log(level, 'RouteLoader', ...args);
        }
    }

    /**
     * 정리 (메모리 누수 방지)
     */
    destroy() {
        this.log('debug', 'RouteLoader destroyed');
        this.router = null;
    }
}