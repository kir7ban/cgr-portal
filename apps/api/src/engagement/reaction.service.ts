import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AuditingService } from '../database/auditing.service';

export interface Reaction {
  id: string;
  postId: string;
  userId: string;
  emoji: string;
  createdAt: string;
}

export interface ReactionCount {
  emoji: string;
  count: number;
  userReacted: boolean;
}

@Injectable()
export class ReactionService {
  private readonly logger = new Logger(ReactionService.name);
  private reactions: Map<string, Reaction> = new Map();
  private reactionsByPost: Map<string, Set<string>> = new Map();

  constructor(
    private databaseService: DatabaseService,
    private auditingService: AuditingService,
  ) {}

  /**
   * Add a reaction to a post
   * @param postId - The post ID
   * @param userId - The user ID adding the reaction
   * @param emoji - The emoji to react with
   * @returns The created reaction
   */
  async addReaction(postId: string, userId: string, emoji: string): Promise<Reaction> {
    if (!postId || !userId || !emoji) {
      throw new BadRequestException('postId, userId, and emoji are required');
    }

    if (emoji.length > 2) {
      throw new BadRequestException('emoji must be a single character or emoji');
    }

    const reactionId = `react-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const createdAt = new Date().toISOString();

    const reaction: Reaction = {
      id: reactionId,
      postId,
      userId,
      emoji,
      createdAt,
    };

    this.reactions.set(reactionId, reaction);

    if (!this.reactionsByPost.has(postId)) {
      this.reactionsByPost.set(postId, new Set());
    }
    this.reactionsByPost.get(postId)!.add(reactionId);

    // Log to audit trail
    try {
      await this.auditingService.logAction({
        actor: userId,
        action: 'REACTION_ADDED',
        resource: 'reaction',
        resourceId: reactionId,
      });
    } catch (error) {
      // Silently fail audit if database is not connected (for testing)
    }

    this.logger.log(`Reaction ${emoji} added to post ${postId} by user ${userId}`);

    return reaction;
  }

  /**
   * Remove a reaction from a post
   * @param reactionId - The reaction ID to remove
   * @param userId - The user ID removing the reaction (must be the original user)
   * @returns Success status
   */
  async removeReaction(reactionId: string, userId: string): Promise<{ deleted: true }> {
    if (!reactionId || !userId) {
      throw new BadRequestException('reactionId and userId are required');
    }

    const reaction = this.reactions.get(reactionId);
    if (!reaction) {
      throw new NotFoundException('Reaction not found');
    }

    if (reaction.userId !== userId) {
      throw new BadRequestException('Can only remove your own reactions');
    }

    this.reactions.delete(reactionId);
    const postReactions = this.reactionsByPost.get(reaction.postId);
    if (postReactions) {
      postReactions.delete(reactionId);
    }

    // Log to audit trail
    try {
      await this.auditingService.logAction({
        actor: userId,
        action: 'REACTION_REMOVED',
        resource: 'reaction',
        resourceId: reactionId,
      });
    } catch (error) {
      // Silently fail audit if database is not connected (for testing)
    }

    return { deleted: true };
  }

  /**
   * Get aggregated reactions for a post
   * @param postId - The post ID
   * @param currentUserId - Optional current user ID to show if they reacted
   * @returns Array of emoji counts aggregated by emoji type
   */
  async getReactions(postId: string, currentUserId?: string): Promise<ReactionCount[]> {
    if (!postId) {
      throw new BadRequestException('postId is required');
    }

    const postReactionIds = this.reactionsByPost.get(postId) || new Set();
    const emojiCounts = new Map<string, number>();
    const userEmojis = new Set<string>();

    // Aggregate reactions by emoji
    postReactionIds.forEach((reactionId) => {
      const reaction = this.reactions.get(reactionId);
      if (reaction) {
        const count = emojiCounts.get(reaction.emoji) || 0;
        emojiCounts.set(reaction.emoji, count + 1);

        if (currentUserId && reaction.userId === currentUserId) {
          userEmojis.add(reaction.emoji);
        }
      }
    });

    // Convert to sorted array
    const result: ReactionCount[] = Array.from(emojiCounts.entries())
      .map(([emoji, count]) => ({
        emoji,
        count,
        userReacted: userEmojis.has(emoji),
      }))
      .sort((a, b) => b.count - a.count);

    return result;
  }

  /**
   * Get all reactions for a post (raw data, for admin purposes)
   * @param postId - The post ID
   * @returns Array of all individual reactions
   */
  async getAllReactionsRaw(postId: string): Promise<Reaction[]> {
    if (!postId) {
      throw new BadRequestException('postId is required');
    }

    const postReactionIds = this.reactionsByPost.get(postId) || new Set();
    const result: Reaction[] = [];

    postReactionIds.forEach((reactionId) => {
      const reaction = this.reactions.get(reactionId);
      if (reaction) {
        result.push(reaction);
      }
    });

    return result;
  }
}
