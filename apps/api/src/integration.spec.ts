import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';

describe('Integration: All Controllers Load', () => {
  let app: INestApplication;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('AppModule should load all imports', () => {
    expect(module).toBeDefined();
  });

  it('ApprovalController should be available', () => {
    expect(module.get('ApprovalController')).toBeDefined();
  });

  it('FeedController should be available', () => {
    expect(module.get('FeedController')).toBeDefined();
  });

  it('AudienceController should be available', () => {
    expect(module.get('AudienceController')).toBeDefined();
  });

  it('ReactionController should be available', () => {
    expect(module.get('ReactionController')).toBeDefined();
  });

  it('CommentController should be available', () => {
    expect(module.get('CommentController')).toBeDefined();
  });

  it('ShareController should be available', () => {
    expect(module.get('ShareController')).toBeDefined();
  });

  it('EditController should be available', () => {
    expect(module.get('EditController')).toBeDefined();
  });

  it('RevokeController should be available', () => {
    expect(module.get('RevokeController')).toBeDefined();
  });

  it('ArchiveController should be available', () => {
    expect(module.get('ArchiveController')).toBeDefined();
  });

  it('AuditController should be available', () => {
    expect(module.get('AuditController')).toBeDefined();
  });

  it('AnalyticsController should be available', () => {
    expect(module.get('AnalyticsController')).toBeDefined();
  });

  it('ApprovalService should be injected', () => {
    const service = module.get('ApprovalService');
    expect(service).toBeDefined();
  });

  it('FeedService should be injected', () => {
    const service = module.get('FeedService');
    expect(service).toBeDefined();
  });

  it('AudienceService should be injected', () => {
    const service = module.get('AudienceService');
    expect(service).toBeDefined();
  });

  it('ReactionService should be injected', () => {
    const service = module.get('ReactionService');
    expect(service).toBeDefined();
  });

  it('CommentService should be injected', () => {
    const service = module.get('CommentService');
    expect(service).toBeDefined();
  });

  it('ShareService should be injected', () => {
    const service = module.get('ShareService');
    expect(service).toBeDefined();
  });

  it('EditService should be injected', () => {
    const service = module.get('EditService');
    expect(service).toBeDefined();
  });

  it('RevocationService should be injected', () => {
    const service = module.get('RevocationService');
    expect(service).toBeDefined();
  });

  it('ArchiveService should be injected', () => {
    const service = module.get('ArchiveService');
    expect(service).toBeDefined();
  });

  it('AuditTrailService should be injected', () => {
    const service = module.get('AuditTrailService');
    expect(service).toBeDefined();
  });

  it('AnalyticsService should be injected', () => {
    const service = module.get('AnalyticsService');
    expect(service).toBeDefined();
  });
});
