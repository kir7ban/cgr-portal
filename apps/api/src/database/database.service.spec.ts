import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from './database.service';

describe('DatabaseService', () => {
  let service: DatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DatabaseService],
    }).compile();

    service = module.get<DatabaseService>(DatabaseService);
  });

  describe('Connection', () => {
    it('should initialize CosmosDB connection', async () => {
      await service.connect();
      expect(service.isConnected()).toBe(true);
    });

    it('should handle connection string from environment', async () => {
      process.env.COSMOSDB_CONNECTION_STRING = 'test-connection-string';
      const service2 = new DatabaseService();
      expect(service2.getConnectionString()).toBe('test-connection-string');
    });
  });

  describe('Collections', () => {
    it('should create collections with proper schema', async () => {
      await service.connect();
      const collections = await service.getCollections();

      expect(collections).toContain('posts');
      expect(collections).toContain('comments');
      expect(collections).toContain('reactions');
      expect(collections).toContain('users');
      expect(collections).toContain('audit');
      expect(collections).toContain('audiences');
    });

    it('should create posts collection with indexes', async () => {
      await service.connect();
      const indexes = await service.getCollectionIndexes('posts');

      expect(indexes).toContainEqual(
        expect.objectContaining({
          path: '/createdBy',
        }),
      );
      expect(indexes).toContainEqual(
        expect.objectContaining({
          path: '/state',
        }),
      );
    });

    it('should create audit collection with partition key', async () => {
      await service.connect();
      const partitionKey = await service.getPartitionKey('audit');

      expect(partitionKey).toBe('/timestamp');
    });
  });

  describe('Audit Collection Immutability', () => {
    it('should allow INSERT to audit collection', async () => {
      await service.connect();
      const auditEntry = {
        id: 'audit-1',
        timestamp: new Date().toISOString(),
        actor: 'user-1',
        action: 'login',
        resource: 'auth',
      };

      const result = await service.insertAudit(auditEntry);
      expect(result).toBeDefined();
      expect(result.id).toBe('audit-1');
    });

    it('should reject UPDATE on audit collection', async () => {
      await service.connect();
      const auditEntry = {
        id: 'audit-1',
        timestamp: new Date().toISOString(),
        actor: 'user-1',
        action: 'login',
        resource: 'auth',
      };

      await service.insertAudit(auditEntry);

      await expect(
        service.updateAudit('audit-1', { action: 'logout' }),
      ).rejects.toThrow('Audit entries cannot be modified');
    });

    it('should reject DELETE on audit collection', async () => {
      await service.connect();
      const auditEntry = {
        id: 'audit-1',
        timestamp: new Date().toISOString(),
        actor: 'user-1',
        action: 'login',
        resource: 'auth',
      };

      await service.insertAudit(auditEntry);

      await expect(service.deleteAudit('audit-1')).rejects.toThrow(
        'Audit entries cannot be deleted',
      );
    });
  });

  describe('Posts Collection', () => {
    it('should create post document', async () => {
      await service.connect();
      const post = {
        id: 'post-1',
        title: 'Test Post',
        content: 'Test content',
        createdBy: 'user-1',
        state: 'DRAFT',
        createdAt: new Date().toISOString(),
      };

      const result = await service.insertPost(post);
      expect(result).toBeDefined();
      expect(result.state).toBe('DRAFT');
    });

    it('should retrieve post by ID', async () => {
      await service.connect();
      const post = {
        id: 'post-2',
        title: 'Test Post',
        content: 'Test content',
        createdBy: 'user-1',
        state: 'DRAFT',
        createdAt: new Date().toISOString(),
      };

      await service.insertPost(post);
      const retrieved = await service.getPost('post-2');

      expect(retrieved).toBeDefined();
      expect(retrieved.title).toBe('Test Post');
    });

    it('should query posts by creator', async () => {
      await service.connect();
      const posts = [
        {
          id: 'post-3',
          title: 'Post 1',
          content: 'Content 1',
          createdBy: 'user-1',
          state: 'DRAFT',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'post-4',
          title: 'Post 2',
          content: 'Content 2',
          createdBy: 'user-1',
          state: 'DRAFT',
          createdAt: new Date().toISOString(),
        },
      ];

      for (const post of posts) {
        await service.insertPost(post);
      }

      const userPosts = await service.getPostsByCreator('user-1');
      expect(userPosts.length).toBe(2);
    });
  });

  describe('Transaction Support', () => {
    it('should create post and audit log in transaction', async () => {
      await service.connect();
      const post = {
        id: 'post-5',
        title: 'New Post',
        content: 'Content',
        createdBy: 'user-1',
        state: 'DRAFT',
        createdAt: new Date().toISOString(),
      };

      const auditEntry = {
        id: 'audit-5',
        timestamp: new Date().toISOString(),
        actor: 'user-1',
        action: 'create_post',
        resource: 'post',
        resourceId: 'post-5',
      };

      const result = await service.createPostWithAudit(post, auditEntry);
      expect(result.post).toBeDefined();
      expect(result.audit).toBeDefined();
    });
  });
});
