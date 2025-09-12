/**
 * Tooltip 컴포넌트
 * 툴팁
 */
export default {
    name: 'Tooltip',
    template: `
        <div class="tooltip-wrapper" @mouseenter="show" @mouseleave="hide" @focus="show" @blur="hide">
            <slot></slot>
            
            <teleport to="body">
                <transition name="tooltip" @after-leave="resetPosition">
                    <div
                        v-if="visible"
                        ref="tooltip"
                        :class="tooltipClasses"
                        :style="tooltipStyle"
                        role="tooltip"
                        :aria-hidden="!visible"
                    >
                        <div class="tooltip-content">
                            <div v-if="title" class="tooltip-title">{{ title }}</div>
                            <div class="tooltip-text">
                                <slot name="content">
                                    {{ content }}
                                </slot>
                            </div>
                        </div>
                        <div class="tooltip-arrow" :class="arrowClasses"></div>
                    </div>
                </transition>
            </teleport>
        </div>
    `,
    emits: ['show', 'hide'],
    props: {
        content: {
            type: String,
            required: true
        },
        title: {
            type: String,
            default: ''
        },
        placement: {
            type: String,
            default: 'top',
            validator: (value) => [
                'top', 'top-start', 'top-end',
                'bottom', 'bottom-start', 'bottom-end',
                'left', 'left-start', 'left-end',
                'right', 'right-start', 'right-end'
            ].includes(value)
        },
        trigger: {
            type: String,
            default: 'hover',
            validator: (value) => ['hover', 'click', 'focus', 'manual'].includes(value)
        },
        disabled: {
            type: Boolean,
            default: false
        },
        delay: {
            type: [Number, Object],
            default: 0
        },
        offset: {
            type: [Number, Array],
            default: 8
        },
        variant: {
            type: String,
            default: 'dark',
            validator: (value) => ['dark', 'light', 'primary', 'success', 'warning', 'danger'].includes(value)
        },
        size: {
            type: String,
            default: 'medium',
            validator: (value) => ['small', 'medium', 'large'].includes(value)
        },
        maxWidth: {
            type: [String, Number],
            default: '300px'
        },
        zIndex: {
            type: Number,
            default: 9999
        }
    },
    data() {
        return {
            visible: false,
            position: {
                top: 0,
                left: 0
            },
            actualPlacement: this.placement,
            showTimer: null,
            hideTimer: null
        };
    },
    computed: {
        tooltipClasses() {
            return [
                'tooltip',
                `tooltip-${this.variant}`,
                `tooltip-${this.size}`,
                `tooltip-${this.actualPlacement}`
            ];
        },
        arrowClasses() {
            return [
                'tooltip-arrow',
                `tooltip-arrow-${this.actualPlacement.split('-')[0]}`
            ];
        },
        tooltipStyle() {
            const maxWidth = typeof this.maxWidth === 'number' ? `${this.maxWidth}px` : this.maxWidth;
            return {
                top: `${this.position.top}px`,
                left: `${this.position.left}px`,
                maxWidth,
                zIndex: this.zIndex
            };
        },
        showDelay() {
            if (typeof this.delay === 'number') {
                return this.delay;
            }
            return this.delay.show || 0;
        },
        hideDelay() {
            if (typeof this.delay === 'number') {
                return this.delay;
            }
            return this.delay.hide || 0;
        }
    },
    methods: {
        show() {
            if (this.disabled || this.trigger === 'manual') return;
            
            this.clearTimers();
            
            if (this.showDelay > 0) {
                this.showTimer = setTimeout(() => {
                    this.doShow();
                }, this.showDelay);
            } else {
                this.doShow();
            }
        },
        hide() {
            if (this.disabled || this.trigger === 'manual') return;
            
            this.clearTimers();
            
            if (this.hideDelay > 0) {
                this.hideTimer = setTimeout(() => {
                    this.doHide();
                }, this.hideDelay);
            } else {
                this.doHide();
            }
        },
        doShow() {
            this.visible = true;
            this.$nextTick(() => {
                this.updatePosition();
            });
            this.$emit('show');
        },
        doHide() {
            this.visible = false;
            this.$emit('hide');
        },
        toggle() {
            if (this.visible) {
                this.hide();
            } else {
                this.show();
            }
        },
        updatePosition() {
            if (!this.$refs.tooltip || !this.$el) return;
            
            const trigger = this.$el;
            const tooltip = this.$refs.tooltip;
            
            const triggerRect = trigger.getBoundingClientRect();
            const tooltipRect = tooltip.getBoundingClientRect();
            
            const offset = Array.isArray(this.offset) ? this.offset : [this.offset, this.offset];
            const [offsetX, offsetY] = offset;
            
            let top = 0;
            let left = 0;
            let placement = this.placement;
            
            // 기본 위치 계산
            switch (placement.split('-')[0]) {
                case 'top':
                    top = triggerRect.top - tooltipRect.height - offsetY;
                    left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
                    break;
                case 'bottom':
                    top = triggerRect.bottom + offsetY;
                    left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
                    break;
                case 'left':
                    top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
                    left = triggerRect.left - tooltipRect.width - offsetX;
                    break;
                case 'right':
                    top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
                    left = triggerRect.right + offsetX;
                    break;
            }
            
            // start/end 정렬 조정
            if (placement.includes('-start')) {
                if (['top', 'bottom'].includes(placement.split('-')[0])) {
                    left = triggerRect.left;
                } else {
                    top = triggerRect.top;
                }
            } else if (placement.includes('-end')) {
                if (['top', 'bottom'].includes(placement.split('-')[0])) {
                    left = triggerRect.right - tooltipRect.width;
                } else {
                    top = triggerRect.bottom - tooltipRect.height;
                }
            }
            
            // 화면 경계 감지 및 자동 조정
            const viewport = {
                width: window.innerWidth,
                height: window.innerHeight
            };
            
            // 화면을 벗어나는 경우 위치 조정
            if (left < 0) {
                left = 8;
            } else if (left + tooltipRect.width > viewport.width) {
                left = viewport.width - tooltipRect.width - 8;
            }
            
            if (top < 0) {
                top = 8;
            } else if (top + tooltipRect.height > viewport.height) {
                top = viewport.height - tooltipRect.height - 8;
            }
            
            this.position = { top, left };
            this.actualPlacement = placement;
        },
        clearTimers() {
            if (this.showTimer) {
                clearTimeout(this.showTimer);
                this.showTimer = null;
            }
            if (this.hideTimer) {
                clearTimeout(this.hideTimer);
                this.hideTimer = null;
            }
        },
        resetPosition() {
            this.position = { top: 0, left: 0 };
        },
        handleClickOutside(event) {
            if (this.trigger === 'click' && !this.$el.contains(event.target)) {
                this.hide();
            }
        }
    },
    mounted() {
        if (this.trigger === 'click') {
            this.$el.addEventListener('click', this.toggle);
            document.addEventListener('click', this.handleClickOutside);
        }
    },
    unmounted() {
        this.clearTimers();
        if (this.trigger === 'click') {
            document.removeEventListener('click', this.handleClickOutside);
        }
    }
}