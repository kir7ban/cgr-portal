import { Test } from '@nestjs/testing';
import { AudienceService } from './audience.service';

describe('AudienceService', () => {
  let service: AudienceService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [AudienceService],
    }).compile();
    service = module.get(AudienceService);
  });

  it('should create audiences', async () => {
    expect(service).toBeDefined();
  });

  it('should list audiences', async () => {
    const audiences = await service.listAudiences();
    expect(Array.isArray(audiences)).toBe(true);
  });
});
