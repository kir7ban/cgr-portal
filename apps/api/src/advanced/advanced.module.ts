import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { PostModule } from '../posts/post.module';
import { FeedModule } from '../feed/feed.module';
import { EditService } from './edit.service';
import { RevocationService } from './revoke.service';
import { ArchiveService } from './archive.service';
import { AuditTrailService } from './audit.service';
import { AnalyticsService } from './analytics.service';
import { EditController } from './edit.controller';
import { RevokeController } from './revoke.controller';
import { ArchiveController } from './archive.controller';
import { AuditController } from './audit.controller';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports: [DatabaseModule, PostModule, FeedModule],
  providers: [EditService, RevocationService, ArchiveService, AuditTrailService, AnalyticsService],
  controllers: [EditController, RevokeController, ArchiveController, AuditController, AnalyticsController],
  exports: [EditService, RevocationService, ArchiveService, AuditTrailService, AnalyticsService],
})
export class AdvancedModule {}
