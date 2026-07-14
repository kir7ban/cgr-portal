import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { HealthService } from './health.service';

/**
 * Health Check Controller
 *
 * Provides health check endpoints for Azure App Service and monitoring.
 * Used by Azure Load Balancer, Application Insights, and CI/CD pipelines.
 *
 * Endpoints:
 *   GET /api/health          - Basic liveness probe
 *   GET /api/health/live     - Kubernetes-style liveness
 *   GET /api/health/ready    - Kubernetes-style readiness
 *   GET /api/health/detailed - Full diagnostic information
 */
@Controller('api/health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Basic health check (Azure App Service endpoint)
   * Returns 200 if the application is running
   */
  @Get()
  async check(@Res() res: Response) {
    try {
      const status = await this.healthService.checkHealth();
      return res.status(HttpStatus.OK).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        ...status,
      });
    } catch (error) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  /**
   * Liveness probe
   * Indicates if the application process is running.
   * Does NOT check dependencies (CosmosDB, external services).
   */
  @Get('live')
  async live(@Res() res: Response) {
    try {
      await this.healthService.checkLiveness();
      return res.status(HttpStatus.OK).json({
        status: 'alive',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'dead',
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  /**
   * Readiness probe
   * Indicates if the application is ready to serve requests.
   * Checks critical dependencies: CosmosDB connectivity.
   */
  @Get('ready')
  async ready(@Res() res: Response) {
    try {
      const readiness = await this.healthService.checkReadiness();
      if (readiness.ready) {
        return res.status(HttpStatus.OK).json({
          status: 'ready',
          timestamp: new Date().toISOString(),
          ...readiness,
        });
      } else {
        return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
          status: 'not_ready',
          timestamp: new Date().toISOString(),
          ...readiness,
        });
      }
    } catch (error) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  /**
   * Detailed health diagnostics
   * Returns comprehensive diagnostic information.
   * Useful for debugging and monitoring dashboards.
   */
  @Get('detailed')
  async detailed(@Res() res: Response) {
    try {
      const diagnostics = await this.healthService.getDetailedDiagnostics();
      const isHealthy = diagnostics.checks.every((check) => check.status === 'ok');
      const statusCode = isHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;

      return res.status(statusCode).json({
        status: isHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '0.1.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        ...diagnostics,
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }
}
