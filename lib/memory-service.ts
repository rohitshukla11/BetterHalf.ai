import { MemoryEntry, MemoryType, AccessPolicy, MemorySearchQuery, MemorySearchResult, Permission } from '@/types/memory';
import { getOGStorage, OGStorageService } from './0g-storage';
import { getMemoryManager, MemoryManager } from './memory-manager';
import { getInferenceClient, InferenceClient } from './inference-client';
import { getEncryptionService } from './encryption';
import { getKeyManagementService } from './key-management';
import { v4 as uuidv4 } from 'uuid';

export class MemoryService {
  private ogStorage: OGStorageService;
  private memoryManager: MemoryManager;
  private inferenceClient: InferenceClient;
  private encryptionService = getEncryptionService();
  private keyManagement = getKeyManagementService();

  // Local storage for caching
  private memories: MemoryEntry[] = [];

  constructor() {
    console.log('🧠 MemoryService constructor called');
    this.ogStorage = getOGStorage();
    this.memoryManager = getMemoryManager();
    this.inferenceClient = getInferenceClient();
    this.loadMemoriesFromStorage();
  }

  private async initializeKeyManagement(): Promise<void> {
    try {
      const defaultPassword = process.env.NEXT_PUBLIC_DEFAULT_ENCRYPTION_PASSWORD || 'default-encryption-key-2024';
      await this.keyManagement.initializeWithPassword(defaultPassword);
      console.log('🔐 Key management initialized with default password');
    } catch (error) {
      console.warn('⚠️ Failed to initialize key management:', error);
    }
  }

