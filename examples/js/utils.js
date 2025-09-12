/**
 * ViewLogic Utility Functions
 * 개별 페이지에서 공통으로 사용할 수 있는 유틸리티 함수들
 */

// ========================================
// 쿠키 관련 유틸리티
// ========================================

/**
 * 쿠키 설정
 * @param {string} name - 쿠키 이름
 * @param {string} value - 쿠키 값
 * @param {number} days - 만료일 (일 단위, 기본 7일)
 */
function setCookie(name, value, days = 7) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

/**
 * 쿠키 가져오기
 * @param {string} name - 쿠키 이름
 * @returns {string|null} 쿠키 값 또는 null
 */
function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

/**
 * 쿠키 삭제
 * @param {string} name - 삭제할 쿠키 이름
 */
function deleteCookie(name) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

// ========================================
// 로컬 스토리지 관련 유틸리티
// ========================================

/**
 * 로컬 스토리지에 객체 저장
 * @param {string} key - 저장할 키
 * @param {any} value - 저장할 값
 */
function setLocalStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error('로컬 스토리지 저장 실패:', error);
    }
}

/**
 * 로컬 스토리지에서 객체 가져오기
 * @param {string} key - 가져올 키
 * @param {any} defaultValue - 기본값
 * @returns {any} 저장된 값 또는 기본값
 */
function getLocalStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error('로컬 스토리지 읽기 실패:', error);
        return defaultValue;
    }
}

// ========================================
// 숫자/날짜 포맷팅 유틸리티
// ========================================

/**
 * 숫자를 한국어 단위로 포맷팅
 * @param {number} num - 포맷팅할 숫자
 * @returns {string} 포맷팅된 문자열
 */
function formatNumber(num) {
    if (!num) return '0';
    if (num >= 100000000) {
        return Math.floor(num / 100000000) + '억';
    } else if (num >= 10000) {
        return Math.floor(num / 10000) + '만';
    } else if (num >= 1000) {
        return Math.floor(num / 1000) + '천';
    }
    return num.toLocaleString('ko-KR');
}

/**
 * 가격을 한국 원화 형식으로 포맷팅
 * @param {number} price - 포맷팅할 가격
 * @returns {string} 포맷팅된 가격 문자열
 */
function formatPrice(price) {
    if (price == null || price === undefined) {
        return '0';
    }
    return price.toLocaleString('ko-KR');
}

/**
 * 조회수를 축약 형태로 포맷팅
 * @param {number} views - 조회수
 * @returns {string} 포맷팅된 조회수
 */
function formatViews(views) {
    if (views >= 1000000) {
        return (views / 1000000).toFixed(1) + 'M';
    } else if (views >= 1000) {
        return (views / 1000).toFixed(0) + 'K';
    }
    return views.toString();
}

/**
 * 날짜를 상대적 시간으로 포맷팅
 * @param {string|Date} date - 날짜
 * @returns {string} 상대적 시간 문자열
 */
function formatRelativeTime(date) {
    const now = new Date();
    const targetDate = new Date(date);
    const diffInSeconds = Math.floor((now - targetDate) / 1000);
    
    if (diffInSeconds < 60) return '방금 전';
    if (diffInSeconds < 3600) return Math.floor(diffInSeconds / 60) + '분 전';
    if (diffInSeconds < 86400) return Math.floor(diffInSeconds / 3600) + '시간 전';
    if (diffInSeconds < 2592000) return Math.floor(diffInSeconds / 86400) + '일 전';
    if (diffInSeconds < 31536000) return Math.floor(diffInSeconds / 2592000) + '달 전';
    return Math.floor(diffInSeconds / 31536000) + '년 전';
}

/**
 * 날짜를 한국어 형식으로 포맷팅
 * @param {string|Date} date - 날짜
 * @returns {string} 포맷팅된 날짜
 */
