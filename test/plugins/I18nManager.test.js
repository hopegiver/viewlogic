/**
 * Unit tests for I18nManager
 */

import { I18nManager } from '../../src/plugins/I18nManager.js';

describe('I18nManager', () => {
    let i18nManager;
    let mockRouter;

    beforeEach(() => {
        mockRouter = {
            config: {
                i18nPath: '/test/locales'
            },
            cacheManager: {
                get: jest.fn(),
                set: jest.fn(),
                deleteByPattern: jest.fn()
            },
            errorHandler: {
                log: jest.fn()
            }
        };

        i18nManager = new I18nManager(mockRouter, {
            useI18n: true,
            defaultLanguage: 'en'
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Configuration', () => {
        test('should initialize with enabled i18n', () => {
            expect(i18nManager.config.enabled).toBe(true);
            expect(i18nManager.config.defaultLanguage).toBe('en');
            expect(i18nManager.config.fallbackLanguage).toBe('en');
        });

        test('should handle disabled i18n', () => {
            const disabledManager = new I18nManager(mockRouter, {
                useI18n: false
            });

            expect(disabledManager.config.enabled).toBe(false);
        });
    });

    describe('Language Management', () => {
        test('should get current language', () => {
            expect(i18nManager.getCurrentLanguage()).toBe('en');
        });

        test('should validate language codes', () => {
            expect(i18nManager.isValidLanguage('en')).toBe(true);
            expect(i18nManager.isValidLanguage('ko')).toBe(true);
            expect(i18nManager.isValidLanguage('invalid')).toBe(false);
            expect(i18nManager.isValidLanguage('')).toBe(false);
        });

        test('should check if enabled', () => {
            expect(i18nManager.isEnabled()).toBe(true);

            const disabledManager = new I18nManager(mockRouter, {
                useI18n: false
            });
            expect(disabledManager.isEnabled()).toBe(false);
        });
    });

    describe('Message Translation', () => {
        beforeEach(() => {
            // Mock messages for testing
            i18nManager.messages.set('en', {
                hello: 'Hello',
                user: {
                    name: 'Name',
                    profile: {
                        title: 'Profile'
                    }
                },
                welcome: 'Welcome {name}',
                items: {
                    singular: '{count} item',
                    plural: '{count} items'
                }
            });
        });

        test('should translate simple keys', () => {
            expect(i18nManager.t('hello')).toBe('Hello');
        });

        test('should translate nested keys', () => {
            expect(i18nManager.t('user.name')).toBe('Name');
            expect(i18nManager.t('user.profile.title')).toBe('Profile');
        });

        test('should interpolate parameters', () => {
            expect(i18nManager.t('welcome', { name: 'John' })).toBe('Welcome John');
        });

        test('should return key for missing translations', () => {
            expect(i18nManager.t('missing.key')).toBe('missing.key');
        });

        test('should handle plural forms', () => {
            expect(i18nManager.plural('items', 1, { count: 1 })).toBe('1 item');
            expect(i18nManager.plural('items', 5, { count: 5 })).toBe('5 items');
        });

        test('should return key when i18n is disabled', () => {
            const disabledManager = new I18nManager(mockRouter, {
                useI18n: false
            });

            expect(disabledManager.t('any.key')).toBe('any.key');
        });
    });

    describe('Formatting', () => {
        test('should format dates', () => {
            const date = new Date('2023-01-01');
            const formatted = i18nManager.formatDate(date);

            expect(typeof formatted).toBe('string');
            expect(formatted.length).toBeGreaterThan(0);
        });

        test('should format numbers', () => {
            const formatted = i18nManager.formatNumber(1234.56);

            expect(typeof formatted).toBe('string');
            expect(formatted.length).toBeGreaterThan(0);
        });
    });

    describe('Cache Management', () => {
        test('should clear cache', () => {
            i18nManager.clearCache();

            expect(mockRouter.cacheManager.deleteByPattern).toHaveBeenCalledWith('i18n_');
        });
    });

    describe('Event System', () => {
        test('should register and trigger event listeners', () => {
            const listener = jest.fn();
            i18nManager.on('languageChanged', listener);

            i18nManager.emit('languageChanged', { test: 'data' });

            expect(listener).toHaveBeenCalledWith({ test: 'data' });
        });

        test('should remove event listeners', () => {
            const listener = jest.fn();
            i18nManager.on('languageChanged', listener);
            i18nManager.off('languageChanged', listener);

            i18nManager.emit('languageChanged', { test: 'data' });

            expect(listener).not.toHaveBeenCalled();
        });
    });
});