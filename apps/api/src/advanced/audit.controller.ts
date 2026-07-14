import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditTrailService } from './audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditQueryDto, AuditEntryDto } from './advanced.dto';

@Controller('api/audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private auditService: AuditTrailService) {}

  @Get()
  async getAuditTrail(
    @Query() query: AuditQueryDto,
  ): Promise<{ success: true; data: { entries: AuditEntryDto[]; total: number; page: number } }> {
    const result = await this.auditService.getAuditTrail(
      { page: query.page, pageSize: query.pageSize },
      { resourceType: query.resourceType, action: query.action },
    );
    return {
      success: true,
      data: { entries: result.entries as AuditEntryDto[], total: result.total, page: query.page },
    };
  }
}
