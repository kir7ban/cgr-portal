import { Injectable } from '@nestjs/common';
@Injectable()
export class AnalyticsService {
  async getDailyMetrics(date: string) {
    return { date, posts: { count: 0 }, submissions: { count: 0 } };
  }
}
