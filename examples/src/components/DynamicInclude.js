export default {
    name: 'DynamicInclude',
    template: `
        <div class="dynamic-include">
            <div v-if="loading">로딩 중...</div>
            <div v-else-if="error">{{ errorMessage }}</div>
            <component v-else :is="dynamicComponent" />
        </div>
    `,
    
    props: {
        page: { 
            type: String, 
            required: true 
        }
    },
    
    data() {
        return {
            loading: false,
            error: false,
            errorMessage: '',
            dynamicComponent: null
        };
    },
    
    async mounted() {
        await this.loadPage();
    },
    
    watch: {
        page: {
            handler() {
                this.$nextTick(() => {
                    this.loadPage();
                });
            },
            immediate: false
        }
    },
    
    methods: {
        async loadPage() {
            if (!this.page) return;
            
            // 중복 로딩 방지
            if (this.loading) return;
            
            this.loading = true;
            this.error = false;
            
            try {
                // 라우터 상태 검사
                if (!window.router) {
                    throw new Error('Router not initialized');
                }
                
                // 라우터가 준비될 때까지 대기 (타임아웃 추가)
                if (!window.router?.routeLoader) {
                    await new Promise((resolve, reject) => {
                        let attempts = 0;
                        const maxAttempts = 100; // 5초 타임아웃
                        
                        const check = () => {
                            attempts++;
                            if (window.router?.routeLoader) {
                                resolve();
                            } else if (attempts >= maxAttempts) {
                                reject(new Error('Router timeout: RouteLoader not ready'));
                            } else {
                                setTimeout(check, 50);
                            }
                        };
                        check();
                    });
                }
                
                // 페이지 이름 유효성 검사
                if (!this.page || typeof this.page !== 'string' || this.page.trim() === '') {
                    throw new Error('Invalid page name provided');
                }
                
                // 컴포넌트 로드 (추가 예외 처리)
                const component = await window.router.routeLoader.createVueComponent(this.page.trim());
                
                // 개발 모드에서 스타일 적용
                if (component._style) {
                    this.applyStyle(component._style, `dynamic-${this.page}`);
                }
                
                this.dynamicComponent = Vue.markRaw(component);
                console.log(`DynamicInclude: ${this.page} component loaded successfully`);
                
            } catch (err) {
                // 간단한 에러 로깅 (라우터 비중단)
                console.warn(`DynamicInclude: Failed to load '${this.page}':`, err.message);
                
                // 에러 상태 설정
                this.error = true;
                this.errorMessage = err.message || `'${this.page}' 페이지를 로드할 수 없습니다`;
                this.dynamicComponent = null;
            } finally {
                this.loading = false;
            }
        },
        
        applyStyle(css, routeName) {
            try {
                // 기존 스타일 제거
                const existing = document.querySelector(`style[data-route="${routeName}"]`);
                if (existing) existing.remove();

                if (css) {
                    const style = document.createElement('style');
                    style.textContent = css;
                    style.setAttribute('data-route', routeName);
                    document.head.appendChild(style);
                    console.log(`DynamicInclude: Style applied for ${routeName}`);
                }
            } catch (err) {
                console.warn(`DynamicInclude: Failed to apply style for ${routeName}:`, err.message);
                // 스타일 적용 실패는 컴포넌트 로드에 영향을 주지 않음
            }
        },
        
    }
};