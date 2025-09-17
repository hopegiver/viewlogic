# ViewLogic Router

<p align="center">
  <a href="https://github.com/hopegiver/viewlogic">
    <img src="https://img.shields.io/npm/v/viewlogic.svg" alt="npm version">
  </a>
  <a href="https://github.com/hopegiver/viewlogic/blob/main/LICENSE">
    <img src="https://img.shields.io/npm/l/viewlogic.svg" alt="license">
  </a>
  <a href="https://github.com/hopegiver/viewlogic">
    <img src="https://img.shields.io/npm/dm/viewlogic.svg" alt="downloads">
  </a>
</p>

> **Complete Vue 3 Framework**: Routing + State Management + Authentication + i18n + Caching + API + Forms

## 🎯 Core Philosophy: Simplicity Through Design

ViewLogic Router revolutionizes Vue development with two fundamental core principles:

### 🎭 View-Logic Separation
**Complete separation between View (presentation) and Logic (business logic)**. Views are pure HTML templates, logic is pure JavaScript components, making your code more maintainable, testable, and scalable.

### 🚀 Zero Build Development
**Zero build step required in development mode**. Work directly with source files, see changes instantly without any compilation, bundling, or build processes. True real-time development experience.

## 🚀 Why Choose ViewLogic Router?

**All-in-One Solution** - Replace 7+ libraries with one unified framework:
- 🔀 **Vue Router** → ViewLogic Routing
- 📦 **Pinia/Vuex** → StateHandler
- 🔐 **Auth Libraries** → AuthManager
- 🌐 **Vue I18n** → I18nManager
- 💾 **Cache Libraries** → CacheManager
- 🌐 **API Libraries** → ApiHandler
- 📝 **Form Libraries** → FormHandler

**Tiny Bundle Size** - Complete framework in just 51KB minified / 17KB gzipped!

**Easy Integration** - Drop-in UMD build available for instant usage without build tools.

## ✨ Key Features

- 🚀 **Ultra-Lightweight** - Complete routing system with zero dependencies and optimized codebase
- 🔄 **Multiple API Support** - Parallel data fetching from multiple APIs with named data storage
- 📝 **Automatic Form Handling** - Revolutionary form submission with `{paramName}` variable parameters
- 🛠️ **Built-in Components** - Preloaded UI components including revolutionary DynamicInclude & HtmlInclude
- 🔗 **Query-Based Parameter System** - Simple query-only parameters (`/users?id=123`) instead of complex path parameters
- ⚡ **Optimized Production** - Pre-built individual route bundles for lightning-fast production
- 📁 **Intuitive Structure** - Organized folder structure for views, logic, styles, layouts, and components
- 💾 **Smart Caching** - Intelligent route and component caching with TTL and LRU eviction
- 🔐 **Authentication** - Built-in JWT auth management with multiple storage options
- 🌐 **i18n Ready** - Built-in internationalization support with lazy loading
- 📊 **State Management** - Reactive state management without external dependencies

### What's Included
- ✅ Complete routing system with hash/history mode
- ✅ Advanced caching with TTL and size limits
- ✅ Built-in authentication with multiple storage options
- ✅ Internationalization system with lazy loading
- ✅ Form handling with automatic validation
- ✅ RESTful API client with parameter substitution
- ✅ Component loading and management
- ✅ Error handling and logging system
- ✅ Query parameter management
- ✅ Layout system with slot-based composition
- ✅ Global state management with reactivity
- ✅ Event system for component communication

## 🏗️ Project Structure

ViewLogic Router follows a clean, intuitive folder structure that promotes maintainability:

```
project/
├── src/
│   ├── views/              # HTML templates (pure presentation)
│   │   ├── home.html
│   │   ├── user-profile.html
│   │   └── dashboard.html
│   ├── logic/              # Vue component logic (pure JavaScript)
│   │   ├── home.js
│   │   ├── user-profile.js
│   │   └── dashboard.js
│   ├── components/         # Reusable UI components
│   │   ├── UserCard.vue
│   │   └── NavigationMenu.vue
│   ├── layouts/            # Layout templates
│   │   ├── default.html
│   │   └── admin.html
│   ├── styles/             # CSS files
│   │   ├── home.css
│   │   └── global.css
│   └── locales/            # i18n files (optional)
│       ├── en.json
│       └── ko.json
├── index.html              # Main entry point
├── package.json
└── config.json             # Optional configuration
```

