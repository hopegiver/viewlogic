export default {
    name: 'HtmlInclude',
    template: `
        <div :class="wrapperClass">
            <div v-if="loading">{{ loadingText }}</div>
            <div v-else-if="error" class="error-message">{{ errorMessage }}</div>
            <div v-else v-html="content"></div>
        </div>
    `,
    
    props: {
        src: { type: String, required: true },
        sanitize: { type: Boolean, default: true },
        loadingText: { type: String, default: '로딩 중...' },
        wrapperClass: { type: String, default: 'html-include' }
    },
    
    data: () => ({
        loading: false,
        error: false,
        errorMessage: '',
        content: ''
    }),
    
    async mounted() {
        await this.load();
    },
    
    watch: {
        src: 'load'
    },
    
    methods: {
        async load() {
            if (!this.src) {
                this.handleError(new Error('No source URL provided'));
                return;
            }
            
            if (this.loading) return; // 중복 로딩 방지
            
            try {
                this.loading = true;
                this.error = false;
                
                const resolvedSrc = this.resolvePath(this.src);
                const response = await fetch(resolvedSrc);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                let content = await response.text();
                
                // 기본 스크립트 살균화
                if (this.sanitize) {
                    content = this.sanitizeHtml(content);
                }
                
                this.content = content;
                
            } catch (error) {
                this.handleError(error);
            } finally {
                this.loading = false;
            }
        },
        
        handleError(error) {
            console.warn(`HtmlInclude: Failed to load '${this.src}':`, error.message);
            this.error = true;
            this.errorMessage = error.message || `'${this.src}' 파일을 로드할 수 없습니다`;
            this.content = '';
        },
        
        resolvePath(path) {
            // 절대 URL인 경우 그대로 반환
            if (path.startsWith('http') || path.startsWith('//')) {
                return path;
            }
            
            // 라우터의 resolvePath 사용 가능한 경우
            if (window.router && typeof window.router.resolvePath === 'function') {
                return window.router.resolvePath(path);
            }
            
            // 폴백: 기본 URL 해결
            if (path.startsWith('/')) {
                return `${window.location.origin}${path}`;
            }
            
            return path;
        },
        
        sanitizeHtml(html) {
            // 기본적인 HTML 살균화 (스크립트 태그 제거)
            return html.replace(/<script[^>]*>.*?<\/script>/gis, '')
                      .replace(/<script[^>]*\/>/gi, '')
                      .replace(/on\w+\s*=/gi, ''); // 인라인 이벤트 핸들러 제거
        }
    }
};