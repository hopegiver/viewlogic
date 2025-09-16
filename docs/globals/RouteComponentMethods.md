# Route Component Methods

> Global methods available in every route component

## Overview

ViewLogic Router automatically injects a comprehensive set of methods into every route component. These methods provide seamless access to navigation, parameter management, data fetching, authentication, internationalization, and form handling without requiring imports or manual setup.

## Navigation Methods

### navigateTo()

Navigate to another route with optional parameters.

```javascript
navigateTo(route: string | RouteObject, params?: object): void
```

**Parameters:**
- `route`: Target route name or route configuration object
- `params`: Optional query parameters to include in navigation

**Examples:**

```javascript
export default {
    methods: {
        goToHome() {
            this.navigateTo('home');
        },
        
        goToProductDetail() {
            this.navigateTo('product-detail', { id: 123, tab: 'reviews' });
        },
        
        goToUserProfile() {
            // Object format
            this.navigateTo({
                route: 'user-profile',
                params: { userId: 456, section: 'settings' }
            });
        }
    }
};
```

**Generated URLs:**
```javascript
this.navigateTo('home');
// → /#/home

this.navigateTo('products', { category: 'electronics', page: 2 });
// → /#/products?category=electronics&page=2
```

### getCurrentRoute()

Get the name of the currently active route.

```javascript
getCurrentRoute(): string
```

**Returns:** Current route name as string

**Example:**

```javascript
export default {
    computed: {
        isHomePage() {
            return this.getCurrentRoute() === 'home';
        }
    },
    methods: {
        logCurrentRoute() {
            console.log('Current route:', this.getCurrentRoute());
        }
    }
};
```

## Parameter Management

### getParams()

Get all parameters (both route and query parameters).

```javascript
getParams(): object
```

**Returns:** Object containing all available parameters

**Example:**

```javascript
export default {
    mounted() {
        const allParams = this.getParams();
        console.log('All parameters:', allParams);
        // { id: '123', category: 'electronics', page: '2' }
    }
};
```

### getParam()

Get a specific parameter with optional default value.

```javascript
getParam(key: string, defaultValue?: any): any
```

**Parameters:**
- `key`: Parameter name to retrieve
- `defaultValue`: Value to return if parameter is not found

**Returns:** Parameter value or default value

**Examples:**

```javascript
export default {
    data() {
        return {
            // Using parameters in data initialization
            userId: this.getParam('userId', 1),
            pageSize: this.getParam('pageSize', 20),
            sortBy: this.getParam('sort', 'name'),
            isActive: this.getParam('active', 'true') === 'true'
        };
    },
    methods: {
        loadUserData() {
            const id = this.getParam('id');
            if (!id) {
                console.warn('No user ID provided');
                return;
            }
            
            // Use the ID for API call
            this.fetchUser(id);
        },
        
        applyFilters() {
            const category = this.getParam('category', 'all');
            const priceRange = this.getParam('priceRange', '0-1000');
            const sortOrder = this.getParam('sort', 'name-asc');
            
            this.filterProducts(category, priceRange, sortOrder);
        }
    }
};
```

## API Methods ($api)

### $api Object

A unified API interface for making HTTP requests with automatic parameter substitution, authentication, and error handling.

```javascript
this.$api: {
    get(url: string, options?: object): Promise<object>
    post(url: string, data?: object, options?: object): Promise<object>
    put(url: string, data?: object, options?: object): Promise<object>
    patch(url: string, data?: object, options?: object): Promise<object>
    delete(url: string, options?: object): Promise<object>
    fetchData(url: string, options?: object): Promise<object>
    fetchMultipleData(dataConfig: object): Promise<object>
}
```

### $api.get()

Make GET requests with automatic parameter handling.

```javascript
export default {
    data() {
        return {
            userId: this.getParam('userId', 1),
            products: []
        };
    },
    async mounted() {
        try {
            // Basic GET request
            const products = await this.$api.get('/api/products');
            this.products = products.data;
            
            // GET with parameters substitution
            const user = await this.$api.get('/api/users/{userId}');
            this.user = user;
            
            // GET with custom options
            const data = await this.$api.get('/api/data', {
                headers: { 'X-Custom-Header': 'value' }
            });
        } catch (error) {
            console.error('API Error:', error);
        }
    }
};
```

