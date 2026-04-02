/**
 * CacheManager 단위 테스트
 */
import { CacheManager } from '../../src/plugins/CacheManager.js';
import { createMockRouter } from '../helpers/testHelpers.js';

describe('CacheManager', () => {
    let cacheManager;
    let mockRouter;

    beforeEach(() => {
        mockRouter = createMockRouter();
        cacheManager = new CacheManager(mockRouter, {
            cacheMode: 'memory',
            cacheTTL: 300000,
            maxCacheSize: 50
        });
    });

    afterEach(() => {
        if (cacheManager) {
            cacheManager.destroy();
            cacheManager = null;
        }
    });

    // === 초기화 ===
    describe('초기화', () => {
        test('기본 설정으로 초기화해야 한다', () => {
            const cm = new CacheManager(mockRouter);
            expect(cm.config.cacheMode).toBe('memory');
            expect(cm.config.cacheTTL).toBe(300000);
            expect(cm.config.maxCacheSize).toBe(50);
            cm.destroy();
        });

        test('커스텀 설정을 적용해야 한다', () => {
            expect(cacheManager.config.cacheMode).toBe('memory');
            expect(cacheManager.config.cacheTTL).toBe(300000);
        });

        test('빈 캐시로 시작해야 한다', () => {
            expect(cacheManager.cache.size).toBe(0);
        });
    });

    // === memory 모드 - set/get ===
    describe('memory 모드 - set/get', () => {
        test('set/get으로 값을 저장하고 조회해야 한다', () => {
            cacheManager.set('key1', 'value1');
            expect(cacheManager.get('key1')).toBe('value1');
        });

        test('존재하지 않는 키는 undefined를 반환해야 한다', () => {
            // CacheManager의 get()은 cache.get()을 반환하므로 undefined
            expect(cacheManager.get('missing')).toBeUndefined();
        });

        test('다양한 타입의 값을 저장할 수 있어야 한다', () => {
            cacheManager.set('str', 'hello');
            cacheManager.set('num', 42);
            cacheManager.set('obj', { a: 1 });
            cacheManager.set('arr', [1, 2]);

            expect(cacheManager.get('str')).toBe('hello');
            expect(cacheManager.get('num')).toBe(42);
            expect(cacheManager.get('obj')).toEqual({ a: 1 });
            expect(cacheManager.get('arr')).toEqual([1, 2]);
        });

        test('set() 시 타임스탬프를 기록해야 한다', () => {
            cacheManager.set('key1', 'value1');
            expect(cacheManager.cacheTimestamps.has('key1')).toBe(true);
            expect(typeof cacheManager.cacheTimestamps.get('key1')).toBe('number');
        });

        test('같은 키에 덮어쓰기가 가능해야 한다', () => {
            cacheManager.set('key1', 'old');
            cacheManager.set('key1', 'new');
            expect(cacheManager.get('key1')).toBe('new');
        });
    });

    // === TTL 테스트 (fakeTimers) ===
    describe('TTL', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('TTL 만료 전에는 값을 반환해야 한다', () => {
            cacheManager.set('key1', 'value1');
            jest.advanceTimersByTime(299999);
            expect(cacheManager.get('key1')).toBe('value1');
        });

        test('TTL 만료 후에는 null을 반환하고 캐시에서 제거해야 한다', () => {
            cacheManager.set('key1', 'value1');
            jest.advanceTimersByTime(300001);
            expect(cacheManager.get('key1')).toBeNull();
            expect(cacheManager.cache.has('key1')).toBe(false);
        });
    });

    // === has ===
    describe('has', () => {
        test('존재하고 만료되지 않은 키에 true를 반환해야 한다', () => {
            cacheManager.set('key1', 'value1');
            expect(cacheManager.has('key1')).toBe(true);
        });

        test('존재하지 않는 키에 false를 반환해야 한다', () => {
            expect(cacheManager.has('missing')).toBe(false);
        });

        test('만료된 키에 false를 반환해야 한다', () => {
            jest.useFakeTimers();
            cacheManager.set('key1', 'value1');
            jest.advanceTimersByTime(300001);
            expect(cacheManager.has('key1')).toBe(false);
            jest.useRealTimers();
        });
    });

    // === LRU 모드 ===
    describe('LRU 모드', () => {
        let lruCache;

        beforeEach(() => {
            lruCache = new CacheManager(mockRouter, {
                cacheMode: 'lru',
                cacheTTL: 300000,
                maxCacheSize: 3
            });
        });

        afterEach(() => {
            lruCache.destroy();
        });

        test('maxCacheSize를 초과하면 가장 오래된 항목을 제거해야 한다', () => {
            lruCache.set('a', 1);
            lruCache.set('b', 2);
            lruCache.set('c', 3);
            lruCache.set('d', 4); // 'a'가 제거됨

            expect(lruCache.get('a')).toBeUndefined(); // 제거됨
            expect(lruCache.get('b')).toBe(2);
            expect(lruCache.get('d')).toBe(4);
        });

        test('get() 호출 시 LRU 순서를 업데이트해야 한다', () => {
            lruCache.set('a', 1);
            lruCache.set('b', 2);
            lruCache.set('c', 3);

            lruCache.get('a'); // 'a'를 최근 사용으로 업데이트
            lruCache.set('d', 4); // 'b'가 제거됨 (가장 오래됨)

            expect(lruCache.get('a')).toBe(1);
            expect(lruCache.get('b')).toBeUndefined(); // 제거됨
            expect(lruCache.get('d')).toBe(4);
        });

        test('set()으로 기존 키를 업데이트하면 LRU 순서를 갱신해야 한다', () => {
            lruCache.set('a', 1);
            lruCache.set('b', 2);
            lruCache.set('c', 3);

            lruCache.set('a', 10); // 'a'를 최근 사용으로 업데이트
            lruCache.set('d', 4); // 'b'가 제거됨

            expect(lruCache.get('a')).toBe(10);
            expect(lruCache.get('b')).toBeUndefined(); // 제거됨
        });

        test('LRU 퇴거 시 cacheTimestamps도 정리해야 한다', () => {
            lruCache.set('a', 1);
            lruCache.set('b', 2);
            lruCache.set('c', 3);
            lruCache.set('d', 4);

            expect(lruCache.cacheTimestamps.has('a')).toBe(false);
        });
    });

    // === deleteByPattern ===
    describe('deleteByPattern', () => {
        test('패턴에 일치하는 키만 삭제해야 한다', () => {
            cacheManager.set('component_home', 'html');
            cacheManager.set('component_about', 'html');
            cacheManager.set('layout_default', 'layout');

            const deleted = cacheManager.deleteByPattern('component_');
            expect(deleted).toBe(2);
            expect(cacheManager.get('layout_default')).toBe('layout');
        });

        test('패턴에 일치하는 항목이 없으면 0을 반환해야 한다', () => {
            cacheManager.set('key1', 'value1');
            expect(cacheManager.deleteByPattern('nonexistent')).toBe(0);
        });
    });

    // === deleteComponent ===
    describe('deleteComponent', () => {
        test('라우트의 모든 관련 캐시를 삭제해야 한다', () => {
            cacheManager.set('component_home', 'c');
            cacheManager.set('script_home', 's');
            cacheManager.set('template_home', 't');
            cacheManager.set('other_key', 'keep');

            cacheManager.deleteComponent('home');
            expect(cacheManager.get('component_home')).toBeUndefined();
            expect(cacheManager.get('script_home')).toBeUndefined();
            expect(cacheManager.get('other_key')).toBe('keep');
        });
    });

    // === deleteAllComponents ===
    describe('deleteAllComponents', () => {
        test('모든 컴포넌트 관련 캐시를 삭제해야 한다', () => {
            cacheManager.set('component_home', 'c');
            cacheManager.set('script_about', 's');
            cacheManager.set('layout_default', 'l');
            cacheManager.set('i18n_ko', 'keep');

            cacheManager.deleteAllComponents();
            expect(cacheManager.get('i18n_ko')).toBe('keep');
            expect(cacheManager.get('component_home')).toBeUndefined();
        });
    });

    // === clearAll ===
    describe('clearAll', () => {
        test('모든 캐시를 삭제하고 lruOrder를 초기화해야 한다', () => {
            cacheManager.set('a', 1);
            cacheManager.set('b', 2);
            const cleared = cacheManager.clearAll();

            expect(cleared).toBe(2);
            expect(cacheManager.cache.size).toBe(0);
            expect(cacheManager.lruOrder).toEqual([]);
        });
    });

    // === cleanExpired ===
    describe('cleanExpired', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('만료된 항목만 삭제해야 한다', () => {
            cacheManager.set('old', 'data');
            jest.advanceTimersByTime(300001);
            cacheManager.set('new', 'data');

            const cleaned = cacheManager.cleanExpired();
            expect(cleaned).toBe(1);
            expect(cacheManager.cache.has('old')).toBe(false);
            expect(cacheManager.get('new')).toBe('data');
        });

        test('만료된 항목이 없으면 0을 반환해야 한다', () => {
            cacheManager.set('fresh', 'data');
            expect(cacheManager.cleanExpired()).toBe(0);
        });
    });

    // === getStats/getMemoryUsage/getHitRate ===
    describe('통계', () => {
        test('getStats()가 올바른 통계를 반환해야 한다', () => {
            cacheManager.set('key1', 'value1');
            const stats = cacheManager.getStats();
            expect(stats.size).toBe(1);
            expect(stats.mode).toBe('memory');
            expect(stats.ttl).toBe(300000);
        });

        test('getStatsByCategory()가 카테고리별 분류를 반환해야 한다', () => {
            cacheManager.set('component_home', 'c');
            cacheManager.set('script_home', 's');
            cacheManager.set('template_home', 't');
            cacheManager.set('random_key', 'other');

            const cats = cacheManager.getStatsByCategory();
            expect(cats.components).toBe(1);
            expect(cats.scripts).toBe(1);
            expect(cats.templates).toBe(1);
            expect(cats.others).toBe(1);
        });

        test('getMemoryUsage()가 바이트 추정치를 반환해야 한다', () => {
            cacheManager.set('key', 'value');
            const usage = cacheManager.getMemoryUsage();
            expect(usage.bytes).toBeGreaterThan(0);
            expect(typeof usage.kb).toBe('number');
            expect(typeof usage.mb).toBe('number');
        });

        test('getHitRate()가 비율을 반환해야 한다', () => {
            expect(cacheManager.getHitRate()).toBe(0);
            cacheManager.set('a', 1);
            expect(cacheManager.getHitRate()).toBeGreaterThan(0);
        });
    });

    // === getKeys/getKeysByPattern ===
    describe('getKeys/getKeysByPattern', () => {
        test('getKeys()가 모든 키를 반환해야 한다', () => {
            cacheManager.set('a', 1);
            cacheManager.set('b', 2);
            expect(cacheManager.getKeys()).toEqual(expect.arrayContaining(['a', 'b']));
        });

        test('getKeysByPattern()이 패턴 매칭 키만 반환해야 한다', () => {
            cacheManager.set('component_home', 'c');
            cacheManager.set('component_about', 'c');
            cacheManager.set('layout_default', 'l');

            const keys = cacheManager.getKeysByPattern('component_');
            expect(keys.length).toBe(2);
            expect(keys).toContain('component_home');
        });
    });

    // === autoCleanup ===
    describe('autoCleanup', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('startAutoCleanup()이 setInterval을 등록해야 한다', () => {
            cacheManager.startAutoCleanup(60000);
            expect(cacheManager.cleanupInterval).toBeDefined();
        });

        test('stopAutoCleanup()이 interval을 정리해야 한다', () => {
            cacheManager.startAutoCleanup(60000);
            cacheManager.stopAutoCleanup();
            expect(cacheManager.cleanupInterval).toBeNull();
        });

        test('중복 호출 시 이전 interval을 정리해야 한다', () => {
            cacheManager.startAutoCleanup(60000);
            const first = cacheManager.cleanupInterval;
            cacheManager.startAutoCleanup(30000);
            // 새 interval이 설정되어야 한다
            expect(cacheManager.cleanupInterval).toBeDefined();
            expect(cacheManager.cleanupInterval).not.toBe(first);
        });

        test('자동 정리가 만료된 캐시를 제거해야 한다', () => {
            cacheManager.set('old', 'data');
            cacheManager.startAutoCleanup(60000);
            jest.advanceTimersByTime(360001); // TTL 300000 + interval 60000 + 1
            // cleanExpired()가 키를 삭제한 후 get()은 undefined 반환 (Map.get 동작)
            expect(cacheManager.get('old')).toBeUndefined();
        });
    });

    // === destroy ===
    describe('destroy', () => {
        test('autoCleanup을 중지하고 캐시를 정리해야 한다', () => {
            cacheManager.startAutoCleanup(60000);
            cacheManager.set('key', 'value');
            cacheManager.destroy();
            expect(cacheManager.cache.size).toBe(0);
            expect(cacheManager.cleanupInterval).toBeNull();
        });
    });
});
