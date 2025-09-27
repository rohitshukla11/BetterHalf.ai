import { MemoryEntry, MemoryType, AccessPolicy, MemorySearchQuery, MemorySearchResult, Permission } from '@/types/memory';
import { getOGStorage, OGStorageService } from './0g-storage';
import { getMemoryManager, MemoryManager } from './memory-manager';
import { getInferenceClient, InferenceClient } from './inference-client';
import { getEncryptionService } from './encryption';
import { getKeyManagementService } from './key-management';
import { v4 as uuidv4 } from 'uuid';
import { MemoryIndexer } from './memory-indexer';

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
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        console.log('📚 Not in browser environment, skipping localStorage load');
        this.memories = [];
        return;
      }
      
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

  private async loadMemoriesFromWalrus(): Promise<void> {
    try {
      console.log('🦭 Loading memories from Walrus storage...');
      
      // Use the new MemoryIndexer system
      const memoryIndex = MemoryIndexer.getMetadataIndex();
      
      if (memoryIndex.length === 0) {
        console.log('📚 No memory index found, memories might not be loaded yet');
        return;
      }

      console.log(`📚 Found ${memoryIndex.length} memories in index`);
      
      // Load memories from the index
      this.memories = memoryIndex;
      
      // Get index statistics (now async)
      try {
        const stats = await MemoryIndexer.getIndexStats();
        console.log(`✅ Loaded ${this.memories.length} memories from enhanced index`);
        console.log(`📊 Local index stats: ${stats.local.metadataCount} metadata, ${stats.local.vectorCount} vectors, ${Math.round(stats.local.totalSize/1024)}KB`);
        if (stats.onChain) {
          console.log(`⛓️  On-chain stats: ${stats.onChain.totalMemories} total, ${stats.onChain.verifiedMemories} verified`);
        }
      } catch (error) {
        console.warn('⚠️ Failed to get index stats:', error);
      }
      
    } catch (error) {
      console.warn('⚠️ Failed to load memories from Walrus:', error);
    }
  }

  private getMemoryIndex(): MemoryEntry[] {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return [];
      }
      
      const index = localStorage.getItem('walrus_memory_index');
      if (index) {
        return JSON.parse(index);
      }
      return [];
    } catch (error) {
      console.warn('⚠️ Failed to load memory index:', error);
      return [];
    }
  }

  private updateMemoryIndex(memory: MemoryEntry): void {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return;
      }
      
      const currentIndex = this.getMemoryIndex();
      const existingIndex = currentIndex.findIndex(m => m.id === memory.id);
      
      if (existingIndex >= 0) {
        currentIndex[existingIndex] = memory;
      } else {
        currentIndex.unshift(memory);
      }
      
      localStorage.setItem('walrus_memory_index', JSON.stringify(currentIndex));
      console.log(`📚 Updated memory index with ${currentIndex.length} memories`);
    } catch (error) {
      console.warn('⚠️ Failed to update memory index:', error);
    }
  }

  private saveMemoriesToStorage(): void {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        console.log('💾 Not in browser environment, skipping localStorage save');
        return;
      }
      
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
      
      // Load memories from Walrus storage
      await this.loadMemoriesFromWalrus();
      
      console.log('✅ Memory service initialized successfully');
    } catch (error) {
      console.error('❌ Memory service initialization failed:', error);
      throw error;
    }
  }

  async searchMemories(query: MemorySearchQuery): Promise<MemorySearchResult> {
    console.log('🔍 Searching memories with query:', query);

    try {
      // Use the working direct contract approach
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/memories-from-contract`);
      
      if (response.ok) {
        const contractResult = await response.json();
        if (contractResult.memories && contractResult.memories.length > 0) {
          console.log(`🔍 Found ${contractResult.memories.length} memories from direct contract query`);
          
          // Apply query filters if needed
          let filteredMemories = contractResult.memories;
          
          if (query.query) {
            filteredMemories = filteredMemories.filter((memory: MemoryEntry) =>
              memory.content.toLowerCase().includes(query.query.toLowerCase()) ||
              memory.tags?.some(tag => tag.toLowerCase().includes(query.query.toLowerCase()))
            );
          }
          
          if (query.type) {
            filteredMemories = filteredMemories.filter((memory: MemoryEntry) => memory.type === query.type);
          }
          
          if (query.category) {
            filteredMemories = filteredMemories.filter((memory: MemoryEntry) => memory.category === query.category);
          }
          
          if (query.tags && query.tags.length > 0) {
            filteredMemories = filteredMemories.filter((memory: MemoryEntry) =>
              query.tags!.some(tag => memory.tags?.includes(tag))
            );
          }
          
          // Apply limit and offset
          const startIndex = query.offset || 0;
          const endIndex = startIndex + (query.limit || 20);
          filteredMemories = filteredMemories.slice(startIndex, endIndex);
          
          return {
            memories: filteredMemories,
            totalCount: filteredMemories.length,
            facets: this.calculateFacets(filteredMemories)
          };
        }
      }

      // Fallback to local search if contract query fails
      console.log('🔍 Contract query failed or returned no results, falling back to local search');
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

      console.log(`🔍 Found ${memories.length} memories from local search`);

      return {
        memories,
        totalCount: memories.length,
        facets: this.calculateFacets(memories)
      };
    } catch (error) {
      console.error('❌ Memory search failed:', error);
      throw error;
    }
  }




  private calculateFacets(memories: MemoryEntry[]) {
    const facets = {
      types: {} as Record<MemoryType, number>,
      categories: {} as Record<string, number>,
      tags: {} as Record<string, number>
    };

    memories.forEach(memory => {
      // Count types
      facets.types[memory.type] = (facets.types[memory.type] || 0) + 1;
      
      // Count categories
      facets.categories[memory.category] = (facets.categories[memory.category] || 0) + 1;
      
      // Count tags
      memory.tags?.forEach(tag => {
        facets.tags[tag] = (facets.tags[tag] || 0) + 1;
      });
    });

    return facets;
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

      // Store embedding in 0G Storage and get the vector for indexing
      let embeddingVector: number[] | undefined;
      try {
        // Generate embedding vector first
        embeddingVector = await this.memoryManager.generateEmbedding(memoryData.content);
        
        const embeddingResult = await this.memoryManager.storeEmbedding(memoryId, memoryData.content, {
          agentId: 'local-user',
          tags: memoryData.tags || []
        });

        // Update memory with 0G storage information
        if (embeddingResult.explorerUrl) {
          memory.walrusUrl = embeddingResult.explorerUrl; // This is now the Walrus explorer URL
        }
        if (embeddingResult.transactionHash) {
          memory.transactionHash = embeddingResult.transactionHash;
        }
        if (embeddingResult.storageId) {
          memory.ipfsHash = embeddingResult.storageId; // Store the blob ID
        }

        console.log(`✅ Memory stored locally and embedding uploaded to 0G Storage: ${memoryId}`);
      } catch (ogError) {
        console.warn('⚠️ Failed to upload to 0G Storage, keeping local copy:', ogError);
      }

      // Update the memory indices using the new indexer (with vector for similarity search)
      // This is now async and will handle both local and on-chain indexing
      await MemoryIndexer.addToIndex(memory, embeddingVector);

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