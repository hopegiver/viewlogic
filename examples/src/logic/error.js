export default {
    name: 'ErrorComponent',
    layout: null,
    props: {
        errorCode: {
            type: [String, Number],
            default: 500
        },
        errorMessage: {
            type: String,
            default: '오류가 발생했습니다.'
        },
        showRetry: {
            type: Boolean,
            default: true
        },
        showGoHome: {
            type: Boolean,
            default: true
        }
    },
    data() {
        return {
            isRetrying: false
        }
    },
    computed: {
        errorTitle() {
            const errorTitles = {
                404: '페이지를 찾을 수 없습니다',
                500: '서버 오류가 발생했습니다',
                403: '접근이 거부되었습니다',
                401: '인증이 필요합니다',
                400: '잘못된 요청입니다'
            };
            return errorTitles[this.errorCode] || '알 수 없는 오류';
        },
        errorDescription() {
            const descriptions = {
                404: '요청하신 페이지를 찾을 수 없습니다. URL을 확인해 주세요.',
                500: '서버에 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
                403: '이 페이지에 접근할 권한이 없습니다.',
                401: '로그인이 필요한 페이지입니다.',
                400: '요청이 올바르지 않습니다.'
            };
            return descriptions[this.errorCode] || this.errorMessage;
        },
        errorIcon() {
            const icons = {
                404: '🔍',
                500: '⚠️',
                403: '🚫',
                401: '🔐',
                400: '❌'
            };
            return icons[this.errorCode] || '⚠️';
        }
    },
    methods: {
        async handleRetry() {
            this.isRetrying = true;
            try {
                // 현재 페이지 다시 로드 시도
                await new Promise(resolve => setTimeout(resolve, 1000));
                window.location.reload();
            } catch (error) {
                console.error('재시도 실패:', error);
            } finally {
                this.isRetrying = false;
            }
        },
        goHome() {
            if (window.router) {
                window.router.navigateTo('home');
            } else {
                window.location.href = '#/';
            }
        },
        goBack() {
            window.history.back();
        },
        reportError() {
            // 에러 리포팅 로직 (추후 구현 가능)
            console.log('에러 신고:', {
                code: this.errorCode,
                message: this.errorMessage,
                url: window.location.href,
                timestamp: new Date().toISOString()
            });
            alert('에러가 신고되었습니다. 빠른 시일 내에 수정하겠습니다.');
        }
    }
}