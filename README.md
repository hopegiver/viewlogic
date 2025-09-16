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

> A revolutionary Vue 3 routing system with View-Logic separation and Zero Build Development

## 🎯 Core Philosophy: Simplicity Through Design

ViewLogic Router revolutionizes Vue development with two fundamental core principles:

### 🎭 View-Logic Separation
**Complete separation between View (presentation) and Logic (business logic)**. Views are pure HTML templates, logic is pure JavaScript components, making your code more maintainable, testable, and scalable.

### 🚀 Zero Build Development
**Zero build step required in development mode**. Work directly with source files, see changes instantly without any compilation, bundling, or build processes. True real-time development experience.

## ✨ Key Features

- 🚀 **Ultra-Lightweight** - Complete routing system in just 15.5KB gzipped (56KB minified) with zero dependencies
- 🔄 **Multiple API Support** - Parallel data fetching from multiple APIs with named data storage  
- 📝 **Automatic Form Handling** - Revolutionary form submission with `{paramName}` variable parameters
- 🛠️ **Built-in Components** - Preloaded UI components including revolutionary DynamicInclude & HtmlInclude
- 🔗 **Query-Based Parameter System** - Simple query-only parameters (`/users?id=123`) instead of complex path parameters
- ⚡ **Optimized Production** - Pre-built individual route bundles for lightning-fast production
- 📁 **Intuitive Structure** - Organized folder structure for views, logic, styles, layouts, and components
- 💾 **Smart Caching** - Intelligent route and component caching
- 🔐 **Authentication** - Built-in auth management system
- 🌐 **i18n Ready** - Built-in internationalization support

### What's Included
- ✅ Complete routing system with hash/history mode
- ✅ Advanced caching with TTL and size limits  
- ✅ Built-in authentication with multiple storage options
- ✅ Internationalization system with lazy loading
- ✅ Form handling with automatic validation
- ✅ RESTful API client with parameter substitution
- ✅ Component loading and management
- ✅ Error handling and logging system
- ✅ Query parameter management and validation
- ✅ Layout system with slot-based composition

### Zero Dependencies
ViewLogic Router has **zero runtime dependencies** - it's completely self-contained. You only need Vue 3 as a peer dependency, which you're likely already using.

```javascript
// No additional imports needed
import { ViewLogicRouter } from 'viewlogic';

// Everything works out of the box
const router = new ViewLogicRouter();
router.mount('#app');
```

### Performance Benefits
- 🚀 **Fast Loading**: Minimal JavaScript payload means faster page loads
- ⚡ **Quick Parsing**: Less JavaScript to parse and compile
- 💾 **Memory Efficient**: Lower memory footprint for better performance
- 📱 **Mobile Optimized**: Perfect for mobile and low-bandwidth environments

## 📦 Installation

### Quick Start (Recommended)

Create a new ViewLogic project with our complete template:

```bash
npm create viewlogic my-app
cd my-app
# Ready to go! No additional setup needed
```

### Alternative: Clone Template Repository

