/**
 * ViewLogic Error Handling System
 * 라우트 및 시스템 에러 처리 시스템
 */
export class ErrorHandler {
    constructor(router, options = {}) {
        this.config = {
            enableErrorReporting: options.enableErrorReporting !== false,
            debug: options.debug || false,
            logLevel: options.logLevel || (options.debug ? 'debug' : 'info'),
            environment: options.environment || 'development'
        };
        
        // 라우터 인스턴스 참조
        this.router = router;
        
        // 로그 레벨 매핑
        this.logLevels = {
            error: 0,
            warn: 1, 
            info: 2,
            debug: 3
        };
        
        this.log('info', 'ErrorHandler', 'ErrorHandler initialized with config:', this.config);
    }

    /**
     * 라우트 에러 처리
     */
    async handleRouteError(routeName, error) {
        let errorCode = 500;
        let errorMessage = '페이지를 로드할 수 없습니다.';
        
        this.debug('ErrorHandler', '에러 상세:', error.message, error.name);
        
        // 에러 타입 분석 (더 정확한 404 감지)
        if (error.message.includes('not found') || 
            error.message.includes('404') ||
            error.message.includes('Failed to resolve') ||
            error.message.includes('Failed to fetch') ||
            (error.name === 'TypeError' && error.message.includes('resolve'))) {
            errorCode = 404;
            errorMessage = `'${routeName}' 페이지를 찾을 수 없습니다.`;
        } else if (error.message.includes('network') && !error.message.includes('not found')) {
            errorCode = 503;
            errorMessage = '네트워크 연결을 확인해 주세요.';
        } else if (error.message.includes('permission') || error.message.includes('403')) {
            errorCode = 403;
            errorMessage = '페이지에 접근할 권한이 없습니다.';
        }
        
        this.debug('ErrorHandler', `에러 코드 결정: ${errorCode} (라우트: ${routeName})`);
        
        // 에러 리포팅
        if (this.config.enableErrorReporting) {
            this.reportError(routeName, error, errorCode);
        }
        
        try {
            // 404 페이지 전용 처리
            if (errorCode === 404) {
                await this.load404Page();
            } else {
                // 일반 에러 페이지
                await this.loadErrorPage(errorCode, errorMessage);
            }
        } catch (fallbackError) {
            this.error('ErrorHandler', '에러 페이지 로딩 실패:', fallbackError);
            // 모든 에러 페이지가 실패했을 때 최후의 폴백 페이지 표시
            this.showFallbackErrorPage(errorCode, errorMessage);
        }
    }

    /**
     * 404 페이지 로딩
     */
    async load404Page() {
        try {
            this.info('ErrorHandler', 'Loading 404 page...');
            const component = await this.createVueComponent('404');
            await this.renderComponentWithTransition(component, '404');
            this.info('ErrorHandler', '404 page loaded successfully');
        } catch (error) {
            this.error('ErrorHandler', '404 page loading failed:', error);
            // 404 페이지도 없으면 간단한 에러 메시지 표시
            this.showFallbackErrorPage('404', '페이지를 찾을 수 없습니다.');
        }
    }

    /**
     * 에러 페이지 로딩
     */
    async loadErrorPage(errorCode, errorMessage) {
        try {
            this.info('ErrorHandler', `Loading error page for ${errorCode}...`);
            
            // 에러 컴포넌트 생성
            const errorComponent = await this.createErrorComponent(errorCode, errorMessage);
            await this.renderComponentWithTransition(errorComponent, 'error');
            this.info('ErrorHandler', `Error page ${errorCode} loaded successfully`);
        } catch (error) {
            this.error('ErrorHandler', `Error page ${errorCode} loading failed:`, error);
            // 에러 페이지도 로딩 실패하면 폴백 표시
            this.showFallbackErrorPage(errorCode, errorMessage);
        }
    }

    /**
     * 에러 컴포넌트 생성
     */
    async createErrorComponent(errorCode, errorMessage) {
        try {
            // 에러 컴포넌트를 동적으로 로드
            const component = await this.createVueComponent('error');
            
            // 에러 정보를 props로 전달
            const errorComponent = {
                ...component,
                data() {
                    const originalData = component.data ? component.data() : {};
                    return {
                        ...originalData,
                        errorCode,
                        errorMessage,
                        showRetry: true,
                        showGoHome: true
                    };
                }
            };
            
            return errorComponent;
        } catch (error) {
            // 에러 컴포넌트도 로드할 수 없는 경우 간단한 에러 표시
            this.error('ErrorHandler', 'Error component load failed:', error);
            throw new Error(`Cannot load error page: ${error.message}`);
        }
    }

