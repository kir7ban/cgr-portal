import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReactionService, Reaction, ReactionCount } from './reaction.service';
import { DatabaseService } from '../database/database.service';

describe('ReactionService', () => {
  let service: ReactionService;
  let databaseService: DatabaseService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ReactionService, DatabaseService],
    }).compile();

    service = module.get<ReactionService>(ReactionService);
    databaseService = module.get<DatabaseService>(DatabaseService);
    await databaseService.connect();
  });

  describe('addReaction', () => {
    it('should create a new reaction', async () => {
      const result = await service.addReaction('post-1', 'user-1', '👍');
      expect(result).toMatchObject({
        postId: 'post-1',
        userId: 'user-1',
        emoji: '👍',
      });
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
    });

    it('should allow multiple different emojis on same post', async () => {
      const reaction1 = await service.addReaction('post-1', 'user-1', '👍');
      const reaction2 = await service.addReaction('post-1', 'user-2', '❤️');
      const reaction3 = await service.addReaction('post-1', 'user-3', '😂');

      expect(reaction1.emoji).toBe('👍');
      expect(reaction2.emoji).toBe('❤️');
      expect(reaction3.emoji).toBe('😂');
    });

    it('should allow same user to add same emoji multiple times (on different posts)', async () => {
      const reaction1 = await service.addReaction('post-1', 'user-1', '👍');
      const reaction2 = await service.addReaction('post-2', 'user-1', '👍');

      expect(reaction1.id).not.toBe(reaction2.id);
      expect(reaction1.postId).not.toBe(reaction2.postId);
    });

    it('should throw BadRequestException for missing postId', async () => {
      await expect(service.addReaction('', 'user-1', '👍')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for missing userId', async () => {
      await expect(service.addReaction('post-1', '', '👍')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for missing emoji', async () => {
      await expect(service.addReaction('post-1', 'user-1', '')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for emoji too long', async () => {
      await expect(service.addReaction('post-1', 'user-1', '👍❤️😂')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should log reaction to audit trail', async () => {
      const spy = jest.spyOn(databaseService, 'insertAudit');
      await service.addReaction('post-1', 'user-1', '👍');
      expect(spy).toHaveBeenCalled();
      const auditEntry = spy.mock.calls[0][0];
      expect(auditEntry.action).toBe('REACTION_ADDED');
      expect(auditEntry.actor).toBe('user-1');
    });
  });

  describe('removeReaction', () => {
    it('should remove a reaction by ID', async () => {
      const reaction = await service.addReaction('post-1', 'user-1', '👍');
      const result = await service.removeReaction(reaction.id, 'user-1');
      expect(result.deleted).toBe(true);
    });

    it('should throw NotFoundException for non-existent reaction', async () => {
      await expect(service.removeReaction('non-existent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when user is not the original reactor', async () => {
      const reaction = await service.addReaction('post-1', 'user-1', '👍');
      await expect(service.removeReaction(reaction.id, 'user-2')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for missing reactionId', async () => {
      await expect(service.removeReaction('', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for missing userId', async () => {
      const reaction = await service.addReaction('post-1', 'user-1', '👍');
      await expect(service.removeReaction(reaction.id, '')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should remove reaction from post tracking', async () => {
      const reaction = await service.addReaction('post-1', 'user-1', '👍');
      await service.removeReaction(reaction.id, 'user-1');
      const reactions = await service.getReactions('post-1');
      expect(reactions).toEqual([]);
    });

    it('should log removal to audit trail', async () => {
      const reaction = await service.addReaction('post-1', 'user-1', '👍');
      const spy = jest.spyOn(databaseService, 'insertAudit');
      spy.mockClear();
      await service.removeReaction(reaction.id, 'user-1');
      expect(spy).toHaveBeenCalled();
      const auditEntry = spy.mock.calls[0][0];
      expect(auditEntry.action).toBe('REACTION_REMOVED');
      expect(auditEntry.actor).toBe('user-1');
    });
  });

  describe('getReactions', () => {
    it('should return empty array for post with no reactions', async () => {
      const result = await service.getReactions('post-1');
      expect(result).toEqual([]);
    });

    it('should aggregate reactions by emoji with counts', async () => {
      await service.addReaction('post-1', 'user-1', '👍');
      await service.addReaction('post-1', 'user-2', '👍');
      await service.addReaction('post-1', 'user-3', '❤️');
      await service.addReaction('post-1', 'user-4', '❤️');
      await service.addReaction('post-1', 'user-5', '😂');

      const result = await service.getReactions('post-1');

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({ emoji: '👍', count: 2, userReacted: false });
      expect(result[1]).toMatchObject({ emoji: '❤️', count: 2, userReacted: false });
      expect(result[2]).toMatchObject({ emoji: '😂', count: 1, userReacted: false });
    });

    it('should sort reactions by count descending', async () => {
      await service.addReaction('post-1', 'user-1', '❤️');
      await service.addReaction('post-1', 'user-2', '❤️');
      await service.addReaction('post-1', 'user-3', '❤️');
      await service.addReaction('post-1', 'user-4', '👍');
      await service.addReaction('post-1', 'user-5', '👍');
      await service.addReaction('post-1', 'user-6', '😂');

      const result = await service.getReactions('post-1');

      expect(result[0].emoji).toBe('❤️');
      expect(result[0].count).toBe(3);
      expect(result[1].emoji).toBe('👍');
      expect(result[1].count).toBe(2);
      expect(result[2].emoji).toBe('😂');
      expect(result[2].count).toBe(1);
    });

    it('should indicate if current user has reacted with emoji', async () => {
      await service.addReaction('post-1', 'user-1', '👍');
      await service.addReaction('post-1', 'user-2', '👍');
      await service.addReaction('post-1', 'user-3', '❤️');

      const result = await service.getReactions('post-1', 'user-1');

      const thumbsUp = result.find((r) => r.emoji === '👍');
      const heart = result.find((r) => r.emoji === '❤️');

      expect(thumbsUp?.userReacted).toBe(true);
      expect(heart?.userReacted).toBe(false);
    });

    it('should handle user reacting with multiple different emojis', async () => {
      await service.addReaction('post-1', 'user-1', '👍');
      await service.addReaction('post-1', 'user-1', '❤️');
      await service.addReaction('post-1', 'user-2', '👍');

      const result = await service.getReactions('post-1', 'user-1');

      const thumbsUp = result.find((r) => r.emoji === '👍');
      const heart = result.find((r) => r.emoji === '❤️');

      expect(thumbsUp?.userReacted).toBe(true);
      expect(heart?.userReacted).toBe(true);
    });

    it('should throw BadRequestException for missing postId', async () => {
      await expect(service.getReactions('')).rejects.toThrow(BadRequestException);
    });

    it('should return empty array after reaction is removed', async () => {
      const reaction = await service.addReaction('post-1', 'user-1', '👍');
      await service.removeReaction(reaction.id, 'user-1');
      const result = await service.getReactions('post-1');
      expect(result).toEqual([]);
    });

    it('should handle multiple posts independently', async () => {
      await service.addReaction('post-1', 'user-1', '👍');
      await service.addReaction('post-1', 'user-2', '👍');
      await service.addReaction('post-2', 'user-1', '❤️');

      const post1Result = await service.getReactions('post-1');
      const post2Result = await service.getReactions('post-2');

      expect(post1Result).toHaveLength(1);
      expect(post1Result[0].emoji).toBe('👍');
      expect(post1Result[0].count).toBe(2);

      expect(post2Result).toHaveLength(1);
      expect(post2Result[0].emoji).toBe('❤️');
      expect(post2Result[0].count).toBe(1);
    });
  });

  describe('getAllReactionsRaw', () => {
    it('should return empty array for post with no reactions', async () => {
      const result = await service.getAllReactionsRaw('post-1');
      expect(result).toEqual([]);
    });

    it('should return all individual reactions for a post', async () => {
      const reaction1 = await service.addReaction('post-1', 'user-1', '👍');
      const reaction2 = await service.addReaction('post-1', 'user-2', '👍');
      const reaction3 = await service.addReaction('post-1', 'user-3', '❤️');

      const result = await service.getAllReactionsRaw('post-1');

      expect(result).toHaveLength(3);
      expect(result.map((r) => r.id)).toEqual(
        expect.arrayContaining([reaction1.id, reaction2.id, reaction3.id]),
      );
    });

    it('should not include removed reactions', async () => {
      const reaction1 = await service.addReaction('post-1', 'user-1', '👍');
      await service.addReaction('post-1', 'user-2', '👍');
      await service.removeReaction(reaction1.id, 'user-1');

      const result = await service.getAllReactionsRaw('post-1');

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user-2');
    });

    it('should throw BadRequestException for missing postId', async () => {
      await expect(service.getAllReactionsRaw('')).rejects.toThrow(BadRequestException);
    });
  });

  describe('Integration: Full workflow', () => {
    it('should handle complete add/aggregate/remove workflow', async () => {
      // Add reactions
      const r1 = await service.addReaction('post-1', 'user-1', '👍');
      const r2 = await service.addReaction('post-1', 'user-2', '👍');
      const r3 = await service.addReaction('post-1', 'user-3', '❤️');

      // Check aggregation
      let reactions = await service.getReactions('post-1', 'user-1');
      expect(reactions).toHaveLength(2);
      expect(reactions[0]).toMatchObject({ emoji: '👍', count: 2, userReacted: true });
      expect(reactions[1]).toMatchObject({ emoji: '❤️', count: 1, userReacted: false });

      // Remove one reaction
      await service.removeReaction(r1.id, 'user-1');

      // Check aggregation again
      reactions = await service.getReactions('post-1', 'user-1');
      expect(reactions).toHaveLength(2);
      expect(reactions[0]).toMatchObject({ emoji: '👍', count: 1, userReacted: false });
      expect(reactions[1]).toMatchObject({ emoji: '❤️', count: 1, userReacted: false });

      // Remove all reactions
      await service.removeReaction(r2.id, 'user-2');
      await service.removeReaction(r3.id, 'user-3');

      reactions = await service.getReactions('post-1');
      expect(reactions).toEqual([]);
    });
  });
});
