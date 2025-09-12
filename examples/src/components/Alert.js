/**
 * Alert 컴포넌트
 * 알림 박스
 */
export default {
    name: 'Alert',
    template: `
        <transition name="alert" @after-leave="$emit('destroyed')">
            <div v-if="visible" :class="alertClasses" role="alert">
                <div v-if="icon || closable" class="alert-header">
                    <span v-if="icon" :class="['alert-icon', iconClass]">
                        {{ iconText }}
                    </span>
                    <button v-if="closable" class="alert-close" @click="close" aria-label="닫기">
                        ×
                    </button>
                </div>
                
                <div class="alert-content">
                    <h4 v-if="title" class="alert-title">{{ title }}</h4>
                    <div class="alert-message">
                        <slot>{{ message }}</slot>
                    </div>
                    
                    <div v-if="actions.length > 0 || $slots.actions" class="alert-actions">
                        <slot name="actions">
                            <button
                                v-for="action in actions"
                                :key="action.text"
                                :class="['alert-action', 'alert-action-' + (action.type || 'default')]"
                                @click="handleAction(action)"
                            >
                                {{ action.text }}
                            </button>
                        </slot>
                    </div>
                </div>
            </div>
        </transition>
    `,
    emits: ['update:modelValue', 'close', 'destroyed', 'action'],
    props: {
        modelValue: {
            type: Boolean,
            default: true
        },
        title: {
            type: String,
            default: ''
        },
        message: {
            type: String,
            default: ''
        },
        type: {
            type: String,
            default: 'info',
            validator: (value) => ['success', 'info', 'warning', 'error'].includes(value)
        },
        variant: {
            type: String,
            default: 'filled',
            validator: (value) => ['filled', 'outlined', 'minimal'].includes(value)
        },
        closable: {
            type: Boolean,
            default: false
        },
        autoClose: {
            type: Boolean,
            default: false
        },
        duration: {
            type: Number,
            default: 5000
        },
        icon: {
            type: Boolean,
            default: true
        },
        actions: {
            type: Array,
            default: () => []
        },
        persistent: {
            type: Boolean,
            default: false
        }
    },
    data() {
        return {
            visible: this.modelValue,
            timer: null
        };
    },
    computed: {
        alertClasses() {
            return [
                'alert',
                `alert-${this.type}`,
                `alert-${this.variant}`,
                {
                    'alert-closable': this.closable,
                    'alert-with-icon': this.icon,
                    'alert-with-title': this.title,
                    'alert-with-actions': this.actions.length > 0 || this.$slots.actions
                }
            ];
        },
        iconClass() {
            const iconMap = {
                success: 'alert-icon-success',
                info: 'alert-icon-info',
                warning: 'alert-icon-warning',
                error: 'alert-icon-error'
            };
            return iconMap[this.type] || 'alert-icon-info';
        },
        iconText() {
            const iconMap = {
                success: '✓',
                info: 'ℹ',
                warning: '⚠',
                error: '✕'
            };
            return iconMap[this.type] || 'ℹ';
        }
    },
    methods: {
        close() {
            this.visible = false;
            this.$emit('update:modelValue', false);
            this.$emit('close');
            this.clearTimer();
        },
        handleAction(action) {
            this.$emit('action', action);
            if (action.close !== false) {
                this.close();
            }
        },
        startTimer() {
            if (this.autoClose && this.duration > 0) {
                this.timer = setTimeout(() => {
                    this.close();
                }, this.duration);
            }
        },
        clearTimer() {
            if (this.timer) {
                clearTimeout(this.timer);
                this.timer = null;
            }
        }
    },
    watch: {
        modelValue(newValue) {
            this.visible = newValue;
            if (newValue) {
                this.startTimer();
            } else {
                this.clearTimer();
            }
        }
    },
    mounted() {
        if (this.visible) {
            this.startTimer();
        }
    },
    unmounted() {
        this.clearTimer();
    }
}