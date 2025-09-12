/**
 * Checkbox 컴포넌트
 * 체크박스 입력
 */
export default {
    name: 'Checkbox',
    template: `
        <div class="checkbox-wrapper" :class="wrapperClasses">
            <label :for="checkboxId" class="checkbox-label" :class="labelClasses">
                <input
                    :id="checkboxId"
                    type="checkbox"
                    class="checkbox-input"
                    :checked="isChecked"
                    :disabled="disabled"
                    :required="required"
                    :value="value"
                    @change="handleChange"
                    ref="checkbox"
                />
                <span class="checkbox-box" :class="boxClasses">
                    <span v-if="isChecked" class="checkbox-check">✓</span>
                    <span v-else-if="indeterminate" class="checkbox-indeterminate">-</span>
                </span>
                <span v-if="label || $slots.default" class="checkbox-text">
                    <slot>{{ label }}</slot>
                </span>
            </label>
            
            <div v-if="helpText || errorMessage" class="checkbox-help">
                <p v-if="errorMessage" class="checkbox-error">{{ errorMessage }}</p>
                <p v-else-if="helpText" class="checkbox-help-text">{{ helpText }}</p>
            </div>
        </div>
    `,
    emits: ['update:modelValue', 'change'],
    props: {
        modelValue: {
            type: [Boolean, Array],
            default: false
        },
        value: {
            type: [String, Number, Boolean],
            default: true
        },
        label: {
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
        indeterminate: {
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
            checkboxId: `checkbox-${Math.random().toString(36).substr(2, 9)}`
        };
    },
    computed: {
        isChecked() {
            if (Array.isArray(this.modelValue)) {
                return this.modelValue.includes(this.value);
            }
            return Boolean(this.modelValue);
        },
        wrapperClasses() {
            return [
                'checkbox-wrapper',
                `checkbox-size-${this.size}`,
                `checkbox-variant-${this.variant}`,
                {
                    'checkbox-disabled': this.disabled,
                    'checkbox-error': this.errorMessage,
                    'checkbox-inline': this.inline,
                    'checkbox-checked': this.isChecked,
                    'checkbox-indeterminate': this.indeterminate
                }
            ];
        },
        labelClasses() {
            return [
                'checkbox-label',
                {
                    'checkbox-label-disabled': this.disabled
                }
            ];
        },
        boxClasses() {
            return [
                'checkbox-box',
                {
                    'checkbox-box-checked': this.isChecked,
                    'checkbox-box-indeterminate': this.indeterminate,
                    'checkbox-box-disabled': this.disabled
                }
            ];
        }
    },
    methods: {
        handleChange(event) {
            const isChecked = event.target.checked;
            
            if (Array.isArray(this.modelValue)) {
                let newValue = [...this.modelValue];
                
                if (isChecked) {
                    if (!newValue.includes(this.value)) {
                        newValue.push(this.value);
                    }
                } else {
                    const index = newValue.indexOf(this.value);
                    if (index > -1) {
                        newValue.splice(index, 1);
                    }
                }
                
                this.$emit('update:modelValue', newValue);
            } else {
                this.$emit('update:modelValue', isChecked);
            }
            
            this.$emit('change', isChecked, this.value);
        },
        focus() {
            this.$refs.checkbox.focus();
        },
        blur() {
            this.$refs.checkbox.blur();
        }
    },
    watch: {
        indeterminate(newValue) {
            if (this.$refs.checkbox) {
                this.$refs.checkbox.indeterminate = newValue;
            }
        }
    },
    mounted() {
        if (this.$refs.checkbox) {
            this.$refs.checkbox.indeterminate = this.indeterminate;
        }
    }
}