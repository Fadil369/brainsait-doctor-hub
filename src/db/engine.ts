/**
 * Core Database Engine
 * Provides CRUD operations, indexing, and query capabilities
 * Built on top of GitHub Spark's useKV storage
 */

import { COLLECTIONS, type CollectionName, type SyncLogEntry, type DatabaseMetadata } from './schema';

// ==================== Types ====================

export interface QueryOptions<T> {
  where?: Partial<T> | ((item: T) => boolean);
  orderBy?: keyof T;
  orderDirection?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  include?: (keyof T)[];
  exclude?: (keyof T)[];
}

export interface QueryResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DatabaseTransaction {
  id: string;
  operations: TransactionOperation[];
  status: 'pending' | 'committed' | 'rolledback';
  createdAt: string;
}

export interface TransactionOperation {
  type: 'create' | 'update' | 'delete';
  collection: CollectionName;
  documentId: string;
  data?: Record<string, unknown>;
  previousData?: Record<string, unknown>;
}

// ==================== Storage Adapter ====================

/**
 * Storage adapter interface for pluggable storage backends
 */
export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  keys(prefix?: string): Promise<string[]>;
  clear(prefix?: string): Promise<void>;
}

/**
 * In-memory storage adapter for development/testing
 */
export class MemoryStorageAdapter implements StorageAdapter {
  private store = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | null> {
    return (this.store.get(key) as T) ?? null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async keys(prefix?: string): Promise<string[]> {
    const allKeys = Array.from(this.store.keys());
    return prefix ? allKeys.filter(k => k.startsWith(prefix)) : allKeys;
  }

  async clear(prefix?: string): Promise<void> {
    if (prefix) {
      for (const key of this.store.keys()) {
        if (key.startsWith(prefix)) {
          this.store.delete(key);
        }
      }
    } else {
      this.store.clear();
    }
  }
}

/**
 * LocalStorage adapter for browser persistence
 */
export class LocalStorageAdapter implements StorageAdapter {
  private prefix: string;

  constructor(prefix = 'brainsait_db_') {
    this.prefix = prefix;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = localStorage.getItem(this.prefix + key);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    localStorage.setItem(this.prefix + key, JSON.stringify(value));
  }

  async delete(key: string): Promise<void> {
    localStorage.removeItem(this.prefix + key);
  }

  async keys(prefix?: string): Promise<string[]> {
    const keys: string[] = [];
    const fullPrefix = this.prefix + (prefix || '');
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(fullPrefix)) {
        keys.push(key.slice(this.prefix.length));
      }
    }
    return keys;
  }

  async clear(prefix?: string): Promise<void> {
    const keysToDelete = await this.keys(prefix);
    for (const key of keysToDelete) {
      await this.delete(key);
    }
  }
}

// ==================== Core Database Engine ====================

export class DatabaseEngine {
  private storage: StorageAdapter;
  private cache = new Map<string, { data: unknown; timestamp: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes
  private subscribers = new Map<string, Set<(data: unknown) => void>>();
  private transactionLog: DatabaseTransaction[] = [];

  constructor(storage?: StorageAdapter) {
    this.storage = storage || new LocalStorageAdapter();
  }

  // ==================== Core CRUD Operations ====================

  /**
   * Get a document by ID from a collection
   */
  async get<T extends { id: string }>(
    collection: CollectionName,
    id: string
  ): Promise<T | null> {
    const cacheKey = `${collection}:${id}`;
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data as T;
    }

    const collectionData = await this.getCollection<T>(collection);
    const item = collectionData.find(doc => doc.id === id) ?? null;
    
    if (item) {
      this.cache.set(cacheKey, { data: item, timestamp: Date.now() });
    }
    
    return item;
  }

  /**
   * Get all documents from a collection
   */
  async getAll<T>(collection: CollectionName): Promise<T[]> {
    return this.getCollection<T>(collection);
  }

