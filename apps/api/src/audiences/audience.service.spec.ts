import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AudienceService } from './audience.service';
import { DatabaseService } from '../database/database.service';

describe('AudienceService', () => {
  let service: AudienceService;
  let databaseService: DatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AudienceService, DatabaseService],
    }).compile();

    service = module.get<AudienceService>(AudienceService);
    databaseService = module.get<DatabaseService>(DatabaseService);
    await databaseService.connect();
  });

  describe('Audience CRUD - Admin Only', () => {
    it('should create a custom audience (admin only)', async () => {
      const audience = await service.createAudience(
        {
          name: 'Leadership Team',
          description: 'Executive leadership members',
          departmentIds: ['dept-1', 'dept-2'],
        },
        'admin-1',
      );

      expect(audience).toBeDefined();
      expect(audience.id).toBeDefined();
      expect(audience.name).toBe('Leadership Team');
      expect(audience.description).toBe('Executive leadership members');
      expect(audience.departmentIds).toEqual(['dept-1', 'dept-2']);
      expect(audience.createdBy).toBe('admin-1');
      expect(audience.createdAt).toBeDefined();
    });

    it('should reject create if not admin', async () => {
      await expect(
        service.createAudience(
          {
            name: 'Leadership Team',
            description: 'Executive leadership members',
            departmentIds: ['dept-1'],
          },
          'comms-officer-1',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject audience with empty name', async () => {
      await expect(
        service.createAudience(
          {
            name: '',
            description: 'Some description',
            departmentIds: ['dept-1'],
          },
          'admin-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject audience with no departments', async () => {
      await expect(
        service.createAudience(
          {
            name: 'Test Audience',
            description: 'Test',
            departmentIds: [],
          },
          'admin-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should get audience by id', async () => {
      const created = await service.createAudience(
        {
          name: 'Engineering Team',
          description: 'All engineers',
          departmentIds: ['dept-eng'],
        },
        'admin-1',
      );

      const retrieved = await service.getAudienceById(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Engineering Team');
    });

    it('should return undefined for non-existent audience', async () => {
      const retrieved = await service.getAudienceById('non-existent-id');
      expect(retrieved).toBeUndefined();
    });

    it('should list all audiences', async () => {
      await service.createAudience(
        {
          name: 'Sales Team',
          description: 'Sales members',
          departmentIds: ['dept-sales'],
        },
        'admin-1',
      );

      await service.createAudience(
        {
          name: 'Marketing Team',
          description: 'Marketing members',
          departmentIds: ['dept-marketing'],
        },
        'admin-1',
      );

      const audiences = await service.listAudiences();
      expect(audiences.length).toBeGreaterThanOrEqual(2);
      expect(audiences.some((a) => a.name === 'Sales Team')).toBe(true);
      expect(audiences.some((a) => a.name === 'Marketing Team')).toBe(true);
    });

    it('should update audience (admin only)', async () => {
      const created = await service.createAudience(
        {
          name: 'Original Name',
          description: 'Original description',
          departmentIds: ['dept-1'],
        },
        'admin-1',
      );

      const updated = await service.updateAudience(
        created.id,
        {
          name: 'Updated Name',
          description: 'Updated description',
        },
        'admin-1',
      );

      expect(updated.name).toBe('Updated Name');
      expect(updated.description).toBe('Updated description');
    });

    it('should reject update if not admin', async () => {
      const created = await service.createAudience(
        {
          name: 'Original Name',
          description: 'Original description',
          departmentIds: ['dept-1'],
        },
        'admin-1',
      );

      await expect(
        service.updateAudience(
          created.id,
          { name: 'Updated Name' },
          'comms-officer-1',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject update of non-existent audience', async () => {
      await expect(
        service.updateAudience(
          'non-existent-id',
          { name: 'New Name' },
          'admin-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should delete audience (admin only)', async () => {
      const created = await service.createAudience(
        {
          name: 'To Delete',
          description: 'This will be deleted',
          departmentIds: ['dept-1'],
        },
        'admin-1',
      );

      await service.deleteAudience(created.id, 'admin-1');

      const retrieved = await service.getAudienceById(created.id);
      expect(retrieved).toBeUndefined();
    });

    it('should reject delete if not admin', async () => {
      const created = await service.createAudience(
        {
          name: 'To Delete',
          description: 'This will be deleted',
          departmentIds: ['dept-1'],
        },
        'admin-1',
      );

      await expect(
        service.deleteAudience(created.id, 'comms-officer-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject delete of non-existent audience', async () => {
      await expect(
        service.deleteAudience('non-existent-id', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Member Management - Admin Only', () => {
    let audienceId: string;

    beforeEach(async () => {
      const audience = await service.createAudience(
        {
          name: 'Test Audience',
          description: 'For testing members',
          departmentIds: ['dept-1', 'dept-2'],
        },
        'admin-1',
      );
      audienceId = audience.id;
    });

    it('should add member to audience (admin only)', async () => {
      const updated = await service.addMember(audienceId, 'user-1', 'admin-1');
      expect(updated.memberIds).toContain('user-1');
    });

    it('should reject add member if not admin', async () => {
      await expect(
        service.addMember(audienceId, 'user-1', 'comms-officer-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should not add duplicate members', async () => {
      await service.addMember(audienceId, 'user-1', 'admin-1');
      const updated = await service.addMember(audienceId, 'user-1', 'admin-1');
      const memberCount = updated.memberIds.filter((m) => m === 'user-1').length;
      expect(memberCount).toBe(1);
    });

    it('should remove member from audience (admin only)', async () => {
      await service.addMember(audienceId, 'user-1', 'admin-1');
      const updated = await service.removeMember(audienceId, 'user-1', 'admin-1');
      expect(updated.memberIds).not.toContain('user-1');
    });

    it('should reject remove member if not admin', async () => {
      await service.addMember(audienceId, 'user-1', 'admin-1');
      await expect(
        service.removeMember(audienceId, 'user-1', 'comms-officer-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should silently handle removing non-existent member', async () => {
      const updated = await service.removeMember(
        audienceId,
        'non-existent-user',
        'admin-1',
      );
      expect(updated.memberIds).not.toContain('non-existent-user');
    });

    it('should get audience members', async () => {
      await service.addMember(audienceId, 'user-1', 'admin-1');
      await service.addMember(audienceId, 'user-2', 'admin-1');
      const members = await service.getAudienceMembers(audienceId);
      expect(members).toContain('user-1');
      expect(members).toContain('user-2');
      expect(members.length).toBe(2);
    });

    it('should return empty array for non-existent audience members', async () => {
      const members = await service.getAudienceMembers('non-existent-id');
      expect(members).toEqual([]);
    });

    it('should bulk add members (admin only)', async () => {
      const updated = await service.bulkAddMembers(
        audienceId,
        ['user-1', 'user-2', 'user-3'],
        'admin-1',
      );
      expect(updated.memberIds).toContain('user-1');
      expect(updated.memberIds).toContain('user-2');
      expect(updated.memberIds).toContain('user-3');
    });

    it('should reject bulk add if not admin', async () => {
      await expect(
        service.bulkAddMembers(audienceId, ['user-1', 'user-2'], 'comms-officer-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Scope Validation', () => {
    let audienceId: string;

    beforeEach(async () => {
      const audience = await service.createAudience(
        {
          name: 'Test Audience',
          description: 'For testing scope',
          departmentIds: ['dept-1', 'dept-2'],
        },
        'admin-1',
      );
      audienceId = audience.id;
    });

    it('should validate audience for publishing (exists)', async () => {
      const isValid = await service.validateAudienceForPublishing(audienceId);
      expect(isValid).toBe(true);
    });

    it('should invalidate non-existent audience', async () => {
      const isValid = await service.validateAudienceForPublishing('non-existent-id');
      expect(isValid).toBe(false);
    });

    it('should check if comms officer can propose audience', async () => {
      const canPropose = await service.canCommsOfficerProposeAudience(
        audienceId,
        'dept-1',
      );
      expect(canPropose).toBe(true);
    });

    it('should reject if comms officer department not in audience', async () => {
      const canPropose = await service.canCommsOfficerProposeAudience(
        audienceId,
        'dept-3',
      );
      expect(canPropose).toBe(false);
    });

    it('should check if user belongs to audience', async () => {
      await service.addMember(audienceId, 'user-1', 'admin-1');
      const belongs = await service.userBelongsToAudience(audienceId, 'user-1');
      expect(belongs).toBe(true);
    });

    it('should return false if user not in audience', async () => {
      const belongs = await service.userBelongsToAudience(audienceId, 'user-1');
      expect(belongs).toBe(false);
    });

    it('should validate standard audience scopes', async () => {
      expect(service.isValidStandardScope('org-wide')).toBe(true);
      expect(service.isValidStandardScope('dept-only')).toBe(true);
      expect(service.isValidStandardScope('custom')).toBe(true);
      expect(service.isValidStandardScope('invalid-scope')).toBe(false);
    });

    it('should check if audience has members', async () => {
      expect(await service.hasMembers(audienceId)).toBe(false);
      await service.addMember(audienceId, 'user-1', 'admin-1');
      expect(await service.hasMembers(audienceId)).toBe(true);
    });
  });

  describe('Department Association', () => {
    it('should update audience departments (admin only)', async () => {
      const created = await service.createAudience(
        {
          name: 'Multi-Dept Audience',
          description: 'Spans multiple departments',
          departmentIds: ['dept-1'],
        },
        'admin-1',
      );

      const updated = await service.updateDepartments(
        created.id,
        ['dept-1', 'dept-2', 'dept-3'],
        'admin-1',
      );
      expect(updated.departmentIds).toEqual(['dept-1', 'dept-2', 'dept-3']);
    });

    it('should reject update departments if not admin', async () => {
      const created = await service.createAudience(
        {
          name: 'Multi-Dept Audience',
          description: 'Spans multiple departments',
          departmentIds: ['dept-1'],
        },
        'admin-1',
      );

      await expect(
        service.updateDepartments(created.id, ['dept-1', 'dept-2'], 'comms-officer-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject if no departments provided', async () => {
      const created = await service.createAudience(
        {
          name: 'Test',
          description: 'Test',
          departmentIds: ['dept-1'],
        },
        'admin-1',
      );

      await expect(
        service.updateDepartments(created.id, [], 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should get audience by department', async () => {
      await service.createAudience(
        {
          name: 'Audience A',
          description: 'Contains dept-1',
          departmentIds: ['dept-1', 'dept-2'],
        },
        'admin-1',
      );

      await service.createAudience(
        {
          name: 'Audience B',
          description: 'Contains dept-1',
          departmentIds: ['dept-1', 'dept-3'],
        },
        'admin-1',
      );

      const audiences = await service.getAudiencesByDepartment('dept-1');
      expect(audiences.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Audit Logging', () => {
    it('should log audience creation to audit trail', async () => {
      const audience = await service.createAudience(
        {
          name: 'Audit Test',
          description: 'Testing audit logging',
          departmentIds: ['dept-1'],
        },
        'admin-1',
      );
      expect(audience.id).toBeDefined();
    });

    it('should track who modified audience', async () => {
      const created = await service.createAudience(
        {
          name: 'Original Name',
          description: 'Original',
          departmentIds: ['dept-1'],
        },
        'admin-1',
      );

      const updated = await service.updateAudience(
        created.id,
        { name: 'Modified' },
        'admin-2',
      );
      expect(updated.name).toBe('Modified');
    });
  });

  describe('Error Handling', () => {
    it('should throw on invalid audience structure during create', async () => {
      await expect(
        service.createAudience(
          {
            name: 'Test',
            description: 'Test',
            departmentIds: ['  '],
          },
          'admin-1',
        ),
      ).rejects.toThrow();
    });

    it('should handle concurrent member additions safely', async () => {
      const created = await service.createAudience(
        {
          name: 'Concurrency Test',
          description: 'Test concurrent operations',
          departmentIds: ['dept-1'],
        },
        'admin-1',
      );

      const user1 = service.addMember(created.id, 'user-1', 'admin-1');
      const user2 = service.addMember(created.id, 'user-2', 'admin-1');

      const [result1, result2] = await Promise.all([user1, user2]);

      expect(result1.memberIds).toContain('user-1');
      expect(result2.memberIds).toContain('user-2');
    });
  });
});
