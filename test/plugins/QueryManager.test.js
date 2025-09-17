/**
 * Unit tests for QueryManager
 */

import { QueryManager } from '../../src/plugins/QueryManager.js';

describe('QueryManager', () => {
    let queryManager;
    let mockRouter;

    beforeEach(() => {
        mockRouter = {
            currentHash: 'home',
            updateURL: jest.fn(),
            errorHandler: {
                log: jest.fn()
            }
        };

        queryManager = new QueryManager(mockRouter);
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

        test('should parse empty query string', () => {
            const result = queryManager.parseQueryString('');

            expect(result).toEqual({});
        });

        test('should handle URL encoding', () => {
            const result = queryManager.parseQueryString('name=John%20Doe&city=New%20York');

            expect(result).toEqual({
                name: 'John Doe',
                city: 'New York'
            });
        });

        test('should handle array parameters', () => {
            const result = queryManager.parseQueryString('tags[]=red&tags[]=blue&tags[]=green');

            expect(result).toEqual({
                tags: ['red', 'blue', 'green']
            });
        });
    });

    describe('Query String Building', () => {
        test('should build simple query string', () => {
            const params = { name: 'John', age: '30' };
            const result = queryManager.buildQueryString(params);

            expect(result).toBe('name=John&age=30');
        });

        test('should handle empty parameters', () => {
            const result = queryManager.buildQueryString({});

            expect(result).toBe('');
        });

        test('should handle array parameters', () => {
            const params = { tags: ['red', 'blue'] };
            const result = queryManager.buildQueryString(params);

            expect(result).toBe('tags[]=red&tags[]=blue');
        });

        test('should handle URL encoding', () => {
            const params = { name: 'John Doe', city: 'New York' };
            const result = queryManager.buildQueryString(params);

            expect(result).toBe('name=John%20Doe&city=New%20York');
        });
    });

    describe('Parameter Management', () => {
        test('should set and get query parameters', () => {
            queryManager.setQueryParams({ name: 'John', age: '30' });

            expect(queryManager.getQueryParam('name')).toBe('John');
            expect(queryManager.getQueryParam('age')).toBe('30');
        });

        test('should return default value for missing parameter', () => {
            const result = queryManager.getQueryParam('missing', 'default');

            expect(result).toBe('default');
        });

        test('should get all query parameters', () => {
            queryManager.setQueryParams({ name: 'John', age: '30' });

            const params = queryManager.getQueryParams();

            expect(params).toEqual({ name: 'John', age: '30' });
        });

        test('should remove query parameters', () => {
            queryManager.setQueryParams({ name: 'John', age: '30', city: 'NYC' });
            queryManager.removeQueryParams(['age', 'city']);

            expect(queryManager.getQueryParam('name')).toBe('John');
            expect(queryManager.getQueryParam('age')).toBeUndefined();
            expect(queryManager.getQueryParam('city')).toBeUndefined();
        });

        test('should clear all query parameters', () => {
            queryManager.setQueryParams({ name: 'John', age: '30' });
            queryManager.clearQueryParams();

            expect(queryManager.getQueryParams()).toEqual({});
        });
    });

    describe('Route Parameters', () => {
        test('should set and get route parameters', () => {
            queryManager.setCurrentRouteParams({ id: '123', section: 'profile' });

            expect(queryManager.getRouteParam('id')).toBe('123');
            expect(queryManager.getRouteParam('section')).toBe('profile');
        });

        test('should get all route parameters', () => {
            queryManager.setCurrentRouteParams({ id: '123', section: 'profile' });

            const params = queryManager.getRouteParams();

            expect(params).toEqual({ id: '123', section: 'profile' });
        });
    });

    describe('Combined Parameters', () => {
        test('should get combined parameters', () => {
            queryManager.setCurrentRouteParams({ id: '123' });
            queryManager.setQueryParams({ filter: 'active' });

            const allParams = queryManager.getAllParams();

            expect(allParams).toEqual({
                id: '123',
                filter: 'active'
            });
        });

        test('should prioritize query params over route params', () => {
            queryManager.setCurrentRouteParams({ id: '123' });
            queryManager.setQueryParams({ id: '456' });

            const value = queryManager.getParam('id');

            expect(value).toBe('456'); // Query param should win
        });
    });

    describe('Change Detection', () => {
        test('should detect query parameter changes', () => {
            queryManager.setCurrentQueryParams({ name: 'John' });

            const hasChanged = queryManager.hasQueryParamsChanged({ name: 'Jane' });

            expect(hasChanged).toBe(true);
        });

        test('should detect no changes', () => {
            queryManager.setCurrentQueryParams({ name: 'John' });

            const hasChanged = queryManager.hasQueryParamsChanged({ name: 'John' });

            expect(hasChanged).toBe(false);
        });
    });

    describe('URL Updates', () => {
        test('should update URL when parameters change', () => {
            queryManager.setQueryParams({ test: 'value' });

            expect(mockRouter.updateURL).toHaveBeenCalledWith('home', { test: 'value' });
        });
    });
});