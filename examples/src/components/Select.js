/**
 * Select/Dropdown 컴포넌트
 * 선택 드롭다운
 */
export default {
    name: 'Select',
    template: `
        <div class="select-wrapper" :class="wrapperClasses">
            <label v-if="label" :for="selectId" class="select-label" :class="{ 'required': required }">
                {{ label }}
            </label>
            
            <div class="select-container" @click="toggleDropdown" ref="container">
                <div class="select-display" :class="displayClasses">
                    <span v-if="selectedOption" class="select-value">
                        <slot name="option" :option="selectedOption">
                            {{ selectedOption[labelKey] }}
                        </slot>
                    </span>
                    <span v-else class="select-placeholder">{{ placeholder }}</span>
                    
                    <span class="select-arrow" :class="{ 'select-arrow-up': isOpen }">
                        ▼
                    </span>
                </div>
                
                <div v-if="clearable && modelValue" class="select-clear" @click.stop="clearSelection">
                    ×
                </div>
            </div>
            
            <!-- 드롭다운 옵션 -->
            <transition name="select-dropdown">
                <div v-if="isOpen" class="select-dropdown" :class="dropdownClasses">
                    <div v-if="searchable" class="select-search">
                        <input
                            v-model="searchTerm"
                            type="text"
                            class="select-search-input"
                            :placeholder="searchPlaceholder"
                            @click.stop
                            ref="searchInput"
                        />
                    </div>
                    
                    <div class="select-options" ref="optionsList">
                        <div
                            v-for="(option, index) in filteredOptions"
                            :key="getOptionKey(option)"
                            class="select-option"
                            :class="getOptionClasses(option, index)"
                            @click="selectOption(option)"
                            @mouseenter="highlightedIndex = index"
                        >
                            <slot name="option" :option="option" :selected="isSelected(option)">
                                {{ option[labelKey] }}
                            </slot>
                            
                            <span v-if="isSelected(option)" class="select-check">✓</span>
                        </div>
                        
                        <div v-if="filteredOptions.length === 0" class="select-no-options">
                            {{ noOptionsText }}
                        </div>
                    </div>
                </div>
            </transition>
            
            <div v-if="helpText || errorMessage" class="select-help">
                <p v-if="errorMessage" class="select-error">{{ errorMessage }}</p>
                <p v-else-if="helpText" class="select-help-text">{{ helpText }}</p>
            </div>
        </div>
    `,
    emits: ['update:modelValue', 'change', 'clear', 'focus', 'blur'],
    props: {
        modelValue: {
            type: [String, Number, Object, Array],
            default: null
        },
        options: {
            type: Array,
            required: true
        },
        label: {
            type: String,
            default: ''
        },
        placeholder: {
            type: String,
            default: '선택하세요'
        },
        labelKey: {
            type: String,
            default: 'label'
        },
        valueKey: {
            type: String,
            default: 'value'
        },
        disabled: {
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
        searchable: {
            type: Boolean,
            default: false
        },
        searchPlaceholder: {
            type: String,
            default: '검색...'
        },
        multiple: {
            type: Boolean,
            default: false
        },
        size: {
            type: String,
            default: 'medium',
            validator: (value) => ['small', 'medium', 'large'].includes(value)
        },
        helpText: {
            type: String,
            default: ''
        },
        errorMessage: {
            type: String,
            default: ''
        },
        noOptionsText: {
            type: String,
            default: '옵션이 없습니다'
        },
        maxHeight: {
            type: String,
            default: '200px'
        }
    },
    data() {
        return {
            isOpen: false,
            searchTerm: '',
            highlightedIndex: -1,
            selectId: `select-${Math.random().toString(36).substr(2, 9)}`
        };
    },
    computed: {
        wrapperClasses() {
            return [
                'select-wrapper',
                `select-size-${this.size}`,
                {
                    'select-disabled': this.disabled,
                    'select-error': this.errorMessage,
                    'select-open': this.isOpen,
                    'select-multiple': this.multiple
                }
            ];
        },
        displayClasses() {
            return [
                'select-display',
                {
                    'select-display-placeholder': !this.selectedOption,
                    'select-display-disabled': this.disabled
                }
            ];
        },
        dropdownClasses() {
            return [
                'select-dropdown',
                {
                    'select-dropdown-searchable': this.searchable
                }
            ];
        },
        selectedOption() {
            if (this.multiple) {
                return this.modelValue && this.modelValue.length > 0 ? this.modelValue : null;
            }
            
            if (!this.modelValue) return null;
            
            return this.options.find(option => {
                return this.getOptionValue(option) === this.modelValue;
            });
        },
        filteredOptions() {
            if (!this.searchable || !this.searchTerm) {
                return this.options;
            }
            
            const term = this.searchTerm.toLowerCase();
            return this.options.filter(option => {
                return option[this.labelKey].toLowerCase().includes(term);
            });
        }
    },
    methods: {
        toggleDropdown() {
            if (this.disabled) return;
            
            this.isOpen = !this.isOpen;
            
            if (this.isOpen) {
                this.$nextTick(() => {
                    if (this.searchable && this.$refs.searchInput) {
                        this.$refs.searchInput.focus();
                    }
                });
            }
        },
        selectOption(option) {
            if (this.multiple) {
                let newValue = [...(this.modelValue || [])];
                const optionValue = this.getOptionValue(option);
                const index = newValue.findIndex(val => val === optionValue);
                
                if (index > -1) {
                    newValue.splice(index, 1);
                } else {
                    newValue.push(optionValue);
                }
                
                this.$emit('update:modelValue', newValue);
            } else {
                this.$emit('update:modelValue', this.getOptionValue(option));
                this.isOpen = false;
            }
            
            this.$emit('change', option);
        },
        clearSelection() {
            this.$emit('update:modelValue', this.multiple ? [] : null);
            this.$emit('clear');
        },
        isSelected(option) {
            if (this.multiple) {
                const values = this.modelValue || [];
                return values.includes(this.getOptionValue(option));
            }
            
            return this.getOptionValue(option) === this.modelValue;
        },
        getOptionValue(option) {
            return typeof option === 'object' ? option[this.valueKey] : option;
        },
        getOptionKey(option) {
            return this.getOptionValue(option);
        },
        getOptionClasses(option, index) {
            return {
                'select-option-selected': this.isSelected(option),
                'select-option-highlighted': this.highlightedIndex === index
            };
        },
        handleClickOutside(event) {
            if (!this.$refs.container.contains(event.target)) {
                this.isOpen = false;
            }
        },
        handleKeydown(event) {
            if (!this.isOpen) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    this.toggleDropdown();
                }
                return;
            }
            
            switch (event.key) {
                case 'Escape':
                    this.isOpen = false;
                    break;
                case 'ArrowDown':
                    event.preventDefault();
                    this.highlightedIndex = Math.min(
                        this.highlightedIndex + 1,
                        this.filteredOptions.length - 1
                    );
                    break;
                case 'ArrowUp':
                    event.preventDefault();
                    this.highlightedIndex = Math.max(this.highlightedIndex - 1, 0);
                    break;
                case 'Enter':
                    event.preventDefault();
                    if (this.highlightedIndex >= 0) {
                        this.selectOption(this.filteredOptions[this.highlightedIndex]);
                    }
                    break;
            }
        }
    },
    mounted() {
        document.addEventListener('click', this.handleClickOutside);
        document.addEventListener('keydown', this.handleKeydown);
    },
    unmounted() {
        document.removeEventListener('click', this.handleClickOutside);
        document.removeEventListener('keydown', this.handleKeydown);
    },
    watch: {
        isOpen(newValue) {
            if (newValue) {
                this.searchTerm = '';
                this.highlightedIndex = -1;
            }
        }
    }
}