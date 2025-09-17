/**
 * Unit tests for CacheManager
 */

import { CacheManager } from '../../src/plugins/CacheManager.js';

describe('CacheManager', () => {
    let cacheManager;
    let mockRouter;

    beforeEach(() => {
        mockRouter = {
            errorHandler: {
                log: jest.fn()
            }
        };

        cacheManager = new CacheManager(mockRouter, {
            cacheMode: 'memory',
            cacheTTL: 5000,
            maxCacheSize: 3
        });

        // Clear any existing timers
        jest.clearAllTimers();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.useRealTimers();
        cacheManager.clearAll();
    });

    describe('Configuration', () => {
        test('should initialize with memory cache mode', () => {
            expect(cacheManager.config.cacheMode).toBe('memory');
            expect(cacheManager.config.cacheTTL).toBe(5000);
            expect(cacheManager.config.maxCacheSize).toBe(3);
        });
    });

    describe('Basic Cache Operations', () => {
        test('should set and get cache values', () => {
            cacheManager.set('test-key', 'test-value');

            const result = cacheManager.get('test-key');

            expect(result).toBe('test-value');
        });

        test('should return undefined for non-existent keys', () => {
            const result = cacheManager.get('non-existent');

            expect(result).toBeUndefined();
        });

        test('should check if key exists', () => {
            cacheManager.set('existing-key', 'value');

            expect(cacheManager.has('existing-key')).toBe(true);
            expect(cacheManager.has('non-existent')).toBe(false);
        });

        test('should delete cache entry', () => {
            cacheManager.set('delete-key', 'value');

            const deleted = cacheManager.delete('delete-key');

            expect(deleted).toBe(true);
            expect(cacheManager.has('delete-key')).toBe(false);
        });

        test('should clear all cache', () => {
            cacheManager.set('key1', 'value1');
            cacheManager.set('key2', 'value2');

            const cleared = cacheManager.clearAll();

            expect(cleared).toBeGreaterThan(0);
            expect(cacheManager.has('key1')).toBe(false);
            expect(cacheManager.has('key2')).toBe(false);
        });
    });

    describe('TTL (Time To Live)', () => {
        test('should expire cache after TTL', () => {
            cacheManager.set('ttl-key', 'ttl-value');

            // Fast-forward time past TTL
            jest.advanceTimersByTime(6000);

            const result = cacheManager.get('ttl-key');

            expect(result).toBeUndefined();
        });

        test('should not expire cache before TTL', () => {
            cacheManager.set('ttl-key', 'ttl-value');

            // Fast-forward time but not past TTL
            jest.advanceTimersByTime(3000);

            const result = cacheManager.get('ttl-key');

            expect(result).toBe('ttl-value');
        });
    });

    describe('LRU (Least Recently Used)', () => {
        test('should evict oldest entry when cache is full', () => {
            // Fill cache to max size
            cacheManager.set('key1', 'value1');
            cacheManager.set('key2', 'value2');
            cacheManager.set('key3', 'value3');

            // Add one more to trigger eviction
            cacheManager.set('key4', 'value4');

            // First key should be evicted
            expect(cacheManager.has('key1')).toBe(false);
            expect(cacheManager.has('key4')).toBe(true);
        });
    });

    describe('Pattern Operations', () => {
        test('should delete by pattern', () => {
            cacheManager.set('user_1', 'data1');
            cacheManager.set('user_2', 'data2');
            cacheManager.set('product_1', 'data3');

            const deleted = cacheManager.deleteByPattern('user_');

            expect(deleted).toBe(2);
            expect(cacheManager.has('user_1')).toBe(false);
            expect(cacheManager.has('user_2')).toBe(false);
            expect(cacheManager.has('product_1')).toBe(true);
        });

        test('should get keys by pattern', () => {
            cacheManager.set('api_call_1', 'data1');
            cacheManager.set('api_call_2', 'data2');
            cacheManager.set('user_data', 'data3');

            const keys = cacheManager.getKeysByPattern('api_');

            expect(keys).toHaveLength(2);
            expect(keys).toContain('api_call_1');
            expect(keys).toContain('api_call_2');
        });
    });

    describe('Statistics', () => {
        test('should track hit rate', () => {
            cacheManager.set('key1', 'value1');

            // Generate some hits and misses
            cacheManager.get('key1'); // hit
            cacheManager.get('key1'); // hit
            cacheManager.get('nonexistent'); // miss

            const hitRate = cacheManager.getHitRate();

            expect(hitRate).toBeCloseTo(0.67, 2); // 2 hits out of 3 attempts
        });

        test('should get cache statistics', () => {
            cacheManager.set('key1', 'value1');
            cacheManager.set('key2', 'value2');

            const stats = cacheManager.getStats();

            expect(stats.size).toBe(2);
            expect(stats.maxSize).toBe(3);
            expect(stats.mode).toBe('memory');
        });
    });
});