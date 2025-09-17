/**
 * ViewLogic Query Management System
 * URL 쿼리 파라미터 관리 시스템
 */
export class QueryManager {
    constructor(router) {
        // 라우터 인스턴스 참조
        this.router = router;

        // 현재 쿼리 파라미터 상태
        this.currentQueryParams = {};

        // 현재 라우팅 파라미터 상태 (navigateTo로 전달된 params)
        this.currentRouteParams = {};

        this.log('debug', 'QueryManager initialized');
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
     * 쿼리스트링 파싱
     */
    parseQueryString(queryString) {
        const params = {};
        if (!queryString) return params;

        const pairs = queryString.split('&');
        for (const pair of pairs) {
            const [rawKey, rawValue] = pair.split('=');
            if (!rawKey) continue;

            try {
                const key = decodeURIComponent(rawKey);
                const value = rawValue ? decodeURIComponent(rawValue) : '';

                // 배열 형태의 파라미터 처리 (예: tags[]=a&tags[]=b)
                if (key.endsWith('[]')) {
                    const arrayKey = key.slice(0, -2);
                    if (!params[arrayKey]) params[arrayKey] = [];
                    params[arrayKey].push(value);
                } else {
                    params[key] = value;
                }
            } catch (error) {
                this.log('warn', 'Failed to decode query parameter:', pair);
            }
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
    getQueryParam(key, defaultValue = undefined) {
        const value = this.currentQueryParams ? this.currentQueryParams[key] : undefined;
        return value !== undefined ? value : defaultValue;
    }

    /**
     * 쿼리 파라미터 설정
     */
    setQueryParams(params, replace = false) {
        if (!params || typeof params !== 'object') {
            this.log('warn', 'Invalid parameters object provided to setQueryParams');
            return;
        }

        const currentParams = replace ? {} : { ...this.currentQueryParams };

        // 파라미터 업데이트
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== null && value !== '') {
                currentParams[key] = value;
            } else {
                delete currentParams[key];
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
     * 현재 라우팅 파라미터 설정 (navigateTo에서 호출)
     */
    setCurrentRouteParams(params) {
        this.currentRouteParams = params || {};
        this.log('debug', 'Route params set:', this.currentRouteParams);
    }

    /**
     * 통합된 파라미터 반환 (라우팅 파라미터 + 쿼리 파라미터)
     */
    getAllParams() {
        return {
            ...this.currentRouteParams,
            ...this.currentQueryParams
        };
    }

    /**
     * 통합된 파라미터에서 특정 키 값 반환
     */
    getParam(key, defaultValue = undefined) {
        // 쿼리 파라미터가 라우팅 파라미터보다 우선순위 높음
        const value = this.currentQueryParams[key] !== undefined ?
                     this.currentQueryParams[key] :
                     this.currentRouteParams[key];
        return value !== undefined ? value : defaultValue;
    }

    /**
     * 라우팅 파라미터만 반환
     */
    getRouteParams() {
        return { ...this.currentRouteParams };
    }

    /**
     * 라우팅 파라미터에서 특정 키 값 반환
     */
    getRouteParam(key, defaultValue = undefined) {
        const value = this.currentRouteParams[key];
        return value !== undefined ? value : defaultValue;
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
            currentQueryString: this.buildQueryString(this.currentQueryParams)
        };
    }

    /**
     * 정리 (메모리 누수 방지)
     */
    destroy() {
        this.currentQueryParams = {};
        this.currentRouteParams = {};
        this.router = null;
        this.log('debug', 'QueryManager destroyed');
    }
}