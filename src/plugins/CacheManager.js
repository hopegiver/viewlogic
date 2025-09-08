/**
 * ViewLogic Cache Management System
 * 캐시 관리 시스템
 */
export class CacheManager {
    constructor(router, options = {}) {
        this.config = {
            cacheMode: options.cacheMode || 'memory', // 'memory' 또는 'lru'
            cacheTTL: options.cacheTTL || 300000, // 5분 (밀리초)
            maxCacheSize: options.maxCacheSize || 50, // LRU 캐시 최대 크기
            debug: options.debug || false
        };
        
        // 라우터 인스턴스 참조 (필요시 라우터 상태 확인용)
        this.router = router;
        
        // 캐시 저장소들
        this.cache = new Map();
        this.cacheTimestamps = new Map();
        this.lruOrder = []; // LRU 순서 추적
        
        this.log('info', 'CacheManager initialized with config:', this.config);
    }

    /**
     * 로깅 래퍼 메서드
     */
    log(level, ...args) {
        if (this.router?.errorHandler) {
            this.router.errorHandler.log(level, 'CacheManager', ...args);
        }
    }

    /**
     * 캐시에 값 저장
     */
    setCache(key, value) {
        const now = Date.now();
        
        if (this.config.cacheMode === 'lru') {
            // LRU 캐시 관리
            if (this.cache.size >= this.config.maxCacheSize && !this.cache.has(key)) {
                const oldestKey = this.lruOrder.shift();
                if (oldestKey) {
                    this.cache.delete(oldestKey);
                    this.cacheTimestamps.delete(oldestKey);
                    this.log('debug', `🗑️ LRU evicted cache key: ${oldestKey}`);
                }
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
        
        this.log('debug', `💾 Cached: ${key} (size: ${this.cache.size})`);
    }
    
    /**
     * 캐시에서 값 가져오기
     */
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
            
            this.log('debug', `⏰ Cache expired and removed: ${key}`);
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
        
        if (value) {
            this.log('debug', `🎯 Cache hit: ${key}`);
        } else {
            this.log('debug', `❌ Cache miss: ${key}`);
        }
        
        return value;
    }
    
    /**
     * 캐시에 키가 있는지 확인
     */
    hasCache(key) {
        return this.cache.has(key) && this.getFromCache(key) !== null;
    }
    
    /**
     * 특정 키 패턴의 캐시 삭제
     */
    invalidateByPattern(pattern) {
        const keysToDelete = [];
        
        for (const key of this.cache.keys()) {
            if (key.includes(pattern) || key.startsWith(pattern)) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => {
            this.cache.delete(key);
            this.cacheTimestamps.delete(key);
            
            if (this.config.cacheMode === 'lru') {
                const index = this.lruOrder.indexOf(key);
                if (index > -1) {
                    this.lruOrder.splice(index, 1);
                }
            }
        });
        
        this.log('debug', `🧹 Invalidated ${keysToDelete.length} cache entries matching: ${pattern}`);
        return keysToDelete.length;
    }
    
    /**
     * 특정 컴포넌트 캐시 무효화
     */
    invalidateComponentCache(routeName) {
        const patterns = [
            `component_${routeName}`,
            `script_${routeName}`,
            `template_${routeName}`,
            `style_${routeName}`,
            `layout_${routeName}`
        ];
        
        let totalInvalidated = 0;
        patterns.forEach(pattern => {
            totalInvalidated += this.invalidateByPattern(pattern);
        });
        
        this.log(`🔄 Invalidated component cache for route: ${routeName} (${totalInvalidated} entries)`);
        return totalInvalidated;
    }
    
    /**
     * 모든 컴포넌트 캐시 삭제
     */
    clearComponentCache() {
        const componentPatterns = ['component_', 'script_', 'template_', 'style_', 'layout_'];
        let totalCleared = 0;
        
        componentPatterns.forEach(pattern => {
            totalCleared += this.invalidateByPattern(pattern);
        });
        
        this.log(`🧽 Cleared all component caches (${totalCleared} entries)`);
        return totalCleared;
    }
    
    /**
     * 전체 캐시 삭제
     */
    clearCache() {
        const size = this.cache.size;
        this.cache.clear();
        this.cacheTimestamps.clear();
        this.lruOrder = [];
        
        this.log(`🔥 Cleared all cache (${size} entries)`);
    }
    
    /**
     * 만료된 캐시 항목들 정리
     */
    cleanExpiredCache() {
        const now = Date.now();
        const expiredKeys = [];
        
        for (const [key, timestamp] of this.cacheTimestamps.entries()) {
            if ((now - timestamp) > this.config.cacheTTL) {
                expiredKeys.push(key);
            }
        }
        
        expiredKeys.forEach(key => {
            this.cache.delete(key);
            this.cacheTimestamps.delete(key);
            
            if (this.config.cacheMode === 'lru') {
                const index = this.lruOrder.indexOf(key);
                if (index > -1) {
                    this.lruOrder.splice(index, 1);
                }
            }
        });
        
        if (expiredKeys.length > 0) {
            this.log(`⏱️ Cleaned ${expiredKeys.length} expired cache entries`);
        }
        
        return expiredKeys.length;
    }
    
    /**
     * 캐시 통계 정보
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            maxSize: this.config.maxCacheSize,
            mode: this.config.cacheMode,
            ttl: this.config.cacheTTL,
            memoryUsage: this.getMemoryUsage(),
            hitRatio: this.getHitRatio(),
            categories: this.getCategorizedStats()
        };
    }
    
    /**
     * 메모리 사용량 추정
     */
    getMemoryUsage() {
        let estimatedBytes = 0;
        
        for (const [key, value] of this.cache.entries()) {
            // 키 크기
            estimatedBytes += key.length * 2; // UTF-16
            
            // 값 크기 추정
            if (typeof value === 'string') {
                estimatedBytes += value.length * 2;
            } else if (typeof value === 'object' && value !== null) {
                estimatedBytes += JSON.stringify(value).length * 2;
            } else {
                estimatedBytes += 8; // 대략적인 크기
            }
        }
        
        return {
            bytes: estimatedBytes,
            kb: Math.round(estimatedBytes / 1024 * 100) / 100,
            mb: Math.round(estimatedBytes / (1024 * 1024) * 100) / 100
        };
    }
    
    /**
     * 히트 비율 계산 (간단한 추정)
     */
    getHitRatio() {
        // 실제 히트/미스 추적을 위해서는 별도의 카운터가 필요
        // 현재는 캐시 크기 기반 추정치 반환
        const ratio = this.cache.size > 0 ? Math.min(this.cache.size / this.config.maxCacheSize, 1) : 0;
        return Math.round(ratio * 100);
    }
    
    /**
     * 카테고리별 캐시 통계
     */
    getCategorizedStats() {
        const categories = {
            components: 0,
            scripts: 0,
            templates: 0,
            styles: 0,
            layouts: 0,
            others: 0
        };
        
        for (const key of this.cache.keys()) {
            if (key.startsWith('component_')) categories.components++;
            else if (key.startsWith('script_')) categories.scripts++;
            else if (key.startsWith('template_')) categories.templates++;
            else if (key.startsWith('style_')) categories.styles++;
            else if (key.startsWith('layout_')) categories.layouts++;
            else categories.others++;
        }
        
        return categories;
    }
    
    /**
     * 캐시 키 목록 반환
     */
    getCacheKeys() {
        return Array.from(this.cache.keys());
    }
    
    /**
     * 특정 패턴의 캐시 키들 반환
     */
    getCacheKeysByPattern(pattern) {
        return this.getCacheKeys().filter(key => 
            key.includes(pattern) || key.startsWith(pattern)
        );
    }
    
    /**
     * 자동 정리 시작 (백그라운드에서 만료된 캐시 정리)
     */
    startAutoCleanup(interval = 60000) { // 기본 1분 간격
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        
        this.cleanupInterval = setInterval(() => {
            this.cleanExpiredCache();
        }, interval);
        
        this.log(`🤖 Auto cleanup started (interval: ${interval}ms)`);
    }
    
    /**
     * 자동 정리 중지
     */
    stopAutoCleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
            this.log('debug', '🛑 Auto cleanup stopped');
        }
    }
    
    /**
     * 정리 (메모리 누수 방지)
     */
    destroy() {
        this.stopAutoCleanup();
        this.clearCache();
        this.log('debug', 'CacheManager destroyed');
    }
}