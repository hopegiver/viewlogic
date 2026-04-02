/**
 * ViewLogic Router E2E 테스트
 * examples 앱을 사용하여 실제 브라우저 환경에서 라우팅 검증
 */
import { test, expect } from '@playwright/test';

// examples 앱 기본 URL
const BASE = '/examples/';

// Vue 렌더링 + 라우터 초기화 대기 헬퍼
async function waitForApp(page) {
    // #app 내부에 자식 요소가 생길 때까지 대기 (Vue 마운트 완료 시그널)
    await page.waitForFunction(() => {
        const app = document.getElementById('app');
        return app && app.children.length > 0;
    }, { timeout: 15000 });
}

test.describe('기본 라우팅', () => {
    test('홈 페이지가 렌더링되어야 한다', async ({ page }) => {
        await page.goto(BASE);
        await waitForApp(page);

        // #app에 렌더된 콘텐츠가 있어야 함
        const childCount = await page.locator('#app > *').count();
        expect(childCount).toBeGreaterThan(0);
    });

    test('해시 기반 네비게이션이 작동해야 한다', async ({ page }) => {
        await page.goto(BASE + '#/about');
        await waitForApp(page);

        // URL 해시 확인
        const url = page.url();
        expect(url).toContain('#/about');
    });

    test('존재하지 않는 라우트에서도 앱이 크래시하지 않아야 한다', async ({ page }) => {
        const jsErrors = [];
        page.on('pageerror', err => jsErrors.push(err.message));

        await page.goto(BASE + '#/nonexistent-route-xyz');
        // 에러 페이지 렌더 또는 빈 상태여도 앱 자체는 살아있어야 함
        await page.waitForTimeout(3000);

        // 페이지에 치명적 자바스크립트 에러가 없는지 확인
        expect(jsErrors.length).toBe(0);
    });
});

test.describe('레이아웃 시스템', () => {
    test('레이아웃이 페이지와 함께 렌더링되어야 한다', async ({ page }) => {
        await page.goto(BASE);
        await waitForApp(page);

        // #app 안에 충분한 콘텐츠가 있어야 함 (레이아웃 + 페이지)
        const appContent = await page.locator('#app').innerHTML();
        expect(appContent.length).toBeGreaterThan(100);
    });

    test('라우트 전환 시 페이지 콘텐츠가 변경되어야 한다', async ({ page }) => {
        await page.goto(BASE);
        await waitForApp(page);
        const homeContent = await page.locator('#app').innerHTML();

        // about으로 이동
        await page.evaluate(() => {
            window.location.hash = '#/about';
        });
        await page.waitForTimeout(2000);

        const aboutContent = await page.locator('#app').innerHTML();
        // 콘텐츠가 달라야 함
        expect(homeContent).not.toBe(aboutContent);
    });
});

test.describe('Vue 컴포넌트 렌더링', () => {
    test('Vue 앱이 마운트되고 데이터 바인딩이 작동해야 한다', async ({ page }) => {
        await page.goto(BASE);
        await waitForApp(page);

        // Vue 마운트 후 data-v-app 속성이 있어야 함
        const vueApp = await page.locator('[data-v-app]').count();
        expect(vueApp).toBeGreaterThan(0);

        // 메인 콘텐츠에 Vue 데이터 바인딩이 작동해야 함 (레이아웃 Year 값이 렌더링됨)
        const mainContent = await page.locator('.main-content').innerHTML();
        expect(mainContent.length).toBeGreaterThan(0);
        expect(mainContent).toContain('2026'); // 레이아웃 데이터 바인딩 확인
    });

    test('컴포넌트가 DOM에 렌더링되어야 한다', async ({ page }) => {
        await page.goto(BASE);
        await waitForApp(page);

        // #app 내부에 실제 HTML 요소가 있어야 함
        const childCount = await page.locator('#app > *').count();
        expect(childCount).toBeGreaterThan(0);
    });
});

test.describe('인증 흐름', () => {
    test('보호된 라우트 접근 시 로그인 페이지로 리다이렉트해야 한다', async ({ page }) => {
        // localStorage에 토큰 없이 보호된 라우트 접근
        await page.goto(BASE + '#/dashboard');
        await page.waitForTimeout(3000);

        // 로그인 라우트로 리다이렉트되었는지 확인
        const url = page.url();
        expect(url).toContain('login');
    });

    test('공개 라우트는 인증 없이 접근 가능해야 한다', async ({ page }) => {
        await page.goto(BASE + '#/about');
        await page.waitForTimeout(1500);

        const url = page.url();
        expect(url).toContain('about');
    });
});

test.describe('프로그레스 바 및 전환', () => {
    test('여러 라우트를 빠르게 전환해도 크래시하지 않아야 한다', async ({ page }) => {
        await page.goto(BASE);
        await waitForApp(page);

        // 여러 라우트를 빠르게 전환
        const routes = ['about', 'contact', 'home'];
        for (const route of routes) {
            await page.evaluate((r) => {
                window.location.hash = `#/${r}`;
            }, route);
            await page.waitForTimeout(500);
        }

        // 앱이 여전히 작동하는지 확인
        const childCount = await page.locator('#app > *').count();
        expect(childCount).toBeGreaterThan(0);
    });
});
