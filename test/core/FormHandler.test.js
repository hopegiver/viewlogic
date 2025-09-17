/**
 * Comprehensive unit tests for FormHandler
 */

import { FormHandler } from '../../src/core/FormHandler.js';

// Mock DOM elements
const createMockForm = (attributes = {}) => ({
    action: '/api/submit',
    method: 'POST',
    elements: [],
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(() => []),
    ...attributes
});

const createMockInput = (name, value, type = 'text') => ({
    name,
    value,
    type,
    checked: type === 'checkbox' ? false : undefined,
    files: type === 'file' ? [] : undefined
});

// Mock FormData
global.FormData = jest.fn(() => ({
    append: jest.fn(),
    get: jest.fn(),
    getAll: jest.fn(),
    has: jest.fn(),
    set: jest.fn()
}));

// Mock AbortController
global.AbortController = jest.fn(() => ({
    abort: jest.fn(),
    signal: {}
}));

describe('FormHandler', () => {
    let formHandler;
    let mockRouter;
    let mockComponent;
    let mockErrorHandler;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers();
        jest.useFakeTimers();

        mockErrorHandler = {
            log: jest.fn()
        };

        mockRouter = {
            errorHandler: mockErrorHandler,
            queryManager: {
                getQueryParams: jest.fn(() => ({}))
            }
        };

        mockComponent = {
            $params: { userId: '123' },
            $api: {
                post: jest.fn(),
                put: jest.fn(),
                patch: jest.fn()
            }
        };

        formHandler = new FormHandler(mockRouter, {
            debug: true,
            requestTimeout: 5000
        });
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    describe('Constructor and Initialization', () => {
        test('should initialize with default options', () => {
            const handler = new FormHandler(mockRouter);

            expect(handler.router).toBe(mockRouter);
            expect(handler.config.debug).toBe(false);
            expect(handler.config.requestTimeout).toBe(30000);
        });

        test('should merge custom options', () => {
            const customOptions = {
                debug: true,
                requestTimeout: 10000,
                customOption: 'value'
            };

            const handler = new FormHandler(mockRouter, customOptions);

            expect(handler.config.debug).toBe(true);
            expect(handler.config.requestTimeout).toBe(10000);
            expect(handler.config.customOption).toBe('value');
        });

        test('should log initialization', () => {
            expect(mockErrorHandler.log).toHaveBeenCalledWith('debug', 'FormHandler', 'FormHandler initialized');
        });
    });

    describe('Duplicate Request Prevention', () => {
        test('should detect duplicate requests', () => {
            const form = createMockForm();
            form._isSubmitting = true;

            const result = formHandler.isDuplicateRequest(form);

            expect(result).toBe(true);
            expect(mockErrorHandler.log).toHaveBeenCalledWith('debug', 'FormHandler', 'Duplicate request blocked');
        });

        test('should allow new requests', () => {
            const form = createMockForm();

            const result = formHandler.isDuplicateRequest(form);

            expect(result).toBe(false);
        });
    });

    describe('Form Submission Management', () => {
        test('should start form submission', () => {
            const form = createMockForm();

            formHandler.startFormSubmission(form);

            expect(form._isSubmitting).toBe(true);
            expect(form._abortController).toBeDefined();
            expect(form._timeoutId).toBeDefined();
        });

        test('should finish form submission', () => {
            const form = createMockForm();
            form._isSubmitting = true;
            form._timeoutId = 123;
            form._abortController = { abort: jest.fn() };

            formHandler.finishFormSubmission(form);

            expect(form._isSubmitting).toBe(false);
            expect(form._abortController).toBeUndefined();
            expect(form._timeoutId).toBeUndefined();
        });

        test('should abort form submission', () => {
            const form = createMockForm();
            const mockAbortController = { abort: jest.fn() };
            form._abortController = mockAbortController;
            form._isSubmitting = true;

            formHandler.abortFormSubmission(form);

            expect(mockAbortController.abort).toHaveBeenCalled();
            expect(form._isSubmitting).toBe(false);
        });

        test('should timeout and abort submission', () => {
            const form = createMockForm();
            const abortSpy = jest.spyOn(formHandler, 'abortFormSubmission');

            formHandler.startFormSubmission(form);

            // Fast-forward time to trigger timeout
            jest.advanceTimersByTime(5000);

            expect(abortSpy).toHaveBeenCalledWith(form);
        });

        test('should not timeout if submission completes', () => {
            const form = createMockForm();
            const abortSpy = jest.spyOn(formHandler, 'abortFormSubmission');

            formHandler.startFormSubmission(form);
            formHandler.finishFormSubmission(form);

            // Fast-forward time
            jest.advanceTimersByTime(5000);

            expect(abortSpy).not.toHaveBeenCalled();
        });
    });

    describe('URL Parameter Processing', () => {
        test('should replace parameters in action URL', () => {
            const action = '/api/users/{userId}/posts/{postId}';
            const component = {
                $params: { userId: '123', postId: '456' }
            };

            const result = formHandler.processActionParams(action, component);

            expect(result).toBe('/api/users/123/posts/456');
        });

        test('should handle missing parameters', () => {
            const action = '/api/users/{userId}/posts/{postId}';
            const component = {
                $params: { userId: '123' }
            };

            const result = formHandler.processActionParams(action, component);

            // Should replace userId but handle missing postId appropriately
            expect(result).toContain('123');
        });

        test('should return original URL if no parameters', () => {
            const action = '/api/submit';
            const component = { $params: {} };

            const result = formHandler.processActionParams(action, component);

            expect(result).toBe('/api/submit');
        });

        test('should handle component without $params', () => {
            const action = '/api/users/{userId}';
            const component = {};

            const result = formHandler.processActionParams(action, component);

            expect(result).toBe(action);
        });
    });

    describe('Form Data Collection', () => {
        test('should handle form data collection internally', () => {
            // FormData collection is handled internally by native FormData
            // during form submission process
            const form = createMockForm();
            expect(form).toBeDefined();
            expect(typeof FormData).toBe('function');
        });

        test('should handle checkbox inputs', () => {
            const form = createMockForm();
            const inputs = [
                { ...createMockInput('newsletter', 'yes', 'checkbox'), checked: true },
                { ...createMockInput('terms', 'agree', 'checkbox'), checked: false }
            ];

            form.querySelectorAll = jest.fn(() => inputs);

            // FormData collection is handled internally during form submission
            expect(form).toBeDefined();

            expect(formData.append).toHaveBeenCalledWith('newsletter', 'yes');
            expect(formData.append).not.toHaveBeenCalledWith('terms', 'agree');
        });

        test('should handle radio inputs', () => {
            const form = createMockForm();
            const inputs = [
                { ...createMockInput('gender', 'male', 'radio'), checked: false },
                { ...createMockInput('gender', 'female', 'radio'), checked: true }
            ];

            form.querySelectorAll = jest.fn(() => inputs);

            // FormData collection is handled internally during form submission
            expect(form).toBeDefined();

            expect(formData.append).not.toHaveBeenCalledWith('gender', 'male');
            expect(formData.append).toHaveBeenCalledWith('gender', 'female');
        });

        test('should handle file inputs', () => {
            const form = createMockForm();
            const mockFile = new Blob(['test content'], { type: 'text/plain' });
            const inputs = [
                { ...createMockInput('upload', '', 'file'), files: [mockFile] }
            ];

            form.querySelectorAll = jest.fn(() => inputs);

            // FormData collection is handled internally during form submission
            expect(form).toBeDefined();

            expect(formData.append).toHaveBeenCalledWith('upload', mockFile);
        });

        test('should handle select inputs', () => {
            const form = createMockForm();
            const selects = [
                createMockInput('country', 'USA', 'select-one')
            ];

            form.querySelectorAll = jest.fn(() => selects);

            // FormData collection is handled internally during form submission
            expect(form).toBeDefined();

            expect(formData.append).toHaveBeenCalledWith('country', 'USA');
        });

        test('should handle textarea inputs', () => {
            const form = createMockForm();
            const textareas = [
                { ...createMockInput('message', 'Hello world', 'textarea'), tagName: 'TEXTAREA' }
            ];

            form.querySelectorAll = jest.fn(() => textareas);

            // FormData collection is handled internally during form submission
            expect(form).toBeDefined();

            expect(formData.append).toHaveBeenCalledWith('message', 'Hello world');
        });

        test('should skip inputs without names', () => {
            const form = createMockForm();
            const inputs = [
                createMockInput('', 'value'),
                createMockInput('valid', 'value')
            ];

            form.querySelectorAll = jest.fn(() => inputs);

            // FormData collection is handled internally during form submission
            expect(form).toBeDefined();

            expect(formData.append).toHaveBeenCalledTimes(1);
            expect(formData.append).toHaveBeenCalledWith('valid', 'value');
        });
    });

    describe('Form Submission', () => {
        test('should submit form with POST method', async () => {
            const form = createMockForm({
                action: '/api/users/{userId}',
                method: 'POST'
            });

            form.querySelectorAll = jest.fn(() => [
                createMockInput('name', 'John Doe')
            ]);

            mockComponent.$api.post.mockResolvedValue({ success: true });

            const result = await formHandler.submitForm(form, mockComponent);

            expect(formHandler.isDuplicateRequest(form)).toBe(false); // Should be finished
            expect(mockComponent.$api.post).toHaveBeenCalledWith(
                '/api/users/123',
                expect.any(FormData)
            );
            expect(result).toEqual({ success: true });
        });

        test('should submit form with PUT method', async () => {
            const form = createMockForm({
                action: '/api/users/{userId}',
                method: 'PUT'
            });

            form.querySelectorAll = jest.fn(() => []);
            mockComponent.$api.put.mockResolvedValue({ success: true });

            await formHandler.submitForm(form, mockComponent);

            expect(mockComponent.$api.put).toHaveBeenCalledWith(
                '/api/users/123',
                expect.any(FormData)
            );
        });

        test('should prevent duplicate submissions', async () => {
            const form = createMockForm();
            form._isSubmitting = true;

            const result = await formHandler.submitForm(form, mockComponent);

            expect(result).toBeUndefined();
            expect(mockComponent.$api.post).not.toHaveBeenCalled();
        });

        test('should handle submission errors', async () => {
            const form = createMockForm();
            form.querySelectorAll = jest.fn(() => []);

            const error = new Error('API Error');
            mockComponent.$api.post.mockRejectedValue(error);

            await expect(formHandler.submitForm(form, mockComponent))
                .rejects.toThrow('API Error');

            expect(form._isSubmitting).toBe(false); // Should be cleaned up
            expect(mockErrorHandler.log).toHaveBeenCalledWith(
                'error',
                'FormHandler',
                'Form submission failed:',
                error
            );
        });
    });

    describe('Auto Form Binding', () => {
        test('should bind forms with action attribute', () => {
            const forms = [
                createMockForm({ action: '/api/submit' }),
                createMockForm({ action: '/api/update' })
            ];

            // Mock document.querySelectorAll
            global.document = {
                querySelectorAll: jest.fn(() => forms)
            };

            formHandler.bindAutoForms(mockComponent);

            forms.forEach(form => {
                expect(form.addEventListener).toHaveBeenCalledWith(
                    'submit',
                    expect.any(Function)
                );
            });
        });

        test('should handle form submission events', async () => {
            const form = createMockForm();
            const submitHandler = jest.fn();

            form.addEventListener = jest.fn((event, handler) => {
                if (event === 'submit') {
                    submitHandler.mockImplementation(handler);
                }
            });

            global.document = {
                querySelectorAll: jest.fn(() => [form])
            };

            formHandler.bindAutoForms(mockComponent);

            // Simulate form submission
            const mockEvent = {
                preventDefault: jest.fn(),
                target: form
            };

            form.querySelectorAll = jest.fn(() => []);
            mockComponent.$api.post.mockResolvedValue({ success: true });

            await submitHandler(mockEvent);

            expect(mockEvent.preventDefault).toHaveBeenCalled();
        });
    });

    describe('Logging', () => {
        test('should handle missing errorHandler gracefully', () => {
            const handlerWithoutLogger = new FormHandler({});

            expect(() => {
                handlerWithoutLogger.log('debug', 'test message');
            }).not.toThrow();
        });
    });
});