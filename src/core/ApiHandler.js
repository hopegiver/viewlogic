/**
 * ApiHandler
 * API 호출 및 데이터 처리 시스템
 */
export class ApiHandler {
    constructor(router, options = {}) {
        this.router = router;
        this.config = {
            debug: options.debug || false,
            timeout: options.timeout || 10000,
            retries: options.retries || 1,
            ...options
        };
        
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
     * 컴포넌트 데이터 가져오기 (파라미터 치환 지원)
     */
    async fetchData(dataURL, component = null, options = {}) {
        try {
            // URL에서 파라미터 치환
            let processedURL = this.processURLParameters(dataURL, component);
            
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

            // 인증 토큰 자동 추가
            if (component?.$getToken && component.$getToken()) {
                requestOptions.headers['Authorization'] = `Bearer ${component.$getToken()}`;
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
                let error;
                try {
                    error = await response.json();
                } catch (e) {
                    error = { message: `HTTP ${response.status}: ${response.statusText}` };
                }
                throw new Error(error.message || `HTTP ${response.status}`);
            }
            
            // 응답 처리
            try {
                const data = await response.json();
                
                // 데이터 유효성 검사
                if (typeof data !== 'object' || data === null) {
                    throw new Error('Invalid data format: expected object');
                }
                
                return data;
            } catch (e) {
                // 응답이 JSON이 아닌 경우 (예: 204 No Content)
                return { success: true };
            }
            
        } catch (error) {
            this.log('error', 'Failed to fetch data:', error);
            throw error;
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
                    
                    // 1. 라우트/쿼리 파라미터에서 찾기
                    if (component.getParam) {
                        paramValue = component.getParam(paramName);
                    }
                    
                    // 2. 컴포넌트 data에서 찾기
                    if (paramValue === null || paramValue === undefined) {
                        paramValue = component[paramName];
                    }
                    
                    // 3. computed 속성에서 찾기
                    if (paramValue === null || paramValue === undefined) {
                        if (component.$options?.computed?.[paramName]) {
                            paramValue = component[paramName];
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
     * 정리 (메모리 누수 방지)
     */
    destroy() {
        this.log('debug', 'ApiHandler destroyed');
        this.router = null;
    }
}