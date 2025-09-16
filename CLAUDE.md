# ViewLogic Router - Development Guide

## Project Overview
Vue 3 routing system with file-based routing, zero-build development, and view-logic separation.
- Version: 1.2.2
- Main entry: `src/viewlogic-router.js`
- Main class: `ViewLogicRouter`

## Core Architecture
```
src/
├── viewlogic-router.js          # Main router class
├── core/
│   ├── ApiHandler.js           # API request handling
│   ├── ComponentLoader.js      # Dynamic component loading
│   ├── FormHandler.js          # Form processing with {param} substitution
│   ├── RouteLoader.js          # Route discovery and loading
│   └── ErrorHandler.js         # Error management
└── plugins/
    ├── AuthManager.js          # Authentication & token management
    ├── CacheManager.js         # Response caching
    ├── I18nManager.js          # Internationalization
    └── QueryManager.js         # Query parameter handling
```

## Development Commands
- `npm run dev` - Development with watch mode
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run serve` - Local test server
- `npm run examples` - Examples server

## Key Patterns
- **Routes**: File-based (`views/page.html` + `logic/page.js`)
- **Data Fetching**: `dataURL` property for automatic API calls
- **Forms**: `action="/api/users/{userId}"` with parameter substitution  
- **API**: `$api.get()`, `$api.post()`, etc. with auto token injection
- **Routing**: Query-based (`/users?id=123` not `/users/:id`)

## Configuration Options
```javascript
new ViewLogicRouter({
  basePath: '/',              // Application base path (default: '/')
  srcPath: '/src',            // Source files path (default: '/src')
  mode: 'hash',               // Routing mode (default: 'hash')
  cacheMode: 'memory',        // Cache mode (default: 'memory')
  cacheTTL: 300000,           // Cache TTL in ms (default: 300000)
  useI18n: false,             // Enable internationalization (default: false)
  defaultLanguage: 'ko',      // Default language (default: 'ko')
  authEnabled: false,         // Enable authentication (default: false)
  loginRoute: 'login',        // Login route name (default: 'login')
  protectedRoutes: [],        // Array of protected route names
  environment: 'development', // Environment mode (default: 'development')
  logLevel: 'info'            // Logging level (default: 'info')
})
```

## Examples Structure
```
examples/
├── index.html                   # Entry point
├── css/                         # Global CSS files
└── src/
    ├── views/                  # .html templates
    ├── logic/                  # .js component logic  
    ├── components/             # Reusable UI components
    ├── layouts/                # Layout templates
    └── styles/                 # Page-specific CSS files
```

## For Detailed Memory
See `memory.json` for complete project information and advanced patterns.