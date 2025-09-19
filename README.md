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

> **Complete Vue 3 Framework**: All-in-one solution for modern web development

## 🎯 Core Philosophy

ViewLogic Router revolutionizes Vue development with two fundamental principles:

### 🎭 View-Logic Separation
**Complete separation between View (presentation) and Logic (business logic)**. Views are pure HTML templates, logic is pure JavaScript components. This separation makes your code more maintainable, testable, and scalable.

### 🚀 Zero Build Development
**Zero build step required in development mode**. Work directly with source files, see changes instantly without any compilation, bundling, or build processes. True real-time development experience.

## ✨ What Makes ViewLogic Special

**All-in-One Solution** - Replace multiple libraries with one unified framework:
- 🔀 **Routing** - File-based routing with zero configuration
- 📦 **State Management** - Built-in reactive state without external dependencies
- 🔐 **Authentication** - JWT auth with multiple storage options
- 🌐 **Internationalization** - Multi-language support with lazy loading
- 💾 **Caching** - Smart caching with TTL and LRU eviction
- 🌐 **API Client** - HTTP client with automatic token injection
- 📝 **Form Handling** - Revolutionary form processing with parameter substitution

**Tiny Bundle Size** - Complete framework in just **51KB minified / 17KB gzipped**!

**Easy Integration** - Drop-in UMD build available for instant usage without build tools.

## 🏗️ Project Structure

ViewLogic Router follows a clean, intuitive folder structure:

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
│   └── styles/             # Page-specific CSS files
│       ├── home.css
│       └── user-profile.css
├── css/                    # Global CSS files
│   └── base.css            # Base styles
├── js/                     # JavaScript library files
│   ├── viewlogic-router.js     # Development version
│   ├── viewlogic-router.min.js # Minified version
│   └── viewlogic-router.umd.js # UMD bundle
├── i18n/                   # Internationalization files
│   ├── en.json            # English translations
│   ├── ko.json            # Korean translations
│   └── ja.json            # Japanese translations
├── routes/                 # Auto-generated after building
│   ├── home.js            # Built route bundles
│   ├── user-profile.js
│   └── dashboard.js
├── index.html              # Main entry point
└── package.json
```

## 🚀 Quick Start

### Method 1: Create New Project (Recommended)

```bash
npm create viewlogic myapp
cd myapp
npm run dev
```

This creates a complete project with examples and starts the development server.

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
        ViewLogicRouter({
            environment: 'development'
        });
    </script>
</body>
</html>
```

### Method 3: ES6 Modules

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
            environment: 'production',
            authEnabled: true,
            useI18n: true
        });
    </script>
</body>
</html>
```

### Create Your First Route

**src/views/home.html**
```html
<div class="home">
    <h1>{{ message }}</h1>
    <button @click="increment">Click me: {{ count }}</button>
</div>
```

**src/logic/home.js**
```javascript
export default {
    // Optional: specify layout (defaults to 'default')
    layout: 'default',        // Use layouts/default.html
    // layout: 'admin',       // Use layouts/admin.html
    // layout: null,          // No layout (page-only content)

    data() {
        return {
            message: 'Welcome to ViewLogic!',
            count: 0
        };
    },
    methods: {
        increment() {
            this.count++;
        }
    }
};
```

**src/styles/home.css** (optional)
```css
.home {
    padding: 2rem;
    text-align: center;
}

.home h1 {
    color: #2c3e50;
    margin-bottom: 1rem;
}
```

**src/layouts/default.html** (optional)
```html
<header class="navbar">
    <h1>My App</h1>
    <nav>
        <a href="#/home">Home</a>
        <a href="#/about">About</a>
    </nav>
</header>

<main class="main-content">
    <div class="container">
        {{ content }}
    </div>
</main>

<footer>
    <p>&copy; 2024 My ViewLogic App</p>
</footer>
```

### Query Parameter Example

**src/views/user-profile.html**
```html
<div class="user-profile">
    <h1>User Profile</h1>
    <p>User ID: {{ userId }}</p>
    <p>Tab: {{ activeTab }}</p>
    <button @click="switchTab('settings')">Settings</button>
    <button @click="switchTab('posts')">Posts</button>
