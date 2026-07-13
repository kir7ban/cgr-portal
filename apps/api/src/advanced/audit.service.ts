import { Injectable } from '@nestjs/common';
@Injectable()
export class AuditTrailService {
  async getAuditTrail(filters: any = {}) { return { entries: [], total: 0 }; }
}
