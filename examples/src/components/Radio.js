/**
 * Radio 컴포넌트
 * 라디오 버튼
 */
export default {
    name: 'Radio',
    template: `
        <div class="radio-wrapper" :class="wrapperClasses">
            <label :for="radioId" class="radio-label" :class="labelClasses">
                <input
                    :id="radioId"
                    type="radio"
                    class="radio-input"
                    :checked="isChecked"
                    :disabled="disabled"
                    :required="required"
                    :value="value"
                    :name="name"
                    @change="handleChange"
                    ref="radio"
                />
                <span class="radio-circle" :class="circleClasses">
                    <span v-if="isChecked" class="radio-dot"></span>
                </span>
                <span v-if="label || $slots.default" class="radio-text">
                    <slot>{{ label }}</slot>
                </span>
            </label>
            
            <div v-if="helpText || errorMessage" class="radio-help">
                <p v-if="errorMessage" class="radio-error">{{ errorMessage }}</p>
                <p v-else-if="helpText" class="radio-help-text">{{ helpText }}</p>
            </div>
        </div>
    `,
    emits: ['update:modelValue', 'change'],
    props: {
        modelValue: {
            type: [String, Number, Boolean],
            default: null
        },
        value: {
            type: [String, Number, Boolean],
            required: true
        },
        label: {
            type: String,
            default: ''
        },
        name: {
            type: String,
            default: ''
        },
        disabled: {
            type: Boolean,
            default: false
        },
        required: {
            type: Boolean,
            default: false
        },
        size: {
            type: String,
            default: 'medium',
            validator: (value) => ['small', 'medium', 'large'].includes(value)
        },
        variant: {
            type: String,
            default: 'primary',
            validator: (value) => ['primary', 'secondary', 'success', 'warning', 'danger'].includes(value)
        },
        helpText: {
            type: String,
            default: ''
        },
        errorMessage: {
            type: String,
            default: ''
        },
        inline: {
            type: Boolean,
            default: false
        }
    },
    data() {
        return {
            radioId: `radio-${Math.random().toString(36).substr(2, 9)}`
        };
    },
    computed: {
        isChecked() {
            return this.modelValue === this.value;
        },
        wrapperClasses() {
            return [
                'radio-wrapper',
                `radio-size-${this.size}`,
                `radio-variant-${this.variant}`,
                {
                    'radio-disabled': this.disabled,
                    'radio-error': this.errorMessage,
                    'radio-inline': this.inline,
                    'radio-checked': this.isChecked
                }
            ];
        },
        labelClasses() {
            return [
                'radio-label',
                {
                    'radio-label-disabled': this.disabled
                }
            ];
        },
        circleClasses() {
            return [
                'radio-circle',
                {
                    'radio-circle-checked': this.isChecked,
                    'radio-circle-disabled': this.disabled
                }
            ];
        }
    },
    methods: {
        handleChange(event) {
            if (event.target.checked) {
                this.$emit('update:modelValue', this.value);
                this.$emit('change', this.value);
            }
        },
        focus() {
            this.$refs.radio.focus();
        },
        blur() {
            this.$refs.radio.blur();
        }
    }
}