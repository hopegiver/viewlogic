/**
 * Button 컴포넌트
 * 재사용 가능한 버튼 UI 컴포넌트
 */
export default {
    name: 'Button',
    template: `
        <button 
            :class="buttonClasses" 
            :disabled="disabled || loading"
            @click="handleClick"
            :type="type"
        >
            <span v-if="loading" class="btn-spinner"></span>
            <span v-if="icon && !loading" :class="'btn-icon ' + icon"></span>
            <span class="btn-text" v-if="!loading || showTextWhileLoading">
                <slot>{{ text }}</slot>
            </span>
            <span v-if="loading && loadingText" class="btn-loading-text">{{ loadingText }}</span>
        </button>
    `,
    emits: ['click'],
    props: {
        variant: {
            type: String,
            default: 'primary',
            validator: (value) => ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark', 'outline'].includes(value)
        },
        size: {
            type: String,
            default: 'medium',
            validator: (value) => ['small', 'medium', 'large'].includes(value)
        },
        disabled: {
            type: Boolean,
            default: false
        },
        loading: {
            type: Boolean,
            default: false
        },
        loadingText: {
            type: String,
            default: ''
        },
        showTextWhileLoading: {
            type: Boolean,
            default: false
        },
        text: {
            type: String,
            default: ''
        },
        icon: {
            type: String,
            default: ''
        },
        type: {
            type: String,
            default: 'button',
            validator: (value) => ['button', 'submit', 'reset'].includes(value)
        },
        block: {
            type: Boolean,
            default: false
        },
        rounded: {
            type: Boolean,
            default: false
        }
    },
    computed: {
        buttonClasses() {
            return [
                'btn',
                `btn-${this.variant}`,
                `btn-${this.size}`,
                {
                    'btn-loading': this.loading,
                    'btn-disabled': this.disabled,
                    'btn-block': this.block,
                    'btn-rounded': this.rounded,
                    'btn-with-icon': this.icon
                }
            ];
        }
    },
    methods: {
        handleClick(event) {
            if (!this.disabled && !this.loading) {
                this.$emit('click', event);
            }
        }
    }
}