</div>
```

**src/logic/user-profile.js**
```javascript
export default {
    computed: {
        userId() {
            return this.getParam('userId', 'No ID');
        },
        activeTab() {
            return this.getParam('tab', 'profile');
        }
    },
    methods: {
        switchTab(tab) {
            // Navigate with query parameters
            this.navigateTo('user-profile', {
                userId: this.userId,
                tab: tab
            });
        }
    }
};
```

**Usage:** Navigate to `/user-profile?userId=123&tab=settings` or `#/user-profile?userId=123&tab=settings` (hash mode)

**Multiple ways to access parameters:**
```javascript
// Direct parameter access
const userId = this.$params.userId;        // Route parameter (direct access)
const tab = this.$query.tab;               // Query parameter (direct access)
const search = this.getParam('search');    // Either route or query param
const allParams = this.getParams();        // Get all parameters

// With default values
const page = this.getParam('page', 1);     // Default to 1 if not found
const sort = this.$query.sort || 'asc';    // Manual default for query params
```

### Reusable Components

ViewLogic automatically loads components from the `components/` folder:

**src/components/UserCard.js**
```javascript
export default {
    name: 'UserCard',
    template: `
        <div class="user-card">
            <img :src="user.avatar" :alt="user.name" class="avatar">
            <div class="info">
                <h3>{{ user.name }}</h3>
                <p>{{ user.email }}</p>
                <button @click="$emit('edit', user)" class="btn-edit">
                    Edit User
                </button>
            </div>
        </div>
    `,
    emits: ['edit'],
    props: {
        user: {
            type: Object,
            required: true
        }
    }
};
```

**Using components in views:**

**src/views/users.html**
```html
<div class="users-page">
    <h1>Users</h1>
    <UserCard
        v-for="user in users"
        :key="user.id"
        :user="user"
        @edit="editUser"
    />
</div>
```

**src/logic/users.js**
```javascript
export default {
    data() {
        return {
            users: []
        };
    },
    methods: {
        editUser(user) {
            this.navigateTo('user-edit', { userId: user.id });
        }
    }
};
```

**Dynamic Component Loading:**
- Just add `.js` files to `src/components/` folder
- Components are automatically discovered and loaded
- No import statements needed - ViewLogic handles everything
- Components are available instantly in all views

## 🎯 Core APIs

### State Management

Built-in reactive state management system:

```javascript
// Set state (any component can access)
this.$state.set('user', { name: 'John', age: 30 });
this.$state.set('theme', 'dark');

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
    // Update component data to trigger reactivity
    this.currentUser = newValue;
});

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

Complete authentication management:

```javascript
// Check authentication status
if (this.isAuth()) {
    console.log('User is logged in');
}

// Login with token
this.setToken('jwt-token-here');

// Login with options
this.setToken('jwt-token', {
    storage: 'localStorage'   // 'localStorage', 'sessionStorage', 'cookie'
});

// Get current token
const token = this.getToken();

// Logout (clears token and redirects to login)
this.logout();
```

### API Management

Built-in HTTP client with automatic token injection:

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
    },

    methods: {
        // Manual data refresh - reuses dataURL configuration
        async refreshData() {
            await this.fetchData();
            // All dataURL endpoints are called again
        },

        // Refresh when filters change
        async applyFilter(filterType) {
            this.$query.filter = filterType;
            await this.fetchData(); // Refetch with new filter parameter
        },

        // Refresh when user changes
        async switchUser(newUserId) {
            this.$params.userId = newUserId;
            await this.fetchData(); // Refetch with new userId parameter
        },

        // Pagination
        async changePage(page) {
            this.$query.page = page;
            await this.fetchData(); // Load new page data
        },

        // Custom data loading
        async loadSpecificData() {
            const customData = await this.fetchData({
                profile: '/api/admin/profile',
                stats: '/api/stats?period={period}'
            });
            // Override default dataURL temporarily
        }
    }
};
```

### Internationalization

Comprehensive i18n system:

```javascript
// Simple translation
const message = this.$t('welcome.message');

// With parameters
const greeting = this.$t('hello.user', { name: 'John', role: 'admin' });

// Nested keys
const errorMsg = this.$t('errors.validation.email.required');

// Check current language
const currentLang = this.getLanguage();

// Change language (automatically reloads interface)
await this.setLanguage('ko');
```

