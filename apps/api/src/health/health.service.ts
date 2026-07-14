import { Injectable } from '@nestjs/common';

/**
 * Health Check Service
 *
 * Provides health status checks for the application and its dependencies.
 * Integrates with Azure App Service health probe and monitoring systems.
 */
@Injectable()
export class HealthService {
  private startTime = Date.now();

  /**
   * Check overall application health
   * Performs quick checks on application status
   */
  async checkHealth(): Promise<{
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
  }> {
    const memoryUsage = process.memoryUsage();

    return {
      uptime: Date.now() - this.startTime,
      memoryUsage,
    };
  }

  /**
   * Liveness probe: Is the process running?
   * Lightweight check - no external dependencies
   * Should return quickly (<100ms)
   */
  async checkLiveness(): Promise<boolean> {
    // Simple process health check
    if (!process.uptime) {
      throw new Error('Process not responding');
    }
    return true;
  }

  /**
   * Readiness probe: Can the service handle requests?
   * Checks critical dependencies:
   *   - CosmosDB connectivity
   *   - Database availability
   *   - Required configurations
   */
  async checkReadiness(): Promise<{
    ready: boolean;
    cosmosdb: {
      connected: boolean;
      latency?: number;
      error?: string;
    };
  }> {
    const cosmosdbStatus = await this.checkCosmosDB();

    const ready = cosmosdbStatus.connected;

    return {
      ready,
      cosmosdb: cosmosdbStatus,
    };
  }

  /**
   * Check CosmosDB connectivity
   */
  private async checkCosmosDB(): Promise<{
    connected: boolean;
    latency?: number;
    error?: string;
  }> {
    try {
      const startTime = Date.now();

      // Check if CosmosDB environment variables are set
      const endpoint = process.env.COSMOSDB_ENDPOINT;
      const primaryKey = process.env.COSMOSDB_PRIMARY_KEY;
      const database = process.env.COSMOSDB_DATABASE;

      if (!endpoint || !primaryKey || !database) {
        return {
          connected: false,
          error: 'CosmosDB credentials not configured',
        };
      }

      // In production, perform actual CosmosDB connection test
      // For MVP, we verify configuration and attempt connection
      if (process.env.NODE_ENV === 'production') {
        // TODO: Implement actual CosmosDB connectivity check
        // using @azure/cosmos client once integrated
        await this.performCosmosDBHealthCheck(endpoint, primaryKey, database);
      }

      const latency = Date.now() - startTime;

      return {
        connected: true,
        latency,
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message,
      };
    }
  }

  /**
   * Perform actual CosmosDB health check (when client is available)
   * This is a placeholder for future implementation
   */
  private async performCosmosDBHealthCheck(
    endpoint: string,
    primaryKey: string,
    database: string,
  ): Promise<void> {
    // When @azure/cosmos is integrated, perform actual connectivity check:
    // const { CosmosClient } = require("@azure/cosmos");
    // const client = new CosmosClient({ endpoint, key: primaryKey });
    // await client.database(database).containers.readAll().fetchAll();

    // For now, this is a placeholder
    return Promise.resolve();
  }

  /**
   * Get detailed diagnostics for monitoring dashboards
   */
  async getDetailedDiagnostics(): Promise<{
    checks: Array<{
      name: string;
      status: 'ok' | 'warning' | 'error';
      details?: Record<string, any>;
    }>;
  }> {
    const checks = [];

    // Check 1: Node.js runtime
    checks.push({
      name: 'nodejs_runtime',
      status: 'ok',
      details: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    });

    // Check 2: Memory usage
    const memUsage = process.memoryUsage();
    const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    const memoryStatus =
      heapUsedPercent > 90 ? 'error' : heapUsedPercent > 75 ? 'warning' : 'ok';

    checks.push({
      name: 'memory_usage',
      status: memoryStatus,
      details: {
        heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
        externalMB: Math.round(memUsage.external / 1024 / 1024),
        percentUsed: heapUsedPercent.toFixed(2),
      },
    });

    // Check 3: Environment variables
    const requiredEnvVars = [
      'COSMOSDB_ENDPOINT',
      'COSMOSDB_PRIMARY_KEY',
      'COSMOSDB_DATABASE',
    ];
    const envVarsSet = requiredEnvVars.every((envVar) => process.env[envVar]);

    checks.push({
      name: 'environment_configuration',
      status: envVarsSet ? 'ok' : 'error',
      details: {
        requiredVariables: requiredEnvVars,
        configured: requiredEnvVars.filter((envVar) => process.env[envVar]),
        missing: requiredEnvVars.filter((envVar) => !process.env[envVar]),
      },
    });

    // Check 4: CosmosDB connectivity
    const cosmosdbStatus = await this.checkCosmosDB();
    checks.push({
      name: 'cosmosdb_connectivity',
      status: cosmosdbStatus.connected ? 'ok' : 'error',
      details: cosmosdbStatus,
    });

    return { checks };
  }

  /**
   * Get liveness metrics for Kubernetes/orchestration systems
   */
  getLivenessMetrics(): {
    uptime: number;
    lastHealthCheck: string;
    cpu?: { user: number; system: number };
  } {
    const usage = process.cpuUsage();

    return {
      uptime: process.uptime(),
      lastHealthCheck: new Date().toISOString(),
      cpu: {
        user: usage.user,
        system: usage.system,
      },
    };
  }

  /**
   * Initialize health service (run on startup)
   * Performs any startup validation
   */
  onModuleInit() {
    console.log('[HealthService] Initialized');
  }
}
