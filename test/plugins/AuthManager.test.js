/**
 * Unit tests for AuthManager
 */

import { AuthManager } from '../../src/plugins/AuthManager.js';

describe('AuthManager', () => {
    let authManager;
    let mockRouter;

    beforeEach(() => {
        mockRouter = {
            errorHandler: {
                log: jest.fn()
            }
        };

        authManager = new AuthManager(mockRouter, {
            authEnabled: true,
            loginRoute: 'login',
            protectedRoutes: ['admin', 'profile'],
            protectedPrefixes: ['admin/', 'user/'],
            publicRoutes: ['login', 'register', 'home']
        });

        // Mock document.cookie
        Object.defineProperty(document, 'cookie', {
            writable: true,
            value: ''
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
        document.cookie = '';
        localStorage.clear();
    });

    describe('Configuration', () => {
        test('should initialize with auth enabled', () => {
            expect(authManager.config.enabled).toBe(true);
            expect(authManager.config.loginRoute).toBe('login');
            expect(authManager.config.protectedRoutes).toEqual(['admin', 'profile']);
        });

        test('should handle disabled auth', () => {
            const disabledAuthManager = new AuthManager(mockRouter, {
                authEnabled: false
            });

            expect(disabledAuthManager.config.enabled).toBe(false);
        });
    });

    describe('Authentication', () => {
        test('should check authentication from localStorage', () => {
            localStorage.setItem('authToken', 'valid-token-123');

            const result = authManager.isAuthenticated();

            expect(result).toBe(true);
        });

        test('should return false for missing token', () => {
            const result = authManager.isAuthenticated();

            expect(result).toBe(false);
        });

        test('should set access token', () => {
            const result = authManager.setAccessToken('new-token-789');

            expect(result).toBe(true);
            expect(localStorage.getItem('authToken')).toBe('new-token-789');
        });

        test('should get access token', () => {
            localStorage.setItem('authToken', 'stored-token');

            const token = authManager.getAccessToken();

            expect(token).toBe('stored-token');
        });

        test('should remove access token', () => {
            localStorage.setItem('authToken', 'token-to-remove');

            authManager.removeAccessToken();

            expect(localStorage.getItem('authToken')).toBeNull();
        });
    });

    describe('Route Protection', () => {
        test('should allow access to public routes', async () => {
            const result = await authManager.checkAuthentication('login');

            expect(result.allowed).toBe(true);
            expect(result.reason).toBe('public_route');
        });

        test('should deny access to protected routes without auth', async () => {
            const result = await authManager.checkAuthentication('admin');

            expect(result.allowed).toBe(false);
            expect(result.reason).toBe('not_authenticated');
        });

        test('should allow access to protected routes with auth', async () => {
            localStorage.setItem('authToken', 'valid-token');

            const result = await authManager.checkAuthentication('admin');

            expect(result.allowed).toBe(true);
            expect(result.reason).toBe('authenticated');
        });

        test('should check protected prefixes', async () => {
            const result = await authManager.checkAuthentication('admin/users');

            expect(result.allowed).toBe(false);
            expect(result.reason).toBe('not_authenticated');
        });

        test('should allow unprotected routes', async () => {
            const result = await authManager.checkAuthentication('about');

            expect(result.allowed).toBe(true);
            expect(result.reason).toBe('not_protected');
        });
    });

    describe('Route Utilities', () => {
        test('should identify protected routes', () => {
            expect(authManager.isProtectedRoute('admin')).toBe(true);
            expect(authManager.isProtectedRoute('admin/users')).toBe(true);
            expect(authManager.isProtectedRoute('about')).toBe(false);
        });

        test('should identify public routes', () => {
            expect(authManager.isPublicRoute('login')).toBe(true);
            expect(authManager.isPublicRoute('admin')).toBe(false);
        });
    });

    describe('Disabled Authentication', () => {
        test('should allow all routes when auth is disabled', async () => {
            const disabledAuthManager = new AuthManager(mockRouter, {
                authEnabled: false
            });

            const result = await disabledAuthManager.checkAuthentication('admin');

            expect(result.allowed).toBe(true);
            expect(result.reason).toBe('auth_disabled');
        });
    });
});