## 🚀 Quick Start

### Method 1: ES6 Modules (Recommended)

```bash
npm install viewlogic
```

```html
<!DOCTYPE html>
<html>
<head>
    <title>My ViewLogic App</title>
</head>
<body>
    <div id="app"></div>
    <script type="module">
        import { ViewLogicRouter } from 'viewlogic';
        const router = new ViewLogicRouter({
            authEnabled: true,
            useI18n: true
        });
    </script>
</body>
</html>
```

### Method 2: UMD Build (No Build Tools)

```html
<!DOCTYPE html>
<html>
<head>
    <title>My ViewLogic App</title>
    <script src="https://cdn.jsdelivr.net/npm/vue@3/dist/vue.global.prod.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/viewlogic/dist/viewlogic-router.umd.js"></script>
</head>
<body>
    <div id="app"></div>
    <script>
        const router = new ViewLogicRouter();
    </script>
</body>
</html>
```

### Create Your First Route

**src/views/home.html**
```html
<div class="home">
    <h1>{{ message }}</h1>
    <p>Counter: {{ count }} | Global Count: {{ globalCount }}</p>
    <button @click="increment">Local +1</button>
    <button @click="incrementGlobal">Global +1</button>
    <button @click="saveUser" :disabled="loading">
        {{ loading ? 'Saving...' : 'Save User' }}
    </button>
    <div v-if="user">
        <h3>{{ $t('welcome.message', { name: user.name }) }}</h3>
    </div>
</div>
```

**src/logic/home.js**
```javascript
export default {
    data() {
        return {
            message: 'Welcome to ViewLogic!',
            count: 0,
            loading: false
        };
    },
    computed: {
        globalCount() {
            return this.$state.get('globalCounter', 0);
        },
        user() {
            return this.$state.get('currentUser');
        }
    },
    methods: {
        increment() {
            this.count++;
        },
        incrementGlobal() {
            const current = this.$state.get('globalCounter', 0);
            this.$state.set('globalCounter', current + 1);
        },
        async saveUser() {
            this.loading = true;
            try {
                const userData = {
                    name: 'John Doe',
                    email: 'john@example.com'
                };

                const savedUser = await this.$api.post('/api/users', userData);
                this.$state.set('currentUser', savedUser);

                this.$toast?.success?.('User saved successfully!');
            } catch (error) {
                this.$toast?.error?.('Failed to save user');
            } finally {
                this.loading = false;
            }
        }
    },
    mounted() {
        // Watch for global state changes
        this.$state.watch('currentUser', (newUser) => {
            console.log('User changed globally:', newUser);
        });
    }
};
```

## 🎯 Core APIs

### State Management

ViewLogic Router includes a powerful built-in state management system:

```javascript
// Set state (any component can access)
this.$state.set('user', { name: 'John', age: 30 });
this.$state.set('theme', 'dark');
this.$state.set('shoppingCart', []);

// Get state with optional default
const user = this.$state.get('user');
const theme = this.$state.get('theme', 'light');

// Check if state exists
if (this.$state.has('user')) {
    console.log('User is logged in');
}

// Watch for changes (reactive)
this.$state.watch('user', (newValue, oldValue) => {
    console.log('User changed:', newValue);
    this.updateUI();
});

// Stop watching
this.$state.unwatch('user', callbackFunction);

// Bulk updates
this.$state.update({
    theme: 'dark',
    language: 'ko',
    sidebar: 'collapsed'
});

// Get all state
const allState = this.$state.getAll();

// Clear specific state
this.$state.delete('temporaryData');
```

### Authentication System

Complete authentication management with multiple storage options:

```javascript
// Check authentication status
if (this.$isAuthenticated()) {
    console.log('User is logged in');
}

// Login with token
this.$setToken('jwt-token-here');

// Login with options
this.$setToken('jwt-token', {
    storage: 'localStorage',  // 'localStorage', 'sessionStorage', 'cookie'
    skipValidation: false     // Skip JWT validation
});

// Get current token
const token = this.$getToken();

// Login success handling (redirects to protected route or default)
this.$loginSuccess('/dashboard');

// Logout (clears token and redirects to login)
this.$logout();

// Manual auth check for specific route
const authResult = await this.$checkAuth('admin-panel');
if (authResult.allowed) {
    // User can access admin panel
}
```

