/**
 * StateHandler 단위 테스트
 */
import { StateHandler } from '../../src/core/StateHandler.js';
import { createMockRouter } from '../helpers/testHelpers.js';

describe('StateHandler', () => {
    let stateHandler;
    let mockRouter;

    beforeEach(() => {
        mockRouter = createMockRouter();
        stateHandler = new StateHandler(mockRouter);
    });

    afterEach(() => {
        if (stateHandler) {
            stateHandler.destroy();
            stateHandler = null;
        }
    });

    // === 초기화 ===
    describe('초기화', () => {
        test('router 인스턴스를 저장해야 한다', () => {
            expect(stateHandler.router).toBe(mockRouter);
        });

        test('빈 state 객체로 시작해야 한다', () => {
            expect(stateHandler.state).toEqual({});
        });

        test('빈 listeners Map으로 시작해야 한다', () => {
            expect(stateHandler.listeners).toBeInstanceOf(Map);
            expect(stateHandler.listeners.size).toBe(0);
        });
    });

    // === set/get ===
    describe('set/get', () => {
        test('set()으로 값을 저장하고 get()으로 조회해야 한다', () => {
            stateHandler.set('name', 'viewlogic');
            expect(stateHandler.get('name')).toBe('viewlogic');
        });

        test('set()이 저장된 값을 반환해야 한다', () => {
            const result = stateHandler.set('count', 42);
            expect(result).toBe(42);
        });

        test('get()에서 존재하지 않는 키는 undefined를 반환해야 한다', () => {
            expect(stateHandler.get('nonexistent')).toBeUndefined();
        });

        test('get()에서 defaultValue를 지원해야 한다', () => {
            expect(stateHandler.get('missing', 'fallback')).toBe('fallback');
        });

        test('다양한 타입의 값을 저장할 수 있어야 한다', () => {
            stateHandler.set('string', 'hello');
            stateHandler.set('number', 123);
            stateHandler.set('object', { a: 1 });
            stateHandler.set('array', [1, 2, 3]);
            stateHandler.set('null', null);
            stateHandler.set('boolean', false);

            expect(stateHandler.get('string')).toBe('hello');
            expect(stateHandler.get('number')).toBe(123);
            expect(stateHandler.get('object')).toEqual({ a: 1 });
            expect(stateHandler.get('array')).toEqual([1, 2, 3]);
            expect(stateHandler.get('null')).toBeNull();
            expect(stateHandler.get('boolean')).toBe(false);
        });

        test('undefined 값도 저장할 수 있어야 한다 (defaultValue와 구분)', () => {
            stateHandler.set('undef', undefined);
            // hasOwnProperty로 확인하므로 defaultValue 대신 undefined 반환
            expect(stateHandler.get('undef')).toBeUndefined();
            expect(stateHandler.has('undef')).toBe(true);
        });

        test('set()이 emitChange를 호출해야 한다', () => {
            const spy = jest.spyOn(stateHandler, 'emitChange');
            stateHandler.set('key', 'new');
            expect(spy).toHaveBeenCalledWith('key', 'new', undefined);
        });

        test('set()이 oldValue를 emitChange에 전달해야 한다', () => {
            stateHandler.set('key', 'old');
            const spy = jest.spyOn(stateHandler, 'emitChange');
            stateHandler.set('key', 'new');
            expect(spy).toHaveBeenCalledWith('key', 'new', 'old');
        });
    });

    // === has ===
    describe('has', () => {
        test('존재하는 키에 대해 true를 반환해야 한다', () => {
            stateHandler.set('exists', 'yes');
            expect(stateHandler.has('exists')).toBe(true);
        });

        test('존재하지 않는 키에 대해 false를 반환해야 한다', () => {
            expect(stateHandler.has('nope')).toBe(false);
        });

        test('값이 null인 키도 true를 반환해야 한다', () => {
            stateHandler.set('nullVal', null);
            expect(stateHandler.has('nullVal')).toBe(true);
        });
    });

    // === delete ===
    describe('delete', () => {
        test('존재하는 키를 삭제하면 true를 반환해야 한다', () => {
            stateHandler.set('toDelete', 'value');
            expect(stateHandler.delete('toDelete')).toBe(true);
        });

        test('존재하지 않는 키를 삭제하면 false를 반환해야 한다', () => {
            expect(stateHandler.delete('nonexistent')).toBe(false);
        });

        test('삭제 후 get()이 undefined를 반환해야 한다', () => {
            stateHandler.set('temp', 'data');
            stateHandler.delete('temp');
            expect(stateHandler.get('temp')).toBeUndefined();
        });

        test('삭제 시 emitChange를 호출해야 한다', () => {
            stateHandler.set('key', 'value');
            const spy = jest.spyOn(stateHandler, 'emitChange');
            stateHandler.delete('key');
            expect(spy).toHaveBeenCalledWith('key', undefined, 'value');
        });
    });

    // === clear ===
    describe('clear', () => {
        test('모든 상태를 삭제해야 한다', () => {
            stateHandler.set('a', 1);
            stateHandler.set('b', 2);
            stateHandler.clear();
            expect(stateHandler.get('a')).toBeUndefined();
            expect(stateHandler.get('b')).toBeUndefined();
        });

        test('삭제된 키 수를 반환해야 한다', () => {
            stateHandler.set('x', 1);
            stateHandler.set('y', 2);
            stateHandler.set('z', 3);
            expect(stateHandler.clear()).toBe(3);
        });

        test('빈 상태에서 0을 반환해야 한다', () => {
            expect(stateHandler.clear()).toBe(0);
        });
    });

    // === update ===
    describe('update', () => {
        test('여러 키-값 쌍을 한번에 설정해야 한다', () => {
            stateHandler.update({ a: 1, b: 2, c: 3 });
            expect(stateHandler.get('a')).toBe(1);
            expect(stateHandler.get('b')).toBe(2);
            expect(stateHandler.get('c')).toBe(3);
        });

        test('null 인자를 무시해야 한다', () => {
            stateHandler.update(null);
            expect(Object.keys(stateHandler.state).length).toBe(0);
        });

        test('문자열 인자를 무시해야 한다', () => {
            stateHandler.update('invalid');
            expect(Object.keys(stateHandler.state).length).toBe(0);
        });
    });

    // === getAll ===
    describe('getAll', () => {
        test('state의 복사본을 반환해야 한다', () => {
            stateHandler.set('a', 1);
            const all = stateHandler.getAll();
            expect(all).toEqual({ a: 1 });
            // 원본 변경 안됨 확인
            all.a = 999;
            expect(stateHandler.get('a')).toBe(1);
        });
    });

    // === watch/unwatch ===
    describe('watch/unwatch', () => {
        test('watch()로 등록한 콜백이 변경 시 호출되어야 한다', () => {
            const callback = jest.fn();
            stateHandler.watch('key', callback);
            stateHandler.set('key', 'value');
            expect(callback).toHaveBeenCalledTimes(1);
        });

        test('콜백에 (newValue, oldValue, key) 인자가 전달되어야 한다', () => {
            const callback = jest.fn();
            stateHandler.watch('key', callback);
            stateHandler.set('key', 'first');
            stateHandler.set('key', 'second');
            expect(callback).toHaveBeenLastCalledWith('second', 'first', 'key');
        });

        test('unwatch()로 제거한 콜백은 더 이상 호출되지 않아야 한다', () => {
            const callback = jest.fn();
            stateHandler.watch('key', callback);
            stateHandler.unwatch('key', callback);
            stateHandler.set('key', 'value');
            expect(callback).not.toHaveBeenCalled();
        });

        test('같은 키에 여러 watcher를 등록할 수 있어야 한다', () => {
            const cb1 = jest.fn();
            const cb2 = jest.fn();
            stateHandler.watch('key', cb1);
            stateHandler.watch('key', cb2);
            stateHandler.set('key', 'value');
            expect(cb1).toHaveBeenCalled();
            expect(cb2).toHaveBeenCalled();
        });

        test('watcher 콜백에서 에러가 발생해도 다른 watcher가 실행되어야 한다', () => {
            const errorCb = jest.fn(() => { throw new Error('watcher error'); });
            const normalCb = jest.fn();
            stateHandler.watch('key', errorCb);
            stateHandler.watch('key', normalCb);
            stateHandler.set('key', 'value');
            expect(errorCb).toHaveBeenCalled();
            expect(normalCb).toHaveBeenCalled();
        });

        test('존재하지 않는 키의 unwatch는 에러 없이 무시해야 한다', () => {
            const callback = jest.fn();
            expect(() => stateHandler.unwatch('noKey', callback)).not.toThrow();
        });
    });

    // === getStats ===
    describe('getStats', () => {
        test('올바른 stateCount, watcherCount, keys를 반환해야 한다', () => {
            stateHandler.set('a', 1);
            stateHandler.set('b', 2);
            stateHandler.watch('a', jest.fn());
            stateHandler.watch('a', jest.fn());
            stateHandler.watch('b', jest.fn());

            const stats = stateHandler.getStats();
            expect(stats.stateCount).toBe(2);
            expect(stats.watcherCount).toBe(3);
            expect(stats.keys).toEqual(['a', 'b']);
        });
    });

    // === destroy ===
    describe('destroy', () => {
        test('state와 listeners를 정리해야 한다', () => {
            stateHandler.set('key', 'value');
            stateHandler.watch('key', jest.fn());
            stateHandler.destroy();
            expect(stateHandler.state).toEqual({});
            expect(stateHandler.listeners.size).toBe(0);
        });
    });

    // === log ===
    describe('log', () => {
        test('router.errorHandler.log에 위임해야 한다', () => {
            stateHandler.log('info', 'test message');
            expect(mockRouter.errorHandler.log).toHaveBeenCalledWith('info', 'StateHandler', 'test message');
        });

        test('router가 없어도 에러가 발생하지 않아야 한다', () => {
            stateHandler.router = null;
            expect(() => stateHandler.log('info', 'msg')).not.toThrow();
        });
    });
});