### Logging & Error Handling

Built-in logging system for debugging and error tracking:

```javascript
export default {
    async mounted() {
        this.log('info', 'Component mounted successfully');
    },

    methods: {
        async handleUserAction() {
            this.log('debug', 'User action started', { action: 'submit' });

            try {
                const result = await this.$api.post('/api/users', userData);
                this.log('info', 'User created successfully', result);
            } catch (error) {
                this.log('error', 'Failed to create user:', error);
            }
        },

        async loadData() {
            this.log('debug', 'Loading user data...');

            try {
                const data = await this.fetchData();
                this.log('info', 'Data loaded', { count: data.length });
            } catch (error) {
                this.log('warn', 'Data loading failed, using cache', error);
            }
        }
    }
};
```

**Log Levels:**
- `debug` - Development debugging information
- `info` - General information and success messages
- `warn` - Warning messages for recoverable issues
- `error` - Error messages for failures

All logs include the component name automatically: `[routeName] Your message`

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

```


### Form Handling

Revolutionary automatic form processing with parameter substitution:

```html
<!-- Basic form - automatically handled on submit -->
<form action="/api/users" method="POST"
      data-success="onUserCreated"
      data-error="onUserError"
      data-loading="setLoading">
    <input name="name" v-model="userData.name" required>
    <input name="email" v-model="userData.email" type="email" required>
    <button type="submit">Create User</button>
</form>

<!-- Form with parameter substitution -->
<form action="/api/users/{userId}" method="PUT"
      data-success="onUserUpdated"
      data-redirect="user-profile">
    <input name="name" v-model="user.name">
    <input name="email" v-model="user.email">
    <button type="submit">Update User</button>
</form>

<!-- File upload form -->
<form action="/api/upload" method="POST" enctype="multipart/form-data"
      data-success="onFileUploaded">
    <input name="avatar" type="file" accept="image/*">
    <input name="description" v-model="description">
    <button type="submit">Upload</button>
</form>

<!-- Form with custom validation -->
<form action="/api/contact" method="POST">
    <input name="email" type="email" data-validation="validateEmail" required>
    <textarea name="message" data-validation="validateMessage" required></textarea>
    <button type="submit">Send Message</button>
</form>
```

```javascript
// Component logic with form handlers
export default {
    data() {
        return {
            userData: { name: '', email: '' },
            user: { name: 'John', email: 'john@example.com' },
            loading: false
        };
    },
    methods: {
        // Success handlers
        onUserCreated(response, form) {
            this.$state.set('newUser', response);
            this.navigateTo('user-profile', { userId: response.id });
        },

        onUserUpdated(response, form) {
            this.$state.set('currentUser', response);
            // Auto redirect via data-redirect="user-profile"
        },

        onFileUploaded(response, form) {
            this.$state.set('uploadedFile', response.file);
        },

        // Error handler
        onUserError(error, form) {
            console.error('User operation failed:', error);
        },

        // Loading handler
        setLoading(isLoading, form) {
            this.loading = isLoading;
        },

        // Custom validation functions
        validateEmail(value, input) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(value);
        },

        validateMessage(value, input) {
            return value.length >= 10;
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
    i18nPath: '/i18n',                  // Path to language files

    // Caching system
    cacheMode: 'memory',                // Memory caching only
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
    checkAuthFunction: async (route) => {
        try {
            // Use ViewLogic APIs like in components
            const userData = await route.$api.get('/api/auth/verify');
            route.$state.set('currentUser', userData);
            return true;
        } catch (error) {
            console.error('Auth verification failed:', error);
            return false;
        }
    }
});
```

## 🔧 Production Build

```bash
# Development mode (zero build)
npm run dev

# Production build with optimization
npm run build

# Preview production build
npm run serve
```

### Production Optimizations

ViewLogic Router automatically optimizes for production:

- **Code splitting**: Each route becomes a separate bundle
- **Tree shaking**: Unused features are eliminated
- **Minification**: Code is compressed and optimized
- **Caching**: Aggressive caching for static assets
- **Lazy loading**: Routes and components load on demand


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