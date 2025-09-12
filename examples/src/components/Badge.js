/**
 * Badge 컴포넌트
 * 상태 배지
 */
export default {
    name: 'Badge',
    template: `
        <span :class="badgeClasses" @click="handleClick">
            <span v-if="icon" :class="['badge-icon', icon]"></span>
            <span class="badge-text">
                <slot>{{ text }}</slot>
            </span>
            <button v-if="closable" class="badge-close" @click.stop="handleClose">×</button>
        </span>
    `,
    emits: ['click', 'close'],
    props: {
        text: {
            type: String,
            default: ''
        },
        variant: {
            type: String,
            default: 'primary',
            validator: (value) => [
                'primary', 'secondary', 'success', 'warning', 'danger', 
                'info', 'light', 'dark', 'outline'
            ].includes(value)
        },
        size: {
            type: String,
            default: 'medium',
            validator: (value) => ['small', 'medium', 'large'].includes(value)
        },
        shape: {
            type: String,
            default: 'rounded',
            validator: (value) => ['rounded', 'pill', 'square'].includes(value)
        },
        icon: {
            type: String,
            default: ''
        },
        closable: {
            type: Boolean,
            default: false
        },
        clickable: {
            type: Boolean,
            default: false
        },
        dot: {
            type: Boolean,
            default: false
        },
        pulse: {
            type: Boolean,
            default: false
        }
    },
    computed: {
        badgeClasses() {
            return [
                'badge',
                `badge-${this.variant}`,
                `badge-${this.size}`,
                `badge-${this.shape}`,
                {
                    'badge-clickable': this.clickable,
                    'badge-closable': this.closable,
                    'badge-with-icon': this.icon,
                    'badge-dot': this.dot,
                    'badge-pulse': this.pulse
                }
            ];
        }
    },
    methods: {
        handleClick(event) {
            if (this.clickable) {
                this.$emit('click', event);
            }
        },
        handleClose(event) {
            this.$emit('close', event);
        }
    }
}