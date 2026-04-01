/**
 * ApiHandler
 * API 호출 및 데이터 처리 시스템
 */
export class ApiHandler {
    constructor(router, options = {}) {
        this.router = router;
        // router.config에서 직접 참조 (RouteLoader의 자체 config에는 apiBaseURL이 없음)
        this.apiBaseURL = router?.config?.apiBaseURL || options.apiBaseURL || '';

        // API 인터셉터 (response, error)
        const interceptors = router?.config?.apiInterceptors;
        this.interceptors = interceptors && typeof interceptors === 'object' ? interceptors : null;

        // HTTP 상태 코드별 에러 핸들러
        const handlers = router?.config?.errorHandlers;
        this.errorHandlers = handlers && typeof handlers === 'object' ? handlers : null;

        // 토큰 갱신 상태 관리
        this._refreshingToken = false;
        this._refreshPromise = null;

        // 초기 로딩 API 추적 (페이지 전환 시 사용)
        this._tracking = false;
        this._pendingCount = 0;
        this._settledResolvers = [];

        this.log('debug', 'ApiHandler initialized');
    }

    /**
     * 로깅 래퍼 메서드
     */
    log(level, ...args) {
        if (this.router?.errorHandler) {
            this.router.errorHandler.log(level, 'ApiHandler', ...args);
        }
    }

    /**
     * 추적 시작 — 이후 발생하는 API 호출을 pending 카운터로 관리
     */
    startTracking() {
        this._tracking = true;
        this._pendingCount = 0;
        this._settledResolvers = [];
        this.log('debug', 'API 추적 시작');
    }

    /**
     * 추적 종료 — 새 API 호출은 더 이상 카운트하지 않음
     */
    stopTracking() {
        this._tracking = false;
        // pending이 0이면 대기 중인 resolver 즉시 해제
        if (this._pendingCount <= 0) {
            this._resolveAllSettled();
        }
        this.log('debug', `API 추적 종료 (남은 pending: ${this._pendingCount})`);
    }

    /**
     * 모든 추적 중인 API 요청이 완료될 때까지 대기
     * @param {number} timeout - 최대 대기 시간 (ms, 기본 5000)
     * @returns {Promise<boolean>} 정상 완료 true, 타임아웃 false
     */
    waitForSettled(timeout = 5000) {
        // 추적 중인 요청이 없으면 즉시 반환
        if (this._pendingCount <= 0 && !this._tracking) {
            return Promise.resolve(true);
        }

        return new Promise((resolve) => {
            // 타임아웃 설정
            const timer = setTimeout(() => {
                this.log('warn', `API 대기 타임아웃 (${timeout}ms, 남은 pending: ${this._pendingCount})`);
                resolve(false);
            }, timeout);

            this._settledResolvers.push(() => {
                clearTimeout(timer);
                resolve(true);
            });

            // 이미 0이고 추적이 끝났으면 즉시 해제
            if (this._pendingCount <= 0 && !this._tracking) {
                clearTimeout(timer);
                resolve(true);
            }
        });
    }

    /**
     * pending 카운터 증가 (추적 중일 때만)
     */
    _trackRequest() {
        if (this._tracking) {
            this._pendingCount++;
            this.log('debug', `API 추적 +1 (pending: ${this._pendingCount})`);
        }
    }

    /**
     * pending 카운터 감소 + 0이 되면 settled resolver 실행
     */
    _untrackRequest() {
        if (this._pendingCount > 0) {
            this._pendingCount--;
            this.log('debug', `API 추적 -1 (pending: ${this._pendingCount})`);
        }
        // 추적 종료 상태에서 pending이 0이면 모든 대기자 해제
        if (this._pendingCount <= 0 && !this._tracking) {
            this._resolveAllSettled();
        }
    }

    /**
     * 모든 settled resolver 실행
     */
    _resolveAllSettled() {
        const resolvers = this._settledResolvers.splice(0);
        resolvers.forEach(resolve => resolve());
    }

