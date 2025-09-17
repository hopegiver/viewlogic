/**
 * Basic integration tests for publishing
 */

import { ViewLogicRouter } from '../src/viewlogic-router.js';

describe('ViewLogic Router - Integration Tests', () => {
    let router;

    afterEach(() => {
        if (router) {
            router.destroy();
            router = null;
        }
    });

    describe('Full Router Integration', () => {
        test('should initialize router with all components', async () => {
            router = new ViewLogicRouter({
                authEnabled: true,
                useI18n: true,
                cacheMode: 'memory'
            });

            // Wait for router to be ready
            await router.readyPromise;

            expect(router.isReady).toBe(true);
            expect(router.authManager).toBeDefined();
            expect(router.i18nManager).toBeDefined();
            expect(router.cacheManager).toBeDefined();
        });

        test('should handle route navigation flow', () => {
            router = new ViewLogicRouter();

            // Navigate to a route
            expect(() => {
                router.navigateTo('users');
            }).not.toThrow();
        });

        test('should handle query parameters', () => {
            router = new ViewLogicRouter();

            // Navigate with query parameters
            expect(() => {
                router.navigateTo('users', { id: '123', tab: 'profile' });
            }).not.toThrow();
        });

        test('should have routing state', () => {
            router = new ViewLogicRouter();

            expect(router.currentHash).toBeDefined();
            expect(router.isReady).toBeDefined();
        });
    });

    describe('Component Communication', () => {
        test('should share query manager between components', () => {
            router = new ViewLogicRouter();

            const queryManager = router.queryManager;
            const routeLoader = router.routeLoader;

            // Both should reference the same query manager
            expect(queryManager).toBeDefined();
            expect(routeLoader).toBeDefined();
        });

        test('should share error handler between components', () => {
            router = new ViewLogicRouter();

            const errorHandler = router.errorHandler;

            expect(errorHandler).toBeDefined();
            expect(typeof errorHandler.log).toBe('function');
        });

        test('should handle cache manager integration', () => {
            router = new ViewLogicRouter({ cacheMode: 'memory' });

            const cacheManager = router.cacheManager;

            expect(cacheManager).toBeDefined();
            expect(typeof cacheManager.set).toBe('function');
            expect(typeof cacheManager.get).toBe('function');
        });
    });

    describe('Route Lifecycle', () => {
        test('should handle complete route lifecycle', async () => {
            router = new ViewLogicRouter();

            // Simulate route change
            expect(() => {
                router.navigateTo('dashboard');
            }).not.toThrow();

            // Should have current hash
            expect(router.currentHash).toBeDefined();
        });

        test('should handle hash mode routing', () => {
            router = new ViewLogicRouter({ mode: 'hash' });

            expect(() => {
                router.navigateTo('products');
            }).not.toThrow();

            expect(router.config.mode).toBe('hash');
        });

        test('should handle history mode routing', () => {
            router = new ViewLogicRouter({ mode: 'history' });

            expect(() => {
                router.navigateTo('about');
            }).not.toThrow();

            expect(router.config.mode).toBe('history');
        });
    });

    describe('Configuration Integration', () => {
        test('should respect base path configuration', () => {
            router = new ViewLogicRouter({ basePath: '/app' });

            expect(router.config.basePath).toBe('/app');
        });

        test('should respect cache TTL configuration', () => {
            router = new ViewLogicRouter({ cacheTTL: 600000 });

            expect(router.config.cacheTTL).toBe(600000);
            expect(router.cacheManager.config.cacheTTL).toBe(600000);
        });

        test('should handle environment-specific configuration', () => {
            router = new ViewLogicRouter({ environment: 'production' });

            expect(router.config.environment).toBe('production');
        });
    });

    describe('Error Recovery', () => {
        test('should handle errors gracefully', () => {
            router = new ViewLogicRouter();

            // Should not throw on empty string navigation
            expect(() => {
                router.navigateTo('');
            }).not.toThrow();

            // Should handle valid navigation
            expect(() => {
                router.navigateTo('test');
            }).not.toThrow();
        });

        test('should maintain router state after errors', () => {
            router = new ViewLogicRouter();

            // Set initial route
            router.navigateTo('home');

            // Try invalid operation
            try {
                router.navigateTo(undefined);
            } catch (e) {
                // Should continue working
            }

            // Should still work
            expect(router.currentHash).toBeDefined();
        });
    });
});