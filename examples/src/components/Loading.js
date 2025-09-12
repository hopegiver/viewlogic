/**
 * Loading 컴포넌트
 * 로딩 스피너
 */
export default {
    name: 'Loading',
    template: `
        <div v-if="visible" :class="loadingClasses">
            <div class="loading-backdrop" v-if="overlay" @click="handleBackdropClick"></div>
            
            <div class="loading-content" :class="contentClasses">
                <div class="loading-spinner" :class="spinnerClasses">
                    <div v-if="type === 'dots'" class="spinner-dots">
                        <div class="dot" v-for="i in 3" :key="i"></div>
                    </div>
                    <div v-else-if="type === 'bars'" class="spinner-bars">
                        <div class="bar" v-for="i in 4" :key="i"></div>
                    </div>
                    <div v-else-if="type === 'pulse'" class="spinner-pulse">
                        <div class="pulse-ring"></div>
                    </div>
                    <div v-else-if="type === 'ring'" class="spinner-ring">
                        <div class="ring"></div>
                    </div>
                    <div v-else class="spinner-circle">
                        <div class="circle"></div>
                    </div>
                </div>
                
                <div v-if="text || $slots.default" class="loading-text">
                    <slot>{{ text }}</slot>
                </div>
                
                <div v-if="progress !== null" class="loading-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
                    </div>
                    <div class="progress-text">{{ progress }}%</div>
                </div>
                
                <button v-if="cancelable" class="loading-cancel" @click="handleCancel">
                    취소
                </button>
            </div>
        </div>
    `,
    emits: ['complete'],
    props: {
        visible: {
            type: Boolean,
            default: true
        },
        text: {
            type: String,
            default: ''
        },
        type: {
            type: String,
            default: 'circle',
            validator: (value) => ['circle', 'dots', 'bars', 'pulse', 'ring'].includes(value)
        },
        size: {
            type: String,
            default: 'medium',
            validator: (value) => ['small', 'medium', 'large'].includes(value)
        },
        color: {
            type: String,
            default: 'primary',
            validator: (value) => ['primary', 'secondary', 'success', 'warning', 'danger'].includes(value)
        },
        overlay: {
            type: Boolean,
            default: false
        },
        backdrop: {
            type: Boolean,
            default: true
        },
        position: {
            type: String,
            default: 'center',
            validator: (value) => ['center', 'top', 'bottom', 'inline'].includes(value)
        },
        progress: {
            type: Number,
            default: null,
            validator: (value) => value === null || (value >= 0 && value <= 100)
        },
        cancelable: {
            type: Boolean,
            default: false
        }
    },
    computed: {
        loadingClasses() {
            return [
                'loading',
                `loading-${this.position}`,
                {
                    'loading-overlay': this.overlay,
                    'loading-with-backdrop': this.backdrop && this.overlay
                }
            ];
        },
        contentClasses() {
            return [
                'loading-content',
                `loading-size-${this.size}`,
                {
                    'loading-with-text': this.text || this.$slots.default,
                    'loading-with-progress': this.progress !== null
                }
            ];
        },
        spinnerClasses() {
            return [
                'loading-spinner',
                `spinner-${this.type}`,
                `spinner-${this.color}`
            ];
        }
    },
    methods: {
        handleBackdropClick() {
            if (!this.backdrop) {
                this.$emit('backdrop-click');
            }
        },
        handleCancel() {
            this.$emit('cancel');
        }
    }
}