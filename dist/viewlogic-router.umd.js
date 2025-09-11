/**
 * ViewLogic Router - UMD Bundle
 * Optimized version with cleaner Promise handling
 */
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        var api = factory();
        root.createRouter = api.createRouter;
        root.ViewLogicRouter = api.ViewLogicRouter;
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    let RouterClass = null;
    let loadPromise = null;

    function detectEnvironment(options) {
        return (options && options.environment) || 'development';
    }

    function getBaseUrl() {
        // Try to detect current script URL to determine base path
        if (typeof document !== 'undefined') {
            const scripts = Array.from(document.scripts);
            const currentScript = scripts.find(script => 
                script.src && script.src.includes('viewlogic-router.umd.js')
            );
            if (currentScript) {
                const url = new URL(currentScript.src);
                const baseUrl = url.origin + url.pathname.replace(/\/[^\/]*$/, '/');
                return baseUrl;
            }
        }
        
        return 'https://cdn.jsdelivr.net/npm/viewlogic/dist/';
    }

    function getRouterPath(environment) {
        const baseUrl = getBaseUrl();
        return environment === 'production' ? baseUrl + 'viewlogic-router.min.js' : baseUrl + 'viewlogic-router.js';
    }

    function setGlobalRouter(router) {
        try { 
            root.router = router; 
        } catch(_) { 
            try { 
                window.router = router; 
            } catch(__) {}
        }
    }

    async function loadRouterClass(options) {
        if (RouterClass) return RouterClass;
        
        if (!loadPromise) {
            const environment = detectEnvironment(options);
            const routerPath = getRouterPath(environment);
            
            loadPromise = import(routerPath)
                .then(module => {
                    RouterClass = module.ViewLogicRouter;
                    return RouterClass;
                })
                .catch(error => {
                    // More robust error checking for failed module loading
                    const isLoadError = error?.message?.includes('Failed to fetch') || 
                                       error?.message?.includes('404') ||
                                       error?.message?.includes('Cannot find module') ||
                                       error?.message?.includes('Failed to resolve');
                    
                    if (environment === 'production' && isLoadError) {
                        console.warn('Failed to load minified version, falling back to regular version');
                        const baseUrl = getBaseUrl();
                        return import(baseUrl + 'viewlogic-router.js').then(module => {
                            RouterClass = module.ViewLogicRouter;
                            return RouterClass;
                        });
                    }
                    throw error;
                });
        }
        
        return loadPromise;
    }

    async function createRouter(options = {}) {
        const RouterConstructor = await loadRouterClass(options);
        const router = new RouterConstructor(options);
        
        // 라우터 생성 즉시 전역에 설정
        setGlobalRouter(router);
        
        if (!router.mount) {
            router.mount = function(el) {
                // mount 시에도 다시 설정 (안전장치)
                setGlobalRouter(router);
                return router;
            };
        }
        
        return router;
    }

    function ViewLogicRouter(options = {}) {
        const routerPromise = createRouter(options);
        
        // Promise 완료 시 즉시 전역 설정 확인
        routerPromise.then(router => {
            setGlobalRouter(router);
        }).catch(error => {
            console.error('Failed to create ViewLogic router:', error);
            throw error;
        });
        
        routerPromise.mount = function(el) {
            return routerPromise.then(router => {
                // mount 시에도 다시 설정 (안전장치)
                setGlobalRouter(router);
                
                if (router.mount) {
                    return router.mount(el);
                }
                return router;
            }).catch(error => {
                console.error('Failed to mount ViewLogic router:', error);
                throw error;
            });
        };
        
        return routerPromise;
    }

    return { createRouter, ViewLogicRouter };
}));