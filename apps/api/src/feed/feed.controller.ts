import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { FeedService } from './feed.service';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FeedQueryDto, PaginatedFeedResponseDto } from './feed.dto';

@Controller('api/feed')
@UseGuards(JwtAuthGuard)
export class FeedController {
  constructor(private feedService: FeedService) {}

  @Get()
  async getFeed(
    @Query() query: FeedQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<{ success: true; data: PaginatedFeedResponseDto }> {
    const result = await this.feedService.getPublishedFeed(
      user.userId,
      { page: query.page, pageSize: query.pageSize },
      { audiences: query.audiences, excludeArchived: query.excludeArchived },
    );
    return { success: true, data: result };
  }
}