### $api.post()

Make POST requests with automatic data handling.

```javascript
export default {
    methods: {
        async createUser(userData) {
            try {
                const response = await this.$api.post('/api/users', userData);
                this.$toast('User created successfully!', 'success');
                return response;
            } catch (error) {
                this.$toast('Failed to create user', 'error');
                throw error;
            }
        },
        
        async uploadFile(file) {
            const formData = new FormData();
            formData.append('file', file);
            
            try {
                // FormData is automatically handled
                const response = await this.$api.post('/api/upload', formData);
                return response;
            } catch (error) {
                console.error('Upload failed:', error);
            }
        }
    }
};
```

### $api.put()

Make PUT requests for updates.

```javascript
export default {
    methods: {
        async updateUser(userId, updates) {
            try {
                const response = await this.$api.put(`/api/users/${userId}`, updates);
                this.$toast('User updated successfully!', 'success');
                return response;
            } catch (error) {
                this.$toast('Failed to update user', 'error');
                throw error;
            }
        }
    }
};
```

### $api.patch()

Make PATCH requests for partial updates.

```javascript
export default {
    methods: {
        async updateUserStatus(status) {
            try {
                const userId = this.getParam('userId');
                const response = await this.$api.patch('/api/users/{userId}/status', {
                    status: status,
                    updatedAt: new Date().toISOString()
                });
                return response;
            } catch (error) {
                console.error('Status update failed:', error);
            }
        }
    }
};
```

### $api.delete()

Make DELETE requests.

```javascript
export default {
    methods: {
        async deleteUser(userId) {
            if (!confirm('Are you sure you want to delete this user?')) {
                return;
            }
            
            try {
                await this.$api.delete(`/api/users/${userId}`);
                this.$toast('User deleted successfully!', 'success');
                this.navigateTo('users');
            } catch (error) {
                this.$toast('Failed to delete user', 'error');
            }
        }
    }
};
```

### $api.fetchData()

Alias for get() method with additional parameter processing.

```javascript
export default {
    methods: {
        async loadUserData() {
            try {
                const data = await this.$api.fetchData('/api/users/{userId}/profile');
                Object.assign(this, data);
            } catch (error) {
                console.error('Failed to load user data:', error);
            }
        }
    }
};
```

### $api.fetchMultipleData()

Fetch data from multiple endpoints in parallel.

```javascript
export default {
    methods: {
        async loadDashboardData() {
            const dataConfig = {
                user: '/api/users/{userId}',
                orders: '/api/users/{userId}/orders',
                analytics: '/api/analytics/user/{userId}'
            };
            
            try {
                const { results, errors } = await this.$api.fetchMultipleData(dataConfig);
                
                // Handle successful results
                Object.assign(this, results);
                
                // Handle any errors
                if (Object.keys(errors).length > 0) {
                    console.error('Some API calls failed:', errors);
                }
            } catch (error) {
                console.error('Dashboard data loading failed:', error);
            }
        }
    }
};
```

## Data Fetching Methods

### $fetchData()

Fetch data from the component's configured dataURL.

```javascript
$fetchData(dataConfig?: string | object): Promise<object>
```

**Parameters:**
- `dataConfig`: Optional override for dataURL configuration

**Single API Example:**

```javascript
export default {
    dataURL: '/api/products',
    methods: {
        async refreshProducts() {
            this.$dataLoading = true;
            await this.$fetchData();
            console.log('Products refreshed:', this.products);
        }
    }
};
```

**Multiple API Example:**

```javascript
export default {
    dataURL: {
        products: '/api/products',
        categories: '/api/categories',
        stats: '/api/stats'
    },
    methods: {
        async refreshData() {
            const { results, errors } = await this.$fetchData();
            
            // Data is automatically assigned to component
            console.log('Products:', this.products);
            console.log('Categories:', this.categories);
            console.log('Stats:', this.stats);
        }
    }
};
```

### Error Handling with APIs

