import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { PostService } from './post.service';

@Module({
  imports: [DatabaseModule],
  providers: [PostService],
  exports: [PostService],
})
export class PostModule {}
