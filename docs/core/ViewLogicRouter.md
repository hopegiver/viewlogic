# ViewLogicRouter

> The main router class that orchestrates the entire routing system

## Class Overview

The `ViewLogicRouter` class is the central coordinator for all routing functionality. It manages route loading, component rendering, navigation, and integrates all other system components.

## Constructor

```javascript
new ViewLogicRouter(config?: RouterConfig)
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `config` | `RouterConfig` | No | Configuration options for the router |

### Example

```javascript
import { ViewLogicRouter } from 'viewlogic';

// Basic initialization
const router = new ViewLogicRouter();

// With configuration
const router = new ViewLogicRouter({
    environment: 'development',
    basePath: '/src',
    useI18n: true,
    authEnabled: true,
    logLevel: 'debug'
});
```

## Properties

### Public Properties

| Property | Type | Description | Read Only |
|----------|------|-------------|-----------|
| `version` | `string` | Current router version | ✅ |
| `config` | `RouterConfig` | Router configuration | ✅ |
| `currentHash` | `string` | Currently active route | ✅ |
| `isReady` | `boolean` | Router initialization status | ✅ |

### Manager Properties

| Property | Type | Description | Availability |
|----------|------|-------------|--------------|
| `routeLoader` | `RouteLoader` | Route loading manager | Always |
| `queryManager` | `QueryManager` | Parameter management | Always |
| `cacheManager` | `CacheManager` | Caching system | Always |
| `errorHandler` | `ErrorHandler` | Error handling | Always |
| `authManager` | `AuthManager` | Authentication | When `authEnabled: true` |
| `i18nManager` | `I18nManager` | Internationalization | When `useI18n: true` |
| `componentLoader` | `ComponentLoader` | Component loading | When `useComponents: true` |

## Methods

### Navigation Methods

#### navigateTo()

Navigate to a specific route with optional parameters.

```javascript
navigateTo(route: string | RouteObject, params?: object): void
```

**Parameters:**
- `route`: Target route name or route object
- `params`: Optional query parameters

**Examples:**
```javascript
// Simple navigation
router.navigateTo('home');

// With parameters
router.navigateTo('products', { category: 'electronics', page: 1 });

// Object format
router.navigateTo({
    route: 'product-detail',
    params: { id: 123, tab: 'reviews' }
});
```

#### getCurrentRoute()

Get the currently active route name.

```javascript
getCurrentRoute(): string
```

**Returns:** Current route name

**Example:**
```javascript
const currentRoute = router.getCurrentRoute();
console.log(currentRoute); // 'home'
```

#### updateURL()

Update the browser URL without triggering navigation.

```javascript
updateURL(route: string, params?: object): void
```

**Parameters:**
- `route`: Route name for URL
- `params`: Query parameters

**Example:**
```javascript
router.updateURL('products', { search: 'laptop', sort: 'price' });
// Updates URL to: #/products?search=laptop&sort=price
```

### Lifecycle Methods

#### waitForReady()

Wait for router initialization to complete.

```javascript
waitForReady(): Promise<boolean>
```

**Returns:** Promise that resolves when router is ready

**Example:**
```javascript
await router.waitForReady();
console.log('Router is ready for navigation');
```

#### mount()

Mount the router to a DOM element.

```javascript
mount(selector: string): ViewLogicRouter
```

**Parameters:**
- `selector`: CSS selector for mount target

**Returns:** Router instance (for chaining)

**Example:**
```javascript
router.mount('#app');

// Chainable
const router = new ViewLogicRouter(config).mount('#app');
```

#### destroy()

Clean up the router and all resources.

```javascript
destroy(): void
```

**Example:**
```javascript
// Clean shutdown
router.destroy();
```

### Route Management

#### loadRoute()

Programmatically load a specific route.

```javascript
loadRoute(routeName: string): Promise<void>
```

**Parameters:**
- `routeName`: Name of the route to load

**Example:**
```javascript
try {
    await router.loadRoute('dashboard');
    console.log('Route loaded successfully');
} catch (error) {
    console.error('Failed to load route:', error);
}
```

#### handleRouteChange()

Handle route change events (typically called internally).

```javascript
handleRouteChange(): void
```

**Example:**
```javascript
// Manually trigger route change handling
router.handleRouteChange();
```

## Events

The router emits various events through the DOM event system:

### router:navigation

Fired when navigation occurs.

```javascript
document.addEventListener('router:navigation', (event) => {
    console.log('Navigated to:', event.detail.route);
    console.log('With params:', event.detail.params);
});
```

### router:route-loaded

Fired when a route is successfully loaded.

```javascript
document.addEventListener('router:route-loaded', (event) => {
    console.log('Route loaded:', event.detail.route);
    console.log('Component:', event.detail.component);
});
```

### router:route-error

Fired when route loading fails.

```javascript
document.addEventListener('router:route-error', (event) => {
    console.error('Route error:', event.detail.error);
    console.log('Failed route:', event.detail.route);
});
```

### router:auth

Authentication related events (when auth is enabled).

```javascript
document.addEventListener('router:auth', (event) => {
    console.log('Auth event:', event.detail.type);
    // Types: 'login_success', 'logout', 'auth_required', 'token_set', 'token_removed'
});
```

## Configuration Options

See [Router Configuration](../config/RouterConfiguration.md) for complete configuration options.

## Error Handling

The router includes comprehensive error handling:

```javascript
const router = new ViewLogicRouter({
    enableErrorReporting: true,
    logLevel: 'error'
});

// Errors are automatically handled and displayed
// Custom error handling
document.addEventListener('router:route-error', (event) => {
    const { route, error } = event.detail;
    // Custom error logic
});
```

## Advanced Usage

### Custom Route Loading

```javascript
const router = new ViewLogicRouter({
    environment: 'development'
});

// Preload specific routes
await router.loadRoute('dashboard');
await router.loadRoute('profile');

// Navigate instantly (cached)
router.navigateTo('dashboard');
```

### Integration with State Management

```javascript
// Vuex/Pinia integration
const router = new ViewLogicRouter();

document.addEventListener('router:navigation', (event) => {
    store.dispatch('setCurrentRoute', event.detail.route);
});

document.addEventListener('router:auth', (event) => {
    if (event.detail.type === 'logout') {
        store.dispatch('clearUser');
    }
});
```

### Custom Component Resolution

```javascript
const router = new ViewLogicRouter({
    componentNames: ['CustomButton', 'CustomModal'],
    basePath: '/custom/path'
});

// Components will be loaded from /custom/path/components/
```

## Browser Compatibility

ViewLogic Router supports:

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ❌ Internet Explorer (not supported)

## Performance Notes

- Routes are cached after first load
- Components are lazy-loaded on demand
- Production builds use pre-compiled route bundles
- Memory usage is optimized with LRU caching

## Related Documentation

- [RouteLoader](./RouteLoader.md) - Route loading implementation
- [QueryManager](./QueryManager.md) - Parameter management
- [Router Configuration](../config/RouterConfiguration.md) - Configuration options
- [Getting Started Guide](../guides/GettingStarted.md) - Basic usage patterns

---

[← Back to API Index](../index.md) | [Next: RouteLoader →](./RouteLoader.md)