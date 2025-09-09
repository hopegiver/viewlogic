/**
 * Unit tests for ViewLogicRouter main class
 */

import { ViewLogicRouter } from '../src/viewlogic-router.js';

// Mock modules
jest.mock('../src/plugins/I18nManager.js');
jest.mock('../src/plugins/AuthManager.js');
jest.mock('../src/plugins/CacheManager.js');
jest.mock('../src/plugins/QueryManager.js');
jest.mock('../src/core/RouteLoader.js');
jest.mock('../src/core/ErrorHandler.js');
jest.mock('../src/core/ComponentLoader.js');

describe('ViewLogicRouter', () => {
    let router;
    let mockConfig;

    beforeEach(() => {
        mockConfig = {
            basePath: '/src',
            mode: 'hash',
            environment: 'test',
            useI18n: false,
            authEnabled: false,
            useComponents: false
        };

        // Reset DOM mocks
        document.getElementById.mockReturnValue({
            appendChild: jest.fn(),
            innerHTML: '',
            querySelectorAll: jest.fn(() => []),
            querySelector: jest.fn()
        });

        window.location.hash = '#/';
        window.addEventListener.mockClear();
        window.removeEventListener.mockClear();
    });

    afterEach(() => {
        if (router) {
            router.destroy();
        }
        jest.clearAllMocks();
    });

    describe('Constructor and Initialization', () => {
        test('should create router with default config', () => {
            router = new ViewLogicRouter();
            
            expect(router).toBeDefined();
            expect(router.version).toBe('1.0.0');
            expect(router.config.basePath).toBe('/src');
            expect(router.config.mode).toBe('hash');
        });

        test('should merge custom config with defaults', () => {
            router = new ViewLogicRouter({
                basePath: '/custom',
                mode: 'history',
                useI18n: true
            });

            expect(router.config.basePath).toBe('/custom');
            expect(router.config.mode).toBe('history');
            expect(router.config.useI18n).toBe(true);
        });

        test('should initialize with ready promise', () => {
            router = new ViewLogicRouter(mockConfig);
            
            expect(router.readyPromise).toBeDefined();
            expect(router.isReady).toBe(false);
        });
    });

    describe('Configuration Building', () => {
        test('should build config with all defaults', () => {
            router = new ViewLogicRouter();
            const config = router.config;

            expect(config.basePath).toBe('/src');
            expect(config.mode).toBe('hash');
            expect(config.cacheMode).toBe('memory');
            expect(config.useLayout).toBe(true);
            expect(config.defaultLanguage).toBe('ko');
            expect(config.authEnabled).toBe(false);
        });

        test('should override defaults with provided options', () => {
            router = new ViewLogicRouter({
                mode: 'history',
                defaultLanguage: 'en',
                authEnabled: true
            });

            expect(router.config.mode).toBe('history');
            expect(router.config.defaultLanguage).toBe('en');
            expect(router.config.authEnabled).toBe(true);
        });
    });

    describe('URL Parsing', () => {
        test('should parse hash route correctly', () => {
            router = new ViewLogicRouter(mockConfig);
            window.location.hash = '#/products';
            
            const result = router._parseCurrentLocation();
            
            expect(result.route).toBe('products');
            expect(result.queryParams).toEqual({});
        });

        test('should parse hash route with query params', () => {
            router = new ViewLogicRouter(mockConfig);
            window.location.hash = '#/products?id=123&category=electronics';
            
            // Mock query manager
            router.queryManager = {
                parseQueryString: jest.fn(() => ({
                    id: '123',
                    category: 'electronics'
                }))
            };
            
            const result = router._parseCurrentLocation();
            
            expect(result.route).toBe('products');
            expect(router.queryManager.parseQueryString).toHaveBeenCalledWith('id=123&category=electronics');
        });

        test('should default to home route for empty hash', () => {
            router = new ViewLogicRouter(mockConfig);
            window.location.hash = '#/';
            
            const result = router._parseCurrentLocation();
            
            expect(result.route).toBe('home');
        });

        test('should parse history mode routes', () => {
            router = new ViewLogicRouter({
                ...mockConfig,
                mode: 'history'
            });
            window.location.pathname = '/about';
            
            const result = router._parseCurrentLocation();
            
            expect(result.route).toBe('about');
        });
    });

    describe('Navigation', () => {
        test('should navigate to route', () => {
            router = new ViewLogicRouter(mockConfig);
            
            router.navigateTo('about');
            
            expect(window.location.hash).toBe('#/about');
        });

        test('should handle object parameter for navigation', () => {
            router = new ViewLogicRouter(mockConfig);
            
            router.navigateTo({
                route: 'products',
                params: { id: '123' }
            });
            
            // Should call updateURL with route and params
            expect(window.location.hash).toBe('#/products');
        });

        test('should clear query params when navigating to different route', () => {
            router = new ViewLogicRouter(mockConfig);
            router.currentHash = 'home';
            router.queryManager = {
                clearQueryParams: jest.fn()
            };
            
            router.navigateTo('about');
            
            expect(router.queryManager.clearQueryParams).toHaveBeenCalled();
        });
    });

    describe('URL Building', () => {
        test('should update URL with route', () => {
            router = new ViewLogicRouter(mockConfig);
            router.queryManager = {
                getQueryParams: jest.fn(() => ({})),
                buildQueryString: jest.fn(() => '')
            };
            
            router.updateURL('products');
            
            expect(window.location.hash).toBe('#/products');
        });

        test('should handle home route specially', () => {
            router = new ViewLogicRouter(mockConfig);
            router.queryManager = {
                getQueryParams: jest.fn(() => ({})),
                buildQueryString: jest.fn(() => '')
            };
            
            router.updateURL('home');
            
            expect(window.location.hash).toBe('#/');
        });

        test('should include query string in URL', () => {
            router = new ViewLogicRouter(mockConfig);
            router.queryManager = {
                getQueryParams: jest.fn(() => ({})),
                buildQueryString: jest.fn(() => 'page=2&sort=asc')
            };
            
            router.updateURL('products');
            
            expect(window.location.hash).toBe('#/products?page=2&sort=asc');
        });

        test('should use history API for history mode', () => {
            router = new ViewLogicRouter({
                ...mockConfig,
                mode: 'history'
            });
            router.queryManager = {
                getQueryParams: jest.fn(() => ({})),
                buildQueryString: jest.fn(() => '')
            };
            
            window.location.pathname = '/home';
            router.updateURL('about');
            
            expect(window.history.pushState).toHaveBeenCalledWith({}, '', '/about');
        });
    });

    describe('Event Handling', () => {
        test('should add hash change event listener in hash mode', () => {
            router = new ViewLogicRouter(mockConfig);
            
            // Mock the init method to avoid full initialization
            router.init();
            
            expect(window.addEventListener).toHaveBeenCalledWith(
                'hashchange',
                expect.any(Function)
            );
        });

        test('should add popstate event listener in history mode', () => {
            router = new ViewLogicRouter({
                ...mockConfig,
                mode: 'history'
            });
            
            router.init();
            
            expect(window.addEventListener).toHaveBeenCalledWith(
                'popstate',
                expect.any(Function)
            );
        });

        test('should remove event listeners on destroy', () => {
            router = new ViewLogicRouter(mockConfig);
            router.init();
            
            router.destroy();
            
            expect(window.removeEventListener).toHaveBeenCalledWith(
                'hashchange',
                expect.any(Function)
            );
        });
    });

    describe('Current Route', () => {
        test('should return current route', () => {
            router = new ViewLogicRouter(mockConfig);
            router.currentHash = 'products';
            
            const currentRoute = router.getCurrentRoute();
            
            expect(currentRoute).toBe('products');
        });
    });

    describe('Cleanup', () => {
        test('should cleanup properly on destroy', () => {
            router = new ViewLogicRouter(mockConfig);
            
            // Mock managers
            router.cacheManager = {
                clearAll: jest.fn(),
                destroy: jest.fn()
            };
            
            router.currentVueApp = {
                unmount: jest.fn()
            };
            
            router.previousVueApp = {
                unmount: jest.fn()
            };
            
            const appElement = {
                innerHTML: ''
            };
            document.getElementById.mockReturnValue(appElement);
            
            router.destroy();
            
            expect(router.cacheManager.clearAll).toHaveBeenCalled();
            expect(router.currentVueApp.unmount).toHaveBeenCalled();
            expect(router.previousVueApp.unmount).toHaveBeenCalled();
            expect(appElement.innerHTML).toBe('');
        });

        test('should handle missing Vue apps gracefully', () => {
            router = new ViewLogicRouter(mockConfig);
            router.currentVueApp = null;
            router.previousVueApp = null;
            
            expect(() => router.destroy()).not.toThrow();
        });
    });
});