/**
 * DatePicker 컴포넌트
 * 날짜 선택기
 */
export default {
    name: 'DatePicker',
    template: `
        <div class="datepicker-wrapper" :class="wrapperClasses">
            <label v-if="label" :for="inputId" class="datepicker-label">{{ label }}</label>
            
            <div class="datepicker-input-container" @click="toggleCalendar">
                <input
                    :id="inputId"
                    type="text"
                    class="datepicker-input"
                    :class="inputClasses"
                    :value="displayValue"
                    :placeholder="placeholder"
                    :disabled="disabled"
                    :readonly="true"
                    ref="input"
                />
                <span class="datepicker-icon">📅</span>
                <button v-if="clearable && modelValue" class="datepicker-clear" @click.stop="clear">
                    ×
                </button>
            </div>
            
            <transition name="datepicker-dropdown">
                <div v-if="isOpen" class="datepicker-dropdown" :class="dropdownClasses">
                    <!-- 헤더 -->
                    <div class="datepicker-header">
                        <button class="datepicker-nav" @click="previousMonth">‹</button>
                        <div class="datepicker-title">
                            <select v-model="currentYear" class="datepicker-year-select">
                                <option v-for="year in availableYears" :key="year" :value="year">
                                    {{ year }}
                                </option>
                            </select>
                            <select v-model="currentMonth" class="datepicker-month-select">
                                <option v-for="(month, index) in monthNames" :key="index" :value="index">
                                    {{ month }}
                                </option>
                            </select>
                        </div>
                        <button class="datepicker-nav" @click="nextMonth">›</button>
                    </div>
                    
                    <!-- 요일 -->
                    <div class="datepicker-weekdays">
                        <div v-for="day in weekDays" :key="day" class="datepicker-weekday">
                            {{ day }}
                        </div>
                    </div>
                    
                    <!-- 날짜 -->
                    <div class="datepicker-calendar">
                        <div
                            v-for="date in calendarDates"
                            :key="date.key"
                            class="datepicker-date"
                            :class="getDateClasses(date)"
                            @click="selectDate(date)"
                        >
                            {{ date.day }}
                        </div>
                    </div>
                    
                    <!-- 하단 버튼 -->
                    <div v-if="showFooter" class="datepicker-footer">
                        <button class="datepicker-today-btn" @click="selectToday">
                            오늘
                        </button>
                        <button class="datepicker-clear-btn" @click="clear">
                            취소
                        </button>
                    </div>
                </div>
            </transition>
            
            <div v-if="helpText || errorMessage" class="datepicker-help">
                <p v-if="errorMessage" class="datepicker-error">{{ errorMessage }}</p>
                <p v-else-if="helpText" class="datepicker-help-text">{{ helpText }}</p>
            </div>
        </div>
    `,
    emits: ['update:modelValue', 'change', 'clear'],
    props: {
        modelValue: {
            type: [Date, String],
            default: null
        },
        label: {
            type: String,
            default: ''
        },
        placeholder: {
            type: String,
            default: '날짜를 선택하세요'
        },
        format: {
            type: String,
            default: 'YYYY-MM-DD'
        },
        disabled: {
            type: Boolean,
            default: false
        },
        clearable: {
            type: Boolean,
            default: true
        },
        showFooter: {
            type: Boolean,
            default: true
        },
        minDate: {
            type: [Date, String],
            default: null
        },
        maxDate: {
            type: [Date, String],
            default: null
        },
        disabledDates: {
            type: Array,
            default: () => []
        },
        highlightedDates: {
            type: Array,
            default: () => []
        },
        firstDayOfWeek: {
            type: Number,
            default: 0,
            validator: (value) => value >= 0 && value <= 6
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
        }
    },
    data() {
        return {
            isOpen: false,
            currentDate: new Date(),
            inputId: `datepicker-${Math.random().toString(36).substr(2, 9)}`,
            monthNames: [
                '1월', '2월', '3월', '4월', '5월', '6월',
                '7월', '8월', '9월', '10월', '11월', '12월'
            ],
            weekDays: ['일', '월', '화', '수', '목', '금', '토']
        };
    },
    computed: {
        wrapperClasses() {
            return [
                'datepicker-wrapper',
                `datepicker-size-${this.size}`,
                {
                    'datepicker-disabled': this.disabled,
                    'datepicker-error': this.errorMessage,
                    'datepicker-open': this.isOpen
                }
            ];
        },
        inputClasses() {
            return [
                'datepicker-input',
                {
                    'datepicker-input-disabled': this.disabled,
                    'datepicker-input-error': this.errorMessage
                }
            ];
        },
        dropdownClasses() {
            return [
                'datepicker-dropdown'
            ];
        },
        selectedDate() {
            if (!this.modelValue) return null;
            return typeof this.modelValue === 'string' ? new Date(this.modelValue) : this.modelValue;
        },
        displayValue() {
            if (!this.selectedDate) return '';
            return this.formatDate(this.selectedDate, this.format);
        },
        currentYear: {
            get() {
                return this.currentDate.getFullYear();
            },
            set(year) {
                this.currentDate = new Date(year, this.currentMonth, 1);
            }
        },
        currentMonth: {
            get() {
                return this.currentDate.getMonth();
            },
            set(month) {
                this.currentDate = new Date(this.currentYear, month, 1);
            }
        },
        availableYears() {
            const currentYear = new Date().getFullYear();
            const years = [];
            for (let i = currentYear - 50; i <= currentYear + 10; i++) {
                years.push(i);
            }
            return years;
        },
        calendarDates() {
            const dates = [];
            const firstDay = new Date(this.currentYear, this.currentMonth, 1);
            const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
            
            const startDate = new Date(firstDay);
            startDate.setDate(startDate.getDate() - ((firstDay.getDay() - this.firstDayOfWeek + 7) % 7));
            
            for (let i = 0; i < 42; i++) {
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + i);
                
                dates.push({
                    key: this.formatDate(date, 'YYYY-MM-DD'),
                    date: new Date(date),
                    day: date.getDate(),
                    month: date.getMonth(),
                    year: date.getFullYear(),
                    isCurrentMonth: date.getMonth() === this.currentMonth,
                    isToday: this.isSameDay(date, new Date()),
                    isSelected: this.selectedDate && this.isSameDay(date, this.selectedDate),
                    isDisabled: this.isDateDisabled(date),
                    isHighlighted: this.isDateHighlighted(date)
                });
            }
            
            return dates;
        }
    },
    methods: {
        toggleCalendar() {
            if (this.disabled) return;
            this.isOpen = !this.isOpen;
        },
        closeCalendar() {
            this.isOpen = false;
        },
        selectDate(dateObj) {
            if (dateObj.isDisabled) return;
            
            const newDate = new Date(dateObj.date);
            this.$emit('update:modelValue', newDate);
            this.$emit('change', newDate);
            this.closeCalendar();
        },
        selectToday() {
            const today = new Date();
            this.$emit('update:modelValue', today);
            this.$emit('change', today);
            this.closeCalendar();
        },
        clear() {
            this.$emit('update:modelValue', null);
            this.$emit('clear');
            this.closeCalendar();
        },
        previousMonth() {
            this.currentDate = new Date(this.currentYear, this.currentMonth - 1, 1);
        },
        nextMonth() {
            this.currentDate = new Date(this.currentYear, this.currentMonth + 1, 1);
        },
        getDateClasses(dateObj) {
            return {
                'datepicker-date-current-month': dateObj.isCurrentMonth,
                'datepicker-date-other-month': !dateObj.isCurrentMonth,
                'datepicker-date-today': dateObj.isToday,
                'datepicker-date-selected': dateObj.isSelected,
                'datepicker-date-disabled': dateObj.isDisabled,
                'datepicker-date-highlighted': dateObj.isHighlighted
            };
        },
        isSameDay(date1, date2) {
            return date1.getFullYear() === date2.getFullYear() &&
                   date1.getMonth() === date2.getMonth() &&
                   date1.getDate() === date2.getDate();
        },
        isDateDisabled(date) {
            if (this.minDate && date < new Date(this.minDate)) return true;
            if (this.maxDate && date > new Date(this.maxDate)) return true;
            
            const dateString = this.formatDate(date, 'YYYY-MM-DD');
            return this.disabledDates.includes(dateString);
        },
        isDateHighlighted(date) {
            const dateString = this.formatDate(date, 'YYYY-MM-DD');
            return this.highlightedDates.includes(dateString);
        },
        formatDate(date, format) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            
            return format
                .replace('YYYY', year)
                .replace('MM', month)
                .replace('DD', day);
        },
        handleClickOutside(event) {
            if (!this.$el.contains(event.target)) {
                this.closeCalendar();
            }
        }
    },
    mounted() {
        document.addEventListener('click', this.handleClickOutside);
        
        // 초기 날짜 설정
        if (this.selectedDate) {
            this.currentDate = new Date(this.selectedDate);
        }
    },
    unmounted() {
        document.removeEventListener('click', this.handleClickOutside);
    },
    watch: {
        modelValue(newValue) {
            if (newValue) {
                const date = typeof newValue === 'string' ? new Date(newValue) : newValue;
                this.currentDate = new Date(date);
            }
        }
    }
}