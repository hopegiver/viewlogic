export default {
    name: 'NotFoundPage',
    layout: null,
    pageTitle: '404 - 페이지를 찾을 수 없습니다',
    showHeader: false,
    data() {
        return {
            searchQuery: '',
            suggestedPages: [
                { name: '홈', route: 'home', description: '메인 페이지로 이동합니다' },
                { name: '소개', route: 'about', description: '서비스 소개 페이지입니다' },
                { name: '연락처', route: 'contact', description: '연락처 정보를 확인할 수 있습니다' }
            ],
            requestedUrl: window.location.hash || window.location.pathname
        }
    },
    methods: {
        searchSite() {
            if (this.searchQuery.trim()) {
                // 간단한 페이지 검색 로직
                const query = this.searchQuery.toLowerCase();
                const matchedPage = this.suggestedPages.find(page => 
                    page.name.toLowerCase().includes(query) ||
                    page.description.toLowerCase().includes(query)
                );
                
                if (matchedPage) {
                    this.navigateTo(matchedPage.route);
                } else {
                    alert(`"${this.searchQuery}"에 대한 검색 결과가 없습니다.`);
                }
            }
        },
        goToSuggestion(route) {
            this.navigateTo(route);
        },
        reportBrokenLink() {
            const errorInfo = {
                url: this.requestedUrl,
                referrer: document.referrer,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent
            };
            
            console.log('깨진 링크 신고:', errorInfo);
            alert('깨진 링크가 신고되었습니다. 빠른 시일 내에 수정하겠습니다.');
        },
        goBack() {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                this.navigateTo('home');
            }
        }
    },
    mounted() {
        // 404 페이지 방문 추적
        console.warn('404 페이지 방문:', {
            requestedUrl: this.requestedUrl,
            timestamp: new Date().toISOString(),
            referrer: document.referrer
        });
    }
}