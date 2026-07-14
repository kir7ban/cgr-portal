import { Test, TestingModule } from '@nestjs/testing';
import { AuditingService } from './auditing.service';
import { DatabaseService } from './database.service';

describe('AuditingService', () => {
  let service: AuditingService;
  let databaseService: DatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditingService, DatabaseService],
    }).compile();

    service = module.get<AuditingService>(AuditingService);
    databaseService = module.get<DatabaseService>(DatabaseService);

    await databaseService.connect();
  });

  describe('logAction', () => {
    it('should create audit entry with correct structure', async () => {
      // RED: Test 1 - logAction() creates audit entry with correct structure
      const result = await service.logAction({
        actor: 'user-123',
        action: 'approve_post',
        resource: 'submission',
        resourceId: 'submission-456',
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.actor).toBe('user-123');
      expect(result.action).toBe('approve_post');
      expect(result.resource).toBe('submission');
      expect(result.resourceId).toBe('submission-456');

      // Verify timestamp is valid ISO 8601 format
      expect(() => new Date(result.timestamp)).not.toThrow();
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });

    it('should generate consistent IDs', async () => {
      // RED: Test 2 - logAction() generates consistent IDs
      const result1 = await service.logAction({
        actor: 'user-1',
        action: 'test_action',
        resource: 'test_resource',
        resourceId: 'test-1',
      });

      const result2 = await service.logAction({
        actor: 'user-2',
        action: 'test_action',
        resource: 'test_resource',
        resourceId: 'test-2',
      });

      // IDs should be unique
      expect(result1.id).not.toBe(result2.id);

      // IDs should follow consistent format: audit-{timestamp}-{random}
      expect(result1.id).toMatch(/^audit-\d+-[a-z0-9]+$/);
      expect(result2.id).toMatch(/^audit-\d+-[a-z0-9]+$/);
    });

    it('should return stored entry', async () => {
      // RED: Test 3 - logAction() returns stored entry
      const input = {
        actor: 'admin-user',
        action: 'revoke_post',
        resource: 'post',
        resourceId: 'post-789',
      };

      const result = await service.logAction(input);

      // Result should match input
      expect(result.actor).toBe(input.actor);
      expect(result.action).toBe(input.action);
      expect(result.resource).toBe(input.resource);
      expect(result.resourceId).toBe(input.resourceId);
    });

    it('should handle action without resourceId', async () => {
      const result = await service.logAction({
        actor: 'system',
        action: 'system_startup',
        resource: 'system',
      });

      expect(result).toBeDefined();
      expect(result.resourceId).toBeUndefined();
    });

    it('should handle multiple rapid calls', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          service.logAction({
            actor: `user-${i}`,
            action: 'test_action',
            resource: 'test',
            resourceId: `resource-${i}`,
          }),
        );
      }

      const results = await Promise.all(promises);

      // All should succeed
      expect(results).toHaveLength(10);

      // All IDs should be unique
      const ids = results.map((r) => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);
    });
  });
});
