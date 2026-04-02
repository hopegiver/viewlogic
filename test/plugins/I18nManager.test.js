/**
 * I18nManager 단위 테스트
 */
import { I18nManager } from '../../src/plugins/I18nManager.js';
import { createMockRouter, mockFetchSuccess, mockFetchError } from '../helpers/testHelpers.js';

describe('I18nManager', () => {
    let i18nManager;
    let mockRouter;

    beforeEach(async () => {
        mockRouter = createMockRouter({
            config: {
                useI18n: true,
                defaultLanguage: 'en',
                i18nPath: '/i18n'
            }
        });
        // 초기 언어 로드를 위한 fetch mock
        mockFetchSuccess({ hello: 'Hello', app: { title: 'My App' } });
        i18nManager = new I18nManager(mockRouter, {
            useI18n: true,
            defaultLanguage: 'en'
        });
        await i18nManager.initPromise;
    });

    afterEach(() => {
        i18nManager = null;
    });

    // === 초기화 ===
    describe('초기화', () => {
        test('기본 설정으로 초기화해야 한다', () => {
            expect(i18nManager.config.enabled).toBe(true);
            expect(i18nManager.config.defaultLanguage).toBe('en');
        });

        test('비활성화 상태에서도 에러 없이 초기화해야 한다', async () => {
            const mgr = new I18nManager(mockRouter, { useI18n: false });
            await mgr.initPromise;
            expect(mgr.config.enabled).toBe(false);
        });

        test('init()에서 초기 언어 메시지를 로드해야 한다', () => {
            expect(i18nManager.messages.has('en')).toBe(true);
        });

        test('초기 로드 실패 시 빈 메시지로 폴백해야 한다', async () => {
            mockFetchError(404, {});
            const mgr = new I18nManager(mockRouter, {
                useI18n: true,
                defaultLanguage: 'xx'
            });
            await mgr.initPromise;
            expect(mgr.messages.has('xx')).toBe(true);
        });

        test('캐시에서 언어 설정을 로드해야 한다', async () => {
            const router = createMockRouter({
                cacheManager: {
                    get: jest.fn((key) => key === 'viewlogic_lang' ? 'ko' : null),
                    set: jest.fn(),
                    has: jest.fn(() => false),
                    deleteByPattern: jest.fn(() => 0)
                },
                config: { useI18n: true, defaultLanguage: 'en', i18nPath: '/i18n' }
            });
            mockFetchSuccess({ hello: '안녕하세요' });
            const mgr = new I18nManager(router, {
                useI18n: true,
                defaultLanguage: 'en'
            });
            await mgr.initPromise;
            expect(mgr.currentLanguage).toBe('ko');
        });
    });

    // === isValidLanguage ===
    describe('isValidLanguage', () => {
        test('유효한 2글자 소문자 코드에 true를 반환해야 한다', () => {
            expect(i18nManager.isValidLanguage('ko')).toBe(true);
            expect(i18nManager.isValidLanguage('en')).toBe(true);
        });

        test.each([
            ['KO', '대문자'],
            ['eng', '3글자'],
            ['123', '숫자'],
            [null, 'null'],
            ['', '빈 문자열'],
        ])('잘못된 형식(%s - %s)에 false를 반환해야 한다', (input) => {
            expect(i18nManager.isValidLanguage(input)).toBe(false);
        });
    });

    // === getCurrentLanguage ===
    describe('getCurrentLanguage', () => {
        test('현재 언어를 반환해야 한다', () => {
            expect(i18nManager.getCurrentLanguage()).toBe('en');
        });
    });

    // === setLanguage ===
    describe('setLanguage', () => {
        test('유효한 언어로 변경해야 한다', async () => {
            mockFetchSuccess({ hello: '안녕하세요' });
            const result = await i18nManager.setLanguage('ko');
            expect(result).toBe(true);
            expect(i18nManager.currentLanguage).toBe('ko');
        });

        test('같은 언어로 변경하면 true를 반환하고 fetch하지 않아야 한다', async () => {
            const fetchCount = global.fetch.mock.calls.length;
            const result = await i18nManager.setLanguage('en');
            expect(result).toBe(true);
            // 추가 fetch 없음
            expect(global.fetch.mock.calls.length).toBe(fetchCount);
        });

        test('유효하지 않은 언어 코드를 거부해야 한다', async () => {
            const result = await i18nManager.setLanguage('INVALID');
            expect(result).toBe(false);
        });

        test('languageChanged 이벤트를 발생시켜야 한다', async () => {
            const listener = jest.fn();
            i18nManager.on('languageChanged', listener);

            mockFetchSuccess({ hello: '안녕하세요' });
            await i18nManager.setLanguage('ko');

            expect(listener).toHaveBeenCalledWith(expect.objectContaining({
                from: 'en',
                to: 'ko'
            }));
        });

        test('메시지 로드 실패 시에도 언어는 변경되어야 한다', async () => {
            mockFetchError(500, {});
            const result = await i18nManager.setLanguage('fr');
            expect(result).toBe(true);
            expect(i18nManager.currentLanguage).toBe('fr');
        });
    });

    // === loadMessages ===
    describe('loadMessages', () => {
        test('이미 로드된 언어는 재로드하지 않아야 한다', async () => {
            const fetchCount = global.fetch.mock.calls.length;
            await i18nManager.loadMessages('en');
            expect(global.fetch.mock.calls.length).toBe(fetchCount);
        });

        test('캐시에서 먼저 확인해야 한다', async () => {
            const cachedMessages = { cached: 'data' };
            mockRouter.cacheManager.get.mockReturnValueOnce(cachedMessages);

            // 메시지를 삭제하여 다시 로드하도록 유도
            i18nManager.messages.delete('de');
            const result = await i18nManager.loadMessages('de');

            expect(result).toBe(cachedMessages);
        });

        test('실패 시 빈 객체를 반환해야 한다', async () => {
            mockFetchError(404, {});
            mockFetchError(404, {}); // fallback도 실패
            i18nManager.messages.delete('zz');
            const result = await i18nManager.loadMessages('zz');
            expect(result).toEqual({});
        });
    });

    // === t (번역) ===
    describe('t (번역)', () => {
        test('키에 대한 번역을 반환해야 한다', () => {
            expect(i18nManager.t('hello')).toBe('Hello');
        });

        test('중첩 키를 지원해야 한다', () => {
            expect(i18nManager.t('app.title')).toBe('My App');
        });

        test('파라미터 보간을 지원해야 한다', () => {
            i18nManager.messages.set('en', {
                ...i18nManager.messages.get('en'),
                greeting: 'Hello {name}'
            });
            expect(i18nManager.t('greeting', { name: 'World' })).toBe('Hello World');
        });

        test('번역이 없으면 키 자체를 반환해야 한다', () => {
            expect(i18nManager.t('nonexistent.key')).toBe('nonexistent.key');
        });

        test('현재 언어에 없으면 fallbackLanguage에서 찾아야 한다', () => {
            // ko 언어에는 없지만 en(fallback)에는 있는 키
            i18nManager.messages.set('ko', {});
            i18nManager.currentLanguage = 'ko';
            expect(i18nManager.t('hello')).toBe('Hello');
        });

        test('i18n이 비활성화면 키를 그대로 반환해야 한다', async () => {
            const mgr = new I18nManager(mockRouter, { useI18n: false });
            await mgr.initPromise;
            expect(mgr.t('any.key')).toBe('any.key');
        });
    });

    // === plural ===
    describe('plural', () => {
        beforeEach(() => {
            i18nManager.messages.set('en', {
                ...i18nManager.messages.get('en'),
                items: {
                    singular: '{count} item',
                    plural: '{count} items'
                }
            });
        });

        test('count=1이면 singular 키를 사용해야 한다', () => {
            expect(i18nManager.plural('items', 1)).toBe('1 item');
        });

        test('count!=1이면 plural 키를 사용해야 한다', () => {
            expect(i18nManager.plural('items', 5)).toBe('5 items');
        });
    });

    // === interpolate ===
    describe('interpolate', () => {
        test('문자열의 {key}를 params 값으로 대체해야 한다', () => {
            expect(i18nManager.interpolate('Hello {name}', { name: 'World' })).toBe('Hello World');
        });

        test('매칭되지 않는 {key}는 원본을 유지해야 한다', () => {
            expect(i18nManager.interpolate('Hello {name}', {})).toBe('Hello {name}');
        });

        test('문자열이 아닌 메시지는 그대로 반환해야 한다', () => {
            expect(i18nManager.interpolate(42, {})).toBe(42);
            expect(i18nManager.interpolate(null, {})).toBeNull();
        });
    });

    // === getNestedValue ===
    describe('getNestedValue', () => {
        test('점 표기법으로 중첩 객체의 값을 가져와야 한다', () => {
            const obj = { a: { b: { c: 'deep' } } };
            expect(i18nManager.getNestedValue(obj, 'a.b.c')).toBe('deep');
        });

        test('존재하지 않는 경로에 undefined를 반환해야 한다', () => {
            const obj = { a: { b: 1 } };
            expect(i18nManager.getNestedValue(obj, 'a.c.d')).toBeUndefined();
        });
    });

    // === formatDate/formatNumber ===
    describe('formatDate/formatNumber', () => {
        test('날짜를 포맷해야 한다', () => {
            const result = i18nManager.formatDate('2024-01-15');
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });

        test('숫자를 포맷해야 한다', () => {
            const result = i18nManager.formatNumber(1234567);
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });
    });

    // === 이벤트 ===
    describe('이벤트', () => {
        test('on()으로 리스너를 등록해야 한다', () => {
            const listener = jest.fn();
            i18nManager.on('languageChanged', listener);
            expect(i18nManager.listeners.languageChanged).toContain(listener);
        });

        test('off()로 리스너를 제거해야 한다', () => {
            const listener = jest.fn();
            i18nManager.on('languageChanged', listener);
            i18nManager.off('languageChanged', listener);
            expect(i18nManager.listeners.languageChanged).not.toContain(listener);
        });

        test('리스너에서 에러가 발생해도 다른 리스너가 실행되어야 한다', () => {
            const errorCb = jest.fn(() => { throw new Error('err'); });
            const normalCb = jest.fn();
            i18nManager.on('languageChanged', errorCb);
            i18nManager.on('languageChanged', normalCb);

            i18nManager.emit('languageChanged', { from: 'en', to: 'ko' });
            expect(normalCb).toHaveBeenCalled();
        });
    });

    // === isEnabled/isReady ===
    describe('isEnabled/isReady', () => {
        test('isEnabled()가 활성화 상태를 반환해야 한다', () => {
            expect(i18nManager.isEnabled()).toBe(true);
        });

        test('isReady()가 초기화 완료 후 true를 반환해야 한다', async () => {
            const ready = await i18nManager.isReady();
            expect(ready).toBe(true);
        });
    });

    // === clearCache ===
    describe('clearCache', () => {
        test('cacheManager.deleteByPattern("i18n_")을 호출해야 한다', () => {
            i18nManager.clearCache();
            expect(mockRouter.cacheManager.deleteByPattern).toHaveBeenCalledWith('i18n_');
        });
    });

    // === loadLanguageFromCache 에러 ===
    describe('loadLanguageFromCache 에러', () => {
        test('cacheManager가 에러를 throw해도 안전하게 처리해야 한다', async () => {
            const router = createMockRouter({
                cacheManager: {
                    get: jest.fn(() => { throw new Error('cache error'); }),
                    set: jest.fn(),
                    has: jest.fn(() => false),
                    deleteByPattern: jest.fn(() => 0)
                },
                config: { useI18n: true, defaultLanguage: 'en', i18nPath: '/i18n' }
            });
            mockFetchSuccess({ hello: 'Hello' });
            const mgr = new I18nManager(router, {
                useI18n: true,
                defaultLanguage: 'en'
            });
            await mgr.initPromise;

            // 에러가 발생해도 currentLanguage는 기본값 유지
            expect(mgr.currentLanguage).toBe('en');
        });
    });

    // === setLanguage 실패 경로 ===
    describe('setLanguage 실패 경로', () => {
        test('loadMessages가 throw하면 빈 메시지로 이벤트를 발생시켜야 한다', async () => {
            const listener = jest.fn();
            i18nManager.on('languageChanged', listener);

            // loadMessages 자체가 throw하도록 mock
            jest.spyOn(i18nManager, 'loadMessages').mockRejectedValueOnce(new Error('critical'));
            await i18nManager.setLanguage('fr');

            expect(listener).toHaveBeenCalledWith(expect.objectContaining({
                from: 'en',
                to: 'fr',
                error: true
            }));
            expect(i18nManager.currentLanguage).toBe('fr');
        });
    });

    // === saveLanguageToCache 에러 ===
    describe('saveLanguageToCache 에러', () => {
        test('cacheManager.set 에러 시 안전하게 처리해야 한다', () => {
            mockRouter.cacheManager.set.mockImplementationOnce(() => {
                throw new Error('cache write error');
            });
            // 에러가 발생해도 throw하지 않아야 한다
            expect(() => i18nManager.saveLanguageToCache('ko')).not.toThrow();
        });
    });

    // === loadMessages 동시 요청 ===
    describe('loadMessages 동시 요청', () => {
        test('같은 언어의 동시 loadMessages 호출이 하나의 fetch만 실행해야 한다', async () => {
            // 아직 로드되지 않은 언어
            i18nManager.messages.delete('ja');
            const fetchCountBefore = global.fetch.mock.calls.length;

            mockFetchSuccess({ hello: 'こんにちは' });

            // 동시 호출
            const [result1, result2] = await Promise.all([
                i18nManager.loadMessages('ja'),
                i18nManager.loadMessages('ja')
            ]);

            // 같은 결과
            expect(result1).toBe(result2);
            // fetch는 한 번만 호출
            expect(global.fetch.mock.calls.length - fetchCountBefore).toBe(1);
        });
    });

    // === _loadMessagesFromFile 폴백 언어 실패 ===
    describe('_loadMessagesFromFile 폴백', () => {
        test('폴백 언어도 실패하면 빈 객체를 반환해야 한다', async () => {
            // fetch를 항상 실패하도록 설정
            global.fetch.mockReset();
            global.fetch.mockResolvedValue({
                ok: false,
                status: 404,
                statusText: 'Not Found',
                json: jest.fn().mockResolvedValue({}),
                text: jest.fn().mockResolvedValue('{}'),
                headers: new Map()
            });

            // 캐시도 무효화
            mockRouter.cacheManager.get.mockReturnValue(null);

            const result = await i18nManager._loadMessagesFromFile('zz');
            expect(result).toEqual({});
        });
    });

    // === isReady 실패 경로 ===
    describe('isReady 실패 경로', () => {
        test('initPromise가 reject해도 true를 반환해야 한다', async () => {
            const mgr = new I18nManager(mockRouter, {
                useI18n: true,
                defaultLanguage: 'en'
            });
            // initPromise를 reject하는 상태로 교체
            mgr.initPromise = Promise.reject(new Error('init failed'));

            const ready = await mgr.isReady();
            expect(ready).toBe(true); // graceful degradation
        });
    });

    // === initialize ===
    describe('initialize', () => {
        test('비활성화 상태에서 true를 반환해야 한다', async () => {
            const mgr = new I18nManager(mockRouter, { useI18n: false });
            const result = await mgr.initialize();
            expect(result).toBe(true);
        });

        test('활성화 상태에서 초기화 완료 후 true를 반환해야 한다', async () => {
            const result = await i18nManager.initialize();
            expect(result).toBe(true);
        });

        test('initPromise 실패해도 true를 반환해야 한다', async () => {
            const mgr = new I18nManager(mockRouter, {
                useI18n: true,
                defaultLanguage: 'en'
            });
            mgr.initPromise = Promise.reject(new Error('init failed'));

            const result = await mgr.initialize();
            expect(result).toBe(true);
        });
    });

    // === clearCache 에러 ===
    describe('clearCache 에러', () => {
        test('cacheManager.deleteByPattern 에러 시 안전하게 처리해야 한다', () => {
            mockRouter.cacheManager.deleteByPattern.mockImplementationOnce(() => {
                throw new Error('delete error');
            });
            expect(() => i18nManager.clearCache()).not.toThrow();
        });
    });

    // === t 메시지 없는 경우 ===
    describe('t 메시지 없는 경우', () => {
        test('현재 언어 메시지가 없으면 키를 반환해야 한다', () => {
            i18nManager.messages.delete('en');
            expect(i18nManager.t('hello')).toBe('hello');
        });
    });

    // === getMessages ===
    describe('getMessages', () => {
        test('현재 언어의 메시지를 반환해야 한다', () => {
            const messages = i18nManager.getMessages();
            expect(messages.hello).toBe('Hello');
        });

        test('메시지가 없으면 빈 객체를 반환해야 한다', () => {
            i18nManager.currentLanguage = 'unknown';
            expect(i18nManager.getMessages()).toEqual({});
        });
    });
});
