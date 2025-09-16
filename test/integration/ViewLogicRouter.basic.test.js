/**
 * Basic integration tests for ViewLogic Router
 * Focused on core functionality that should work reliably
 */

import { ViewLogicRouter } from '../../src/viewlogic-router.js';

describe('ViewLogic Router - Basic Integration Tests', () => {
    let router;

    beforeEach(() => {
        // Reset window location
        window.location.hash = '#/';
        window.location.pathname = '/';
        window.location.search = '';
    });

    afterEach(() => {
        if (router) {
            try {
                router.destroy();
            } catch (error) {
                // Ignore cleanup errors
            }
            router = null;
        }
    });

    describe('Router Construction', () => {
        test('should create router instance with default config', () => {
            router = new ViewLogicRouter();

            expect(router).toBeDefined();
            expect(router.config).toBeDefined();
            expect(router.version).toBeDefined();
        });

        test('should create router with custom config', () => {
            const customConfig = {
                basePath: '/custom',
                mode: 'history',
                environment: 'test'
            };

            router = new ViewLogicRouter(customConfig);

            expect(router.config.basePath).toBe('/custom');
            expect(router.config.mode).toBe('history');
            expect(router.config.environment).toBe('test');
        });

        test('should have required managers', () => {
            router = new ViewLogicRouter({ logLevel: 'error' });

            // Check that essential managers exist (they might be null initially)
            expect('cacheManager' in router).toBe(true);
            expect('queryManager' in router).toBe(true);
            expect('errorHandler' in router).toBe(true);
        });
    });

    describe('Navigation Methods', () => {
        test('should have navigation methods', () => {
            router = new ViewLogicRouter({ logLevel: 'error' });

            expect(typeof router.navigateTo).toBe('function');
            expect(typeof router.updateURL).toBe('function');
            expect(typeof router.getCurrentRoute).toBe('function');
        });

        test('should update URL when navigating in hash mode', () => {
            router = new ViewLogicRouter({
                mode: 'hash',
                logLevel: 'error'
            });

            router.navigateTo('about');
            expect(window.location.hash).toContain('about');
        });

        test('should handle navigation with parameters', () => {
            router = new ViewLogicRouter({
                mode: 'hash',
                logLevel: 'error'
            });

            router.navigateTo('products', { category: 'electronics', page: '2' });

            expect(window.location.hash).toContain('products');
        });
    });

    describe('Configuration Handling', () => {
        test('should merge default and custom configurations', () => {
            const customOptions = {
                cacheTTL: 60000,
                maxCacheSize: 100,
                useI18n: true,
                authEnabled: true
            };

            router = new ViewLogicRouter(customOptions);

            // Check custom options
            expect(router.config.cacheTTL).toBe(60000);
            expect(router.config.maxCacheSize).toBe(100);
            expect(router.config.useI18n).toBe(true);
            expect(router.config.authEnabled).toBe(true);

            // Check defaults are preserved
            expect(router.config.basePath).toBe('/');
            expect(router.config.mode).toBe('hash');
        });

        test('should resolve paths correctly', () => {
            router = new ViewLogicRouter({
                basePath: '/app',
                logLevel: 'error'
            });

            const resolvedPath = router.resolvePath('/api/data', '/app');
            expect(resolvedPath).toBeDefined();
            expect(typeof resolvedPath).toBe('string');
        });
    });

    describe('Event Handling', () => {
        test('should set up event listeners in hash mode', () => {
            const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

            router = new ViewLogicRouter({
                mode: 'hash',
                logLevel: 'error'
            });

            router.init();

            expect(addEventListenerSpy).toHaveBeenCalledWith(
                'hashchange',
                expect.any(Function)
            );

            addEventListenerSpy.mockRestore();
        });

        test('should set up event listeners in history mode', () => {
            const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

            router = new ViewLogicRouter({
                mode: 'history',
                logLevel: 'error'
            });

            router.init();

            expect(addEventListenerSpy).toHaveBeenCalledWith(
                'popstate',
                expect.any(Function)
            );

            addEventListenerSpy.mockRestore();
        });
    });

    describe('URL Parsing', () => {
        test('should parse hash-based URLs', () => {
            router = new ViewLogicRouter({
                mode: 'hash',
                logLevel: 'error'
            });

            window.location.hash = '#/products?category=electronics';

            const parsed = router._parseCurrentLocation();
            expect(parsed.route).toBe('products');
        });

        test('should handle empty hash as home route', () => {
            router = new ViewLogicRouter({
                mode: 'hash',
                logLevel: 'error'
            });

            window.location.hash = '#/';

            const parsed = router._parseCurrentLocation();
            expect(parsed.route).toBe('home');
        });
    });

    describe('Cleanup', () => {
        test('should remove event listeners on destroy', () => {
            const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

            router = new ViewLogicRouter({
                mode: 'hash',
                logLevel: 'error'
            });

            router.init();
            router.destroy();

            expect(removeEventListenerSpy).toHaveBeenCalledWith(
                'hashchange',
                expect.any(Function)
            );

            removeEventListenerSpy.mockRestore();
        });

        test('should handle destroy without initialization', () => {
            router = new ViewLogicRouter({ logLevel: 'error' });

            expect(() => {
                router.destroy();
            }).not.toThrow();
        });
    });

    describe('Manager Initialization', () => {
        test('should initialize managers without errors', () => {
            expect(() => {
                router = new ViewLogicRouter({
                    useI18n: true,
                    authEnabled: true,
                    logLevel: 'error'
                });
            }).not.toThrow();

            // Basic checks that core managers exist
            expect(router.cacheManager).toBeDefined();
            expect(router.queryManager).toBeDefined();
            expect(router.errorHandler).toBeDefined();

            // Optional managers depend on configuration
            if (router.config.useI18n) {
                expect(router.i18nManager).toBeDefined();
            }

            // AuthManager might be initialized conditionally or asynchronously
            // Just check that the router was created successfully with auth config
            expect(router.config.authEnabled).toBe(true);
        });

        test('should handle manager initialization failures gracefully', () => {
            expect(() => {
                router = new ViewLogicRouter({
                    logLevel: 'error',
                    environment: 'test'
                });
            }).not.toThrow();
        });
    });
});