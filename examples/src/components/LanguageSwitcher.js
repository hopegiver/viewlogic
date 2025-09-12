/**
 * LanguageSwitcher 컴포넌트
 * 언어 변환 기능을 제공하는 컴포넌트
 */
export default {
    name: 'LanguageSwitcher',
    template: `
        <div class="language-switcher" :class="switcherClasses">
            <button
                v-if="variant === 'button'"
                class="language-button"
                @click="toggleDropdown"
                :disabled="loading"
            >
                <span class="language-icon">🌐</span>
                <span class="language-text">{{ currentLanguageLabel }}</span>
                <span class="language-arrow" :class="{ 'language-arrow-open': showDropdown }">▼</span>
            </button>
            
            <select
                v-else-if="variant === 'select'"
                class="language-select"
                :value="currentLanguage"
                @change="changeLanguage"
                :disabled="loading"
            >
                <option
                    v-for="lang in availableLanguages"
                    :key="lang.code"
                    :value="lang.code"
                >
                    {{ lang.label }}
                </option>
            </select>
            
            <div
                v-else
                class="language-inline"
            >
                <button
                    v-for="lang in availableLanguages"
                    :key="lang.code"
                    class="language-option"
                    :class="{ 'language-option-active': lang.code === currentLanguage }"
                    @click="setLanguage(lang.code)"
                    :disabled="loading || lang.code === currentLanguage"
                >
                    {{ lang.label }}
                </button>
            </div>
            
            <!-- 드롭다운 메뉴 -->
            <div
                v-if="variant === 'button' && showDropdown"
                class="language-dropdown"
                @click.stop
            >
                <button
                    v-for="lang in availableLanguages"
                    :key="lang.code"
                    class="language-dropdown-option"
                    :class="{ 'language-dropdown-option-active': lang.code === currentLanguage }"
                    @click="setLanguage(lang.code)"
                    :disabled="loading"
                >
                    <span class="language-flag">{{ lang.flag }}</span>
                    <span class="language-name">{{ lang.label }}</span>
                    <span v-if="lang.code === currentLanguage" class="language-check">✓</span>
                </button>
            </div>
            
            <!-- 로딩 오버레이 -->
            <div v-if="loading" class="language-loading">
                <div class="language-spinner"></div>
            </div>
        </div>
    `,
    emits: ['language-changed'],
    props: {
        variant: {
            type: String,
            default: 'button',
            validator: (value) => ['button', 'select', 'inline'].includes(value)
        },
        size: {
            type: String,
            default: 'medium',
            validator: (value) => ['small', 'medium', 'large'].includes(value)
        },
        showLabels: {
            type: Boolean,
            default: true
        },
        useQueryParam: {
            type: Boolean,
            default: true
        }
    },
    data() {
        return {
            currentLanguage: 'ko',
            showDropdown: false,
            loading: false,
            availableLanguages: [
                {
                    code: 'ko',
                    label: '한국어',
                    flag: '🇰🇷'
                },
                {
                    code: 'en',
                    label: 'English',
                    flag: '🇺🇸'
                }
            ]
        };
    },
    computed: {
        switcherClasses() {
            return [
                `language-switcher-${this.variant}`,
                `language-switcher-${this.size}`,
                {
                    'language-switcher-loading': this.loading,
                    'language-switcher-dropdown-open': this.showDropdown
                }
            ];
        },
        currentLanguageLabel() {
            const lang = this.availableLanguages.find(l => l.code === this.currentLanguage);
            return lang ? lang.label : this.currentLanguage;
        }
    },
    mounted() {
        // i18n 시스템에서 현재 언어 가져오기
        if (window.i18n) {
            this.currentLanguage = window.i18n.getCurrentLanguage();
            
            // 언어 변경 이벤트 리스너 등록
            window.i18n.on('languageChanged', this.onLanguageChanged);
        }
        
        // 외부 클릭 시 드롭다운 닫기
        document.addEventListener('click', this.closeDropdown);
    },
    unmounted() {
        // 이벤트 리스너 제거
        if (window.i18n) {
            window.i18n.off('languageChanged', this.onLanguageChanged);
        }
        document.removeEventListener('click', this.closeDropdown);
    },
    methods: {
        async setLanguage(languageCode) {
            if (this.loading || languageCode === this.currentLanguage) {
                return;
            }
            
            this.loading = true;
            this.showDropdown = false;
            
            try {
                if (window.i18n) {
                    const success = await window.i18n.setLanguage(languageCode);
                    if (success) {
                        this.currentLanguage = languageCode;
                        
                        // 쿼리 파라미터 업데이트
                        if (this.useQueryParam && window.router) {
                            window.router.setQueryParams({ lang: languageCode });
                        }
                        
                        this.$emit('language-changed', {
                            language: languageCode,
                            label: this.currentLanguageLabel
                        });
                    }
                } else {
                    console.warn('i18n system not available');
                }
            } catch (error) {
                console.error('Failed to change language:', error);
            } finally {
                this.loading = false;
            }
        },
        
        changeLanguage(event) {
            this.setLanguage(event.target.value);
        },
        
        toggleDropdown() {
            if (!this.loading) {
                this.showDropdown = !this.showDropdown;
            }
        },
        
        closeDropdown() {
            this.showDropdown = false;
        },
        
        onLanguageChanged(data) {
            this.currentLanguage = data.to;
        }
    }
};