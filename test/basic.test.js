/**
 * Basic unit tests for publishing
 */

import { ViewLogicRouter } from '../src/viewlogic-router.js';

describe('ViewLogic Router - Basic Tests', () => {
    let router;

    afterEach(() => {
        if (router) {
            router.destroy();
            router = null;
        }
    });

    describe('Module Loading', () => {
        test('should import ViewLogicRouter class', () => {
            expect(ViewLogicRouter).toBeDefined();
            expect(typeof ViewLogicRouter).toBe('function');
        });
    });

    describe('Router Instantiation', () => {
        test('should create router instance with default config', () => {
            router = new ViewLogicRouter();

            expect(router).toBeDefined();
            expect(router.config).toBeDefined();
            expect(router.version).toBeDefined();
        });

        test('should create router instance with custom config', () => {
            router = new ViewLogicRouter({
                basePath: '/test',
                mode: 'hash'
            });

            expect(router.config.basePath).toBe('/test');
            expect(router.config.mode).toBe('hash');
        });

        test('should have required core components', () => {
            router = new ViewLogicRouter();

            expect(router.routeLoader).toBeDefined();
            expect(router.errorHandler).toBeDefined();
            expect(router.queryManager).toBeDefined();
            expect(router.cacheManager).toBeDefined();
        });
    });

    describe('Configuration', () => {
        test('should merge custom options with defaults', () => {
            router = new ViewLogicRouter({
                cacheTTL: 600000,
                useI18n: true,
                authEnabled: true
            });

            expect(router.config.cacheTTL).toBe(600000);
            expect(router.config.useI18n).toBe(true);
            expect(router.config.authEnabled).toBe(true);
        });

        test('should have default configuration values', () => {
            router = new ViewLogicRouter();

            expect(router.config.mode).toBe('hash');
            expect(router.config.basePath).toBe('/');
            expect(router.config.cacheTTL).toBe(300000);
        });
    });

    describe('Basic Functionality', () => {
        beforeEach(() => {
            router = new ViewLogicRouter();
        });

        test('should have basic routing methods', () => {
            expect(typeof router.navigateTo).toBe('function');
            expect(typeof router.destroy).toBe('function');
        });

        test('should handle navigation to route', () => {
            expect(() => {
                router.navigateTo('home');
            }).not.toThrow();
        });

        test('should have currentHash property', () => {
            expect(router.currentHash).toBeDefined();
        });
    });

    describe('Event Handling', () => {
        test('should create router without throwing', () => {
            expect(() => {
                router = new ViewLogicRouter({ mode: 'hash' });
            }).not.toThrow();
        });

        test('should destroy router without throwing', () => {
            router = new ViewLogicRouter();

            expect(() => {
                router.destroy();
            }).not.toThrow();
        });
    });

    describe('Component Integration', () => {
        test('should initialize auth manager when enabled', () => {
            router = new ViewLogicRouter({ authEnabled: true });

            expect(router.authManager).toBeDefined();
        });

        test('should initialize i18n manager when enabled', () => {
            router = new ViewLogicRouter({ useI18n: true });

            expect(router.i18nManager).toBeDefined();
        });

        test('should not initialize optional components when disabled', () => {
            router = new ViewLogicRouter({
                authEnabled: false,
                useI18n: false
            });

            expect(router.authManager).toBeUndefined();
            expect(router.i18nManager).toBeUndefined();
        });
    });

    describe('Error Handling', () => {
        test('should handle destroy gracefully', () => {
            router = new ViewLogicRouter();

            expect(() => {
                router.destroy();
            }).not.toThrow();
        });

        test('should handle multiple destroy calls', () => {
            router = new ViewLogicRouter();

            router.destroy();
            expect(() => {
                router.destroy();
            }).not.toThrow();
        });

        test('should handle invalid navigation gracefully', () => {
            router = new ViewLogicRouter();

            expect(() => {
                router.navigateTo('');
            }).not.toThrow();
        });
    });
});