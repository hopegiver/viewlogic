export default {
    name: 'Contact',
    
    data() {
        return {
            form: {
                name: '',
                email: '',
                subject: '',
                message: ''
            },
            isLoading: false,
            contactInfo: [
                { icon: '📧', title: 'Email', value: 'contact@viewlogic.com' },
                { icon: '📞', title: 'Phone', value: '02-1234-5678' },
                { icon: '📍', title: 'Address', value: '서울특별시 강남구' }
            ]
        };
    },
    
    methods: {
        async sendMessage() {
            if (!this.form.name || !this.form.email || !this.form.message) {
                alert('필수 항목을 입력해주세요.');
                return;
            }
            
            this.isLoading = true;
            
            // 메시지 전송 시뮬레이션
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            alert('메시지가 전송되었습니다!');
            
            // 폼 초기화
            this.form = {
                name: '',
                email: '',
                subject: '',
                message: ''
            };
            
            this.isLoading = false;
        }
    }
};