### API Management

Built-in HTTP client with automatic token injection and parameter substitution:

```javascript
// GET request
const users = await this.$api.get('/api/users');

// GET with query parameters
const filteredUsers = await this.$api.get('/api/users', {
    params: { role: 'admin', active: true }
});

// POST with data
const newUser = await this.$api.post('/api/users', {
    name: 'John',
    email: 'john@example.com'
});

// PUT/PATCH/DELETE
await this.$api.put('/api/users/{userId}', userData);
await this.$api.patch('/api/users/{userId}', partialData);
await this.$api.delete('/api/users/{userId}');

// Parameter substitution (automatically uses route/query params)
// If current route is /users?userId=123, this becomes /api/users/123
const user = await this.$api.get('/api/users/{userId}');

// Custom headers
const response = await this.$api.post('/api/secure-endpoint', data, {
    headers: { 'X-Custom-Header': 'value' }
});

// Automatic data loading in components
export default {
    // Single API endpoint
    dataURL: '/api/user/profile',

    // Multiple endpoints
    dataURL: {
        profile: '/api/user/profile',
        posts: '/api/posts?userId={userId}',
        notifications: '/api/notifications'
    },

    mounted() {
        // Data automatically loaded and available as:
        // this.profile, this.posts, this.notifications
    }
};
```

### Internationalization

Comprehensive i18n system with lazy loading and pluralization:

```javascript
// Simple translation
const message = this.$t('welcome.message');

// With parameters
const greeting = this.$t('hello.user', { name: 'John', role: 'admin' });

// Nested keys
const errorMsg = this.$t('errors.validation.email.required');

// Plural forms
const itemCount = this.$plural('items.count', count, { count });
// items.count.singular: "{count} item"
// items.count.plural: "{count} items"

// Check current language
const currentLang = this.$i18n.getCurrentLanguage();

// Change language (automatically reloads interface)
await this.$i18n.setLanguage('ko');

// Format dates/numbers according to locale
const date = this.$i18n.formatDate(new Date(), {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
});

const price = this.$i18n.formatNumber(1234.56, {
    style: 'currency',
    currency: 'USD'
});
```

### Navigation & Routing

Simple yet powerful routing system:

```javascript
// Navigate to route
this.navigateTo('user-profile');

// With query parameters
this.navigateTo('user-profile', { userId: 123, tab: 'settings' });

// Object syntax
this.navigateTo({
    route: 'search-results',
    params: { query: 'vue', category: 'tutorials' }
});

// Get current route information
const currentRoute = this.$route.current;
const routeParams = this.$route.params;
const queryParams = this.$route.query;

// Access specific parameters
const userId = this.$params.userId;        // Route parameter
const tab = this.$query.tab;               // Query parameter
const searchTerm = this.$param('search');  // Either route or query param

// Check if route is protected
const isProtected = this.$route.isProtected('admin-dashboard');

// Navigate with state preservation
this.navigateTo('dashboard', {
    preserveState: true,
    scrollTop: false
});
```

### Form Handling

Revolutionary form processing with automatic parameter substitution:

```html
<!-- Basic form with automatic handling -->
<form action="/api/users" method="POST">
    <input name="name" v-model="userData.name" required>
    <input name="email" v-model="userData.email" type="email" required>
    <button type="submit">Create User</button>
</form>

<!-- Form with parameter substitution -->
<form action="/api/users/{userId}" method="PUT">
    <input name="name" v-model="user.name">
    <input name="email" v-model="user.email">
    <button type="submit">Update User</button>
</form>

<!-- File upload form -->
<form action="/api/upload" method="POST" enctype="multipart/form-data">
    <input name="avatar" type="file" accept="image/*">
    <input name="description" v-model="description">
    <button type="submit">Upload</button>
</form>
```

