/**
 * Minimal Jest setup for publishing tests
 */

// Mock minimal DOM environment
global.document = {
    getElementById: jest.fn(() => ({
        appendChild: jest.fn(),
        innerHTML: '',
        querySelectorAll: jest.fn(() => [])
    })),
    querySelectorAll: jest.fn(() => [])
};

global.window = {
    location: { hash: '#/', search: '' },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    history: { pushState: jest.fn(), replaceState: jest.fn() },
    navigator: { language: 'en-US' }
};

global.localStorage = {
    getItem: jest.fn(() => null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};

global.fetch = jest.fn();
global.FormData = jest.fn();
global.AbortController = jest.fn();

// Clean up after each test
afterEach(() => {
    jest.clearAllMocks();
});