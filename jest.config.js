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
    
    // Test file patterns - only run simple tests for now
    testMatch: [
        '<rootDir>/test/simple.test.js'
    ],
    
    // Coverage collection - disabled for now
    collectCoverage: false,
    
    // Clear mocks between tests
    clearMocks: true,
    
    // Restore mocks after each test
    restoreMocks: true,
    
    // Verbose output
    verbose: true,
    
    // Test timeout
    testTimeout: 5000
};