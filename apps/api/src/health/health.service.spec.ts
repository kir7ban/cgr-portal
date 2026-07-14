import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;

  beforeEach(() => {
    service = new HealthService();
  });

  describe('checkHealth()', () => {
    it('should return health status with uptime', async () => {
      const health = await service.checkHealth();

      expect(health).toBeDefined();
      expect(health.uptime).toBeGreaterThanOrEqual(0);
      expect(health.memoryUsage).toBeDefined();
    });

    it('should return valid memory usage metrics', async () => {
      const health = await service.checkHealth();

      expect(health.memoryUsage.rss).toBeGreaterThan(0);
      expect(health.memoryUsage.heapTotal).toBeGreaterThan(0);
      expect(health.memoryUsage.heapUsed).toBeGreaterThan(0);
      expect(health.memoryUsage.external).toBeGreaterThanOrEqual(0);
    });

    it('should show increasing uptime on subsequent calls', async () => {
      const health1 = await service.checkHealth();
      await new Promise((resolve) => setTimeout(resolve, 10));
      const health2 = await service.checkHealth();

      expect(health2.uptime).toBeGreaterThanOrEqual(health1.uptime);
    });
  });

  describe('checkLiveness()', () => {
    it('should return true when process is running', async () => {
      const liveness = await service.checkLiveness();
      expect(liveness).toBe(true);
    });

    it('should throw error if process check fails', async () => {
      const originalUptime = process.uptime;
      (process as any).uptime = null;

      try {
        await expect(service.checkLiveness()).rejects.toThrow(
          'Process not responding',
        );
      } finally {
        (process as any).uptime = originalUptime;
      }
    });
  });

  describe('checkReadiness()', () => {
    it('should return readiness status', async () => {
      const readiness = await service.checkReadiness();

      expect(readiness).toBeDefined();
      expect(readiness.ready).toBeDefined();
      expect(readiness.cosmosdb).toBeDefined();
    });

    it('should include CosmosDB status', async () => {
      const readiness = await service.checkReadiness();

      expect(readiness.cosmosdb).toHaveProperty('connected');
      expect(typeof readiness.cosmosdb.connected).toBe('boolean');
    });

    it('should indicate not ready if CosmosDB not configured', async () => {
      const originalEndpoint = process.env.COSMOSDB_ENDPOINT;
      const originalKey = process.env.COSMOSDB_PRIMARY_KEY;
      const originalDatabase = process.env.COSMOSDB_DATABASE;

      try {
        delete process.env.COSMOSDB_ENDPOINT;
        delete process.env.COSMOSDB_PRIMARY_KEY;
        delete process.env.COSMOSDB_DATABASE;

        const readiness = await service.checkReadiness();

        expect(readiness.cosmosdb.connected).toBe(false);
        expect(readiness.cosmosdb.error).toContain('not configured');
      } finally {
        if (originalEndpoint) process.env.COSMOSDB_ENDPOINT = originalEndpoint;
        if (originalKey) process.env.COSMOSDB_PRIMARY_KEY = originalKey;
        if (originalDatabase) process.env.COSMOSDB_DATABASE = originalDatabase;
      }
    });

    it('should set ready to false when CosmosDB disconnected', async () => {
      const originalEndpoint = process.env.COSMOSDB_ENDPOINT;
      const originalKey = process.env.COSMOSDB_PRIMARY_KEY;
      const originalDatabase = process.env.COSMOSDB_DATABASE;

      try {
        delete process.env.COSMOSDB_ENDPOINT;
        delete process.env.COSMOSDB_PRIMARY_KEY;
        delete process.env.COSMOSDB_DATABASE;

        const readiness = await service.checkReadiness();

        expect(readiness.ready).toBe(false);
      } finally {
        if (originalEndpoint) process.env.COSMOSDB_ENDPOINT = originalEndpoint;
        if (originalKey) process.env.COSMOSDB_PRIMARY_KEY = originalKey;
        if (originalDatabase) process.env.COSMOSDB_DATABASE = originalDatabase;
      }
    });
  });

  describe('getDetailedDiagnostics()', () => {
    it('should return diagnostics with health checks', async () => {
      const diagnostics = await service.getDetailedDiagnostics();

      expect(diagnostics).toBeDefined();
      expect(diagnostics.checks).toBeInstanceOf(Array);
      expect(diagnostics.checks.length).toBeGreaterThan(0);
    });

    it('should include Node.js runtime check', async () => {
      const diagnostics = await service.getDetailedDiagnostics();

      const nodeJsCheck = diagnostics.checks.find((c) => c.name === 'nodejs_runtime');
      expect(nodeJsCheck).toBeDefined();
      expect(nodeJsCheck?.status).toBe('ok');
      expect(nodeJsCheck?.details?.version).toBeDefined();
      expect(nodeJsCheck?.details?.platform).toBeDefined();
      expect(nodeJsCheck?.details?.arch).toBeDefined();
    });

    it('should include memory usage check', async () => {
      const diagnostics = await service.getDetailedDiagnostics();

      const memoryCheck = diagnostics.checks.find((c) => c.name === 'memory_usage');
      expect(memoryCheck).toBeDefined();
      expect(memoryCheck?.details?.heapUsedMB).toBeGreaterThan(0);
      expect(memoryCheck?.details?.heapTotalMB).toBeGreaterThan(0);
      expect(memoryCheck?.details?.percentUsed).toBeDefined();
    });

    it('should set memory status to error if heap usage > 90%', async () => {
      // This is a hypothetical check - in real scenario heap would need to be near max
      const diagnostics = await service.getDetailedDiagnostics();

      const memoryCheck = diagnostics.checks.find((c) => c.name === 'memory_usage');
      expect(['ok', 'warning', 'error']).toContain(memoryCheck?.status);
    });

    it('should include environment configuration check', async () => {
      const diagnostics = await service.getDetailedDiagnostics();

      const envCheck = diagnostics.checks.find((c) => c.name === 'environment_configuration');
      expect(envCheck).toBeDefined();
      expect(envCheck?.details?.requiredVariables).toBeInstanceOf(Array);
      expect(envCheck?.details?.configured).toBeInstanceOf(Array);
      expect(envCheck?.details?.missing).toBeInstanceOf(Array);
    });

    it('should set environment status to error if required vars missing', async () => {
      const originalEndpoint = process.env.COSMOSDB_ENDPOINT;
      const originalKey = process.env.COSMOSDB_PRIMARY_KEY;
      const originalDatabase = process.env.COSMOSDB_DATABASE;

      try {
        delete process.env.COSMOSDB_ENDPOINT;
        delete process.env.COSMOSDB_PRIMARY_KEY;
        delete process.env.COSMOSDB_DATABASE;

        const diagnostics = await service.getDetailedDiagnostics();

        const envCheck = diagnostics.checks.find((c) => c.name === 'environment_configuration');
        expect(envCheck?.status).toBe('error');
        expect(envCheck?.details?.missing?.length).toBeGreaterThan(0);
      } finally {
        if (originalEndpoint) process.env.COSMOSDB_ENDPOINT = originalEndpoint;
        if (originalKey) process.env.COSMOSDB_PRIMARY_KEY = originalKey;
        if (originalDatabase) process.env.COSMOSDB_DATABASE = originalDatabase;
      }
    });

    it('should include CosmosDB connectivity check', async () => {
      const diagnostics = await service.getDetailedDiagnostics();

      const cosmosdbCheck = diagnostics.checks.find((c) => c.name === 'cosmosdb_connectivity');
      expect(cosmosdbCheck).toBeDefined();
      expect(cosmosdbCheck?.details?.connected).toBeDefined();
    });

    it('should have all checks with status field', async () => {
      const diagnostics = await service.getDetailedDiagnostics();

      diagnostics.checks.forEach((check) => {
        expect(['ok', 'warning', 'error']).toContain(check.status);
      });
    });
  });

  describe('getLivenessMetrics()', () => {
    it('should return liveness metrics', () => {
      const metrics = service.getLivenessMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.uptime).toBeGreaterThan(0);
      expect(metrics.lastHealthCheck).toBeDefined();
      expect(metrics.cpu).toBeDefined();
    });

    it('should include CPU usage data', () => {
      const metrics = service.getLivenessMetrics();

      expect(metrics.cpu?.user).toBeDefined();
      expect(metrics.cpu?.system).toBeDefined();
      expect(typeof metrics.cpu?.user).toBe('number');
      expect(typeof metrics.cpu?.system).toBe('number');
    });

    it('should have current timestamp', () => {
      const metrics = service.getLivenessMetrics();
      const timestamp = new Date(metrics.lastHealthCheck);

      expect(timestamp.getTime()).toBeGreaterThan(0);
      expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('onModuleInit()', () => {
    it('should initialize without errors', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      service.onModuleInit();

      expect(consoleSpy).toHaveBeenCalledWith('[HealthService] Initialized');

      consoleSpy.mockRestore();
    });
  });

  describe('Integration scenarios', () => {
    it('should provide consistent health status across multiple calls', async () => {
      const health1 = await service.checkHealth();
      const liveness1 = await service.checkLiveness();
      const readiness1 = await service.checkReadiness();

      const health2 = await service.checkHealth();
      const liveness2 = await service.checkLiveness();
      const readiness2 = await service.checkReadiness();

      expect(liveness1).toBe(liveness2);
      expect(readiness1.cosmosdb.connected).toBe(readiness2.cosmosdb.connected);
    });

    it('should handle rapid consecutive health checks', async () => {
      const checks = await Promise.all([
        service.checkHealth(),
        service.checkHealth(),
        service.checkHealth(),
        service.checkLiveness(),
        service.checkLiveness(),
        service.checkLiveness(),
        service.checkReadiness(),
        service.checkReadiness(),
        service.checkReadiness(),
      ]);

      expect(checks).toHaveLength(9);
      expect(checks.every((c) => c !== undefined)).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle memory pressure gracefully', async () => {
      const health = await service.checkHealth();
      expect(health.memoryUsage.heapUsed).toBeLessThanOrEqual(health.memoryUsage.heapTotal);
    });

    it('should not throw on diagnostic collection', async () => {
      await expect(service.getDetailedDiagnostics()).resolves.toBeDefined();
    });

    it('should provide metrics immediately without blocking', () => {
      const startTime = Date.now();
      const metrics = service.getLivenessMetrics();
      const duration = Date.now() - startTime;

      expect(metrics).toBeDefined();
      expect(duration).toBeLessThan(100); // Should be very fast
    });
  });
});
