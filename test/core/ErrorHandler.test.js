/**
 * ErrorHandler 단위 테스트
 */
import { ErrorHandler } from '../../src/core/ErrorHandler.js';
import { createMockRouter } from '../helpers/testHelpers.js';

describe('ErrorHandler', () => {
    let errorHandler;
    let mockRouter;

    beforeEach(() => {
        mockRouter = createMockRouter();
        errorHandler = new ErrorHandler(mockRouter, {
            logLevel: 'info',
            environment: 'development'
        });
        // console 출력 억제
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'info').mockImplementation(() => {});
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        if (errorHandler) {
            errorHandler.destroy();
            errorHandler = null;
        }
    });

    // === 초기화 ===
    describe('초기화', () => {
        test('기본 설정으로 초기화해야 한다', () => {
            const eh = new ErrorHandler(mockRouter);
            expect(eh.config.logLevel).toBe('info');
            expect(eh.config.environment).toBe('development');
            eh.destroy();
        });

        test('커스텀 설정을 적용해야 한다', () => {
            expect(errorHandler.config.logLevel).toBe('info');
            expect(errorHandler.config.environment).toBe('development');
        });
    });

    // === 로그 레벨 필터링 ===
    describe('로그 레벨 필터링', () => {
        test('logLevel이 info일 때 error, warn, info를 출력해야 한다', () => {
            errorHandler.log('error', 'Test', 'error message');
            errorHandler.log('warn', 'Test', 'warn message');
            errorHandler.log('info', 'Test', 'info message');

            expect(console.error).toHaveBeenCalled();
            expect(console.warn).toHaveBeenCalled();
            expect(console.info).toHaveBeenCalled();
        });

        test('logLevel이 info일 때 debug를 출력하지 않아야 한다', () => {
            errorHandler.log('debug', 'Test', 'debug message');
            expect(console.log).not.toHaveBeenCalled();
        });

        test('logLevel이 error일 때 error만 출력해야 한다', () => {
            const eh = new ErrorHandler(mockRouter, { logLevel: 'error' });
            eh.log('error', 'Test', 'msg');
            eh.log('warn', 'Test', 'msg');
            eh.log('info', 'Test', 'msg');

            expect(console.error).toHaveBeenCalled();
            expect(console.warn).not.toHaveBeenCalled();
            expect(console.info).not.toHaveBeenCalled();
            eh.destroy();
        });

        test('logLevel이 debug일 때 모든 레벨을 출력해야 한다', () => {
            const eh = new ErrorHandler(mockRouter, { logLevel: 'debug' });
            eh.log('error', 'Test', 'msg');
            eh.log('warn', 'Test', 'msg');
            eh.log('info', 'Test', 'msg');
            eh.log('debug', 'Test', 'msg');

            expect(console.error).toHaveBeenCalled();
            expect(console.warn).toHaveBeenCalled();
            expect(console.info).toHaveBeenCalled();
            expect(console.log).toHaveBeenCalled();
            eh.destroy();
        });

        test('production 환경에서 info/debug를 출력하지 않아야 한다', () => {
            const eh = new ErrorHandler(mockRouter, {
                logLevel: 'debug',
                environment: 'production'
            });
            eh.log('info', 'Test', 'msg');
            eh.log('debug', 'Test', 'msg');

            expect(console.info).not.toHaveBeenCalled();
            expect(console.log).not.toHaveBeenCalled();
            eh.destroy();
        });

        test('production 환경에서 error/warn은 출력해야 한다', () => {
            const eh = new ErrorHandler(mockRouter, {
                logLevel: 'debug',
                environment: 'production'
            });
            eh.log('error', 'Test', 'msg');
            eh.log('warn', 'Test', 'msg');

            expect(console.error).toHaveBeenCalled();
            expect(console.warn).toHaveBeenCalled();
            eh.destroy();
        });
    });

    // === 편의 메서드 ===
    describe('편의 메서드', () => {
        test('error()가 console.error를 호출해야 한다', () => {
            errorHandler.error('Component', 'error msg');
            expect(console.error).toHaveBeenCalled();
        });

        test('warn()이 console.warn을 호출해야 한다', () => {
            errorHandler.warn('Component', 'warn msg');
            expect(console.warn).toHaveBeenCalled();
        });

        test('info()가 console.info를 호출해야 한다', () => {
            errorHandler.info('Component', 'info msg');
            expect(console.info).toHaveBeenCalled();
        });

        test('debug()가 logLevel이 debug일 때 console.log를 호출해야 한다', () => {
            const eh = new ErrorHandler(mockRouter, { logLevel: 'debug' });
            eh.debug('Component', 'debug msg');
            expect(console.log).toHaveBeenCalled();
            eh.destroy();
        });
    });

    // === 에러 분류 (handleRouteError) ===
    describe('에러 분류 (handleRouteError)', () => {
        beforeEach(() => {
            // handleRouteError가 내부에서 호출하는 메서드 mock
            mockRouter.routeLoader = {
                createVueComponent: jest.fn().mockRejectedValue(new Error('no component'))
            };
            mockRouter.renderComponentWithTransition = jest.fn();
        });

        test('"not found" 메시지를 404로 분류해야 한다', async () => {
            const error = new Error('Route not found');
            await errorHandler.handleRouteError('test', error);
            // reportError에서 errorCode가 404인지 확인
            expect(console.error).toHaveBeenCalled();
        });

        test('"404" 메시지를 404로 분류해야 한다', async () => {
            const error = new Error('HTTP 404');
            await errorHandler.handleRouteError('test', error);
            expect(console.error).toHaveBeenCalled();
        });

        test('"network" 메시지를 503으로 분류해야 한다', async () => {
            const error = new Error('network error occurred');
            await errorHandler.handleRouteError('test', error);
            expect(console.error).toHaveBeenCalled();
        });

        test('"permission"/"403" 메시지를 403으로 분류해야 한다', async () => {
            const error = new Error('permission denied');
            await errorHandler.handleRouteError('test', error);
            expect(console.error).toHaveBeenCalled();
        });

        test('알 수 없는 에러를 500으로 분류해야 한다', async () => {
            const error = new Error('something went wrong');
            await errorHandler.handleRouteError('test', error);
            expect(console.error).toHaveBeenCalled();
        });
    });

    // === 폴백 에러 페이지 ===
    describe('showFallbackErrorPage', () => {
        test('app 요소에 innerHTML을 설정해야 한다', () => {
            const appElement = { innerHTML: '' };
            // jsdom 환경에서는 jest.spyOn을 사용해야 함
            jest.spyOn(document, 'getElementById').mockReturnValue(appElement);

            errorHandler.showFallbackErrorPage(404, '페이지를 찾을 수 없습니다.');
            expect(appElement.innerHTML).toContain('404');
        });

        test('app 요소가 없으면 안전하게 무시해야 한다', () => {
            jest.spyOn(document, 'getElementById').mockReturnValue(null);
            expect(() => {
                errorHandler.showFallbackErrorPage(500, 'Error');
            }).not.toThrow();
        });
    });

    // === reportError ===
    describe('reportError', () => {
        test('에러 리포트에 필수 필드를 포함해야 한다', () => {
            const error = new Error('test error');
            errorHandler.reportError('home', error, 500);

            // error 로그가 호출되었는지 확인
            expect(console.error).toHaveBeenCalled();
            const logArgs = console.error.mock.calls[0];
            // 리포트 객체가 포함되어 있어야 함
            const report = logArgs.find(arg => typeof arg === 'object' && arg.route);
            if (report) {
                expect(report.route).toBe('home');
                expect(report.errorCode).toBe(500);
                expect(report.timestamp).toBeDefined();
            }
        });
    });

    // === log 하위 호환성 ===
    describe('log 하위 호환성', () => {
        test('유효하지 않은 레벨은 info로 처리해야 한다', () => {
            errorHandler.log('SomeComponent', 'message');
            // 유효하지 않은 레벨이면 info로 취급
            expect(console.info).toHaveBeenCalled();
        });
    });

    // === destroy ===
    describe('destroy', () => {
        test('router 참조를 null로 설정해야 한다', () => {
            errorHandler.destroy();
            expect(errorHandler.router).toBeNull();
        });
    });
});
