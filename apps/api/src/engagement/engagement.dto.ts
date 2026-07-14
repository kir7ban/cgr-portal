export class AddReactionDto {
  emoji: string;
}

export class ReactionResponseDto {
  postId: string;
  userId: string;
  emoji: string;
  createdAt: string;
}

export class ReactionsAggregateDto {
  postId: string;
  reactions: { emoji: string; count: number; userIds: string[] }[];
}

export class AddCommentDto {
  content: string;
}

export class CommentResponseDto {
  id: string;
  postId: string;
  createdBy: string;
  content: string;
  createdAt: string;
}

export class SharePostDto {
  recipientIds: string[];
  message?: string;
}

export class ShareResponseDto {
  id: string;
  postId: string;
  sharedBy: string;
  recipientIds: string[];
  message?: string;
  sharedAt: string;
}
