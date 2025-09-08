/**
 * ComponentLoader
 * 동적으로 컴포넌트를 로드하고 등록하는 시스템
 */
export class ComponentLoader {
    constructor(router = null, options = {}) {

        this.config = {
            basePath: options.basePath || '/src/components',
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
     * 컴포넌트를 비동기로 로드
     */
    async loadComponent(componentName) {
        if (!componentName || typeof componentName !== 'string') {
            throw new Error('Component name must be a non-empty string');
        }
        
        // 이미 로딩 중인 경우 기존 Promise 반환
        if (this.loadingPromises.has(componentName)) {
            return this.loadingPromises.get(componentName);
        }
        
        const loadPromise = this._loadComponentFromFile(componentName);
        this.loadingPromises.set(componentName, loadPromise);
        
        try {
            const component = await loadPromise;
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
        const componentPath = `${this.config.basePath}/${componentName}.js`;
        
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
    async loadAllComponents() {
        // 이미 로드된 unifiedComponents가 있으면 반환
        if (this.unifiedComponents) {
            this.log('debug', 'Using existing unified components');
            return this.unifiedComponents;
        }
        
        // 운영 모드: 통합 컴포넌트 로딩 시도
        if (this.config.environment === 'production') {
            return await this._loadProductionComponents();
        }
        
        // 개발 모드: 개별 컴포넌트 로딩
        return await this._loadDevelopmentComponents();
    }
    
    /**
     * 운영 모드: 통합 컴포넌트 로딩
     */
    async _loadProductionComponents() {
        try {
            const componentsPath = `${this.config.routesPath}/_components.js`;
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
    async _loadDevelopmentComponents() {
        const componentNames = this._getComponentNames();
        const components = {};
        
        this.log('info', `[DEVELOPMENT] Loading individual components: ${componentNames.join(', ')}`);
        
        for (const name of componentNames) {
            try {
                const component = await this.loadComponent(name);
                if (component) {
                    components[name] = component;
                }
            } catch (loadError) {
                this.log('warn', `[DEVELOPMENT] Failed to load component ${name}:`, loadError.message);
            }
        }
        
        this.unifiedComponents = components;
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
     * 메모리 정리
     */
    dispose() {
        this.clearComponents();
        this.log('debug', 'ComponentLoader disposed');
        this.router = null;
    }
}