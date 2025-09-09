/**
 * Unit tests for CacheManager
 */

import { CacheManager } from '../../src/plugins/CacheManager.js';

describe('CacheManager', () => {
    let cacheManager;
    let mockRouter;
    let mockConfig;

    beforeEach(() => {
        mockRouter = {
            log: jest.fn()
        };
        
        mockConfig = {
            cacheMode: 'memory',
            cacheTTL: 5000,
            maxCacheSize: 3
        };

        cacheManager = new CacheManager(mockRouter, mockConfig);
        
        // Clear any existing timers
        jest.clearAllTimers();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.useRealTimers();
    });

    describe('Configuration', () => {
        test('should initialize with memory cache mode', () => {
            expect(cacheManager.config.cacheMode).toBe('memory');
            expect(cacheManager.config.cacheTTL).toBe(5000);
            expect(cacheManager.config.maxCacheSize).toBe(3);
        });

        test('should handle session cache mode', () => {
            const sessionCacheManager = new CacheManager(mockRouter, {
                ...mockConfig,
                cacheMode: 'session'
            });
            
            expect(sessionCacheManager.config.cacheMode).toBe('session');
        });

        test('should handle disabled cache mode', () => {
            const noCacheManager = new CacheManager(mockRouter, {
                ...mockConfig,
                cacheMode: 'none'
            });
            
            expect(noCacheManager.config.cacheMode).toBe('none');
        });
    });

    describe('Memory Cache Operations', () => {
        test('should set and get cache items', () => {
            const testData = { content: 'test content' };
            
            cacheManager.setCache('test-key', testData);
            const result = cacheManager.getFromCache('test-key');
            
            expect(result).toEqual(testData);
        });

        test('should return null for non-existent keys', () => {
            const result = cacheManager.getFromCache('non-existent');
            
            expect(result).toBeNull();
        });

        test('should respect TTL expiration', () => {
            const testData = { content: 'test content' };
            
            cacheManager.set('test-key', testData);
            
            // Fast-forward time beyond TTL
            jest.advanceTimersByTime(6000);
            
            const result = cacheManager.get('test-key');
            expect(result).toBeNull();
        });

        test('should update access time on get', () => {
            const testData = { content: 'test content' };
            
            cacheManager.set('test-key', testData);
            
            // Advance time partially
            jest.advanceTimersByTime(3000);
            
            // Access the item (should update access time)
            cacheManager.get('test-key');
            
            // Advance time again but not beyond new TTL
            jest.advanceTimersByTime(3000);
            
            const result = cacheManager.get('test-key');
            expect(result).toEqual(testData);
        });

        test('should enforce max cache size (LRU)', () => {
            // Fill cache to max size
            cacheManager.set('key1', 'data1');
            cacheManager.set('key2', 'data2');
            cacheManager.set('key3', 'data3');
            
            // Add one more item (should evict oldest)
            cacheManager.set('key4', 'data4');
            
            expect(cacheManager.get('key1')).toBeNull(); // Evicted
            expect(cacheManager.get('key2')).toBe('data2');
            expect(cacheManager.get('key3')).toBe('data3');
            expect(cacheManager.get('key4')).toBe('data4');
        });

        test('should update LRU order on access', () => {
            cacheManager.set('key1', 'data1');
            cacheManager.set('key2', 'data2');
            cacheManager.set('key3', 'data3');
            
            // Access key1 to make it most recently used
            cacheManager.get('key1');
            
            // Add new item (should evict key2, not key1)
            cacheManager.set('key4', 'data4');
            
            expect(cacheManager.get('key1')).toBe('data1'); // Still exists
            expect(cacheManager.get('key2')).toBeNull();   // Evicted
            expect(cacheManager.get('key3')).toBe('data3');
            expect(cacheManager.get('key4')).toBe('data4');
        });
    });

    describe('Session Storage Cache', () => {
        beforeEach(() => {
            cacheManager = new CacheManager(mockRouter, {
                ...mockConfig,
                cacheMode: 'session'
            });
        });

        test('should set and get from session storage', () => {
            const testData = { content: 'test content' };
            
            sessionStorage.setItem.mockImplementation((key, value) => {
                sessionStorage[key] = value;
            });
            sessionStorage.getItem.mockImplementation((key) => {
                return sessionStorage[key] || null;
            });
            
            cacheManager.set('test-key', testData);
            
            expect(sessionStorage.setItem).toHaveBeenCalledWith(
                'viewlogic_cache_test-key',
                expect.stringContaining('"content":"test content"')
            );
            
            // Mock the return value for get
            const cacheData = JSON.stringify({
                data: testData,
                timestamp: Date.now(),
                accessTime: Date.now()
            });
            sessionStorage.getItem.mockReturnValue(cacheData);
            
            const result = cacheManager.get('test-key');
            expect(result).toEqual(testData);
        });

        test('should handle expired session storage items', () => {
            const expiredData = JSON.stringify({
                data: { content: 'test' },
                timestamp: Date.now() - 10000, // 10 seconds ago
                accessTime: Date.now() - 10000
            });
            
            sessionStorage.getItem.mockReturnValue(expiredData);
            sessionStorage.removeItem.mockImplementation();
            
            const result = cacheManager.get('test-key');
            
            expect(result).toBeNull();
            expect(sessionStorage.removeItem).toHaveBeenCalledWith('viewlogic_cache_test-key');
        });

        test('should handle malformed session storage data', () => {
            sessionStorage.getItem.mockReturnValue('invalid json');
            
            const result = cacheManager.get('test-key');
            
            expect(result).toBeNull();
            expect(mockRouter.log).toHaveBeenCalledWith(
                'warn',
                'CacheManager',
                'Failed to parse cached data for key: test-key',
                expect.any(Error)
            );
        });
    });

    describe('Cache Management', () => {
        test('should check if key exists', () => {
            cacheManager.set('test-key', 'data');
            
            expect(cacheManager.has('test-key')).toBe(true);
            expect(cacheManager.has('non-existent')).toBe(false);
        });

        test('should delete specific keys', () => {
            cacheManager.set('test-key', 'data');
            
            expect(cacheManager.has('test-key')).toBe(true);
            
            cacheManager.delete('test-key');
            
            expect(cacheManager.has('test-key')).toBe(false);
        });

        test('should clear all cache', () => {
            cacheManager.set('key1', 'data1');
            cacheManager.set('key2', 'data2');
            
            expect(cacheManager.has('key1')).toBe(true);
            expect(cacheManager.has('key2')).toBe(true);
            
            cacheManager.clearAll();
            
            expect(cacheManager.has('key1')).toBe(false);
            expect(cacheManager.has('key2')).toBe(false);
        });

        test('should get cache statistics', () => {
            cacheManager.set('key1', 'data1');
            cacheManager.set('key2', 'data2');
            cacheManager.get('key1'); // Hit
            cacheManager.get('nonexistent'); // Miss
            
            const stats = cacheManager.getStats();
            
            expect(stats.size).toBe(2);
            expect(stats.hits).toBe(1);
            expect(stats.misses).toBe(1);
            expect(stats.hitRate).toBe(0.5);
        });
    });

    describe('Disabled Cache Mode', () => {
        beforeEach(() => {
            cacheManager = new CacheManager(mockRouter, {
                ...mockConfig,
                cacheMode: 'none'
            });
        });

        test('should not store data when cache is disabled', () => {
            cacheManager.set('test-key', 'data');
            
            const result = cacheManager.get('test-key');
            
            expect(result).toBeNull();
        });

        test('should return false for has() when cache is disabled', () => {
            cacheManager.set('test-key', 'data');
            
            expect(cacheManager.has('test-key')).toBe(false);
        });
    });

    describe('Cache Key Generation', () => {
        test('should generate cache key', () => {
            const key = cacheManager.getCacheKey('route', 'home');
            
            expect(key).toBe('route_home');
        });

        test('should generate cache key with multiple parts', () => {
            const key = cacheManager.getCacheKey('component', 'Button', 'variant', 'primary');
            
            expect(key).toBe('component_Button_variant_primary');
        });
    });

    describe('Cache Events', () => {
        test('should emit events on cache operations', () => {
            const mockEmit = jest.fn();
            cacheManager.emit = mockEmit;
            
            cacheManager.set('test-key', 'data');
            
            expect(mockEmit).toHaveBeenCalledWith('cache-set', {
                key: 'test-key',
                size: expect.any(Number)
            });
        });
    });

    describe('Cleanup and Destruction', () => {
        test('should cleanup expired items', () => {
            cacheManager.set('key1', 'data1');
            cacheManager.set('key2', 'data2');
            
            // Fast-forward to expire items
            jest.advanceTimersByTime(6000);
            
            cacheManager.cleanupExpired();
            
            expect(cacheManager.get('key1')).toBeNull();
            expect(cacheManager.get('key2')).toBeNull();
        });

        test('should destroy cache properly', () => {
            cacheManager.set('key1', 'data1');
            cacheManager.set('key2', 'data2');
            
            cacheManager.destroy();
            
            expect(cacheManager.cache.size).toBe(0);
        });
    });
});