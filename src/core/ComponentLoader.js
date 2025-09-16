/**
 * ComponentLoader
 * 동적으로 컴포넌트를 로드하고 등록하는 시스템
 */
export class ComponentLoader {
    constructor(router = null, options = {}) {

        this.config = {
            componentsPath: options.componentsPath || '/components',  // srcPath 기준 상대 경로
            debug: options.debug || false,
            environment: options.environment || 'development',
            ...options
        };
        
        this.router = router;
        this.loadingPromises = new Map();
        this.unifiedComponents = null;
    }
    
    /**
     * 로깅 래퍼 메서드
     */
    log(level, ...args) {
        if (this.router?.errorHandler) {
            this.router.errorHandler.log(level, 'ComponentLoader', ...args);
        }
    }
    
    /**
     * 컴포넌트를 비동기로 로드 (캐시 지원)
     */
    async loadComponent(componentName) {
        if (!componentName || typeof componentName !== 'string') {
            throw new Error('Component name must be a non-empty string');
        }
        
        // 캐시에서 컴포넌트 확인
        const cacheKey = `component_${componentName}`;
        const cachedComponent = this.router?.cacheManager?.getFromCache(cacheKey);
        if (cachedComponent) {
            this.log('debug', `Component '${componentName}' loaded from cache`);
            return cachedComponent;
        }
        
        // 이미 로딩 중인 경우 기존 Promise 반환
        if (this.loadingPromises.has(componentName)) {
            return this.loadingPromises.get(componentName);
        }
        
        const loadPromise = this._loadComponentFromFile(componentName);
        this.loadingPromises.set(componentName, loadPromise);
        
        try {
            const component = await loadPromise;
            
            // 캐시에 저장
            if (component && this.router?.cacheManager) {
                this.router.cacheManager.setCache(cacheKey, component);
                this.log('debug', `Component '${componentName}' cached successfully`);
            }
            
            return component;
        } catch (error) {
            throw error;
        } finally {
            this.loadingPromises.delete(componentName);
        }
    }
    
    /**
     * 파일에서 컴포넌트 로드
     */
    async _loadComponentFromFile(componentName) {
        // srcPath + componentsPath를 조합하여 컴포넌트 경로 생성
        const componentRelativePath = `${this.config.componentsPath}/${componentName}.js`;
        
        let componentPath;
        if (this.router && this.router.config.srcPath) {
            // srcPath는 이미 전체 URL이므로 직접 조합
            const srcPath = this.router.config.srcPath;
            if (srcPath.startsWith('http')) {
                // 이중 슬래시 방지
                const cleanSrcPath = srcPath.endsWith('/') ? srcPath.slice(0, -1) : srcPath;
                const cleanComponentPath = componentRelativePath.startsWith('/') ? componentRelativePath : `/${componentRelativePath}`;
                componentPath = `${cleanSrcPath}${cleanComponentPath}`;
            } else {
                componentPath = this.router.resolvePath(`${srcPath}${componentRelativePath}`);
            }
        } else {
            // 폴백: 기본 경로 사용
            componentPath = this.router ? 
                this.router.resolvePath(`/src${componentRelativePath}`) : 
                `/src${componentRelativePath}`;
        }
        
        try {
            const module = await import(componentPath);
            const component = module.default;
            
            if (!component) {
                throw new Error(`Component '${componentName}' has no default export`);
            }
            
            if (!component.name) {
                component.name = componentName;
            }
            
            this.log('debug', `Component '${componentName}' loaded successfully`);
            return component;
            
        } catch (error) {
            this.log('error', `Failed to load component '${componentName}':`, error);
            throw new Error(`Component '${componentName}' not found: ${error.message}`);
        }
    }
    
    /**
     * 컴포넌트 모듈 클리어
     */
    clearComponents() {
        this.loadingPromises.clear();
        this.unifiedComponents = null;
        this.log('debug', 'All components cleared');
    }
    
    /**
     * 환경에 따른 모든 컴포넌트 로딩 (캐싱 지원)
     */
    async loadAllComponents(componentNames = null) {
        let components;
        
        // 운영 모드: 통합 컴포넌트 로딩 시도
        if (this.config.environment === 'production') {
            // 운영 모드에서만 unifiedComponents 캐시 사용
            if (this.unifiedComponents) {
                this.log('debug', 'Using existing unified components');
                return this.unifiedComponents;
            }
            components = await this._loadProductionComponents();
        } else {
            // 개발 모드: 캐시 없이 개별 컴포넌트 로딩
            components = await this._loadDevelopmentComponents(componentNames);
        }
        
        return components;
    }
    
    /**
     * 운영 모드: 통합 컴포넌트 로딩
     */
    async _loadProductionComponents() {
        try {
            const componentsPath = `${this.router?.config?.routesPath || '/routes'}/_components.js`;
            this.log('info', '[PRODUCTION] Loading unified components from:', componentsPath);
            
            const componentsModule = await import(componentsPath);
            
            if (typeof componentsModule.registerComponents === 'function') {
                this.unifiedComponents = componentsModule.components || {};
                this.log('info', `[PRODUCTION] Unified components loaded: ${Object.keys(this.unifiedComponents).length} components`);
                return this.unifiedComponents;
            } else {
                throw new Error('registerComponents function not found in components module');
            }
        } catch (error) {
            this.log('warn', '[PRODUCTION] Failed to load unified components:', error.message);
            this.unifiedComponents = {};
            return {};
        }
    }
    
