import { Test } from '@nestjs/testing';
import { ReactionService } from './reaction.service';
import { CommentService } from './comment.service';
import { ShareService } from './share.service';
import { DatabaseService } from '../database/database.service';

describe('EngagementServices', () => {
  let reaction: ReactionService;
  let comment: CommentService;
  let share: ShareService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ReactionService, CommentService, ShareService, DatabaseService],
    }).compile();
    reaction = module.get(ReactionService);
    comment = module.get(CommentService);
    share = module.get(ShareService);
  });

  it('should add reactions', async () => {
    const result = await reaction.addReaction('post-1', 'user-1', '👍');
    expect(result.emoji).toBe('👍');
  });

  it('should add comments', async () => {
    const result = await comment.addComment('post-1', 'user-1', 'Great post!');
    expect(result.text).toBe('Great post!');
  });

  it('should share posts', async () => {
    const result = await share.sharePost('post-1', 'user-1', ['user-2']);
    expect(result.sharedWith).toBe(1);
  });
});
