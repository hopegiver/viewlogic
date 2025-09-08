/**
 * ViewLogic Internationalization System
 * 다국어 지원 시스템
 */
export class I18nManager {
    constructor(router, options = {}) {
        this.config = {
            enabled: options.useI18n !== undefined ? options.useI18n : true,
            defaultLanguage: options.defaultLanguage || 'ko',
            fallbackLanguage: options.defaultLanguage || 'ko',
            cacheKey: options.cacheKey || 'viewlogic_lang',
            dataCacheKey: options.dataCacheKey || 'viewlogic_i18n_data',
            cacheVersion: options.cacheVersion || '1.0.0',
            enableDataCache: options.enableDataCache !== false,
            debug: options.debug || false
        };
        
        // 라우터 인스턴스 참조 (필요시 언어 변경 시 라우터 상태 업데이트)
        this.router = router;
        
        this.messages = new Map();
        this.currentLanguage = this.config.defaultLanguage;
        this.isLoading = false;
        this.loadPromises = new Map();
        
        // 이벤트 리스너들
        this.listeners = {
            languageChanged: []
        };
        
        // 비동기 초기화 시작 (constructor 내에서는 await 불가)
        this.initPromise = this.init();
    }

    async init() {
        // i18n이 비활성화된 경우 초기화하지 않음
        if (!this.config.enabled) {
            this.log('info', 'I18n system disabled');
            return;
        }
        
        // 캐시에서 언어 설정 로드
        this.loadLanguageFromCache();
        
        // 개발 모드에서는 캐시 비활성화
        if (this.config.debug) {
            this.config.enableDataCache = false;
            this.log('debug', 'Data cache disabled in debug mode');
        }
        
        // 초기 언어 파일 자동 로드 (아직 로드되지 않은 경우에만)
        if (!this.messages.has(this.currentLanguage)) {
            try {
                await this.loadMessages(this.currentLanguage);
            } catch (error) {
                this.log('error', 'Failed to load initial language file:', error);
            }
        } else {
            this.log('debug', 'Language messages already loaded:', this.currentLanguage);
        }
    }

    /**
     * 캐시에서 언어 설정 로드
     */
    loadLanguageFromCache() {
        try {
            const cachedLang = localStorage.getItem(this.config.cacheKey);
            if (cachedLang && this.isValidLanguage(cachedLang)) {
                this.currentLanguage = cachedLang;
                this.log('debug', 'Language loaded from cache:', cachedLang);
            }
        } catch (error) {
            this.log('warn', 'Failed to load language from cache:', error);
        }
    }


    /**
     * 언어 유효성 검사
     */
    isValidLanguage(lang) {
        return typeof lang === 'string' && /^[a-z]{2}$/.test(lang);
    }

    /**
     * 현재 언어 반환
     */
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    /**
     * 언어 변경
     */
    async setLanguage(language) {
        if (!this.isValidLanguage(language)) {
            this.log('warn', 'Invalid language code:', language);
            return false;
        }

        if (this.currentLanguage === language) {
            this.log('debug', 'Language already set to:', language);
            return true;
        }

        const oldLanguage = this.currentLanguage;
        this.currentLanguage = language;

        try {
            // 언어 파일 로드
            await this.loadMessages(language);
            
            // 캐시에 저장
            this.saveLanguageToCache(language);
            
            // 이벤트 발생
            this.emit('languageChanged', {
                from: oldLanguage,
                to: language,
                messages: this.messages.get(language)
            });
            
            this.log('info', 'Language changed successfully', { from: oldLanguage, to: language });
            return true;
        } catch (error) {
            // 실패 시 이전 언어로 복원
            this.currentLanguage = oldLanguage;
            this.log('error', 'Failed to change language:', error);
            return false;
        }
    }

    /**
     * 언어를 캐시에 저장
     */
    saveLanguageToCache(language) {
        try {
            localStorage.setItem(this.config.cacheKey, language);
            this.log('debug', 'Language saved to cache:', language);
        } catch (error) {
            this.log('warn', 'Failed to save language to cache:', error);
        }
    }

