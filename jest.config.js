/**
 * Jest configuration for ViewLogic Router
 */

export default {
    // Test environment
    testEnvironment: 'jsdom',
    
    // Module file extensions
    moduleFileExtensions: ['js', 'json'],
    
    // Transform files
    transform: {
        '^.+\\.js$': 'babel-jest'
    },
    
    // Test file patterns
    testMatch: [
        '<rootDir>/test/**/*.test.js'
    ],

    // Coverage collection
    collectCoverage: true,
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/**/*.min.js',
        '!src/**/index.js'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    
    // Clear mocks between tests
    clearMocks: true,
    
    // Restore mocks after each test
    restoreMocks: true,
    
    // Verbose output
    verbose: true,
    
    // Test timeout
    testTimeout: 10000,

    // Setup files
    setupFilesAfterEnv: ['<rootDir>/test/setup.js']
};