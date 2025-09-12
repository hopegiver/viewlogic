/**
 * Tabs 컴포넌트
 * 탭 형태의 네비게이션을 제공하는 컴포넌트
 */
export default {
    name: 'Tabs',
    template: `
        <div :class="tabsClasses">
            <div class="tabs-header" role="tablist">
                <button
                    v-for="(tab, index) in tabs"
                    :key="tab.name"
                    :class="getTabClasses(tab, index)"
                    :disabled="tab.disabled"
                    @click="selectTab(tab, index)"
                    role="tab"
                    :aria-selected="activeTab === tab.name"
                    :aria-controls="'tab-panel-' + tab.name"
                >
                    <span v-if="tab.icon" :class="['tab-icon', tab.icon]"></span>
                    <span class="tab-label">{{ tab.label }}</span>
                    <span v-if="tab.badge" class="tab-badge">{{ tab.badge }}</span>
                    <button
                        v-if="tab.closable && closable"
                        class="tab-close"
                        @click.stop="closeTab(tab, index)"
                        :aria-label="'Close ' + tab.label"
                    >
                        ×
                    </button>
                </button>
                
                <div v-if="addable" class="tab-add">
                    <button class="tab-add-button" @click="addTab" aria-label="Add new tab">
                        +
                    </button>
                </div>
            </div>
            
            <div class="tabs-content">
                <div
                    v-for="(tab, index) in tabs"
                    :key="tab.name"
                    v-show="activeTab === tab.name"
                    :class="getTabPanelClasses(tab)"
                    role="tabpanel"
                    :id="'tab-panel-' + tab.name"
                    :aria-labelledby="'tab-' + tab.name"
                >
                    <component 
                        v-if="tab.component" 
                        :is="tab.component" 
                        v-bind="tab.props || {}"
                        @update="(data) => updateTabData(tab, data)"
                    />
                    <div v-else-if="tab.content" v-html="tab.content"></div>
                    <slot v-else :name="tab.name" :tab="tab" :index="index"></slot>
                </div>
            </div>
        </div>
    `,
    emits: ['update:modelValue', 'tab-change', 'tab-close', 'tab-add', 'tab-update'],
    props: {
        modelValue: {
            type: String,
            default: ''
        },
        tabs: {
            type: Array,
            required: true,
            validator: (tabs) => {
                return tabs.every(tab => 
                    tab.name && tab.label && 
                    typeof tab.name === 'string' && 
                    typeof tab.label === 'string'
                );
            }
        },
        variant: {
            type: String,
            default: 'default',
            validator: (value) => ['default', 'pills', 'underline', 'card'].includes(value)
        },
        size: {
            type: String,
            default: 'medium',
            validator: (value) => ['small', 'medium', 'large'].includes(value)
        },
        closable: {
            type: Boolean,
            default: false
        },
        addable: {
            type: Boolean,
            default: false
        },
        lazy: {
            type: Boolean,
            default: false
        },
        animated: {
            type: Boolean,
            default: true
        }
    },
    data() {
        return {
            activeTab: this.modelValue || (this.tabs.length > 0 ? this.tabs[0].name : ''),
            loadedTabs: new Set()
        };
    },
    computed: {
        tabsClasses() {
            return [
                'tabs',
                `tabs-${this.variant}`,
                `tabs-${this.size}`,
                {
                    'tabs-animated': this.animated,
                    'tabs-closable': this.closable,
                    'tabs-addable': this.addable
                }
            ];
        }
    },
    methods: {
        selectTab(tab, index) {
            if (tab.disabled) return;
            
            this.activeTab = tab.name;
            this.$emit('update:modelValue', tab.name);
            this.$emit('tab-change', { tab, index, previousTab: this.activeTab });
            
            // lazy 로딩 탭 추적
            if (this.lazy) {
                this.loadedTabs.add(tab.name);
            }
        },
        closeTab(tab, index) {
            if (!tab.closable) return;
            
            this.$emit('tab-close', { tab, index });
            
            // 현재 활성 탭이 닫히는 경우 다른 탭으로 이동
            if (this.activeTab === tab.name) {
                const remainingTabs = this.tabs.filter((_, i) => i !== index);
                if (remainingTabs.length > 0) {
                    const nextTab = remainingTabs[Math.max(0, index - 1)];
                    this.selectTab(nextTab, Math.max(0, index - 1));
                }
            }
        },
        addTab() {
            this.$emit('tab-add');
        },
        getTabClasses(tab, index) {
            return [
                'tab',
                {
                    'tab-active': this.activeTab === tab.name,
                    'tab-disabled': tab.disabled,
                    'tab-closable': tab.closable && this.closable,
                    'tab-with-icon': tab.icon,
                    'tab-with-badge': tab.badge
                }
            ];
        },
        getTabPanelClasses(tab) {
            return [
                'tab-panel',
                {
                    'tab-panel-active': this.activeTab === tab.name,
                    'tab-panel-lazy': this.lazy && !this.loadedTabs.has(tab.name)
                }
            ];
        },
        updateTabData(tab, data) {
            this.$emit('tab-update', { tab, data });
        }
    },
    watch: {
        modelValue(newValue) {
            if (newValue !== this.activeTab) {
                const tab = this.tabs.find(t => t.name === newValue);
                if (tab) {
                    this.activeTab = newValue;
                    if (this.lazy) {
                        this.loadedTabs.add(newValue);
                    }
                }
            }
        },
        tabs: {
            handler(newTabs) {
                // 활성 탭이 더 이상 존재하지 않는 경우 첫 번째 탭으로 이동
                if (!newTabs.find(tab => tab.name === this.activeTab) && newTabs.length > 0) {
                    this.selectTab(newTabs[0], 0);
                }
            },
            deep: true
        }
    },
    mounted() {
        // 초기 활성 탭을 lazy 로딩 목록에 추가
        if (this.lazy && this.activeTab) {
            this.loadedTabs.add(this.activeTab);
        }
    }
}