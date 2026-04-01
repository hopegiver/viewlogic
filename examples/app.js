import { ViewLogicRouter } from '../src/viewlogic-router.js';

const router = new ViewLogicRouter({
    basePath: '/examples/',
    environment: 'development',

    // 인증
    auth: true,
    loginRoute: 'login',
    protectedRoutes: ['dashboard', 'admin/*'],
    publicRoutes: ['home', 'about', 'contact', 'login'],
    authFunction: () => !!localStorage.getItem('authToken')
});
