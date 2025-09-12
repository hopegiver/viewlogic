/**
 * Card 컴포넌트
 * 콘텐츠를 카드 형태로 표시하는 컴포넌트
 */
export default {
    name: 'Card',
    template: `
        <div :class="cardClasses" @click="handleClick">
            <div v-if="hasHeader" class="card-header">
                <div v-if="image" class="card-image">
                    <img :src="image" :alt="imageAlt" />
                </div>
                <div v-if="title || $slots.header" class="card-header-content">
                    <h3 v-if="title" class="card-title">{{ title }}</h3>
                    <p v-if="subtitle" class="card-subtitle">{{ subtitle }}</p>
                    <slot name="header"></slot>
                </div>
                <div v-if="$slots.actions || showDefaultActions" class="card-actions">
                    <slot name="actions">
                        <button v-if="showDefaultActions" class="btn btn-sm btn-outline">더보기</button>
                    </slot>
                </div>
            </div>
            
            <div class="card-body" v-if="$slots.default || content">
                <p v-if="content" class="card-content">{{ content }}</p>
                <slot></slot>
            </div>
            
            <div v-if="$slots.footer || tags.length > 0" class="card-footer">
                <div v-if="tags.length > 0" class="card-tags">
                    <span 
                        v-for="tag in tags" 
                        :key="tag" 
                        class="card-tag"
                        :class="tagVariant"
                    >
                        {{ tag }}
                    </span>
                </div>
                <slot name="footer"></slot>
            </div>
            
            <div v-if="loading" class="card-loading">
                <div class="loading-spinner"></div>
            </div>
        </div>
    `,
    emits: ['click'],
    props: {
        title: {
            type: String,
            default: ''
        },
        subtitle: {
            type: String,
            default: ''
        },
        content: {
            type: String,
            default: ''
        },
        image: {
            type: String,
            default: ''
        },
        imageAlt: {
            type: String,
            default: ''
        },
        variant: {
            type: String,
            default: 'default',
            validator: (value) => ['default', 'primary', 'secondary', 'success', 'warning', 'danger'].includes(value)
        },
        shadow: {
            type: String,
            default: 'medium',
            validator: (value) => ['none', 'small', 'medium', 'large'].includes(value)
        },
        hoverable: {
            type: Boolean,
            default: false
        },
        clickable: {
            type: Boolean,
            default: false
        },
        loading: {
            type: Boolean,
            default: false
        },
        tags: {
            type: Array,
            default: () => []
        },
        tagVariant: {
            type: String,
            default: 'tag-primary'
        },
        showDefaultActions: {
            type: Boolean,
            default: false
        }
    },
    computed: {
        cardClasses() {
            return [
                'card',
                `card-${this.variant}`,
                `card-shadow-${this.shadow}`,
                {
                    'card-hoverable': this.hoverable,
                    'card-clickable': this.clickable,
                    'card-loading': this.loading
                }
            ];
        },
        hasHeader() {
            return this.title || this.subtitle || this.image || this.$slots.header || this.$slots.actions || this.showDefaultActions;
        }
    },
    methods: {
        handleClick(event) {
            if (this.clickable && !this.loading) {
                this.$emit('click', event);
            }
        }
    }
}