```javascript
// Programmatic form submission
export default {
    methods: {
        async submitForm() {
            const formData = {
                name: this.userData.name,
                email: this.userData.email
            };

            try {
                const result = await this.$form.submit('/api/users', formData, {
                    method: 'POST',
                    onProgress: (progress) => {
                        this.uploadProgress = progress;
                    }
                });

                this.$state.set('newUser', result);
                this.navigateTo('user-profile', { userId: result.id });
            } catch (error) {
                this.handleError(error);
            }
        }
    }
};
```

## ⚙️ Configuration

### Basic Configuration

```javascript
const router = new ViewLogicRouter({
    // Core routing settings
    basePath: '/',                      // Base path for the application
    mode: 'hash',                       // 'hash' or 'history'

    // State management (always enabled)
    // No configuration needed - StateHandler is always available

    // Authentication settings
    authEnabled: true,                  // Enable authentication system
    loginRoute: 'login',                // Route name for login page
    protectedRoutes: ['dashboard', 'profile', 'admin'],
    protectedPrefixes: ['admin/', 'secure/'],
    publicRoutes: ['login', 'register', 'home', 'about'],
    authStorage: 'localStorage',        // 'localStorage', 'sessionStorage', 'cookie'

    // Internationalization
    useI18n: true,                      // Enable i18n system
    defaultLanguage: 'en',              // Default language
    i18nPath: '/src/locales',          // Path to language files

    // Caching system
    cacheMode: 'memory',                // 'memory' only (others removed for simplicity)
    cacheTTL: 300000,                   // Cache TTL in milliseconds (5 minutes)
    maxCacheSize: 100,                  // Maximum number of cached items

    // API settings
    apiBaseURL: '/api',                 // Base URL for API requests
    apiTimeout: 10000,                  // Request timeout in milliseconds

    // Development settings
    environment: 'development',         // 'development' or 'production'
    logLevel: 'info'                    // 'error', 'warn', 'info', 'debug'
});
```

### Advanced Configuration

```javascript
const router = new ViewLogicRouter({
    // Custom authentication function
    authEnabled: true,
    checkAuthFunction: async (routeName) => {
        const token = localStorage.getItem('authToken');
        if (!token) return false;

        try {
            const response = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const userData = await response.json();
                // Store user data in global state
                router.stateHandler.set('currentUser', userData);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Auth verification failed:', error);
            return false;
        }
    },

    // Custom route loading
    routeResolver: (routeName) => {
        // Custom logic for resolving route files
        if (routeName.startsWith('admin/')) {
            return {
                viewPath: `/admin/views/${routeName.slice(6)}.html`,
                logicPath: `/admin/logic/${routeName.slice(6)}.js`
            };
        }
        return null; // Use default resolution
    },

    // Global error handler
    onError: (error, context) => {
        console.error('ViewLogic Error:', error, context);
        // Send to error tracking service
        if (window.errorTracker) {
            window.errorTracker.log(error, context);
        }
    },

    // Global route change handler
    onRouteChange: (newRoute, oldRoute) => {
        // Analytics tracking
        if (window.analytics) {
            window.analytics.track('page_view', {
                route: newRoute,
                previous_route: oldRoute
            });
        }
    }
});
```

## 📦 Bundle Size Comparison

| Solution | Minified | Gzipped |
|----------|----------|---------|
| **ViewLogic Router** (Complete) | **51KB** | **17KB** |
| Vue Router + Pinia + Vue I18n | 150KB+ | 45KB+ |
| React Router + Redux + i18next | 200KB+ | 60KB+ |
| Next.js (Runtime) | 300KB+ | 85KB+ |

*ViewLogic Router provides the functionality of 7+ libraries in a package smaller than most single-purpose libraries.*

## 🎯 Migration Guide

### From Vue Router + Pinia

**Before:**
```javascript
// main.js - Multiple library setup
import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import { createPinia } from 'pinia';
import { createI18n } from 'vue-i18n';
import App from './App.vue';

const router = createRouter({
    history: createWebHistory(),
    routes: [/* complex route config */]
});

const pinia = createPinia();
const i18n = createI18n({/* complex i18n config */});

const app = createApp(App);
app.use(router).use(pinia).use(i18n);
app.mount('#app');
```

**After:**
```javascript
// index.html - Single setup
import { ViewLogicRouter } from 'viewlogic';

const router = new ViewLogicRouter({
    mode: 'history',
    useI18n: true,
    authEnabled: true
});
// Everything is auto-configured and ready to use!
```

