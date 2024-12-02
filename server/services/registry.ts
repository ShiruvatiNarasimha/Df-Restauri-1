import { BaseService } from './base.service';
import { CacheService } from './cache.service';
import { ProjectService } from './project.service';
import { ServiceManager } from './service.service';
import { TeamService } from './team.service';
import { performanceMonitor } from '../utils/monitoring';

export interface ServiceInitOptions {
  retryAttempts?: number;
  retryDelay?: number;
}

class ServiceRegistry {
  private static instance: ServiceRegistry;
  private services: Map<string, any>;
  private initializationStatus: Map<string, boolean>;

  private constructor() {
    this.services = new Map();
    this.initializationStatus = new Map();
    this.registerCoreServices();
  }

  public static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }

  private registerCoreServices() {
    // Register services in dependency order
    const cacheService = CacheService.getInstance();
    this.register('cache', cacheService, true); // Mark cache as optional

    // Core domain services
    const services = [
      { name: 'project', instance: new ProjectService() },
      { name: 'service', instance: new ServiceManager() },
      { name: 'team', instance: new TeamService() }
    ];

    for (const { name, instance } of services) {
      this.register(name, instance);
    }
  }

  public register(name: string, service: any, isOptional = false): void {
    if (!service) {
      console.warn(`Attempted to register undefined service: ${name}`);
      return;
    }

    const serviceInfo = {
      instance: service,
      isOptional,
      dependencies: [],
      type: service.constructor ? service.constructor.name : 'Unknown'
    };

    this.services.set(name, serviceInfo);
    this.initializationStatus.set(name, false);
    
    console.log(`Registered service: ${name}, type: ${serviceInfo.type}, optional: ${isOptional}`);
  }

  private async initializeService(
    name: string,
    serviceInfo: { 
      instance: any; 
      isOptional: boolean;
      type: string;
    },
    options: ServiceInitOptions
  ): Promise<void> {
    const { retryAttempts = 3, retryDelay = 1000 } = options;
    const { instance, isOptional } = serviceInfo;

    if (this.initializationStatus.get(name)) {
      return;
    }

    let attempt = 0;
    while (attempt < retryAttempts) {
      try {
        // Check for different initialization patterns
        if (instance instanceof BaseService) {
          await instance.initialize();
        } else if (typeof instance.initialize === 'function') {
          await instance.initialize();
        } else if (typeof instance.healthCheck === 'function') {
          await instance.healthCheck();
        } else {
          // If no initialization method is found, consider it initialized
          console.log(`Service ${name} has no initialization method, marking as initialized`);
          this.initializationStatus.set(name, true);
          return;
        }
        
        this.initializationStatus.set(name, true);
        console.log(`Service ${name} initialized successfully`);
        return;
      } catch (error) {
        attempt++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Failed to initialize service ${name} (attempt ${attempt}/${retryAttempts}):`, {
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
          serviceType: instance.constructor.name,
          timestamp: new Date().toISOString()
        });
        
        if (isOptional) {
          console.warn(`Optional service ${name} failed to initialize, continuing with degraded functionality`);
          this.initializationStatus.set(name, true);
          return;
        }
        
        if (attempt === retryAttempts) {
          throw new Error(`Failed to initialize service ${name} after ${retryAttempts} attempts: ${errorMessage}`);
        }
        
        const delay = retryDelay * Math.pow(2, attempt - 1);
        console.log(`Waiting ${delay}ms before retry ${attempt + 1}/${retryAttempts}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  public async initialize(options: ServiceInitOptions & { timeout?: number } = {}): Promise<void> {
    const endOperation = performanceMonitor.startOperation('ServiceRegistry.initialize');
    const initStartTime = Date.now();
    const { timeout = 10000 } = options;
    
    try {
      // Enhanced service group configuration with dependencies and health checks
      const serviceGroups = [
        {
          names: ['cache'],
          timeout: Math.min(timeout * 0.3, 3000),
          required: false,
          healthCheck: async () => {
            const cacheService = this.services.get('cache')?.instance;
            return cacheService?.healthCheck?.() ?? true;
          }
        },
        {
          names: ['project', 'service'],
          timeout: Math.min(timeout * 0.4, 4000),
          required: true,
          dependencies: ['cache'],
          healthCheck: async () => {
            const results = await Promise.all([
              this.services.get('project')?.instance?.healthCheck?.(),
              this.services.get('service')?.instance?.healthCheck?.()
            ]);
            return results.every(result => result !== false);
          }
        },
        {
          names: ['team'],
          timeout: Math.min(timeout * 0.3, 3000),
          required: false,
          dependencies: ['project'],
          healthCheck: async () => {
            return this.services.get('team')?.instance?.healthCheck?.() ?? true;
          }
        }
      ];

      for (const group of serviceGroups) {
        const groupStartTime = Date.now();
        
        // Check dependencies first
        if (group.dependencies?.length) {
          const unmetDependencies = group.dependencies.filter(
            dep => !this.initializationStatus.get(dep)
          );
          
          if (unmetDependencies.length > 0) {
            const error = `Unmet dependencies for group ${group.names.join(', ')}: ${unmetDependencies.join(', ')}`;
            if (group.required) {
              throw new Error(error);
            }
            console.warn(error);
            continue;
          }
        }
        
        try {
          // Initialize services with enhanced error handling and monitoring
          await Promise.race([
            Promise.all(
              group.names.map(async name => {
                const serviceInfo = this.services.get(name);
                if (!serviceInfo) {
                  console.warn(`Service ${name} not found in registry`);
                  return;
                }

                const initMetric = {
                  startTime: Date.now(),
                  retries: 0,
                  errors: [] as string[]
                };

                try {
                  await this.initializeService(name, serviceInfo, {
                    ...options,
                    timeout: group.timeout
                  });
                  
                  // Verify service health after initialization
                  const isHealthy = await group.healthCheck();
                  if (!isHealthy) {
                    throw new Error(`Health check failed for service group ${group.names.join(', ')}`);
                  }
                  
                  initMetric.duration = Date.now() - initMetric.startTime;
                  console.log(`Service ${name} initialized and healthy:`, initMetric);
                } catch (error) {
                  initMetric.errors.push(error instanceof Error ? error.message : String(error));
                  
                  if (group.required) {
                    console.error(`Critical service ${name} failed:`, initMetric);
                    throw error;
                  }
                  console.warn(`Optional service ${name} failed:`, initMetric);
                }
              })
            ),
            new Promise((_, reject) => 
              setTimeout(
                () => reject(new Error(`Service group ${group.names.join(', ')} initialization timed out`)),
                group.timeout
              )
            )
          ]);

          console.log(`Service group ${group.names.join(', ')} initialized in ${Date.now() - groupStartTime}ms`);
        } catch (error) {
          if (group.required) {
            throw new Error(`Required service group ${group.names.join(', ')} failed to initialize: ${error.message}`);
          }
          console.warn(`Optional service group ${group.names.join(', ')} failed:`, error);
        }
      }

      // Log final initialization summary
      const initTime = Date.now() - initStartTime;
      const summary = {
        totalTime: initTime,
        initializedServices: Array.from(this.initializationStatus.entries())
          .filter(([_, status]) => status)
          .map(([name]) => name),
        failedServices: Array.from(this.initializationStatus.entries())
          .filter(([_, status]) => !status)
          .map(([name]) => name),
        memoryUsage: process.memoryUsage()
      };

      console.log('Service initialization completed:', summary);
      
      if (summary.failedServices.length > 0) {
        console.warn('Some services failed to initialize:', summary.failedServices);
      }
    } finally {
      endOperation();
    }
  }

  public getService<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not found in registry`);
    }
    return service as T;
  }

  public isInitialized(name: string): boolean {
    return this.initializationStatus.get(name) || false;
  }

  public async shutdown(): Promise<void> {
    const endOperation = performanceMonitor.startOperation('ServiceRegistry.shutdown');
    
    try {
      for (const [name, service] of this.services.entries()) {
        if (typeof service.shutdown === 'function') {
          await service.shutdown();
          console.log(`Service ${name} shut down successfully`);
        }
      }
    } finally {
      endOperation();
    }
  }
}

export const serviceRegistry = ServiceRegistry.getInstance();
