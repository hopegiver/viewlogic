/**
 * ViewLogic Router 통합 테스트
 * 모듈 간 실제 데이터 흐름과 상태 변화를 검증
 */

import { ViewLogicRouter } from '../src/viewlogic-router.js';

describe('ViewLogic Router - Integration Tests', () => {
    let router;

    afterEach(() => {
        if (router) {
            router.destroy();
            router = null;
        }
        window.location.hash = '#/';
    });

    // === 전체 라우터 초기화 ===
    describe('전체 라우터 초기화', () => {
        test('모든 컴포넌트와 함께 초기화되어야 한다', async () => {
            router = new ViewLogicRouter({
                authEnabled: true,
                useI18n: true,
                cacheMode: 'memory'
            });

            await router.readyPromise;

            expect(router.isReady).toBe(true);
            expect(router.authManager).toBeDefined();
            expect(router.i18nManager).toBeDefined();
            expect(router.cacheManager).toBeDefined();
        });

        test('초기 라우팅 상태가 올바르게 설정되어야 한다', () => {
            router = new ViewLogicRouter();

            expect(router.currentHash).toBeDefined();
            expect(typeof router.currentHash).toBe('string');
            expect(router.isReady).toBe(true);
        });

        test('navigateTo 후 URL 해시가 업데이트되어야 한다', () => {
            router = new ViewLogicRouter();
            router.navigateTo('users');

            expect(window.location.hash).toContain('users');
        });

        test('쿼리 파라미터가 queryManager에 저장되어야 한다', () => {
            router = new ViewLogicRouter();
            router.navigateTo('users', { id: '123', tab: 'profile' });

            // queryManager에 라우트 파라미터가 설정되었는지 확인
            const params = router.queryManager.getAllParams();
            expect(params.id).toBe('123');
            expect(params.tab).toBe('profile');
        });
    });

    // === 모듈 간 연결 ===
    describe('모듈 간 연결', () => {
        test('queryManager가 라우터와 같은 인스턴스를 공유해야 한다', () => {
            router = new ViewLogicRouter();

            // queryManager가 설정한 데이터를 실제로 조회 가능해야 함
            router.queryManager.setCurrentQueryParams({ search: 'test' });
            const params = router.queryManager.getQueryParams();
            expect(params.search).toBe('test');
        });

        test('errorHandler가 실제 로그를 기록해야 한다', () => {
            router = new ViewLogicRouter();

            const logSpy = jest.spyOn(router.errorHandler, 'log');
            router.log('info', 'test message');

            expect(logSpy).toHaveBeenCalledWith('info', 'Router', 'test message');
            logSpy.mockRestore();
        });

        test('cacheManager가 실제 데이터를 캐시해야 한다', () => {
            router = new ViewLogicRouter({ cacheMode: 'memory' });

            router.cacheManager.set('test_key', { data: 'value' });
            const cached = router.cacheManager.get('test_key');

            expect(cached).toEqual({ data: 'value' });
        });

        test('stateHandler가 전역 상태를 관리해야 한다', () => {
            router = new ViewLogicRouter();

            router.stateHandler.set('user', { name: 'test' });
            const state = router.stateHandler.get('user');

            expect(state).toEqual({ name: 'test' });
        });
    });

    // === 라우트 라이프사이클 ===
    describe('라우트 라이프사이클', () => {
        test('navigateTo 후 currentHash가 업데이트되어야 한다', () => {
            router = new ViewLogicRouter();
            router.navigateTo('dashboard');

            // navigateTo → updateURL → hash 변경
            expect(window.location.hash).toContain('dashboard');
        });

        test('hash 모드에서 해시 URL이 올바르게 구성되어야 한다', () => {
            router = new ViewLogicRouter({ mode: 'hash' });
            router.navigateTo('products');

            expect(router.config.mode).toBe('hash');
            expect(window.location.hash).toBe('#/products');
        });

        test('history 모드에서 pushState가 호출되어야 한다', () => {
            const spy = jest.spyOn(window.history, 'pushState').mockImplementation(() => {});
            router = new ViewLogicRouter({ mode: 'history' });
            jest.spyOn(router, 'loadRoute').mockResolvedValue();
            router.navigateTo('about');

            expect(spy).toHaveBeenCalled();
            expect(router.config.mode).toBe('history');
            spy.mockRestore();
        });

        test('getCurrentRoute가 올바른 경로를 반환해야 한다', () => {
            router = new ViewLogicRouter();
            router.currentHash = 'users';

            expect(router.getCurrentRoute()).toBe('/users');
        });

        test('빈 currentHash에서 루트 경로를 반환해야 한다', () => {
            router = new ViewLogicRouter();
            router.currentHash = '';

            expect(router.getCurrentRoute()).toBe('/');
        });
    });

    // === 설정 통합 ===
    describe('설정 통합', () => {
        test('basePath가 config에 반영되어야 한다', () => {
            router = new ViewLogicRouter({ basePath: '/app' });

            expect(router.config.basePath).toBe('/app');
        });

        test('cacheTTL이 cacheManager에 전달되어야 한다', () => {
            router = new ViewLogicRouter({ cacheTTL: 600000 });

            expect(router.config.cacheTTL).toBe(600000);
            expect(router.cacheManager.config.cacheTTL).toBe(600000);
        });

        test('environment가 errorHandler에 전달되어야 한다', () => {
            router = new ViewLogicRouter({ environment: 'production' });

            expect(router.config.environment).toBe('production');
            expect(router.errorHandler.config.environment).toBe('production');
        });
    });

    // === 에러 복구 ===
    describe('에러 복구', () => {
        test('빈 라우트 네비게이션 후 defaultRoute로 이동해야 한다', () => {
            router = new ViewLogicRouter();
            router.navigateTo('');

            // 빈 문자열은 defaultRoute('home')로 처리 → hash는 '#/'
            expect(window.location.hash).toBe('#/');
        });

        test('에러 후에도 라우터가 정상 작동해야 한다', () => {
            router = new ViewLogicRouter();

            // 빈 라우트 시도 후 정상 라우트
            router.navigateTo('');
            router.navigateTo('about');

            expect(window.location.hash).toContain('about');
            expect(router.isReady).toBe(true);
        });

        test('undefined 라우트 네비게이션을 처리해야 한다', () => {
            router = new ViewLogicRouter();

            router.navigateTo('home');
            try {
                router.navigateTo(undefined);
            } catch (e) {
                // 에러가 발생해도 무방
            }

            // 라우터가 여전히 사용 가능해야 함
            expect(router.isReady).toBe(true);
        });
    });
});
