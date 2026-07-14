import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApprovalService } from './approval.service';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import {
  ApprovalRequestDto,
  RejectRequestDto,
  FeedbackRequestDto,
  OverrideRequestDto,
  SubmissionResponseDto,
} from './approval.dto';

@Controller('api/submissions')
@UseGuards(JwtAuthGuard)
export class ApprovalController {
  constructor(private approvalService: ApprovalService) {}

  @Post(':submissionId/approve')
  @Roles('ADMIN')
  async approve(
    @Param('submissionId') submissionId: string,
    @Body() dto: ApprovalRequestDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<{ success: true; data: SubmissionResponseDto }> {
    const result = await this.approvalService.approve(submissionId, user.userId, dto);
    return { success: true, data: result as SubmissionResponseDto };
  }

  @Post(':submissionId/reject')
  @Roles('ADMIN')
  async reject(
    @Param('submissionId') submissionId: string,
    @Body() dto: RejectRequestDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<{ success: true; data: SubmissionResponseDto }> {
    const result = await this.approvalService.reject(submissionId, user.userId, dto);
    return { success: true, data: result as SubmissionResponseDto };
  }

  @Post(':submissionId/feedback')
  @Roles('ADMIN')
  async sendFeedback(
    @Param('submissionId') submissionId: string,
    @Body() dto: FeedbackRequestDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<{ success: true; data: SubmissionResponseDto }> {
    const result = await this.approvalService.sendFeedback(submissionId, user.userId, dto);
    return { success: true, data: result as SubmissionResponseDto };
  }

  @Post(':submissionId/override')
  @Roles('ADMIN')
  async override(
    @Param('submissionId') submissionId: string,
    @Body() dto: OverrideRequestDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<{ success: true; data: SubmissionResponseDto }> {
    const result = await this.approvalService.override(submissionId, user.userId, dto);
    return { success: true, data: result as SubmissionResponseDto };
  }

  @Post(':submissionId/pending-review')
  @Roles('ADMIN')
  async markPendingReview(
    @Param('submissionId') submissionId: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<{ success: true; data: SubmissionResponseDto }> {
    const result = await this.approvalService.markPendingReview(submissionId, user.userId);
    return { success: true, data: result as SubmissionResponseDto };
  }

  @Get('queue')
  @Roles('ADMIN')
  async getQueue(): Promise<{ success: true; data: SubmissionResponseDto[] }> {
    const result = await this.approvalService.getApprovalQueue();
    return { success: true, data: result as SubmissionResponseDto[] };
  }

  @Get('pending-review')
  @Roles('ADMIN')
  async getPendingReview(): Promise<{ success: true; data: SubmissionResponseDto[] }> {
    const result = await this.approvalService.getPendingReviewSubmissions();
    return { success: true, data: result as SubmissionResponseDto[] };
  }

  @Get(':submissionId')
  @Roles('ADMIN')
  async getSubmission(
    @Param('submissionId') submissionId: string,
  ): Promise<{ success: true; data: SubmissionResponseDto }> {
    const result = await this.approvalService.getSubmission(submissionId);
    return { success: true, data: result as SubmissionResponseDto };
  }
}
