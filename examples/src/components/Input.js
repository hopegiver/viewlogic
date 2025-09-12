/**
 * Input 컴포넌트
 * 다양한 타입의 입력 필드를 제공하는 컴포넌트
 */
export default {
    name: 'Input',
    template: `
        <div :class="wrapperClasses">
            <label v-if="label" :for="inputId" class="input-label" :class="{ 'required': required }">
                {{ label }}
            </label>
            
            <div class="input-container">
                <span v-if="prefixIcon" class="input-prefix-icon" :class="prefixIcon"></span>
                
                <input
                    :id="inputId"
                    :type="inputType"
                    :class="inputClasses"
                    :value="modelValue"
                    :placeholder="placeholder"
                    :disabled="disabled"
                    :readonly="readonly"
                    :required="required"
                    :min="min"
                    :max="max"
                    :step="step"
                    :maxlength="maxlength"
                    :autocomplete="autocomplete"
                    :name="name"
                    @input="handleInput"
                    @blur="handleBlur"
                    @focus="handleFocus"
                    @keyup.enter="handleEnter"
                    ref="input"
                />
                
                <span v-if="suffixIcon" class="input-suffix-icon" :class="suffixIcon"></span>
                
                <button
                    v-if="clearable && modelValue && !disabled && !readonly"
                    class="input-clear"
                    @click="clearInput"
                    type="button"
                >
                    ×
                </button>
                
                <button
                    v-if="type === 'password'"
                    class="input-password-toggle"
                    @click="togglePasswordVisibility"
                    type="button"
                >
                    {{ showPassword ? '🙈' : '👁' }}
                </button>
            </div>
            
            <div v-if="helpText || errorMessage" class="input-help">
                <p v-if="errorMessage" class="input-error">{{ errorMessage }}</p>
                <p v-else-if="helpText" class="input-help-text">{{ helpText }}</p>
            </div>
        </div>
    `,
    emits: ['update:modelValue', 'input', 'blur', 'focus', 'enter'],
    props: {
        modelValue: {
            type: [String, Number],
            default: ''
        },
        type: {
            type: String,
            default: 'text',
            validator: (value) => ['text', 'password', 'email', 'number', 'tel', 'url', 'search'].includes(value)
        },
        label: {
            type: String,
            default: ''
        },
        placeholder: {
            type: String,
            default: ''
        },
        helpText: {
            type: String,
            default: ''
        },
        errorMessage: {
            type: String,
            default: ''
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
        readonly: {
            type: Boolean,
            default: false
        },
        required: {
            type: Boolean,
            default: false
        },
        clearable: {
            type: Boolean,
            default: false
        },
        prefixIcon: {
            type: String,
            default: ''
        },
        suffixIcon: {
            type: String,
            default: ''
        },
        min: {
            type: [String, Number],
            default: undefined
        },
        max: {
            type: [String, Number],
            default: undefined
        },
        step: {
            type: [String, Number],
            default: undefined
        },
        maxlength: {
            type: [String, Number],
            default: undefined
        },
        autocomplete: {
            type: String,
            default: undefined
        },
        name: {
            type: String,
            default: undefined
        }
    },
    data() {
        return {
            inputId: `input-${Math.random().toString(36).substr(2, 9)}`,
            showPassword: false,
            focused: false
        };
    },
    computed: {
        inputType() {
            if (this.type === 'password') {
                return this.showPassword ? 'text' : 'password';
            }
            return this.type;
        },
        wrapperClasses() {
            return [
                'input-wrapper',
                `input-size-${this.size}`,
                {
                    'input-focused': this.focused,
                    'input-disabled': this.disabled,
                    'input-readonly': this.readonly,
                    'input-error': this.errorMessage,
                    'input-with-prefix': this.prefixIcon,
                    'input-with-suffix': this.suffixIcon || this.clearable || this.type === 'password'
                }
            ];
        },
        inputClasses() {
            return [
                'input-field',
                {
                    'input-with-prefix-icon': this.prefixIcon,
                    'input-with-suffix-icon': this.suffixIcon || this.clearable || this.type === 'password'
                }
            ];
        }
    },
    methods: {
        handleInput(event) {
            let value = event.target.value;
            
            if (this.type === 'number') {
                value = value === '' ? '' : Number(value);
            }
            
            this.$emit('update:modelValue', value);
            this.$emit('input', value);
        },
        handleBlur(event) {
            this.focused = false;
            this.$emit('blur', event);
        },
        handleFocus(event) {
            this.focused = true;
            this.$emit('focus', event);
        },
        handleEnter(event) {
            this.$emit('enter', event);
        },
        clearInput() {
            this.$emit('update:modelValue', '');
            this.$emit('clear');
            this.focus();
        },
        togglePasswordVisibility() {
            this.showPassword = !this.showPassword;
        },
        focus() {
            this.$refs.input.focus();
        },
        blur() {
            this.$refs.input.blur();
        }
    }
}