# ViewLogic

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

> A lightweight, file-based routing system for Vue 3 applications with zero build configuration

## ✨ Features

- 🚀 **Zero Configuration** - Works out of the box without any build step
- 📁 **File-based Routing** - Automatic route generation from your file structure
- 🎨 **Vue 3 Compatible** - Built specifically for Vue 3 applications
- 🔥 **Hot Module Replacement** - Instant updates during development
- 📦 **Tiny Bundle Size** - Less than 20KB minified
- 🛠️ **Built-in Components** - Dynamic includes, layouts, and more
- 💪 **TypeScript Support** - Full TypeScript definitions included
- 🌐 **i18n Ready** - Built-in internationalization support

## 📦 Installation

```bash
npm install viewlogic
# or
yarn add viewlogic
# or
pnpm add viewlogic
```

## 🚀 Quick Start

### 1. Create your HTML entry point

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>My ViewLogic App</title>
    <link rel="stylesheet" href="node_modules/viewlogic/dist/viewlogic.css">
</head>
<body>
    <div id="app"></div>
    
    <!-- Vue 3 -->
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
    <!-- ViewLogic -->
    <script src="node_modules/viewlogic/dist/viewlogic.min.js"></script>
    
    <script>
        // Initialize ViewLogic
        const router = ViewLogic.createViewLogic({
            routes: 'routes',  // Routes directory
            defaultRoute: 'home',
            layoutsPath: 'layouts'
        });
        
        // Start the router
        router.init();
    </script>
</body>
</html>
```

### 2. Create your file structure

```
my-app/
├── index.html
├── routes/
│   ├── home.js
│   ├── about.js
│   └── products.js
├── layouts/
│   └── default.html
└── package.json
```

### 3. Create a route file

```javascript
// routes/home.js
export default {
    name: 'Home',
    template: `
        <div class="home-page">
            <h1>{{ title }}</h1>
            <p>{{ message }}</p>
            <button @click="handleClick">Click Me</button>
        </div>
    `,
    data() {
        return {
            title: 'Welcome to ViewLogic',
            message: 'Build Vue 3 apps without build tools!'
        };
    },
    methods: {
        handleClick() {
            alert('Hello from ViewLogic!');
        }
    }
};
```

## 📖 Documentation

### Router Configuration

```javascript
const router = ViewLogic.createViewLogic({
    // Routes directory (default: 'routes')
    routes: 'routes',
    
    // Default route (default: 'home')
    defaultRoute: 'home',
    
    // Layouts directory (default: 'layouts')
    layoutsPath: 'layouts',
    
    // Enable Vue reactivity (default: true)
    reactive: true,
    
    // Enable built-in components (default: true)
    components: true,
    
    // Cache routes (default: true)
    cache: true,
    
    // Debug mode (default: false)
    debug: false
});
```

### Navigation

```javascript
// Navigate to a route
router.navigateTo('products');

// Navigate with parameters
router.navigateTo('product-detail?id=123');

// Get current route
const currentRoute = router.getCurrentRoute();

// Listen to route changes
router.on('routeChanged', (route) => {
    console.log('Route changed to:', route);
});
```

### Built-in Components

#### DynamicInclude

```html
<DynamicInclude src="components/header.html" />
```

#### HtmlInclude

```html
<HtmlInclude src="partials/footer.html" />
```

### File-based Routing

ViewLogic automatically generates routes based on your file structure:

```
routes/
├── index.js        → /
├── about.js        → /about
├── products/
│   ├── index.js    → /products
│   └── [id].js     → /products/:id
└── blog/
    ├── index.js    → /blog
    └── posts.js    → /blog/posts
```

### Layouts

Create reusable layouts for your pages:

```html
<!-- layouts/default.html -->
<div class="layout">
    <header>
        <nav><!-- Navigation --></nav>
    </header>
    
    <main>
        <div id="content">
            <!-- Page content will be inserted here -->
        </div>
    </main>
    
    <footer>
        <!-- Footer content -->
    </footer>
</div>
```

## 🛠️ Advanced Usage

### Custom Route Handler

```javascript
router.beforeEach((to, from, next) => {
    // Authentication check
    if (to.requiresAuth && !isAuthenticated()) {
        next('login');
    } else {
        next();
    }
});
```

### Lazy Loading

```javascript
// routes/admin.js
export default {
    name: 'Admin',
    async setup() {
        // Lazy load admin module
        const adminModule = await import('./modules/admin.js');
        return adminModule.default;
    }
};
```

### API Integration

```javascript
// routes/users.js
export default {
    name: 'Users',
    async data() {
        const response = await fetch('/api/users');
        const users = await response.json();
        return { users };
    },
    template: `
        <div>
            <h1>Users</h1>
            <ul>
                <li v-for="user in users" :key="user.id">
                    {{ user.name }}
                </li>
            </ul>
        </div>
    `
};
```

## 🔧 API Reference

### Router Methods

- `init()` - Initialize the router
- `navigateTo(route)` - Navigate to a route
- `getCurrentRoute()` - Get current route
- `reload()` - Reload current route
- `back()` - Go back in history
- `forward()` - Go forward in history
- `on(event, handler)` - Add event listener
- `off(event, handler)` - Remove event listener

### Router Events

- `routeChanged` - Fired when route changes
- `beforeRouteChange` - Fired before route changes
- `routeError` - Fired on route error
- `ready` - Fired when router is ready

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with ❤️ for the Vue.js community
- Inspired by Next.js and Nuxt.js routing systems
- Special thanks to all contributors

## 📞 Support

- 📧 Email: support@viewlogic.dev
- 🐛 Issues: [GitHub Issues](https://github.com/hopegiver/viewlogic/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/hopegiver/viewlogic/discussions)

---

<p align="center">Made with ❤️ by <a href="https://github.com/hopegiver">hopegiver</a></p>