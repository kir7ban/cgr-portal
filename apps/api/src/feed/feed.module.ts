import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { FeedService } from './feed.service';
import { FeedController } from './feed.controller';

@Module({
  imports: [DatabaseModule],
  providers: [FeedService],
  controllers: [FeedController],
  exports: [FeedService],
})
export class FeedModule {}