```javascript
export default {
    methods: {
        async handleApiError() {
            try {
                const data = await this.$api.get('/api/sensitive-data');
                this.processData(data);
            } catch (error) {
                // Automatic error handling patterns
                if (error.message.includes('401')) {
                    this.$toast('Please log in again', 'warning');
                    this.$logout();
                } else if (error.message.includes('403')) {
                    this.$toast('Access denied', 'error');
                    this.navigateTo('home');
                } else if (error.message.includes('404')) {
                    this.$toast('Data not found', 'warning');
                } else {
                    this.$toast('An error occurred', 'error');
                    console.error('API Error:', error);
                }
            }
        }
    }
};
```

## Form Handling Methods

### $bindAutoForms()

Automatically bind form submission handlers to forms with action attributes.

```javascript
$bindAutoForms(): void
```

**Usage:**

```javascript
export default {
    mounted() {
        // Called automatically, but can be called manually if needed
        this.$bindAutoForms();
    },
    
    updated() {
        // Re-bind forms after dynamic content changes
        this.$nextTick(() => {
            this.$bindAutoForms();
        });
    }
};
```

### $handleFormSubmit()

Handle form submission (called automatically by bound forms).

```javascript
$handleFormSubmit(event: Event): Promise<void>
```

**Typically used internally, but can be called manually:**

```javascript
export default {
    methods: {
        async manualFormSubmit() {
            const form = document.getElementById('my-form');
            const event = new Event('submit');
            await this.$handleFormSubmit(event);
        }
    }
};
```

### $validateForm()

Validate a form using HTML5 and custom validation rules.

```javascript
$validateForm(form: HTMLFormElement): boolean
```

**Example:**

```javascript
export default {
    methods: {
        async submitForm() {
            const form = document.getElementById('registration-form');
            
            if (!this.$validateForm(form)) {
                this.$toast('Please fix form errors', 'error');
                return;
            }
            
            // Proceed with submission
            await this.$handleFormSubmit(event);
        }
    }
};
```

### $processActionParams()

Process variable parameters in form action URLs.

```javascript
$processActionParams(actionTemplate: string): string
```

**Example:**

```javascript
export default {
    data() {
        return {
            userId: 123,
            productId: 456
        };
    },
    methods: {
        processCustomAction() {
            const template = '/api/users/{userId}/products/{productId}';
            const processed = this.$processActionParams(template);
            console.log(processed); // '/api/users/123/products/456'
        }
    }
};
```

### $submitFormData()

Submit form data to an API endpoint.

```javascript
$submitFormData(action: string, method: string, data: object, form: HTMLFormElement): Promise<object>
```

**Example:**

```javascript
export default {
    methods: {
        async customSubmit() {
            const formData = {
                name: 'John Doe',
                email: 'john@example.com'
            };
            
            try {
                const response = await this.$submitFormData(
                    '/api/users',
                    'POST',
                    formData,
                    document.getElementById('user-form')
                );
                console.log('Success:', response);
            } catch (error) {
                console.error('Submission failed:', error);
            }
        }
    }
};
```

## Authentication Methods

### $isAuthenticated()

Check if the current user is authenticated.

```javascript
$isAuthenticated(): boolean
```

**Example:**

```javascript
export default {
    computed: {
        showUserMenu() {
            return this.$isAuthenticated();
        }
    },
    methods: {
        handleProtectedAction() {
            if (!this.$isAuthenticated()) {
                this.$toast('Please log in to continue', 'warning');
                this.navigateTo('login');
                return;
            }
            
            // Proceed with protected action
            this.performProtectedAction();
        }
    }
};
```

### $getToken()

Get the current authentication token.

```javascript
$getToken(): string | null
```

**Example:**

```javascript
export default {
    methods: {
        async makeAuthenticatedRequest() {
            const token = this.$getToken();
            
            if (!token) {
                console.warn('No authentication token available');
                return;
            }
            
            const response = await fetch('/api/protected', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            return response.json();
        }
    }
};
```

### $logout()

Log out the current user and redirect to login page.

```javascript
$logout(): void
```

**Example:**

