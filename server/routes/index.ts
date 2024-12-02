import { Router } from 'express';
import authRoutes from './auth.routes';
import projectRoutes from './project.routes';
import serviceRoutes from './service.routes';
import teamRoutes from './team.routes';
import { rateLimiter } from '../middleware/performance';
import { requestLogger } from '../middleware/logging';
import { timeoutMiddleware } from '../middleware/monitoring';

// Route configuration with specific middleware
interface RouteConfig {
  path: string;
  router: Router;
  middleware?: ((req: any, res: any, next: any) => void)[];
}

const routes: RouteConfig[] = [
  {
    path: '/auth',
    router: authRoutes,
    middleware: [rateLimiter] // Specific rate limiting for auth routes
  },
  {
    path: '/projects',
    router: projectRoutes,
    middleware: [timeoutMiddleware] // Custom timeout for project operations
  },
  {
    path: '/services',
    router: serviceRoutes
  },
  {
    path: '/team',
    router: teamRoutes
  }
];

export function setupRoutes(app: any): void {
  // Apply common middleware for all API routes
  app.use('/api', requestLogger);

  // Configure routes with their specific middleware
  routes.forEach(({ path, router, middleware = [] }) => {
    app.use(
      `/api${path}`,
      ...middleware,
      router
    );
  });
}
