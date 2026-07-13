import { Test } from '@nestjs/testing';
import { EditService } from './edit.service';
import { RevocationService } from './revoke.service';
import { ArchiveService } from './archive.service';
import { AuditTrailService } from './audit.service';
import { AnalyticsService } from './analytics.service';
import { PostService } from '../posts/post.service';
import { DatabaseService } from '../database/database.service';

describe('AdvancedServices', () => {
  let edit: EditService;
  let revoke: RevocationService;
  let archive: ArchiveService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [EditService, RevocationService, ArchiveService, AuditTrailService, AnalyticsService, PostService, DatabaseService],
    }).compile();
    edit = module.get(EditService);
    revoke = module.get(RevocationService);
    archive = module.get(ArchiveService);
  });

  it('should support all advanced features', () => {
    expect(edit).toBeDefined();
    expect(revoke).toBeDefined();
    expect(archive).toBeDefined();
  });
});
