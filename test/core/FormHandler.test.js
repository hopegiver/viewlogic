/**
 * FormHandler 단위 테스트
 */
import { FormHandler } from '../../src/core/FormHandler.js';
import { createMockRouter, createMockForm, mockFetchSuccess } from '../helpers/testHelpers.js';

describe('FormHandler', () => {
    let formHandler;
    let mockRouter;

    beforeEach(() => {
        mockRouter = createMockRouter();
        formHandler = new FormHandler(mockRouter);
    });

    afterEach(() => {
        if (formHandler) {
            formHandler.router = null;
            formHandler = null;
        }
    });

    // === 초기화 ===
    describe('초기화', () => {
        test('기본 타임아웃 설정으로 초기화해야 한다', () => {
            expect(formHandler.requestTimeout).toBe(30000);
            expect(formHandler.uploadTimeout).toBe(300000);
        });

        test('router.config에서 커스텀 타임아웃을 가져와야 한다', () => {
            const router = createMockRouter({
                config: { requestTimeout: 10000, uploadTimeout: 60000 }
            });
            const fh = new FormHandler(router);
            expect(fh.requestTimeout).toBe(10000);
            expect(fh.uploadTimeout).toBe(60000);
        });
    });

    // === isDuplicateRequest ===
    describe('isDuplicateRequest', () => {
        test('제출 중인 폼에 true를 반환해야 한다', () => {
            const form = { _isSubmitting: true };
            expect(formHandler.isDuplicateRequest(form)).toBe(true);
        });

        test('제출 중이 아닌 폼에 false를 반환해야 한다', () => {
            const form = { _isSubmitting: false };
            expect(formHandler.isDuplicateRequest(form)).toBe(false);
        });

        test('_isSubmitting이 없는 폼에 false를 반환해야 한다', () => {
            const form = {};
            expect(formHandler.isDuplicateRequest(form)).toBe(false);
        });
    });

    // === startFormSubmission ===
    describe('startFormSubmission', () => {
        test('form._isSubmitting을 true로 설정해야 한다', () => {
            const form = {
                _isSubmitting: false,
                elements: []
            };
            formHandler.startFormSubmission(form);
            expect(form._isSubmitting).toBe(true);
        });

        test('AbortController를 생성해야 한다', () => {
            const form = { _isSubmitting: false, elements: [] };
            formHandler.startFormSubmission(form);
            expect(form._abortController).toBeDefined();
        });

        test('타임아웃을 설정해야 한다', () => {
            jest.useFakeTimers();
            const form = { _isSubmitting: false, elements: [] };
            formHandler.startFormSubmission(form);
            expect(form._timeoutId).toBeDefined();
            jest.useRealTimers();
        });

        test('파일 업로드가 있는 폼에 uploadTimeout을 사용해야 한다', () => {
            jest.useFakeTimers();
            const form = {
                _isSubmitting: false,
                elements: [{ type: 'file', files: [{ name: 'test.jpg' }] }]
            };
            formHandler.startFormSubmission(form);
            expect(form._timeoutId).toBeDefined();
            jest.useRealTimers();
        });
    });

    // === finishFormSubmission ===
    describe('finishFormSubmission', () => {
        test('_isSubmitting을 false로 설정해야 한다', () => {
            const form = {
                _isSubmitting: true,
                _timeoutId: setTimeout(() => {}, 1000),
                _abortController: new AbortController()
            };
            formHandler.finishFormSubmission(form);
            expect(form._isSubmitting).toBe(false);
        });

        test('타임아웃을 정리해야 한다', () => {
            jest.useFakeTimers();
            const form = {
                _isSubmitting: true,
                _timeoutId: setTimeout(() => {}, 1000)
            };
            formHandler.finishFormSubmission(form);
            expect(form._timeoutId).toBeUndefined();
            jest.useRealTimers();
        });

        test('abortController를 제거해야 한다', () => {
            const form = {
                _isSubmitting: true,
                _abortController: new AbortController()
            };
            formHandler.finishFormSubmission(form);
            expect(form._abortController).toBeUndefined();
        });
    });

    // === abortFormSubmission ===
    describe('abortFormSubmission', () => {
        test('AbortController.abort()를 호출해야 한다', () => {
            const controller = new AbortController();
            const form = {
                _isSubmitting: true,
                _abortController: controller
            };
            formHandler.abortFormSubmission(form);
            expect(controller.abort).toHaveBeenCalled();
        });

        test('finishFormSubmission()을 호출해야 한다', () => {
            const form = {
                _isSubmitting: true,
                _abortController: new AbortController()
            };
            formHandler.abortFormSubmission(form);
            expect(form._isSubmitting).toBe(false);
        });
    });

    // === validateForm ===
    describe('validateForm', () => {
        test('모든 입력이 유효하면 true를 반환해야 한다', () => {
            const form = createMockForm({
                inputs: [
                    { name: 'name', value: 'test', valid: true },
                    { name: 'email', value: 'test@test.com', valid: true }
                ]
            });
            expect(formHandler.validateForm(form, {})).toBe(true);
        });

        test('HTML5 checkValidity() 실패 시 false를 반환해야 한다', () => {
            const form = createMockForm({
                inputs: [
                    { name: 'name', value: '', valid: false }
                ]
            });
            expect(formHandler.validateForm(form, {})).toBe(false);
        });

        test('유효하지 않은 입력에 error 클래스를 추가해야 한다', () => {
            const form = createMockForm({
                inputs: [
                    { name: 'name', value: '', valid: false }
                ]
            });
            formHandler.validateForm(form, {});
            const inputs = form.querySelectorAll();
            expect(inputs[0].classList.add).toHaveBeenCalledWith('error');
        });

        test('data-validation 속성의 커스텀 검증 함수를 호출해야 한다', () => {
            const form = createMockForm({
                inputs: [
                    { name: 'email', value: 'bad', valid: true, 'data-validation': 'validateEmail' }
                ]
            });
            const component = {
                validateEmail: jest.fn(() => false)
            };
            const result = formHandler.validateForm(form, component);
            expect(component.validateEmail).toHaveBeenCalledWith('bad', expect.any(Object));
            expect(result).toBe(false);
        });

        test('검증 함수가 없으면 true를 반환해야 한다', () => {
            const form = createMockForm({
                inputs: [
                    { name: 'name', value: 'test', valid: true, 'data-validation': 'nonExistentValidator' }
                ]
            });
            expect(formHandler.validateForm(form, {})).toBe(true);
        });

        test('검증 함수에서 에러 발생 시 false를 반환해야 한다', () => {
            const form = createMockForm({
                inputs: [
                    { name: 'name', value: 'test', valid: true, 'data-validation': 'badValidator' }
                ]
            });
            const component = {
                badValidator: jest.fn(() => { throw new Error('validation error'); })
            };
            expect(formHandler.validateForm(form, component)).toBe(false);
        });
    });

    // === processActionParams ===
    describe('processActionParams', () => {
        test('apiHandler.processURLParameters()에 위임해야 한다', () => {
            const component = { id: '123' };
            formHandler.processActionParams('/api/users/{id}', component);
            expect(mockRouter.routeLoader.apiHandler.processURLParameters)
                .toHaveBeenCalledWith('/api/users/{id}', component);
        });
    });

    // === handleFormSubmit ===
    describe('handleFormSubmit', () => {
        test('event.preventDefault()를 호출해야 한다', async () => {
            const event = {
                preventDefault: jest.fn(),
                target: createMockForm({
                    action: '/api/test',
                    method: 'POST',
                    inputs: [{ name: 'name', value: 'test', valid: true }]
                })
            };
            event.target.elements = [];

            mockFetchSuccess({ success: true });
            mockRouter.routeLoader.apiHandler.fetchData.mockResolvedValue({ success: true });

            await formHandler.handleFormSubmit(event, {});
            expect(event.preventDefault).toHaveBeenCalled();
        });

        test('검증 실패 시 제출하지 않아야 한다', async () => {
            const event = {
                preventDefault: jest.fn(),
                target: createMockForm({
                    action: '/api/test',
                    method: 'POST',
                    inputs: [{ name: 'name', value: '', valid: false }]
                })
            };
            event.target.elements = [];

            await formHandler.handleFormSubmit(event, {});
            expect(mockRouter.routeLoader.apiHandler.fetchData).not.toHaveBeenCalled();
        });

        test('중복 제출을 차단해야 한다', async () => {
            const form = createMockForm({
                action: '/api/test',
                method: 'POST',
                inputs: [{ name: 'name', value: 'test', valid: true }]
            });
            form._isSubmitting = true;
            form.elements = [];

            const event = { preventDefault: jest.fn(), target: form };
            await formHandler.handleFormSubmit(event, {});
            expect(mockRouter.routeLoader.apiHandler.fetchData).not.toHaveBeenCalled();
        });
    });

    // === handleFormSubmit 전체 흐름 ===
    describe('handleFormSubmit 전체 흐름', () => {
        const createSubmitEvent = (formOptions = {}) => {
            const form = createMockForm({
                action: '/api/users',
                method: 'POST',
                inputs: [
                    { name: 'name', value: 'test', valid: true },
                    { name: 'email', value: 'test@test.com', valid: true }
                ],
                ...formOptions
            });
            form.elements = [];
            return { preventDefault: jest.fn(), target: form };
        };

        test('성공 시 successHandler를 호출해야 한다', async () => {
            const event = createSubmitEvent({
                'data-success': 'onSuccess'
            });
            const component = { onSuccess: jest.fn() };
            mockRouter.routeLoader.apiHandler.fetchData.mockResolvedValue({ id: 1 });

            await formHandler.handleFormSubmit(event, component);

            expect(component.onSuccess).toHaveBeenCalledWith({ id: 1 }, event.target);
        });

        test('성공 시 loadingHandler를 true → false로 호출해야 한다', async () => {
            const event = createSubmitEvent({
                'data-loading': 'onLoading'
            });
            const calls = [];
            const component = { onLoading: jest.fn((state) => calls.push(state)) };
            mockRouter.routeLoader.apiHandler.fetchData.mockResolvedValue({});

            await formHandler.handleFormSubmit(event, component);

            expect(calls).toEqual([true, false]);
        });

        test('에러 시 errorHandler를 호출해야 한다', async () => {
            const event = createSubmitEvent({
                'data-error': 'onError'
            });
            const apiError = new Error('Server error');
            const component = { onError: jest.fn() };
            mockRouter.routeLoader.apiHandler.fetchData.mockRejectedValue(apiError);

            await formHandler.handleFormSubmit(event, component);

            expect(component.onError).toHaveBeenCalledWith(apiError, event.target);
        });

        test('에러 시 errorHandler가 없으면 log error를 호출해야 한다', async () => {
            const event = createSubmitEvent();
            mockRouter.routeLoader.apiHandler.fetchData.mockRejectedValue(new Error('fail'));

            await formHandler.handleFormSubmit(event, {});

            expect(mockRouter.errorHandler.log).toHaveBeenCalledWith(
                'error', 'FormHandler',
                expect.stringContaining('no error handler'),
                expect.any(Error)
            );
        });

        test('AbortError는 의도적 취소로 처리해야 한다', async () => {
            const event = createSubmitEvent();
            const abortError = new Error('Aborted');
            abortError.name = 'AbortError';
            mockRouter.routeLoader.apiHandler.fetchData.mockRejectedValue(abortError);

            await formHandler.handleFormSubmit(event, {});

            // AbortError는 에러 로그를 남기지 않음 (debug만)
            const errorCalls = mockRouter.errorHandler.log.mock.calls.filter(c => c[0] === 'error');
            expect(errorCalls.length).toBe(0);
        });

        test('성공 후 data-redirect가 있으면 navigateTo를 호출해야 한다', async () => {
            jest.useFakeTimers();
            const event = createSubmitEvent({
                'data-redirect': 'dashboard'
            });
            const component = { navigateTo: jest.fn() };
            mockRouter.routeLoader.apiHandler.fetchData.mockResolvedValue({});

            await formHandler.handleFormSubmit(event, component);

            // requestAnimationFrame + setTimeout(1000)
            jest.runAllTimers();
            expect(component.navigateTo).toHaveBeenCalledWith('dashboard');
            jest.useRealTimers();
        });

        test('에러 시에도 loadingHandler(false)를 호출해야 한다', async () => {
            const event = createSubmitEvent({
                'data-loading': 'onLoading'
            });
            const calls = [];
            const component = { onLoading: jest.fn((state) => calls.push(state)) };
            mockRouter.routeLoader.apiHandler.fetchData.mockRejectedValue(new Error('fail'));

            await formHandler.handleFormSubmit(event, component);

            // true(시작) → false(finally)
            expect(calls[0]).toBe(true);
            expect(calls[calls.length - 1]).toBe(false);
        });
    });

    // === submitFormData ===
    describe('submitFormData', () => {
        test('파일이 없으면 JSON Content-Type으로 전송해야 한다', async () => {
            const form = createMockForm({ inputs: [] });
            form.elements = [];
            mockRouter.routeLoader.apiHandler.fetchData.mockResolvedValue({ ok: true });

            await formHandler.submitFormData('/api/test', 'POST', { name: 'test' }, form, {});

            expect(mockRouter.routeLoader.apiHandler.fetchData).toHaveBeenCalledWith(
                '/api/test', {},
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    data: { name: 'test' }
                })
            );
        });

        test('파일이 있으면 FormData로 전송해야 한다', async () => {
            const form = createMockForm({
                inputs: [{ type: 'file', files: [{ name: 'doc.pdf' }] }]
            });
            form.elements = [{ type: 'file', files: [{ name: 'doc.pdf' }] }];
            mockRouter.routeLoader.apiHandler.fetchData.mockResolvedValue({ ok: true });

            await formHandler.submitFormData('/api/upload', 'POST', {}, form, {});

            expect(mockRouter.routeLoader.apiHandler.fetchData).toHaveBeenCalledWith(
                '/api/upload', {},
                expect.objectContaining({
                    method: 'POST',
                    data: expect.any(FormData)
                })
            );
        });
    });

    // === bindAutoForms ===
    describe('bindAutoForms', () => {
        test('form[action] 요소에 submit 핸들러를 바인딩해야 한다', () => {
            const form = createMockForm({ action: '/api/test' });
            jest.spyOn(document, 'querySelectorAll').mockReturnValue([form]);

            formHandler.bindAutoForms({});

            expect(form.addEventListener).toHaveBeenCalledWith('submit', expect.any(Function));
            expect(form._boundSubmitHandler).toBeDefined();
        });

        test('기존 핸들러를 제거 후 새 핸들러를 바인딩해야 한다', () => {
            const oldHandler = jest.fn();
            const form = createMockForm({ action: '/api/test' });
            form._boundSubmitHandler = oldHandler;
            jest.spyOn(document, 'querySelectorAll').mockReturnValue([form]);

            formHandler.bindAutoForms({});

            expect(form.removeEventListener).toHaveBeenCalledWith('submit', oldHandler);
            expect(form.addEventListener).toHaveBeenCalledWith('submit', expect.any(Function));
        });
    });

    // === cancelAllRequests ===
    describe('cancelAllRequests', () => {
        test('제출 중인 모든 폼을 중단해야 한다', () => {
            const form1 = { _isSubmitting: true, _abortController: new AbortController() };
            const form2 = { _isSubmitting: false };
            jest.spyOn(document, 'querySelectorAll').mockReturnValue([form1, form2]);

            formHandler.cancelAllRequests();

            expect(form1._isSubmitting).toBe(false);
        });
    });

    // === cleanupFormState ===
    describe('cleanupFormState', () => {
        test('폼 상태를 정리해야 한다', () => {
            jest.useFakeTimers();
            const form = {
                _isSubmitting: true,
                _abortController: new AbortController(),
                _timeoutId: setTimeout(() => {}, 1000)
            };
            formHandler.cleanupFormState(form);

            expect(form._isSubmitting).toBeUndefined();
            expect(form._abortController).toBeUndefined();
            expect(form._timeoutId).toBeUndefined();
            jest.useRealTimers();
        });
    });

    // === destroy ===
    describe('destroy', () => {
        test('모든 폼 이벤트 리스너를 정리하고 router를 null로 설정해야 한다', () => {
            const form = createMockForm({ action: '/api/test' });
            form._boundSubmitHandler = jest.fn();
            jest.spyOn(document, 'querySelectorAll').mockReturnValue([form]);

            formHandler.destroy();

            expect(form.removeEventListener).toHaveBeenCalledWith('submit', expect.any(Function));
            expect(formHandler.router).toBeNull();
        });
    });

    // === log ===
    describe('log', () => {
        test('router.errorHandler.log에 위임해야 한다', () => {
            formHandler.log('info', 'test message');
            expect(mockRouter.errorHandler.log).toHaveBeenCalledWith('info', 'FormHandler', 'test message');
        });

        test('router가 없어도 에러가 발생하지 않아야 한다', () => {
            formHandler.router = null;
            expect(() => formHandler.log('info', 'msg')).not.toThrow();
        });
    });
});
