/**
 * ComponentLoader
 * 동적으로 컴포넌트를 로드하고 등록하는 시스템
 */
class ComponentLoader {
    constructor(options = {}) {
        this.config = {
            basePath: options.basePath || '/src/components',
            cache: options.cache !== false,
            globalComponents: options.globalComponents || [],
            ...options
        };
        
        this.componentCache = new Map();
        this.loadingPromises = new Map();
        this.registeredComponents = new Set();
    }
    
    /**
     * 컴포넌트를 비동기로 로드
     */
    async loadComponent(componentName) {
        // 캐시에서 먼저 확인
        if (this.config.cache && this.componentCache.has(componentName)) {
            return this.componentCache.get(componentName);
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
            if (this.config.cache) {
                this.componentCache.set(componentName, component);
            }
            
            return component;
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
            console.log(`🔄 Loading component: ${componentName} from ${componentPath}`);
            const module = await import(componentPath);
            const component = module.default;
            
            if (!component) {
                throw new Error(`Component '${componentName}' has no default export`);
            }
            
            // 컴포넌트 이름이 없으면 설정
            if (!component.name) {
                component.name = componentName;
            }
            
            console.log(`✅ Component '${componentName}' loaded successfully`);
            return component;
            
        } catch (error) {
            console.error(`❌ Failed to load component '${componentName}':`, error);
            throw new Error(`Component '${componentName}' not found: ${error.message}`);
        }
    }
    
    /**
     * Vue 앱에 컴포넌트 등록
     */
    registerComponent(vueApp, componentName, component) {
        if (!vueApp || !vueApp.component) {
            throw new Error('Invalid Vue app instance');
        }
        
        vueApp.component(componentName, component);
        this.registeredComponents.add(componentName);
        console.log(`📝 Component '${componentName}' registered globally`);
    }
    
    /**
     * Vue 앱에 여러 컴포넌트 일괄 등록
     */
    async registerComponents(vueApp, componentNames) {
        const loadPromises = componentNames.map(async (name) => {
            try {
                const component = await this.loadComponent(name);
                this.registerComponent(vueApp, name, component);
                return { name, component, success: true };
            } catch (error) {
                console.warn(`Failed to register component '${name}':`, error);
                return { name, error, success: false };
            }
        });
        
        const results = await Promise.all(loadPromises);
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        
        console.log(`📦 Component registration complete: ${successful.length} successful, ${failed.length} failed`);
        
        return {
            successful: successful.map(r => r.name),
            failed: failed.map(r => ({ name: r.name, error: r.error }))
        };
    }
    
    /**
     * 전역 컴포넌트들을 자동으로 등록
     */
    async registerGlobalComponents(vueApp) {
        if (this.config.globalComponents.length === 0) {
            return { successful: [], failed: [] };
        }
        
        console.log(`🌍 Registering global components: ${this.config.globalComponents.join(', ')}`);
        return this.registerComponents(vueApp, this.config.globalComponents);
    }
    
    /**
     * 컴포넌트가 이미 등록되었는지 확인
     */
    isComponentRegistered(componentName) {
        return this.registeredComponents.has(componentName);
    }
    
    /**
     * 캐시된 컴포넌트 가져오기
     */
    getCachedComponent(componentName) {
        return this.componentCache.get(componentName);
    }
    
    /**
     * 캐시 클리어
     */
    clearCache(componentName = null) {
        if (componentName) {
            this.componentCache.delete(componentName);
            console.log(`🗑️ Component cache cleared for: ${componentName}`);
        } else {
            this.componentCache.clear();
            console.log(`🗑️ All component cache cleared`);
        }
    }
    
    /**
     * 캐시 상태 정보
     */
    getCacheInfo() {
        return {
            cachedComponents: Array.from(this.componentCache.keys()),
            registeredComponents: Array.from(this.registeredComponents),
            loadingComponents: Array.from(this.loadingPromises.keys()),
            cacheSize: this.componentCache.size
        };
    }
    
    /**
     * 컴포넌트 사전 로드 (프리로딩)
     */
    async preloadComponents(componentNames) {
        console.log(`🚀 Preloading components: ${componentNames.join(', ')}`);
        
        const preloadPromises = componentNames.map(async (name) => {
            try {
                await this.loadComponent(name);
                return { name, success: true };
            } catch (error) {
                console.warn(`Failed to preload component '${name}':`, error);
                return { name, success: false, error };
            }
        });
        
        const results = await Promise.all(preloadPromises);
        const successful = results.filter(r => r.success).map(r => r.name);
        const failed = results.filter(r => !r.success);
        
        console.log(`📦 Component preloading complete: ${successful.length} successful, ${failed.length} failed`);
        
        return { successful, failed };
    }
}

// 싱글톤 인스턴스
let componentLoaderInstance = null;

/**
 * ComponentLoader 인스턴스 가져오기 (싱글톤)
 */
export function getComponentLoader(options = {}) {
    if (!componentLoaderInstance) {
        componentLoaderInstance = new ComponentLoader(options);
    }
    return componentLoaderInstance;
}

/**
 * ComponentLoader 인스턴스 재설정
 */
export function resetComponentLoader(options = {}) {
    componentLoaderInstance = new ComponentLoader(options);
    return componentLoaderInstance;
}

export default ComponentLoader;