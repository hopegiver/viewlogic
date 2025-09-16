/**
 * Comprehensive unit tests for ApiHandler
 */

import { ApiHandler } from '../../src/core/ApiHandler.js';

// Mock fetch globally
global.fetch = jest.fn();

describe('ApiHandler', () => {
    let apiHandler;
    let mockRouter;
    let mockComponent;
    let mockQueryManager;
    let mockErrorHandler;

    beforeEach(() => {
        // Reset fetch mock
        fetch.mockReset();

        // Setup mock dependencies
        mockQueryManager = {
            getQueryParams: jest.fn(() => ({ page: '1', sort: 'asc' })),
            buildQueryString: jest.fn(() => 'page=1&sort=asc')
        };

        mockErrorHandler = {
            log: jest.fn()
        };

        mockRouter = {
            queryManager: mockQueryManager,
            errorHandler: mockErrorHandler
        };

        mockComponent = {
            $getToken: jest.fn(() => 'test-token'),
            userId: '123',
            productId: '456',
            getParam: jest.fn((param) => {
                const params = { userId: '123', productId: '456' };
                return params[param];
            })
        };

        apiHandler = new ApiHandler(mockRouter, {
            debug: true,
            timeout: 5000,
            retries: 2
        });
    });

    describe('Constructor and Initialization', () => {
        test('should initialize with default options', () => {
            const handler = new ApiHandler(mockRouter);

            expect(handler.router).toBe(mockRouter);
            expect(handler.config.debug).toBe(false);
            expect(handler.config.timeout).toBe(10000);
            expect(handler.config.retries).toBe(1);
        });

        test('should merge custom options with defaults', () => {
            const customOptions = {
                debug: true,
                timeout: 5000,
                retries: 3,
                customOption: 'value'
            };

            const handler = new ApiHandler(mockRouter, customOptions);

            expect(handler.config.debug).toBe(true);
            expect(handler.config.timeout).toBe(5000);
            expect(handler.config.retries).toBe(3);
            expect(handler.config.customOption).toBe('value');
        });

        test('should log initialization', () => {
            expect(mockErrorHandler.log).toHaveBeenCalledWith('debug', 'ApiHandler', 'ApiHandler initialized');
        });
    });

    describe('URL Parameter Processing', () => {
        test('should replace {param} placeholders in URL', () => {
            const url = '/api/users/{userId}/products/{productId}';
            const result = apiHandler.processURLParameters(url, mockComponent);

            expect(result).toBe('/api/users/123/products/456');
        });

        test('should handle missing parameters gracefully', () => {
            const url = '/api/users/{userId}/orders/{orderId}';
            const result = apiHandler.processURLParameters(url, mockComponent);

            // Should replace userId but leave orderId as is (or remove it depending on implementation)
            expect(result).toContain('123');
        });

        test('should return original URL if no placeholders', () => {
            const url = '/api/products';
            const result = apiHandler.processURLParameters(url, mockComponent);

            expect(result).toBe('/api/products');
        });

        test('should handle component without params', () => {
            const url = '/api/users/{userId}';
            const componentWithoutParams = {};
            const result = apiHandler.processURLParameters(url, componentWithoutParams);

            expect(result).toBe(url); // Should return original URL
        });
    });

    describe('Data Fetching - GET Requests', () => {
        test('should fetch data successfully', async () => {
            const mockData = { users: [{ id: 1, name: 'John' }] };
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue(mockData)
            };
            fetch.mockResolvedValue(mockResponse);

            const result = await apiHandler.fetchData('/api/users', mockComponent);

            expect(fetch).toHaveBeenCalledWith(
                '/api/users?page=1&sort=asc',
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': 'Bearer test-token'
                    })
                })
            );
            expect(result).toEqual(mockData);
        });

        test('should handle URL with parameter substitution', async () => {
            const mockData = { user: { id: 123, name: 'John' } };
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue(mockData)
            };
            fetch.mockResolvedValue(mockResponse);

            await apiHandler.fetchData('/api/users/{userId}', mockComponent);

            expect(fetch).toHaveBeenCalledWith(
                '/api/users/123?page=1&sort=asc',
                expect.any(Object)
            );
        });

        test('should handle response without query parameters', async () => {
            mockQueryManager.buildQueryString.mockReturnValue('');

            const mockData = { data: 'test' };
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue(mockData)
            };
            fetch.mockResolvedValue(mockResponse);

            await apiHandler.fetchData('/api/test', mockComponent);

            expect(fetch).toHaveBeenCalledWith('/api/test', expect.any(Object));
        });

        test('should work without component (no token)', async () => {
            const mockData = { public: 'data' };
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue(mockData)
            };
            fetch.mockResolvedValue(mockResponse);

            const result = await apiHandler.fetchData('/api/public');

            expect(fetch).toHaveBeenCalledWith(
                '/api/public?page=1&sort=asc',
                expect.objectContaining({
                    headers: expect.not.objectContaining({
                        'Authorization': expect.any(String)
                    })
                })
            );
            expect(result).toEqual(mockData);
        });
    });

    describe('Data Fetching - POST/PUT Requests', () => {
        test('should send POST request with JSON data', async () => {
            const postData = { name: 'John', email: 'john@example.com' };
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({ id: 1, ...postData })
            };
            fetch.mockResolvedValue(mockResponse);

            await apiHandler.fetchData('/api/users', mockComponent, {
                method: 'POST',
                data: postData
            });

            expect(fetch).toHaveBeenCalledWith(
                '/api/users?page=1&sort=asc',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json'
                    }),
                    body: JSON.stringify(postData)
                })
            );
        });

        test('should send POST request with FormData', async () => {
            const formData = new FormData();
            formData.append('name', 'John');
            formData.append('file', new Blob(['test'], { type: 'text/plain' }));

            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({ success: true })
            };
            fetch.mockResolvedValue(mockResponse);

            await apiHandler.fetchData('/api/upload', mockComponent, {
                method: 'POST',
                data: formData
            });

            expect(fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    method: 'POST',
                    body: formData,
                    headers: expect.not.objectContaining({
                        'Content-Type': expect.any(String)
                    })
                })
            );
        });

        test('should handle PUT request', async () => {
            const putData = { id: 1, name: 'John Updated' };
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue(putData)
            };
            fetch.mockResolvedValue(mockResponse);

            await apiHandler.fetchData('/api/users/{userId}', mockComponent, {
                method: 'PUT',
                data: putData
            });

            expect(fetch).toHaveBeenCalledWith(
                '/api/users/123?page=1&sort=asc',
                expect.objectContaining({
                    method: 'PUT',
                    body: JSON.stringify(putData)
                })
            );
        });
    });

    describe('Error Handling', () => {
        test('should handle HTTP error responses', async () => {
            const errorResponse = {
                ok: false,
                status: 404,
                statusText: 'Not Found',
                json: jest.fn().mockResolvedValue({ message: 'User not found' })
            };
            fetch.mockResolvedValue(errorResponse);

            await expect(apiHandler.fetchData('/api/users/999', mockComponent))
                .rejects.toThrow('User not found');

            expect(mockErrorHandler.log).toHaveBeenCalledWith(
                'error',
                'ApiHandler',
                'Failed to fetch data:',
                expect.any(Error)
            );
        });

        test('should handle HTTP error without JSON response', async () => {
            const errorResponse = {
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                json: jest.fn().mockRejectedValue(new Error('Not JSON'))
            };
            fetch.mockResolvedValue(errorResponse);

            await expect(apiHandler.fetchData('/api/error', mockComponent))
                .rejects.toThrow('HTTP 500: Internal Server Error');
        });

        test('should handle network errors', async () => {
            fetch.mockRejectedValue(new Error('Network error'));

            await expect(apiHandler.fetchData('/api/users', mockComponent))
                .rejects.toThrow('Network error');

            expect(mockErrorHandler.log).toHaveBeenCalledWith(
                'error',
                'ApiHandler',
                'Failed to fetch data:',
                expect.any(Error)
            );
        });

        test('should handle invalid JSON responses', async () => {
            const mockResponse = {
                ok: true,
                json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
            };
            fetch.mockResolvedValue(mockResponse);

            const result = await apiHandler.fetchData('/api/no-content', mockComponent);

            expect(result).toEqual({ success: true });
        });

        test('should handle non-object responses', async () => {
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue('string response')
            };
            fetch.mockResolvedValue(mockResponse);

            const result = await apiHandler.fetchData('/api/invalid', mockComponent);

            // Since string response triggers the validation error which is caught,
            // it should return { success: true }
            expect(result).toEqual({ success: true });
        });
    });

    describe('Request Options and Headers', () => {
        test('should merge custom headers', async () => {
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({})
            };
            fetch.mockResolvedValue(mockResponse);

            await apiHandler.fetchData('/api/test', mockComponent, {
                headers: {
                    'Custom-Header': 'custom-value',
                    'X-API-Version': '2'
                }
            });

            expect(fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer test-token',
                        'Custom-Header': 'custom-value',
                        'X-API-Version': '2'
                    })
                })
            );
        });

        test('should allow overriding default headers', async () => {
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({})
            };
            fetch.mockResolvedValue(mockResponse);

            await apiHandler.fetchData('/api/test', mockComponent, {
                headers: {
                    'Content-Type': 'application/xml'
                }
            });

            expect(fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Content-Type': 'application/xml'
                    })
                })
            );
        });
    });

    describe('Logging', () => {
        test('should log debug information', async () => {
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({})
            };
            fetch.mockResolvedValue(mockResponse);

            await apiHandler.fetchData('/api/test', mockComponent);

            expect(mockErrorHandler.log).toHaveBeenCalledWith(
                'debug',
                'ApiHandler',
                expect.stringMatching(/Fetching data from/)
            );
        });

        test('should handle missing errorHandler gracefully', () => {
            const handlerWithoutLogger = new ApiHandler({ queryManager: mockQueryManager });

            expect(() => {
                handlerWithoutLogger.log('debug', 'test message');
            }).not.toThrow();
        });
    });
});