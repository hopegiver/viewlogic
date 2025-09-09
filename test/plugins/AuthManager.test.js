/**
 * Unit tests for AuthManager
 */

import { AuthManager } from '../../src/plugins/AuthManager.js';

describe('AuthManager', () => {
    let authManager;
    let mockRouter;
    let mockConfig;

    beforeEach(() => {
        mockRouter = {
            log: jest.fn()
        };
        
        mockConfig = {
            authEnabled: true,
            loginRoute: 'login',
            protectedRoutes: ['admin', 'profile'],
            protectedPrefixes: ['admin/', 'user/'],
            publicRoutes: ['login', 'register', 'home'],
            authStorage: 'cookie',
            authCookieName: 'authToken',
            authFallbackCookieNames: ['accessToken', 'token'],
            authSkipValidation: false,
            checkAuthFunction: null
        };

        authManager = new AuthManager(mockRouter, mockConfig);
        
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
            expect(authManager.authEnabled).toBe(true);
            expect(authManager.loginRoute).toBe('login');
            expect(authManager.protectedRoutes).toEqual(['admin', 'profile']);
        });

        test('should handle disabled auth', () => {
            const disabledAuthManager = new AuthManager(mockRouter, {
                ...mockConfig,
                authEnabled: false
            });
            
            expect(disabledAuthManager.authEnabled).toBe(false);
        });
    });

    describe('Cookie Authentication', () => {
        test('should check authentication from cookie', () => {
            document.cookie = 'authToken=valid-token-123';
            
            const result = authManager.isAuthenticated();
            
            expect(result).toBe(true);
        });

        test('should check fallback cookie names', () => {
            document.cookie = 'accessToken=fallback-token-456';
            
            const result = authManager.isAuthenticated();
            
            expect(result).toBe(true);
        });

        test('should return false for missing auth cookie', () => {
            document.cookie = 'other=value';
            
            const result = authManager.isAuthenticated();
            
            expect(result).toBe(false);
        });

        test('should set authentication token', () => {
            authManager.login('new-token-789');
            
            expect(document.cookie).toContain('authToken=new-token-789');
        });

        test('should remove authentication token on logout', () => {
            document.cookie = 'authToken=token-to-remove';
            
            authManager.logout();
            
            expect(document.cookie).toContain('authToken=; expires=');
        });
    });

    describe('LocalStorage Authentication', () => {
        beforeEach(() => {
            authManager = new AuthManager(mockRouter, {
                ...mockConfig,
                authStorage: 'localStorage'
            });
        });

        test('should check authentication from localStorage', () => {
            localStorage.setItem('authToken', 'stored-token-123');
            
            const result = authManager.isAuthenticated();
            
            expect(result).toBe(true);
        });

        test('should set token in localStorage', () => {
            authManager.login('new-stored-token');
            
            expect(localStorage.getItem('authToken')).toBe('new-stored-token');
        });

        test('should remove token from localStorage on logout', () => {
            localStorage.setItem('authToken', 'token-to-remove');
            
            authManager.logout();
            
            expect(localStorage.getItem('authToken')).toBeNull();
        });
    });

    describe('Route Protection', () => {
        test('should allow access to public routes without auth', async () => {
            const result = await authManager.checkAuthentication('home');
            
            expect(result.allowed).toBe(true);
            expect(result.reason).toBe('public_route');
        });

        test('should allow access to login route without auth', async () => {
            const result = await authManager.checkAuthentication('login');
            
            expect(result.allowed).toBe(true);
            expect(result.reason).toBe('login_route');
        });

        test('should deny access to protected routes without auth', async () => {
            const result = await authManager.checkAuthentication('admin');
            
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe('authentication_required');
        });

        test('should allow access to protected routes with auth', async () => {
            document.cookie = 'authToken=valid-token';
            
            const result = await authManager.checkAuthentication('admin');
            
            expect(result.allowed).toBe(true);
            expect(result.reason).toBe('authenticated');
        });

        test('should check protected prefixes', async () => {
            const result = await authManager.checkAuthentication('admin/users');
            
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe('authentication_required');
        });

        test('should allow unprotected routes without explicit listing', async () => {
            document.cookie = 'authToken=valid-token';
            
            const result = await authManager.checkAuthentication('about');
            
            expect(result.allowed).toBe(true);
            expect(result.reason).toBe('not_protected');
        });
    });

    describe('Custom Authentication Function', () => {
        test('should use custom auth function when provided', async () => {
            const customAuthFn = jest.fn().mockResolvedValue(true);
            authManager.config.checkAuthFunction = customAuthFn;
            
            const result = await authManager.checkAuthentication('admin');
            
            expect(customAuthFn).toHaveBeenCalledWith('admin');
            expect(result.allowed).toBe(true);
            expect(result.reason).toBe('custom_auth_passed');
        });

        test('should handle custom auth function rejection', async () => {
            const customAuthFn = jest.fn().mockResolvedValue(false);
            authManager.config.checkAuthFunction = customAuthFn;
            
            const result = await authManager.checkAuthentication('admin');
            
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe('custom_auth_failed');
        });

        test('should handle custom auth function errors', async () => {
            const customAuthFn = jest.fn().mockRejectedValue(new Error('Auth error'));
            authManager.config.checkAuthFunction = customAuthFn;
            
            const result = await authManager.checkAuthentication('admin');
            
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe('custom_auth_error');
            expect(mockRouter.log).toHaveBeenCalledWith(
                'error',
                'AuthManager',
                'Custom auth function error:',
                expect.any(Error)
            );
        });
    });

    describe('Authentication Validation Skip', () => {
        test('should skip validation when configured', async () => {
            authManager.config.authSkipValidation = true;
            
            const result = await authManager.checkAuthentication('admin');
            
            expect(result.allowed).toBe(true);
            expect(result.reason).toBe('validation_skipped');
        });
    });

    describe('Token Management', () => {
        test('should get current token', () => {
            document.cookie = 'authToken=current-token-123';
            
            const token = authManager.getToken();
            
            expect(token).toBe('current-token-123');
        });

        test('should return null when no token exists', () => {
            const token = authManager.getToken();
            
            expect(token).toBeNull();
        });

        test('should validate token format', () => {
            expect(authManager.isValidToken('valid.jwt.token')).toBe(true);
            expect(authManager.isValidToken('')).toBe(false);
            expect(authManager.isValidToken(null)).toBe(false);
        });
    });

    describe('Route Checking Utilities', () => {
        test('should identify protected routes', () => {
            expect(authManager.isProtectedRoute('admin')).toBe(true);
            expect(authManager.isProtectedRoute('profile')).toBe(true);
            expect(authManager.isProtectedRoute('home')).toBe(false);
        });

        test('should identify public routes', () => {
            expect(authManager.isPublicRoute('home')).toBe(true);
            expect(authManager.isPublicRoute('login')).toBe(true);
            expect(authManager.isPublicRoute('admin')).toBe(false);
        });

        test('should identify login route', () => {
            expect(authManager.isLoginRoute('login')).toBe(true);
            expect(authManager.isLoginRoute('home')).toBe(false);
        });

        test('should check protected prefixes', () => {
            expect(authManager.hasProtectedPrefix('admin/users')).toBe(true);
            expect(authManager.hasProtectedPrefix('user/profile')).toBe(true);
            expect(authManager.hasProtectedPrefix('public/page')).toBe(false);
        });
    });

    describe('Cookie Utilities', () => {
        test('should get cookie value', () => {
            document.cookie = 'authToken=test-value; otherCookie=other-value';
            
            const value = authManager.getCookie('authToken');
            
            expect(value).toBe('test-value');
        });

        test('should return null for missing cookie', () => {
            document.cookie = 'otherCookie=other-value';
            
            const value = authManager.getCookie('authToken');
            
            expect(value).toBeNull();
        });

        test('should set cookie with expiration', () => {
            authManager.setCookie('testCookie', 'testValue', { expires: 7 });
            
            expect(document.cookie).toContain('testCookie=testValue');
        });

        test('should delete cookie', () => {
            document.cookie = 'testCookie=testValue';
            
            authManager.deleteCookie('testCookie');
            
            expect(document.cookie).toContain('testCookie=; expires=');
        });
    });

    describe('Authentication Events', () => {
        test('should emit login event', () => {
            const mockEmit = jest.fn();
            authManager.emitAuthEvent = mockEmit;
            
            authManager.login('new-token');
            
            expect(mockEmit).toHaveBeenCalledWith('login', {
                token: 'new-token',
                timestamp: expect.any(Number)
            });
        });

        test('should emit logout event', () => {
            const mockEmit = jest.fn();
            authManager.emitAuthEvent = mockEmit;
            
            authManager.logout();
            
            expect(mockEmit).toHaveBeenCalledWith('logout', {
                timestamp: expect.any(Number)
            });
        });

        test('should emit auth required event', () => {
            const mockEmit = jest.fn();
            authManager.emitAuthEvent = mockEmit;
            
            authManager.emitAuthEvent('auth_required', {
                route: 'admin',
                reason: 'Not authenticated'
            });
            
            expect(mockEmit).toHaveBeenCalledWith('auth_required', {
                route: 'admin',
                reason: 'Not authenticated'
            });
        });
    });

    describe('Disabled Authentication', () => {
        beforeEach(() => {
            authManager = new AuthManager(mockRouter, {
                ...mockConfig,
                authEnabled: false
            });
        });

        test('should allow all routes when auth is disabled', async () => {
            const result = await authManager.checkAuthentication('admin');
            
            expect(result.allowed).toBe(true);
            expect(result.reason).toBe('auth_disabled');
        });

        test('should return null for token when auth is disabled', () => {
            document.cookie = 'authToken=some-token';
            
            const token = authManager.getToken();
            
            expect(token).toBeNull();
        });
    });
});