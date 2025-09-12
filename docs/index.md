# ViewLogic Router v1.1.1 - API Documentation

> Complete API reference for ViewLogic Router - A revolutionary Vue 3 routing system

## 📚 Documentation Index

### Core Classes
- [**ViewLogicRouter**](./core/ViewLogicRouter.md) - Main router class and entry point
- [**RouteLoader**](./core/RouteLoader.md) - Route loading and component management
- [**QueryManager**](./core/QueryManager.md) - Query parameter handling and validation
- [**CacheManager**](./core/CacheManager.md) - Intelligent caching system
- [**ErrorHandler**](./core/ErrorHandler.md) - Error handling and reporting
- [**AuthManager**](./core/AuthManager.md) - Authentication and authorization
- [**I18nManager**](./core/I18nManager.md) - Internationalization support
- [**ComponentLoader**](./core/ComponentLoader.md) - Dynamic component loading

### Global Functions
- [**Route Component Methods**](./globals/RouteComponentMethods.md) - Methods available in every route component
- [**Navigation Functions**](./globals/NavigationFunctions.md) - Routing and navigation utilities
- [**Parameter Management**](./globals/ParameterManagement.md) - Query and route parameter handling
- [**Data Fetching**](./globals/DataFetching.md) - Automatic data loading with dataURL
- [**Form Handling**](./globals/FormHandling.md) - Automatic form submission and validation

### Configuration
- [**Router Configuration**](./config/RouterConfiguration.md) - Complete configuration options
- [**Environment Settings**](./config/EnvironmentSettings.md) - Development vs production configuration
- [**Security Configuration**](./config/SecurityConfiguration.md) - Security and validation settings

### Guides
- [**Getting Started**](./guides/GettingStarted.md) - Quick start guide and basic usage
- [**Route Components**](./guides/RouteComponents.md) - Creating and organizing route components
- [**Data Management**](./guides/DataManagement.md) - Working with dataURL and API integration
- [**Form Processing**](./guides/FormProcessing.md) - Comprehensive form handling guide
- [**Authentication**](./guides/Authentication.md) - Setting up authentication and authorization
- [**Internationalization**](./guides/Internationalization.md) - Multi-language support
- [**Performance Optimization**](./guides/PerformanceOptimization.md) - Caching and optimization strategies
- [**Deployment**](./guides/Deployment.md) - Production deployment best practices

### Examples
- [**Basic Examples**](./examples/BasicExamples.md) - Simple use cases and patterns
- [**Advanced Examples**](./examples/AdvancedExamples.md) - Complex scenarios and integrations
- [**Real-World Projects**](./examples/RealWorldProjects.md) - Complete project examples

### Migration
- [**From Vue Router**](./migration/FromVueRouter.md) - Migrating from Vue Router
- [**Version Upgrade**](./migration/VersionUpgrade.md) - Upgrading between ViewLogic versions

## 🎯 Quick Reference

### Installation
```bash
npm install viewlogic
```

### Basic Setup
```javascript
import { ViewLogicRouter } from 'viewlogic';

const router = new ViewLogicRouter({
    environment: 'development',
    useI18n: true,
    authEnabled: false
});

router.mount('#app');
```

### Route Component Structure
```javascript
// src/logic/example.js
export default {
    name: 'ExamplePage',
    dataURL: '/api/data', // Auto-fetch data
    data() {
        return {
            title: 'Example Page'
        };
    },
    mounted() {
        // Data already loaded from dataURL
        console.log(this.data);
    },
    methods: {
        handleClick() {
            this.navigateTo('other-page', { id: 123 });
        }
    }
};
```

## 📖 Documentation Standards

This documentation follows these conventions:

- **Classes**: PascalCase (e.g., `ViewLogicRouter`)
- **Methods**: camelCase (e.g., `navigateTo()`)
- **Properties**: camelCase (e.g., `currentRoute`)
- **Configuration**: camelCase (e.g., `useLayout`)
- **Events**: kebab-case (e.g., `route-changed`)

### Method Signature Format
```typescript
methodName(param1: Type, param2?: Type): ReturnType
```

### Parameter Types
- `string` - Text values
- `number` - Numeric values
- `boolean` - True/false values
- `object` - Plain JavaScript objects
- `Array<Type>` - Arrays of specified type
- `Function` - Callback functions
- `Promise<Type>` - Asynchronous return values
- `Type?` - Optional parameters
- `Type | null` - Nullable values

## 🔗 External Links

- [GitHub Repository](https://github.com/hopegiver/viewlogic)
- [NPM Package](https://www.npmjs.com/package/viewlogic)
- [Live Examples](https://viewlogic-examples.netlify.app)
- [Community Discord](https://discord.gg/viewlogic)

## 📝 Contributing to Documentation

Found an error or want to improve the documentation? 

1. Fork the repository
2. Update the relevant documentation files in `docs/`
3. Submit a pull request with your changes

---

**ViewLogic Router v1.1.1** | Generated on: 2024-09-12 | [Edit this page](https://github.com/hopegiver/viewlogic/edit/master/docs/index.md)