```javascript
export default {
    methods: {
        handleLogout() {
            if (confirm('Are you sure you want to log out?')) {
                this.$logout();
            }
        },
        
        sessionExpired() {
            this.$toast('Session expired, please log in again', 'warning');
            this.$logout();
        }
    }
};
```

### $setToken()

Set authentication token (rarely used in route components).

```javascript
$setToken(token: string, options?: object): boolean
```

### $removeToken()

Remove authentication token (rarely used in route components).

```javascript
$removeToken(storage?: string): void
```

## Internationalization Methods

### $t()

Translate text using the current language.

```javascript
$t(key: string, params?: object): string
```

**Parameters:**
- `key`: Translation key (dot notation supported)
- `params`: Variables to interpolate in translation

**Examples:**

```javascript
export default {
    computed: {
        welcomeMessage() {
            return this.$t('welcome.message');
        },
        
        itemCount() {
            const count = this.items.length;
            return this.$t('items.count', { count });
        }
    },
    methods: {
        showSuccessMessage() {
            const message = this.$t('form.submit.success');
            this.$toast(message, 'success');
        },
        
        formatUserGreeting(userName) {
            return this.$t('user.greeting', { name: userName });
        }
    }
};
```

## Validation Methods

Custom validation functions can be defined and used with form validation:

```javascript
export default {
    methods: {
        // Custom validation functions
        validateEmail(value, input) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(value);
        },
        
        validatePassword(value, input) {
            return value.length >= 8 && 
                   /[A-Z]/.test(value) && 
                   /[0-9]/.test(value);
        },
        
        validateUsername(value, input) {
            return value.length >= 3 && 
                   !/\s/.test(value) &&
                   !this.existingUsernames.includes(value);
        }
    }
};
```

Use in templates:

```html
<form action="/api/register" data-validate="true">
    <input name="email" data-validation="validateEmail">
    <input name="password" data-validation="validatePassword">
    <input name="username" data-validation="validateUsername">
    <button type="submit">Register</button>
</form>
```

## Usage Patterns

### Component Initialization

```javascript
export default {
    name: 'ProductDetail',
    dataURL: '/api/products/{id}',
    data() {
        return {
            id: this.getParam('id'),
            tab: this.getParam('tab', 'overview')
        };
    },
    mounted() {
        // Data already loaded from dataURL
        console.log('Product:', this.product);
        
        // Check authentication for protected features
        if (this.$isAuthenticated()) {
            this.loadUserPreferences();
        }
    }
};
```

### Navigation Handling

```javascript
export default {
    methods: {
        handleItemClick(itemId) {
            this.navigateTo('item-detail', { 
                id: itemId,
                returnUrl: this.getCurrentRoute()
            });
        },
        
        applyFilter(filterType, value) {
            const currentParams = this.getParams();
            this.navigateTo(this.getCurrentRoute(), {
                ...currentParams,
                [filterType]: value,
                page: 1 // Reset pagination
            });
        }
    }
};
```

### Data Management

```javascript
export default {
    dataURL: {
        items: '/api/items',
        categories: '/api/categories'
    },
    methods: {
        async refreshData() {
            this.loading = true;
            try {
                await this.$fetchAllData();
            } finally {
                this.loading = false;
            }
        },
        
        async refreshItems() {
            await this.$fetchData('items');
        }
    }
};
```

## Method Availability

| Method Category | Always Available | Requires Configuration |
|----------------|------------------|----------------------|
| Navigation | ✅ | - |
| Parameters | ✅ | - |
| API Methods ($api) | ✅ | - |
| Data Fetching | ✅ | Requires `dataURL` |
| Authentication | ✅ | Requires `authEnabled: true` |
| Internationalization | ✅ | Requires `useI18n: true` |
| Form Handling | ✅ | - |

## Related Documentation

- [Navigation Functions](./NavigationFunctions.md) - Detailed navigation methods
- [Parameter Management](./ParameterManagement.md) - Parameter handling details
- [Data Fetching](./DataFetching.md) - Data loading patterns
- [Form Handling](./FormHandling.md) - Form processing guide

---

[← API Index](../index.md) | [Navigation Functions →](./NavigationFunctions.md)