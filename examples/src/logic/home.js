export default {
    name: 'Home',
    
    data() {
        return {
            message: 'ViewLogic 홈페이지',
            showModal: false,
            modalInput: '',
            activeTab: 'demo1',
            demoInput: '',
            tabsData: [
                { name: 'demo1', label: '컴포넌트 데모' },
                { name: 'demo2', label: '기능 목록' }
            ],
            features: [
                '🚀 빌드 없이 즉시 개발',
                '📁 파일 기반 자동 라우팅', 
                '🎨 20+ 내장 컴포넌트',
                '🔐 인증 시스템 내장',
                '🌐 다국어 지원'
            ],
            componentFeatures: [
                {
                    name: '컴포넌트 시스템',
                    description: 'Vue 3 호환 컴포넌트 라이브러리',
                    status: '활성화'
                },
                {
                    name: '라우팅 시스템',
                    description: '파일 기반 자동 라우팅',
                    status: '정상'
                },
                {
                    name: '캐시 시스템',
                    description: '인메모리 기반 성능 최적화',
                    status: '정상'
                },
                {
                    name: '다국어 지원',
                    description: 'i18n 기반 다국어 시스템',
                    status: '비활성화'
                }
            ]
        };
    },
    
    methods: {
        showToast(message = '알림 테스트가 성공적으로 실행되었습니다!', type = 'success') {
            if (this.$refs.toast) {
                this.$refs.toast[type](message);
            }
        },
        
        handleModalConfirm() {
            this.showToast(`입력된 내용: ${this.modalInput || '비어있음'}`, 'success');
            this.showModal = false;
            this.modalInput = '';
        },
        
        handleModalCancel() {
            this.modalInput = '';
            this.showModal = false;
        },
        
        clearRouterCache() {
            if (window.router && window.router.cacheManager) {
                const clearedCount = window.router.cacheManager.clearCache();
                this.showToast(`캐시 ${clearedCount}개 항목이 초기화되었습니다`, 'info');
            } else {
                this.showToast('캐시 매니저를 찾을 수 없습니다', 'warning');
            }
        },
        
        onLanguageChanged(language) {
            this.showToast(`언어가 ${language}로 변경되었습니다`, 'info');
        },
        
        goToPage(page) {
            this.navigateTo(page);
        }
    }
};