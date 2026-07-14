export class FeedQueryDto {
  page: number = 1;
  pageSize: number = 20;
  audiences?: string[];
  excludeArchived?: boolean = true;
}

export class PublishedPostDto {
  id: string;
  title: string;
  content: string;
  createdBy: string;
  state: string;
  proposedAudience?: string;
  approvedAudience?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}

export class PaginatedFeedResponseDto {
  items: PublishedPostDto[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