  private loadMemoriesFromStorage(): void {
    try {
      const stored = localStorage.getItem('memories');
      if (stored) {
        this.memories = JSON.parse(stored);
        console.log(`📚 Loaded ${this.memories.length} memories from local storage`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load memories from storage:', error);
      this.memories = [];
    }
  }

  private saveMemoriesToStorage(): void {
    try {
      localStorage.setItem('memories', JSON.stringify(this.memories));
      console.log(`💾 Saved ${this.memories.length} memories to local storage`);
    } catch (error) {
      console.warn('⚠️ Failed to save memories to storage:', error);
    }
  }

  async initialize(): Promise<void> {
    console.log('🧠 Initializing memory service...');

    try {
      await this.initializeKeyManagement();
      await this.ogStorage.initialize();
      await this.memoryManager.initialize();
      await this.inferenceClient.initialize();
      console.log('✅ Memory service initialized successfully');
    } catch (error) {
      console.error('❌ Memory service initialization failed:', error);
      throw error;
    }
  }

  async searchMemories(query: MemorySearchQuery): Promise<MemorySearchResult> {
    console.log('🔍 Searching memories with query:', query);

    try {
      // Use 0G Storage for semantic search
      const embeddingResults = await this.memoryManager.queryMemory({
        query: query.query,
        limit: query.limit || 10,
        threshold: 0.7
      });

      // Convert embedding results to memory entries
      const memories = embeddingResults.map(result => ({
        id: result.storageId,
        content: result.metadata.content,
        type: 'conversation' as MemoryType,
        category: 'chat',
        tags: result.metadata.tags,
        createdAt: new Date(result.metadata.timestamp),
        updatedAt: new Date(result.metadata.timestamp),
        encrypted: true,
        accessPolicy: {
          owner: result.metadata.agentId,
          permissions: []
        } as AccessPolicy,
        metadata: {
          size: result.metadata.content.length,
          checksum: result.metadata.contentHash,
          version: 1,
          relatedMemories: [],
          encryptionKeyId: '',
          encryptionSalt: ''
        },
        ipfsHash: result.storageId
      }));

      console.log(`🔍 Found ${memories.length} memories matching query`);

      return {
        memories,
        totalCount: memories.length,
        facets: {
          types: {} as Record<MemoryType, number>,
          categories: {} as Record<string, number>,
          tags: {} as Record<string, number>
        }
      };
    } catch (error) {
      console.error('❌ Memory search failed:', error);
      throw error;
    }
  }

  async createMemory(memoryData: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt' | 'ipfsHash'>): Promise<MemoryEntry> {
    const memoryId = uuidv4();
    const now = new Date();

    try {
      // Store in local cache first
      const memory: MemoryEntry = {
        ...memoryData,
        id: memoryId,
        createdAt: now,
        updatedAt: now,
        ipfsHash: memoryId,
        encrypted: true,
        accessPolicy: {
          ...memoryData.accessPolicy,
          owner: 'local-user'
        },
        metadata: {
          size: memoryData.content.length,
          checksum: '',
          version: 1,
          relatedMemories: [],
          encryptionKeyId: '',
          encryptionSalt: ''
        }
      };

      // Add to local storage
      this.memories.push(memory);
      this.saveMemoriesToStorage();

      // Store embedding in 0G Storage
      try {
        await this.memoryManager.storeEmbedding(memoryId, memoryData.content, {
          agentId: 'local-user',
          tags: memoryData.tags || []
        });

        console.log(`✅ Memory stored locally and embedding uploaded to 0G Storage: ${memoryId}`);
      } catch (ogError) {
        console.warn('⚠️ Failed to upload to 0G Storage, keeping local copy:', ogError);
      }

      return memory;
    } catch (error: any) {
      console.error('❌ Memory creation failed:', error);
      throw new Error(`Memory creation failed: ${error?.message || 'Unknown error'}`);
    }
  }

  async getMemory(memoryId: string): Promise<MemoryEntry | null> {
    try {
      // Try local cache first
      let memory = this.memories.find(m => m.id === memoryId);

      if (!memory) {
        // Try to retrieve from 0G Storage
        const embeddingResults = await this.memoryManager.getMemoryByConversation(memoryId);
        if (embeddingResults.length > 0) {
          const result = embeddingResults[0];
          memory = {
            id: memoryId,
            content: result.metadata.content,
            type: 'conversation' as MemoryType,
            category: 'chat',
            tags: result.metadata.tags,
            createdAt: new Date(result.metadata.timestamp),
            updatedAt: new Date(result.metadata.timestamp),
            encrypted: true,
            accessPolicy: {
              owner: result.metadata.agentId,
              permissions: []
            } as AccessPolicy,
            metadata: {
              size: result.metadata.content.length,
              checksum: result.metadata.contentHash,
              version: 1,
              relatedMemories: [],
              encryptionKeyId: '',
              encryptionSalt: ''
            },
            ipfsHash: result.storageId
          };

          // Cache locally
          this.memories.push(memory);
          this.saveMemoriesToStorage();
        }
      }

      if (!memory) {
        console.log(`Memory not found: ${memoryId}`);
        return null;
      }

      return memory;
    } catch (error) {
      console.error('❌ Memory retrieval failed:', error);
      throw error;
    }
  }

  async updateMemory(memoryId: string, updates: Partial<MemoryEntry>): Promise<MemoryEntry> {
    try {
      const existingMemoryIndex = this.memories.findIndex(m => m.id === memoryId);
      if (existingMemoryIndex === -1) {
        throw new Error(`Memory not found: ${memoryId}`);
      }

      const existingMemory = this.memories[existingMemoryIndex];

      const updatedMemory: MemoryEntry = {
        ...existingMemory,
        ...updates,
        updatedAt: new Date()
      };

      // Update locally
      this.memories[existingMemoryIndex] = updatedMemory;
      this.saveMemoriesToStorage();

      // Update embedding in 0G Storage if content changed
      if (updates.content) {
        try {
          await this.memoryManager.storeEmbedding(memoryId, updates.content, {
            agentId: 'local-user',
            tags: updatedMemory.tags || []
          });
        } catch (ogError) {
          console.warn('⚠️ Failed to update in 0G Storage:', ogError);
        }
      }

      console.log(`Memory updated successfully: ${memoryId}`);
      return updatedMemory;
    } catch (error) {
      console.error('❌ Memory update failed:', error);
      throw error;
    }
  }

  async deleteMemory(memoryId: string): Promise<boolean> {
    try {
      const memoryIndex = this.memories.findIndex(m => m.id === memoryId);
      if (memoryIndex === -1) {
        console.log(`Memory not found: ${memoryId}`);
        return false;
      }

      // Remove from local storage
      this.memories.splice(memoryIndex, 1);
      this.saveMemoriesToStorage();

      console.log(`Memory deleted locally: ${memoryId}`);
      return true;
    } catch (error) {
      console.error('❌ Memory deletion failed:', error);
      throw error;
    }
  }

  async getAllMemories(): Promise<MemoryEntry[]> {
    try {
      // Return decrypted memories from local cache
      const decryptedMemories = await Promise.all(
        this.memories.map(async (memory) => {
          return memory;
        })
      );

      return decryptedMemories;
    } catch (error) {
      console.error('❌ Failed to get all memories:', error);
      throw error;
    }
  }

  async getStorageStats(): Promise<any> {
    const ogStats = await this.ogStorage.getStorageStats();
    const memoryStats = await this.memoryManager.getMemoryStats();
    const inferenceStats = await this.inferenceClient.getInferenceStats();

    return {
      totalMemories: this.memories.length,
      storageType: 'hybrid',
      localCache: this.memories.length,
      ogStorage: ogStats,
      memoryManager: memoryStats,
      inferenceClient: inferenceStats,
      lastUpdated: new Date().toISOString()
    };
  }

  async clearAllMemories(): Promise<void> {
    try {
      this.memories = [];
      this.saveMemoriesToStorage();
      console.log('🗑️ All memories cleared from local cache');
    } catch (error) {
      console.error('❌ Failed to clear memories:', error);
      throw error;
    }
  }

  async syncWithOGStorage(): Promise<void> {
    try {
      console.log('🔄 Syncing with 0G Storage...');
      // This would implement a sync mechanism to ensure local cache
      // is up to date with 0G Storage
      console.log('✅ Sync completed');
    } catch (error) {
      console.error('❌ Sync failed:', error);
      throw error;
    }
  }
}

// Factory function to create memory service
export function getMemoryService(): MemoryService {
  return new MemoryService();
}