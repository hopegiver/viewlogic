/**
 * Default Layout Logic
 * 모든 페이지에서 공통으로 사용되는 레이아웃 로직
 */
export default {
    data() {
        return {
            layoutData: {
                appName: 'ViewLogic Demo',
                currentYear: new Date().getFullYear(),
                user: null
            }
        }
    },
    async mounted() {
        console.log('✅ Layout mounted!');
        console.log('Layout data:', this.layoutData);

        // 레이아웃에서 공통 초기화 작업
        // 예: 사용자 정보 로드, 전역 이벤트 리스너 등
    },
    methods: {
        // 레이아웃에서 공통으로 사용할 메서드
        showNotification(message) {
            console.log('📢 Notification:', message);
            alert(message);
        }
    },
    beforeUnmount() {
        console.log('🧹 Layout cleanup');
    }
}
