/**
 * ViewLogic Query Management System
 * URL 쿼리 파라미터 관리 시스템
 */
export class QueryManager {
    constructor(router, options = {}) {
        this.config = {
            enableParameterValidation: options.enableParameterValidation !== false,
            logSecurityWarnings: options.logSecurityWarnings !== false,
            maxParameterLength: options.maxParameterLength || 1000,
            maxArraySize: options.maxArraySize || 100,
            maxParameterCount: options.maxParameterCount || 50,
            allowedKeyPattern: options.allowedKeyPattern || /^[a-zA-Z0-9_\-]+$/,
            debug: options.debug || false
        };
        
        // 라우터 인스턴스 참조
        this.router = router;
        
        // 현재 쿼리 파라미터 상태
        this.currentQueryParams = {};
        
        this.log('info', 'QueryManager initialized with config:', this.config);
    }

    /**
     * 로깅 래퍼 메서드
     */
    log(level, ...args) {
        if (this.router?.errorHandler) {
            this.router.errorHandler.log(level, 'QueryManager', ...args);
        }
    }

    /**
     * 파라미터 값 sanitize (XSS, SQL Injection 방어)
     */
    sanitizeParameter(value) {
        if (typeof value !== 'string') return value;
        
        // XSS 방어: HTML 태그와 스크립트 제거
        let sanitized = value
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // script 태그 제거
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // iframe 태그 제거
            .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '') // object 태그 제거
            .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '') // embed 태그 제거
            .replace(/<link\b[^<]*>/gi, '') // link 태그 제거
            .replace(/<meta\b[^<]*>/gi, '') // meta 태그 제거
            .replace(/javascript:/gi, '') // javascript: 프로토콜 제거
            .replace(/vbscript:/gi, '') // vbscript: 프로토콜 제거
            .replace(/data:/gi, '') // data: 프로토콜 제거
            .replace(/on\w+\s*=/gi, '') // 이벤트 핸들러 제거 (onclick, onload 등)
            .replace(/expression\s*\(/gi, '') // CSS expression 제거
            .replace(/url\s*\(/gi, ''); // CSS url() 제거
        
        // SQL Injection 방어: 위험한 SQL 키워드 필터링
        const sqlPatterns = [
            /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute|sp_|xp_)\b)/gi,
            /(;|\||&|\*|%|<|>)/g, // 위험한 특수문자
            /(--|\/\*|\*\/)/g, // SQL 주석
            /(\bor\b.*\b=\b|\band\b.*\b=\b)/gi, // OR/AND 조건문
            /('.*'|".*")/g, // 따옴표로 둘러싸인 문자열
            /(\\\w+)/g // 백슬래시 이스케이프
        ];
        
        for (const pattern of sqlPatterns) {
            sanitized = sanitized.replace(pattern, '');
        }
        
        // 추가 보안: 연속된 특수문자 제거
        sanitized = sanitized.replace(/[<>'"&]{2,}/g, '');
        
        // 길이 제한 (DoS 방어)
        if (sanitized.length > this.config.maxParameterLength) {
            sanitized = sanitized.substring(0, this.config.maxParameterLength);
        }
        
        return sanitized.trim();
    }

    /**
     * 파라미터 유효성 검증
     */
    validateParameter(key, value) {
        // 보안 검증이 비활성화된 경우 통과
        if (!this.config.enableParameterValidation) {
            return true;
        }
        
        // 파라미터 키 검증
        if (typeof key !== 'string' || key.length === 0) {
            return false;
        }
        
        // 키 이름 제한
        if (!this.config.allowedKeyPattern.test(key)) {
            if (this.config.logSecurityWarnings) {
                console.warn(`Invalid parameter key format: ${key}`);
            }
            return false;
        }
        
        // 키 길이 제한
        if (key.length > 50) {
            if (this.config.logSecurityWarnings) {
                console.warn(`Parameter key too long: ${key}`);
            }
            return false;
        }
        
        // 값 타입 검증
        if (value !== null && value !== undefined) {
            if (typeof value === 'string') {
                // 문자열 길이 제한
                if (value.length > this.config.maxParameterLength) {
                    if (this.config.logSecurityWarnings) {
                        console.warn(`Parameter value too long for key: ${key}`);
                    }
                    return false;
                }
                
                // 위험한 패턴 감지
                const dangerousPatterns = [
                    /<script|<iframe|<object|<embed/gi,
                    /javascript:|vbscript:|data:/gi,
                    /union.*select|insert.*into|delete.*from/gi,
                    /\.\.\//g, // 경로 탐색 공격
                    /[<>'"&]{3,}/g // 연속된 특수문자
                ];
                
                for (const pattern of dangerousPatterns) {
                    if (pattern.test(value)) {
                        if (this.config.logSecurityWarnings) {
                            console.warn(`Dangerous pattern detected in parameter ${key}:`, value);
                        }
                        return false;
                    }
                }
            } else if (Array.isArray(value)) {
                // 배열 길이 제한
                if (value.length > this.config.maxArraySize) {
                    if (this.config.logSecurityWarnings) {
                        console.warn(`Parameter array too large for key: ${key}`);
                    }
                    return false;
                }
                
                // 배열 각 요소 검증
                for (const item of value) {
                    if (!this.validateParameter(`${key}[]`, item)) {
                        return false;
                    }
                }
            }
        }
        
        return true;
    }

    /**
     * 쿼리스트링 파싱
     */
    parseQueryString(queryString) {
        const params = {};
        if (!queryString) return params;
        
        const pairs = queryString.split('&');
        for (const pair of pairs) {
            try {
                const [rawKey, rawValue] = pair.split('=');
                if (!rawKey) continue;
                
                let key, value;
                try {
                    key = decodeURIComponent(rawKey);
                    value = rawValue ? decodeURIComponent(rawValue) : '';
                } catch (e) {
                    this.log('warn', 'Failed to decode URI component:', pair);
                    continue;
                }
                
                // 보안 검증
                if (!this.validateParameter(key, value)) {
                    this.log('warn', `Parameter rejected by security filter: ${key}`);
                    continue;
                }
                
                // 값 sanitize
                const sanitizedValue = this.sanitizeParameter(value);
                
                // 배열 형태의 파라미터 처리 (예: tags[]=a&tags[]=b)
                if (key.endsWith('[]')) {
                    const arrayKey = key.slice(0, -2);
                    
                    // 배열 키도 검증
                    if (!this.validateParameter(arrayKey, [])) {
                        continue;
                    }
                    
                    if (!params[arrayKey]) params[arrayKey] = [];
                    
                    // 배열 크기 제한
                    if (params[arrayKey].length < this.config.maxArraySize) {
                        params[arrayKey].push(sanitizedValue);
                    } else {
                        if (this.config.logSecurityWarnings) {
                            console.warn(`Array parameter ${arrayKey} size limit exceeded`);
                        }
                    }
                } else {
                    params[key] = sanitizedValue;
                }
            } catch (error) {
                this.log('error', 'Error parsing query parameter:', pair, error);
            }
        }
        
        // 전체 파라미터 개수 제한
        const paramCount = Object.keys(params).length;
        if (paramCount > this.config.maxParameterCount) {
            if (this.config.logSecurityWarnings) {
                console.warn(`Too many parameters (${paramCount}). Limiting to first ${this.config.maxParameterCount}.`);
            }
            const limitedParams = {};
            let count = 0;
            for (const [key, value] of Object.entries(params)) {
                if (count >= this.config.maxParameterCount) break;
                limitedParams[key] = value;
                count++;
            }
            return limitedParams;
        }
        
        return params;
    }

    /**
     * 쿼리스트링 생성
     */
    buildQueryString(params) {
        if (!params || Object.keys(params).length === 0) return '';
        
        const pairs = [];
        for (const [key, value] of Object.entries(params)) {
            if (Array.isArray(value)) {
                // 배열 파라미터 처리
                for (const item of value) {
                    pairs.push(`${encodeURIComponent(key)}[]=${encodeURIComponent(item)}`);
                }
            } else if (value !== undefined && value !== null) {
                pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
            }
        }
        return pairs.join('&');
    }

    /**
     * 쿼리 파라미터 변경 감지
     */
    hasQueryParamsChanged(newParams) {
        if (!this.currentQueryParams && !newParams) return false;
        if (!this.currentQueryParams || !newParams) return true;
        
        const oldKeys = Object.keys(this.currentQueryParams);
        const newKeys = Object.keys(newParams);
        
        if (oldKeys.length !== newKeys.length) return true;
        
        for (const key of oldKeys) {
            if (JSON.stringify(this.currentQueryParams[key]) !== JSON.stringify(newParams[key])) {
                return true;
            }
        }
        return false;
    }

    /**
     * 현재 쿼리 파라미터 전체 가져오기
     */
    getQueryParams() {
        return { ...this.currentQueryParams };
    }

    /**
     * 특정 쿼리 파라미터 가져오기
     */
    getQueryParam(key) {
        return this.currentQueryParams ? this.currentQueryParams[key] : undefined;
    }

    /**
     * 쿼리 파라미터 설정
     */
    setQueryParams(params, replace = false) {
        if (!params || typeof params !== 'object') {
            console.warn('Invalid parameters object provided to setQueryParams');
            return;
        }
        
        const currentParams = replace ? {} : { ...this.currentQueryParams };
        const sanitizedParams = {};
        
        // 파라미터 검증 및 sanitize
        for (const [key, value] of Object.entries(params)) {
            // 키와 값 검증
            if (!this.validateParameter(key, value)) {
                console.warn(`Parameter ${key} rejected by security filter`);
                continue;
            }
            
            // 값 처리
            if (value !== undefined && value !== null) {
                if (Array.isArray(value)) {
                    sanitizedParams[key] = value.map(item => this.sanitizeParameter(item));
                } else {
                    sanitizedParams[key] = this.sanitizeParameter(value);
                }
            }
        }
        
        // 현재 파라미터 업데이트
        Object.assign(currentParams, sanitizedParams);
        
        // undefined나 null 값 제거
        for (const [key, value] of Object.entries(currentParams)) {
            if (value === undefined || value === null || value === '') {
                delete currentParams[key];
            }
        }
        
        // 최대 파라미터 개수 확인
        const paramCount = Object.keys(currentParams).length;
        if (paramCount > this.config.maxParameterCount) {
            if (this.config.logSecurityWarnings) {
                console.warn(`Too many parameters after update (${paramCount}). Some parameters may be dropped.`);
            }
        }
        
        this.currentQueryParams = currentParams;
        this.updateURL();
    }

    /**
     * 쿼리 파라미터 제거
     */
    removeQueryParams(keys) {
        if (!keys) return;
        
        const keysToRemove = Array.isArray(keys) ? keys : [keys];
        for (const key of keysToRemove) {
            delete this.currentQueryParams[key];
        }
        
        this.updateURL();
    }

    /**
     * 쿼리 파라미터 초기화
     */
    clearQueryParams() {
        this.currentQueryParams = {};
        this.updateURL();
    }

    /**
     * 현재 쿼리 파라미터 설정 (라우터에서 호출)
     */
    setCurrentQueryParams(params) {
        this.currentQueryParams = params || {};
    }

    /**
     * URL 업데이트 (라우터의 updateURL 메소드 호출)
     */
    updateURL() {
        if (this.router && typeof this.router.updateURL === 'function') {
            const route = this.router.currentHash || 'home';
            this.router.updateURL(route, this.currentQueryParams);
        }
    }

    /**
     * 쿼리 파라미터 통계
     */
    getStats() {
        return {
            currentParams: Object.keys(this.currentQueryParams).length,
            maxAllowed: this.config.maxParameterCount,
            validationEnabled: this.config.enableParameterValidation,
            currentQueryString: this.buildQueryString(this.currentQueryParams)
        };
    }

    /**
     * 정리 (메모리 누수 방지)
     */
    destroy() {
        this.currentQueryParams = {};
        this.router = null;
        this.log('debug', 'QueryManager destroyed');
    }
}