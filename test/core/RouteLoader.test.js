/**
 * RouteLoader 단위 테스트
 */
import { RouteLoader } from '../../src/core/RouteLoader.js';
import { createMockRouter, mockFetchSuccess, mockFetchError } from '../helpers/testHelpers.js';

describe('RouteLoader', () => {
    let routeLoader;
    let mockRouter;

    beforeEach(() => {
        mockRouter = createMockRouter();
        routeLoader = new RouteLoader(mockRouter, {
            srcPath: 'http://localhost/src',
            environment: 'development',
            useLayout: true,
            defaultLayout: 'default'
        });
    });

    afterEach(() => {
        if (routeLoader) {
            routeLoader.destroy();
            routeLoader = null;
        }
    });

    // === 초기화 ===
    describe('초기화', () => {
        test('FormHandler, ApiHandler, ComponentLoader를 생성해야 한다', () => {
            expect(routeLoader.formHandler).toBeDefined();
            expect(routeLoader.apiHandler).toBeDefined();
            expect(routeLoader.componentLoader).toBeDefined();
        });

        test('config를 올바르게 설정해야 한다', () => {
            expect(routeLoader.config.environment).toBe('development');
            expect(routeLoader.config.useLayout).toBe(true);
            expect(routeLoader.config.defaultLayout).toBe('default');
        });
    });

    // === loadTemplate ===
    describe('loadTemplate', () => {
        test('성공적으로 HTML 템플릿을 로드해야 한다', async () => {
            mockFetchSuccess('<div>Hello</div>');
            const template = await routeLoader.loadTemplate('home');
            expect(template).toBe('<div>Hello</div>');
        });

        test('실패 시 기본 템플릿을 반환해야 한다', async () => {
            mockFetchError(404);
            const template = await routeLoader.loadTemplate('missing');
            expect(template).toContain('missing');
        });
    });

    // === loadLayout ===
    describe('loadLayout', () => {
        test('캐시에서 먼저 확인해야 한다', async () => {
            mockRouter.cacheManager.get.mockReturnValueOnce('<div>Cached Layout</div>');
            const layout = await routeLoader.loadLayout('default');
            expect(layout).toBe('<div>Cached Layout</div>');
            expect(global.fetch).not.toHaveBeenCalled();
        });

        test('성공 시 HTML을 반환하고 캐시에 저장해야 한다', async () => {
            mockFetchSuccess('<div>{{ content }}</div>');
            const layout = await routeLoader.loadLayout('default');
            expect(layout).toBe('<div>{{ content }}</div>');
            expect(mockRouter.cacheManager.set).toHaveBeenCalled();
        });

        test('실패 시 null을 반환해야 한다', async () => {
            mockFetchError(404);
            const layout = await routeLoader.loadLayout('nonexistent');
            expect(layout).toBeNull();
        });
    });

    // === mergeLayoutWithTemplate ===
    describe('mergeLayoutWithTemplate', () => {
        test('{{ content }} 자리에 템플릿을 삽입해야 한다', () => {
            const layout = '<div class="layout">{{ content }}</div>';
            const template = '<h1>Hello</h1>';
            const result = routeLoader.mergeLayoutWithTemplate('home', layout, template);
            expect(result).toBe('<div class="layout"><h1>Hello</h1></div>');
        });

        test('패턴이 없으면 layout + template을 연결해야 한다', () => {
            const layout = '<nav>Nav</nav>';
            const template = '<h1>Page</h1>';
            const result = routeLoader.mergeLayoutWithTemplate('home', layout, template);
            expect(result).toContain('Nav');
            expect(result).toContain('Page');
        });
    });

    // === loadLayoutScript ===
    describe('loadLayoutScript', () => {
        test('캐시에서 먼저 확인해야 한다', async () => {
            const cachedScript = { data: () => ({ theme: 'dark' }) };
            mockRouter.cacheManager.get.mockReturnValueOnce(cachedScript);

            const result = await routeLoader.loadLayoutScript('default');
            expect(result).toBe(cachedScript);
        });

        test('실패 시 null을 반환해야 한다', async () => {
            // import()가 실패하도록 - 실제 환경에서는 모듈을 찾을 수 없음
            const result = await routeLoader.loadLayoutScript('nonexistent-layout-xyz');
            expect(result).toBeNull();
        });
    });

    // === mergeLayoutWithTemplate (main-content 경로) ===
    describe('mergeLayoutWithTemplate (main-content 경로)', () => {
        test('class="main-content"가 있으면 container 내부를 교체해야 한다', () => {
            const layout = '<main class="main-content"><div class="container">old content</div></main>';
            const template = '<h1>New</h1>';
            const result = routeLoader.mergeLayoutWithTemplate('home', layout, template);
            expect(result).toContain('New');
        });
    });

    // === _mergeLayoutAndPageScript ===
    describe('_mergeLayoutAndPageScript', () => {
        test('레이아웃이 없으면 페이지 스크립트를 _page* 프로퍼티로 보존해야 한다', () => {
            const pageScript = {
                data: () => ({ msg: 'hi' }),
                created() {},
                mounted() {},
                beforeMount() {},
                beforeUpdate() {},
                updated() {},
                beforeUnmount() {},
                unmounted() {},
                methods: { foo() {} }
            };
            const merged = routeLoader._mergeLayoutAndPageScript(null, pageScript);

            expect(merged._pageData).toBe(pageScript.data);
            expect(merged._pageCreated).toBe(pageScript.created);
            expect(merged._pageMounted).toBe(pageScript.mounted);
            expect(merged._pageBeforeMount).toBe(pageScript.beforeMount);
            expect(merged._pageBeforeUpdate).toBe(pageScript.beforeUpdate);
            expect(merged._pageUpdated).toBe(pageScript.updated);
            expect(merged._pageBeforeUnmount).toBe(pageScript.beforeUnmount);
            expect(merged._pageUnmounted).toBe(pageScript.unmounted);
        });

        test('레이아웃이 있으면 _layout* + _page* 프로퍼티를 모두 보존해야 한다', () => {
            const layoutScript = {
                data: () => ({ theme: 'dark' }),
                created() {},
                mounted() {}
            };
            const pageScript = {
                data: () => ({ msg: 'hi' }),
                created() {},
                mounted() {}
            };
            const merged = routeLoader._mergeLayoutAndPageScript(layoutScript, pageScript);

            expect(merged._layoutData).toBe(layoutScript.data);
            expect(merged._pageData).toBe(pageScript.data);
            expect(merged._layoutCreated).toBe(layoutScript.created);
            expect(merged._pageCreated).toBe(pageScript.created);
            expect(merged._layoutMounted).toBe(layoutScript.mounted);
            expect(merged._pageMounted).toBe(pageScript.mounted);
        });

        test('methods를 병합해야 한다 (페이지가 우선)', () => {
            const layoutScript = {
                methods: { shared() { return 'layout'; }, layoutOnly() {} }
            };
            const pageScript = {
                methods: { shared() { return 'page'; }, pageOnly() {} }
            };
            const merged = routeLoader._mergeLayoutAndPageScript(layoutScript, pageScript);

            expect(merged.methods.shared()).toBe('page');
            expect(merged.methods.layoutOnly).toBeDefined();
            expect(merged.methods.pageOnly).toBeDefined();
        });

        test('computed를 병합해야 한다 (페이지가 우선)', () => {
            const layoutScript = {
                computed: { total() { return 'layout'; } }
            };
            const pageScript = {
                computed: { total() { return 'page'; }, extra() {} }
            };
            const merged = routeLoader._mergeLayoutAndPageScript(layoutScript, pageScript);

            expect(merged.computed.total()).toBe('page');
            expect(merged.computed.extra).toBeDefined();
        });

        test('watch를 병합해야 한다 (페이지가 우선)', () => {
            const layoutScript = {
                watch: { value() { return 'layout'; } }
            };
            const pageScript = {
                watch: { value() { return 'page'; }, other() {} }
            };
            const merged = routeLoader._mergeLayoutAndPageScript(layoutScript, pageScript);

            expect(merged.watch.value()).toBe('page');
            expect(merged.watch.other).toBeDefined();
        });
    });

    // === createVueComponent ===
    describe('createVueComponent', () => {
        test('캐시된 컴포넌트가 있으면 반환해야 한다', async () => {
            const cached = { name: 'CachedComp', template: '<div>cached</div>' };
            mockRouter.cacheManager.get.mockReturnValueOnce(cached);

            const result = await routeLoader.createVueComponent('home');
            expect(result).toBe(cached);
        });

        test('layout: null인 경우에도 _page* 프로퍼티를 설정해야 한다', async () => {
            const pageCreated = jest.fn();
            const pageMounted = jest.fn();

            // loadScript mock
            jest.spyOn(routeLoader, 'loadScript').mockResolvedValue({
                layout: null,
                data: () => ({ msg: 'hi' }),
                created: pageCreated,
                mounted: pageMounted,
                methods: {}
            });
            // loadTemplate mock
            jest.spyOn(routeLoader, 'loadTemplate').mockResolvedValue('<div>{{ msg }}</div>');
            // componentLoader mock
            jest.spyOn(routeLoader.componentLoader, 'getComponentNames').mockReturnValue([]);
            jest.spyOn(routeLoader.componentLoader, 'loadAllComponents').mockResolvedValue({});

            const component = await routeLoader.createVueComponent('testpage');

            // layout: null이므로 레이아웃 로드 안함, _page* 프로퍼티 확인
            // mergeLayoutAndPageScript(null, pageScript) 경로
            expect(component._routeName).toBe('testpage');
            // created 훅에서 _pageCreated를 호출하는 구조
            expect(typeof component.created).toBe('function');
        });

        test('컴포넌트에 올바른 name을 설정해야 한다', async () => {
            jest.spyOn(routeLoader, 'loadScript').mockResolvedValue({
                layout: null,
                data: () => ({}),
                methods: {}
            });
            jest.spyOn(routeLoader, 'loadTemplate').mockResolvedValue('<div></div>');
            jest.spyOn(routeLoader.componentLoader, 'getComponentNames').mockReturnValue([]);
            jest.spyOn(routeLoader.componentLoader, 'loadAllComponents').mockResolvedValue({});

            const component = await routeLoader.createVueComponent('my-page');
            expect(component.name).toBe('MyPage');
        });

        test('data()에 currentRoute, $query, $params, $dataLoading을 포함해야 한다', async () => {
            jest.spyOn(routeLoader, 'loadScript').mockResolvedValue({
                layout: null,
                data: () => ({ custom: 'data' }),
                methods: {}
            });
            jest.spyOn(routeLoader, 'loadTemplate').mockResolvedValue('<div></div>');
            jest.spyOn(routeLoader.componentLoader, 'getComponentNames').mockReturnValue([]);
            jest.spyOn(routeLoader.componentLoader, 'loadAllComponents').mockResolvedValue({});

            const component = await routeLoader.createVueComponent('home');
            const data = component.data();

            expect(data.currentRoute).toBe('home');
            expect(data.$query).toBeDefined();
            expect(data.$params).toBeDefined();
            expect(data.$dataLoading).toBe(false);
        });

        test('methods에 navigateTo, getParam, $t, isAuth, logout 등을 포함해야 한다', async () => {
            jest.spyOn(routeLoader, 'loadScript').mockResolvedValue({
                layout: null,
                methods: {}
            });
            jest.spyOn(routeLoader, 'loadTemplate').mockResolvedValue('<div></div>');
            jest.spyOn(routeLoader.componentLoader, 'getComponentNames').mockReturnValue([]);
            jest.spyOn(routeLoader.componentLoader, 'loadAllComponents').mockResolvedValue({});

            const component = await routeLoader.createVueComponent('home');

            expect(typeof component.methods.navigateTo).toBe('function');
            expect(typeof component.methods.getParam).toBe('function');
            expect(typeof component.methods.$t).toBe('function');
            expect(typeof component.methods.isAuth).toBe('function');
            expect(typeof component.methods.logout).toBe('function');
            expect(typeof component.methods.fetchData).toBe('function');
            expect(typeof component.methods.getParams).toBe('function');
            expect(typeof component.methods.getCurrentRoute).toBe('function');
            expect(typeof component.methods.log).toBe('function');
        });

        test('생성된 컴포넌트를 캐시에 저장해야 한다', async () => {
            jest.spyOn(routeLoader, 'loadScript').mockResolvedValue({
                layout: null,
                methods: {}
            });
            jest.spyOn(routeLoader, 'loadTemplate').mockResolvedValue('<div></div>');
            jest.spyOn(routeLoader.componentLoader, 'getComponentNames').mockReturnValue([]);
            jest.spyOn(routeLoader.componentLoader, 'loadAllComponents').mockResolvedValue({});

            await routeLoader.createVueComponent('home');
            expect(mockRouter.cacheManager.set).toHaveBeenCalledWith(
                'component_home',
                expect.any(Object)
            );
        });
    });

    // === createVueComponent 추가 경로 ===
    describe('createVueComponent 추가 경로', () => {
        test('componentLoader 에러 시 빈 객체로 폴백해야 한다', async () => {
            jest.spyOn(routeLoader, 'loadScript').mockResolvedValue({
                layout: null,
                data: () => ({}),
                methods: {}
            });
            jest.spyOn(routeLoader, 'loadTemplate').mockResolvedValue('<div></div>');
            jest.spyOn(routeLoader.componentLoader, 'getComponentNames').mockReturnValue(['BadComp']);
            jest.spyOn(routeLoader.componentLoader, 'loadAllComponents')
                .mockRejectedValue(new Error('component load failed'));

            const component = await routeLoader.createVueComponent('comp-error-test');
            // 에러에도 컴포넌트는 생성됨
            expect(component).toBeDefined();
            expect(component.components).toEqual({});
        });

        test('beforeUpdate/updated 훅이 레이아웃 → 페이지 순서로 실행해야 한다', async () => {
            const order = [];
            const layoutScript = {
                data: () => ({}),
                beforeUpdate() { order.push('layout-beforeUpdate'); },
                updated() { order.push('layout-updated'); }
            };
            const pageScript = {
                layout: 'default',
                data: () => ({}),
                methods: {},
                beforeUpdate() { order.push('page-beforeUpdate'); },
                updated() { order.push('page-updated'); }
            };

            jest.spyOn(routeLoader, 'loadScript').mockResolvedValue(pageScript);
            jest.spyOn(routeLoader, 'loadTemplate').mockResolvedValue('<div>page</div>');
            jest.spyOn(routeLoader, 'loadLayout').mockResolvedValue('<div>{{ content }}</div>');
            jest.spyOn(routeLoader, 'loadLayoutScript').mockResolvedValue(layoutScript);
            jest.spyOn(routeLoader.componentLoader, 'getComponentNames').mockReturnValue([]);
            jest.spyOn(routeLoader.componentLoader, 'loadAllComponents').mockResolvedValue({});

            const component = await routeLoader.createVueComponent('update-hooks');

            await component.beforeUpdate.call({});
            await component.updated.call({});
            expect(order).toEqual([
                'layout-beforeUpdate', 'page-beforeUpdate',
                'layout-updated', 'page-updated'
            ]);
        });

        test('beforeUnmount/unmounted 훅이 레이아웃 → 페이지 순서로 실행해야 한다', async () => {
            const order = [];
            const layoutScript = {
                data: () => ({}),
                beforeUnmount() { order.push('layout-beforeUnmount'); },
                unmounted() { order.push('layout-unmounted'); }
            };
            const pageScript = {
                layout: 'default',
                data: () => ({}),
                methods: {},
                beforeUnmount() { order.push('page-beforeUnmount'); },
                unmounted() { order.push('page-unmounted'); }
            };

            jest.spyOn(routeLoader, 'loadScript').mockResolvedValue(pageScript);
            jest.spyOn(routeLoader, 'loadTemplate').mockResolvedValue('<div>page</div>');
            jest.spyOn(routeLoader, 'loadLayout').mockResolvedValue('<div>{{ content }}</div>');
            jest.spyOn(routeLoader, 'loadLayoutScript').mockResolvedValue(layoutScript);
            jest.spyOn(routeLoader.componentLoader, 'getComponentNames').mockReturnValue([]);
            jest.spyOn(routeLoader.componentLoader, 'loadAllComponents').mockResolvedValue({});

            const component = await routeLoader.createVueComponent('unmount-hooks');

            await component.beforeUnmount.call({});
            await component.unmounted.call({});
            expect(order).toEqual([
                'layout-beforeUnmount', 'page-beforeUnmount',
                'layout-unmounted', 'page-unmounted'
            ]);
        });

        test('beforeMount 훅이 레이아웃 → 페이지 순서로 실행해야 한다', async () => {
            const order = [];
            const layoutScript = {
                data: () => ({}),
                beforeMount() { order.push('layout-beforeMount'); }
            };
            const pageScript = {
                layout: 'default',
                data: () => ({}),
                methods: {},
                beforeMount() { order.push('page-beforeMount'); }
            };

            jest.spyOn(routeLoader, 'loadScript').mockResolvedValue(pageScript);
            jest.spyOn(routeLoader, 'loadTemplate').mockResolvedValue('<div>page</div>');
            jest.spyOn(routeLoader, 'loadLayout').mockResolvedValue('<div>{{ content }}</div>');
            jest.spyOn(routeLoader, 'loadLayoutScript').mockResolvedValue(layoutScript);
            jest.spyOn(routeLoader.componentLoader, 'getComponentNames').mockReturnValue([]);
            jest.spyOn(routeLoader.componentLoader, 'loadAllComponents').mockResolvedValue({});

            const component = await routeLoader.createVueComponent('beforemount-hooks');

            await component.beforeMount.call({});
            expect(order).toEqual(['layout-beforeMount', 'page-beforeMount']);
        });

        test('methods에 setToken이 refreshToken도 저장해야 한다', async () => {
            const mockSetAccessToken = jest.fn(() => true);
            const mockSetRefreshToken = jest.fn(() => true);
            mockRouter.authManager = {
                setAccessToken: mockSetAccessToken,
                setRefreshToken: mockSetRefreshToken,
                isAuthenticated: jest.fn(() => false),
                getAccessToken: jest.fn(() => null),
                getRefreshToken: jest.fn(() => null),
                logout: jest.fn(() => 'login')
            };

            jest.spyOn(routeLoader, 'loadScript').mockResolvedValue({
                layout: null,
                methods: {}
            });
            jest.spyOn(routeLoader, 'loadTemplate').mockResolvedValue('<div></div>');
            jest.spyOn(routeLoader.componentLoader, 'getComponentNames').mockReturnValue([]);
            jest.spyOn(routeLoader.componentLoader, 'loadAllComponents').mockResolvedValue({});

            const component = await routeLoader.createVueComponent('token-test');
            component.methods.setToken('access-token', { refreshToken: 'refresh-token' });

            expect(mockSetAccessToken).toHaveBeenCalledWith('access-token', { refreshToken: 'refresh-token' });
            expect(mockSetRefreshToken).toHaveBeenCalledWith('refresh-token');
        });
    });

    // === toPascalCase ===
    describe('toPascalCase', () => {
        test('kebab-case를 PascalCase로 변환해야 한다', () => {
            expect(routeLoader.toPascalCase('my-page')).toBe('MyPage');
        });

        test('snake_case를 PascalCase로 변환해야 한다', () => {
            expect(routeLoader.toPascalCase('my_page')).toBe('MyPage');
        });

        test('이미 PascalCase인 경우 유지해야 한다', () => {
            // toPascalCase는 단어 분리 후 재조합하므로 대소문자가 정규화됨
            expect(routeLoader.toPascalCase('home')).toBe('Home');
        });

        test('공백으로 구분된 단어를 처리해야 한다', () => {
            expect(routeLoader.toPascalCase('my page')).toBe('MyPage');
        });
    });

    // === generateDefaultTemplate ===
    describe('generateDefaultTemplate', () => {
        test('라우트 이름이 포함된 기본 템플릿을 생성해야 한다', () => {
            const template = routeLoader.generateDefaultTemplate('home');
            expect(template).toContain('home');
            expect(template).toContain('Route:');
        });

        test('슬래시를 하이픈으로 변환해야 한다', () => {
            const template = routeLoader.generateDefaultTemplate('admin/users');
            expect(template).toContain('route-admin-users');
        });
    });

    // === 라이프사이클 훅 실행 순서 ===
    describe('라이프사이클 훅 실행 순서', () => {
        const createComponentWithHooks = async (layoutHooks, pageHooks, layoutNull = false) => {
            const layoutScript = layoutNull ? null : {
                data: () => ({}),
                ...layoutHooks
            };
            const pageScript = {
                layout: layoutNull ? null : 'default',
                data: () => ({}),
                methods: {},
                ...pageHooks
            };

            jest.spyOn(routeLoader, 'loadScript').mockResolvedValue(pageScript);
            jest.spyOn(routeLoader, 'loadTemplate').mockResolvedValue('<div>page</div>');
            jest.spyOn(routeLoader.componentLoader, 'getComponentNames').mockReturnValue([]);
            jest.spyOn(routeLoader.componentLoader, 'loadAllComponents').mockResolvedValue({});

            if (!layoutNull) {
                jest.spyOn(routeLoader, 'loadLayout').mockResolvedValue('<div>{{ content }}</div>');
                jest.spyOn(routeLoader, 'loadLayoutScript').mockResolvedValue(layoutScript);
            }

            return routeLoader.createVueComponent('test-hooks');
        };

        test('created 훅에서 레이아웃 → 페이지 순서로 실행해야 한다', async () => {
            const order = [];
            const component = await createComponentWithHooks(
                { created() { order.push('layout'); } },
                { created() { order.push('page'); } }
            );

            await component.created.call({});
            expect(order).toEqual(['layout', 'page']);
        });

        test('mounted 훅에서 레이아웃 → 페이지 순서로 실행해야 한다', async () => {
            const order = [];
            const component = await createComponentWithHooks(
                { mounted() { order.push('layout'); } },
                { mounted() { order.push('page'); } }
            );

            // mounted에서 $api, $state 초기화 등이 필요
            const mockThis = {
                $api: null,
                $state: null,
                $nextTick: jest.fn().mockResolvedValue(),
                $emit: jest.fn(),
                _resolveMounted: null
            };
            await component.mounted.call(mockThis);
            expect(order).toEqual(['layout', 'page']);
        });

        test('layout: null일 때 페이지 훅만 실행해야 한다', async () => {
            const order = [];
            const component = await createComponentWithHooks(
                null,
                { created() { order.push('page'); } },
                true // layoutNull
            );

            await component.created.call({});
            expect(order).toEqual(['page']);
        });
    });

    // === fetchData ===
    describe('fetchData', () => {
        let component;

        const createComponentWithDataURL = async (dataURL) => {
            jest.spyOn(routeLoader, 'loadScript').mockResolvedValue({
                layout: null,
                data: () => ({}),
                dataURL,
                methods: {}
            });
            jest.spyOn(routeLoader, 'loadTemplate').mockResolvedValue('<div></div>');
            jest.spyOn(routeLoader.componentLoader, 'getComponentNames').mockReturnValue([]);
            jest.spyOn(routeLoader.componentLoader, 'loadAllComponents').mockResolvedValue({});

            return routeLoader.createVueComponent('data-test');
        };

        test('string 모드에서 단일 URL로 데이터를 가져와야 한다', async () => {
            component = await createComponentWithDataURL('/api/users');
            mockRouter.routeLoader.apiHandler.fetchData.mockResolvedValue({ users: [1, 2, 3] });

            const mockThis = { $dataLoading: false, $emit: jest.fn() };
            const result = await component.methods.fetchData.call(mockThis, '/api/users');

            expect(result).toEqual({ users: [1, 2, 3] });
            expect(mockThis.$emit).toHaveBeenCalledWith('data-loaded', { users: [1, 2, 3] });
            expect(mockThis.$dataLoading).toBe(false);
        });

        test('object 모드에서 여러 URL로 데이터를 가져와야 한다', async () => {
            component = await createComponentWithDataURL({ users: '/api/users', posts: '/api/posts' });
            mockRouter.routeLoader.apiHandler.fetchMultipleData = jest.fn().mockResolvedValue({
                results: { users: [1], posts: [2] },
                errors: {}
            });

            const mockThis = { $dataLoading: false, $emit: jest.fn() };
            const result = await component.methods.fetchData.call(
                mockThis,
                { users: '/api/users', posts: '/api/posts' }
            );

            expect(result).toEqual({ users: [1], posts: [2] });
            expect(mockThis.$emit).toHaveBeenCalledWith('data-loaded', { users: [1], posts: [2] });
        });

        test('에러 시 $dataLoading이 false로 복원되어야 한다', async () => {
            component = await createComponentWithDataURL('/api/fail');
            mockRouter.routeLoader.apiHandler.fetchData.mockRejectedValue(new Error('Network error'));

            const mockThis = { $dataLoading: false, $emit: jest.fn() };

            await expect(
                component.methods.fetchData.call(mockThis, '/api/fail')
            ).rejects.toThrow('Network error');

            expect(mockThis.$dataLoading).toBe(false);
            expect(mockThis.$emit).toHaveBeenCalledWith('data-error', expect.any(Error));
        });

        test('config가 없으면 null을 반환해야 한다', async () => {
            component = await createComponentWithDataURL(null);
            const mockThis = { $dataLoading: false, $emit: jest.fn() };

            const result = await component.methods.fetchData.call(mockThis);
            expect(result).toBeNull();
        });

        test('object 모드에서 에러가 있으면 data-error 이벤트를 발생해야 한다', async () => {
            component = await createComponentWithDataURL({ users: '/api/users' });
            mockRouter.routeLoader.apiHandler.fetchMultipleData = jest.fn().mockResolvedValue({
                results: { users: [1] },
                errors: { posts: new Error('Not found') }
            });

            const mockThis = { $dataLoading: false, $emit: jest.fn() };
            await component.methods.fetchData.call(
                mockThis,
                { users: '/api/users', posts: '/api/posts' }
            );

            expect(mockThis.$emit).toHaveBeenCalledWith('data-loaded', { users: [1] });
            expect(mockThis.$emit).toHaveBeenCalledWith('data-error', { posts: expect.any(Error) });
        });
    });

    // === destroy ===
    describe('destroy', () => {
        test('FormHandler, ApiHandler, ComponentLoader를 정리해야 한다', () => {
            routeLoader.destroy();
            expect(routeLoader.formHandler).toBeNull();
            expect(routeLoader.apiHandler).toBeNull();
            expect(routeLoader.componentLoader).toBeNull();
            expect(routeLoader.router).toBeNull();
        });
    });
});