### State Management Migration

**Before (Pinia):**
```javascript
// stores/user.js
import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', {
    state: () => ({
        currentUser: null,
        preferences: {}
    }),
    getters: {
        isLoggedIn: (state) => !!state.currentUser,
        userName: (state) => state.currentUser?.name || 'Guest'
    },
    actions: {
        setUser(userData) {
            this.currentUser = userData;
        },
        updatePreferences(prefs) {
            this.preferences = { ...this.preferences, ...prefs };
        }
    }
});

// In components
import { useUserStore } from '@/stores/user';
const userStore = useUserStore();
userStore.setUser(userData);
```

**After (ViewLogic):**
```javascript
// In any component - no store files needed!
this.$state.set('currentUser', userData);
this.$state.update({ preferences: newPrefs });

// Computed properties work naturally
computed: {
    isLoggedIn() {
        return !!this.$state.get('currentUser');
    },
    userName() {
        return this.$state.get('currentUser')?.name || 'Guest';
    }
}
```

## 🔧 Production Build

```bash
# Development mode (zero build)
npm run dev

# Production build with optimization
npm run build

# Preview production build
npm run serve

# Build with custom config
npm run build -- --config custom.config.js
```

### Production Optimizations

ViewLogic Router automatically optimizes for production:

- **Code splitting**: Each route becomes a separate bundle
- **Tree shaking**: Unused features are eliminated
- **Minification**: Code is compressed and optimized
- **Caching**: Aggressive caching for static assets
- **Lazy loading**: Routes and components load on demand

## 🌟 Advanced Examples

### E-commerce Dashboard

```javascript
// logic/dashboard.js
export default {
    dataURL: {
        overview: '/api/dashboard/overview',
        sales: '/api/sales/recent',
        products: '/api/products/trending'
    },

    computed: {
        totalRevenue() {
            return this.sales?.reduce((sum, sale) => sum + sale.amount, 0) || 0;
        },
        cartItems() {
            return this.$state.get('shoppingCart', []);
        }
    },

    methods: {
        async addToCart(product) {
            const cart = this.$state.get('shoppingCart', []);
            const existingItem = cart.find(item => item.id === product.id);

            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.push({ ...product, quantity: 1 });
            }

            this.$state.set('shoppingCart', cart);

            // Sync with backend
            await this.$api.post('/api/cart/sync', { items: cart });
        },

        async checkout() {
            const items = this.$state.get('shoppingCart', []);
            try {
                const order = await this.$api.post('/api/orders', { items });
                this.$state.set('shoppingCart', []);
                this.$state.set('lastOrder', order);
                this.navigateTo('order-confirmation', { orderId: order.id });
            } catch (error) {
                this.$toast?.error?.('Checkout failed. Please try again.');
            }
        }
    }
};
```

### Multi-tenant Application

```javascript
// Handle different tenants with state management
export default {
    async mounted() {
        const tenantId = this.$params.tenantId || this.$query.tenant;

        if (tenantId !== this.$state.get('currentTenant')?.id) {
            await this.switchTenant(tenantId);
        }
    },

    methods: {
        async switchTenant(tenantId) {
            try {
                const tenant = await this.$api.get('/api/tenants/{tenantId}', {
                    params: { tenantId }
                });

                // Update global state
                this.$state.update({
                    currentTenant: tenant,
                    userPermissions: tenant.permissions,
                    theme: tenant.branding.theme
                });

                // Update language if tenant has preference
                if (tenant.defaultLanguage) {
                    await this.$i18n.setLanguage(tenant.defaultLanguage);
                }

                // Update API base URL for tenant
                this.$api.setBaseURL(`/api/tenants/${tenantId}`);

            } catch (error) {
                this.navigateTo('tenant-not-found');
            }
        }
    }
};
```

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) for details on:

- Code style and conventions
- Testing requirements
- Pull request process
- Issue reporting guidelines

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Built with ❤️ for the Vue.js community. Special thanks to:

- Vue.js team for the amazing framework
- The open-source community for inspiration and feedback
- All contributors who helped shape ViewLogic Router

---

**ViewLogic Router** - One framework to rule them all! 🚀

*Simplify your Vue development with the power of unified architecture.*