  /**
   * Query documents with filters and pagination
   */
  async query<T extends { id: string }>(
    collection: CollectionName,
    options: QueryOptions<T> = {}
  ): Promise<QueryResult<T>> {
    const allData = await this.getCollection<T>(collection);
    let filtered = [...allData];

    // Apply where clause
    if (options.where) {
      if (typeof options.where === 'function') {
        filtered = filtered.filter(options.where);
      } else {
        filtered = filtered.filter(item => {
          return Object.entries(options.where as Partial<T>).every(
            ([key, value]) => item[key as keyof T] === value
          );
        });
      }
    }

    // Sort
    if (options.orderBy) {
      const direction = options.orderDirection === 'desc' ? -1 : 1;
      filtered.sort((a, b) => {
        const aVal = a[options.orderBy!];
        const bVal = b[options.orderBy!];
        if (aVal < bVal) return -1 * direction;
        if (aVal > bVal) return 1 * direction;
        return 0;
      });
    }

    const total = filtered.length;
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;

    // Paginate
    const paginated = filtered.slice(offset, offset + limit);

    // Field selection
    let result = paginated;
    if (options.include) {
      result = paginated.map(item => {
        const picked: Partial<T> = {};
        for (const key of options.include!) {
          picked[key] = item[key];
        }
        return picked as T;
      });
    } else if (options.exclude) {
      result = paginated.map(item => {
        const filtered = { ...item };
        for (const key of options.exclude!) {
          delete filtered[key];
        }
        return filtered;
      });
    }

    return {
      data: result,
      total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Create a new document
   */
  async create<T extends { id: string; createdAt?: string; updatedAt?: string }>(
    collection: CollectionName,
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): Promise<T> {
    const now = new Date().toISOString();
    const id = data.id || this.generateId();
    
    const document = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    } as T;

    const collectionData = await this.getCollection<T>(collection);
    
    // Check for duplicate ID
    if (collectionData.some(doc => doc.id === id)) {
      throw new Error(`Document with ID ${id} already exists in ${collection}`);
    }

    collectionData.push(document);
    await this.saveCollection(collection, collectionData);
    
    // Clear cache
    this.invalidateCache(collection);
    
    // Log sync entry
    await this.logSync(collection, 'create', id);
    
    // Notify subscribers
    this.notifySubscribers(collection, collectionData);

    return document;
  }

  /**
   * Update an existing document
   */
  async update<T extends { id: string; updatedAt?: string }>(
    collection: CollectionName,
    id: string,
    updates: Partial<Omit<T, 'id' | 'createdAt'>>
  ): Promise<T | null> {
    const collectionData = await this.getCollection<T>(collection);
    const index = collectionData.findIndex(doc => doc.id === id);
    
    if (index === -1) {
      return null;
    }

    const updated = {
      ...collectionData[index],
      ...updates,
      id, // Prevent ID modification
      updatedAt: new Date().toISOString(),
    } as T;

    collectionData[index] = updated;
    await this.saveCollection(collection, collectionData);
    
    // Clear cache
    this.invalidateCache(collection, id);
    
    // Log sync entry
    await this.logSync(collection, 'update', id);
    
    // Notify subscribers
    this.notifySubscribers(collection, collectionData);

    return updated;
  }

  /**
   * Upsert a document (create or update)
   */
  async upsert<T extends { id: string }>(
    collection: CollectionName,
    data: T
  ): Promise<T> {
    const existing = await this.get<T>(collection, data.id);
    if (existing) {
      return (await this.update<T>(collection, data.id, data)) as T;
    }
    return this.create<T>(collection, data);
  }

  /**
   * Delete a document
   */
  async delete<T extends { id: string }>(
    collection: CollectionName,
    id: string
  ): Promise<boolean> {
    const collectionData = await this.getCollection<T>(collection);
    const index = collectionData.findIndex(doc => doc.id === id);
    
    if (index === -1) {
      return false;
    }

    collectionData.splice(index, 1);
    await this.saveCollection(collection, collectionData);
    
    // Clear cache
    this.invalidateCache(collection, id);
    
    // Log sync entry
    await this.logSync(collection, 'delete', id);
    
    // Notify subscribers
    this.notifySubscribers(collection, collectionData);

    return true;
  }

  /**
   * Delete multiple documents matching a condition
   */
  async deleteMany<T extends { id: string }>(
    collection: CollectionName,
    where: Partial<T> | ((item: T) => boolean)
  ): Promise<number> {
    const collectionData = await this.getCollection<T>(collection);
    const originalLength = collectionData.length;
    
    const predicate = typeof where === 'function'
      ? where
      : (item: T) => Object.entries(where).every(([k, v]) => item[k as keyof T] === v);
    
    const remaining = collectionData.filter(item => !predicate(item));
    const deletedCount = originalLength - remaining.length;
    
    if (deletedCount > 0) {
      await this.saveCollection(collection, remaining);
      this.invalidateCache(collection);
      this.notifySubscribers(collection, remaining);
    }
    
    return deletedCount;
  }

  // ==================== Batch Operations ====================

  /**
   * Create multiple documents at once
   */
  async createMany<T extends { id: string }>(
    collection: CollectionName,
    documents: Array<Omit<T, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }>
  ): Promise<T[]> {
    const now = new Date().toISOString();
    const collectionData = await this.getCollection<T>(collection);
    
    const created = documents.map(doc => ({
      ...doc,
      id: doc.id || this.generateId(),
      createdAt: now,
      updatedAt: now,
    } as T));

    collectionData.push(...created);
    await this.saveCollection(collection, collectionData);
    
    this.invalidateCache(collection);
    this.notifySubscribers(collection, collectionData);
    
    return created;
  }

