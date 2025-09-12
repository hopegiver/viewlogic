/**
 * Breadcrumb 컴포넌트
 * 경로 표시
 */
export default {
    name: 'Breadcrumb',
    template: `
        <nav class="breadcrumb-wrapper" :class="wrapperClasses" aria-label="경로">
            <ol class="breadcrumb" :class="breadcrumbClasses">
                <li
                    v-for="(item, index) in items"
                    :key="item.key || index"
                    class="breadcrumb-item"
                    :class="getItemClasses(item, index)"
                >
                    <a
                        v-if="!isLast(index) && item.href"
                        :href="item.href"
                        class="breadcrumb-link"
                        @click="handleClick(item, index, $event)"
                    >
                        <span v-if="item.icon" :class="['breadcrumb-icon', item.icon]"></span>
                        <span class="breadcrumb-text">{{ item.label }}</span>
                    </a>
                    
                    <span v-else class="breadcrumb-current">
                        <span v-if="item.icon" :class="['breadcrumb-icon', item.icon]"></span>
                        <span class="breadcrumb-text">{{ item.label }}</span>
                    </span>
                    
                    <span
                        v-if="!isLast(index)"
                        class="breadcrumb-separator"
                        :class="separatorClasses"
                        aria-hidden="true"
                    >
                        {{ separatorIcon }}
                    </span>
                </li>
            </ol>
        </nav>
    `,
    emits: ['click'],
    props: {
        items: {
            type: Array,
            required: true,
            validator: (items) => {
                return items.every(item => item.label);
            }
        },
        separator: {
            type: String,
            default: '/'
        },
        size: {
            type: String,
            default: 'medium',
            validator: (value) => ['small', 'medium', 'large'].includes(value)
        },
        variant: {
            type: String,
            default: 'default',
            validator: (value) => ['default', 'pills', 'arrows'].includes(value)
        },
        maxItems: {
            type: Number,
            default: null
        },
        showHome: {
            type: Boolean,
            default: false
        },
        homeIcon: {
            type: String,
            default: '🏠'
        }
    },
    computed: {
        wrapperClasses() {
            return [
                'breadcrumb-wrapper',
                `breadcrumb-size-${this.size}`
            ];
        },
        breadcrumbClasses() {
            return [
                'breadcrumb',
                `breadcrumb-${this.variant}`
            ];
        },
        separatorClasses() {
            return [
                'breadcrumb-separator',
                `breadcrumb-separator-${this.variant}`
            ];
        },
        separatorIcon() {
            if (this.variant === 'arrows') {
                return '›';
            }
            return this.separator;
        },
        processedItems() {
            let result = [...this.items];
            
            // 홈 아이콘 추가
            if (this.showHome && result.length > 0 && !result[0].isHome) {
                result.unshift({
                    label: this.homeIcon,
                    href: '/',
                    isHome: true,
                    icon: 'breadcrumb-home-icon'
                });
            }
            
            // 최대 항목 수 제한
            if (this.maxItems && result.length > this.maxItems) {
                const start = result.slice(0, 1);
                const end = result.slice(-this.maxItems + 2);
                result = [
                    ...start,
                    { label: '...', isEllipsis: true },
                    ...end
                ];
            }
            
            return result;
        }
    },
    methods: {
        isLast(index) {
            return index === this.processedItems.length - 1;
        },
        getItemClasses(item, index) {
            return {
                'breadcrumb-item-active': this.isLast(index),
                'breadcrumb-item-home': item.isHome,
                'breadcrumb-item-ellipsis': item.isEllipsis,
                'breadcrumb-item-clickable': !this.isLast(index) && item.href
            };
        },
        handleClick(item, index, event) {
            if (item.isEllipsis) {
                event.preventDefault();
                return;
            }
            
            this.$emit('click', { item, index, event });
            
            if (item.handler && typeof item.handler === 'function') {
                event.preventDefault();
                item.handler(item, index);
            }
        }
    }
}