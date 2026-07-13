import { Injectable } from '@nestjs/common';
@Injectable()
export class ReactionService {
  async addReaction(postId: string, userId: string, emoji: string) {
    return { emoji, count: 1 };
  }
  async getReactions(postId: string) { return {}; }
}
