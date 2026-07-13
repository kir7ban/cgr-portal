import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { PostModule } from './posts/post.module';
import { ApprovalModule } from './approval/approval.module';
import { FeedModule } from './feed/feed.module';
import { AudienceModule } from './audiences/audience.module';
import { EngagementModule } from './engagement/engagement.module';
import { AdvancedModule } from './advanced/advanced.module';

@Module({
  imports: [
    AuthModule,
    DatabaseModule,
    PostModule,
    ApprovalModule,
    FeedModule,
    AudienceModule,
    EngagementModule,
    AdvancedModule,
  ],
})
export class AppModule {}
