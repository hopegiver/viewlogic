/**
 * Progress 컴포넌트
 * 진행률 표시
 */
export default {
    name: 'Progress',
    template: `
        <div class="progress-wrapper" :class="wrapperClasses">
            <div v-if="label || showPercent" class="progress-header">
                <span v-if="label" class="progress-label">{{ label }}</span>
                <span v-if="showPercent" class="progress-percent">{{ displayPercent }}%</span>
            </div>
            
            <div class="progress-container" :class="containerClasses">
                <div class="progress-track">
                    <div 
                        class="progress-bar" 
                        :class="barClasses"
                        :style="barStyle"
                    >
                        <span v-if="showText && !showPercent" class="progress-text">
                            <slot>{{ text }}</slot>
                        </span>
                    </div>
                </div>
                
                <!-- 다중 진행률 -->
                <div
                    v-if="multiple && steps.length > 0"
                    v-for="(step, index) in steps"
                    :key="index"
                    class="progress-step"
                    :class="getStepClasses(step, index)"
                    :style="getStepStyle(step)"
                >
                    <span v-if="step.label" class="progress-step-label">{{ step.label }}</span>
                </div>
            </div>
            
            <!-- 단계별 진행률 표시 -->
            <div v-if="showSteps && steps.length > 0" class="progress-steps">
                <div
                    v-for="(step, index) in steps"
                    :key="index"
                    class="progress-step-item"
                    :class="getStepItemClasses(step, index)"
                >
                    <div class="progress-step-circle">
                        <span v-if="step.icon" :class="step.icon"></span>
                        <span v-else>{{ index + 1 }}</span>
                    </div>
                    <div v-if="step.label" class="progress-step-text">
                        {{ step.label }}
                    </div>
                </div>
            </div>
        </div>
    `,
    props: {
        value: {
            type: Number,
            default: 0,
            validator: (value) => value >= 0 && value <= 100
        },
        label: {
            type: String,
            default: ''
        },
        text: {
            type: String,
            default: ''
        },
        variant: {
            type: String,
            default: 'primary',
            validator: (value) => [
                'primary', 'secondary', 'success', 'warning', 'danger', 'info'
            ].includes(value)
        },
        size: {
            type: String,
            default: 'medium',
            validator: (value) => ['small', 'medium', 'large'].includes(value)
        },
        striped: {
            type: Boolean,
            default: false
        },
        animated: {
            type: Boolean,
            default: false
        },
        showPercent: {
            type: Boolean,
            default: false
        },
        showText: {
            type: Boolean,
            default: false
        },
        indeterminate: {
            type: Boolean,
            default: false
        },
        multiple: {
            type: Boolean,
            default: false
        },
        steps: {
            type: Array,
            default: () => []
        },
        showSteps: {
            type: Boolean,
            default: false
        },
        currentStep: {
            type: Number,
            default: 0
        }
    },
    computed: {
        displayPercent() {
            return Math.round(this.value);
        },
        wrapperClasses() {
            return [
                'progress-wrapper',
                `progress-size-${this.size}`,
                {
                    'progress-multiple': this.multiple,
                    'progress-stepped': this.showSteps
                }
            ];
        },
        containerClasses() {
            return [
                'progress-container',
                {
                    'progress-striped': this.striped,
                    'progress-animated': this.animated,
                    'progress-indeterminate': this.indeterminate
                }
            ];
        },
        barClasses() {
            return [
                'progress-bar',
                `progress-bar-${this.variant}`,
                {
                    'progress-bar-striped': this.striped,
                    'progress-bar-animated': this.animated
                }
            ];
        },
        barStyle() {
            if (this.indeterminate) {
                return {};
            }
            return {
                width: `${this.value}%`,
                transition: 'width 0.3s ease'
            };
        }
    },
    methods: {
        getStepClasses(step, index) {
            return [
                'progress-step',
                `progress-step-${step.variant || 'primary'}`,
                {
                    'progress-step-active': index === this.currentStep,
                    'progress-step-completed': index < this.currentStep
                }
            ];
        },
        getStepStyle(step) {
            return {
                width: `${step.value || 0}%`
            };
        },
        getStepItemClasses(step, index) {
            return [
                'progress-step-item',
                {
                    'progress-step-item-active': index === this.currentStep,
                    'progress-step-item-completed': index < this.currentStep,
                    'progress-step-item-disabled': step.disabled
                }
            ];
        }
    }
}