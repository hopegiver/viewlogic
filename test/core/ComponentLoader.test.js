/**
 * ComponentLoader 단위 테스트
 */
import { ComponentLoader } from '../../src/core/ComponentLoader.js';
import { createMockRouter } from '../helpers/testHelpers.js';

describe('ComponentLoader', () => {
    let componentLoader;
    let mockRouter;

    beforeEach(() => {
        mockRouter = createMockRouter();
        componentLoader = new ComponentLoader(mockRouter, {
            componentsPath: '/components',
            environment: 'development'
        });
    });

    afterEach(() => {
        if (componentLoader) {
            componentLoader.dispose();
            componentLoader = null;
        }
    });

    // === 초기화 ===
    describe('초기화', () => {
        test('기본 설정으로 초기화해야 한다', () => {
            const cl = new ComponentLoader(mockRouter);
            expect(cl.config.componentsPath).toBe('/components');
            expect(cl.config.environment).toBe('development');
            cl.dispose();
        });

        test('커스텀 componentsPath를 적용해야 한다', () => {
            expect(componentLoader.config.componentsPath).toBe('/components');
        });

        test('빈 loadingPromises Map으로 시작해야 한다', () => {
            expect(componentLoader.loadingPromises).toBeInstanceOf(Map);
            expect(componentLoader.loadingPromises.size).toBe(0);
        });

        test('unifiedComponents가 null이어야 한다', () => {
            expect(componentLoader.unifiedComponents).toBeNull();
        });
    });

    // === loadComponent ===
    describe('loadComponent', () => {
        test('캐시에 있는 컴포넌트를 반환해야 한다', async () => {
            const cachedComponent = { name: 'Button', template: '<button></button>' };
            mockRouter.cacheManager.get.mockReturnValueOnce(cachedComponent);

            const result = await componentLoader.loadComponent('Button');
            expect(result).toBe(cachedComponent);
        });

        test('동시 로드 요청 시 내부 로드를 한 번만 실행해야 한다', async () => {
            // import()가 Jest 워커를 크래시시키므로 _loadComponentFromFile을 mock
            jest.spyOn(componentLoader, '_loadComponentFromFile')
                .mockReturnValue(new Promise(() => {})); // pending 상태 유지

            componentLoader.loadComponent('TestComp');
            componentLoader.loadComponent('TestComp');

            // 동시 요청 시 _loadComponentFromFile은 한 번만 호출되어야 한다
            expect(componentLoader._loadComponentFromFile).toHaveBeenCalledTimes(1);
        });

        test('빈 이름에 에러를 throw해야 한다', async () => {
            await expect(componentLoader.loadComponent('')).rejects.toThrow('Component name must be a non-empty string');
        });

        test('null 이름에 에러를 throw해야 한다', async () => {
            await expect(componentLoader.loadComponent(null)).rejects.toThrow('Component name must be a non-empty string');
        });
    });

    // === getComponentNames ===
    describe('getComponentNames', () => {
        test('PascalCase 태그를 추출해야 한다', () => {
            const template = '<div><MyButton>Click</MyButton><MyModal/></div>';
            const names = componentLoader.getComponentNames(template);
            expect(names).toContain('MyButton');
            expect(names).toContain('MyModal');
        });

        test('자체 닫힘 태그를 인식해야 한다', () => {
            const template = '<MyIcon/>';
            const names = componentLoader.getComponentNames(template);
            expect(names).toContain('MyIcon');
        });

        test('중복을 제거해야 한다', () => {
            const template = '<MyButton>A</MyButton><MyButton>B</MyButton>';
            const names = componentLoader.getComponentNames(template);
            const buttonCount = names.filter(n => n === 'MyButton').length;
            expect(buttonCount).toBe(1);
        });

        test('레이아웃과 템플릿에서 모두 추출해야 한다', () => {
            const template = '<PageComp/>';
            const layout = '<LayoutNav/><div>{{ content }}</div>';
            const names = componentLoader.getComponentNames(template, layout, 'default');
            expect(names).toContain('PageComp');
            expect(names).toContain('LayoutNav');
        });

        test('빈 템플릿에서 빈 배열을 반환해야 한다', () => {
            const names = componentLoader.getComponentNames('');
            expect(names).toEqual([]);
        });

        test('null 템플릿에서 빈 배열을 반환해야 한다', () => {
            const names = componentLoader.getComponentNames(null);
            expect(names).toEqual([]);
        });

        test('HTML 기본 태그는 추출하지 않아야 한다', () => {
            // HTML 태그는 소문자이므로 PascalCase 패턴에 매칭되지 않음
            const template = '<div><span>text</span></div>';
            const names = componentLoader.getComponentNames(template);
            expect(names).toEqual([]);
        });

        test('속성이 있는 컴포넌트 태그를 인식해야 한다', () => {
            const template = '<MyButton class="primary" @click="handleClick">Click</MyButton>';
            const names = componentLoader.getComponentNames(template);
            expect(names).toContain('MyButton');
        });
    });

    // === _isHtmlTag ===
    describe('_isHtmlTag', () => {
        test('HTML 기본 태그에 true를 반환해야 한다', () => {
            expect(componentLoader._isHtmlTag('div')).toBe(true);
            expect(componentLoader._isHtmlTag('span')).toBe(true);
            expect(componentLoader._isHtmlTag('template')).toBe(true);
            expect(componentLoader._isHtmlTag('slot')).toBe(true);
        });

        test('Vue 컴포넌트 이름에 false를 반환해야 한다', () => {
            expect(componentLoader._isHtmlTag('MyComponent')).toBe(false);
            expect(componentLoader._isHtmlTag('Button')).toBe(false);
        });
    });

    // === loadAllComponents ===
    describe('loadAllComponents', () => {
        test('빈 이름 목록에 빈 객체를 반환해야 한다', async () => {
            const result = await componentLoader.loadAllComponents([]);
            expect(result).toEqual({});
        });

        test('null 이름 목록에 빈 객체를 반환해야 한다', async () => {
            const result = await componentLoader.loadAllComponents(null);
            expect(result).toEqual({});
        });
    });

    // === _getLayoutComponents ===
    describe('_getLayoutComponents', () => {
        test('레이아웃에서 컴포넌트를 추출해야 한다', () => {
            const layout = '<nav><NavBar/></nav><div>{{ content }}</div>';
            const result = componentLoader._getLayoutComponents(layout, 'default');
            expect(result).toBeInstanceOf(Set);
            expect(result.has('NavBar')).toBe(true);
        });

        test('캐시된 레이아웃 컴포넌트를 반환해야 한다', () => {
            const cached = new Set(['CachedNav']);
            mockRouter.cacheManager.get.mockReturnValueOnce(cached);

            const result = componentLoader._getLayoutComponents('<div></div>', 'default');
            expect(result).toBe(cached);
        });

        test('null 레이아웃에 빈 Set을 반환해야 한다', () => {
            const result = componentLoader._getLayoutComponents(null, 'default');
            expect(result.size).toBe(0);
        });
    });

    // === clearComponents ===
    describe('clearComponents', () => {
        test('loadingPromises와 unifiedComponents를 초기화해야 한다', () => {
            componentLoader.unifiedComponents = { Button: {} };
            componentLoader.clearComponents();
            expect(componentLoader.loadingPromises.size).toBe(0);
            expect(componentLoader.unifiedComponents).toBeNull();
        });
    });

    // === dispose ===
    describe('dispose', () => {
        test('clearComponents를 호출하고 router 참조를 null로 설정해야 한다', () => {
            componentLoader.dispose();
            expect(componentLoader.router).toBeNull();
            expect(componentLoader.unifiedComponents).toBeNull();
        });
    });
});
