import { Test } from '@nestjs/testing';
import { FeedService } from './feed.service';

describe('FeedService', () => {
  let service: FeedService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [FeedService],
    }).compile();
    service = module.get(FeedService);
  });

  it('should get published feed', async () => {
    const result = await service.getPublishedFeed('user-1');
    expect(result).toBeDefined();
  });

  it('should support pagination', async () => {
    const result = await service.getPublishedFeed('user-1', { page: 1 });
    expect(result.page).toBe(1);
  });
});
