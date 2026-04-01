export default {
    name: 'Dashboard',
    layout: 'default',

    data() {
        return {
            isLoggedIn: false,
            hasToken: false,
            tokenPayload: null,
            tokenExpiry: ''
        };
    },

    mounted() {
        this.refreshStatus();
    },

    methods: {
        refreshStatus() {
            this.isLoggedIn = this.isAuth();
            const token = this.getToken();
            this.hasToken = !!token;

            if (token && token.includes('.')) {
                try {
                    this.tokenPayload = JSON.parse(atob(token.split('.')[1]));
                    if (this.tokenPayload.exp) {
                        const expDate = new Date(this.tokenPayload.exp * 1000);
                        this.tokenExpiry = expDate.toLocaleString('ko-KR');
                    }
                } catch (e) {
                    this.tokenPayload = null;
                }
            }
        },

        formatTime(timestamp) {
            if (!timestamp) return '-';
            return new Date(timestamp * 1000).toLocaleString('ko-KR');
        },

        handleLogout() {
            this.logout();
        }
    }
};
