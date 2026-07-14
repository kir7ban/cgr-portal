import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { RevocationService } from './revoke.service';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RevokePostDto } from './advanced.dto';

@Controller('api/posts/:postId/revoke')
@UseGuards(JwtAuthGuard)
export class RevokeController {
  constructor(private revocationService: RevocationService) {}

  @Post()
  @Roles('ADMIN')
  async revokePost(
    @Param('postId') postId: string,
    @Body() dto: RevokePostDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<{ success: true; data: { postId: string; state: string; revokedAt: string } }> {
    const result = await this.revocationService.revokePost(postId, user.userId, dto.reason);
    return { success: true, data: { postId: result.id, state: result.state, revokedAt: new Date().toISOString() } };
  }
}
