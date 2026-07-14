import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ShareService } from './share.service';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SharePostDto, ShareResponseDto } from './engagement.dto';

@Controller('api/posts/:postId/share')
@UseGuards(JwtAuthGuard)
export class ShareController {
  constructor(private shareService: ShareService) {}

  @Post()
  async sharePost(
    @Param('postId') postId: string,
    @Body() dto: SharePostDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<{ success: true; data: ShareResponseDto }> {
    const result = await this.shareService.sharePost(postId, user.userId, dto.recipientIds, dto.message);
    return { success: true, data: result as ShareResponseDto };
  }
}
