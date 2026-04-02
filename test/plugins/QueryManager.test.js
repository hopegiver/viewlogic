/**
 * QueryManager 단위 테스트
 */
import { QueryManager } from '../../src/plugins/QueryManager.js';
import { createMockRouter } from '../helpers/testHelpers.js';

describe('QueryManager', () => {
    let queryManager;
    let mockRouter;

    beforeEach(() => {
        mockRouter = createMockRouter();
        queryManager = new QueryManager(mockRouter);
    });

    afterEach(() => {
        if (queryManager) {
            queryManager.destroy();
            queryManager = null;
        }
    });

    // === 초기화 ===
    describe('초기화', () => {
        test('빈 currentQueryParams로 시작해야 한다', () => {
            expect(queryManager.currentQueryParams).toEqual({});
        });

        test('빈 currentRouteParams로 시작해야 한다', () => {
            expect(queryManager.currentRouteParams).toEqual({});
        });
    });

    // === parseQueryString ===
    describe('parseQueryString', () => {
        test('기본 key=value 쌍을 파싱해야 한다', () => {
            const result = queryManager.parseQueryString('name=hello');
            expect(result).toEqual({ name: 'hello' });
        });

        test('여러 파라미터를 파싱해야 한다', () => {
            const result = queryManager.parseQueryString('a=1&b=2&c=3');
            expect(result).toEqual({ a: '1', b: '2', c: '3' });
        });

        test('빈 문자열은 빈 객체를 반환해야 한다', () => {
            expect(queryManager.parseQueryString('')).toEqual({});
        });

        test('null/undefined는 빈 객체를 반환해야 한다', () => {
            expect(queryManager.parseQueryString(null)).toEqual({});
            expect(queryManager.parseQueryString(undefined)).toEqual({});
        });

        test('URL 인코딩된 값을 디코딩해야 한다', () => {
            const result = queryManager.parseQueryString('name=%ED%95%9C%EA%B5%AD%EC%96%B4&space=hello%20world');
            expect(result.name).toBe('한국어');
            expect(result.space).toBe('hello world');
        });

        test('배열 파라미터를 파싱해야 한다 (tags[]=a&tags[]=b)', () => {
            const result = queryManager.parseQueryString('tags[]=a&tags[]=b&tags[]=c');
            expect(result.tags).toEqual(['a', 'b', 'c']);
        });

        test('값이 없는 파라미터를 빈 문자열로 처리해야 한다', () => {
            const result = queryManager.parseQueryString('key=');
            expect(result.key).toBe('');
        });

        test('빈 키는 무시해야 한다', () => {
            const result = queryManager.parseQueryString('=value&a=1');
            expect(result.a).toBe('1');
            expect(Object.keys(result).length).toBe(1);
        });
    });

    // === buildQueryString ===
    describe('buildQueryString', () => {
        test('객체를 쿼리스트링으로 변환해야 한다', () => {
            const result = queryManager.buildQueryString({ a: '1', b: '2' });
            expect(result).toContain('a=1');
            expect(result).toContain('b=2');
        });

        test('배열 값을 []= 형식으로 변환해야 한다', () => {
            const result = queryManager.buildQueryString({ tags: ['a', 'b'] });
            // encodeURIComponent(key)는 'tags'만 인코딩, []는 리터럴로 추가됨
            expect(result).toContain('tags[]=a');
            expect(result).toContain('tags[]=b');
        });

        test('빈 객체는 빈 문자열을 반환해야 한다', () => {
            expect(queryManager.buildQueryString({})).toBe('');
        });

        test('null/undefined는 빈 문자열을 반환해야 한다', () => {
            expect(queryManager.buildQueryString(null)).toBe('');
        });

        test('null/undefined 값은 제외해야 한다', () => {
            const result = queryManager.buildQueryString({ a: '1', b: null, c: undefined });
            expect(result).toContain('a=1');
            expect(result).not.toContain('b=');
            expect(result).not.toContain('c=');
        });

        test('특수문자를 인코딩해야 한다', () => {
            const result = queryManager.buildQueryString({ q: 'hello world&more' });
            expect(result).toContain('hello%20world%26more');
        });
    });

    // === getQueryParam/getQueryParams ===
    describe('getQueryParam/getQueryParams', () => {
        test('설정된 쿼리 파라미터를 반환해야 한다', () => {
            queryManager.setCurrentQueryParams({ page: '1', sort: 'name' });
            expect(queryManager.getQueryParam('page')).toBe('1');
            expect(queryManager.getQueryParam('sort')).toBe('name');
        });

        test('존재하지 않는 파라미터에 defaultValue를 반환해야 한다', () => {
            expect(queryManager.getQueryParam('missing', 'default')).toBe('default');
        });

        test('getQueryParams()가 복사본을 반환해야 한다', () => {
            queryManager.setCurrentQueryParams({ a: '1' });
            const params = queryManager.getQueryParams();
            params.a = '999';
            expect(queryManager.getQueryParam('a')).toBe('1');
        });
    });

    // === setQueryParams ===
    describe('setQueryParams', () => {
        test('파라미터를 추가해야 한다', () => {
            queryManager.setCurrentQueryParams({ existing: 'yes' });
            queryManager.setQueryParams({ new: 'value' });
            expect(queryManager.getQueryParam('existing')).toBe('yes');
            expect(queryManager.getQueryParam('new')).toBe('value');
        });

        test('replace=true일 때 기존 파라미터를 모두 대체해야 한다', () => {
            queryManager.setCurrentQueryParams({ old: 'value' });
            queryManager.setQueryParams({ new: 'value' }, true);
            expect(queryManager.getQueryParam('old')).toBeUndefined();
            expect(queryManager.getQueryParam('new')).toBe('value');
        });

        test('null/undefined/빈문자열 값은 해당 키를 삭제해야 한다', () => {
            queryManager.setCurrentQueryParams({ a: '1', b: '2', c: '3' });
            queryManager.setQueryParams({ a: null, b: undefined, c: '' });
            expect(queryManager.getQueryParam('a')).toBeUndefined();
            expect(queryManager.getQueryParam('b')).toBeUndefined();
            expect(queryManager.getQueryParam('c')).toBeUndefined();
        });

        test('updateURL()을 호출해야 한다', () => {
            queryManager.setQueryParams({ key: 'value' });
            expect(mockRouter.updateURL).toHaveBeenCalled();
        });

        test('유효하지 않은 인자를 무시해야 한다', () => {
            queryManager.setQueryParams(null);
            queryManager.setQueryParams('string');
            expect(queryManager.getQueryParams()).toEqual({});
        });
    });

    // === removeQueryParams ===
    describe('removeQueryParams', () => {
        test('단일 키를 제거해야 한다', () => {
            queryManager.setCurrentQueryParams({ a: '1', b: '2' });
            queryManager.removeQueryParams('a');
            expect(queryManager.getQueryParam('a')).toBeUndefined();
            expect(queryManager.getQueryParam('b')).toBe('2');
        });

        test('배열로 여러 키를 제거해야 한다', () => {
            queryManager.setCurrentQueryParams({ a: '1', b: '2', c: '3' });
            queryManager.removeQueryParams(['a', 'b']);
            expect(queryManager.getQueryParam('a')).toBeUndefined();
            expect(queryManager.getQueryParam('b')).toBeUndefined();
            expect(queryManager.getQueryParam('c')).toBe('3');
        });

        test('updateURL()을 호출해야 한다', () => {
            queryManager.setCurrentQueryParams({ a: '1' });
            mockRouter.updateURL.mockClear();
            queryManager.removeQueryParams('a');
            expect(mockRouter.updateURL).toHaveBeenCalled();
        });
    });

    // === clearQueryParams ===
    describe('clearQueryParams', () => {
        test('모든 쿼리 파라미터를 초기화해야 한다', () => {
            queryManager.setCurrentQueryParams({ a: '1', b: '2' });
            queryManager.clearQueryParams();
            expect(queryManager.getQueryParams()).toEqual({});
        });
    });

    // === 라우트 파라미터 ===
    describe('라우트 파라미터', () => {
        test('setCurrentRouteParams()로 라우트 파라미터를 설정해야 한다', () => {
            queryManager.setCurrentRouteParams({ id: '123', tab: 'profile' });
            expect(queryManager.getRouteParam('id')).toBe('123');
        });

        test('getRouteParams()가 복사본을 반환해야 한다', () => {
            queryManager.setCurrentRouteParams({ id: '123' });
            const params = queryManager.getRouteParams();
            params.id = '999';
            expect(queryManager.getRouteParam('id')).toBe('123');
        });

        test('getRouteParam()이 defaultValue를 지원해야 한다', () => {
            expect(queryManager.getRouteParam('missing', 'fallback')).toBe('fallback');
        });

        test('null 파라미터를 빈 객체로 처리해야 한다', () => {
            queryManager.setCurrentRouteParams(null);
            expect(queryManager.currentRouteParams).toEqual({});
        });
    });

    // === getAllParams/getParam ===
    describe('getAllParams/getParam', () => {
        test('라우트 + 쿼리 파라미터를 합산해야 한다', () => {
            queryManager.setCurrentRouteParams({ id: '123' });
            queryManager.setCurrentQueryParams({ sort: 'name' });

            const all = queryManager.getAllParams();
            expect(all.id).toBe('123');
            expect(all.sort).toBe('name');
        });

        test('쿼리 파라미터가 라우트 파라미터보다 우선해야 한다', () => {
            queryManager.setCurrentRouteParams({ id: 'route_id' });
            queryManager.setCurrentQueryParams({ id: 'query_id' });

            expect(queryManager.getParam('id')).toBe('query_id');
        });

        test('getParam()이 defaultValue를 지원해야 한다', () => {
            expect(queryManager.getParam('missing', 'default')).toBe('default');
        });
    });

    // === hasQueryParamsChanged ===
    describe('hasQueryParamsChanged', () => {
        test('동일한 파라미터면 false를 반환해야 한다', () => {
            queryManager.setCurrentQueryParams({ a: '1', b: '2' });
            expect(queryManager.hasQueryParamsChanged({ a: '1', b: '2' })).toBe(false);
        });

        test('다른 파라미터면 true를 반환해야 한다', () => {
            queryManager.setCurrentQueryParams({ a: '1' });
            expect(queryManager.hasQueryParamsChanged({ a: '2' })).toBe(true);
        });

        test('키 개수가 다르면 true를 반환해야 한다', () => {
            queryManager.setCurrentQueryParams({ a: '1' });
            expect(queryManager.hasQueryParamsChanged({ a: '1', b: '2' })).toBe(true);
        });

        test('null 비교를 올바르게 처리해야 한다', () => {
            queryManager.setCurrentQueryParams({ a: '1' });
            expect(queryManager.hasQueryParamsChanged(null)).toBe(true);
        });
    });

    // === getStats ===
    describe('getStats', () => {
        test('올바른 통계를 반환해야 한다', () => {
            queryManager.setCurrentQueryParams({ a: '1', b: '2' });
            const stats = queryManager.getStats();
            expect(stats.currentParams).toBe(2);
            expect(typeof stats.currentQueryString).toBe('string');
        });
    });

    // === destroy ===
    describe('destroy', () => {
        test('파라미터를 초기화하고 router 참조를 제거해야 한다', () => {
            queryManager.setCurrentQueryParams({ a: '1' });
            queryManager.setCurrentRouteParams({ id: '1' });
            queryManager.destroy();
            expect(queryManager.currentQueryParams).toEqual({});
            expect(queryManager.currentRouteParams).toEqual({});
            expect(queryManager.router).toBeNull();
        });
    });
});
