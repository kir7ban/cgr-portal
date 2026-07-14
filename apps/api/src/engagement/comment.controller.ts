import { Controller, Post, Get, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AddCommentDto, CommentResponseDto } from './engagement.dto';

@Controller('api/posts/:postId/comments')
@UseGuards(JwtAuthGuard)
export class CommentController {
  constructor(private commentService: CommentService) {}

  @Post()
  async addComment(
    @Param('postId') postId: string,
    @Body() dto: AddCommentDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<{ success: true; data: CommentResponseDto }> {
    const result = await this.commentService.addComment(postId, user.userId, dto.content);
    return { success: true, data: result as CommentResponseDto };
  }

  @Get()
  async getComments(
    @Param('postId') postId: string,
  ): Promise<{ success: true; data: CommentResponseDto[] }> {
    const result = await this.commentService.getComments(postId);
    return { success: true, data: result as CommentResponseDto[] };
  }

  @Delete(':commentId')
  async deleteComment(
    @Param('postId') postId: string,
    @Param('commentId') commentId: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<{ success: true; data: { deleted: true } }> {
    await this.commentService.deleteComment(commentId, user.userId);
    return { success: true, data: { deleted: true } };
  }
}
