/**
 * ViewLogic Route Loading System
 * 라우트 로딩 및 컴포넌트 관리 시스템
 */
export class RouteLoader {
    constructor(router, options = {}) {
        this.config = {
            srcPath: options.srcPath || router.config.srcPath || '/src',    // 소스 파일 경로
            routesPath: options.routesPath || router.config.routesPath || '/routes', // 프로덕션 라우트 경로
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
                // 개발 모드: srcPath 사용하여 소스 파일 경로 구성
                const importPath = `${this.config.srcPath}/logic/${routeName}.js`;
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
            const templatePath = `${this.config.srcPath}/views/${routeName}.html`;
            const response = await fetch(templatePath);
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
            const stylePath = `${this.config.srcPath}/styles/${routeName}.css`;
            const response = await fetch(stylePath);
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
            const layoutPath = `${this.config.srcPath}/layouts/${layoutName}.html`;
            const response = await fetch(layoutPath);
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
        
        // 컴포넌트 로딩 (실패해도 라우터는 계속 작동)
        let loadedComponents = {};
        if (this.config.useComponents && router.componentLoader) {
            try {
                loadedComponents = await router.componentLoader.loadAllComponents();
                this.log('debug', `Components loaded successfully for route: ${routeName}`);
            } catch (error) {
                this.log('warn', `Component loading failed for route '${routeName}', continuing without components:`, error.message);
                loadedComponents = {}; // 빈 객체로 폴백
            }
        }

        // 단일 컴포넌트 생성
        const component = {
            ...script,
            name: script.name || this.toPascalCase(routeName),
            template,
            components: loadedComponents,
            data() {
                const originalData = script.data ? script.data() : {};
                const commonData = {
                    ...originalData,
                    currentRoute: routeName,
                    $query: router.queryManager?.getQueryParams() || {},
                    $lang: (() => {
                        try {
                            return router.i18nManager?.getCurrentLanguage() || router.config.i18nDefaultLanguage || router.config.defaultLanguage || 'ko';
                        } catch (error) {
                            if (router.errorHandler) router.errorHandler.warn('RouteLoader', 'Failed to get current language:', error);
                            return router.config.defaultLanguage || 'ko';
                        }
                    })(),
                    $dataLoading: false
                };
                
                return commonData;
            },
            computed: {
                ...(script.computed || {}),
                // 하위 호환성을 위해 params는 유지하되 getAllParams 사용
                params() {
                    return router.queryManager?.getAllParams() || {};
                }
            },
            async mounted() {
                if (script.mounted) {
                    await script.mounted.call(this);
                }
                if (script.dataURL) {
                    if (typeof script.dataURL === 'string') {
                        // 기존 단일 API 방식 (하위 호환성)
                        await this.$fetchData();
                    } else if (typeof script.dataURL === 'object') {
                        // 새로운 다중 API 방식
                        await this.$fetchMultipleData();
                    }
                }
                
                // 🆕 자동 폼 바인딩
                await this.$nextTick(); // DOM이 완전히 렌더링된 후
                this.$bindAutoForms();
            },
            methods: {
                ...script.methods,
                // 라우팅 관련
                navigateTo: (route, params) => router.navigateTo(route, params),
                getCurrentRoute: () => router.getCurrentRoute(),
                
                // 통합된 파라미터 관리 (라우팅 + 쿼리 파라미터)
                getParams: () => router.queryManager?.getAllParams() || {},
                getParam: (key, defaultValue) => router.queryManager?.getParam(key, defaultValue),
                
                // i18n 관련 (resilient - i18n 실패해도 key 반환)
                $t: (key, params) => {
                    try {
                        return router.i18nManager?.t(key, params) || key;
                    } catch (error) {
                        if (router.errorHandler) router.errorHandler.warn('RouteLoader', 'i18n translation failed, returning key:', error);
                        return key;
                    }
                },

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
                
                // 데이터 fetch (단일 API 또는 특정 API)
                async $fetchData(apiName) {
                    if (!script.dataURL) return;
                    
                    this.$dataLoading = true;
                    try {
                        if (typeof script.dataURL === 'string') {
                            // 기존 단일 API 방식
                            const data = await router.routeLoader.fetchComponentData(script.dataURL);
                            if (router.errorHandler) router.errorHandler.debug('RouteLoader', `Data fetched for ${routeName}:`, data);
                            Object.assign(this, data);
                            this.$emit('data-loaded', data);
                        } else if (typeof script.dataURL === 'object' && apiName) {
                            // 특정 API만 새로고침
                            const url = script.dataURL[apiName];
                            if (url) {
                                const data = await router.routeLoader.fetchComponentData(url);
                                if (router.errorHandler) router.errorHandler.debug('RouteLoader', `Data fetched for ${routeName}.${apiName}:`, data);
                                this[apiName] = data;
                                this.$emit('data-loaded', { [apiName]: data });
                            }
                        } else {
                            // 다중 API - 전체 새로고침
                            await this.$fetchMultipleData();
                        }
                    } catch (error) {
                        if (router.errorHandler) router.errorHandler.warn('RouteLoader', `Failed to fetch data for ${routeName}:`, error);
                        this.$emit('data-error', error);
                    } finally {
                        this.$dataLoading = false;
                    }
                },

                // 다중 API 데이터 fetch
                async $fetchMultipleData() {
                    if (!script.dataURL || typeof script.dataURL !== 'object') return;
                    
                    const dataURLs = script.dataURL;
                    this.$dataLoading = true;
                    
                    try {
                        // 병렬로 모든 API 호출
                        const promises = Object.entries(dataURLs).map(async ([key, url]) => {
                            try {
                                const data = await router.routeLoader.fetchComponentData(url);
                                return { key, data, success: true };
                            } catch (error) {
                                if (router.errorHandler) router.errorHandler.warn('RouteLoader', `Failed to fetch ${key} for ${routeName}:`, error);
                                return { key, error, success: false };
                            }
                        });
                        
                        const results = await Promise.all(promises);
                        const successfulResults = {};
                        const errors = {};
                        
                        // 결과 처리
                        results.forEach(({ key, data, error, success }) => {
                            if (success) {
                                this[key] = data;
                                successfulResults[key] = data;
                            } else {
                                errors[key] = error;
                            }
                        });
                        
                        if (router.errorHandler) router.errorHandler.debug('RouteLoader', `Multiple data fetched for ${routeName}:`, successfulResults);
                        
                        // 이벤트 발생
                        if (Object.keys(successfulResults).length > 0) {
                            this.$emit('data-loaded', successfulResults);
                        }
                        if (Object.keys(errors).length > 0) {
                            this.$emit('data-error', errors);
                        }
                        
                    } catch (error) {
                        if (router.errorHandler) router.errorHandler.warn('RouteLoader', `Failed to fetch multiple data for ${routeName}:`, error);
                        this.$emit('data-error', error);
                    } finally {
                        this.$dataLoading = false;
                    }
                },

                // 전체 데이터 새로고침 (명시적 메서드)
                async $fetchAllData() {
                    if (typeof script.dataURL === 'string') {
                        await this.$fetchData();
                    } else if (typeof script.dataURL === 'object') {
                        await this.$fetchMultipleData();
                    }
                },

                // 🆕 자동 폼 바인딩 메서드
                $bindAutoForms() {
                    const forms = document.querySelectorAll('form.auto-form, form[action]');
                    
                    forms.forEach(form => {
                        // 기존 이벤트 리스너 제거 (중복 방지)
                        form.removeEventListener('submit', form._boundSubmitHandler);
                        
                        // 새 이벤트 리스너 추가
                        const boundHandler = (e) => this.$handleFormSubmit(e);
                        form._boundSubmitHandler = boundHandler;
                        form.addEventListener('submit', boundHandler);
                        
                        if (router.errorHandler) router.errorHandler.debug('RouteLoader', `Form auto-bound: ${form.getAttribute('action')}`);
                    });
                },

                // 🆕 폼 서브밋 핸들러
                async $handleFormSubmit(event) {
                    event.preventDefault();
                    
                    const form = event.target;
                    let action = form.getAttribute('action');
                    const method = form.getAttribute('method') || 'POST';
                    
                    // 핸들러 함수들 가져오기
                    const successHandler = form.getAttribute('data-success-handler');
                    const errorHandler = form.getAttribute('data-error-handler');  
                    const loadingHandler = form.getAttribute('data-loading-handler');
                    const redirectTo = form.getAttribute('data-redirect');

                    try {
                        // 로딩 시작
                        if (loadingHandler && this[loadingHandler]) {
                            this[loadingHandler](true, form);
                        }

                        // 🆕 액션 URL에 가변 파라미터 처리 (간단한 템플릿 치환)
                        action = this.$processActionParams(action);

                        // 클라이언트 사이드 검증
                        if (!this.$validateForm(form)) {
                            return;
                        }

                        // FormData 생성
                        const formData = new FormData(form);
                        const data = Object.fromEntries(formData.entries());

                        if (router.errorHandler) router.errorHandler.debug('RouteLoader', `Form submitting to: ${action}`, data);

                        // API 호출
                        const response = await this.$submitFormData(action, method, data, form);
                        
                        // 성공 핸들러 호출
                        if (successHandler && this[successHandler]) {
                            this[successHandler](response, form);
                        }

                        // 자동 리다이렉트
                        if (redirectTo) {
                            setTimeout(() => {
                                this.navigateTo(redirectTo);
                            }, 1000); // 1초 후 리다이렉트
                        }

                    } catch (error) {
                        if (router.errorHandler) router.errorHandler.warn('RouteLoader', `Form submission error:`, error);
                        
                        // 에러 핸들러 호출
                        if (errorHandler && this[errorHandler]) {
                            this[errorHandler](error, form);
                        } else {
                            console.error('Form submission error:', error);
                        }
                    } finally {
                        // 로딩 종료
                        if (loadingHandler && this[loadingHandler]) {
                            this[loadingHandler](false, form);
                        }
                    }
                },

                // 🆕 액션 파라미터 처리 메서드 (간단한 템플릿 치환)
                $processActionParams(actionTemplate) {
                    let processedAction = actionTemplate;
                    
                    // {paramName} 패턴 찾기
                    const paramMatches = actionTemplate.match(/\{([^}]+)\}/g);
                    
                    if (paramMatches) {
                        paramMatches.forEach(match => {
                            const paramName = match.slice(1, -1); // {id} -> id
                            
                            try {
                                // 컴포넌트의 data나 computed, methods에서 값 찾기
                                let paramValue = null;
                                
                                // 1. 먼저 getParam으로 라우트 파라미터에서 찾기
                                paramValue = this.getParam(paramName);
                                
                                // 2. 컴포넌트 data에서 찾기
                                if (paramValue === null || paramValue === undefined) {
                                    paramValue = this[paramName];
                                }
                                
                                // 3. computed 속성에서 찾기
                                if (paramValue === null || paramValue === undefined) {
                                    if (this.$options.computed && this.$options.computed[paramName]) {
                                        paramValue = this[paramName];
                                    }
                                }
                                
                                if (paramValue !== null && paramValue !== undefined) {
                                    // 템플릿 대체: {id} -> 실제값
                                    processedAction = processedAction.replace(
                                        match, 
                                        encodeURIComponent(paramValue)
                                    );
                                    
                                    if (router.errorHandler) router.errorHandler.debug('RouteLoader', `Parameter resolved: ${paramName} = ${paramValue}`);
                                } else {
                                    if (router.errorHandler) router.errorHandler.warn('RouteLoader', `Parameter '${paramName}' not found in component data, computed, or route params`);
                                    // 파라미터를 찾을 수 없으면 원본 그대로 유지
                                }
                            } catch (error) {
                                if (router.errorHandler) router.errorHandler.warn('RouteLoader', `Error processing parameter '${paramName}':`, error);
                                // 에러가 발생해도 원본 그대로 유지
                            }
                        });
                    }
                    
                    return processedAction;
                },


                // 🆕 폼 데이터 서브밋
                async $submitFormData(action, method, data, form) {
                    // 파일 업로드 체크
                    const hasFile = Array.from(form.elements).some(el => el.type === 'file' && el.files.length > 0);
                    
                    const headers = {
                        'Accept': 'application/json',
                        // 인증 토큰 자동 추가
                        ...(this.$getToken() && {
                            'Authorization': `Bearer ${this.$getToken()}`
                        })
                    };

                    let body;
                    if (hasFile) {
                        // 파일이 있으면 FormData 그대로 전송
                        body = new FormData(form);
                        // Content-Type을 설정하지 않음 (브라우저가 자동으로 multipart/form-data로 설정)
                    } else {
                        // JSON으로 전송
                        headers['Content-Type'] = 'application/json';
                        body = JSON.stringify(data);
                    }

                    const response = await fetch(action, {
                        method: method.toUpperCase(),
                        headers,
                        body
                    });

                    if (!response.ok) {
                        let error;
                        try {
                            error = await response.json();
                        } catch (e) {
                            error = { message: `HTTP ${response.status}: ${response.statusText}` };
                        }
                        throw new Error(error.message || `HTTP ${response.status}`);
                    }

                    try {
                        return await response.json();
                    } catch (e) {
                        // 응답이 JSON이 아닌 경우 (예: 204 No Content)
                        return { success: true };
                    }
                },

                // 🆕 클라이언트 사이드 폼 검증
                $validateForm(form) {
                    let isValid = true;
                    const inputs = form.querySelectorAll('input, textarea, select');

                    inputs.forEach(input => {
                        // 기본 HTML5 검증
                        if (!input.checkValidity()) {
                            isValid = false;
                            input.classList.add('error');
                            return;
                        }

                        // 커스텀 검증 함수 확인
                        const validationFunction = input.getAttribute('data-validation');
                        if (validationFunction) {
                            const isInputValid = this.$validateInput(input, validationFunction);
                            if (!isInputValid) {
                                isValid = false;
                                input.classList.add('error');
                            } else {
                                input.classList.remove('error');
                            }
                        } else {
                            input.classList.remove('error');
                        }
                    });

                    return isValid;
                },

                // 🆕 개별 입력 검증
                $validateInput(input, validationFunction) {
                    const value = input.value;
                    
                    // 커스텀 검증 함수 호출
                    if (typeof this[validationFunction] === 'function') {
                        try {
                            return this[validationFunction](value, input);
                        } catch (error) {
                            if (router.errorHandler) router.errorHandler.warn('RouteLoader', `Validation function '${validationFunction}' error:`, error);
                            return false;
                        }
                    }
                    
                    // 함수가 없으면 true 반환
                    if (router.errorHandler) router.errorHandler.warn('RouteLoader', `Validation function '${validationFunction}' not found`);
                    return true;
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
            srcPath: this.config.srcPath,
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