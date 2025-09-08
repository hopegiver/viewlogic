/**
 * ViewLogic Router - Static UMD Wrapper
 * (c) 2024 hopegiver
 * @license MIT
 * 
 * This is a static UMD wrapper that imports the ES6 module
 * Place this file in your dist folder alongside viewlogic-router.js
 */
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD - RequireJS
        define(['./viewlogic-router'], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node.js/CommonJS
        module.exports = factory(require('./viewlogic-router.js'));
    } else {
        // Browser globals
        // Load ViewLogic from the already loaded ES6 module
        // Assumes viewlogic-router.js was loaded as <script type="module">
        if (root.ViewLogicModule) {
            root.ViewLogic = factory(root.ViewLogicModule);
        } else {
            console.error('ViewLogic: ES6 module not loaded. Please load viewlogic-router.js first.');
        }
    }
}(typeof self !== 'undefined' ? self : this, function (ViewLogicModule) {
    'use strict';
    
    // Handle different export formats
    if (ViewLogicModule && ViewLogicModule.ViewLogicRouter) {
        return {
            ViewLogicRouter: ViewLogicModule.ViewLogicRouter,
            version: '1.0.0'
        };
    }
    
    // Fallback if module structure is different
    return ViewLogicModule || {};
}));