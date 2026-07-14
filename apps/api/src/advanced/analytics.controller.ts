import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { MetricsDto } from './advanced.dto';

@Controller('api/analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('metrics')
  @Roles('ADMIN')
  async getDailyMetrics(
    @Query('date') date?: string,
  ): Promise<{ success: true; data: MetricsDto }> {
    const result = await this.analyticsService.getDailyMetrics(date || new Date().toISOString().split('T')[0]);
    return { success: true, data: result as MetricsDto };
  }
}