    /**
     * 컴포넌트 데이터 가져오기 (파라미터 치환 지원)
     */
    async fetchData(dataURL, component = null, options = {}) {
        this._trackRequest();
        try {
            // URL에서 파라미터 치환
            let processedURL = this.processURLParameters(dataURL, component);

            // apiBaseURL과 조합 (절대 URL이 아닌 경우에만)
            if (this.apiBaseURL && !this.isAbsoluteURL(processedURL)) {
                processedURL = this.combineURLs(this.apiBaseURL, processedURL);
            }

            // 현재 쿼리 파라미터를 URL에 추가
            const queryString = this.router.queryManager?.buildQueryString(this.router.queryManager?.getQueryParams()) || '';
            const fullURL = queryString ? `${processedURL}?${queryString}` : processedURL;
            
            this.log('debug', `Fetching data from: ${fullURL}`);
            
            // 요청 옵션 설정
            const requestOptions = {
                method: options.method || 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...options.headers
                },
                ...options
            };

            // 인증 토큰 자동 추가 (AuthManager에서 직접 조회)
            const token = this.router?.authManager?.getAccessToken?.() || null;
            if (token) {
                requestOptions.headers['Authorization'] = `Bearer ${token}`;
            }

            // POST/PUT 데이터 처리
            if (options.data && ['POST', 'PUT', 'PATCH'].includes(requestOptions.method.toUpperCase())) {
                if (options.data instanceof FormData) {
                    // FormData인 경우 그대로 전송 (Content-Type 자동 설정)
                    requestOptions.body = options.data;
                    // FormData일 때 Content-Type 헤더 제거 (브라우저가 자동 설정)
                    delete requestOptions.headers['Content-Type'];
                } else {
                    // 일반 객체인 경우 JSON으로 직렬화
                    requestOptions.body = JSON.stringify(options.data);
                }
            }

            const response = await fetch(fullURL, requestOptions);

            if (!response.ok) {
                // 401 응답이고 refreshToken 콜백이 있고 재시도가 아닌 경우 → 토큰 갱신
                if (response.status === 401 && this._getRefreshCallback() && !options._isRetry) {
                    this.log('debug', '401 응답 감지, 토큰 갱신 시도...');

                    const refreshed = await this._handleTokenRefresh();

                    if (refreshed) {
                        this.log('debug', '토큰 갱신 성공, 원래 요청 재시도');
                        return await this._retryRequest(dataURL, component, options);
                    }

                    // 갱신 실패 → 로그아웃 처리
                    this.log('warn', '토큰 갱신 실패, 로그아웃 처리');
                    this._handleRefreshFailure();
                    throw new Error('Authentication failed: token refresh unsuccessful');
                }

                // 응답 본문 파싱
                const status = response.status;
                let body;
                try {
                    body = await response.json();
                } catch (e) {
                    body = { message: `HTTP ${status}: ${response.statusText}` };
                }

                // 상태 코드별 에러 핸들러 실행
                if (this.errorHandlers) {
                    const handlerResult = await this._executeErrorHandler(status, {
                        status,
                        body,
                        url: fullURL,
                        method: requestOptions.method
                    });
                    // 핸들러가 값을 반환하면 에러 억제
                    if (handlerResult !== undefined) {
                        return handlerResult;
                    }
                }

                // 에러 생성 (상태 코드와 본문 보존)
                const error = new Error(body.message || `HTTP ${status}`);
                error.status = status;
                error.body = body;
                error.url = fullURL;
                error.method = requestOptions.method;
                throw error;
            }
            
            // 응답 처리
            try {
                let data = await response.json();

                // 데이터 유효성 검사
                if (typeof data !== 'object' || data === null) {
                    throw new Error('Invalid data format: expected object');
                }

                // response 인터셉터 호출
                if (typeof this.interceptors?.response === 'function') {
                    try {
                        const transformed = await this.interceptors.response(data, {
                            url: fullURL,
                            method: requestOptions.method,
                            status: response.status
                        });
                        if (transformed !== undefined) data = transformed;
                    } catch (interceptorError) {
                        this.log('warn', 'Response interceptor error:', interceptorError);
                    }
                }

                return data;
            } catch (e) {
                // 응답이 JSON이 아닌 경우 (예: 204 No Content)
                return { success: true };
            }

        } catch (error) {
            // error 인터셉터 호출
            if (typeof this.interceptors?.error === 'function') {
                try {
                    const fallback = await this.interceptors.error(error, {
                        url: dataURL,
                        method: options.method || 'GET'
                    });
                    // fallback 값 반환 시 에러 무시
                    if (fallback !== undefined) return fallback;
                } catch (interceptorError) {
                    this.log('warn', 'Error interceptor error:', interceptorError);
                }
            }
            this.log('error', 'Failed to fetch data:', error);
            throw error;
        } finally {
            this._untrackRequest();
        }
    }

    /**
     * 여러 API 엔드포인트에서 데이터 가져오기
     */
    async fetchMultipleData(dataConfig, component = null) {
        if (!dataConfig || typeof dataConfig !== 'object') {
            return {};
        }

        const results = {};
        const errors = {};
        
        // 병렬 처리를 위한 Promise 배열
        const promises = Object.entries(dataConfig).map(async ([key, config]) => {
            try {
                let url, options = {};
                
                if (typeof config === 'string') {
                    url = config;
                } else if (typeof config === 'object') {
                    url = config.url;
                    options = { ...config };
                    delete options.url;
                }
                
                if (url) {
                    const data = await this.fetchData(url, component, options);
                    results[key] = data;
                }
            } catch (error) {
                errors[key] = error;
                this.log('warn', `Failed to fetch data for '${key}':`, error);
            }
        });
        
        await Promise.all(promises);
        
        return { results, errors };
    }
    
    /**
     * URL에서 파라미터 치환 처리 ({param} 형식)
     */
    processURLParameters(url, component = null) {
        if (!url || typeof url !== 'string') return url;
        
        let processedURL = url;
        
        // {paramName} 패턴 찾기
        const paramMatches = url.match(/\{([^}]+)\}/g);
        
        if (paramMatches && component) {
            paramMatches.forEach(match => {
                const paramName = match.slice(1, -1); // {id} -> id
                
                try {
                    let paramValue = null;

                    // 1. computed 속성에서 찾기 (최우선)
                    if (component.$options?.computed?.[paramName]) {
                        paramValue = component[paramName];
                    }

                    // 2. 컴포넌트 data에서 찾기
                    if (paramValue === null || paramValue === undefined) {
                        paramValue = component[paramName];
                    }

                    // 3. 라우트/쿼리 파라미터에서 찾기
                    if (paramValue === null || paramValue === undefined) {
                        if (component.getParam) {
                            paramValue = component.getParam(paramName);
                        }
                    }

                    // 4. QueryManager에서 직접 가져오기 (fallback)
                    if (paramValue === null || paramValue === undefined) {
                        paramValue = this.router.queryManager?.getParam(paramName);
                    }
                    
                    if (paramValue !== null && paramValue !== undefined) {
                        // 파라미터 치환: {id} -> 실제값
                        processedURL = processedURL.replace(
                            match, 
                            encodeURIComponent(paramValue)
                        );
                        
                        this.log('debug', `URL parameter resolved: ${paramName} = ${paramValue}`);
                    } else {
                        this.log('warn', `URL parameter '${paramName}' not found, keeping original: ${match}`);
                    }
                } catch (error) {
                    this.log('warn', `Error processing URL parameter '${paramName}':`, error);
                }
            });
        }
        
        return processedURL;
    }

    /**
     * HTTP 메서드별 헬퍼 함수들
     */
    async get(url, component = null, options = {}) {
        return this.fetchData(url, component, { ...options, method: 'GET' });
    }

    async post(url, data, component = null, options = {}) {
        return this.fetchData(url, component, { ...options, method: 'POST', data });
    }

    async put(url, data, component = null, options = {}) {
        return this.fetchData(url, component, { ...options, method: 'PUT', data });
    }

    async patch(url, data, component = null, options = {}) {
        return this.fetchData(url, component, { ...options, method: 'PATCH', data });
    }

    async delete(url, component = null, options = {}) {
        return this.fetchData(url, component, { ...options, method: 'DELETE' });
    }

    /**
     * 컴포넌트에 바인딩된 API 객체 생성
     */
    bindToComponent(component) {
        return {
            get: (url, options = {}) => this.get(url, component, options),
            post: (url, data, options = {}) => this.post(url, data, component, options),
            put: (url, data, options = {}) => this.put(url, data, component, options),
            patch: (url, data, options = {}) => this.patch(url, data, component, options),
            delete: (url, options = {}) => this.delete(url, component, options),
            fetchData: (url, options = {}) => this.fetchData(url, component, options),
            fetchMultipleData: (dataConfig) => this.fetchMultipleData(dataConfig, component)
        };
    }

    /**
     * 절대 URL인지 확인
     */
    isAbsoluteURL(url) {
        return /^https?:\/\//.test(url) || url.startsWith('//');
    }

    /**
     * 두 URL을 조합
     */
    combineURLs(baseURL, relativeURL) {
        // 베이스 URL 끝의 슬래시 제거
        const cleanBase = baseURL.replace(/\/$/, '');
        // 상대 URL 앞의 슬래시 확인
        const cleanRelative = relativeURL.startsWith('/') ? relativeURL : `/${relativeURL}`;
        return `${cleanBase}${cleanRelative}`;
    }

    /**
     * refreshFunction 콜백 함수 가져오기
     */
    _getRefreshCallback() {
        const callback = this.router?.config?.refreshFunction;
        return typeof callback === 'function' ? callback : null;
    }

    /**
     * 토큰 갱신 처리 (동시 요청 큐잉 포함)
     * 여러 요청이 동시에 401을 받아도 갱신은 1번만 실행
     */
    async _handleTokenRefresh() {
        // 이미 갱신 중이면 기존 Promise를 대기
        if (this._refreshingToken && this._refreshPromise) {
            this.log('debug', '이미 토큰 갱신 진행 중, 대기...');
            return await this._refreshPromise;
        }

        this._refreshingToken = true;
        this._refreshPromise = this._executeTokenRefresh();

        try {
            return await this._refreshPromise;
        } finally {
            this._refreshingToken = false;
            this._refreshPromise = null;
        }
    }

    /**
     * 실제 토큰 갱신 실행
     */
    async _executeTokenRefresh() {
        const refreshCallback = this._getRefreshCallback();
        if (!refreshCallback) return false;

        try {
            const authManager = this.router?.authManager;
            if (!authManager) return false;

            // 현재 refresh token을 콜백에 전달 (콜백은 서버 호출만 담당)
            const currentRefreshToken = authManager.getRefreshToken();
            const result = await refreshCallback(currentRefreshToken);

            if (!result || !result.accessToken) {
                this.log('warn', '갱신 콜백이 유효한 토큰을 반환하지 않음');
                return false;
            }

            // 새 액세스 토큰 저장
            const tokenSet = authManager.setAccessToken(result.accessToken);
            if (!tokenSet) {
                this.log('warn', '새 액세스 토큰 저장 실패 (만료된 토큰?)');
                return false;
            }

            // 리프레시 토큰도 반환된 경우 업데이트
            if (result.refreshToken) {
                authManager.setRefreshToken(result.refreshToken);
            }

            authManager.emitAuthEvent('token_refreshed', {
                hasNewRefreshToken: !!result.refreshToken
            });

            this.log('info', '토큰 갱신 완료');
            return true;
        } catch (error) {
            this.log('error', '토큰 갱신 콜백 실행 실패:', error);
            return false;
        }
    }

    /**
     * 갱신된 토큰으로 원래 요청 재시도 (_isRetry로 무한 재귀 방지)
     */
    async _retryRequest(dataURL, component, options) {
        return await this.fetchData(dataURL, component, { ...options, _isRetry: true });
    }

    /**
     * 토큰 갱신 실패 시 처리 (로그아웃 + 로그인 페이지 이동)
     */
    _handleRefreshFailure() {
        const authManager = this.router?.authManager;
        if (authManager) {
            authManager.emitAuthEvent('token_refresh_failed', {});
            authManager.logout();
        }
    }

    /**
     * 상태 코드에 맞는 errorHandler를 찾아 실행
     * 정확한 코드(403) 우선, 범위 핸들러('4xx') 후순위
     * @param {number} status - HTTP 상태 코드
     * @param {Object} context - { status, body, url, method }
     * @returns {*} 핸들러 반환값 (undefined면 에러 계속 전파)
     */
    async _executeErrorHandler(status, context) {
        if (!this.errorHandlers) return undefined;

        // 1순위: 정확한 상태 코드 핸들러
        const exactHandler = this.errorHandlers[status];
        if (typeof exactHandler === 'function') {
            try {
                const result = await exactHandler(context);
                if (result !== undefined) return result;
            } catch (handlerError) {
                this.log('warn', `errorHandler[${status}] 실행 에러:`, handlerError);
            }
        }

        // 2순위: 범위 핸들러 ('4xx', '5xx' 등)
        const rangeKey = this._getStatusRangeKey(status);
        if (rangeKey) {
            const rangeHandler = this.errorHandlers[rangeKey];
            if (typeof rangeHandler === 'function') {
                try {
                    const result = await rangeHandler(context);
                    if (result !== undefined) return result;
                } catch (handlerError) {
                    this.log('warn', `errorHandler[${rangeKey}] 실행 에러:`, handlerError);
                }
            }
        }

        return undefined;
    }

    /**
     * 상태 코드에 해당하는 범위 키 반환 (403 → '4xx', 500 → '5xx')
     */
    _getStatusRangeKey(status) {
        if (status >= 100 && status < 600) {
            return `${Math.floor(status / 100)}xx`;
        }
        return null;
    }

    /**
     * 정리 (메모리 누수 방지)
     */
    destroy() {
        this.log('debug', 'ApiHandler destroyed');
        this._refreshingToken = false;
        this._refreshPromise = null;
        this._tracking = false;
        this._pendingCount = 0;
        this._resolveAllSettled();
        this.router = null;
    }
}