    /**
     * 언어 메시지 파일 로드
     */
    async loadMessages(language) {
        // 이미 로드된 경우
        if (this.messages.has(language)) {
            this.log('debug', 'Messages already loaded for:', language);
            return this.messages.get(language);
        }

        // 이미 로딩 중인 경우
        if (this.loadPromises.has(language)) {
            this.log('debug', 'Messages loading in progress for:', language);
            return await this.loadPromises.get(language);
        }

        const loadPromise = this._loadMessagesFromFile(language);
        this.loadPromises.set(language, loadPromise);

        try {
            const messages = await loadPromise;
            this.messages.set(language, messages);
            this.loadPromises.delete(language);
            this.log('debug', 'Messages loaded successfully for:', language);
            return messages;
        } catch (error) {
            this.loadPromises.delete(language);
            throw error;
        }
    }

    /**
     * 파일에서 메시지 로드 (캐싱 지원)
     */
    async _loadMessagesFromFile(language) {
        // 캐시에서 먼저 시도
        if (this.config.enableDataCache) {
            const cachedData = this.getDataFromCache(language);
            if (cachedData) {
                this.log('debug', 'Messages loaded from cache:', language);
                return cachedData;
            }
        }
        
        try {
            // JSON 파일로 변경
            const response = await fetch(`../i18n/${language}.json`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const messages = await response.json();
            
            // 캐시에 저장
            if (this.config.enableDataCache) {
                this.saveDataToCache(language, messages);
            }
            
            return messages;
        } catch (error) {
            this.log('error', 'Failed to load messages file for:', language, error);
            
            // 폴백 언어 시도
            if (language !== this.config.fallbackLanguage) {
                this.log('info', 'Trying fallback language:', this.config.fallbackLanguage);
                return await this._loadMessagesFromFile(this.config.fallbackLanguage);
            }
            
            throw new Error(`Failed to load messages for language: ${language}`);
        }
    }
    
    /**
     * 언어 데이터를 캐시에서 가져오기
     */
    getDataFromCache(language) {
        try {
            const cacheKey = `${this.config.dataCacheKey}_${language}_${this.config.cacheVersion}`;
            const cachedItem = localStorage.getItem(cacheKey);
            
            if (cachedItem) {
                const { data, timestamp, version } = JSON.parse(cachedItem);
                
                // 버전 확인
                if (version !== this.config.cacheVersion) {
                    this.log('debug', 'Cache version mismatch, clearing:', language);
                    localStorage.removeItem(cacheKey);
                    return null;
                }
                
                // TTL 확인 (24시간)
                const now = Date.now();
                const maxAge = 24 * 60 * 60 * 1000; // 24시간
                
                if (now - timestamp > maxAge) {
                    this.log('debug', 'Cache expired, removing:', language);
                    localStorage.removeItem(cacheKey);
                    return null;
                }
                
                return data;
            }
        } catch (error) {
            this.log('warn', 'Failed to read from cache:', error);
        }
        
        return null;
    }
    
    /**
     * 언어 데이터를 캐시에 저장
     */
    saveDataToCache(language, data) {
        try {
            const cacheKey = `${this.config.dataCacheKey}_${language}_${this.config.cacheVersion}`;
            const cacheItem = {
                data,
                timestamp: Date.now(),
                version: this.config.cacheVersion
            };
            
            localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
            this.log('debug', 'Data saved to cache:', language);
        } catch (error) {
            this.log('warn', 'Failed to save to cache:', error);
        }
    }

    /**
     * 메시지 번역
     */
    t(key, params = {}) {
        // i18n이 비활성화된 경우 키 자체를 반환
        if (!this.config.enabled) {
            return key;
        }
        
        const messages = this.messages.get(this.currentLanguage);
        if (!messages) {
            this.log('warn', 'No messages loaded for current language:', this.currentLanguage);
            return key;
        }

        const message = this.getNestedValue(messages, key);
        if (message === undefined) {
            this.log('warn', 'Translation not found for key:', key);
            
            // 폴백 언어에서 찾기
            const fallbackMessages = this.messages.get(this.config.fallbackLanguage);
            if (fallbackMessages && this.currentLanguage !== this.config.fallbackLanguage) {
                const fallbackMessage = this.getNestedValue(fallbackMessages, key);
                if (fallbackMessage !== undefined) {
                    return this.interpolate(fallbackMessage, params);
                }
            }
            
            return key;
        }

        return this.interpolate(message, params);
    }

    /**
     * 중첩된 객체에서 값 가져오기
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    /**
     * 문자열 보간 처리
     */
    interpolate(message, params) {
        if (typeof message !== 'string') {
            return message;
        }

        return message.replace(/\{(\w+)\}/g, (match, key) => {
            return params.hasOwnProperty(key) ? params[key] : match;
        });
    }

    /**
     * 복수형 처리
     */
    plural(key, count, params = {}) {
        const pluralKey = count === 1 ? `${key}.singular` : `${key}.plural`;
        return this.t(pluralKey, { ...params, count });
    }

    /**
     * 사용 가능한 언어 목록
     */
    getAvailableLanguages() {
        return ['ko', 'en']; // 추후 동적으로 로드하도록 변경 가능
    }

    /**
     * 언어 변경 이벤트 리스너 등록
     */
    on(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
    }

    /**
     * 언어 변경 이벤트 리스너 제거
     */
    off(event, callback) {
        if (this.listeners[event]) {
            const index = this.listeners[event].indexOf(callback);
            if (index > -1) {
                this.listeners[event].splice(index, 1);
            }
        }
    }

    /**
     * 이벤트 발생
     */
    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    this.log('error', 'Error in event listener:', error);
                }
            });
        }
    }

    /**
     * 현재 언어의 모든 메시지 반환
     */
    getMessages() {
        return this.messages.get(this.currentLanguage) || {};
    }

    /**
     * 언어별 날짜 포맷팅
     */
    formatDate(date, options = {}) {
        const locale = this.currentLanguage === 'ko' ? 'ko-KR' : 'en-US';
        return new Intl.DateTimeFormat(locale, options).format(new Date(date));
    }

    /**
     * 언어별 숫자 포맷팅
     */
    formatNumber(number, options = {}) {
        const locale = this.currentLanguage === 'ko' ? 'ko-KR' : 'en-US';
        return new Intl.NumberFormat(locale, options).format(number);
    }

    /**
     * 로깅 래퍼 메서드
     */
    log(level, ...args) {
        if (this.router?.errorHandler) {
            this.router.errorHandler.log(level, 'I18nManager', ...args);
        }
    }

    /**
     * i18n 활성화 여부 확인
     */
    isEnabled() {
        return this.config.enabled;
    }
    
    /**
     * 초기 로딩이 완료되었는지 확인
     */
    async isReady() {
        if (!this.config.enabled) {
            return true;
        }
        
        try {
            await this.initPromise;
            return true;
        } catch (error) {
            this.log('error', 'I18n initialization failed:', error);
            return false;
        }
    }
    
    /**
     * 캐시 초기화 (버전 변경 시 사용)
     */
    clearCache() {
        try {
            const keys = Object.keys(localStorage);
            const cacheKeys = keys.filter(key => key.startsWith(this.config.dataCacheKey));
            
            cacheKeys.forEach(key => {
                localStorage.removeItem(key);
            });
            
            this.log('debug', 'Cache cleared, removed', cacheKeys.length, 'items');
        } catch (error) {
            this.log('warn', 'Failed to clear cache:', error);
        }
    }
    
    /**
     * 캐시 상태 확인
     */
    getCacheInfo() {
        const info = {
            enabled: this.config.enableDataCache,
            version: this.config.cacheVersion,
            languages: {}
        };
        
        try {
            const keys = Object.keys(localStorage);
            const cacheKeys = keys.filter(key => key.startsWith(this.config.dataCacheKey));
            
            cacheKeys.forEach(key => {
                const match = key.match(new RegExp(`${this.config.dataCacheKey}_(\w+)_(.+)`));
                if (match) {
                    const [, language, version] = match;
                    const cachedItem = JSON.parse(localStorage.getItem(key));
                    
                    info.languages[language] = {
                        version,
                        timestamp: cachedItem.timestamp,
                        age: Date.now() - cachedItem.timestamp
                    };
                }
            });
        } catch (error) {
            this.log('warn', 'Failed to get cache info:', error);
        }
        
        return info;
    }
    
    /**
     * 시스템 초기화 (현재 언어의 메시지 로드)
     */
    async initialize() {
        if (!this.config.enabled) {
            this.log('info', 'I18n system is disabled, skipping initialization');
            return true;
        }
        
        try {
            // 초기 설정이 완료될 때까지 대기
            await this.initPromise;
            this.log('info', 'I18n system fully initialized');
            return true;
        } catch (error) {
            this.log('error', 'Failed to initialize I18n system:', error);
            return false;
        }
    }
}