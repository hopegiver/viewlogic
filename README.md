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

> A revolutionary Vue 3 routing system with clear separation of View and Logic, enabling real-time development without build steps

## 🎯 Core Philosophy: View-Logic Separation

ViewLogic Router revolutionizes Vue development by clearly separating **View** (presentation) from **Logic** (business logic), making your code more maintainable, testable, and scalable.

## ✨ Features

- 🎭 **View-Logic Separation** - Clear separation between presentation and business logic
- 🚀 **Zero Build Development** - Work in real-time without any build step in development mode
- ⚡ **Optimized Production** - Pre-built individual route bundles for lightning-fast production
- 📁 **Intuitive Structure** - Organized folder structure for views, logic, styles, layouts, and components
- 🔄 **Hot Development** - See changes instantly without compilation
- 📦 **Smart Production Build** - Each route becomes an optimized JavaScript bundle
- 🛠️ **Built-in Components** - Preloaded UI components
- 🌐 **i18n Ready** - Built-in internationalization support
- 🔐 **Authentication** - Built-in auth management system
- 💾 **Smart Caching** - Intelligent route and component caching

## 📦 Installation

```bash
npm install viewlogic
# or
yarn add viewlogic
# or
pnpm add viewlogic
```

## 🚀 Quick Start

### Development Mode (No Build Required!)

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>My ViewLogic App - Development</title>
    <link rel="stylesheet" href="/css/base.css">
</head>
<body>
    <div id="app"></div>
    
    <!-- Vue 3 (development version) -->
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
    
    <!-- ViewLogic Router (from local or CDN) -->
    <script src="/js/viewlogic-router.js"></script>
    <!-- Or from CDN: -->
    <!-- <script src="https://cdn.jsdelivr.net/npm/viewlogic/dist/viewlogic-router.js"></script> -->
    
    <script>
        // Development mode - loads files directly from src/
        ViewLogicRouter({
            environment: 'development',
        }).then(router => {
            console.log('Development router ready!');
            // Router automatically combines view + logic + style on the fly
        });
    </script>
</body>
</html>
```

### Production Mode (Optimized Bundles)

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>My ViewLogic App</title>
    <link rel="stylesheet" href="/css/base.css">
</head>
<body>
    <div id="app"></div>
    
    <!-- Vue 3 (production version) -->
    <script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>
    
    <!-- ViewLogic Router (from CDN or local) -->
    <script src="https://cdn.jsdelivr.net/npm/viewlogic/dist/viewlogic-router.min.js"></script>
    <!-- Or from local: -->
    <!-- <script src="/js/viewlogic-router.min.js"></script> -->
    
    <script>
        // Production mode - loads pre-built bundles from routes/
        ViewLogicRouter({
            environment: 'production',
            basePath: '/',              // Root path (no src/ in production)
            routesPath: '/routes',      // Pre-built route bundles
            i18nPath: '/i18n',         // Top-level i18n
            cacheMode: 'session',       // Enable caching
            useI18n: true,
            logLevel: 'error'          // Only log errors
        }).then(router => {
            console.log('Production router ready!');
        });
    </script>
</body>
</html>
```

### ES6 Module Usage

```javascript
import { ViewLogicRouter } from 'viewlogic/dist/viewlogic-router.js';

// Create router instance
const router = new ViewLogicRouter({
    basePath: '/src',
    mode: 'hash', // or 'history'
    cacheMode: 'memory',
    useLayout: true,
    defaultLayout: 'default',
    useComponents: true,
    useI18n: true,
    defaultLanguage: 'ko'
});

// Router will automatically initialize and handle routing
```

### CommonJS/Node.js Usage

```javascript
const { createRouter } = require('viewlogic/dist/viewlogic-router.umd.js');

createRouter({
    basePath: './src',
    environment: 'development'
}).then(router => {
    console.log('Router ready');
});
```

## 📁 Project Structure

