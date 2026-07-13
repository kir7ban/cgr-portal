import { Injectable } from '@nestjs/common';
@Injectable()
export class FeedService {
  async getPublishedFeed(userId: string, options: { page?: number } = {}) {
    return { posts: [], total: 0, page: options.page || 1 };
  }
}
