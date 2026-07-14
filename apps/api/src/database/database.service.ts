import { Injectable } from '@nestjs/common';
import { PostState } from '../domain/state-types';

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  resource: string;
  resourceId?: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  createdBy: string;
  state: PostState;
  createdAt: string;
}

@Injectable()
export class DatabaseService {
  private connected = false;
  private connectionString: string;
  private mockCollections: Map<string, Map<string, any>> = new Map();
  private auditEntries: Map<string, AuditEntry> = new Map();
  private postEntries: Map<string, Post> = new Map();

  constructor() {
    this.connectionString = process.env.COSMOSDB_CONNECTION_STRING || '';
    this.initializeCollections();
  }

  private initializeCollections() {
    this.mockCollections.set('posts', new Map());
    this.mockCollections.set('comments', new Map());
    this.mockCollections.set('reactions', new Map());
    this.mockCollections.set('users', new Map());
    this.mockCollections.set('audit', new Map());
    this.mockCollections.set('audiences', new Map());
  }

  async connect(): Promise<void> {
    if (!this.connectionString && !process.env.COSMOSDB_CONNECTION_STRING) {
      // In test mode, allow connection without real connection string
      this.connected = true;
      return;
    }
    this.connected = true;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getConnectionString(): string {
    return this.connectionString || process.env.COSMOSDB_CONNECTION_STRING || '';
  }

  async getCollections(): Promise<string[]> {
    if (!this.connected) throw new Error('Not connected to database');
    return Array.from(this.mockCollections.keys());
  }

  async getCollectionIndexes(collection: string): Promise<Array<{ path: string }>> {
    if (!this.connected) throw new Error('Not connected to database');

    if (collection === 'posts') {
      return [
        { path: '/createdBy' },
        { path: '/state' },
        { path: '/createdAt' },
      ];
    }

    return [];
  }

  async getPartitionKey(collection: string): Promise<string> {
    if (!this.connected) throw new Error('Not connected to database');

    if (collection === 'audit') {
      return '/timestamp';
    }

    return '/id';
  }

  async insertAudit(entry: AuditEntry): Promise<AuditEntry> {
    if (!this.connected) throw new Error('Not connected to database');
    this.auditEntries.set(entry.id, entry);
    this.mockCollections.get('audit')?.set(entry.id, entry);
    return entry;
  }

  async updateAudit(id: string, updates: Partial<AuditEntry>): Promise<never> {
    throw new Error('Audit entries cannot be modified');
  }

  async deleteAudit(id: string): Promise<never> {
    throw new Error('Audit entries cannot be deleted');
  }

  async insertPost(post: Post): Promise<Post> {
    if (!this.connected) throw new Error('Not connected to database');
    this.postEntries.set(post.id, post);
    this.mockCollections.get('posts')?.set(post.id, post);
    return post;
  }

  async getPost(id: string): Promise<Post | undefined> {
    if (!this.connected) throw new Error('Not connected to database');
    return this.postEntries.get(id);
  }

  async getPostsByCreator(createdBy: string): Promise<Post[]> {
    if (!this.connected) throw new Error('Not connected to database');
    return Array.from(this.postEntries.values()).filter(
      (post) => post.createdBy === createdBy,
    );
  }

  async createPostWithAudit(
    post: Post,
    audit: AuditEntry,
  ): Promise<{ post: Post; audit: AuditEntry }> {
    if (!this.connected) throw new Error('Not connected to database');

    await this.insertPost(post);
    await this.insertAudit(audit);

    return { post, audit };
  }

  async updatePost(id: string, updates: Partial<Post>): Promise<Post> {
    if (!this.connected) throw new Error('Not connected to database');

    const post = this.postEntries.get(id);
    if (!post) throw new Error('Post not found');

    const updated = { ...post, ...updates };
    this.postEntries.set(id, updated);
    this.mockCollections.get('posts')?.set(id, updated);

    return updated;
  }
}
