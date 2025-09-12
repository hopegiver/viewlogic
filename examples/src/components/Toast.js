/**
 * Toast 컴포넌트
 * 알림 메시지를 표시하는 컴포넌트
 */
export default {
    name: 'Toast',
    template: `
        <teleport to="body">
            <div class="toast-container" :class="positionClass">
                <transition-group name="toast" tag="div">
                    <div
                        v-for="toast in toasts"
                        :key="toast.id"
                        :class="getToastClasses(toast)"
                        @click="closeToast(toast.id)"
                    >
                        <div class="toast-icon" v-if="toast.icon">
                            <span :class="toast.icon"></span>
                        </div>
                        <div class="toast-content">
                            <h4 v-if="toast.title" class="toast-title">{{ toast.title }}</h4>
                            <p class="toast-message">{{ toast.message }}</p>
                        </div>
                        <button 
                            v-if="toast.closable" 
                            class="toast-close" 
                            @click.stop="closeToast(toast.id)"
                        >
                            ×
                        </button>
                    </div>
                </transition-group>
            </div>
        </teleport>
    `,
    emits: ['close'],
    props: {
        position: {
            type: String,
            default: 'top-right',
            validator: (value) => [
                'top-left', 'top-right', 'top-center',
                'bottom-left', 'bottom-right', 'bottom-center'
            ].includes(value)
        },
        maxToasts: {
            type: Number,
            default: 5
        }
    },
    data() {
        return {
            toasts: [],
            toastId: 0
        };
    },
    computed: {
        positionClass() {
            return `toast-position-${this.position}`;
        }
    },
    methods: {
        show(options) {
            const toast = {
                id: ++this.toastId,
                type: options.type || 'info',
                title: options.title || '',
                message: options.message || '',
                duration: options.duration !== undefined ? options.duration : 4000,
                closable: options.closable !== false,
                icon: this.getIcon(options.type || 'info'),
                ...options
            };
            
            // 최대 토스트 개수 제한
            if (this.toasts.length >= this.maxToasts) {
                this.toasts.shift();
            }
            
            this.toasts.push(toast);
            
            // 자동 닫기
            if (toast.duration > 0) {
                setTimeout(() => {
                    this.closeToast(toast.id);
                }, toast.duration);
            }
            
            return toast.id;
        },
        closeToast(id) {
            const index = this.toasts.findIndex(toast => toast.id === id);
            if (index > -1) {
                const toast = this.toasts[index];
                this.$emit('close', toast);
                this.toasts.splice(index, 1);
            }
        },
        closeAll() {
            this.toasts = [];
        },
        getToastClasses(toast) {
            return [
                'toast',
                `toast-${toast.type}`,
                {
                    'toast-with-title': toast.title,
                    'toast-closable': toast.closable
                }
            ];
        },
        getIcon(type) {
            const icons = {
                success: '✓',
                error: '✕',
                warning: '⚠',
                info: 'ℹ'
            };
            return icons[type] || icons.info;
        },
        // 편의 메서드들
        success(message, options = {}) {
            return this.show({ ...options, type: 'success', message });
        },
        error(message, options = {}) {
            return this.show({ ...options, type: 'error', message });
        },
        warning(message, options = {}) {
            return this.show({ ...options, type: 'warning', message });
        },
        info(message, options = {}) {
            return this.show({ ...options, type: 'info', message });
        }
    }
}