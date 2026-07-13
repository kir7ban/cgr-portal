import { Module } from '@nestjs/common';
import { PostModule } from '../posts/post.module';
import { DatabaseModule } from '../database/database.module';
import { EditService } from './edit.service';
import { RevocationService } from './revoke.service';
import { ArchiveService } from './archive.service';
import { AuditTrailService } from './audit.service';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [PostModule, DatabaseModule],
  providers: [EditService, RevocationService, ArchiveService, AuditTrailService, AnalyticsService],
  exports: [EditService, RevocationService, ArchiveService, AuditTrailService, AnalyticsService],
})
export class AdvancedModule {}
