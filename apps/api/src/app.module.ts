import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { DomainModule } from './domain/domain.module';
import { PostModule } from './posts/post.module';
import { ApprovalModule } from './approval/approval.module';
import { FeedModule } from './feed/feed.module';
import { AudienceModule } from './audiences/audience.module';
import { EngagementModule } from './engagement/engagement.module';
import { AdvancedModule } from './advanced/advanced.module';
import { HealthModule } from './health/health.module';
import { ErrorHandlingMiddleware } from './common/error-handling.middleware';

@Module({
  imports: [
    AuthModule,
    DatabaseModule,
    DomainModule,
    PostModule,
    ApprovalModule,
    FeedModule,
    AudienceModule,
    EngagementModule,
    AdvancedModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: ErrorHandlingMiddleware,
    },
  ],
})
export class AppModule {}