    /**
     * 개발 모드: 개별 컴포넌트 로딩
     */
    async _loadDevelopmentComponents(componentNames = null) {
        // 컴포넌트 이름 목록이 제공되지 않으면 폴백 사용
        const namesToLoad = componentNames || this._getComponentNames();
        const components = {};
        
        if (namesToLoad.length === 0) {
            this.log('info', '[DEVELOPMENT] No components to load');
            return components;
        }
        
        this.log('info', `[DEVELOPMENT] Loading individual components: ${namesToLoad.join(', ')}`);
        
        for (const name of namesToLoad) {
            try {
                const component = await this.loadComponent(name);
                if (component) {
                    components[name] = component;
                }
            } catch (loadError) {
                this.log('warn', `[DEVELOPMENT] Failed to load component ${name}:`, loadError.message);
            }
        }
        
        this.log('info', `[DEVELOPMENT] Individual components loaded: ${Object.keys(components).length} components`);
        return components;
    }
    
    /**
     * 컴포넌트 이름 목록 가져오기
     */
    _getComponentNames() {
        if (Array.isArray(this.config.componentNames) && this.config.componentNames.length > 0) {
            return [...this.config.componentNames];
        }
        
        // 폴백: 기존 하드코딩 목록
        return [
            'Button', 'Modal', 'Card', 'Toast', 'Input', 'Tabs',
            'Checkbox', 'Alert', 'DynamicInclude', 'HtmlInclude'
        ];
    }
    
    /**
     * 템플릿과 레이아웃에서 사용된 컴포넌트 추출
     */
    getComponentNames(template, layout = null, layoutName = null) {
        // 레이아웃 컴포넌트로 초기화 (캐시 활용)
        const componentSet = layout ? 
            this._getLayoutComponents(layout, layoutName) : 
            new Set();
        
        // 템플릿에서 컴포넌트 추출
        if (template) {
            this._extractComponentsFromContent(template, componentSet);
        }
        
        const components = Array.from(componentSet);
        this.log('debug', `Discovered ${components.length} components:`, components);
        
        return components;
    }
    
    /**
     * 레이아웃에서 컴포넌트 추출 (캐시 활용)
     */
    _getLayoutComponents(layout, layoutName) {
        if (!layout || typeof layout !== 'string') return new Set();
        if (!layoutName || typeof layoutName !== 'string') return new Set();
        
        // 레이아웃 이름을 캐시 키로 사용
        const cacheKey = `layout_components_${layoutName}`;
        
        // 캐시에서 확인
        const cachedComponents = this.router?.cacheManager?.getFromCache(cacheKey);
        if (cachedComponents) {
            this.log('debug', `Using cached layout components for '${layoutName}'`);
            return cachedComponents;
        }
        
        // 레이아웃에서 컴포넌트 추출
        const componentSet = new Set();
        this._extractComponentsFromContent(layout, componentSet);
        
        // 캐시에 저장 (Set 그대로)
        if (this.router?.cacheManager) {
            this.router.cacheManager.setCache(cacheKey, componentSet);
            this.log('debug', `Cached layout components for '${layoutName}': ${Array.from(componentSet).join(', ')}`);
        }
        
        return componentSet;
    }
    
    /**
     * HTML 컨텐츠에서 Vue 컴포넌트 추출
     */
    _extractComponentsFromContent(content, componentSet) {
        if (!content || typeof content !== 'string') return;
        
        // 더 효율적인 패턴: PascalCase 컴포넌트 태그 추출
        // 시작 태그 <Component>와 자체 닫힘 태그 <Component/>를 모두 감지
        // dotAll 플래그(s)로 개행 문자도 처리
        const componentPattern = /<([A-Z][a-zA-Z0-9]*)(?:\s[^>]*)?\/?>|<\/([A-Z][a-zA-Z0-9]*)\s*>/gs;
        let match;
        
        while ((match = componentPattern.exec(content)) !== null) {
            // match[1]은 시작/자체닫힘 태그, match[2]는 닫는 태그
            const componentName = match[1] || match[2];
            
            if (componentName && !this._isHtmlTag(componentName)) {
                componentSet.add(componentName);
                this.log('debug', `Found component: ${componentName}`);
            }
        }
    }
    
    /**
     * HTML 기본 태그인지 확인
     */
    _isHtmlTag(tagName) {
        const htmlTags = [
            'div', 'span', 'p', 'a', 'img', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'table', 'tr', 'td', 'th', 'form', 'select', 'option', 'textarea',
            'nav', 'header', 'footer', 'main', 'section', 'article', 'aside', 'figure', 'figcaption',
            'video', 'audio', 'canvas', 'svg', 'iframe', 'script', 'style', 'link', 'meta', 'title',
            'body', 'html', 'head', 'template', 'slot'
        ];
        
        return htmlTags.includes(tagName);
    }

    /**
     * 메모리 정리
     */
    dispose() {
        this.clearComponents();
        this.log('debug', 'ComponentLoader disposed');
        this.router = null;
    }
}