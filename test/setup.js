/**
 * Test setup and mocks for ViewLogic Router
 */

// Mock DOM environment
global.document = {
    createElement: jest.fn(() => ({
        setAttribute: jest.fn(),
        appendChild: jest.fn(),
        remove: jest.fn(),
        classList: {
            add: jest.fn(),
            remove: jest.fn()
        }
    })),
    head: {
        appendChild: jest.fn(),
        querySelector: jest.fn(),
        removeChild: jest.fn()
    },
    getElementById: jest.fn(() => ({
        appendChild: jest.fn(),
        innerHTML: '',
        querySelectorAll: jest.fn(() => []),
        querySelector: jest.fn()
    })),
    readyState: 'complete',
    addEventListener: jest.fn(),
    createDocumentFragment: jest.fn(() => ({
        appendChild: jest.fn()
    }))
};

global.window = {
    location: {
        hash: '#/',
        pathname: '/',
        search: '',
        href: 'http://localhost'
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    requestAnimationFrame: jest.fn(cb => setTimeout(cb, 16)),
    history: {
        pushState: jest.fn(),
        replaceState: jest.fn()
    }
};

// Mock Vue
global.Vue = {
    createApp: jest.fn(() => ({
        config: {
            globalProperties: {}
        },
        mount: jest.fn(),
        unmount: jest.fn()
    }))
};

// Mock fetch
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('')
    })
);

// Mock localStorage and sessionStorage
const mockStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};

global.localStorage = mockStorage;
global.sessionStorage = mockStorage;

// Mock console for cleaner tests
global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
};