/**
 * ViewLogic v1.0.0
 * (c) 2024 hopegiver
 * @license MIT
 */

// src/plugins/I18nManager.js
var I18nManager = class {
  constructor(router, options = {}) {
    this.config = {
      enabled: options.useI18n !== void 0 ? options.useI18n : true,
      defaultLanguage: options.defaultLanguage || "ko",
      fallbackLanguage: options.defaultLanguage || "ko",
      cacheKey: options.cacheKey || "viewlogic_lang",
      dataCacheKey: options.dataCacheKey || "viewlogic_i18n_data",
      cacheVersion: options.cacheVersion || "1.0.0",
      enableDataCache: options.enableDataCache !== false,
      debug: options.debug || false
    };
    this.router = router;
    this.messages = /* @__PURE__ */ new Map();
    this.currentLanguage = this.config.defaultLanguage;
    this.isLoading = false;
    this.loadPromises = /* @__PURE__ */ new Map();
    this.listeners = {
      languageChanged: []
    };
    this.initPromise = this.init();
  }
  async init() {
    if (!this.config.enabled) {
      this.log("info", "I18n system disabled");
      return;
    }
    this.loadLanguageFromCache();
    if (this.config.debug) {
      this.config.enableDataCache = false;
      this.log("debug", "Data cache disabled in debug mode");
    }
    if (!this.messages.has(this.currentLanguage)) {
      try {
        await this.loadMessages(this.currentLanguage);
      } catch (error) {
        this.log("error", "Failed to load initial language file:", error);
        this.messages.set(this.currentLanguage, {});
        this.log("info", "Using empty message object as fallback");
      }
    } else {
      this.log("debug", "Language messages already loaded:", this.currentLanguage);
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
        this.log("debug", "Language loaded from cache:", cachedLang);
      }
    } catch (error) {
      this.log("warn", "Failed to load language from cache:", error);
    }
  }
  /**
   * 언어 유효성 검사
   */
  isValidLanguage(lang) {
    return typeof lang === "string" && /^[a-z]{2}$/.test(lang);
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
      this.log("warn", "Invalid language code:", language);
      return false;
    }
    if (this.currentLanguage === language) {
      this.log("debug", "Language already set to:", language);
      return true;
    }
    const oldLanguage = this.currentLanguage;
    this.currentLanguage = language;
    try {
      await this.loadMessages(language);
      this.saveLanguageToCache(language);
      this.emit("languageChanged", {
        from: oldLanguage,
        to: language,
        messages: this.messages.get(language)
      });
      this.log("info", "Language changed successfully", { from: oldLanguage, to: language });
      return true;
    } catch (error) {
      this.log("error", "Failed to load messages for language change, using empty messages:", error);
      this.messages.set(language, {});
      this.saveLanguageToCache(language);
      this.emit("languageChanged", {
        from: oldLanguage,
        to: language,
        messages: {},
        error: true
      });
      this.log("warn", "Language changed with empty messages", { from: oldLanguage, to: language });
      return true;
    }
  }
  /**
   * 언어를 캐시에 저장
   */
  saveLanguageToCache(language) {
    try {
      localStorage.setItem(this.config.cacheKey, language);
      this.log("debug", "Language saved to cache:", language);
    } catch (error) {
      this.log("warn", "Failed to save language to cache:", error);
    }
  }
  /**
   * 언어 메시지 파일 로드
   */
  async loadMessages(language) {
    if (this.messages.has(language)) {
      this.log("debug", "Messages already loaded for:", language);
      return this.messages.get(language);
    }
    if (this.loadPromises.has(language)) {
      this.log("debug", "Messages loading in progress for:", language);
      return await this.loadPromises.get(language);
    }
    const loadPromise = this._loadMessagesFromFile(language);
    this.loadPromises.set(language, loadPromise);
    try {
      const messages = await loadPromise;
      this.messages.set(language, messages);
      this.loadPromises.delete(language);
      this.log("debug", "Messages loaded successfully for:", language);
      return messages;
    } catch (error) {
      this.loadPromises.delete(language);
      this.log("error", "Failed to load messages, using empty fallback for:", language, error);
      const emptyMessages = {};
      this.messages.set(language, emptyMessages);
      return emptyMessages;
    }
  }
  /**
   * 파일에서 메시지 로드 (캐싱 지원)
   */
  async _loadMessagesFromFile(language) {
    if (this.config.enableDataCache) {
      const cachedData = this.getDataFromCache(language);
      if (cachedData) {
        this.log("debug", "Messages loaded from cache:", language);
        return cachedData;
      }
    }
    try {
      const i18nPath = `${this.router.config.i18nPath}/${language}.json`;
      const response = await fetch(i18nPath);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const messages = await response.json();
      if (this.config.enableDataCache) {
        this.saveDataToCache(language, messages);
      }
      return messages;
    } catch (error) {
      this.log("error", "Failed to load messages file for:", language, error);
      if (language !== this.config.fallbackLanguage) {
        this.log("info", "Trying fallback language:", this.config.fallbackLanguage);
        try {
          return await this._loadMessagesFromFile(this.config.fallbackLanguage);
        } catch (fallbackError) {
          this.log("error", "Fallback language also failed:", fallbackError);
          return {};
        }
      }
      this.log("warn", `No messages available for language: ${language}, using empty fallback`);
      return {};
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
        if (version !== this.config.cacheVersion) {
          this.log("debug", "Cache version mismatch, clearing:", language);
          localStorage.removeItem(cacheKey);
          return null;
        }
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1e3;
        if (now - timestamp > maxAge) {
          this.log("debug", "Cache expired, removing:", language);
          localStorage.removeItem(cacheKey);
          return null;
        }
        return data;
      }
    } catch (error) {
      this.log("warn", "Failed to read from cache:", error);
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
      this.log("debug", "Data saved to cache:", language);
    } catch (error) {
      this.log("warn", "Failed to save to cache:", error);
    }
  }
  /**
   * 메시지 번역
   */
  t(key, params = {}) {
    if (!this.config.enabled) {
      return key;
    }
    const messages = this.messages.get(this.currentLanguage);
    if (!messages) {
      this.log("warn", "No messages loaded for current language:", this.currentLanguage);
      return key;
    }
    const message = this.getNestedValue(messages, key);
    if (message === void 0) {
      this.log("warn", "Translation not found for key:", key);
      const fallbackMessages = this.messages.get(this.config.fallbackLanguage);
      if (fallbackMessages && this.currentLanguage !== this.config.fallbackLanguage) {
        const fallbackMessage = this.getNestedValue(fallbackMessages, key);
        if (fallbackMessage !== void 0) {
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
    return path.split(".").reduce((current, key) => {
      return current && current[key] !== void 0 ? current[key] : void 0;
    }, obj);
  }
  /**
   * 문자열 보간 처리
   */
  interpolate(message, params) {
    if (typeof message !== "string") {
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
    return ["ko", "en"];
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
      this.listeners[event].forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          this.log("error", "Error in event listener:", error);
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
    const locale = this.currentLanguage === "ko" ? "ko-KR" : "en-US";
    return new Intl.DateTimeFormat(locale, options).format(new Date(date));
  }
  /**
   * 언어별 숫자 포맷팅
   */
  formatNumber(number, options = {}) {
    const locale = this.currentLanguage === "ko" ? "ko-KR" : "en-US";
    return new Intl.NumberFormat(locale, options).format(number);
  }
  /**
   * 로깅 래퍼 메서드
   */
  log(level, ...args) {
    if (this.router?.errorHandler) {
      this.router.errorHandler.log(level, "I18nManager", ...args);
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
      this.log("error", "I18n initialization failed:", error);
      this.log("info", "I18n system ready with fallback behavior");
      return true;
    }
  }
  /**
   * 캐시 초기화 (버전 변경 시 사용)
   */
  clearCache() {
    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter((key) => key.startsWith(this.config.dataCacheKey));
      cacheKeys.forEach((key) => {
        localStorage.removeItem(key);
      });
      this.log("debug", "Cache cleared, removed", cacheKeys.length, "items");
    } catch (error) {
      this.log("warn", "Failed to clear cache:", error);
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
      const cacheKeys = keys.filter((key) => key.startsWith(this.config.dataCacheKey));
      cacheKeys.forEach((key) => {
        const match = key.match(new RegExp(`${this.config.dataCacheKey}_(w+)_(.+)`));
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
      this.log("warn", "Failed to get cache info:", error);
    }
    return info;
  }
  /**
   * 시스템 초기화 (현재 언어의 메시지 로드)
   */
  async initialize() {
    if (!this.config.enabled) {
      this.log("info", "I18n system is disabled, skipping initialization");
      return true;
    }
    try {
      await this.initPromise;
      this.log("info", "I18n system fully initialized");
      return true;
    } catch (error) {
      this.log("error", "Failed to initialize I18n system:", error);
      this.log("info", "I18n system will continue with fallback behavior");
      return true;
    }
  }
};

// src/plugins/AuthManager.js
var AuthManager = class {
  constructor(router, options = {}) {
    this.config = {
      enabled: options.authEnabled || false,
      loginRoute: options.loginRoute || "login",
      protectedRoutes: options.protectedRoutes || [],
      protectedPrefixes: options.protectedPrefixes || [],
      publicRoutes: options.publicRoutes || ["login", "register", "home"],
      checkAuthFunction: options.checkAuthFunction || null,
      redirectAfterLogin: options.redirectAfterLogin || "home",
      // 쿠키/스토리지 설정
      authCookieName: options.authCookieName || "authToken",
      authFallbackCookieNames: options.authFallbackCookieNames || ["accessToken", "token", "jwt"],
      authStorage: options.authStorage || "cookie",
      authCookieOptions: options.authCookieOptions || {},
      authSkipValidation: options.authSkipValidation || false,
      debug: options.debug || false
    };
    this.router = router;
    this.eventListeners = /* @__PURE__ */ new Map();
    this.log("info", "AuthManager initialized", { enabled: this.config.enabled });
  }
  /**
   * 로깅 래퍼 메서드
   */
  log(level, ...args) {
    if (this.router?.errorHandler) {
      this.router.errorHandler.log(level, "AuthManager", ...args);
    }
  }
  /**
   * 라우트 인증 확인
   */
  async checkAuthentication(routeName) {
    if (!this.config.enabled) {
      return { allowed: true, reason: "auth_disabled" };
    }
    this.log("debug", `\u{1F510} Checking authentication for route: ${routeName}`);
    if (this.isPublicRoute(routeName)) {
      return { allowed: true, reason: "public_route" };
    }
    const isProtected = this.isProtectedRoute(routeName);
    if (!isProtected) {
      return { allowed: true, reason: "not_protected" };
    }
    if (typeof this.config.checkAuthFunction === "function") {
      try {
        const isAuthenticated2 = await this.config.checkAuthFunction(routeName);
        return {
          allowed: isAuthenticated2,
          reason: isAuthenticated2 ? "custom_auth_success" : "custom_auth_failed",
          routeName
        };
      } catch (error) {
        this.log("error", "Custom auth function failed:", error);
        return { allowed: false, reason: "custom_auth_error", error };
      }
    }
    const isAuthenticated = this.isUserAuthenticated();
    return {
      allowed: isAuthenticated,
      reason: isAuthenticated ? "authenticated" : "not_authenticated",
      routeName
    };
  }
  /**
   * 사용자 인증 상태 확인
   */
  isUserAuthenticated() {
    this.log("debug", "\u{1F50D} Checking user authentication status");
    const token = localStorage.getItem("authToken") || localStorage.getItem("accessToken");
    if (token) {
      try {
        if (token.includes(".")) {
          const payload = JSON.parse(atob(token.split(".")[1]));
          if (payload.exp && Date.now() >= payload.exp * 1e3) {
            this.log("debug", "localStorage token expired, removing...");
            localStorage.removeItem("authToken");
            localStorage.removeItem("accessToken");
            return false;
          }
        }
        this.log("debug", "\u2705 Valid token found in localStorage");
        return true;
      } catch (error) {
        this.log("warn", "Invalid token in localStorage:", error);
      }
    }
    const sessionToken = sessionStorage.getItem("authToken") || sessionStorage.getItem("accessToken");
    if (sessionToken) {
      this.log("debug", "\u2705 Token found in sessionStorage");
      return true;
    }
    const authCookie = this.getAuthCookie();
    if (authCookie) {
      try {
        if (authCookie.includes(".")) {
          const payload = JSON.parse(atob(authCookie.split(".")[1]));
          if (payload.exp && Date.now() >= payload.exp * 1e3) {
            this.log("debug", "Cookie token expired, removing...");
            this.removeAuthCookie();
            return false;
          }
        }
        this.log("debug", "\u2705 Valid token found in cookies");
        return true;
      } catch (error) {
        this.log("warn", "Cookie token validation failed:", error);
      }
    }
    if (window.user || window.isAuthenticated) {
      this.log("debug", "\u2705 Global authentication variable found");
      return true;
    }
    this.log("debug", "\u274C No valid authentication found");
    return false;
  }
  /**
   * 공개 라우트인지 확인
   */
  isPublicRoute(routeName) {
    return this.config.publicRoutes.includes(routeName);
  }
  /**
   * 보호된 라우트인지 확인
   */
  isProtectedRoute(routeName) {
    if (this.config.protectedRoutes.includes(routeName)) {
      return true;
    }
    for (const prefix of this.config.protectedPrefixes) {
      if (routeName.startsWith(prefix)) {
        return true;
      }
    }
    return false;
  }
  /**
   * 인증 쿠키 가져오기
   */
  getAuthCookie() {
    const primaryCookie = this.getCookieValue(this.config.authCookieName);
    if (primaryCookie) {
      return primaryCookie;
    }
    for (const cookieName of this.config.authFallbackCookieNames) {
      const cookieValue = this.getCookieValue(cookieName);
      if (cookieValue) {
        this.log("debug", `Found auth token in fallback cookie: ${cookieName}`);
        return cookieValue;
      }
    }
    return null;
  }
  /**
   * 쿠키 값 가져오기
   */
  getCookieValue(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return decodeURIComponent(parts.pop().split(";").shift());
    }
    return null;
  }
  /**
   * 인증 쿠키 제거
   */
  removeAuthCookie() {
    const cookiesToRemove = [this.config.authCookieName, ...this.config.authFallbackCookieNames];
    cookiesToRemove.forEach((cookieName) => {
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${window.location.pathname};`;
    });
    this.log("debug", "Auth cookies removed");
  }
  /**
   * 액세스 토큰 가져오기
   */
  getAccessToken() {
    let token = localStorage.getItem("authToken") || localStorage.getItem("accessToken");
    if (token) return token;
    token = sessionStorage.getItem("authToken") || sessionStorage.getItem("accessToken");
    if (token) return token;
    token = this.getAuthCookie();
    if (token) return token;
    return null;
  }
  /**
   * 액세스 토큰 설정
   */
  setAccessToken(token, options = {}) {
    if (!token) {
      this.log("warn", "Empty token provided");
      return false;
    }
    const {
      storage = this.config.authStorage,
      cookieOptions = this.config.authCookieOptions,
      skipValidation = this.config.authSkipValidation
    } = options;
    try {
      if (!skipValidation && token.includes(".")) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          if (payload.exp && Date.now() >= payload.exp * 1e3) {
            this.log("warn", "\u274C Token is expired");
            return false;
          }
          this.log("debug", "\u2705 JWT token validated");
        } catch (error) {
          this.log("warn", "\u26A0\uFE0F JWT validation failed, but proceeding:", error.message);
        }
      }
      switch (storage) {
        case "localStorage":
          localStorage.setItem("authToken", token);
          this.log("debug", "Token saved to localStorage");
          break;
        case "sessionStorage":
          sessionStorage.setItem("authToken", token);
          this.log("debug", "Token saved to sessionStorage");
          break;
        case "cookie":
          this.setAuthCookie(token, cookieOptions);
          break;
        default:
          localStorage.setItem("authToken", token);
          this.log("debug", "Token saved to localStorage (default)");
      }
      this.emitAuthEvent("token_set", {
        storage,
        tokenLength: token.length,
        hasExpiration: token.includes(".")
      });
      return true;
    } catch (error) {
      this.log("Failed to set token:", error);
      return false;
    }
  }
  /**
   * 인증 쿠키 설정
   */
  setAuthCookie(token, options = {}) {
    const {
      cookieName = this.config.authCookieName,
      secure = window.location.protocol === "https:",
      sameSite = "Strict",
      path = "/",
      domain = null
    } = options;
    let cookieString = `${cookieName}=${encodeURIComponent(token)}; path=${path}`;
    if (secure) {
      cookieString += "; Secure";
    }
    if (sameSite) {
      cookieString += `; SameSite=${sameSite}`;
    }
    if (domain) {
      cookieString += `; Domain=${domain}`;
    }
    try {
      if (token.includes(".")) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          if (payload.exp) {
            const expireDate = new Date(payload.exp * 1e3);
            cookieString += `; Expires=${expireDate.toUTCString()}`;
          }
        } catch (error) {
          this.log("Could not extract expiration from JWT token");
        }
      }
    } catch (error) {
      this.log("Token processing error:", error);
    }
    document.cookie = cookieString;
    this.log(`Auth cookie set: ${cookieName}`);
  }
  /**
   * 토큰 제거
   */
  removeAccessToken(storage = "all") {
    switch (storage) {
      case "localStorage":
        localStorage.removeItem("authToken");
        localStorage.removeItem("accessToken");
        break;
      case "sessionStorage":
        sessionStorage.removeItem("authToken");
        sessionStorage.removeItem("accessToken");
        break;
      case "cookie":
        this.removeAuthCookie();
        break;
      case "all":
      default:
        localStorage.removeItem("authToken");
        localStorage.removeItem("accessToken");
        sessionStorage.removeItem("authToken");
        sessionStorage.removeItem("accessToken");
        this.removeAuthCookie();
        break;
    }
    this.emitAuthEvent("token_removed", { storage });
    this.log(`Token removed from: ${storage}`);
  }
  /**
   * 로그인 성공 처리
   */
  handleLoginSuccess(targetRoute = null) {
    const redirectRoute = targetRoute || this.config.redirectAfterLogin;
    this.log(`\u{1F389} Login success, redirecting to: ${redirectRoute}`);
    this.emitAuthEvent("login_success", { targetRoute: redirectRoute });
    if (this.router && typeof this.router.navigateTo === "function") {
      this.router.navigateTo(redirectRoute);
    }
    return redirectRoute;
  }
  /**
   * 로그아웃 처리
   */
  handleLogout() {
    this.log("\u{1F44B} Logging out user");
    this.removeAccessToken();
    if (window.user) window.user = null;
    if (window.isAuthenticated) window.isAuthenticated = false;
    this.emitAuthEvent("logout", {});
    if (this.router && typeof this.router.navigateTo === "function") {
      this.router.navigateTo(this.config.loginRoute);
    }
    return this.config.loginRoute;
  }
  /**
   * 인증 이벤트 발생
   */
  emitAuthEvent(eventType, data) {
    const event = new CustomEvent("router:auth", {
      detail: {
        type: eventType,
        timestamp: Date.now(),
        ...data
      }
    });
    document.dispatchEvent(event);
    if (this.eventListeners.has(eventType)) {
      this.eventListeners.get(eventType).forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          this.log("Event listener error:", error);
        }
      });
    }
    this.log(`\u{1F514} Auth event emitted: ${eventType}`, data);
  }
  /**
   * 이벤트 리스너 등록
   */
  on(eventType, listener) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType).push(listener);
  }
  /**
   * 이벤트 리스너 제거
   */
  off(eventType, listener) {
    if (this.eventListeners.has(eventType)) {
      const listeners = this.eventListeners.get(eventType);
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }
  /**
   * 인증 상태 통계
   */
  getAuthStats() {
    return {
      enabled: this.config.enabled,
      isAuthenticated: this.isUserAuthenticated(),
      hasToken: !!this.getAccessToken(),
      protectedRoutesCount: this.config.protectedRoutes.length,
      protectedPrefixesCount: this.config.protectedPrefixes.length,
      publicRoutesCount: this.config.publicRoutes.length,
      storage: this.config.authStorage,
      loginRoute: this.config.loginRoute
    };
  }
  /**
   * 정리 (메모리 누수 방지)
   */
  destroy() {
    this.eventListeners.clear();
    this.log("debug", "AuthManager destroyed");
  }
};

// src/plugins/CacheManager.js
var CacheManager = class {
  constructor(router, options = {}) {
    this.config = {
      cacheMode: options.cacheMode || "memory",
      // 'memory' 또는 'lru'
      cacheTTL: options.cacheTTL || 3e5,
      // 5분 (밀리초)
      maxCacheSize: options.maxCacheSize || 50,
      // LRU 캐시 최대 크기
      debug: options.debug || false
    };
    this.router = router;
    this.cache = /* @__PURE__ */ new Map();
    this.cacheTimestamps = /* @__PURE__ */ new Map();
    this.lruOrder = [];
    this.log("info", "CacheManager initialized with config:", this.config);
  }
  /**
   * 로깅 래퍼 메서드
   */
  log(level, ...args) {
    if (this.router?.errorHandler) {
      this.router.errorHandler.log(level, "CacheManager", ...args);
    }
  }
  /**
   * 캐시에 값 저장
   */
  setCache(key, value) {
    const now = Date.now();
    if (this.config.cacheMode === "lru") {
      if (this.cache.size >= this.config.maxCacheSize && !this.cache.has(key)) {
        const oldestKey = this.lruOrder.shift();
        if (oldestKey) {
          this.cache.delete(oldestKey);
          this.cacheTimestamps.delete(oldestKey);
          this.log("debug", `\u{1F5D1}\uFE0F LRU evicted cache key: ${oldestKey}`);
        }
      }
      const existingIndex = this.lruOrder.indexOf(key);
      if (existingIndex > -1) {
        this.lruOrder.splice(existingIndex, 1);
      }
      this.lruOrder.push(key);
    }
    this.cache.set(key, value);
    this.cacheTimestamps.set(key, now);
    this.log("debug", `\u{1F4BE} Cached: ${key} (size: ${this.cache.size})`);
  }
  /**
   * 캐시에서 값 가져오기
   */
  getFromCache(key) {
    const now = Date.now();
    const timestamp = this.cacheTimestamps.get(key);
    if (timestamp && now - timestamp > this.config.cacheTTL) {
      this.cache.delete(key);
      this.cacheTimestamps.delete(key);
      if (this.config.cacheMode === "lru") {
        const index = this.lruOrder.indexOf(key);
        if (index > -1) {
          this.lruOrder.splice(index, 1);
        }
      }
      this.log("debug", `\u23F0 Cache expired and removed: ${key}`);
      return null;
    }
    const value = this.cache.get(key);
    if (value && this.config.cacheMode === "lru") {
      const index = this.lruOrder.indexOf(key);
      if (index > -1) {
        this.lruOrder.splice(index, 1);
        this.lruOrder.push(key);
      }
    }
    if (value) {
      this.log("debug", `\u{1F3AF} Cache hit: ${key}`);
    } else {
      this.log("debug", `\u274C Cache miss: ${key}`);
    }
    return value;
  }
  /**
   * 캐시에 키가 있는지 확인
   */
  hasCache(key) {
    return this.cache.has(key) && this.getFromCache(key) !== null;
  }
  /**
   * 특정 키 패턴의 캐시 삭제
   */
  invalidateByPattern(pattern) {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.includes(pattern) || key.startsWith(pattern)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => {
      this.cache.delete(key);
      this.cacheTimestamps.delete(key);
      if (this.config.cacheMode === "lru") {
        const index = this.lruOrder.indexOf(key);
        if (index > -1) {
          this.lruOrder.splice(index, 1);
        }
      }
    });
    this.log("debug", `\u{1F9F9} Invalidated ${keysToDelete.length} cache entries matching: ${pattern}`);
    return keysToDelete.length;
  }
  /**
   * 특정 컴포넌트 캐시 무효화
   */
  invalidateComponentCache(routeName) {
    const patterns = [
      `component_${routeName}`,
      `script_${routeName}`,
      `template_${routeName}`,
      `style_${routeName}`,
      `layout_${routeName}`
    ];
    let totalInvalidated = 0;
    patterns.forEach((pattern) => {
      totalInvalidated += this.invalidateByPattern(pattern);
    });
    this.log(`\u{1F504} Invalidated component cache for route: ${routeName} (${totalInvalidated} entries)`);
    return totalInvalidated;
  }
  /**
   * 모든 컴포넌트 캐시 삭제
   */
  clearComponentCache() {
    const componentPatterns = ["component_", "script_", "template_", "style_", "layout_"];
    let totalCleared = 0;
    componentPatterns.forEach((pattern) => {
      totalCleared += this.invalidateByPattern(pattern);
    });
    this.log(`\u{1F9FD} Cleared all component caches (${totalCleared} entries)`);
    return totalCleared;
  }
  /**
   * 전체 캐시 삭제
   */
  clearCache() {
    const size = this.cache.size;
    this.cache.clear();
    this.cacheTimestamps.clear();
    this.lruOrder = [];
    this.log(`\u{1F525} Cleared all cache (${size} entries)`);
    return size;
  }
  /**
   * 만료된 캐시 항목들 정리
   */
  cleanExpiredCache() {
    const now = Date.now();
    const expiredKeys = [];
    for (const [key, timestamp] of this.cacheTimestamps.entries()) {
      if (now - timestamp > this.config.cacheTTL) {
        expiredKeys.push(key);
      }
    }
    expiredKeys.forEach((key) => {
      this.cache.delete(key);
      this.cacheTimestamps.delete(key);
      if (this.config.cacheMode === "lru") {
        const index = this.lruOrder.indexOf(key);
        if (index > -1) {
          this.lruOrder.splice(index, 1);
        }
      }
    });
    if (expiredKeys.length > 0) {
      this.log(`\u23F1\uFE0F Cleaned ${expiredKeys.length} expired cache entries`);
    }
    return expiredKeys.length;
  }
  /**
   * 캐시 통계 정보
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.config.maxCacheSize,
      mode: this.config.cacheMode,
      ttl: this.config.cacheTTL,
      memoryUsage: this.getMemoryUsage(),
      hitRatio: this.getHitRatio(),
      categories: this.getCategorizedStats()
    };
  }
  /**
   * 메모리 사용량 추정
   */
  getMemoryUsage() {
    let estimatedBytes = 0;
    for (const [key, value] of this.cache.entries()) {
      estimatedBytes += key.length * 2;
      if (typeof value === "string") {
        estimatedBytes += value.length * 2;
      } else if (typeof value === "object" && value !== null) {
        estimatedBytes += JSON.stringify(value).length * 2;
      } else {
        estimatedBytes += 8;
      }
    }
    return {
      bytes: estimatedBytes,
      kb: Math.round(estimatedBytes / 1024 * 100) / 100,
      mb: Math.round(estimatedBytes / (1024 * 1024) * 100) / 100
    };
  }
  /**
   * 히트 비율 계산 (간단한 추정)
   */
  getHitRatio() {
    const ratio = this.cache.size > 0 ? Math.min(this.cache.size / this.config.maxCacheSize, 1) : 0;
    return Math.round(ratio * 100);
  }
  /**
   * 카테고리별 캐시 통계
   */
  getCategorizedStats() {
    const categories = {
      components: 0,
      scripts: 0,
      templates: 0,
      styles: 0,
      layouts: 0,
      others: 0
    };
    for (const key of this.cache.keys()) {
      if (key.startsWith("component_")) categories.components++;
      else if (key.startsWith("script_")) categories.scripts++;
      else if (key.startsWith("template_")) categories.templates++;
      else if (key.startsWith("style_")) categories.styles++;
      else if (key.startsWith("layout_")) categories.layouts++;
      else categories.others++;
    }
    return categories;
  }
  /**
   * 캐시 키 목록 반환
   */
  getCacheKeys() {
    return Array.from(this.cache.keys());
  }
  /**
   * 특정 패턴의 캐시 키들 반환
   */
  getCacheKeysByPattern(pattern) {
    return this.getCacheKeys().filter(
      (key) => key.includes(pattern) || key.startsWith(pattern)
    );
  }
  /**
   * 자동 정리 시작 (백그라운드에서 만료된 캐시 정리)
   */
  startAutoCleanup(interval = 6e4) {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cleanupInterval = setInterval(() => {
      this.cleanExpiredCache();
    }, interval);
    this.log(`\u{1F916} Auto cleanup started (interval: ${interval}ms)`);
  }
  /**
   * 자동 정리 중지
   */
  stopAutoCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      this.log("debug", "\u{1F6D1} Auto cleanup stopped");
    }
  }
  /**
   * 정리 (메모리 누수 방지)
   */
  destroy() {
    this.stopAutoCleanup();
    this.clearCache();
    this.log("debug", "CacheManager destroyed");
  }
};

// src/plugins/QueryManager.js
var QueryManager = class {
  constructor(router, options = {}) {
    this.config = {
      enableParameterValidation: options.enableParameterValidation !== false,
      logSecurityWarnings: options.logSecurityWarnings !== false,
      maxParameterLength: options.maxParameterLength || 1e3,
      maxArraySize: options.maxArraySize || 100,
      maxParameterCount: options.maxParameterCount || 50,
      allowedKeyPattern: options.allowedKeyPattern || /^[a-zA-Z0-9_\-]+$/,
      debug: options.debug || false
    };
    this.router = router;
    this.currentQueryParams = {};
    this.currentRouteParams = {};
    this.log("info", "QueryManager initialized with config:", this.config);
  }
  /**
   * 로깅 래퍼 메서드
   */
  log(level, ...args) {
    if (this.router?.errorHandler) {
      this.router.errorHandler.log(level, "QueryManager", ...args);
    }
  }
  /**
   * 파라미터 값 sanitize (XSS, SQL Injection 방어)
   */
  sanitizeParameter(value) {
    if (typeof value !== "string") return value;
    let sanitized = value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "").replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "").replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "").replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "").replace(/<link\b[^<]*>/gi, "").replace(/<meta\b[^<]*>/gi, "").replace(/javascript:/gi, "").replace(/vbscript:/gi, "").replace(/data:/gi, "").replace(/on\w+\s*=/gi, "").replace(/expression\s*\(/gi, "").replace(/url\s*\(/gi, "");
    const sqlPatterns = [
      /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute|sp_|xp_)\b)/gi,
      /(;|\||&|\*|%|<|>)/g,
      // 위험한 특수문자
      /(--|\/\*|\*\/)/g,
      // SQL 주석
      /(\bor\b.*\b=\b|\band\b.*\b=\b)/gi,
      // OR/AND 조건문
      /('.*'|".*")/g,
      // 따옴표로 둘러싸인 문자열
      /(\\\w+)/g
      // 백슬래시 이스케이프
    ];
    for (const pattern of sqlPatterns) {
      sanitized = sanitized.replace(pattern, "");
    }
    sanitized = sanitized.replace(/[<>'"&]{2,}/g, "");
    if (sanitized.length > this.config.maxParameterLength) {
      sanitized = sanitized.substring(0, this.config.maxParameterLength);
    }
    return sanitized.trim();
  }
  /**
   * 파라미터 유효성 검증
   */
  validateParameter(key, value) {
    if (!this.config.enableParameterValidation) {
      return true;
    }
    if (typeof key !== "string" || key.length === 0) {
      return false;
    }
    if (!this.config.allowedKeyPattern.test(key)) {
      if (this.config.logSecurityWarnings) {
        console.warn(`Invalid parameter key format: ${key}`);
      }
      return false;
    }
    if (key.length > 50) {
      if (this.config.logSecurityWarnings) {
        console.warn(`Parameter key too long: ${key}`);
      }
      return false;
    }
    if (value !== null && value !== void 0) {
      if (typeof value === "string") {
        if (value.length > this.config.maxParameterLength) {
          if (this.config.logSecurityWarnings) {
            console.warn(`Parameter value too long for key: ${key}`);
          }
          return false;
        }
        const dangerousPatterns = [
          /<script|<iframe|<object|<embed/gi,
          /javascript:|vbscript:|data:/gi,
          /union.*select|insert.*into|delete.*from/gi,
          /\.\.\//g,
          // 경로 탐색 공격
          /[<>'"&]{3,}/g
          // 연속된 특수문자
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
        if (value.length > this.config.maxArraySize) {
          if (this.config.logSecurityWarnings) {
            console.warn(`Parameter array too large for key: ${key}`);
          }
          return false;
        }
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
    const pairs = queryString.split("&");
    for (const pair of pairs) {
      try {
        const [rawKey, rawValue] = pair.split("=");
        if (!rawKey) continue;
        let key, value;
        try {
          key = decodeURIComponent(rawKey);
          value = rawValue ? decodeURIComponent(rawValue) : "";
        } catch (e) {
          this.log("warn", "Failed to decode URI component:", pair);
          continue;
        }
        if (!this.validateParameter(key, value)) {
          this.log("warn", `Parameter rejected by security filter: ${key}`);
          continue;
        }
        const sanitizedValue = this.sanitizeParameter(value);
        if (key.endsWith("[]")) {
          const arrayKey = key.slice(0, -2);
          if (!this.validateParameter(arrayKey, [])) {
            continue;
          }
          if (!params[arrayKey]) params[arrayKey] = [];
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
        this.log("error", "Error parsing query parameter:", pair, error);
      }
    }
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
    if (!params || Object.keys(params).length === 0) return "";
    const pairs = [];
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          pairs.push(`${encodeURIComponent(key)}[]=${encodeURIComponent(item)}`);
        }
      } else if (value !== void 0 && value !== null) {
        pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
      }
    }
    return pairs.join("&");
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
  getQueryParam(key, defaultValue = void 0) {
    const value = this.currentQueryParams ? this.currentQueryParams[key] : void 0;
    return value !== void 0 ? value : defaultValue;
  }
  /**
   * 쿼리 파라미터 설정
   */
  setQueryParams(params, replace = false) {
    if (!params || typeof params !== "object") {
      console.warn("Invalid parameters object provided to setQueryParams");
      return;
    }
    const currentParams = replace ? {} : { ...this.currentQueryParams };
    const sanitizedParams = {};
    for (const [key, value] of Object.entries(params)) {
      if (!this.validateParameter(key, value)) {
        console.warn(`Parameter ${key} rejected by security filter`);
        continue;
      }
      if (value !== void 0 && value !== null) {
        if (Array.isArray(value)) {
          sanitizedParams[key] = value.map((item) => this.sanitizeParameter(item));
        } else {
          sanitizedParams[key] = this.sanitizeParameter(value);
        }
      }
    }
    Object.assign(currentParams, sanitizedParams);
    for (const [key, value] of Object.entries(currentParams)) {
      if (value === void 0 || value === null || value === "") {
        delete currentParams[key];
      }
    }
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
   * 현재 라우팅 파라미터 설정 (navigateTo에서 호출)
   */
  setCurrentRouteParams(params) {
    this.currentRouteParams = params || {};
    this.log("debug", "Route params set:", this.currentRouteParams);
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
  getParam(key, defaultValue = void 0) {
    const value = this.currentQueryParams[key] !== void 0 ? this.currentQueryParams[key] : this.currentRouteParams[key];
    return value !== void 0 ? value : defaultValue;
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
  getRouteParam(key, defaultValue = void 0) {
    const value = this.currentRouteParams[key];
    return value !== void 0 ? value : defaultValue;
  }
  /**
   * URL 업데이트 (라우터의 updateURL 메소드 호출)
   */
  updateURL() {
    if (this.router && typeof this.router.updateURL === "function") {
      const route = this.router.currentHash || "home";
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
    this.currentRouteParams = {};
    this.router = null;
    this.log("debug", "QueryManager destroyed");
  }
};

// src/core/RouteLoader.js
var RouteLoader = class {
  constructor(router, options = {}) {
    this.config = {
      srcPath: options.srcPath || router.config.srcPath || "/src",
      // 소스 파일 경로
      routesPath: options.routesPath || router.config.routesPath || "/routes",
      // 프로덕션 라우트 경로
      environment: options.environment || "development",
      useLayout: options.useLayout !== false,
      defaultLayout: options.defaultLayout || "default",
      useComponents: options.useComponents !== false,
      debug: options.debug || false
    };
    this.router = router;
    this.log("debug", "RouteLoader initialized with config:", this.config);
  }
  /**
   * 스크립트 파일 로드
   */
  async loadScript(routeName) {
    let script;
    try {
      if (this.config.environment === "production") {
        const importPath = `${this.config.routesPath}/${routeName}.js`;
        this.log("debug", `Loading production route: ${importPath}`);
        const module = await import(importPath);
        script = module.default;
      } else {
        const importPath = `${this.config.srcPath}/logic/${routeName}.js`;
        this.log("debug", `Loading development route: ${importPath}`);
        const module = await import(importPath);
        script = module.default;
      }
      if (!script) {
        throw new Error(`Route '${routeName}' not found - no default export`);
      }
    } catch (error) {
      if (error.message.includes("Failed to resolve") || error.message.includes("Failed to fetch") || error.message.includes("not found") || error.name === "TypeError") {
        throw new Error(`Route '${routeName}' not found - 404`);
      }
      throw error;
    }
    return script;
  }
  /**
   * 템플릿 파일 로드 (실패시 기본값 반환)
   */
  async loadTemplate(routeName) {
    try {
      const templatePath = `${this.config.srcPath}/views/${routeName}.html`;
      const response = await fetch(templatePath);
      if (!response.ok) throw new Error(`Template not found: ${response.status}`);
      const template = await response.text();
      this.log("debug", `Template '${routeName}' loaded successfully`);
      return template;
    } catch (error) {
      this.log("warn", `Template '${routeName}' not found, using default:`, error.message);
      return this.generateDefaultTemplate(routeName);
    }
  }
  /**
   * 스타일 파일 로드 (실패시 빈 문자열 반환)
   */
  async loadStyle(routeName) {
    try {
      const stylePath = `${this.config.srcPath}/styles/${routeName}.css`;
      const response = await fetch(stylePath);
      if (!response.ok) throw new Error(`Style not found: ${response.status}`);
      const style = await response.text();
      this.log("debug", `Style '${routeName}' loaded successfully`);
      return style;
    } catch (error) {
      this.log("debug", `Style '${routeName}' not found, no styles applied:`, error.message);
      return "";
    }
  }
  /**
   * 레이아웃 파일 로드 (실패시 null 반환)
   */
  async loadLayout(layoutName) {
    try {
      const layoutPath = `${this.config.srcPath}/layouts/${layoutName}.html`;
      const response = await fetch(layoutPath);
      if (!response.ok) throw new Error(`Layout not found: ${response.status}`);
      const layout = await response.text();
      this.log("debug", `Layout '${layoutName}' loaded successfully`);
      return layout;
    } catch (error) {
      this.log("debug", `Layout '${layoutName}' not found, no layout applied:`, error.message);
      return null;
    }
  }
  /**
   * 레이아웃과 템플릿 병합
   */
  mergeLayoutWithTemplate(routeName, layout, template) {
    let result;
    if (layout.includes("{{ content }}")) {
      result = layout.replace(
        /{{ content }}/s,
        template
      );
    } else if (layout.includes('class="main-content"')) {
      this.log("debug", "Using main-content replacement");
      result = layout.replace(
        /(<div class="container">).*?(<\/div>\s*<\/main>)/s,
        `$1${template}$2`
      );
    } else {
      this.log("debug", "Wrapping template with layout");
      result = `${layout}
${template}`;
    }
    return result;
  }
  /**
   * Vue 컴포넌트 생성
   */
  async createVueComponent(routeName) {
    const cacheKey = `component_${routeName}`;
    const cached = this.router.cacheManager?.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }
    const script = await this.loadScript(routeName);
    const router = this.router;
    const isProduction = this.config.environment === "production";
    let template, style = "", layout = null;
    if (isProduction) {
      template = script.template || this.generateDefaultTemplate(routeName);
    } else {
      template = await this.loadTemplate(routeName);
      style = await this.loadStyle(routeName);
      layout = this.config.useLayout && script.layout !== null ? await this.loadLayout(script.layout || this.config.defaultLayout) : null;
      if (layout) {
        template = this.mergeLayoutWithTemplate(routeName, layout, template);
      }
    }
    let loadedComponents = {};
    if (this.config.useComponents && router.componentLoader) {
      try {
        loadedComponents = await router.componentLoader.loadAllComponents();
        this.log("debug", `Components loaded successfully for route: ${routeName}`);
      } catch (error) {
        this.log("warn", `Component loading failed for route '${routeName}', continuing without components:`, error.message);
        loadedComponents = {};
      }
    }
    const component = {
      ...script,
      name: script.name || this.toPascalCase(routeName),
      template,
      components: loadedComponents,
      data() {
        const originalData = script.data ? script.data() : {};
        const commonData = {
          ...originalData,
          currentRoute: routeName,
          $query: router.queryManager?.getQueryParams() || {},
          $lang: (() => {
            try {
              return router.i18nManager?.getCurrentLanguage() || router.config.i18nDefaultLanguage || router.config.defaultLanguage || "ko";
            } catch (error) {
              if (router.errorHandler) router.errorHandler.warn("RouteLoader", "Failed to get current language:", error);
              return router.config.defaultLanguage || "ko";
            }
          })(),
          $dataLoading: false
        };
        return commonData;
      },
      computed: {
        ...script.computed || {},
        // 하위 호환성을 위해 params는 유지하되 getAllParams 사용
        params() {
          return router.queryManager?.getAllParams() || {};
        }
      },
      async mounted() {
        if (script.mounted) {
          await script.mounted.call(this);
        }
        if (script.dataURL) {
          if (typeof script.dataURL === "string") {
            await this.$fetchData();
          } else if (typeof script.dataURL === "object") {
            await this.$fetchMultipleData();
          }
        }
        await this.$nextTick();
        this.$bindAutoForms();
      },
      methods: {
        ...script.methods,
        // 라우팅 관련
        navigateTo: (route, params) => router.navigateTo(route, params),
        getCurrentRoute: () => router.getCurrentRoute(),
        // 통합된 파라미터 관리 (라우팅 + 쿼리 파라미터)
        getParams: () => router.queryManager?.getAllParams() || {},
        getParam: (key, defaultValue) => router.queryManager?.getParam(key, defaultValue),
        // i18n 관련 (resilient - i18n 실패해도 key 반환)
        $t: (key, params) => {
          try {
            return router.i18nManager?.t(key, params) || key;
          } catch (error) {
            if (router.errorHandler) router.errorHandler.warn("RouteLoader", "i18n translation failed, returning key:", error);
            return key;
          }
        },
        // 인증 관련
        $isAuthenticated: () => router.authManager?.isUserAuthenticated() || false,
        $logout: () => router.authManager ? router.navigateTo(router.authManager.handleLogout()) : null,
        $loginSuccess: (target) => router.authManager ? router.navigateTo(router.authManager.handleLoginSuccess(target)) : null,
        $checkAuth: (route) => router.authManager ? router.authManager.checkAuthentication(route) : Promise.resolve({ allowed: true, reason: "auth_disabled" }),
        $getToken: () => router.authManager?.getAccessToken() || null,
        $setToken: (token, options) => router.authManager?.setAccessToken(token, options) || false,
        $removeToken: (storage) => router.authManager?.removeAccessToken(storage) || null,
        $getAuthCookie: () => router.authManager?.getAuthCookie() || null,
        $getCookie: (name) => router.authManager?.getCookieValue(name) || null,
        // 데이터 fetch (단일 API 또는 특정 API)
        async $fetchData(apiName) {
          if (!script.dataURL) return;
          this.$dataLoading = true;
          try {
            if (typeof script.dataURL === "string") {
              const data = await router.routeLoader.fetchComponentData(script.dataURL);
              if (router.errorHandler) router.errorHandler.debug("RouteLoader", `Data fetched for ${routeName}:`, data);
              Object.assign(this, data);
              this.$emit("data-loaded", data);
            } else if (typeof script.dataURL === "object" && apiName) {
              const url = script.dataURL[apiName];
              if (url) {
                const data = await router.routeLoader.fetchComponentData(url);
                if (router.errorHandler) router.errorHandler.debug("RouteLoader", `Data fetched for ${routeName}.${apiName}:`, data);
                this[apiName] = data;
                this.$emit("data-loaded", { [apiName]: data });
              }
            } else {
              await this.$fetchMultipleData();
            }
          } catch (error) {
            if (router.errorHandler) router.errorHandler.warn("RouteLoader", `Failed to fetch data for ${routeName}:`, error);
            this.$emit("data-error", error);
          } finally {
            this.$dataLoading = false;
          }
        },
        // 다중 API 데이터 fetch
        async $fetchMultipleData() {
          if (!script.dataURL || typeof script.dataURL !== "object") return;
          const dataURLs = script.dataURL;
          this.$dataLoading = true;
          try {
            const promises = Object.entries(dataURLs).map(async ([key, url]) => {
              try {
                const data = await router.routeLoader.fetchComponentData(url);
                return { key, data, success: true };
              } catch (error) {
                if (router.errorHandler) router.errorHandler.warn("RouteLoader", `Failed to fetch ${key} for ${routeName}:`, error);
                return { key, error, success: false };
              }
            });
            const results = await Promise.all(promises);
            const successfulResults = {};
            const errors = {};
            results.forEach(({ key, data, error, success }) => {
              if (success) {
                this[key] = data;
                successfulResults[key] = data;
              } else {
                errors[key] = error;
              }
            });
            if (router.errorHandler) router.errorHandler.debug("RouteLoader", `Multiple data fetched for ${routeName}:`, successfulResults);
            if (Object.keys(successfulResults).length > 0) {
              this.$emit("data-loaded", successfulResults);
            }
            if (Object.keys(errors).length > 0) {
              this.$emit("data-error", errors);
            }
          } catch (error) {
            if (router.errorHandler) router.errorHandler.warn("RouteLoader", `Failed to fetch multiple data for ${routeName}:`, error);
            this.$emit("data-error", error);
          } finally {
            this.$dataLoading = false;
          }
        },
        // 전체 데이터 새로고침 (명시적 메서드)
        async $fetchAllData() {
          if (typeof script.dataURL === "string") {
            await this.$fetchData();
          } else if (typeof script.dataURL === "object") {
            await this.$fetchMultipleData();
          }
        },
        // 🆕 자동 폼 바인딩 메서드
        $bindAutoForms() {
          const forms = document.querySelectorAll("form.auto-form, form[action]");
          forms.forEach((form) => {
            form.removeEventListener("submit", form._boundSubmitHandler);
            const boundHandler = (e) => this.$handleFormSubmit(e);
            form._boundSubmitHandler = boundHandler;
            form.addEventListener("submit", boundHandler);
            if (router.errorHandler) router.errorHandler.debug("RouteLoader", `Form auto-bound: ${form.getAttribute("action")}`);
          });
        },
        // 🆕 폼 서브밋 핸들러
        async $handleFormSubmit(event) {
          event.preventDefault();
          const form = event.target;
          let action = form.getAttribute("action");
          const method = form.getAttribute("method") || "POST";
          const successHandler = form.getAttribute("data-success-handler");
          const errorHandler = form.getAttribute("data-error-handler");
          const loadingHandler = form.getAttribute("data-loading-handler");
          const redirectTo = form.getAttribute("data-redirect");
          try {
            if (loadingHandler && this[loadingHandler]) {
              this[loadingHandler](true, form);
            }
            action = this.$processActionParams(action);
            if (!this.$validateForm(form)) {
              return;
            }
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            if (router.errorHandler) router.errorHandler.debug("RouteLoader", `Form submitting to: ${action}`, data);
            const response = await this.$submitFormData(action, method, data, form);
            if (successHandler && this[successHandler]) {
              this[successHandler](response, form);
            }
            if (redirectTo) {
              setTimeout(() => {
                this.navigateTo(redirectTo);
              }, 1e3);
            }
          } catch (error) {
            if (router.errorHandler) router.errorHandler.warn("RouteLoader", `Form submission error:`, error);
            if (errorHandler && this[errorHandler]) {
              this[errorHandler](error, form);
            } else {
              console.error("Form submission error:", error);
            }
          } finally {
            if (loadingHandler && this[loadingHandler]) {
              this[loadingHandler](false, form);
            }
          }
        },
        // 🆕 액션 파라미터 처리 메서드 (간단한 템플릿 치환)
        $processActionParams(actionTemplate) {
          let processedAction = actionTemplate;
          const paramMatches = actionTemplate.match(/\{([^}]+)\}/g);
          if (paramMatches) {
            paramMatches.forEach((match) => {
              const paramName = match.slice(1, -1);
              try {
                let paramValue = null;
                paramValue = this.getParam(paramName);
                if (paramValue === null || paramValue === void 0) {
                  paramValue = this[paramName];
                }
                if (paramValue === null || paramValue === void 0) {
                  if (this.$options.computed && this.$options.computed[paramName]) {
                    paramValue = this[paramName];
                  }
                }
                if (paramValue !== null && paramValue !== void 0) {
                  processedAction = processedAction.replace(
                    match,
                    encodeURIComponent(paramValue)
                  );
                  if (router.errorHandler) router.errorHandler.debug("RouteLoader", `Parameter resolved: ${paramName} = ${paramValue}`);
                } else {
                  if (router.errorHandler) router.errorHandler.warn("RouteLoader", `Parameter '${paramName}' not found in component data, computed, or route params`);
                }
              } catch (error) {
                if (router.errorHandler) router.errorHandler.warn("RouteLoader", `Error processing parameter '${paramName}':`, error);
              }
            });
          }
          return processedAction;
        },
        // 🆕 폼 데이터 서브밋
        async $submitFormData(action, method, data, form) {
          const hasFile = Array.from(form.elements).some((el) => el.type === "file" && el.files.length > 0);
          const headers = {
            "Accept": "application/json",
            // 인증 토큰 자동 추가
            ...this.$getToken() && {
              "Authorization": `Bearer ${this.$getToken()}`
            }
          };
          let body;
          if (hasFile) {
            body = new FormData(form);
          } else {
            headers["Content-Type"] = "application/json";
            body = JSON.stringify(data);
          }
          const response = await fetch(action, {
            method: method.toUpperCase(),
            headers,
            body
          });
          if (!response.ok) {
            let error;
            try {
              error = await response.json();
            } catch (e) {
              error = { message: `HTTP ${response.status}: ${response.statusText}` };
            }
            throw new Error(error.message || `HTTP ${response.status}`);
          }
          try {
            return await response.json();
          } catch (e) {
            return { success: true };
          }
        },
        // 🆕 클라이언트 사이드 폼 검증
        $validateForm(form) {
          let isValid = true;
          const inputs = form.querySelectorAll("input, textarea, select");
          inputs.forEach((input) => {
            if (!input.checkValidity()) {
              isValid = false;
              input.classList.add("error");
              return;
            }
            const validationFunction = input.getAttribute("data-validation");
            if (validationFunction) {
              const isInputValid = this.$validateInput(input, validationFunction);
              if (!isInputValid) {
                isValid = false;
                input.classList.add("error");
              } else {
                input.classList.remove("error");
              }
            } else {
              input.classList.remove("error");
            }
          });
          return isValid;
        },
        // 🆕 개별 입력 검증
        $validateInput(input, validationFunction) {
          const value = input.value;
          if (typeof this[validationFunction] === "function") {
            try {
              return this[validationFunction](value, input);
            } catch (error) {
              if (router.errorHandler) router.errorHandler.warn("RouteLoader", `Validation function '${validationFunction}' error:`, error);
              return false;
            }
          }
          if (router.errorHandler) router.errorHandler.warn("RouteLoader", `Validation function '${validationFunction}' not found`);
          return true;
        }
      },
      _routeName: routeName
    };
    if (!isProduction && style) {
      component._style = style;
    }
    this.router.cacheManager?.setCache(cacheKey, component);
    return component;
  }
  /**
   * 문자열을 PascalCase로 변환
   */
  toPascalCase(str) {
    return str.split(/[-_\s]+/).map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join("");
  }
  /**
   * 기본 템플릿 생성
   */
  generateDefaultTemplate(routeName) {
    return `<div class="route-${routeName}"><h1>Route: ${routeName}</h1></div>`;
  }
  /**
   * 컴포넌트 데이터 가져오기
   */
  async fetchComponentData(dataURL) {
    try {
      const queryString = this.router.queryManager?.buildQueryString(this.router.queryManager?.getQueryParams()) || "";
      const fullURL = queryString ? `${dataURL}?${queryString}` : dataURL;
      this.log("debug", `Fetching data from: ${fullURL}`);
      const response = await fetch(fullURL, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (typeof data !== "object" || data === null) {
        throw new Error("Invalid data format: expected object");
      }
      return data;
    } catch (error) {
      this.log("error", "Failed to fetch component data:", error);
      throw error;
    }
  }
  /**
   * 캐시 무효화
   */
  invalidateCache(routeName) {
    if (this.router.cacheManager) {
      this.router.cacheManager.invalidateComponentCache(routeName);
    }
    this.log("debug", `Cache invalidated for route: ${routeName}`);
  }
  /**
   * 통계 정보 반환
   */
  getStats() {
    return {
      environment: this.config.environment,
      srcPath: this.config.srcPath,
      routesPath: this.config.routesPath,
      useLayout: this.config.useLayout,
      useComponents: this.config.useComponents
    };
  }
  /**
   * 페이지 제목 생성
   */
  generatePageTitle(routeName) {
    return this.toPascalCase(routeName).replace(/([A-Z])/g, " $1").trim();
  }
  /**
   * 로깅 래퍼 메서드
   */
  log(level, ...args) {
    if (this.router?.errorHandler) {
      this.router.errorHandler.log(level, "RouteLoader", ...args);
    }
  }
  /**
   * 정리 (메모리 누수 방지)
   */
  destroy() {
    this.log("debug", "RouteLoader destroyed");
    this.router = null;
  }
};

// src/core/ErrorHandler.js
var ErrorHandler = class {
  constructor(router, options = {}) {
    this.config = {
      enableErrorReporting: options.enableErrorReporting !== false,
      debug: options.debug || false,
      logLevel: options.logLevel || (options.debug ? "debug" : "info"),
      environment: options.environment || "development"
    };
    this.router = router;
    this.logLevels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
    this.log("info", "ErrorHandler", "ErrorHandler initialized with config:", this.config);
  }
  /**
   * 라우트 에러 처리
   */
  async handleRouteError(routeName, error) {
    let errorCode = 500;
    let errorMessage = "\uD398\uC774\uC9C0\uB97C \uB85C\uB4DC\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.";
    this.debug("ErrorHandler", "\uC5D0\uB7EC \uC0C1\uC138:", error.message, error.name);
    if (error.message.includes("not found") || error.message.includes("404") || error.message.includes("Failed to resolve") || error.message.includes("Failed to fetch") || error.name === "TypeError" && error.message.includes("resolve")) {
      errorCode = 404;
      errorMessage = `'${routeName}' \uD398\uC774\uC9C0\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.`;
    } else if (error.message.includes("network") && !error.message.includes("not found")) {
      errorCode = 503;
      errorMessage = "\uB124\uD2B8\uC6CC\uD06C \uC5F0\uACB0\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694.";
    } else if (error.message.includes("permission") || error.message.includes("403")) {
      errorCode = 403;
      errorMessage = "\uD398\uC774\uC9C0\uC5D0 \uC811\uADFC\uD560 \uAD8C\uD55C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.";
    }
    this.debug("ErrorHandler", `\uC5D0\uB7EC \uCF54\uB4DC \uACB0\uC815: ${errorCode} (\uB77C\uC6B0\uD2B8: ${routeName})`);
    if (this.config.enableErrorReporting) {
      this.reportError(routeName, error, errorCode);
    }
    try {
      if (errorCode === 404) {
        await this.load404Page();
      } else {
        await this.loadErrorPage(errorCode, errorMessage);
      }
    } catch (fallbackError) {
      this.error("ErrorHandler", "\uC5D0\uB7EC \uD398\uC774\uC9C0 \uB85C\uB529 \uC2E4\uD328:", fallbackError);
      this.showFallbackErrorPage(errorCode, errorMessage);
    }
  }
  /**
   * 404 페이지 로딩
   */
  async load404Page() {
    try {
      this.info("ErrorHandler", "Loading 404 page...");
      const component = await this.createVueComponent("404");
      await this.renderComponentWithTransition(component, "404");
      this.info("ErrorHandler", "404 page loaded successfully");
    } catch (error) {
      this.error("ErrorHandler", "404 page loading failed:", error);
      this.showFallbackErrorPage("404", "\uD398\uC774\uC9C0\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
    }
  }
  /**
   * 에러 페이지 로딩
   */
  async loadErrorPage(errorCode, errorMessage) {
    try {
      this.info("ErrorHandler", `Loading error page for ${errorCode}...`);
      const errorComponent = await this.createErrorComponent(errorCode, errorMessage);
      await this.renderComponentWithTransition(errorComponent, "error");
      this.info("ErrorHandler", `Error page ${errorCode} loaded successfully`);
    } catch (error) {
      this.error("ErrorHandler", `Error page ${errorCode} loading failed:`, error);
      this.showFallbackErrorPage(errorCode, errorMessage);
    }
  }
  /**
   * 에러 컴포넌트 생성
   */
  async createErrorComponent(errorCode, errorMessage) {
    try {
      const component = await this.createVueComponent("error");
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
      this.error("ErrorHandler", "Error component load failed:", error);
      throw new Error(`Cannot load error page: ${error.message}`);
    }
  }
  /**
   * 폴백 에러 페이지 표시 (모든 에러 페이지가 실패했을 때)
   */
  showFallbackErrorPage(errorCode, errorMessage) {
    const appElement = document.getElementById("app");
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
                    ">\uC694\uCCAD\uD558\uC2E0 \uD398\uC774\uC9C0\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.</p>
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
                        \uD648\uC73C\uB85C \uB3CC\uC544\uAC00\uAE30
                    </button>
                </div>
            </div>
        `;
    appElement.innerHTML = fallbackHTML;
    this.info("ErrorHandler", `Fallback error page displayed for ${errorCode}`);
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
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      routerConfig: {
        environment: this.router.config.environment,
        mode: this.router.config.mode
      }
    };
    this.error("ErrorHandler", "\uB77C\uC6B0\uD130 \uC5D0\uB7EC \uB9AC\uD3EC\uD2B8:", errorReport);
  }
  /**
   * Vue 컴포넌트 생성 (RouteLoader 위임)
   */
  async createVueComponent(routeName) {
    if (this.router.routeLoader) {
      return await this.router.routeLoader.createVueComponent(routeName);
    }
    throw new Error("RouteLoader not available");
  }
  /**
   * 컴포넌트 렌더링 (ViewManager 위임)
   */
  async renderComponentWithTransition(component, routeName) {
    if (this.router.renderComponentWithTransition) {
      return await this.router.renderComponentWithTransition(component, routeName);
    }
    throw new Error("Render function not available");
  }
  /**
   * 통합 로깅 시스템
   * @param {string} level - 로그 레벨 (error, warn, info, debug)
   * @param {string} component - 컴포넌트 이름 (선택적)
   * @param {...any} args - 로그 메시지
   */
  log(level, component, ...args) {
    if (typeof level !== "string" || !this.logLevels.hasOwnProperty(level)) {
      args = [component, ...args];
      component = level;
      level = this.config.debug ? "debug" : "info";
    }
    const currentLevelValue = this.logLevels[this.config.logLevel] || this.logLevels.info;
    const messageLevelValue = this.logLevels[level] || this.logLevels.info;
    if (messageLevelValue > currentLevelValue) {
      return;
    }
    if (this.config.environment === "production" && messageLevelValue > this.logLevels.warn) {
      return;
    }
    const prefix = component ? `[${component}]` : "[ViewLogic]";
    const timestamp = (/* @__PURE__ */ new Date()).toISOString().substring(11, 23);
    switch (level) {
      case "error":
        console.error(`${timestamp} ${prefix}`, ...args);
        break;
      case "warn":
        console.warn(`${timestamp} ${prefix}`, ...args);
        break;
      case "info":
        console.info(`${timestamp} ${prefix}`, ...args);
        break;
      case "debug":
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
    this.log("error", component, ...args);
  }
  /**
   * 경고 로그
   */
  warn(component, ...args) {
    this.log("warn", component, ...args);
  }
  /**
   * 정보 로그
   */
  info(component, ...args) {
    this.log("info", component, ...args);
  }
  /**
   * 디버그 로그
   */
  debug(component, ...args) {
    this.log("debug", component, ...args);
  }
  /**
   * 정리 (메모리 누수 방지)
   */
  destroy() {
    this.router = null;
    this.info("ErrorHandler", "ErrorHandler destroyed");
  }
};

// src/core/ComponentLoader.js
var ComponentLoader = class {
  constructor(router = null, options = {}) {
    this.config = {
      componentsPath: options.componentsPath || "/components",
      // srcPath 기준 상대 경로
      debug: options.debug || false,
      environment: options.environment || "development",
      ...options
    };
    this.router = router;
    this.loadingPromises = /* @__PURE__ */ new Map();
    this.unifiedComponents = null;
  }
  /**
   * 로깅 래퍼 메서드
   */
  log(level, ...args) {
    if (this.router?.errorHandler) {
      this.router.errorHandler.log(level, "ComponentLoader", ...args);
    }
  }
  /**
   * 컴포넌트를 비동기로 로드
   */
  async loadComponent(componentName) {
    if (!componentName || typeof componentName !== "string") {
      throw new Error("Component name must be a non-empty string");
    }
    if (this.loadingPromises.has(componentName)) {
      return this.loadingPromises.get(componentName);
    }
    const loadPromise = this._loadComponentFromFile(componentName);
    this.loadingPromises.set(componentName, loadPromise);
    try {
      const component = await loadPromise;
      return component;
    } catch (error) {
      throw error;
    } finally {
      this.loadingPromises.delete(componentName);
    }
  }
  /**
   * 파일에서 컴포넌트 로드
   */
  async _loadComponentFromFile(componentName) {
    const componentRelativePath = `${this.config.componentsPath}/${componentName}.js`;
    let componentPath;
    if (this.router && this.router.config.srcPath) {
      const srcPath = this.router.config.srcPath;
      if (srcPath.startsWith("http")) {
        const cleanSrcPath = srcPath.endsWith("/") ? srcPath.slice(0, -1) : srcPath;
        const cleanComponentPath = componentRelativePath.startsWith("/") ? componentRelativePath : `/${componentRelativePath}`;
        componentPath = `${cleanSrcPath}${cleanComponentPath}`;
      } else {
        componentPath = this.router.resolvePath(`${srcPath}${componentRelativePath}`);
      }
    } else {
      componentPath = this.router ? this.router.resolvePath(`/src${componentRelativePath}`) : `/src${componentRelativePath}`;
    }
    try {
      const module = await import(componentPath);
      const component = module.default;
      if (!component) {
        throw new Error(`Component '${componentName}' has no default export`);
      }
      if (!component.name) {
        component.name = componentName;
      }
      this.log("debug", `Component '${componentName}' loaded successfully`);
      return component;
    } catch (error) {
      this.log("error", `Failed to load component '${componentName}':`, error);
      throw new Error(`Component '${componentName}' not found: ${error.message}`);
    }
  }
  /**
   * 컴포넌트 모듈 클리어
   */
  clearComponents() {
    this.loadingPromises.clear();
    this.unifiedComponents = null;
    this.log("debug", "All components cleared");
  }
  /**
   * 환경에 따른 모든 컴포넌트 로딩 (캐싱 지원)
   */
  async loadAllComponents() {
    if (this.unifiedComponents) {
      this.log("debug", "Using existing unified components");
      return this.unifiedComponents;
    }
    if (this.config.environment === "production") {
      return await this._loadProductionComponents();
    }
    return await this._loadDevelopmentComponents();
  }
  /**
   * 운영 모드: 통합 컴포넌트 로딩
   */
  async _loadProductionComponents() {
    try {
      const componentsPath = `${this.router?.config?.routesPath || "/routes"}/_components.js`;
      this.log("info", "[PRODUCTION] Loading unified components from:", componentsPath);
      const componentsModule = await import(componentsPath);
      if (typeof componentsModule.registerComponents === "function") {
        this.unifiedComponents = componentsModule.components || {};
        this.log("info", `[PRODUCTION] Unified components loaded: ${Object.keys(this.unifiedComponents).length} components`);
        return this.unifiedComponents;
      } else {
        throw new Error("registerComponents function not found in components module");
      }
    } catch (error) {
      this.log("warn", "[PRODUCTION] Failed to load unified components:", error.message);
      this.unifiedComponents = {};
      return {};
    }
  }
  /**
   * 개발 모드: 개별 컴포넌트 로딩
   */
  async _loadDevelopmentComponents() {
    const componentNames = this._getComponentNames();
    const components = {};
    this.log("info", `[DEVELOPMENT] Loading individual components: ${componentNames.join(", ")}`);
    for (const name of componentNames) {
      try {
        const component = await this.loadComponent(name);
        if (component) {
          components[name] = component;
        }
      } catch (loadError) {
        this.log("warn", `[DEVELOPMENT] Failed to load component ${name}:`, loadError.message);
      }
    }
    this.unifiedComponents = components;
    this.log("info", `[DEVELOPMENT] Individual components loaded: ${Object.keys(components).length} components`);
    return components;
  }
  /**
   * 컴포넌트 이름 목록 가져오기
   */
  _getComponentNames() {
    if (Array.isArray(this.config.componentNames) && this.config.componentNames.length > 0) {
      return [...this.config.componentNames];
    }
    return [
      "Button",
      "Modal",
      "Card",
      "Toast",
      "Input",
      "Tabs",
      "Checkbox",
      "Alert",
      "DynamicInclude",
      "HtmlInclude"
    ];
  }
  /**
   * 메모리 정리
   */
  dispose() {
    this.clearComponents();
    this.log("debug", "ComponentLoader disposed");
    this.router = null;
  }
};

// src/viewlogic-router.js
var ViewLogicRouter = class {
  constructor(options = {}) {
    this.version = options.version || "1.0.0";
    this.config = this._buildConfig(options);
    this.currentHash = "";
    this.currentVueApp = null;
    this.previousVueApp = null;
    this.componentLoader = null;
    this.transitionInProgress = false;
    this.isReady = false;
    this.readyPromise = null;
    this._boundHandleRouteChange = this.handleRouteChange.bind(this);
    this.readyPromise = this.initialize();
  }
  /**
   * 설정 빌드 (분리하여 가독성 향상)
   */
  _buildConfig(options) {
    const currentOrigin = window.location.origin;
    const defaults = {
      basePath: "/",
      // 애플리케이션 기본 경로 (서브폴더 배포용)
      srcPath: "/src",
      // 소스 파일 경로
      mode: "hash",
      cacheMode: "memory",
      cacheTTL: 3e5,
      maxCacheSize: 50,
      useLayout: true,
      defaultLayout: "default",
      environment: "development",
      routesPath: "/routes",
      // 프로덕션 라우트 경로
      enableErrorReporting: true,
      useComponents: true,
      componentNames: ["Button", "Modal", "Card", "Toast", "Input", "Tabs", "Checkbox", "Alert", "DynamicInclude", "HtmlInclude"],
      useI18n: false,
      defaultLanguage: "ko",
      i18nPath: "/i18n",
      // 다국어 파일 경로
      logLevel: "info",
      authEnabled: false,
      loginRoute: "login",
      protectedRoutes: [],
      protectedPrefixes: [],
      publicRoutes: ["login", "register", "home"],
      checkAuthFunction: null,
      redirectAfterLogin: "home",
      authCookieName: "authToken",
      authFallbackCookieNames: ["accessToken", "token", "jwt"],
      authStorage: "cookie",
      authCookieOptions: {},
      authSkipValidation: false,
      enableParameterValidation: true,
      maxParameterLength: 1e3,
      maxParameterCount: 50,
      maxArraySize: 100,
      allowedKeyPattern: /^[a-zA-Z0-9_-]+$/,
      logSecurityWarnings: true
    };
    const config = { ...defaults, ...options };
    config.srcPath = this.resolvePath(config.srcPath, config.basePath);
    config.routesPath = this.resolvePath(config.routesPath, config.basePath);
    config.i18nPath = this.resolvePath(config.i18nPath, config.basePath);
    return config;
  }
  /**
   * 통합 경로 해결 - 서브폴더 배포 및 basePath 지원
   */
  resolvePath(path, basePath = null) {
    const currentOrigin = window.location.origin;
    if (path.startsWith("http")) {
      return path;
    }
    if (path.startsWith("/")) {
      if (basePath && basePath !== "/") {
        const cleanBasePath = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
        const cleanPath = path.startsWith("/") ? path : `/${path}`;
        const fullPath = `${cleanBasePath}${cleanPath}`;
        const fullUrl2 = `${currentOrigin}${fullPath}`;
        return fullUrl2.replace(/([^:])\/{2,}/g, "$1/");
      }
      return `${currentOrigin}${path}`;
    }
    const currentPathname = window.location.pathname;
    const currentBase = currentPathname.endsWith("/") ? currentPathname : currentPathname.substring(0, currentPathname.lastIndexOf("/") + 1);
    const resolvedPath = this.normalizePath(currentBase + path);
    const fullUrl = `${currentOrigin}${resolvedPath}`;
    return fullUrl.replace(/([^:])\/{2,}/g, "$1/");
  }
  /**
   * URL 경로 정규화 (이중 슬래시 제거 및 ../, ./ 처리)
   */
  normalizePath(path) {
    path = path.replace(/\/+/g, "/");
    const parts = path.split("/").filter((part) => part !== "" && part !== ".");
    const stack = [];
    for (const part of parts) {
      if (part === "..") {
        if (stack.length > 0 && stack[stack.length - 1] !== "..") {
          stack.pop();
        } else if (!path.startsWith("/")) {
          stack.push(part);
        }
      } else {
        stack.push(part);
      }
    }
    const normalized = "/" + stack.join("/");
    return normalized === "/" ? "/" : normalized;
  }
  /**
   * 로깅 래퍼 메서드
   */
  log(level, ...args) {
    if (this.errorHandler) {
      this.errorHandler.log(level, "Router", ...args);
    }
  }
  /**
   * 통합 초기화 - 매니저 생성 → 비동기 로딩 → 라우터 시작
   */
  async initialize() {
    try {
      this.cacheManager = new CacheManager(this, this.config);
      this.routeLoader = new RouteLoader(this, this.config);
      this.queryManager = new QueryManager(this, this.config);
      this.errorHandler = new ErrorHandler(this, this.config);
      if (this.config.useI18n) {
        try {
          this.i18nManager = new I18nManager(this, this.config);
          if (this.i18nManager.initPromise) {
            await this.i18nManager.initPromise;
          }
          this.log("info", "I18nManager initialized successfully");
        } catch (i18nError) {
          this.log("warn", "I18nManager initialization failed, continuing without i18n:", i18nError.message);
          this.i18nManager = null;
          this.config.useI18n = false;
        }
      }
      if (this.config.authEnabled) {
        this.authManager = new AuthManager(this, this.config);
      }
      if (this.config.useComponents) {
        try {
          this.componentLoader = new ComponentLoader(this, {
            ...this.config,
            basePath: `${this.config.basePath}/components`,
            cache: true,
            componentNames: this.config.componentNames
          });
          await this.componentLoader.loadAllComponents();
          this.log("info", "ComponentLoader initialized successfully");
        } catch (componentError) {
          this.log("warn", "ComponentLoader initialization failed, continuing without components:", componentError.message);
          this.componentLoader = null;
        }
      }
      this.isReady = true;
      this.init();
    } catch (error) {
      this.log("error", "Router initialization failed:", error);
      this.isReady = true;
      this.init();
    }
  }
  /**
   * 라우터가 준비될 때까지 대기
   */
  async waitForReady() {
    if (this.isReady) return true;
    if (this.readyPromise) {
      await this.readyPromise;
    }
    return this.isReady;
  }
  init() {
    const isHashMode = this.config.mode === "hash";
    window.addEventListener(
      isHashMode ? "hashchange" : "popstate",
      this._boundHandleRouteChange
    );
    const initRoute = () => {
      if (isHashMode && !window.location.hash) {
        window.location.hash = "#/";
      } else if (!isHashMode && window.location.pathname === "/") {
        this.navigateTo("home");
      } else {
        this.handleRouteChange();
      }
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initRoute);
    } else {
      requestAnimationFrame(initRoute);
    }
  }
  handleRouteChange() {
    const { route, queryParams } = this._parseCurrentLocation();
    this.queryManager?.setCurrentQueryParams(queryParams);
    if (route !== this.currentHash || this.queryManager?.hasQueryParamsChanged(queryParams)) {
      this.currentHash = route;
      this.loadRoute(route);
    }
  }
  /**
   * 현재 위치 파싱 (분리하여 가독성 향상)
   */
  _parseCurrentLocation() {
    if (this.config.mode === "hash") {
      const hashPath = window.location.hash.slice(1) || "/";
      const [pathPart, queryPart] = hashPath.split("?");
      let route = "home";
      if (pathPart && pathPart !== "/") {
        route = pathPart.startsWith("/") ? pathPart.slice(1) : pathPart;
      }
      return {
        route: route || "home",
        queryParams: this.queryManager?.parseQueryString(queryPart || window.location.search.slice(1)) || {}
      };
    } else {
      const fullPath = window.location.pathname;
      const basePath = this.config.basePath || "/";
      let route = fullPath;
      if (basePath !== "/" && fullPath.startsWith(basePath)) {
        route = fullPath.slice(basePath.length);
      }
      if (route.startsWith("/")) {
        route = route.slice(1);
      }
      return {
        route: route || "home",
        queryParams: this.queryManager?.parseQueryString(window.location.search.slice(1)) || {}
      };
    }
  }
  async loadRoute(routeName) {
    const inProgress = this.transitionInProgress;
    if (inProgress) {
      return;
    }
    try {
      this.transitionInProgress = true;
      const authResult = this.authManager ? await this.authManager.checkAuthentication(routeName) : { allowed: true, reason: "auth_disabled" };
      if (!authResult.allowed) {
        if (this.authManager) {
          this.authManager.emitAuthEvent("auth_required", {
            originalRoute: routeName,
            loginRoute: this.config.loginRoute
          });
          if (routeName !== this.config.loginRoute) {
            this.navigateTo(this.config.loginRoute, { redirect: routeName });
          } else {
            this.navigateTo(this.config.loginRoute);
          }
        }
        return;
      }
      const appElement = document.getElementById("app");
      if (!appElement) {
        throw new Error("App element not found");
      }
      const component = await this.routeLoader.createVueComponent(routeName);
      await this.renderComponentWithTransition(component, routeName);
    } catch (error) {
      this.log("error", `Route loading failed [${routeName}]:`, error.message);
      if (this.errorHandler) {
        await this.errorHandler.handleRouteError(routeName, error);
      } else {
        console.error("[Router] No error handler available");
      }
    } finally {
      this.transitionInProgress = false;
    }
  }
  async renderComponentWithTransition(vueComponent, routeName) {
    const appElement = document.getElementById("app");
    if (!appElement) return;
    const newPageContainer = document.createElement("div");
    newPageContainer.className = "page-container page-entered";
    newPageContainer.id = `page-${routeName}-${Date.now()}`;
    const existingContainers = appElement.querySelectorAll(".page-container");
    existingContainers.forEach((container) => {
      container.classList.remove("page-entered");
      container.classList.add("page-exiting");
    });
    appElement.appendChild(newPageContainer);
    if (this.config.environment === "development" && vueComponent._style) {
      this.applyStyle(vueComponent._style, routeName);
    }
    const { createApp } = Vue;
    const newVueApp = createApp(vueComponent);
    newVueApp.config.globalProperties.$router = {
      navigateTo: (route, params) => this.navigateTo(route, params),
      getCurrentRoute: () => this.getCurrentRoute(),
      // 통합된 파라미터 관리 (라우팅 + 쿼리 파라미터)
      getParams: () => this.queryManager?.getAllParams() || {},
      getParam: (key, defaultValue) => this.queryManager?.getParam(key, defaultValue),
      // 쿼리 파라미터 전용 메서드 (하위 호환성)
      getQueryParams: () => this.queryManager?.getQueryParams() || {},
      getQueryParam: (key, defaultValue) => this.queryManager?.getQueryParam(key, defaultValue),
      setQueryParams: (params, replace) => this.queryManager?.setQueryParams(params, replace),
      removeQueryParams: (keys) => this.queryManager?.removeQueryParams(keys),
      // 라우팅 파라미터 전용 메서드
      getRouteParams: () => this.queryManager?.getRouteParams() || {},
      getRouteParam: (key, defaultValue) => this.queryManager?.getRouteParam(key, defaultValue),
      currentRoute: this.currentHash,
      currentQuery: this.queryManager?.getQueryParams() || {}
    };
    newVueApp.mount(`#${newPageContainer.id}`);
    requestAnimationFrame(() => {
      this.cleanupPreviousPages();
      this.transitionInProgress = false;
    });
    if (this.currentVueApp) {
      this.previousVueApp = this.currentVueApp;
    }
    this.currentVueApp = newVueApp;
  }
  cleanupPreviousPages() {
    const appElement = document.getElementById("app");
    if (!appElement) return;
    const fragment = document.createDocumentFragment();
    const exitingContainers = appElement.querySelectorAll(".page-container.page-exiting");
    exitingContainers.forEach((container) => container.remove());
    if (this.previousVueApp) {
      try {
        this.previousVueApp.unmount();
      } catch (error) {
      }
      this.previousVueApp = null;
    }
    appElement.querySelector(".loading")?.remove();
  }
  applyStyle(css, routeName) {
    const existing = document.querySelector(`style[data-route="${routeName}"]`);
    if (existing) existing.remove();
    if (css) {
      const style = document.createElement("style");
      style.textContent = css;
      style.setAttribute("data-route", routeName);
      document.head.appendChild(style);
    }
  }
  navigateTo(routeName, params = null) {
    if (typeof routeName === "object") {
      params = routeName.params || null;
      routeName = routeName.route;
    }
    if (routeName !== this.currentHash && this.queryManager) {
      this.queryManager.clearQueryParams();
    }
    if (this.queryManager) {
      this.queryManager.setCurrentRouteParams(params);
    }
    this.updateURL(routeName, params);
  }
  getCurrentRoute() {
    return this.currentHash;
  }
  updateURL(route, params = null) {
    const queryParams = params || this.queryManager?.getQueryParams() || {};
    const queryString = this.queryManager?.buildQueryString(queryParams) || "";
    const buildURL = (route2, queryString2, isHash = true) => {
      let base = route2 === "home" ? "/" : `/${route2}`;
      if (!isHash && this.config.basePath && this.config.basePath !== "/") {
        base = `${this.config.basePath}${base}`;
      }
      const url = queryString2 ? `${base}?${queryString2}` : base;
      return isHash ? `#${url}` : url;
    };
    if (this.config.mode === "hash") {
      const newHash = buildURL(route, queryString);
      if (window.location.hash !== newHash) {
        window.location.hash = newHash;
      }
    } else {
      const newPath = buildURL(route, queryString, false);
      let expectedPath = route === "home" ? "/" : `/${route}`;
      if (this.config.basePath && this.config.basePath !== "/") {
        expectedPath = `${this.config.basePath}${expectedPath}`;
      }
      const isSameRoute = window.location.pathname === expectedPath;
      if (isSameRoute) {
        window.history.replaceState({}, "", newPath);
      } else {
        window.history.pushState({}, "", newPath);
      }
      this.handleRouteChange();
    }
  }
  /**
   * 라우터 정리 (메모리 누수 방지)
   */
  destroy() {
    window.removeEventListener(
      this.config.mode === "hash" ? "hashchange" : "popstate",
      this._boundHandleRouteChange
    );
    if (this.currentVueApp) {
      this.currentVueApp.unmount();
      this.currentVueApp = null;
    }
    if (this.previousVueApp) {
      this.previousVueApp.unmount();
      this.previousVueApp = null;
    }
    Object.values(this).forEach((manager) => {
      if (manager && typeof manager.destroy === "function") {
        manager.destroy();
      }
    });
    this.cacheManager?.clearAll();
    const appElement = document.getElementById("app");
    if (appElement) {
      appElement.innerHTML = "";
    }
    this.log("info", "Router destroyed");
  }
};
export {
  ViewLogicRouter
};
//# sourceMappingURL=viewlogic-router.js.map