### Development Mode Structure
```
my-app/
├── index.html
├── i18n/                # Language files (top-level)
│   ├── ko.json
│   └── en.json
├── css/                 # Global styles
│   └── base.css        # Base styles for entire site
├── js/                  # System files (optional, can use CDN)
│   ├── viewlogic-router.js
│   └── viewlogic-router.min.js
├── src/                 # Source files (not deployed)
│   ├── views/          # View templates (HTML)
│   │   ├── home.html
│   │   ├── about.html
│   │   └── products/
│   │       ├── list.html
│   │       └── detail.html
│   ├── logic/          # Business logic (JavaScript)
│   │   ├── home.js
│   │   ├── about.js
│   │   └── products/
│   │       ├── list.js
│   │       └── detail.js
│   ├── styles/         # Page-specific CSS
│   │   ├── home.css
│   │   ├── about.css
│   │   └── products/
│   │       ├── list.css
│   │       └── detail.css
│   ├── layouts/        # Layout templates
│   │   ├── default.html
│   │   └── admin.html
│   └── components/     # Reusable components
│       ├── Button.js
│       ├── Modal.js
│       └── Card.js
└── package.json
```

### Production Deployment Structure
```
my-app/
├── index.html
├── i18n/               # Language files
│   ├── ko.json
│   └── en.json
├── css/                # Global styles
│   └── base.css
├── js/                 # Router system (or use CDN)
│   ├── viewlogic-router.umd.js
│   └── viewlogic-router.min.js
├── routes/             # Built & optimized route bundles
│   ├── home.js        # Combined view + logic + style
│   ├── about.js    
│   └── products/
│       ├── list.js
│       └── detail.js
└── assets/            # Static assets
    ├── images/
    └── fonts/

Note: src/ folder is excluded from production deployment
```

## 🔧 Configuration Options

```javascript
const config = {
    // Basic Configuration
    basePath: '/src',           // Base path for all resources
    mode: 'hash',              // 'hash' or 'history'
    environment: 'development', // 'development' or 'production'
    
    // Routing
    routesPath: '/routes',      // Routes directory path
    defaultLayout: 'default',   // Default layout name
    useLayout: true,           // Enable layouts
    
    // Caching
    cacheMode: 'memory',       // 'memory' or 'session' or 'none'
    cacheTTL: 300000,         // Cache TTL in milliseconds
    maxCacheSize: 50,         // Maximum cache entries
    
    // Components
    useComponents: true,       // Enable built-in components
    componentNames: [          // Components to preload
        'Button', 'Modal', 'Card', 'Toast', 
        'Input', 'Tabs', 'Checkbox', 'Alert'
    ],
    
    // Internationalization
    useI18n: true,            // Enable i18n
    defaultLanguage: 'ko',    // Default language
    
    // Authentication
    authEnabled: false,       // Enable authentication
    loginRoute: 'login',      // Login route name
    protectedRoutes: [],      // Protected route names
    publicRoutes: ['login', 'register', 'home'],
    authStorage: 'cookie',    // 'cookie' or 'localStorage'
    
    // Security
    enableParameterValidation: true,
    maxParameterLength: 1000,
    maxParameterCount: 50,
    
    // Development
    logLevel: 'info',         // 'debug', 'info', 'warn', 'error'
    enableErrorReporting: true
};
```

## 📖 API Reference

### Router Instance Methods

```javascript
// Navigation
router.navigateTo('routeName', { param: 'value' });
router.navigateTo({ route: 'products', params: { id: 123 } });

// Get current route
const currentRoute = router.getCurrentRoute();

// Query parameters
router.queryManager.setQueryParams({ page: 2, sort: 'asc' });
const params = router.queryManager.getQueryParams();
router.queryManager.removeQueryParams(['sort']);

// Authentication (if enabled)
router.authManager.login(token);
router.authManager.logout();
const isAuth = router.authManager.isAuthenticated();

// Internationalization (if enabled)
router.i18nManager.setLanguage('en');
const t = router.i18nManager.translate('welcome.message');

// Cache management
router.cacheManager.clearAll();

// Cleanup
router.destroy();
```

### Global Access

After initialization, the router is available globally:

```javascript
// UMD build automatically sets window.router
window.router.navigateTo('about');

// Also available as
window.createRouter(config);
window.ViewLogicRouter(config);
```

## 🎯 View-Logic Separation Example

### Development Mode (Separated Files)

#### View File (src/views/products/list.html)
```html
<div class="products-page">
    <h1>{{ title }}</h1>
    <div class="product-grid">
        <div v-for="product in products" :key="product.id" class="product-card">
            <img :src="product.image" :alt="product.name">
            <h3>{{ product.name }}</h3>
            <p class="price">{{ formatPrice(product.price) }}</p>
            <button @click="viewDetail(product.id)">View Detail</button>
        </div>
    </div>
</div>
```

