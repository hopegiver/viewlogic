/**
 * Jest setup for ViewLogic Router tests
 * 브라우저 환경 mock 및 테스트 유틸리티
 */

// Mock minimal DOM environment (기존 테스트 호환)
global.document = {
    getElementById: jest.fn(() => ({
        appendChild: jest.fn(),
        innerHTML: '',
        querySelectorAll: jest.fn(() => [])
    })),
    querySelectorAll: jest.fn(() => []),
    createElement: jest.fn((tag) => ({
        tagName: tag,
        id: '',
        style: { cssText: '' },
        className: '',
        innerHTML: '',
        appendChild: jest.fn(),
        remove: jest.fn(),
        setAttribute: jest.fn(),
        getAttribute: jest.fn(() => null),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        querySelectorAll: jest.fn(() => []),
        classList: {
            add: jest.fn(),
            remove: jest.fn(),
            contains: jest.fn(() => false)
        }
    })),
    body: {
        appendChild: jest.fn(),
        removeChild: jest.fn()
    },
    dispatchEvent: jest.fn(),
    cookie: ''
};

global.window = {
    location: { hash: '#/', search: '', href: 'http://localhost/#/', protocol: 'http:', origin: 'http://localhost', pathname: '/', hostname: 'localhost' },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    history: { pushState: jest.fn(), replaceState: jest.fn() },
    navigator: { language: 'en-US' },
    scrollTo: jest.fn(),
    requestAnimationFrame: jest.fn(cb => setTimeout(cb, 0))
};

global.navigator = {
    language: 'en-US',
    userAgent: 'jest-test-agent'
};

// localStorage (상태 유지 가능)
const createStorageMock = () => {
    let store = {};
    return {
        getItem: jest.fn((key) => store[key] !== undefined ? store[key] : null),
        setItem: jest.fn((key, value) => { store[key] = String(value); }),
        removeItem: jest.fn((key) => { delete store[key]; }),
        clear: jest.fn(() => { store = {}; }),
        _getStore: () => store,
        _reset: () => { store = {}; }
    };
};

// jsdom 환경에서 내장 localStorage/sessionStorage를 강제 덮어쓰기
Object.defineProperty(global, 'localStorage', {
    value: createStorageMock(),
    writable: true,
    configurable: true
});
Object.defineProperty(global, 'sessionStorage', {
    value: createStorageMock(),
    writable: true,
    configurable: true
});

// Fetch mock
global.fetch = jest.fn();

// FormData mock
global.FormData = jest.fn(function(form) {
    this._data = {};
    this.append = jest.fn((key, value) => { this._data[key] = value; });
    this.entries = jest.fn(function() { return Object.entries(this._data); }.bind(this));
    this.get = jest.fn((key) => this._data[key] || null);
});

// AbortController mock
global.AbortController = jest.fn(function() {
    this.signal = { aborted: false };
    this.abort = jest.fn(() => { this.signal.aborted = true; });
});

// base64 인코딩/디코딩 (JWT 토큰 처리용)
global.btoa = (str) => Buffer.from(str, 'binary').toString('base64');
global.atob = (str) => Buffer.from(str, 'base64').toString('binary');

// CustomEvent mock (AuthManager 이벤트)
global.CustomEvent = jest.fn(function(type, options = {}) {
    this.type = type;
    this.detail = options.detail;
});

// URLSearchParams (Node.js 내장 사용)
if (typeof global.URLSearchParams === 'undefined') {
    global.URLSearchParams = URLSearchParams;
}

// Clean up after each test
afterEach(() => {
    jest.clearAllMocks();
    // localStorage/sessionStorage를 새 mock으로 교체 (jsdom 호환)
    Object.defineProperty(global, 'localStorage', {
        value: createStorageMock(),
        writable: true,
        configurable: true
    });
    Object.defineProperty(global, 'sessionStorage', {
        value: createStorageMock(),
        writable: true,
        configurable: true
    });
    global.document.cookie = '';
});
