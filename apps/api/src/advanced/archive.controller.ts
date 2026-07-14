import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ArchiveService } from './archive.service';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { ArchivePostsDto } from './advanced.dto';

@Controller('api/posts/archive')
@UseGuards(JwtAuthGuard)
export class ArchiveController {
  constructor(private archiveService: ArchiveService) {}

  @Post('batch')
  @Roles('ADMIN')
  async archiveOldPosts(
    @Body() dto: ArchivePostsDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<{ success: true; data: { archivedCount: number; timestamp: string } }> {
    const result = await this.archiveService.archiveOldPosts(dto.olderThanDays || 365);
    return { success: true, data: { archivedCount: result.length, timestamp: new Date().toISOString() } };
  }
}
