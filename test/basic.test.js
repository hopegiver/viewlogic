/**
 * ViewLogic Router 기본 단위 테스트
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

    // === 인스턴스 생성 ===
    describe('Router Instantiation', () => {
        test('기본 설정으로 라우터 인스턴스를 생성해야 한다', () => {
            router = new ViewLogicRouter();

            expect(router).toBeDefined();
            expect(router.config).toBeDefined();
            expect(router.version).toBeDefined();
        });

        test('커스텀 설정으로 라우터 인스턴스를 생성해야 한다', () => {
            router = new ViewLogicRouter({
                basePath: '/test',
                mode: 'hash'
            });

            expect(router.config.basePath).toBe('/test');
            expect(router.config.mode).toBe('hash');
        });

        test('필수 핵심 컴포넌트를 초기화해야 한다', () => {
            router = new ViewLogicRouter();

            expect(router.routeLoader).toBeDefined();
            expect(router.errorHandler).toBeDefined();
            expect(router.queryManager).toBeDefined();
            expect(router.cacheManager).toBeDefined();
        });
    });

    // === 설정 ===
    describe('Configuration', () => {
        test('커스텀 옵션이 기본값에 병합되어야 한다', () => {
            router = new ViewLogicRouter({
                cacheTTL: 600000,
                useI18n: true,
                authEnabled: true
            });

            expect(router.config.cacheTTL).toBe(600000);
            expect(router.config.useI18n).toBe(true);
            expect(router.config.authEnabled).toBe(true);
        });

        test('기본 설정값이 올바르게 적용되어야 한다', () => {
            router = new ViewLogicRouter();

            expect(router.config.mode).toBe('hash');
            expect(router.config.basePath).toBe('/');
            expect(router.config.cacheTTL).toBe(300000);
        });
    });

    // === 기본 기능 ===
    describe('Basic Functionality', () => {
        beforeEach(() => {
            router = new ViewLogicRouter();
        });

        test('라우팅 메서드가 존재해야 한다', () => {
            expect(typeof router.navigateTo).toBe('function');
            expect(typeof router.destroy).toBe('function');
        });

        test('네비게이션 후 URL이 업데이트되어야 한다', () => {
            router.navigateTo('about');
            expect(window.location.hash).toContain('about');
        });

        test('빈 라우트 네비게이션은 defaultRoute로 이동해야 한다', () => {
            router.navigateTo('');
            // 빈 문자열은 defaultRoute('home')로 처리됨
            expect(window.location.hash).toBe('#/');
        });
    });

    // === 컴포넌트 통합 ===
    describe('Component Integration', () => {
        test('authEnabled가 true이면 authManager를 초기화해야 한다', () => {
            router = new ViewLogicRouter({ authEnabled: true });

            expect(router.authManager).toBeDefined();
        });

        test('auth 별칭으로 authManager를 초기화해야 한다', () => {
            router = new ViewLogicRouter({ auth: true });

            expect(router.authManager).toBeDefined();
            expect(router.config.authEnabled).toBe(true);
        });

        test('authFunction을 설정으로 전달해야 한다', () => {
            const fn = jest.fn(() => true);
            router = new ViewLogicRouter({ auth: true, authFunction: fn });

            expect(router.config.authFunction).toBe(fn);
        });

        test('checkAuthFunction 별칭을 지원해야 한다', () => {
            const fn = jest.fn(() => true);
            router = new ViewLogicRouter({ authEnabled: true, checkAuthFunction: fn });

            expect(router.config.authFunction).toBe(fn);
        });

        test('useI18n이 true이면 i18nManager를 초기화해야 한다', () => {
            router = new ViewLogicRouter({ useI18n: true });

            expect(router.i18nManager).toBeDefined();
        });

        test('비활성화된 선택적 컴포넌트는 초기화하지 않아야 한다', () => {
            router = new ViewLogicRouter({
                authEnabled: false,
                useI18n: false
            });

            expect(router.authManager).toBeUndefined();
            expect(router.i18nManager).toBeUndefined();
        });
    });

    // === errorHandlers 설정 ===
    describe('errorHandlers Configuration', () => {
        test('errorHandlers 설정을 수용해야 한다', () => {
            const handler403 = jest.fn();
            router = new ViewLogicRouter({
                errorHandlers: {
                    403: handler403,
                    '5xx': () => {}
                }
            });

            expect(router.config.errorHandlers).toBeDefined();
            expect(router.config.errorHandlers[403]).toBe(handler403);
            expect(typeof router.config.errorHandlers['5xx']).toBe('function');
        });

        test('errorHandlers 기본값이 null이어야 한다', () => {
            router = new ViewLogicRouter();
            expect(router.config.errorHandlers).toBeNull();
        });

        test('errorHandlers를 ApiHandler에 전달해야 한다', async () => {
            const handler500 = jest.fn();
            router = new ViewLogicRouter({
                errorHandlers: { 500: handler500 }
            });

            await router.waitForReady();
            expect(router.routeLoader.apiHandler.errorHandlers).toBeDefined();
            expect(router.routeLoader.apiHandler.errorHandlers[500]).toBe(handler500);
        });
    });

    // === destroy ===
    describe('destroy', () => {
        test('destroy 후 이벤트 리스너가 제거되어야 한다', () => {
            router = new ViewLogicRouter();
            const spy = jest.spyOn(window, 'removeEventListener');
            router.destroy();
            expect(spy).toHaveBeenCalledWith('hashchange', expect.any(Function));
            spy.mockRestore();
        });

        test('다중 destroy 호출이 에러 없이 처리되어야 한다', () => {
            router = new ViewLogicRouter();
            router.destroy();
            expect(() => {
                router.destroy();
            }).not.toThrow();
            router = null; // afterEach에서 중복 destroy 방지
        });
    });
});