#### Logic File (src/logic/products/list.js)
```javascript
export default {
    name: 'ProductsList',
    data() {
        return {
            title: 'Our Products',
            products: []
        };
    },
    async mounted() {
        this.products = await this.loadProducts();
    },
    methods: {
        async loadProducts() {
            const response = await fetch('/api/products');
            return response.json();
        },
        formatPrice(price) {
            return new Intl.NumberFormat('ko-KR', {
                style: 'currency',
                currency: 'KRW'
            }).format(price);
        },
        viewDetail(id) {
            this.$router.navigateTo('products/detail', { id });
        }
    }
};
```

#### Style File (src/styles/products/list.css)
```css
.products-page {
    padding: 20px;
}

.product-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 20px;
}

.product-card {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 15px;
    transition: transform 0.2s;
}

.product-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.price {
    font-weight: bold;
    color: #2196F3;
}
```

### Production Mode (Built Bundle)

After build, these files are automatically combined into a single optimized bundle:

```javascript
// routes/products/list.js (Auto-generated)
export default {
    name: 'ProductsList',
    template: `<div class="products-page">...`, // View injected
    _style: `.products-page { ... }`,            // Style injected
    // ... logic code
}
```

## 🔄 Development vs Production Mode

### Development Mode Benefits
- **No Build Required**: Edit files and refresh browser to see changes
- **Clear Separation**: View, Logic, and Style in separate files for better organization
- **Easy Debugging**: Source maps and unminified code
- **Real-time Updates**: Changes reflect immediately without compilation

### Production Mode Benefits
- **Optimized Bundles**: Each route is a single, minified JavaScript file
- **Faster Loading**: Pre-built bundles eliminate compilation overhead
- **Reduced Requests**: Combined view + logic + style in one file
- **CDN Ready**: Individual route files can be cached and served from CDN

### Automatic Environment Detection

```javascript
// Development Mode (loads from src/)
ViewLogicRouter({ 
    environment: 'development',
});

// Production Mode (loads from dist/routes/)
ViewLogicRouter({ 
    environment: 'production',
});
```

## 🛡️ Error Handling

The router includes comprehensive error handling:

```javascript
// Global error handler
router.errorHandler.log('error', 'Custom error message');

// Route error handling
router.errorHandler.handleRouteError('routeName', error);

// 404 handling is automatic
```

## 🚀 Production Deployment

### 1. Build your routes for production:
```bash
npm run build
# This will:
# - Combine view + logic + style files from src/
# - Generate optimized route bundles in routes/ folder
# - Minify and optimize each route
# - Copy routes/ to root level for deployment
```

### 2. Deploy with production configuration:
```html
<!DOCTYPE html>
<html>
<head>
    <title>My ViewLogic App</title>
    <link rel="stylesheet" href="/css/base.css">
</head>
<body>
    <div id="app"></div>
    
    <!-- Vue 3 Production -->
    <script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>
    
    <!-- ViewLogic Router from CDN -->
    <script src="https://cdn.jsdelivr.net/npm/viewlogic/dist/viewlogic-router.umd.js"></script>
    
    <script>
        ViewLogicRouter({ 
            environment: 'production',
            basePath: '/',          // Root path
            routesPath: '/routes',  // Routes folder at root level
            i18nPath: '/i18n',     // i18n folder at root level
            cacheMode: 'session',   // Enable session caching
            useComponents: true,
            useI18n: true
        });
    </script>
</body>
</html>
```

### 3. Production deployment structure:
```
production/
├── index.html
├── i18n/                   # Language files
│   ├── ko.json
│   └── en.json
├── css/
│   └── base.css           # Global styles
├── js/                    # Optional (can use CDN instead)
│   ├── viewlogic-router.umd.js
│   └── viewlogic-router.min.js
├── routes/                # Built route bundles
│   ├── home.js           # Bundled: view + logic + style
│   ├── about.js
│   └── products/
│       ├── list.js
│       └── detail.js
└── assets/
    ├── images/
    └── fonts/

# Note: src/ folder is NOT deployed to production
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Author

Created by [hopegiver](https://github.com/hopegiver)

## 📞 Support

- 🐛 Issues: [GitHub Issues](https://github.com/hopegiver/viewlogic/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/hopegiver/viewlogic/discussions)

---

<p align="center">Made with ❤️ for the Vue.js community</p>