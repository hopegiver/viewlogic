/**
 * ViewLogic Internationalization System
 * 다국어 지원 시스템
 */
class I18n {
    constructor(options = {}) {
        this.config = {
            enabled: options.enabled !== undefined ? options.enabled : true,
            defaultLanguage: options.defaultLanguage || 'ko',
            fallbackLanguage: options.fallbackLanguage || 'ko',
            cacheKey: options.cacheKey || 'viewlogic_lang',
            debug: options.debug || false
        };
        
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
            this.log('I18n system disabled');
            return;
        }
        
        // 캐시에서 언어 설정 로드
        this.loadLanguageFromCache();
        
        // URL 쿼리 파라미터에서 언어 확인
        this.loadLanguageFromQuery();
        
        this.log('I18n system initialized', { currentLanguage: this.currentLanguage });
        
        // 초기 언어 파일 자동 로드
        try {
            await this.loadMessages(this.currentLanguage);
            this.log('Initial language file loaded successfully:', this.currentLanguage);
        } catch (error) {
            this.log('Failed to load initial language file:', error);
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
                this.log('Language loaded from cache:', cachedLang);
            }
        } catch (error) {
            this.log('Failed to load language from cache:', error);
        }
    }

    /**
     * URL 쿼리 파라미터에서 언어 로드
     */
    loadLanguageFromQuery() {
        if (typeof window !== 'undefined') {
            // 먼저 router에서 시도
            if (window.router && window.router.getQueryParam) {
                const langFromQuery = window.router.getQueryParam('lang');
                if (langFromQuery && this.isValidLanguage(langFromQuery)) {
                    this.setLanguage(langFromQuery);
                    this.log('Language loaded from query via router:', langFromQuery);
                    return;
                }
            }
            
            // router가 없으면 직접 URL에서 파싱
            const urlParams = new URLSearchParams(window.location.search);
            const langFromUrl = urlParams.get('lang');
            if (langFromUrl && this.isValidLanguage(langFromUrl)) {
                this.setLanguage(langFromUrl);
                this.log('Language loaded from URL directly:', langFromUrl);
            }
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
            this.log('Invalid language code:', language);
            return false;
        }

        if (this.currentLanguage === language) {
            this.log('Language already set to:', language);
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
            
            this.log('Language changed successfully', { from: oldLanguage, to: language });
            return true;
        } catch (error) {
            // 실패 시 이전 언어로 복원
            this.currentLanguage = oldLanguage;
            this.log('Failed to change language:', error);
            return false;
        }
    }

    /**
     * 언어를 캐시에 저장
     */
    saveLanguageToCache(language) {
        try {
            localStorage.setItem(this.config.cacheKey, language);
            this.log('Language saved to cache:', language);
        } catch (error) {
            this.log('Failed to save language to cache:', error);
        }
    }

    /**
     * 언어 메시지 파일 로드
     */
    async loadMessages(language) {
        // 이미 로드된 경우
        if (this.messages.has(language)) {
            this.log('Messages already loaded for:', language);
            return this.messages.get(language);
        }

        // 이미 로딩 중인 경우
        if (this.loadPromises.has(language)) {
            this.log('Messages loading in progress for:', language);
            return await this.loadPromises.get(language);
        }

        const loadPromise = this._loadMessagesFromFile(language);
        this.loadPromises.set(language, loadPromise);

        try {
            const messages = await loadPromise;
            this.messages.set(language, messages);
            this.loadPromises.delete(language);
            this.log('Messages loaded successfully for:', language);
            return messages;
        } catch (error) {
            this.loadPromises.delete(language);
            throw error;
        }
    }

    /**
     * 파일에서 메시지 로드
     */
    async _loadMessagesFromFile(language) {
        try {
            const module = await import(`../i18n/${language}.js`);
            return module.default || module;
        } catch (error) {
            this.log('Failed to load messages file for:', language, error);
            
            // 폴백 언어 시도
            if (language !== this.config.fallbackLanguage) {
                this.log('Trying fallback language:', this.config.fallbackLanguage);
                return await this._loadMessagesFromFile(this.config.fallbackLanguage);
            }
            
            throw new Error(`Failed to load messages for language: ${language}`);
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
            this.log('No messages loaded for current language:', this.currentLanguage);
            return key;
        }

        const message = this.getNestedValue(messages, key);
        if (message === undefined) {
            this.log('Translation not found for key:', key);
            
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
                    this.log('Error in event listener:', error);
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
     * 디버그 로그
     */
    log(...args) {
        if (this.config.debug) {
            console.log('[I18n]', ...args);
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
            this.log('I18n initialization failed:', error);
            return false;
        }
    }
    
    /**
     * i18n 설정 변경
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        // enabled 상태가 변경된 경우 재초기화
        if (newConfig.hasOwnProperty('enabled')) {
            if (newConfig.enabled && !this.isInitialized) {
                this.init();
            }
        }
        
        this.log('Config updated:', this.config);
    }
    
    /**
     * 시스템 초기화 (현재 언어의 메시지 로드)
     */
    async initialize() {
        if (!this.config.enabled) {
            this.log('I18n system is disabled, skipping initialization');
            return true;
        }
        
        try {
            // 초기 설정이 완료될 때까지 대기
            await this.initPromise;
            this.log('I18n system fully initialized');
            return true;
        } catch (error) {
            this.log('Failed to initialize I18n system:', error);
            return false;
        }
    }
}

// 전역 인스턴스 생성 및 설정
// 사용자가 직접 설정할 수 있도록 window.I18nConfig를 확인
const userConfig = (typeof window !== 'undefined' && window.I18nConfig) ? window.I18nConfig : {};

const defaultConfig = {
    enabled: true,           // 다국어 시스템 활성화 여부
    defaultLanguage: 'ko',   // 기본 언어
    fallbackLanguage: 'ko',  // 폴백 언어
    debug: true              // 개발 모드에서는 true로 설정
};

const finalConfig = { ...defaultConfig, ...userConfig };

if (typeof window !== 'undefined') {
    window.i18n = new I18n(finalConfig);
}

export default I18n;