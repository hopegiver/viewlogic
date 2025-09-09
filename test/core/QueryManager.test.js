/**
 * Unit tests for QueryManager
 */

import { QueryManager } from '../../src/plugins/QueryManager.js';

describe('QueryManager', () => {
    let queryManager;
    let mockRouter;
    let mockConfig;

    beforeEach(() => {
        mockRouter = {
            log: jest.fn()
        };
        
        mockConfig = {
            enableParameterValidation: true,
            maxParameterLength: 100,
            maxParameterCount: 10,
            maxArraySize: 5,
            allowedKeyPattern: /^[a-zA-Z0-9_-]+$/,
            logSecurityWarnings: true
        };

        queryManager = new QueryManager(mockRouter, mockConfig);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Query String Parsing', () => {
        test('should parse simple query string', () => {
            const result = queryManager.parseQueryString('name=John&age=30');
            
            expect(result).toEqual({
                name: 'John',
                age: '30'
            });
        });

        test('should parse query string with arrays', () => {
            const result = queryManager.parseQueryString('tags=javascript&tags=vue&tags=router');
            
            expect(result).toEqual({
                tags: ['javascript', 'vue', 'router']
            });
        });

        test('should decode URL encoded values', () => {
            const result = queryManager.parseQueryString('message=Hello%20World&email=user%40example.com');
            
            expect(result).toEqual({
                message: 'Hello World',
                email: 'user@example.com'
            });
        });

        test('should handle empty query string', () => {
            const result = queryManager.parseQueryString('');
            
            expect(result).toEqual({});
        });

        test('should handle malformed query string', () => {
            const result = queryManager.parseQueryString('invalid&=empty&key=value');
            
            expect(result).toEqual({
                key: 'value'
            });
        });
    });

    describe('Query String Building', () => {
        test('should build simple query string', () => {
            const params = { name: 'John', age: 30 };
            const result = queryManager.buildQueryString(params);
            
            expect(result).toBe('name=John&age=30');
        });

        test('should build query string with arrays', () => {
            const params = { tags: ['javascript', 'vue', 'router'] };
            const result = queryManager.buildQueryString(params);
            
            expect(result).toBe('tags=javascript&tags=vue&tags=router');
        });

        test('should URL encode special characters', () => {
            const params = { 
                message: 'Hello World',
                email: 'user@example.com'
            };
            const result = queryManager.buildQueryString(params);
            
            expect(result).toBe('message=Hello%20World&email=user%40example.com');
        });

        test('should handle empty object', () => {
            const result = queryManager.buildQueryString({});
            
            expect(result).toBe('');
        });

        test('should skip undefined and null values', () => {
            const params = { 
                name: 'John',
                age: undefined,
                city: null,
                country: 'USA'
            };
            const result = queryManager.buildQueryString(params);
            
            expect(result).toBe('name=John&country=USA');
        });
    });

    describe('Parameter Management', () => {
        test('should set current query parameters', () => {
            const params = { page: 2, size: 20 };
            
            queryManager.setCurrentQueryParams(params);
            
            expect(queryManager.currentQueryParams).toEqual(params);
        });

        test('should get query parameters', () => {
            queryManager.currentQueryParams = { page: 2, size: 20 };
            
            const result = queryManager.getQueryParams();
            
            expect(result).toEqual({ page: 2, size: 20 });
        });

        test('should get specific query parameter', () => {
            queryManager.currentQueryParams = { page: 2, size: 20 };
            
            const result = queryManager.getQueryParam('page');
            
            expect(result).toBe(2);
        });

        test('should return undefined for non-existent parameter', () => {
            queryManager.currentQueryParams = { page: 2 };
            
            const result = queryManager.getQueryParam('size');
            
            expect(result).toBeUndefined();
        });

        test('should set query parameters', () => {
            queryManager.setQueryParams({ page: 3, sort: 'name' });
            
            expect(queryManager.currentQueryParams).toEqual({
                page: 3,
                sort: 'name'
            });
        });

        test('should merge parameters when not replacing', () => {
            queryManager.currentQueryParams = { page: 2, size: 20 };
            
            queryManager.setQueryParams({ sort: 'name' }, false);
            
            expect(queryManager.currentQueryParams).toEqual({
                page: 2,
                size: 20,
                sort: 'name'
            });
        });

        test('should replace parameters when specified', () => {
            queryManager.currentQueryParams = { page: 2, size: 20 };
            
            queryManager.setQueryParams({ sort: 'name' }, true);
            
            expect(queryManager.currentQueryParams).toEqual({
                sort: 'name'
            });
        });

        test('should clear query parameters', () => {
            queryManager.currentQueryParams = { page: 2, size: 20 };
            
            queryManager.clearQueryParams();
            
            expect(queryManager.currentQueryParams).toEqual({});
        });

        test('should remove specific query parameters', () => {
            queryManager.currentQueryParams = { 
                page: 2, 
                size: 20, 
                sort: 'name',
                filter: 'active'
            };
            
            queryManager.removeQueryParams(['sort', 'filter']);
            
            expect(queryManager.currentQueryParams).toEqual({
                page: 2,
                size: 20
            });
        });
    });

    describe('Parameter Changes Detection', () => {
        test('should detect parameter changes', () => {
            queryManager.currentQueryParams = { page: 2, size: 20 };
            
            const hasChanged = queryManager.hasQueryParamsChanged({
                page: 3,
                size: 20
            });
            
            expect(hasChanged).toBe(true);
        });

        test('should detect no changes when parameters are same', () => {
            queryManager.currentQueryParams = { page: 2, size: 20 };
            
            const hasChanged = queryManager.hasQueryParamsChanged({
                page: 2,
                size: 20
            });
            
            expect(hasChanged).toBe(false);
        });

        test('should detect changes when parameter count differs', () => {
            queryManager.currentQueryParams = { page: 2 };
            
            const hasChanged = queryManager.hasQueryParamsChanged({
                page: 2,
                size: 20
            });
            
            expect(hasChanged).toBe(true);
        });
    });

    describe('Parameter Validation', () => {
        test('should validate parameter names against allowed pattern', () => {
            const params = {
                validName: 'value',
                'invalid-name!': 'value',
                valid_name2: 'value'
            };
            
            const result = queryManager.validateParameters(params);
            
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Invalid parameter name: invalid-name!');
        });

        test('should validate parameter value length', () => {
            const longValue = 'a'.repeat(150);
            const params = { name: longValue };
            
            const result = queryManager.validateParameters(params);
            
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Parameter "name" value too long (150 > 100)');
        });

        test('should validate parameter count', () => {
            const params = {};
            for (let i = 0; i < 15; i++) {
                params[`param${i}`] = 'value';
            }
            
            const result = queryManager.validateParameters(params);
            
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Too many parameters (15 > 10)');
        });

        test('should validate array size', () => {
            const params = {
                tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6', 'tag7']
            };
            
            const result = queryManager.validateParameters(params);
            
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Parameter "tags" array too large (7 > 5)');
        });

        test('should pass validation for valid parameters', () => {
            const params = {
                name: 'John',
                age: '30',
                tags: ['javascript', 'vue']
            };
            
            const result = queryManager.validateParameters(params);
            
            expect(result.valid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        test('should skip validation when disabled', () => {
            queryManager.config.enableParameterValidation = false;
            
            const params = {
                'invalid-name!': 'a'.repeat(150)
            };
            
            const result = queryManager.validateParameters(params);
            
            expect(result.valid).toBe(true);
        });
    });

    describe('Error Handling', () => {
        test('should handle malformed URI components gracefully', () => {
            // Mock decodeURIComponent to throw error
            const originalDecode = global.decodeURIComponent;
            global.decodeURIComponent = jest.fn(() => {
                throw new Error('URI malformed');
            });
            
            const result = queryManager.parseQueryString('invalid%ZZ');
            
            expect(result).toEqual({});
            expect(mockRouter.log).toHaveBeenCalledWith(
                'warn', 
                'QueryManager', 
                'Failed to decode query parameter:', 
                expect.any(Error)
            );
            
            // Restore original function
            global.decodeURIComponent = originalDecode;
        });

        test('should log security warnings when enabled', () => {
            const params = { 'invalid-name!': 'value' };
            
            queryManager.validateParameters(params);
            
            expect(mockRouter.log).toHaveBeenCalledWith(
                'warn',
                'QueryManager',
                'Security validation failed:',
                expect.arrayContaining(['Invalid parameter name: invalid-name!'])
            );
        });
    });
});