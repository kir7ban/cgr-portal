import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { PostService } from './post.service';
import { PostCreationService } from './post-creation.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  providers: [PostService, PostCreationService],
  exports: [PostService, PostCreationService],
})
export class PostModule {}
