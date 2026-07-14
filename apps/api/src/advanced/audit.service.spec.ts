import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AuditTrailService, AuditFilterOptions, PaginationParams } from './audit.service';
import { DatabaseService } from '../database/database.service';

describe('AuditTrailService (Issue #17)', () => {
  let service: AuditTrailService;
  let databaseService: DatabaseService;

  beforeEach(async () => {
    databaseService = new DatabaseService();
    await databaseService.connect();
    service = new AuditTrailService(databaseService);
  });

  describe('Access Control', () => {
    describe('getAuditTrail() - Admin-Only Access', () => {
      it('should allow admin to retrieve audit trail', async () => {
        const result = await service.getAuditTrail('admin', {
          page: 1,
          pageSize: 20,
        });

        expect(result).toBeDefined();
        expect(result.entries).toBeDefined();
        expect(Array.isArray(result.entries)).toBe(true);
      });

      it('should allow alternative admin identifier', async () => {
        const result = await service.getAuditTrail('admin@bosch.com', {
          page: 1,
          pageSize: 20,
        });

        expect(result).toBeDefined();
        expect(result.entries).toBeDefined();
      });

      it('should reject non-admin user with ForbiddenException', async () => {
        expect(
          service.getAuditTrail('alice.smith', {
            page: 1,
            pageSize: 20,
          }),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should reject employee user with ForbiddenException', async () => {
        expect(
          service.getAuditTrail('employee', {
            page: 1,
            pageSize: 20,
          }),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should reject comms officer with ForbiddenException', async () => {
        expect(
          service.getAuditTrail('comms-officer', {
            page: 1,
            pageSize: 20,
          }),
        ).rejects.toThrow(ForbiddenException);
      });
    });
  });

  describe('Pagination', () => {
    beforeEach(async () => {
      // Add sample audit entries for pagination testing
      for (let i = 0; i < 35; i++) {
        await service.addAuditEntry({
          id: `audit-${i}`,
          timestamp: new Date(2026, 6, 13 - Math.floor(i / 5)).toISOString(),
          actor: i % 2 === 0 ? 'alice.smith' : 'bob.jones',
          action: i % 3 === 0 ? 'POST_APPROVED' : 'COMMENT_DELETED',
          resource: 'post',
          resourceId: `post-${i}`,
        });
      }
    });

    describe('Page Navigation', () => {
      it('should return first page with correct metadata', async () => {
        const result = await service.getAuditTrail('admin', {
          page: 1,
          pageSize: 10,
        });

        expect(result.pageNumber).toBe(1);
        expect(result.pageSize).toBe(10);
        expect(result.entries.length).toBe(10);
        expect(result.hasNextPage).toBe(true);
        expect(result.hasPreviousPage).toBe(false);
      });

      it('should return last page with correct metadata', async () => {
        const result = await service.getAuditTrail('admin', {
          page: 4,
          pageSize: 10,
        });

        expect(result.pageNumber).toBe(4);
        expect(result.entries.length).toBeLessThanOrEqual(10);
        expect(result.hasNextPage).toBe(false);
        expect(result.hasPreviousPage).toBe(true);
      });

      it('should return middle page with both navigation flags true', async () => {
        const result = await service.getAuditTrail('admin', {
          page: 2,
          pageSize: 10,
        });

        expect(result.pageNumber).toBe(2);
        expect(result.hasNextPage).toBe(true);
        expect(result.hasPreviousPage).toBe(true);
      });

      it('should calculate totalPages correctly', async () => {
        const result = await service.getAuditTrail('admin', {
          page: 1,
          pageSize: 10,
        });

        expect(result.totalPages).toBe(4); // 35 items / 10 per page = 4 pages
      });

      it('should return total count of all matching entries', async () => {
        const result = await service.getAuditTrail('admin', {
          page: 1,
          pageSize: 10,
        });

        expect(result.totalCount).toBe(35);
      });
    });

    describe('Pagination Validation', () => {
      it('should reject page < 1', async () => {
        expect(
          service.getAuditTrail('admin', {
            page: 0,
            pageSize: 20,
          }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject negative page', async () => {
        expect(
          service.getAuditTrail('admin', {
            page: -1,
            pageSize: 20,
          }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject non-integer page', async () => {
        expect(
          service.getAuditTrail('admin', {
            page: 1.5 as any,
            pageSize: 20,
          }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject pageSize < 1', async () => {
        expect(
          service.getAuditTrail('admin', {
            page: 1,
            pageSize: 0,
          }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject pageSize > 100', async () => {
        expect(
          service.getAuditTrail('admin', {
            page: 1,
            pageSize: 101,
          }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject non-integer pageSize', async () => {
        expect(
          service.getAuditTrail('admin', {
            page: 1,
            pageSize: 20.5 as any,
          }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject null pagination params', async () => {
        expect(
          service.getAuditTrail('admin', null as any, undefined),
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject undefined pagination params', async () => {
        expect(
          service.getAuditTrail('admin', undefined as any, undefined),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('Offset Calculation', () => {
      it('should return correct items for page 1', async () => {
        const result = await service.getAuditTrail('admin', {
          page: 1,
          pageSize: 5,
        });

        expect(result.entries.length).toBe(5);
      });

      it('should return correct items for page 2', async () => {
        const page1 = await service.getAuditTrail('admin', {
          page: 1,
          pageSize: 5,
        });
        const page2 = await service.getAuditTrail('admin', {
          page: 2,
          pageSize: 5,
        });

        // Entries should be different between pages
        const page1Ids = page1.entries.map((e) => e.id);
        const page2Ids = page2.entries.map((e) => e.id);
        expect(page1Ids).not.toEqual(page2Ids);
      });
    });
  });

  describe('Sorting', () => {
    beforeEach(async () => {
      // Add entries with specific timestamps to verify sorting
      const dates = [
        '2026-07-01T10:00:00Z',
        '2026-07-10T15:30:00Z',
        '2026-07-05T12:00:00Z',
        '2026-07-13T23:59:59Z',
        '2026-07-13T00:00:00Z',
      ];

      for (let i = 0; i < dates.length; i++) {
        await service.addAuditEntry({
          id: `audit-${i}`,
          timestamp: dates[i],
          actor: 'admin',
          action: 'POST_APPROVED',
          resource: 'post',
          resourceId: `post-${i}`,
        });
      }
    });

    it('should sort entries chronologically (newest first)', async () => {
      const result = await service.getAuditTrail('admin', {
        page: 1,
        pageSize: 100,
      });

      // Verify descending timestamp order
      for (let i = 0; i < result.entries.length - 1; i++) {
        const current = new Date(result.entries[i].timestamp).getTime();
        const next = new Date(result.entries[i + 1].timestamp).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });

    it('should place newest entry first', async () => {
      const result = await service.getAuditTrail('admin', {
        page: 1,
        pageSize: 100,
      });

      expect(result.entries[0].timestamp).toBe('2026-07-13T23:59:59Z');
    });

    it('should place oldest entry last', async () => {
      const result = await service.getAuditTrail('admin', {
        page: 1,
        pageSize: 100,
      });

      expect(result.entries[result.entries.length - 1].timestamp).toBe('2026-07-01T10:00:00Z');
    });
  });

  describe('Date Range Filtering', () => {
    beforeEach(async () => {
      const dates = [
        '2026-06-30T00:00:00Z',
        '2026-07-01T10:00:00Z',
        '2026-07-05T12:00:00Z',
        '2026-07-10T15:30:00Z',
        '2026-07-13T23:59:59Z',
        '2026-07-15T00:00:00Z',
      ];

      for (let i = 0; i < dates.length; i++) {
        await service.addAuditEntry({
          id: `audit-${i}`,
          timestamp: dates[i],
          actor: 'admin',
          action: 'POST_APPROVED',
          resource: 'post',
          resourceId: `post-${i}`,
        });
      }
    });

    describe('Single Date Filter', () => {
      it('should filter by dateFrom (inclusive)', async () => {
        const result = await service.getAuditTrail(
          'admin',
          { page: 1, pageSize: 100 },
          { dateFrom: '2026-07-05T00:00:00Z' },
        );

        expect(result.totalCount).toBe(4); // 2026-07-05 onwards (5, 10, 13, 15)
        expect(
          result.entries.every(
            (e) => new Date(e.timestamp).getTime() >= new Date('2026-07-05T00:00:00Z').getTime(),
          ),
        ).toBe(true);
      });

      it('should filter by dateTo (inclusive)', async () => {
        const result = await service.getAuditTrail(
          'admin',
          { page: 1, pageSize: 100 },
          { dateTo: '2026-07-10T23:59:59Z' },
        );

        expect(result.totalCount).toBe(4); // Up to 2026-07-10 (30, 01, 05, 10)
        expect(
          result.entries.every(
            (e) => new Date(e.timestamp).getTime() <= new Date('2026-07-10T23:59:59Z').getTime(),
          ),
        ).toBe(true);
      });

      it('should support dateFrom without dateTo', async () => {
        const result = await service.getAuditTrail(
          'admin',
          { page: 1, pageSize: 100 },
          { dateFrom: '2026-07-13T00:00:00Z' },
        );

        expect(result.totalCount).toBeGreaterThan(0);
      });

      it('should support dateTo without dateFrom', async () => {
        const result = await service.getAuditTrail(
          'admin',
          { page: 1, pageSize: 100 },
          { dateTo: '2026-07-05T00:00:00Z' },
        );

        expect(result.totalCount).toBeGreaterThan(0);
      });
    });

    describe('Date Range Filter', () => {
      it('should filter by date range (both inclusive)', async () => {
        const result = await service.getAuditTrail(
          'admin',
          { page: 1, pageSize: 100 },
          {
            dateFrom: '2026-07-05T00:00:00Z',
            dateTo: '2026-07-10T23:59:59Z',
          },
        );

        expect(result.totalCount).toBe(2); // 2026-07-05, 2026-07-10
        expect(
          result.entries.every(
            (e) =>
              new Date(e.timestamp).getTime() >= new Date('2026-07-05T00:00:00Z').getTime() &&
              new Date(e.timestamp).getTime() <= new Date('2026-07-10T23:59:59Z').getTime(),
          ),
        ).toBe(true);
      });

      it('should exclude entries outside date range', async () => {
        const result = await service.getAuditTrail(
          'admin',
          { page: 1, pageSize: 100 },
          {
            dateFrom: '2026-07-05T00:00:00Z',
            dateTo: '2026-07-10T23:59:59Z',
          },
        );

        expect(
          result.entries.some((e) => e.timestamp === '2026-06-30T00:00:00Z'),
        ).toBe(false);
        expect(result.entries.some((e) => e.timestamp === '2026-07-15T00:00:00Z')).toBe(false);
      });
    });

    describe('Date Filter Validation', () => {
      it('should reject invalid dateFrom format', async () => {
        expect(
          service.getAuditTrail(
            'admin',
            { page: 1, pageSize: 100 },
            { dateFrom: 'invalid-date' },
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject invalid dateTo format', async () => {
        expect(
          service.getAuditTrail(
            'admin',
            { page: 1, pageSize: 100 },
            { dateTo: 'not-a-date' },
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('should accept valid ISO 8601 dateFrom', async () => {
        const result = await service.getAuditTrail(
          'admin',
          { page: 1, pageSize: 100 },
          { dateFrom: '2026-07-01T00:00:00Z' },
        );

        expect(result).toBeDefined();
      });

      it('should accept valid ISO 8601 dateTo', async () => {
        const result = await service.getAuditTrail(
          'admin',
          { page: 1, pageSize: 100 },
          { dateTo: '2026-07-13T23:59:59Z' },
        );

        expect(result).toBeDefined();
      });
    });

    describe('Boundary Cases', () => {
      it('should include entry at exact dateFrom boundary', async () => {
        const result = await service.getAuditTrail(
          'admin',
          { page: 1, pageSize: 100 },
          { dateFrom: '2026-07-05T12:00:00Z' },
        );

        expect(result.entries.some((e) => e.timestamp === '2026-07-05T12:00:00Z')).toBe(true);
      });

      it('should include entry at exact dateTo boundary', async () => {
        const result = await service.getAuditTrail(
          'admin',
          { page: 1, pageSize: 100 },
          { dateTo: '2026-07-05T12:00:00Z' },
        );

        expect(result.entries.some((e) => e.timestamp === '2026-07-05T12:00:00Z')).toBe(true);
      });
    });
  });

  describe('Actor Filtering', () => {
    beforeEach(async () => {
      const actors = ['alice.smith', 'bob.jones', 'carol.white', 'alice.smith', 'bob.jones'];

      for (let i = 0; i < actors.length; i++) {
        await service.addAuditEntry({
          id: `audit-${i}`,
          timestamp: new Date(2026, 6, 13 - i).toISOString(),
          actor: actors[i],
          action: 'POST_APPROVED',
          resource: 'post',
          resourceId: `post-${i}`,
        });
      }
    });

    it('should filter by actor (exact match)', async () => {
      const result = await service.getAuditTrail(
        'admin',
        { page: 1, pageSize: 100 },
        { actor: 'alice.smith' },
      );

      expect(result.totalCount).toBe(2);
      expect(result.entries.every((e) => e.actor === 'alice.smith')).toBe(true);
    });

    it('should return empty result if no entries match actor', async () => {
      const result = await service.getAuditTrail(
        'admin',
        { page: 1, pageSize: 100 },
        { actor: 'nonexistent.user' },
      );

      expect(result.totalCount).toBe(0);
      expect(result.entries.length).toBe(0);
    });

    it('should be case-sensitive for actor matching', async () => {
      const result = await service.getAuditTrail(
        'admin',
        { page: 1, pageSize: 100 },
        { actor: 'ALICE.SMITH' },
      );

      expect(result.totalCount).toBe(0);
    });

    it('should reject empty actor string', async () => {
      expect(
        service.getAuditTrail(
          'admin',
          { page: 1, pageSize: 100 },
          { actor: '' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject whitespace-only actor string', async () => {
      expect(
        service.getAuditTrail(
          'admin',
          { page: 1, pageSize: 100 },
          { actor: '   ' },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Action Filtering', () => {
    beforeEach(async () => {
      const actions = ['POST_APPROVED', 'COMMENT_DELETED', 'POST_REJECTED', 'POST_APPROVED', 'SHARE_POST'];

      for (let i = 0; i < actions.length; i++) {
        await service.addAuditEntry({
          id: `audit-${i}`,
          timestamp: new Date(2026, 6, 13 - i).toISOString(),
          actor: 'admin',
          action: actions[i],
          resource: 'post',
          resourceId: `post-${i}`,
        });
      }
    });

    it('should filter by action (exact match)', async () => {
      const result = await service.getAuditTrail(
        'admin',
        { page: 1, pageSize: 100 },
        { action: 'POST_APPROVED' },
      );

      expect(result.totalCount).toBe(2);
      expect(result.entries.every((e) => e.action === 'POST_APPROVED')).toBe(true);
    });

    it('should return empty result if no entries match action', async () => {
      const result = await service.getAuditTrail(
        'admin',
        { page: 1, pageSize: 100 },
        { action: 'NONEXISTENT_ACTION' },
      );

      expect(result.totalCount).toBe(0);
      expect(result.entries.length).toBe(0);
    });

    it('should be case-sensitive for action matching', async () => {
      const result = await service.getAuditTrail(
        'admin',
        { page: 1, pageSize: 100 },
        { action: 'post_approved' },
      );

      expect(result.totalCount).toBe(0);
    });

    it('should reject empty action string', async () => {
      expect(
        service.getAuditTrail(
          'admin',
          { page: 1, pageSize: 100 },
          { action: '' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject whitespace-only action string', async () => {
      expect(
        service.getAuditTrail(
          'admin',
          { page: 1, pageSize: 100 },
          { action: '   ' },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Combined Filtering', () => {
    beforeEach(async () => {
      const entries = [
        {
          timestamp: '2026-07-01T10:00:00Z',
          actor: 'alice.smith',
          action: 'POST_APPROVED',
        },
        {
          timestamp: '2026-07-05T12:00:00Z',
          actor: 'bob.jones',
          action: 'POST_APPROVED',
        },
        {
          timestamp: '2026-07-10T15:30:00Z',
          actor: 'alice.smith',
          action: 'COMMENT_DELETED',
        },
        {
          timestamp: '2026-07-13T23:59:59Z',
          actor: 'carol.white',
          action: 'POST_APPROVED',
        },
      ];

      for (let i = 0; i < entries.length; i++) {
        await service.addAuditEntry({
          id: `audit-${i}`,
          timestamp: entries[i].timestamp,
          actor: entries[i].actor,
          action: entries[i].action,
          resource: 'post',
          resourceId: `post-${i}`,
        });
      }
    });

    it('should apply date + actor filter together', async () => {
      const result = await service.getAuditTrail(
        'admin',
        { page: 1, pageSize: 100 },
        {
          dateFrom: '2026-07-05T00:00:00Z',
          dateTo: '2026-07-13T23:59:59Z',
          actor: 'alice.smith',
        },
      );

      expect(result.totalCount).toBe(1);
      expect(result.entries[0].timestamp).toBe('2026-07-10T15:30:00Z');
      expect(result.entries[0].actor).toBe('alice.smith');
    });

    it('should apply date + action filter together', async () => {
      const result = await service.getAuditTrail(
        'admin',
        { page: 1, pageSize: 100 },
        {
          dateFrom: '2026-07-05T00:00:00Z',
          action: 'POST_APPROVED',
        },
      );

      expect(result.totalCount).toBe(2);
      expect(result.entries.every((e) => e.action === 'POST_APPROVED')).toBe(true);
      expect(
        result.entries.every(
          (e) => new Date(e.timestamp).getTime() >= new Date('2026-07-05T00:00:00Z').getTime(),
        ),
      ).toBe(true);
    });

    it('should apply actor + action filter together', async () => {
      const result = await service.getAuditTrail(
        'admin',
        { page: 1, pageSize: 100 },
        {
          actor: 'alice.smith',
          action: 'POST_APPROVED',
        },
      );

      expect(result.totalCount).toBe(1);
      expect(result.entries[0].actor).toBe('alice.smith');
      expect(result.entries[0].action).toBe('POST_APPROVED');
    });

    it('should apply all filters together', async () => {
      const result = await service.getAuditTrail(
        'admin',
        { page: 1, pageSize: 100 },
        {
          dateFrom: '2026-07-01T00:00:00Z',
          dateTo: '2026-07-10T23:59:59Z',
          actor: 'alice.smith',
          action: 'POST_APPROVED',
        },
      );

      expect(result.totalCount).toBe(1);
      expect(result.entries[0].timestamp).toBe('2026-07-01T10:00:00Z');
      expect(result.entries[0].actor).toBe('alice.smith');
      expect(result.entries[0].action).toBe('POST_APPROVED');
    });
  });

  describe('Immutability', () => {
    it('should prevent deletes on audit entries', async () => {
      await service.addAuditEntry({
        id: 'audit-1',
        timestamp: new Date().toISOString(),
        actor: 'admin',
        action: 'POST_APPROVED',
        resource: 'post',
        resourceId: 'post-1',
      });

      expect(databaseService.deleteAudit('audit-1')).rejects.toThrow(
        'Audit entries cannot be deleted',
      );
    });

    it('should prevent updates on audit entries', async () => {
      await service.addAuditEntry({
        id: 'audit-1',
        timestamp: new Date().toISOString(),
        actor: 'admin',
        action: 'POST_APPROVED',
        resource: 'post',
        resourceId: 'post-1',
      });

      expect(
        databaseService.updateAudit('audit-1', { action: 'MODIFIED_ACTION' }),
      ).rejects.toThrow('Audit entries cannot be modified');
    });
  });
});
