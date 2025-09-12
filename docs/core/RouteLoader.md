# RouteLoader

> Component loading, template processing, and route management system

## Class Overview

The `RouteLoader` class handles the loading and processing of route components, including template compilation, style injection, layout management, and automatic data fetching. It's responsible for creating Vue components from separated view, logic, and style files.

## Constructor

```javascript
new RouteLoader(router: ViewLogicRouter, options?: RouteLoaderConfig)
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `router` | `ViewLogicRouter` | ✅ | Parent router instance |
| `options` | `RouteLoaderConfig` | No | Loader configuration options |

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `config` | `RouteLoaderConfig` | Loader configuration |
| `router` | `ViewLogicRouter` | Parent router reference |

## Core Methods

### loadScript()

Load JavaScript logic for a route component.

```javascript
loadScript(routeName: string): Promise<object>
```

**Parameters:**
- `routeName`: Name of the route to load

**Returns:** Promise resolving to the component script object

**Example:**
```javascript
const script = await routeLoader.loadScript('products/list');
// Returns the exported object from src/logic/products/list.js
```

**Behavior:**
- **Development**: Loads from `src/logic/{routeName}.js`
- **Production**: Loads from `routes/{routeName}.js`
- Automatically handles 404 errors for missing routes

### loadTemplate()

Load HTML template for a route component.

```javascript
loadTemplate(routeName: string): Promise<string>
```

**Parameters:**
- `routeName`: Name of the route template

**Returns:** Promise resolving to HTML template string

**Example:**
```javascript
const template = await routeLoader.loadTemplate('products/list');
// Returns content from src/views/products/list.html
```

**Fallback:** Returns generated default template if file not found

### loadStyle()

Load CSS styles for a route component.

```javascript
loadStyle(routeName: string): Promise<string>
```

**Parameters:**
- `routeName`: Name of the route styles

**Returns:** Promise resolving to CSS string

**Example:**
```javascript
const css = await routeLoader.loadStyle('products/list');
// Returns content from src/styles/products/list.css
```

**Fallback:** Returns empty string if file not found

### loadLayout()

Load layout template for wrapping route content.

```javascript
loadLayout(layoutName: string): Promise<string | null>
```

**Parameters:**
- `layoutName`: Name of the layout template

**Returns:** Promise resolving to layout HTML or null

**Example:**
```javascript
const layout = await routeLoader.loadLayout('admin');
// Returns content from src/layouts/admin.html
```

### createVueComponent()

Create a complete Vue component from route files.

```javascript
createVueComponent(routeName: string): Promise<VueComponent>
```

**Parameters:**
- `routeName`: Name of the route component

**Returns:** Promise resolving to Vue component object

**Example:**
```javascript
const component = await routeLoader.createVueComponent('dashboard');
// Returns complete Vue component with template, script, and styles
```

**Features:**
- Combines template, script, and styles
- Applies layout if configured
- Injects global methods and properties
- Sets up automatic data fetching
- Configures form handling

## Data Fetching Methods

### fetchComponentData()

Fetch data for component's dataURL configuration.

```javascript
fetchComponentData(dataURL: string): Promise<object>
```

**Parameters:**
- `dataURL`: API endpoint URL

**Returns:** Promise resolving to fetched data

**Example:**
```javascript
const data = await routeLoader.fetchComponentData('/api/products');
// Automatically includes current query parameters
```

**Features:**
- Automatically appends current query parameters to requests
- Handles authentication headers
- Validates response format
- Provides detailed error messages

## Template Processing

### mergeLayoutWithTemplate()

Combine layout and route template.

```javascript
mergeLayoutWithTemplate(routeName: string, layout: string, template: string): string
```

**Parameters:**
- `routeName`: Route name for debugging
- `layout`: Layout HTML content
- `template`: Route template content

**Returns:** Combined HTML template

**Example:**
```javascript
const merged = routeLoader.mergeLayoutWithTemplate(
    'dashboard',
    '<div class="layout">{{ content }}</div>',
    '<h1>Dashboard</h1>'
);
// Returns: '<div class="layout"><h1>Dashboard</h1></div>'
```

**Merge Strategies:**
1. Replace `{{ content }}` placeholder
2. Replace content in `.main-content` element
3. Append template to layout

### generateDefaultTemplate()

Generate fallback template for missing view files.

```javascript
generateDefaultTemplate(routeName: string): string
```

**Parameters:**
- `routeName`: Name of the route

**Returns:** Basic HTML template

**Example:**
```javascript
const template = routeLoader.generateDefaultTemplate('missing-route');
// Returns: '<div class="route-missing-route"><h1>Route: missing-route</h1></div>'
```

## Component Enhancement

The RouteLoader automatically enhances created components with:

### Global Properties

```javascript
// Available in every route component
export default {
    data() {
        return {
            // Your data...
            
            // Automatically injected:
            currentRoute: 'route-name',
            $query: { /* current query params */ },
            $lang: 'ko',
            $dataLoading: false
        };
    }
};
```

### Global Methods

```javascript
export default {
    methods: {
        // Navigation
        navigateTo(route, params) { /* ... */ },
        getCurrentRoute() { /* ... */ },
        
        // Parameters
        getParams() { /* ... */ },
        getParam(key, defaultValue) { /* ... */ },
        
        // Data fetching
        $fetchData(apiName) { /* ... */ },
        $fetchMultipleData() { /* ... */ },
        $fetchAllData() { /* ... */ },
        
        // Form handling
        $bindAutoForms() { /* ... */ },
        $handleFormSubmit(event) { /* ... */ },
        $validateForm(form) { /* ... */ },
        
        // Authentication
        $isAuthenticated() { /* ... */ },
        $getToken() { /* ... */ },
        $logout() { /* ... */ },
        
        // Internationalization
        $t(key, params) { /* ... */ }
    }
};
```

## Automatic Data Fetching

### Single API

```javascript
export default {
    name: 'ProductList',
    dataURL: '/api/products',
    mounted() {
        // Data automatically loaded and available
        console.log(this.products);
    }
};
```

### Multiple APIs

```javascript
export default {
    name: 'Dashboard',
    dataURL: {
        stats: '/api/dashboard/stats',
        users: '/api/users',
        orders: '/api/orders'
    },
    mounted() {
        // All APIs loaded in parallel
        console.log(this.stats, this.users, this.orders);
    }
};
```

## Form Handling

### Automatic Form Binding

```javascript
// src/views/contact.html
<form action="/api/contact" method="POST" data-success="handleSuccess">
    <input name="name" required>
    <button type="submit">Submit</button>
