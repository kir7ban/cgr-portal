import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

/**
 * Health Check Module
 *
 * Provides application health monitoring endpoints for:
 *   - Azure App Service health probes
 *   - Kubernetes liveness/readiness probes
 *   - Application monitoring dashboards
 *   - CI/CD deployment verification
 */
@Module({
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
