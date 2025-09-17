/**
 * Unit tests for StateHandler
 */

import { StateHandler } from '../../src/core/StateHandler.js';

describe('StateHandler', () => {
    let stateHandler;
    let mockRouter;

    beforeEach(() => {
        mockRouter = {
            errorHandler: {
                log: jest.fn()
            }
        };

        stateHandler = new StateHandler(mockRouter);
    });

    afterEach(() => {
        jest.clearAllMocks();
        stateHandler.destroy();
    });

    describe('Basic State Operations', () => {
        test('should set and get state values', () => {
            stateHandler.set('user', { name: 'John', age: 30 });

            const result = stateHandler.get('user');

            expect(result).toEqual({ name: 'John', age: 30 });
        });

        test('should return default value for non-existent keys', () => {
            const result = stateHandler.get('missing', 'default');

            expect(result).toBe('default');
        });

        test('should check if key exists', () => {
            stateHandler.set('existing', 'value');

            expect(stateHandler.has('existing')).toBe(true);
            expect(stateHandler.has('missing')).toBe(false);
        });

        test('should delete state values', () => {
            stateHandler.set('toDelete', 'value');

            const deleted = stateHandler.delete('toDelete');

            expect(deleted).toBe(true);
            expect(stateHandler.has('toDelete')).toBe(false);
        });

        test('should return false when deleting non-existent key', () => {
            const deleted = stateHandler.delete('nonExistent');

            expect(deleted).toBe(false);
        });
    });

    describe('Bulk Operations', () => {
        test('should update multiple states at once', () => {
            stateHandler.update({
                name: 'John',
                age: 30,
                city: 'New York'
            });

            expect(stateHandler.get('name')).toBe('John');
            expect(stateHandler.get('age')).toBe(30);
            expect(stateHandler.get('city')).toBe('New York');
        });

        test('should get all states', () => {
            stateHandler.set('key1', 'value1');
            stateHandler.set('key2', 'value2');

            const allStates = stateHandler.getAll();

            expect(allStates).toEqual({
                key1: 'value1',
                key2: 'value2'
            });
        });

        test('should clear all states', () => {
            stateHandler.set('key1', 'value1');
            stateHandler.set('key2', 'value2');

            const cleared = stateHandler.clear();

            expect(cleared).toBe(2);
            expect(stateHandler.getAll()).toEqual({});
        });
    });

    describe('State Watching', () => {
        test('should watch state changes', () => {
            const watcher = jest.fn();
            stateHandler.watch('user', watcher);

            stateHandler.set('user', { name: 'John' });

            expect(watcher).toHaveBeenCalledWith(
                { name: 'John' },
                undefined,
                'user'
            );
        });

        test('should call multiple watchers for same key', () => {
            const watcher1 = jest.fn();
            const watcher2 = jest.fn();

            stateHandler.watch('count', watcher1);
            stateHandler.watch('count', watcher2);

            stateHandler.set('count', 5);

            expect(watcher1).toHaveBeenCalledWith(5, undefined, 'count');
            expect(watcher2).toHaveBeenCalledWith(5, undefined, 'count');
        });

        test('should unwatch state changes', () => {
            const watcher = jest.fn();
            stateHandler.watch('user', watcher);
            stateHandler.unwatch('user', watcher);

            stateHandler.set('user', { name: 'John' });

            expect(watcher).not.toHaveBeenCalled();
        });

        test('should handle watcher errors gracefully', () => {
            const errorWatcher = jest.fn(() => {
                throw new Error('Watcher error');
            });
            const normalWatcher = jest.fn();

            stateHandler.watch('test', errorWatcher);
            stateHandler.watch('test', normalWatcher);

            stateHandler.set('test', 'value');

            expect(normalWatcher).toHaveBeenCalledWith('value', undefined, 'test');
            expect(mockRouter.errorHandler.log).toHaveBeenCalledWith(
                'error', 'StateHandler', 'State watcher error:', expect.any(Error)
            );
        });
    });

    describe('State Statistics', () => {
        test('should provide state statistics', () => {
            stateHandler.set('key1', 'value1');
            stateHandler.set('key2', 'value2');
            stateHandler.watch('key1', jest.fn());
            stateHandler.watch('key2', jest.fn());

            const stats = stateHandler.getStats();

            expect(stats.stateCount).toBe(2);
            expect(stats.watcherCount).toBe(2);
            expect(stats.keys).toEqual(['key1', 'key2']);
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid update object', () => {
            stateHandler.update(null);
            stateHandler.update('invalid');

            expect(mockRouter.errorHandler.log).toHaveBeenCalledWith(
                'warn', 'StateHandler', 'Invalid updates object provided'
            );
        });
    });

    describe('Cleanup', () => {
        test('should destroy properly', () => {
            stateHandler.set('key1', 'value1');
            stateHandler.watch('key1', jest.fn());

            stateHandler.destroy();

            expect(stateHandler.getAll()).toEqual({});
            expect(stateHandler.getStats().watcherCount).toBe(0);
        });
    });
});