</form>
```

```javascript
// src/logic/contact.js
export default {
    methods: {
        handleSuccess(response) {
            console.log('Form submitted successfully:', response);
        }
    }
};
```

### Variable Parameters

```javascript
// Template with dynamic user ID
<form action="/api/users/{userId}/posts" method="POST">
    <input name="title" required>
    <button type="submit">Create Post</button>
</form>
```

```javascript
export default {
    data() {
        return {
            userId: 123 // Automatically substituted in form action
        };
    }
};
```

## Cache Management

### invalidateCache()

Clear cache for a specific route.

```javascript
invalidateCache(routeName: string): void
```

**Example:**
```javascript
routeLoader.invalidateCache('products/list');
// Clears all cached data for this route
```

## Utility Methods

### toPascalCase()

Convert route name to PascalCase component name.

```javascript
toPascalCase(routeName: string): string
```

**Example:**
```javascript
const componentName = routeLoader.toPascalCase('products/detail-view');
// Returns: 'ProductsDetailView'
```

### generatePageTitle()

Generate human-readable page title from route name.

```javascript
generatePageTitle(routeName: string): string
```

**Example:**
```javascript
const title = routeLoader.generatePageTitle('user-profile');
// Returns: 'User Profile'
```

### getStats()

Get loader statistics and configuration.

```javascript
getStats(): object
```

**Example:**
```javascript
const stats = routeLoader.getStats();
// Returns: { environment: 'development', basePath: '/src', ... }
```

## Configuration Options

```javascript
const routeLoader = new RouteLoader(router, {
    basePath: '/src',              // Base path for source files
    routesPath: '/routes',         // Path for built routes
    environment: 'development',    // 'development' or 'production'
    useLayout: true,              // Enable layout system
    defaultLayout: 'default',     // Default layout name
    useComponents: true,          // Enable component loading
    debug: false                  // Debug logging
});
```

## Error Handling

The RouteLoader includes comprehensive error handling:

### Route Not Found (404)

```javascript
try {
    await routeLoader.loadScript('non-existent-route');
} catch (error) {
    console.log(error.message); // "Route 'non-existent-route' not found - 404"
}
```

### Component Loading Failures

```javascript
// Router continues to work even if components fail to load
const component = await routeLoader.createVueComponent('dashboard');
// Components property will be empty object if loading fails
```

### Data Fetching Errors

```javascript
export default {
    dataURL: '/api/unreachable',
    mounted() {
        // Component still loads, data fetching errors are logged
        if (this.$dataLoading === false && !this.data) {
            console.log('Data fetch failed, but component loaded');
        }
    }
};
```

## Development vs Production

### Development Mode
- Loads separate files: `logic/*.js`, `views/*.html`, `styles/*.css`
- Real-time file changes without build
- Individual HTTP requests for each file type
- Layout processing on-the-fly

### Production Mode
- Loads pre-built bundles from `routes/*.js`
- Single HTTP request per route
- Template and styles pre-compiled into JS
- Optimized for performance

## Performance Considerations

- **Caching**: Components are cached after first load
- **Lazy Loading**: Routes loaded only when navigated to
- **Memory Management**: Unused components can be garbage collected
- **Bundle Splitting**: Each route is a separate bundle in production

## Related Documentation

- [ViewLogicRouter](./ViewLogicRouter.md) - Main router class
- [Data Management Guide](../guides/DataManagement.md) - Working with dataURL
- [Form Processing Guide](../guides/FormProcessing.md) - Form handling details
- [Route Components Guide](../guides/RouteComponents.md) - Component structure

---

[← ViewLogicRouter](./ViewLogicRouter.md) | [API Index](../index.md) | [QueryManager →](./QueryManager.md)