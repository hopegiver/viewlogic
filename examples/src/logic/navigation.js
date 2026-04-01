export default {
    name: 'Navigation',
    layout: null,  // 중요: 레이아웃 없이 순수 콘텐츠만

    // 향후 API 연동을 위한 준비
    // dataURL: '/api/navigation/menu',

    data() {
        return {
            mobileMenuOpen: false,
            // 정적 메뉴 (향후 API에서 로드 가능)
            menuItems: [
                { name: 'home', label: 'Home' },
                { name: 'about', label: 'About' },
                { name: 'contact', label: 'Contact' },
                { name: 'dashboard', label: 'Dashboard' }
            ]
        };
    },

    computed: {
        activeRoute() {
            return this.$router.getCurrentRoute() || 'home';
        },
        loggedIn() {
            return !!localStorage.getItem('authToken');
        }
    },

    mounted() {
        // ESC 키로 메뉴 닫기
        document.addEventListener('keydown', this.handleKeydown);

        // 윈도우 리사이즈 시 모바일 메뉴 닫기
        window.addEventListener('resize', this.handleResize);
    },

    unmounted() {
        document.removeEventListener('keydown', this.handleKeydown);
        window.removeEventListener('resize', this.handleResize);
    },

    methods: {

        toggleMobileMenu() {
            this.mobileMenuOpen = !this.mobileMenuOpen;

            // 모바일 메뉴 열릴 때 body 스크롤 방지
            if (this.mobileMenuOpen) {
                document.body.classList.add('nav-menu-open');
            } else {
                document.body.classList.remove('nav-menu-open');
            }
        },

        closeMobileMenu() {
            this.mobileMenuOpen = false;
            document.body.classList.remove('nav-menu-open');
        },

        navigateAndClose(route, params = {}) {
            this.navigateTo(route, params);
            this.closeMobileMenu();
        },

        handleKeydown(event) {
            // ESC 키로 메뉴 닫기
            if (event.key === 'Escape' && this.mobileMenuOpen) {
                this.closeMobileMenu();
            }
        },

        handleResize() {
            // 데스크톱 사이즈로 변경되면 모바일 메뉴 닫기
            if (window.innerWidth > 768 && this.mobileMenuOpen) {
                this.closeMobileMenu();
            }
        }
    }
};