You can also clone the [viewlogic-template](https://github.com/hopegiver/viewlogic-template) repository directly:

```bash
git clone https://github.com/hopegiver/viewlogic-template.git my-app
cd my-app
npm install
npm run dev
```

The template repository includes:
- Complete project structure with examples
- Pre-configured development environment
- Sample views, logic, and components
- Ready-to-use layouts and styles
- Development and build scripts

### Manual Installation

Or install just the router package:
```bash
npm install viewlogic
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
    <script src="https://cdn.jsdelivr.net/npm/vue@3/dist/vue.global.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/viewlogic/dist/viewlogic-router.umd.js"></script>
    
    <script>
        // Development mode - loads files directly from src/
        ViewLogicRouter({
            environment: 'development',
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
    <script src="https://cdn.jsdelivr.net/npm/vue@3/dist/vue.global.prod.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/viewlogic/dist/viewlogic-router.umd.js"></script>
    
    <script>
        // Production mode - loads pre-built bundles from routes/
        ViewLogicRouter({
            environment: 'production',
            useI18n: true,
            logLevel: 'error'          // Only log errors
        });
    </script>
</body>
</html>
```

### ES6 Module Usage

```javascript
import { ViewLogicRouter } from 'js/viewlogic-router.js';

// Create router instance
const router = new ViewLogicRouter({
    environment: 'development'
});

// Router will automatically initialize and handle routing
```

### CommonJS/Node.js Usage

```javascript
const { createRouter } = require('js/viewlogic-router.umd.js');

createRouter({
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
│   ├── viewlogic-router.min.js
│   └── viewlogic-router.umd.js
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
    basePath: '/',                  // Application base path (for subfolder deployments)
    srcPath: '/src',               // Source files path (development mode)
    routesPath: '/routes',         // Routes directory path (production mode)
    mode: 'hash',                  // 'hash' or 'history'
    environment: 'development',     // 'development' or 'production'
    
    // Routing & Layout
    useLayout: true,               // Enable layout system
    defaultLayout: 'default',      // Default layout name
    
    // Caching System
    cacheMode: 'memory',           // 'memory', 'session', or 'none'
    cacheTTL: 300000,             // Cache TTL in milliseconds (5 minutes)
    maxCacheSize: 50,             // Maximum cache entries
    
    // Internationalization
    useI18n: false,               // Enable i18n support
    defaultLanguage: 'ko',        // Default language
    i18nPath: '/i18n',           // i18n files path
    
    // Authentication System
    authEnabled: false,                    // Enable authentication
    loginRoute: 'login',                   // Login route name
    redirectAfterLogin: 'home',            // Route after successful login
    protectedRoutes: [],                   // Array of protected route names
    protectedPrefixes: [],                 // Array of protected route prefixes
    publicRoutes: ['login', 'register', 'home'], // Public routes (bypass auth)
    checkAuthFunction: null,               // Custom auth validation function
    authStorage: 'cookie',                 // 'cookie' or 'localStorage'
    authCookieName: 'authToken',          // Primary auth cookie name
    authFallbackCookieNames: [            // Fallback cookie names to check
        'accessToken', 'token', 'jwt'
    ],
    authCookieOptions: {},                // Custom cookie options
    authSkipValidation: false,            // Skip auth validation entirely
    
    // Security & Validation
    enableParameterValidation: true,       // Enable parameter validation
    maxParameterLength: 1000,             // Max length per parameter
    maxParameterCount: 50,                // Max number of parameters
    maxArraySize: 100,                    // Max array size in parameters
    allowedKeyPattern: /^[a-zA-Z0-9_-]+$/, // Allowed parameter key pattern
    logSecurityWarnings: true,             // Log security-related warnings
    
    // Development & Debugging
    logLevel: 'info',                     // 'debug', 'info', 'warn', 'error'
    enableErrorReporting: true,           // Enable error reporting system
    version: '1.0.0'                      // Application version
};
```

### 🏗️ Subfolder Deployment Support

ViewLogic Router supports deployment in subfolders with smart path resolution:

```javascript
// Root deployment: https://example.com/
ViewLogicRouter({
    basePath: '/src',           // → https://example.com/src
    routesPath: '/routes',      // → https://example.com/routes
    i18nPath: '/i18n'          // → https://example.com/i18n
});

// Subfolder deployment: https://example.com/myapp/
ViewLogicRouter({
    basePath: 'src',            // → https://example.com/myapp/src (relative)
    routesPath: 'routes',       // → https://example.com/myapp/routes (relative)
    i18nPath: 'i18n',          // → https://example.com/myapp/i18n (relative)
});

// Mixed paths: https://example.com/projects/myapp/
ViewLogicRouter({
    basePath: './src',          // → https://example.com/projects/myapp/src
    routesPath: '../shared/routes', // → https://example.com/projects/shared/routes  
    i18nPath: '/global/i18n'    // → https://example.com/global/i18n (absolute)
});
```

**Path Resolution Rules:**
- **Absolute paths** (`/path`) → `https://domain.com/path`
- **Relative paths** (`path`, `./path`) → Resolved from current page location
- **Parent paths** (`../path`) → Navigate up directory levels
- **HTTP URLs** → Used as-is (no processing)

### 🔄 Hash vs History Mode in Subfolders

Both routing modes work seamlessly in subfolder deployments:

```javascript
// Hash Mode (recommended for subfolders)
// URL: https://example.com/myapp/#/products?id=123
ViewLogicRouter({ 
    mode: 'hash'           // Works anywhere, no server config needed
});

// History Mode (requires server configuration)
// URL: https://example.com/myapp/products?id=123  
ViewLogicRouter({ 
    mode: 'history'        // Cleaner URLs, needs server setup
});
```

**History Mode Server Configuration:**
```nginx
# Nginx - redirect all subfolder requests to index.html
location /myapp/ {
    try_files $uri $uri/ /myapp/index.html;
}
```

```apache
# Apache .htaccess in /myapp/ folder
RewriteEngine On
RewriteBase /myapp/
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /myapp/index.html [L]
```

## 📖 Complete API Documentation

For comprehensive API documentation including all methods, configuration options, and detailed examples, see:

**📚 [Complete API Reference →](./docs/index.md)**

### Quick API Overview

```javascript
// Basic router usage
const router = new ViewLogicRouter({ environment: 'development' });
router.navigateTo('products', { id: 123, category: 'electronics' });
const current = router.getCurrentRoute();

// In route components - global methods automatically available:
export default {
    dataURL: '/api/products', // Auto-fetch data
    async mounted() {
        const id = this.getParam('id');           // Get parameter
        this.navigateTo('detail', { id });        // Navigate
        console.log('Data loaded:', this.products); // From dataURL
        
        // New $api pattern for RESTful API calls
        const user = await this.$api.get('/api/users/{userId}');
        await this.$api.post('/api/analytics', { pageView: 'products' });
        
        if (this.$isAuthenticated()) { /* auth check */ }
        const text = this.$t('welcome.message');   // i18n
    }
};
```

### Key Global Methods (Auto-available in all route components)
- **Navigation**: `navigateTo()`, `getCurrentRoute()`
- **Parameters**: `getParams()`, `getParam(key, defaultValue)`
- **Data Fetching**: `$fetchData()` (with dataURL), `$api.get()`, `$api.post()`, `$api.put()`, `$api.patch()`, `$api.delete()`
- **Authentication**: `$isAuthenticated()`, `$getToken()`, `$logout()`
- **Forms**: Auto-binding with `action` attribute, duplicate prevention, validation
- **i18n**: `$t(key, params)` for translations


## 🚀 Revolutionary Built-in Components

ViewLogic Router includes groundbreaking components that revolutionize how you handle dynamic content:

### DynamicInclude Component
```html
<!-- Dynamically load content from any URL -->
<DynamicInclude 
    page="login" 
    :use-cache="false"
    loading-text="로그인 페이지 로딩 중..."
    wrapper-class="test-dynamic-include"
    :params="{ 
        returnUrl: '/dashboard', 
        showWelcome: true,
        theme: 'compact',
        testMode: true
    }"
/>
```

**Features:**
- **Dynamic URL Loading** - Load content from any REST API or URL
- **Parameter Injection** - Pass dynamic parameters to the URL
- **Event Handling** - React to loading states and errors
- **Slot Support** - Custom loading and error templates
- **Cache Integration** - Automatic caching with TTL support

### HtmlInclude Component
```html
<!-- Include raw HTML content with Vue reactivity -->
<HtmlInclude 
    src="/src/views/404.html"
    :sanitize="true"
    :use-cache="false"
    loading-text="위젯 로딩 중..."
    wrapper-class="test-html-include"
/>
```

**Features:**
- **Raw HTML Rendering** - Safely render dynamic HTML content
- **XSS Protection** - Built-in HTML sanitization
- **Vue Integration** - HTML content works with Vue reactivity
- **Fallback Support** - Default content when HTML is unavailable
- **Script Execution** - Optional JavaScript execution in HTML content

### Automatic Data Fetching with dataURL

ViewLogic Router includes revolutionary automatic data fetching that eliminates manual API calls in component lifecycle hooks.

#### Single API (Simple Usage)
```javascript
// src/logic/products/list.js
export default {
    name: 'ProductsList',
    dataURL: '/api/products',  // ✨ Magic happens here!
    data() {
        return {
            title: 'Our Products'
            // products: [] - No need to declare, auto-populated from API
        };
    },
    mounted() {
        // Data is already fetched and available!
        console.log('Products loaded:', this.products);
        console.log('Loading state:', this.$dataLoading);
    },
    methods: {
        async refreshData() {
            // Manual refresh if needed
            await this.$fetchData();
        }
    }
};
```

#### Multiple APIs (Advanced Usage) - 🆕 Revolutionary!
```javascript
// src/logic/dashboard/main.js
export default {
    name: 'DashboardMain',
    dataURL: {
        products: '/api/products',
        categories: '/api/categories', 
        stats: '/api/dashboard/stats',
        user: '/api/user/profile'
    },  // ✨ Multiple APIs with named data!
    data() {
        return {
            title: 'Dashboard'
            // products: [], categories: [], stats: {}, user: {}
            // All auto-populated from respective APIs!
        };
    },
    mounted() {
        // All APIs called in parallel, data available by name!
        console.log('Products:', this.products);
        console.log('Categories:', this.categories);
        console.log('Stats:', this.stats);
        console.log('User:', this.user);
        console.log('Loading state:', this.$dataLoading);
    },
    methods: {
        async refreshProducts() {
            // Refresh specific API only
            await this.$fetchData('products');
        },
        async refreshStats() {
            // Refresh specific API only
            await this.$fetchData('stats');
        },
        async refreshAllData() {
            // Refresh all APIs
            await this.$fetchAllData();
        }
    }
};
```

**Features:**
- **Zero-Config API Calls** - Just define `dataURL` and data is automatically fetched
- **🆕 Multiple API Support** - Define multiple APIs with custom names
- **🚀 Parallel Processing** - Multiple APIs called simultaneously for best performance
- **🎯 Selective Refresh** - Refresh specific APIs independently
- **Query Parameter Integration** - Current route parameters are automatically sent to all APIs
- **Loading State Management** - `$dataLoading` property automatically managed
- **Advanced Error Handling** - Per-API error handling with detailed events
- **Named Data Storage** - Each API result stored with its defined name
- **Event Support** - `@data-loaded` and `@data-error` events with detailed info


### Basic API Usage

```javascript
// src/logic/user-profile.js
export default {
    name: 'UserProfile',
    
    async mounted() {
        try {
            // GET request with automatic parameter substitution
            const user = await this.$api.get('/api/users/{userId}');
            
            // POST request with data
            const response = await this.$api.post('/api/users/{userId}/posts', {
                title: 'New Post',
                content: 'Post content here'
            });
            
            // PUT request for updates
            await this.$api.put('/api/users/{userId}', {
                name: user.name,
                email: user.email
            });
            
            // DELETE request
            await this.$api.delete('/api/posts/{postId}');
            
        } catch (error) {
            console.error('API call failed:', error);
            this.handleError(error);
        }
    }
};
```

### Advanced API Features

```javascript
export default {
    methods: {
        async handleUserActions() {
            // With custom headers
            const data = await this.$api.get('/api/protected-data', {
                headers: { 'X-Custom-Header': 'value' }
            });
            
            // File upload with FormData
            const formData = new FormData();
            formData.append('file', this.selectedFile);
            await this.$api.post('/api/upload', formData);
            
            // With query parameters (automatically added from current route)
            // URL: /users?id=123 → API call includes ?id=123
            const result = await this.$api.get('/api/user-data');
        },
        
        // Error handling patterns
        async safeApiCall() {
            try {
                const user = await this.$api.get('/api/users/{userId}');
                this.user = user;
                
            } catch (error) {
                if (error.message.includes('404')) {
                    this.showError('User not found');
                } else if (error.message.includes('401')) {
                    this.navigateTo('login');
                } else {
                    this.showError('Something went wrong');
                }
            }
        }
    }
};
```

### Key $api Features

- **🎯 Parameter Substitution**: `{userId}` automatically replaced with component data or route params
- **🔐 Auto Authentication**: Authorization headers automatically added when token is available  
- **📄 Smart Data Handling**: JSON and FormData automatically detected and processed
- **🔗 Query Integration**: Current route query parameters automatically included
- **⚡ Error Standardization**: Consistent error format across all API calls
- **🚀 RESTful Pattern**: Clean `get()`, `post()`, `put()`, `patch()`, `delete()` methods

## 📝 Advanced Form Handling with Smart Features

ViewLogic Router includes revolutionary automatic form handling with duplicate prevention, validation, and error handling. Just define your forms with `action` attributes and the router handles everything!

### Basic Form Handling

```html
<!-- src/views/contact.html -->
<div class="contact-page">
    <h1>Contact Us</h1>
    <form action="/api/contact" method="POST">
        <input type="text" name="name" required placeholder="Your Name">
        <input type="email" name="email" required placeholder="Your Email">
        <textarea name="message" required placeholder="Your Message"></textarea>
        <button type="submit">Send Message</button>
    </form>
</div>
```

```javascript
// src/logic/contact.js
export default {
    name: 'ContactPage',
    mounted() {
        // Forms are automatically bound with smart features:
        // ✅ Duplicate submission prevention
        // ✅ Automatic validation
        // ✅ Loading state management
        // ✅ Error handling
        console.log('Smart form handling is automatic!');
    }
};
```

### Smart Form Features - 🆕 Enhanced!

ViewLogic FormHandler now includes advanced features for production-ready applications:

```html
<!-- Smart form with all features -->
<form action="/api/users/{userId}/update" method="PUT" 
      class="auto-form"
      data-success-handler="handleSuccess"
      data-error-handler="handleError"
      data-loading-handler="handleLoading"
      data-redirect="/profile">
    
    <input type="text" name="name" required 
           data-validation="validateName">
    <input type="email" name="email" required>
    <button type="submit">Update Profile</button>
</form>
```

```javascript
export default {
    methods: {
        // Custom validation
        validateName(value) {
            return value.length >= 2 && value.length <= 50;
        },
        
        // Success handler
        handleSuccess(response, form) {
            this.showToast('Profile updated successfully!', 'success');
            // Automatic redirect to /profile happens after this
        },
        
        // Error handler with smart error detection
        handleError(error, form) {
            if (error.message.includes('validation')) {
                this.showToast('Please check your input', 'warning');
            } else {
                this.showToast('Update failed. Please try again.', 'error');
            }
        },
        
        // Loading state handler
        handleLoading(isLoading, form) {
            const button = form.querySelector('button[type="submit"]');
            button.disabled = isLoading;
            button.textContent = isLoading ? 'Updating...' : 'Update Profile';
        }
    }
};
```

### Key Form Features

- **🚫 Duplicate Prevention**: Automatic duplicate submission blocking
- **⏱️ Timeout Management**: 30-second default timeout with abort capability
- **✅ Built-in Validation**: HTML5 + custom validation functions
- **🔄 Loading States**: Automatic loading state management
- **🎯 Smart Error Handling**: Network vs validation error distinction
- **📄 File Upload Support**: Automatic FormData vs JSON detection
- **🔀 Auto Redirect**: Post-success navigation
- **🏷️ Parameter Substitution**: Dynamic URL parameter replacement

### Variable Parameter Forms - Revolutionary!

The most powerful feature is **variable parameter support** in action URLs. You can use simple template syntax to inject dynamic values:

```html
<!-- Dynamic form actions with variable parameters -->
<form action="/api/users/{userId}/posts" method="POST" 
      data-success="handlePostSuccess"
      data-error="handlePostError">
    <input type="text" name="title" required placeholder="Post Title">
    <textarea name="content" required placeholder="Post Content"></textarea>
    <button type="submit">Create Post</button>
</form>

<!-- Order update with dynamic order ID -->
<form action="/api/orders/{orderId}/update" method="PUT"
      data-success="orderUpdated"
      data-redirect="/orders">
    <input type="number" name="quantity" required>
    <select name="status">
        <option value="pending">Pending</option>
        <option value="processing">Processing</option>
        <option value="completed">Completed</option>
    </select>
    <button type="submit">Update Order</button>
</form>

<!-- File upload support -->
<form action="/api/profile/{userId}/avatar" method="POST" enctype="multipart/form-data"
      data-success="avatarUploaded">
    <input type="file" name="avatar" accept="image/*" required>
    <button type="submit">Upload Avatar</button>
</form>
```

```javascript
// Component logic - parameters are resolved automatically
export default {
    name: 'UserProfile',
    data() {
        return {
            userId: 123,    // {userId} will be replaced with this value
            orderId: 456    // {orderId} will be replaced with this value
        };
    },
    methods: {
        handlePostSuccess(response) {
            console.log('Post created successfully!', response);
        },
        orderUpdated(response) {
            console.log('Order updated!', response);
        }
    }
};
```

### How Parameter Resolution Works

Parameters are resolved automatically from multiple sources in this order:

1. **Route Parameters**: `this.getParam('paramName')` - from URL query parameters
2. **Component Data**: `this.paramName` - from component's data properties  
3. **Computed Properties**: `this.paramName` - from component's computed properties

```javascript
// Component example
export default {
    name: 'UserProfile',
    data() {
        return {
            userId: 123,        // Available as {userId} in action URLs
            productId: 456      // Available as {productId} in action URLs
        };
    },
    computed: {
        currentOrderId() {   // Available as {currentOrderId} in action URLs
            return this.getParam('orderId') || this.defaultOrderId;
        }
    },
    mounted() {
        // Route parameters also work: /user-profile?userId=789
        // {userId} will use 789 from URL, or fall back to data() value of 123
    }
};
```

### Event Handlers
```html
<form action="/api/subscribe" method="POST"
      data-success="subscriptionSuccess" data-error="subscriptionError">
    <input type="email" name="email" required>
    <button type="submit">Subscribe</button>
</form>
```
```javascript
export default {
    methods: {
        subscriptionSuccess(response) { this.$toast('Success!', 'success'); },
        subscriptionError(error) { this.$toast('Failed!', 'error'); }
    }
};
```

### Form Options
```html
<form action="/api/resource/{id}" method="POST"
      data-success="handleSuccess"    data-error="handleError"
      data-redirect="/success"        data-confirm="Sure?"
      enctype="multipart/form-data">
    <input name="title" required>
    <input type="file" name="file" accept=".pdf">
    <button type="submit">Submit</button>
</form>
```

### Authentication Integration
```html
<!-- Auth tokens automatically included for authenticated users -->
<form action="/api/protected/resource" method="POST">
    <input name="data" required>
    <button type="submit">Save</button>
</form>
<!-- Authorization: Bearer <token> header added automatically -->
```

### Form Validation
```html
<!-- HTML5 + custom validation -->
<form action="/api/register" method="POST">
    <input type="email" name="email" required pattern="...">
    <input type="password" name="password" minlength="8" required>
    <button type="submit">Register</button>
</form>
```

### Real-World Form Examples
```html
<!-- User profile with dynamic parameters -->
<form action="/api/users/{userId}" method="PUT" data-success="profileUpdated">
    <input name="firstName" required>
    <button type="submit">Update</button>
</form>

<!-- Order management -->
<form action="/api/orders/{orderId}/status" method="PUT">
    <select name="status" required>
        <option value="pending">Pending</option>
        <option value="shipped">Shipped</option>
    </select>
    <button type="submit">Update</button>
</form>
```

### Form Handling Advantages
- ✅ **Zero Setup** - Just add `action` attribute vs manual event handlers
- ✅ **Variable Parameters** - `{userId}` template syntax vs manual interpolation  
- ✅ **Auto Authentication** - Tokens injected automatically
- ✅ **File Uploads** - Automatic multipart support
- ✅ **Built-in Validation** - HTML5 + custom functions


## 🔗 Query-Based Parameter System: Revolutionary Simplicity

ViewLogic Router's **Query-Based Parameter System** is a key feature that eliminates routing complexity:

**Philosophy**: **Everything is query-based** - no complex path parameters like `/users/:id`. Just simple, clean URLs: `/users?id=123`.

### Revolutionary Benefits
1. **📍 Simple URLs**: `/product?id=123&category=electronics` (clear and readable)
2. **🎯 Consistent Access**: Always use `this.getParam('id')` - never mix path/query paradigms
3. **⚡ No Route Configuration**: No complex route definitions or parameter mappings needed
4. **🔍 SEO Friendly**: Descriptive parameter names make URLs self-documenting
5. **🌐 Universal Compatibility**: Query parameters work everywhere - no framework lock-in

### Simple Usage Example
```javascript
// Navigate - simple and intuitive
this.navigateTo('products', { id: 123, category: 'electronics' });
// → /products?id=123&category=electronics

// Access parameters - always the same way
export default {
    mounted() {
        const id = this.getParam('id');           // Get parameter
        const category = this.getParam('category', 'all'); // With default
        const allParams = this.getParams();      // Get all parameters
    }
};
```

## 🛡️ Error Handling

Built-in comprehensive error handling with automatic 404 detection, graceful component loading failures, and parameter validation with fallbacks.

## 🚀 Production Deployment

1. **Build**: `npm run build` - Combines view + logic + style into optimized route bundles
2. **Deploy**: Set `environment: 'production'` and use CDN or local files
3. **Structure**: Deploy `routes/`, `css/`, `i18n/` folders (exclude `src/`)

**CDN Usage:**
```html
<script src="https://cdn.jsdelivr.net/npm/viewlogic/dist/viewlogic-router.umd.js"></script>
<script>
    ViewLogicRouter({ environment: 'production' }).mount('#app');
</script>
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