/**
 * ViewLogic Route Loading System
 * 라우트 로딩 및 컴포넌트 관리 시스템
 */
import { FormHandler } from './FormHandler.js';
import { ApiHandler } from './ApiHandler.js';
import { ComponentLoader } from './ComponentLoader.js';

export class RouteLoader {
    constructor(router, options = {}) {
        this.config = {
            srcPath: options.srcPath || router.config.srcPath || '/src',    // 소스 파일 경로
            routesPath: options.routesPath || router.config.routesPath || '/routes', // 프로덕션 라우트 경로
            environment: options.environment || 'development',
            useLayout: options.useLayout !== false,
            defaultLayout: options.defaultLayout || 'default',
            debug: options.debug || false
        };
        
        // 라우터 인스턴스 참조
        this.router = router;
        
        // FormHandler 인스턴스 생성
        this.formHandler = new FormHandler(router, this.config);
        
        // ApiHandler 인스턴스 생성
        this.apiHandler = new ApiHandler(router, this.config);
        
        // ComponentLoader 인스턴스 생성 (기본으로 활성화)
        this.componentLoader = new ComponentLoader(router, this.config);
        
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
        const cached = this.router.cacheManager?.get(cacheKey);
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
            // 개발: 개별 파일들 병렬 로드
            const loadPromises = [
                this.loadTemplate(routeName),
                this.loadStyle(routeName)
            ];
            
            // 레이아웃 로딩 조건부 추가
            if (this.config.useLayout && script.layout !== null) {
                loadPromises.push(this.loadLayout(script.layout || this.config.defaultLayout));
            } else {
                loadPromises.push(Promise.resolve(null));
            }
            
            // 병렬 실행
            const [loadedTemplate, loadedStyle, loadedLayout] = await Promise.all(loadPromises);
            
            template = loadedTemplate;
            style = loadedStyle;
            layout = loadedLayout;
            
            // 레이아웃과 템플릿 병합
            if (layout) {
                template = this.mergeLayoutWithTemplate(routeName, layout, template);
            }
        }
        
        // 컴포넌트 로딩 (실패해도 라우터는 계속 작동)
        let loadedComponents = {};
        if (this.componentLoader) {
            try {
                let componentNames = null;
                
                // 개발 모드에서만 동적 컴포넌트 발견
                if (!isProduction) {
                    const layoutName = script.layout || this.config.defaultLayout;
                    componentNames = this.componentLoader.getComponentNames(template, layout, layoutName);
                    this.log('debug', `[DEVELOPMENT] Discovered components for route '${routeName}':`, componentNames);
                }
                
                loadedComponents = await this.componentLoader.loadAllComponents(componentNames);
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
                    $params: router.queryManager?.getRouteParams() || {},
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
                // API 객체 초기화
                this.$api = router.routeLoader.apiHandler.bindToComponent(this);

                // 상태 관리 초기화
                this.$state = router.stateHandler;

                if (script.mounted) {
                    await script.mounted.call(this);
                }
                if (script.dataURL) {
                    // 통합된 데이터 fetch (단일/다중 API 자동 처리)
                    await this.fetchData();
                }
                
                // 🆕 자동 폼 바인딩
                await this.$nextTick(); // DOM이 완전히 렌더링된 후
                router.routeLoader.formHandler.bindAutoForms(this);
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

                // 인증 관련 (핵심 4개 메소드만)
                isAuth: () => router.authManager?.isAuthenticated() || false,
                logout: () => router.authManager ? router.navigateTo(router.authManager.logout()) : null,
                getToken: () => router.authManager?.getAccessToken() || null,
                setToken: (token, options) => router.authManager?.setAccessToken(token, options) || false,


                // 데이터 fetch (ApiHandler 래퍼)
                async fetchData(dataConfig = null) {
                    // dataConfig가 제공되면 사용, 아니면 script.dataURL 사용
                    const configToUse = dataConfig || script.dataURL;
                    if (!configToUse) return null;
                    
                    this.$dataLoading = true;
                    try {
                        if (typeof configToUse === 'string') {
                            // 단일 API 방식
                            const data = await router.routeLoader.apiHandler.fetchData(configToUse, this);
                            Object.assign(this, data);
                            this.$emit('data-loaded', data);
                            return data;
                            
                        } else if (typeof configToUse === 'object') {
                            // 다중 API 방식 - ApiHandler의 fetchMultipleData 사용
                            const { results, errors } = await router.routeLoader.apiHandler.fetchMultipleData(configToUse, this);
                            
                            // 성공한 결과를 컴포넌트 데이터에 병합
                            Object.assign(this, results);
                            
                            // 이벤트 발생
                            if (Object.keys(results).length > 0) {
                                this.$emit('data-loaded', results);
                            }
                            if (Object.keys(errors).length > 0) {
                                this.$emit('data-error', errors);
                            }
                            
                            return results;
                        }
                        
                        return null;
                    } catch (error) {
                        if (router.errorHandler) router.errorHandler.warn('RouteLoader', `Failed to fetch data for ${routeName}:`, error);
                        this.$emit('data-error', error);
                        throw error;
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
        this.router.cacheManager?.set(cacheKey, component);
        
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
        // FormHandler 정리
        if (this.formHandler) {
            this.formHandler.destroy();
            this.formHandler = null;
        }
        
        // ApiHandler 정리
        if (this.apiHandler) {
            this.apiHandler.destroy();
            this.apiHandler = null;
        }
        
        // ComponentLoader 정리
        if (this.componentLoader) {
            this.componentLoader.dispose();
            this.componentLoader = null;
        }
        
        this.log('debug', 'RouteLoader destroyed');
        this.router = null;
    }
}