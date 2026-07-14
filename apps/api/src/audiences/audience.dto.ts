export class CreateAudienceDto {
  name: string;
  description: string;
  memberIds: string[];
}

export class AddMemberDto {
  memberId: string;
}

export class AudienceResponseDto {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
  createdAt: string;
  createdBy: string;
}