function formatKoreanDate(date) {
    const targetDate = new Date(date);
    return targetDate.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// ========================================
// URL 관련 유틸리티
// ========================================

/**
 * URL 파라미터 가져오기
 * @param {string} name - 파라미터 이름
 * @returns {string|null} 파라미터 값
 */
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

/**
 * 해시에서 라우트 파라미터 가져오기
 * @param {string} name - 파라미터 이름
 * @returns {string|null} 파라미터 값
 */
function getHashParameter(name) {
    const hash = window.location.hash;
    if (hash.includes('?')) {
        const queryString = hash.split('?')[1];
        const urlParams = new URLSearchParams(queryString);
        return urlParams.get(name);
    }
    return null;
}

// ========================================
// 장바구니 관련 유틸리티
// ========================================

/**
 * 장바구니 아이템 수 업데이트
 */
function updateCartItemCount() {
    const cart = getLocalStorage('cart', []);
    const totalItems = cart.reduce((total, item) => total + (item.quantity || 1), 0);
    setCookie('cartItemCount', totalItems);
    
    // 커스텀 이벤트 발생시켜서 네비게이션 업데이트
    window.dispatchEvent(new CustomEvent('cartUpdated', {
        detail: { 
            itemCount: totalItems,
            totalAmount: cart.reduce((total, item) => total + (item.price * item.quantity || 0), 0)
        }
    }));
}

/**
 * 장바구니에 상품 추가
 * @param {Object} product - 상품 정보
 * @param {number} quantity - 수량
 * @param {string} color - 색상 (선택)
 * @param {string} size - 사이즈 (선택)
 */
function addToCart(product, quantity = 1, color = null, size = null) {
    const cart = getLocalStorage('cart', []);
    const cartItem = {
        id: product.id,
        name: product.name,
        price: product.price,
        originalPrice: product.originalPrice,
        image: product.image,
        quantity: quantity,
        color: color,
        size: size,
        addedAt: new Date().toISOString()
    };

    // 같은 상품, 같은 옵션인지 확인
    const existingItemIndex = cart.findIndex(item => 
        item.id === cartItem.id && 
        item.color === cartItem.color && 
        item.size === cartItem.size
    );

    if (existingItemIndex > -1) {
        cart[existingItemIndex].quantity += quantity;
        cart[existingItemIndex].addedAt = new Date().toISOString();
    } else {
        cart.push(cartItem);
    }

    setLocalStorage('cart', cart);
    updateCartItemCount();
}

// ========================================
// 문자열 관련 유틸리티
// ========================================

/**
 * 문자열 자르기 (한글 고려)
 * @param {string} str - 자를 문자열
 * @param {number} length - 최대 길이
 * @param {string} suffix - 말줄임표 (기본 '...')
 * @returns {string} 자른 문자열
 */
function truncateString(str, length, suffix = '...') {
    if (!str || str.length <= length) return str;
    return str.substring(0, length) + suffix;
}

/**
 * HTML 태그 제거
 * @param {string} html - HTML 문자열
 * @returns {string} 태그가 제거된 문자열
 */
function stripHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
}

// ========================================
// DOM 관련 유틸리티
// ========================================

/**
 * 요소가 뷰포트에 보이는지 확인
 * @param {HTMLElement} element - 확인할 요소
 * @returns {boolean} 보이는지 여부
 */
function isElementInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

/**
 * 부드러운 스크롤
 * @param {HTMLElement|string} target - 스크롤할 대상 요소 또는 선택자
 * @param {number} offset - 오프셋 (기본 0)
 */
function smoothScrollTo(target, offset = 0) {
    const element = typeof target === 'string' ? document.querySelector(target) : target;
    if (element) {
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo({
            top: elementPosition - offset,
            behavior: 'smooth'
        });
    }
}

// ========================================
// 이벤트 관련 유틸리티
// ========================================

/**
 * 디바운스 함수
 * @param {Function} func - 실행할 함수
 * @param {number} wait - 대기 시간 (밀리초)
 * @returns {Function} 디바운스된 함수
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 스로틀 함수
 * @param {Function} func - 실행할 함수
 * @param {number} limit - 제한 시간 (밀리초)
 * @returns {Function} 스로틀된 함수
 */
