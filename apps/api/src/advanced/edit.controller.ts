import { Controller, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { EditService } from './edit.service';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { EditPostDto } from './advanced.dto';

@Controller('api/posts/:postId')
@UseGuards(JwtAuthGuard)
export class EditController {
  constructor(private editService: EditService) {}

  @Patch()
  @Roles('COMMS_OFFICER')
  async editPost(
    @Param('postId') postId: string,
    @Body() dto: EditPostDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<{ success: true; data: { postId: string; state: string; reapprovalRequired: boolean } }> {
    const result = await this.editService.editPublishedPost(postId, user.userId, dto);
    return {
      success: true,
      data: { postId: result.id, state: result.state, reapprovalRequired: result.state === 'SUBMITTED' },
    };
  }
}
