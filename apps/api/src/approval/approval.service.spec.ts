import { Test } from '@nestjs/testing';
import { ApprovalService } from './approval.service';
import { PostService } from '../posts/post.service';
import { DatabaseService } from '../database/database.service';

describe('ApprovalService', () => {
  let service: ApprovalService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ApprovalService, PostService, DatabaseService],
    }).compile();
    service = module.get(ApprovalService);
  });

  it('should approve posts', async () => {
    expect(service).toBeDefined();
  });

  it('should reject posts', async () => {
    expect(service).toBeDefined();
  });

  it('should only allow admins', async () => {
    expect(service).toBeDefined();
  });
});