    /**
     * 폴백 에러 페이지 표시 (모든 에러 페이지가 실패했을 때)
     */
    showFallbackErrorPage(errorCode, errorMessage) {
        const appElement = document.getElementById('app');
        if (!appElement) return;

        const fallbackHTML = `
            <div class="fallback-error-page" style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                padding: 2rem;
                text-align: center;
                background: #f8f9fa;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            ">
                <div style="
                    background: white;
                    padding: 3rem;
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                    max-width: 500px;
                ">
                    <h1 style="
                        font-size: 4rem;
                        margin: 0;
                        color: #dc3545;
                        font-weight: 300;
                    ">${errorCode}</h1>
                    <h2 style="
                        margin: 1rem 0;
                        color: #495057;
                        font-weight: 400;
                    ">${errorMessage}</h2>
                    <p style="
                        color: #6c757d;
                        margin-bottom: 2rem;
                        line-height: 1.5;
                    ">요청하신 페이지를 찾을 수 없습니다.</p>
                    <button onclick="window.location.hash = '#/'" style="
                        background: #007bff;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 1rem;
                        transition: background 0.2s;
                    " onmouseover="this.style.background='#0056b3'" onmouseout="this.style.background='#007bff'">
                        홈으로 돌아가기
                    </button>
                </div>
            </div>
        `;

        // 기존 컨테이너들 정리
        appElement.innerHTML = fallbackHTML;
        
        this.info('ErrorHandler', `Fallback error page displayed for ${errorCode}`);
    }

    /**
     * 에러 리포팅
     */
    reportError(routeName, error, errorCode) {
        const errorReport = {
            route: routeName,
            errorCode,
            errorMessage: error.message,
            stack: error.stack,
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            routerConfig: {
                environment: this.router.config.environment,
                mode: this.router.config.mode
            }
        };
        
        this.error('ErrorHandler', '라우터 에러 리포트:', errorReport);
        
        // 추후 에러 추적 서비스로 전송할 수 있음
        // 예: analytics.track('router_error', errorReport);
    }

    /**
     * Vue 컴포넌트 생성 (RouteLoader 위임)
     */
    async createVueComponent(routeName) {
        if (this.router.routeLoader) {
            return await this.router.routeLoader.createVueComponent(routeName);
        }
        throw new Error('RouteLoader not available');
    }

    /**
     * 컴포넌트 렌더링 (ViewManager 위임)
     */
    async renderComponentWithTransition(component, routeName) {
        if (this.router.renderComponentWithTransition) {
            return await this.router.renderComponentWithTransition(component, routeName);
        }
        throw new Error('Render function not available');
    }

    /**
     * 통합 로깅 시스템
     * @param {string} level - 로그 레벨 (error, warn, info, debug)
     * @param {string} component - 컴포넌트 이름 (선택적)
     * @param {...any} args - 로그 메시지
     */
    log(level, component, ...args) {
        // 하위 호환성: 기존 방식도 지원
        if (typeof level !== 'string' || !this.logLevels.hasOwnProperty(level)) {
            args = [component, ...args];
            component = level;
            level = this.config.debug ? 'debug' : 'info';
        }
        
        // 로그 레벨 확인
        const currentLevelValue = this.logLevels[this.config.logLevel] || this.logLevels.info;
        const messageLevelValue = this.logLevels[level] || this.logLevels.info;
        
        if (messageLevelValue > currentLevelValue) {
            return; // 현재 설정된 레벨보다 높으면 출력 안함
        }
        
        // 프로덕션 환경에서는 error와 warn만 출력
        if (this.config.environment === 'production' && messageLevelValue > this.logLevels.warn) {
            return;
        }
        
        const prefix = component ? `[${component}]` : '[ViewLogic]';
        const timestamp = new Date().toISOString().substring(11, 23); // HH:MM:SS.mmm
        
        switch (level) {
            case 'error':
                console.error(`${timestamp} ${prefix}`, ...args);
                break;
            case 'warn':
                console.warn(`${timestamp} ${prefix}`, ...args);
                break;
            case 'info':
                console.info(`${timestamp} ${prefix}`, ...args);
                break;
            case 'debug':
                console.log(`${timestamp} ${prefix}`, ...args);
                break;
            default:
                console.log(`${timestamp} ${prefix}`, ...args);
        }
    }
    
    /**
     * 에러 로그 (항상 출력)
     */
    error(component, ...args) {
        this.log('error', component, ...args);
    }
    
    /**
     * 경고 로그
     */
    warn(component, ...args) {
        this.log('warn', component, ...args);
    }
    
    /**
     * 정보 로그
     */
    info(component, ...args) {
        this.log('info', component, ...args);
    }
    
    /**
     * 디버그 로그
     */
    debug(component, ...args) {
        this.log('debug', component, ...args);
    }

    /**
     * 정리 (메모리 누수 방지)
     */
    destroy() {
        this.router = null;
        this.info('ErrorHandler', 'ErrorHandler destroyed');
    }
}