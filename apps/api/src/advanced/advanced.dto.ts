export class EditPostDto {
  title?: string;
  content?: string;
}

export class RevokePostDto {
  reason?: string;
}

export class ArchivePostsDto {
  olderThanDays?: number;
}

export class AuditQueryDto {
  page: number = 1;
  pageSize: number = 50;
  resourceType?: string;
  action?: string;
}

export class AuditEntryDto {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  resource: string;
  resourceId: string;
}

export class MetricsDto {
  date: string;
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalViews: number;
}
