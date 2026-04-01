export default {
    name: 'Login',
    layout: null,

    data() {
        return {
            username: '',
            password: '',
            error: '',
            isLoading: false,
            redirectRoute: this.getParam('redirect', '')
        };
    },

    mounted() {
        // 이미 로그인 상태면 대시보드로 이동
        if (this.isAuth()) {
            this.navigateTo(this.redirectRoute || 'dashboard');
        }
    },

    methods: {
        async handleLogin() {
            this.error = '';
            this.isLoading = true;

            // 로그인 시뮬레이션 (500ms 딜레이)
            await new Promise(resolve => setTimeout(resolve, 500));

            if (this.username === 'admin' && this.password === '1234') {
                // 더미 JWT 토큰 생성
                const payload = btoa(JSON.stringify({
                    sub: 'admin',
                    name: 'Admin User',
                    iat: Math.floor(Date.now() / 1000),
                    exp: Math.floor(Date.now() / 1000) + 3600
                }));
                const token = `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.${payload}.dummy_signature`;

                this.setToken(token);
                this.navigateTo(this.redirectRoute || 'dashboard');
            } else {
                this.error = '아이디 또는 비밀번호가 올바르지 않습니다.';
            }

            this.isLoading = false;
        }
    }
};
