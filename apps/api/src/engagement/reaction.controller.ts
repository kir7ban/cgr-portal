import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ReactionService } from './reaction.service';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AddReactionDto, ReactionsAggregateDto } from './engagement.dto';

@Controller('api/posts/:postId/reactions')
@UseGuards(JwtAuthGuard)
export class ReactionController {
  constructor(private reactionService: ReactionService) {}

  @Post()
  async addReaction(
    @Param('postId') postId: string,
    @Body() dto: AddReactionDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<{ success: true; data: { postId: string; emoji: string; createdAt: string } }> {
    const result = await this.reactionService.addReaction(postId, user.userId, dto.emoji);
    return { success: true, data: { postId: result.postId, emoji: result.emoji, createdAt: result.createdAt } };
  }

  @Get()
  async getReactions(
    @Param('postId') postId: string,
  ): Promise<{ success: true; data: ReactionsAggregateDto }> {
    const result = await this.reactionService.getReactions(postId);
    return { success: true, data: result as ReactionsAggregateDto };
  }
}
