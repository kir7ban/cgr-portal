import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { AudienceService } from './audience.service';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateAudienceDto, AddMemberDto, AudienceResponseDto } from './audience.dto';

@Controller('api/audiences')
@UseGuards(JwtAuthGuard)
export class AudienceController {
  constructor(private audienceService: AudienceService) {}

  @Post()
  @Roles('ADMIN')
  async createAudience(
    @Body() dto: CreateAudienceDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<{ success: true; data: AudienceResponseDto }> {
    const result = await this.audienceService.createAudience(
      dto.name,
      dto.description,
      dto.memberIds,
      user.userId,
    );
    return { success: true, data: result as AudienceResponseDto };
  }

  @Post(':audienceId/members')
  @Roles('ADMIN')
  async addMember(
    @Param('audienceId') audienceId: string,
    @Body() dto: AddMemberDto,
  ): Promise<{ success: true; data: AudienceResponseDto }> {
    const result = await this.audienceService.addMember(audienceId, dto.memberId);
    return { success: true, data: result as AudienceResponseDto };
  }

  @Get()
  @Roles('ADMIN')
  async listAudiences(): Promise<{ success: true; data: AudienceResponseDto[] }> {
    const result = await this.audienceService.listAudiences();
    return { success: true, data: result as AudienceResponseDto[] };
  }
}
