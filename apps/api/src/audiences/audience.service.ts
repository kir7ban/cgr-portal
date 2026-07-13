import { Injectable, ForbiddenException } from '@nestjs/common';
@Injectable()
export class AudienceService {
  async createAudience(adminId: string, name: string, description: string) {
    if (!this.isAdmin(adminId)) throw new ForbiddenException('Only Admins');
    return { id: `aud-${Date.now()}`, name, description };
  }
  async listAudiences() { return []; }
  private isAdmin(userId: string) { return ['bob.admin'].includes(userId); }
}
