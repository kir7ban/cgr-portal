import { Injectable, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AuthorizationService } from '../auth/authorization.service';

export interface CreateAudienceDto {
  name: string;
  description: string;
  departmentIds: string[];
}

export interface AudienceDocument {
  id: string;
  name: string;
  description: string;
  departmentIds: string[];
  memberIds: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class AudienceService {
  private readonly logger = new Logger(AudienceService.name);
  private audiences: Map<string, AudienceDocument> = new Map();

  constructor(
    private databaseService: DatabaseService,
    private authorizationService: AuthorizationService,
  ) {}

  // CRUD Operations - Admin Only
  async createAudience(dto: CreateAudienceDto, userId: string): Promise<AudienceDocument> {
    this.authorizationService.enforceRole(userId, 'ADMIN', 'Only Admins can manage audiences');
    this.validateAudienceInput(dto);

    const audience: AudienceDocument = {
      id: this.generateId(),
      name: dto.name.trim(),
      description: dto.description.trim(),
      departmentIds: dto.departmentIds.filter((d) => d.trim()),
      memberIds: [],
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.audiences.set(audience.id, audience);
    return audience;
  }

  async getAudienceById(audienceId: string): Promise<AudienceDocument | undefined> {
    return this.audiences.get(audienceId);
  }

  async listAudiences(): Promise<AudienceDocument[]> {
    return Array.from(this.audiences.values());
  }

  async updateAudience(
    audienceId: string,
    updates: Partial<CreateAudienceDto>,
    userId: string,
  ): Promise<AudienceDocument> {
    this.authorizationService.enforceRole(userId, 'ADMIN', 'Only Admins can manage audiences');

    const audience = this.audiences.get(audienceId);
    if (!audience) {
      throw new BadRequestException('Audience not found');
    }

    const updated: AudienceDocument = {
      ...audience,
      name: updates.name ? updates.name.trim() : audience.name,
      description: updates.description ? updates.description.trim() : audience.description,
      departmentIds: updates.departmentIds || audience.departmentIds,
      updatedAt: new Date().toISOString(),
    };

    this.audiences.set(audienceId, updated);
    return updated;
  }

  async deleteAudience(audienceId: string, userId: string): Promise<void> {
    this.authorizationService.enforceRole(userId, 'ADMIN', 'Only Admins can manage audiences');

    if (!this.audiences.has(audienceId)) {
      throw new BadRequestException('Audience not found');
    }

    this.audiences.delete(audienceId);
  }

  // Member Management - Admin Only
  async addMember(
    audienceId: string,
    memberId: string,
    userId: string,
  ): Promise<AudienceDocument> {
    this.authorizationService.enforceRole(userId, 'ADMIN', 'Only Admins can manage audiences');

    const audience = this.audiences.get(audienceId);
    if (!audience) {
      throw new BadRequestException('Audience not found');
    }

    if (!audience.memberIds.includes(memberId)) {
      audience.memberIds.push(memberId);
      audience.updatedAt = new Date().toISOString();
      this.audiences.set(audienceId, audience);
    }

    return audience;
  }

  async removeMember(
    audienceId: string,
    memberId: string,
    userId: string,
  ): Promise<AudienceDocument> {
    this.authorizationService.enforceRole(userId, 'ADMIN', 'Only Admins can manage audiences');

    const audience = this.audiences.get(audienceId);
    if (!audience) {
      throw new BadRequestException('Audience not found');
    }

    audience.memberIds = audience.memberIds.filter((m) => m !== memberId);
    audience.updatedAt = new Date().toISOString();
    this.audiences.set(audienceId, audience);

    return audience;
  }

  async getAudienceMembers(audienceId: string): Promise<string[]> {
    const audience = this.audiences.get(audienceId);
    return audience?.memberIds || [];
  }

  async bulkAddMembers(
    audienceId: string,
    memberIds: string[],
    userId: string,
  ): Promise<AudienceDocument> {
    this.authorizationService.enforceRole(userId, 'ADMIN', 'Only Admins can manage audiences');

    const audience = this.audiences.get(audienceId);
    if (!audience) {
      throw new BadRequestException('Audience not found');
    }

    for (const memberId of memberIds) {
      if (!audience.memberIds.includes(memberId)) {
        audience.memberIds.push(memberId);
      }
    }

    audience.updatedAt = new Date().toISOString();
    this.audiences.set(audienceId, audience);

    return audience;
  }

  // Scope Validation
  async validateAudienceForPublishing(audienceId: string): Promise<boolean> {
    return this.audiences.has(audienceId);
  }

  async canCommsOfficerProposeAudience(
    audienceId: string,
    commsDepartmentId: string,
  ): Promise<boolean> {
    const audience = this.audiences.get(audienceId);
    if (!audience) return false;
    return audience.departmentIds.includes(commsDepartmentId);
  }

  async userBelongsToAudience(audienceId: string, userId: string): Promise<boolean> {
    const audience = this.audiences.get(audienceId);
    if (!audience) return false;
    return audience.memberIds.includes(userId);
  }

  isValidStandardScope(scope: string): boolean {
    return ['org-wide', 'dept-only', 'custom'].includes(scope);
  }

  async hasMembers(audienceId: string): Promise<boolean> {
    const audience = this.audiences.get(audienceId);
    return (audience?.memberIds.length || 0) > 0;
  }

  // Department Association
  async updateDepartments(
    audienceId: string,
    departmentIds: string[],
    userId: string,
  ): Promise<AudienceDocument> {
    this.authorizationService.enforceRole(userId, 'ADMIN', 'Only Admins can manage audiences');

    if (!departmentIds || departmentIds.length === 0) {
      throw new BadRequestException('At least one department is required');
    }

    const audience = this.audiences.get(audienceId);
    if (!audience) {
      throw new BadRequestException('Audience not found');
    }

    audience.departmentIds = departmentIds.filter((d) => d.trim());
    audience.updatedAt = new Date().toISOString();
    this.audiences.set(audienceId, audience);

    return audience;
  }

  async getAudiencesByDepartment(departmentId: string): Promise<AudienceDocument[]> {
    return Array.from(this.audiences.values()).filter((a) =>
      a.departmentIds.includes(departmentId),
    );
  }

  // Validation helpers
  private validateAudienceInput(dto: CreateAudienceDto): void {
    if (!dto.name || dto.name.trim().length === 0) {
      throw new BadRequestException('Audience name is required');
    }

    if (!dto.departmentIds || dto.departmentIds.length === 0) {
      throw new BadRequestException('At least one department is required');
    }

    const validDepts = dto.departmentIds.filter((d) => d && d.trim());
    if (validDepts.length === 0) {
      throw new BadRequestException('Department IDs must contain valid values');
    }
  }

  private generateId(): string {
    return `aud-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
