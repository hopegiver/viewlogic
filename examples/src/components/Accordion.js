/**
 * Accordion 컴포넌트
 * 아코디언
 */
export default {
    name: 'Accordion',
    template: `
        <div class="accordion" :class="accordionClasses">
            <div
                v-for="(item, index) in items"
                :key="item.key || index"
                class="accordion-item"
                :class="getItemClasses(item, index)"
            >
                <div
                    class="accordion-header"
                    :class="getHeaderClasses(item, index)"
                    @click="toggleItem(index)"
                    :aria-expanded="isExpanded(index)"
                    :aria-controls="'accordion-content-' + index"
                >
                    <span v-if="item.icon" :class="['accordion-icon', item.icon]"></span>
                    <span class="accordion-title">{{ item.title }}</span>
                    <span v-if="item.badge" class="accordion-badge">{{ item.badge }}</span>
                    <span class="accordion-arrow" :class="{ 'accordion-arrow-expanded': isExpanded(index) }">
                        ›
                    </span>
                </div>
                
                <transition name="accordion-content" @enter="enter" @leave="leave">
                    <div
                        v-if="isExpanded(index)"
                        :id="'accordion-content-' + index"
                        class="accordion-content"
                        :class="getContentClasses(item, index)"
                    >
                        <div class="accordion-body">
                            <slot :name="'content-' + index" :item="item" :index="index">
                                <div v-html="item.content"></div>
                            </slot>
                        </div>
                    </div>
                </transition>
            </div>
        </div>
    `,
    emits: ['update:modelValue', 'change'],
    props: {
        items: {
            type: Array,
            required: true
        },
        modelValue: {
            type: [Number, Array],
            default: null
        },
        multiple: {
            type: Boolean,
            default: false
        },
        collapsible: {
            type: Boolean,
            default: true
        },
        variant: {
            type: String,
            default: 'default',
            validator: (value) => ['default', 'flush', 'bordered'].includes(value)
        },
        size: {
            type: String,
            default: 'medium',
            validator: (value) => ['small', 'medium', 'large'].includes(value)
        }
    },
    data() {
        return {
            expandedItems: this.getInitialExpanded()
        };
    },
    computed: {
        accordionClasses() {
            return [
                'accordion',
                `accordion-${this.variant}`,
                `accordion-${this.size}`,
                {
                    'accordion-multiple': this.multiple
                }
            ];
        }
    },
    methods: {
        getInitialExpanded() {
            if (this.modelValue === null) {
                return this.multiple ? [] : -1;
            }
            return this.multiple ? [...this.modelValue] : this.modelValue;
        },
        isExpanded(index) {
            if (this.multiple) {
                return this.expandedItems.includes(index);
            }
            return this.expandedItems === index;
        },
        toggleItem(index) {
            if (this.items[index].disabled) return;
            
            if (this.multiple) {
                const currentIndex = this.expandedItems.indexOf(index);
                if (currentIndex > -1) {
                    if (this.collapsible) {
                        this.expandedItems.splice(currentIndex, 1);
                    }
                } else {
                    this.expandedItems.push(index);
                }
            } else {
                if (this.expandedItems === index && this.collapsible) {
                    this.expandedItems = -1;
                } else {
                    this.expandedItems = index;
                }
            }
            
            this.$emit('update:modelValue', this.expandedItems);
            this.$emit('change', {
                index,
                item: this.items[index],
                expanded: this.isExpanded(index)
            });
        },
        getItemClasses(item, index) {
            return {
                'accordion-item-expanded': this.isExpanded(index),
                'accordion-item-disabled': item.disabled
            };
        },
        getHeaderClasses(item, index) {
            return {
                'accordion-header-expanded': this.isExpanded(index),
                'accordion-header-disabled': item.disabled
            };
        },
        getContentClasses(item, index) {
            return {
                'accordion-content-expanded': this.isExpanded(index)
            };
        },
        enter(el) {
            el.style.height = '0';
            el.offsetHeight; // force reflow
            el.style.height = el.scrollHeight + 'px';
        },
        leave(el) {
            el.style.height = el.scrollHeight + 'px';
            el.offsetHeight; // force reflow
            el.style.height = '0';
        }
    },
    watch: {
        modelValue(newValue) {
            this.expandedItems = this.multiple ? [...newValue] : newValue;
        }
    }
}