function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ========================================
// 캐시 및 스토리지 관리
// ========================================

/**
 * 브라우저 캐시 및 스토리지 초기화
 */
function clearBrowserCache() {
    try {
        // LocalStorage 초기화
        localStorage.clear();
        
        // SessionStorage 초기화  
        sessionStorage.clear();
        
        // 쿠키 초기화
        document.cookie.split(";").forEach(function(c) { 
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });
        
        // IndexedDB 초기화 (가능한 경우)
        if ('indexedDB' in window) {
            indexedDB.databases().then(databases => {
                databases.forEach(db => {
                    indexedDB.deleteDatabase(db.name);
                });
            }).catch(() => {
                // IndexedDB 접근 실패 시 무시
            });
        }
        
        // 캐시 API 초기화 (Service Worker 캐시)
        if ('caches' in window) {
            caches.keys().then(names => {
                names.forEach(name => {
                    caches.delete(name);
                });
            }).catch(() => {
                // 캐시 접근 실패 시 무시
            });
        }
        
        console.log('브라우저 캐시 및 스토리지가 초기화되었습니다.');
        
        // 페이지 새로고침으로 완전한 초기화
        setTimeout(() => {
            window.location.reload(true);
        }, 100);
        
        return true;
    } catch (error) {
        console.error('캐시 초기화 중 오류 발생:', error);
        return false;
    }
}

/**
 * 특정 스토리지만 초기화
 */
function clearStorage(type = 'all') {
    try {
        switch (type) {
            case 'localStorage':
                localStorage.clear();
                break;
            case 'sessionStorage':
                sessionStorage.clear();
                break;
            case 'cookies':
                document.cookie.split(";").forEach(function(c) { 
                    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
                });
                break;
            case 'all':
            default:
                localStorage.clear();
                sessionStorage.clear();
                break;
        }
        return true;
    } catch (error) {
        console.error('스토리지 초기화 중 오류 발생:', error);
        return false;
    }
}

// ========================================
// 검증 관련 유틸리티
// ========================================

/**
 * 이메일 형식 검증
 * @param {string} email - 검증할 이메일
 * @returns {boolean} 유효한지 여부
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * 전화번호 형식 검증 (한국)
 * @param {string} phone - 검증할 전화번호
 * @returns {boolean} 유효한지 여부
 */
function isValidPhoneNumber(phone) {
    const phoneRegex = /^01([0|1|6|7|8|9])-?([0-9]{3,4})-?([0-9]{4})$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
}

// ========================================
// 유틸리티 함수들을 전역으로 노출
// ========================================

// 브라우저 환경에서 전역으로 사용할 수 있도록 window 객체에 추가
if (typeof window !== 'undefined') {
    window.ViewLogicUtils = {
        // 쿠키
        setCookie,
        getCookie,
        deleteCookie,
        
        // 로컬 스토리지
        setLocalStorage,
        getLocalStorage,
        
        // 포맷팅
        formatNumber,
        formatPrice,
        formatViews,
        formatRelativeTime,
        formatKoreanDate,
        
        // URL
        getUrlParameter,
        getHashParameter,
        
        // 장바구니
        updateCartItemCount,
        addToCart,
        
        // 문자열
        truncateString,
        stripHtml,
        
        // DOM
        isElementInViewport,
        smoothScrollTo,
        
        // 이벤트
        debounce,
        throttle,
        
        // 검증
        isValidEmail,
        isValidPhoneNumber,
        
        // 캐시 관리
        clearBrowserCache,
        clearStorage
    };
    
    // 개별 함수들도 전역으로 노출 (하위 호환성)
    Object.assign(window, {
        setCookie,
        getCookie,
        deleteCookie,
        updateCartItemCount,
        formatPrice,
        formatViews,
        formatNumber,
        formatKoreanDate,
        formatRelativeTime,
        clearBrowserCache,
        clearStorage
    });
}