  /**
   * Update multiple documents at once
   */
  async updateMany<T extends { id: string }>(
    collection: CollectionName,
    updates: Array<{ id: string; data: Partial<Omit<T, 'id' | 'createdAt'>> }>
  ): Promise<number> {
    const collectionData = await this.getCollection<T>(collection);
    const now = new Date().toISOString();
    let updatedCount = 0;

    for (const { id, data } of updates) {
      const index = collectionData.findIndex(doc => doc.id === id);
      if (index !== -1) {
        collectionData[index] = {
          ...collectionData[index],
          ...data,
          updatedAt: now,
        } as T;
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      await this.saveCollection(collection, collectionData);
      this.invalidateCache(collection);
      this.notifySubscribers(collection, collectionData);
    }

    return updatedCount;
  }

  // ==================== Index Operations ====================

  /**
   * Create an index for faster lookups
   */
  async createIndex<T extends { id: string }>(
    collection: CollectionName,
    field: keyof T,
    indexName: string
  ): Promise<void> {
    const collectionData = await this.getCollection<T>(collection);
    const index = new Map<unknown, string[]>();

    for (const doc of collectionData) {
      const value = doc[field];
      const existing = index.get(value) || [];
      existing.push(doc.id);
      index.set(value, existing);
    }

    await this.storage.set(indexName, Object.fromEntries(index));
  }

  /**
   * Find documents using an index
   */
  async findByIndex<T extends { id: string }>(
    collection: CollectionName,
    indexName: string,
    value: unknown
  ): Promise<T[]> {
    const index = await this.storage.get<Record<string, string[]>>(indexName);
    if (!index) return [];

    const ids = index[String(value)] || [];
    const collectionData = await this.getCollection<T>(collection);
    
    return collectionData.filter(doc => ids.includes(doc.id));
  }

  // ==================== Aggregation Operations ====================

  /**
   * Count documents matching a condition
   */
  async count<T extends { id: string }>(
    collection: CollectionName,
    where?: Partial<T> | ((item: T) => boolean)
  ): Promise<number> {
    if (!where) {
      const data = await this.getCollection<T>(collection);
      return data.length;
    }

    const result = await this.query<T>(collection, { where });
    return result.total;
  }

  /**
   * Aggregate data with group by
   */
  async aggregate<T extends { id: string }, K extends keyof T>(
    collection: CollectionName,
    groupBy: K,
    aggregations: {
      count?: boolean;
      sum?: keyof T;
      avg?: keyof T;
      min?: keyof T;
      max?: keyof T;
    }
  ): Promise<Array<{
    group: T[K];
    count?: number;
    sum?: number;
    avg?: number;
    min?: unknown;
    max?: unknown;
  }>> {
    const data = await this.getCollection<T>(collection);
    const groups = new Map<T[K], T[]>();

    // Group data
    for (const item of data) {
      const key = item[groupBy];
      const existing = groups.get(key) || [];
      existing.push(item);
      groups.set(key, existing);
    }

    // Calculate aggregations
    const results = [];
    for (const [group, items] of groups) {
      const result: {
        group: T[K];
        count?: number;
        sum?: number;
        avg?: number;
        min?: unknown;
        max?: unknown;
      } = { group };

      if (aggregations.count) {
        result.count = items.length;
      }

      if (aggregations.sum) {
        result.sum = items.reduce(
          (acc, item) => acc + (Number(item[aggregations.sum!]) || 0),
          0
        );
      }

      if (aggregations.avg && items.length > 0) {
        const sum = items.reduce(
          (acc, item) => acc + (Number(item[aggregations.avg!]) || 0),
          0
        );
        result.avg = sum / items.length;
      }

      if (aggregations.min) {
        result.min = items.reduce((min, item) => {
          const val = item[aggregations.min!];
          return min === undefined || val < min ? val : min;
        }, undefined as unknown);
      }

      if (aggregations.max) {
        result.max = items.reduce((max, item) => {
          const val = item[aggregations.max!];
          return max === undefined || val > max ? val : max;
        }, undefined as unknown);
      }

      results.push(result);
    }

    return results;
  }

  // ==================== Subscription System ====================

  /**
   * Subscribe to changes in a collection
   */
  subscribe<T>(
    collection: CollectionName,
    callback: (data: T[]) => void
  ): () => void {
    const subscribers = this.subscribers.get(collection) || new Set();
    subscribers.add(callback as (data: unknown) => void);
    this.subscribers.set(collection, subscribers);

    // Return unsubscribe function
    return () => {
      subscribers.delete(callback as (data: unknown) => void);
    };
  }

  private notifySubscribers(collection: CollectionName, data: unknown): void {
    const subscribers = this.subscribers.get(collection);
    if (subscribers) {
      for (const callback of subscribers) {
        try {
          callback(data);
        } catch (error) {
          console.error('Subscriber error:', error);
        }
      }
    }
  }

  // ==================== Transaction Support ====================

  /**
   * Start a transaction
   */
  beginTransaction(): string {
    const transaction: DatabaseTransaction = {
      id: this.generateId(),
      operations: [],
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    this.transactionLog.push(transaction);
    return transaction.id;
  }

  /**
   * Commit a transaction
   */
  async commitTransaction(transactionId: string): Promise<boolean> {
    const transaction = this.transactionLog.find(t => t.id === transactionId);
    if (!transaction || transaction.status !== 'pending') {
      return false;
    }
    transaction.status = 'committed';
    return true;
  }

  /**
   * Rollback a transaction
   */
  async rollbackTransaction(transactionId: string): Promise<boolean> {
    const transaction = this.transactionLog.find(t => t.id === transactionId);
    if (!transaction || transaction.status !== 'pending') {
      return false;
    }

    // Reverse operations
    for (const op of [...transaction.operations].reverse()) {
      if (op.type === 'create') {
        await this.delete(op.collection, op.documentId);
      } else if (op.type === 'update' && op.previousData) {
        await this.update(op.collection, op.documentId, op.previousData);
      } else if (op.type === 'delete' && op.previousData) {
        await this.create(op.collection, op.previousData as { id: string });
      }
    }

    transaction.status = 'rolledback';
    return true;
  }

  // ==================== Sync & Migration ====================

  /**
   * Log a sync entry
   */
  private async logSync(
    collection: CollectionName,
    action: 'create' | 'update' | 'delete',
    documentId: string
  ): Promise<void> {
    const syncLog = await this.storage.get<SyncLogEntry[]>(COLLECTIONS.DB_SYNC_LOG) || [];
    
    syncLog.push({
      id: this.generateId(),
      collection,
      action,
      documentId,
      timestamp: new Date().toISOString(),
      status: 'pending',
    });

    // Keep only last 1000 entries
    if (syncLog.length > 1000) {
      syncLog.splice(0, syncLog.length - 1000);
    }

    await this.storage.set(COLLECTIONS.DB_SYNC_LOG, syncLog);
  }

  /**
   * Get pending sync entries
   */
  async getPendingSyncs(): Promise<SyncLogEntry[]> {
    const syncLog = await this.storage.get<SyncLogEntry[]>(COLLECTIONS.DB_SYNC_LOG) || [];
    return syncLog.filter(entry => entry.status === 'pending');
  }

  /**
   * Mark sync entries as synced
   */
  async markAsSynced(ids: string[]): Promise<void> {
    const syncLog = await this.storage.get<SyncLogEntry[]>(COLLECTIONS.DB_SYNC_LOG) || [];
    const now = new Date().toISOString();
    
    for (const entry of syncLog) {
      if (ids.includes(entry.id)) {
        entry.status = 'synced';
        entry.syncedAt = now;
      }
    }

    await this.storage.set(COLLECTIONS.DB_SYNC_LOG, syncLog);
  }

  /**
   * Get database metadata
   */
  async getMetadata(): Promise<DatabaseMetadata> {
    const existing = await this.storage.get<DatabaseMetadata>(COLLECTIONS.DB_METADATA);
    if (existing) return existing;

    const metadata: DatabaseMetadata = {
      version: '1.0.0',
      lastMigration: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      statistics: {
        totalPatients: 0,
        totalAppointments: 0,
        totalClaims: 0,
        totalUsers: 0,
      },
    };

    await this.storage.set(COLLECTIONS.DB_METADATA, metadata);
    return metadata;
  }

  /**
   * Update database statistics
   */
  async updateStatistics(): Promise<DatabaseMetadata> {
    const metadata = await this.getMetadata();
    
    metadata.statistics = {
      totalPatients: await this.count(COLLECTIONS.PATIENTS),
      totalAppointments: await this.count(COLLECTIONS.APPOINTMENTS),
      totalClaims: await this.count(COLLECTIONS.CLAIMS),
      totalUsers: await this.count(COLLECTIONS.USERS),
    };
    metadata.updatedAt = new Date().toISOString();

    await this.storage.set(COLLECTIONS.DB_METADATA, metadata);
    return metadata;
  }

  // ==================== Export & Import ====================

  /**
   * Export all data for backup
   */
  async exportDatabase(): Promise<Record<string, unknown>> {
    const collections = Object.values(COLLECTIONS).filter(
      c => !c.startsWith('idx_') && !c.startsWith('db_')
    );

    const data: Record<string, unknown> = {};
    for (const collection of collections) {
      data[collection] = await this.getCollection(collection);
    }

    data.metadata = await this.getMetadata();
    data.exportedAt = new Date().toISOString();

    return data;
  }

  /**
   * Import data from backup
   */
  async importDatabase(data: Record<string, unknown>, merge = false): Promise<void> {
    const collections = Object.values(COLLECTIONS).filter(
      c => !c.startsWith('idx_') && !c.startsWith('db_')
    );

    for (const collection of collections) {
      if (data[collection]) {
        if (merge) {
          const existing = await this.getCollection(collection);
          const newData = data[collection] as { id: string }[];
          const existingIds = new Set(existing.map(d => (d as { id: string }).id));
          const toAdd = newData.filter(d => !existingIds.has(d.id));
          await this.saveCollection(collection, [...existing, ...toAdd]);
        } else {
          await this.saveCollection(collection, data[collection] as unknown[]);
        }
        this.invalidateCache(collection);
      }
    }

    await this.updateStatistics();
  }

  /**
   * Clear all data
   */
  async clearDatabase(): Promise<void> {
    await this.storage.clear();
    this.cache.clear();
    this.transactionLog = [];
  }

  // ==================== Helper Methods ====================

  private async getCollection<T>(collection: CollectionName): Promise<T[]> {
    const data = await this.storage.get<T[]>(collection);
    return data || [];
  }

  private async saveCollection<T>(collection: CollectionName, data: T[]): Promise<void> {
    await this.storage.set(collection, data);
  }

  private invalidateCache(collection: CollectionName, id?: string): void {
    if (id) {
      this.cache.delete(`${collection}:${id}`);
    } else {
      // Clear all entries for this collection
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${collection}:`)) {
          this.cache.delete(key);
        }
      }
    }
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ==================== Singleton Instance ====================

let databaseInstance: DatabaseEngine | null = null;

export function getDatabase(storage?: StorageAdapter): DatabaseEngine {
  if (!databaseInstance) {
    databaseInstance = new DatabaseEngine(storage);
  }
  return databaseInstance;
}

export function resetDatabase(): void {
  databaseInstance = null;
}
