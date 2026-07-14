import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { HttpStatus } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let service: HealthService;
  let mockResponse: Partial<Response>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [HealthService],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    service = module.get<HealthService>(HealthService);

    // Mock response object
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('GET /api/health', () => {
    it('should return healthy status when application is running', async () => {
      await controller.check(mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'healthy',
          timestamp: expect.any(String),
        }),
      );
    });

    it('should handle errors gracefully', async () => {
      jest
        .spyOn(service, 'checkHealth')
        .mockRejectedValueOnce(new Error('Service unavailable'));

      await controller.check(mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.SERVICE_UNAVAILABLE,
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'unhealthy',
        }),
      );
    });
  });

  describe('GET /api/health/live', () => {
    it('should return alive status', async () => {
      await controller.live(mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'alive',
        }),
      );
    });

    it('should return dead status when liveness check fails', async () => {
      jest
        .spyOn(service, 'checkLiveness')
        .mockRejectedValueOnce(new Error('Process dead'));

      await controller.live(mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.SERVICE_UNAVAILABLE,
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'dead',
        }),
      );
    });
  });

  describe('GET /api/health/ready', () => {
    it('should return ready status when all dependencies are up', async () => {
      jest.spyOn(service, 'checkReadiness').mockResolvedValueOnce({
        ready: true,
        cosmosdb: { connected: true, latency: 5 },
      });

      await controller.ready(mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ready',
        }),
      );
    });

    it('should return not_ready when dependencies are down', async () => {
      jest.spyOn(service, 'checkReadiness').mockResolvedValueOnce({
        ready: false,
        cosmosdb: { connected: false, error: 'Connection timeout' },
      });

      await controller.ready(mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.SERVICE_UNAVAILABLE,
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'not_ready',
        }),
      );
    });
  });

  describe('GET /api/health/detailed', () => {
    it('should return detailed diagnostics', async () => {
      jest.spyOn(service, 'getDetailedDiagnostics').mockResolvedValueOnce({
        checks: [
          { name: 'nodejs_runtime', status: 'ok' },
          { name: 'memory_usage', status: 'ok' },
          { name: 'environment_configuration', status: 'ok' },
          { name: 'cosmosdb_connectivity', status: 'ok' },
        ],
      });

      await controller.detailed(mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'healthy',
          checks: expect.arrayContaining([
            expect.objectContaining({
              name: expect.any(String),
              status: expect.stringMatching(/ok|warning|error/),
            }),
          ]),
        }),
      );
    });

    it('should return degraded status when checks fail', async () => {
      jest.spyOn(service, 'getDetailedDiagnostics').mockResolvedValueOnce({
        checks: [
          { name: 'nodejs_runtime', status: 'ok' },
          { name: 'memory_usage', status: 'error' },
          { name: 'environment_configuration', status: 'ok' },
          { name: 'cosmosdb_connectivity', status: 'ok' },
        ],
      });

      await controller.detailed(mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.SERVICE_UNAVAILABLE,
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'degraded',
        }),
      );
    });
  });
});
