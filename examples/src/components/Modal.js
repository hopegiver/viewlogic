/**
 * Modal 컴포넌트
 * 다양한 용도로 사용할 수 있는 모달 다이얼로그
 */
export default {
    name: 'Modal',
    template: `
        <teleport to="body" v-if="modelValue">
            <div class="modal-overlay" @click="handleOverlayClick" :class="{ 'modal-overlay-visible': modelValue }">
                <div 
                    class="modal-container" 
                    :class="[sizeClass, { 'modal-container-visible': modelValue }]"
                    @click.stop
                >
                    <div class="modal-header" v-if="showHeader">
                        <h3 class="modal-title" v-if="title">{{ title }}</h3>
                        <slot name="header" v-else></slot>
                        <button 
                            v-if="showCloseButton" 
                            class="modal-close" 
                            @click="closeModal"
                            aria-label="닫기"
                        >
                            ×
                        </button>
                    </div>
                    
                    <div class="modal-body">
                        <slot></slot>
                    </div>
                    
                    <div class="modal-footer" v-if="showFooter">
                        <slot name="footer">
                            <button 
                                v-if="showCancelButton" 
                                class="btn btn-secondary" 
                                @click="handleCancel"
                            >
                                {{ cancelText }}
                            </button>
                            <button 
                                v-if="showConfirmButton" 
                                class="btn btn-primary" 
                                @click="handleConfirm"
                                :disabled="confirmDisabled"
                            >
                                {{ confirmText }}
                            </button>
                        </slot>
                    </div>
                </div>
            </div>
        </teleport>
    `,
    emits: ['update:modelValue', 'close', 'cancel', 'confirm'],
    props: {
        modelValue: {
            type: Boolean,
            default: false
        },
        title: {
            type: String,
            default: ''
        },
        size: {
            type: String,
            default: 'medium',
            validator: (value) => ['small', 'medium', 'large', 'extra-large'].includes(value)
        },
        closable: {
            type: Boolean,
            default: true
        },
        closeOnOverlay: {
            type: Boolean,
            default: true
        },
        showHeader: {
            type: Boolean,
            default: true
        },
        showFooter: {
            type: Boolean,
            default: true
        },
        showCloseButton: {
            type: Boolean,
            default: true
        },
        showCancelButton: {
            type: Boolean,
            default: true
        },
        showConfirmButton: {
            type: Boolean,
            default: true
        },
        cancelText: {
            type: String,
            default: '취소'
        },
        confirmText: {
            type: String,
            default: '확인'
        },
        confirmDisabled: {
            type: Boolean,
            default: false
        }
    },
    computed: {
        sizeClass() {
            return `modal-${this.size}`;
        }
    },
    methods: {
        closeModal() {
            if (this.closable) {
                this.$emit('update:modelValue', false);
                this.$emit('close');
            }
        },
        handleOverlayClick() {
            if (this.closeOnOverlay && this.closable) {
                this.closeModal();
            }
        },
        handleCancel() {
            this.$emit('cancel');
            this.closeModal();
        },
        handleConfirm() {
            this.$emit('confirm');
        }
    },
    mounted() {
        // ESC 키로 모달 닫기
        const handleEscape = (event) => {
            if (event.key === 'Escape' && this.modelValue && this.closable) {
                this.closeModal();
            }
        };
        
        document.addEventListener('keydown', handleEscape);
        this.$unmounted = () => {
            document.removeEventListener('keydown', handleEscape);
        };
    },
    unmounted() {
        if (this.$unmounted) {
            this.$unmounted();
        }
    }
}