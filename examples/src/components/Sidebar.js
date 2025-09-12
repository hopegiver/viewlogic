/**
 * Sidebar 컴포넌트
 * 사이드바
 */
export default {
    name: 'Sidebar',
    template: `
        <aside :class="sidebarClasses" :style="sidebarStyle">
            <!-- 오버레이 -->
            <div v-if="overlay && isOpen" class="sidebar-overlay" @click="close"></div>
            
            <!-- 사이드바 콘텐츠 -->
            <div class="sidebar-content">
                <!-- 헤더 -->
                <div v-if="$slots.header || title" class="sidebar-header">
                    <slot name="header">
                        <h3 v-if="title" class="sidebar-title">{{ title }}</h3>
                    </slot>
                    <button v-if="closable" class="sidebar-close" @click="close">
                        ×
                    </button>
                </div>
                
                <!-- 메인 콘텐츠 -->
                <div class="sidebar-body">
                    <nav v-if="navigation && menuItems.length > 0" class="sidebar-nav">
                        <ul class="sidebar-menu">
                            <li
                                v-for="item in menuItems"
                                :key="item.key || item.label"
                                class="sidebar-menu-item"
                                :class="getMenuItemClasses(item)"
                            >
                                <a
                                    v-if="!item.children"
                                    :href="item.href"
                                    class="sidebar-menu-link"
                                    :class="{ 'sidebar-menu-link-active': item.active }"
                                    @click="handleMenuClick(item, $event)"
                                >
                                    <span v-if="item.icon" :class="['sidebar-menu-icon', item.icon]"></span>
                                    <span class="sidebar-menu-text">{{ item.label }}</span>
                                    <span v-if="item.badge" class="sidebar-menu-badge">{{ item.badge }}</span>
                                </a>
                                
                                <div v-else class="sidebar-menu-group">
                                    <div
                                        class="sidebar-menu-group-header"
                                        @click="toggleGroup(item)"
                                    >
                                        <span v-if="item.icon" :class="['sidebar-menu-icon', item.icon]"></span>
                                        <span class="sidebar-menu-text">{{ item.label }}</span>
                                        <span class="sidebar-menu-arrow" :class="{ 'sidebar-menu-arrow-open': item.expanded }">
                                            ›
                                        </span>
                                    </div>
                                    
                                    <transition name="sidebar-submenu">
                                        <ul v-if="item.expanded" class="sidebar-submenu">
                                            <li
                                                v-for="subItem in item.children"
                                                :key="subItem.key || subItem.label"
                                                class="sidebar-submenu-item"
                                            >
                                                <a
                                                    :href="subItem.href"
                                                    class="sidebar-submenu-link"
                                                    :class="{ 'sidebar-submenu-link-active': subItem.active }"
                                                    @click="handleMenuClick(subItem, $event)"
                                                >
                                                    <span v-if="subItem.icon" :class="['sidebar-submenu-icon', subItem.icon]"></span>
                                                    <span class="sidebar-submenu-text">{{ subItem.label }}</span>
                                                    <span v-if="subItem.badge" class="sidebar-submenu-badge">{{ subItem.badge }}</span>
                                                </a>
                                            </li>
                                        </ul>
                                    </transition>
                                </div>
                            </li>
                        </ul>
                    </nav>
                    
                    <div class="sidebar-slot-content">
                        <slot></slot>
                    </div>
                </div>
                
                <!-- 푸터 -->
                <div v-if="$slots.footer" class="sidebar-footer">
                    <slot name="footer"></slot>
                </div>
            </div>
            
            <!-- 리사이즈 핸들 -->
            <div v-if="resizable" class="sidebar-resize-handle" @mousedown="startResize"></div>
        </aside>
    `,
    emits: ['update:modelValue', 'toggle'],
    props: {
        modelValue: {
            type: Boolean,
            default: true
        },
        title: {
            type: String,
            default: ''
        },
        position: {
            type: String,
            default: 'left',
            validator: (value) => ['left', 'right'].includes(value)
        },
        width: {
            type: [String, Number],
            default: '280px'
        },
        minWidth: {
            type: [String, Number],
            default: '200px'
        },
        maxWidth: {
            type: [String, Number],
            default: '400px'
        },
        collapsible: {
            type: Boolean,
            default: false
        },
        collapsed: {
            type: Boolean,
            default: false
        },
        collapsedWidth: {
            type: [String, Number],
            default: '64px'
        },
        overlay: {
            type: Boolean,
            default: false
        },
        closable: {
            type: Boolean,
            default: false
        },
        resizable: {
            type: Boolean,
            default: false
        },
        navigation: {
            type: Boolean,
            default: false
        },
        menuItems: {
            type: Array,
            default: () => []
        },
        variant: {
            type: String,
            default: 'default',
            validator: (value) => ['default', 'dark', 'light'].includes(value)
        }
    },
    data() {
        return {
            isOpen: this.modelValue,
            isCollapsed: this.collapsed,
            currentWidth: this.width,
            isResizing: false
        };
    },
    computed: {
        sidebarClasses() {
            return [
                'sidebar',
                `sidebar-${this.position}`,
                `sidebar-${this.variant}`,
                {
                    'sidebar-open': this.isOpen,
                    'sidebar-collapsed': this.isCollapsed,
                    'sidebar-overlay': this.overlay,
                    'sidebar-resizable': this.resizable,
                    'sidebar-navigation': this.navigation
                }
            ];
        },
        sidebarStyle() {
            const width = this.isCollapsed ? this.collapsedWidth : this.currentWidth;
            const widthValue = typeof width === 'number' ? `${width}px` : width;
            
            return {
                width: widthValue,
                [this.position]: this.isOpen ? '0' : `-${widthValue}`
            };
        }
    },
    methods: {
        open() {
            this.isOpen = true;
            this.$emit('update:modelValue', true);
            this.$emit('open');
        },
        close() {
            this.isOpen = false;
            this.$emit('update:modelValue', false);
            this.$emit('close');
        },
        toggle() {
            if (this.isOpen) {
                this.close();
            } else {
                this.open();
            }
        },
        collapse() {
            this.isCollapsed = true;
            this.$emit('collapse');
        },
        expand() {
            this.isCollapsed = false;
            this.$emit('expand');
        },
        toggleCollapse() {
            if (this.isCollapsed) {
                this.expand();
            } else {
                this.collapse();
            }
        },
        handleMenuClick(item, event) {
            if (item.disabled) {
                event.preventDefault();
                return;
            }
            
            this.$emit('menu-click', item, event);
            
            if (item.handler && typeof item.handler === 'function') {
                event.preventDefault();
                item.handler(item);
            }
        },
        toggleGroup(item) {
            if (item.children) {
                item.expanded = !item.expanded;
                this.$emit('group-toggle', item);
            }
        },
        getMenuItemClasses(item) {
            return {
                'sidebar-menu-item-active': item.active,
                'sidebar-menu-item-disabled': item.disabled,
                'sidebar-menu-item-group': item.children,
                'sidebar-menu-item-expanded': item.expanded
            };
        },
        startResize(event) {
            this.isResizing = true;
            const startX = event.clientX;
            const startWidth = parseInt(this.currentWidth);
            
            const handleMouseMove = (e) => {
                if (!this.isResizing) return;
                
                const delta = this.position === 'left' ? e.clientX - startX : startX - e.clientX;
                const newWidth = Math.max(
                    parseInt(this.minWidth),
                    Math.min(parseInt(this.maxWidth), startWidth + delta)
                );
                
                this.currentWidth = `${newWidth}px`;
                this.$emit('resize', newWidth);
            };
            
            const handleMouseUp = () => {
                this.isResizing = false;
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
    },
    watch: {
        modelValue(newValue) {
            this.isOpen = newValue;
        },
        collapsed(newValue) {
            this.isCollapsed = newValue;
        }
    }
}