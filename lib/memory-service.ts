import { MemoryEntry, MemoryType, AccessPolicy, MemorySearchQuery, MemorySearchResult, Permission } from '@/types/memory';
import { getEncryptionService } from './encryption';
import { getKeyManagementService } from './key-management';
import { v4 as uuidv4 } from 'uuid';

export class MemoryService {
  private encryptionService = getEncryptionService();
  private keyManagement = getKeyManagementService();
  
  // Request throttling
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessing = false;
  private lastRequestTime = 0;
  private readonly REQUEST_DELAY = 1000; // 1 second between requests
  
  // Local storage for memories
  private memories: MemoryEntry[] = [];
  
  constructor() {
    console.log('🧠 MemoryService constructor called');
    this.loadMemoriesFromStorage();
  }

  private async initializeKeyManagement(): Promise<void> {
    try {
      // Use a default password for basic functionality
      // In a production app, this should be user-provided
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
      console.log('✅ Memory service initialized successfully');
    } catch (error) {
      console.error('❌ Memory service initialization failed:', error);
      throw error;
    }
  }

  async searchMemories(query: MemorySearchQuery): Promise<MemorySearchResult> {
    console.log('🔍 Searching memories with query:', query);
    
    try {
      // Simple text search in memory content
      const searchTerm = query.query?.toLowerCase() || '';
      const filteredMemories = this.memories.filter(memory => {
        if (!searchTerm) return true;
        
        return (
          memory.content.toLowerCase().includes(searchTerm) ||
          memory.category.toLowerCase().includes(searchTerm) ||
          memory.type.toLowerCase().includes(searchTerm)
        );
      });

      console.log(`🔍 Found ${filteredMemories.length} memories matching query`);
      
      return {
        memories: filteredMemories,
        totalCount: filteredMemories.length,
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
    
    const ownerAddress = 'local-user'; // Simplified for local storage
    
    try {
      // Encrypt the memory content
      const encryptedContent = await this.encryptionService.encrypt(memoryData.content);
      
      const memory: MemoryEntry = {
        ...memoryData,
        id: memoryId,
        createdAt: now,
        updatedAt: now,
        ipfsHash: memoryId, // Use memory ID as hash for local storage
        content: encryptedContent.encryptedContent,
        encrypted: true,
        accessPolicy: {
          ...memoryData.accessPolicy,
          owner: ownerAddress
        },
        metadata: {
          size: encryptedContent.encryptedContent.length,
          checksum: '',
          version: 1,
          relatedMemories: [],
          encryptionKeyId: '',
          encryptionSalt: encryptedContent.salt
        }
      };

      // Add to local storage
      this.memories.push(memory);
      this.saveMemoriesToStorage();
      
      console.log(`Memory created successfully: ${memoryId}`);
      
      return memory;
    } catch (error: any) {
      console.error('❌ Memory creation failed:', error);
      throw new Error(`Memory creation failed: ${error?.message || 'Unknown error'}`);
    }
  }

  async getMemory(memoryId: string): Promise<MemoryEntry | null> {
    try {
      const memory = this.memories.find(m => m.id === memoryId);
      if (!memory) {
        console.log(`Memory not found: ${memoryId}`);
        return null;
      }

      // Decrypt the content
      const encryptedData = {
        encryptedContent: memory.content,
        iv: '',
        salt: memory.metadata.encryptionSalt || '',
        tag: '',
        algorithm: 'AES-256-GCM',
        keyDerivation: 'PBKDF2',
        iterations: 100000
      };
      const decryptedContent = await this.encryptionService.decrypt(encryptedData, 'default-key');
      
      return {
        ...memory,
        content: decryptedContent.content
      };
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
      
      // Encrypt content if it's being updated
      let encryptedContent = existingMemory.content;
      if (updates.content) {
        const encrypted = await this.encryptionService.encrypt(updates.content);
        encryptedContent = encrypted.encryptedContent;
      }

      const updatedMemory: MemoryEntry = {
        ...existingMemory,
        ...updates,
        content: encryptedContent,
        updatedAt: new Date()
      };

      // Update in local storage
      this.memories[existingMemoryIndex] = updatedMemory;
      this.saveMemoriesToStorage();
      
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
      
      console.log(`Memory deleted successfully: ${memoryId}`);
      return true;
    } catch (error) {
      console.error('❌ Memory deletion failed:', error);
      throw error;
    }
  }

  async getAllMemories(): Promise<MemoryEntry[]> {
    try {
      // Return decrypted memories
      const decryptedMemories = await Promise.all(
        this.memories.map(async (memory) => {
          const encryptedData = {
            encryptedContent: memory.content,
            iv: '',
            salt: memory.metadata.encryptionSalt || '',
            tag: '',
            algorithm: 'AES-256-GCM',
            keyDerivation: 'PBKDF2',
            iterations: 100000
          };
          const decryptedContent = await this.encryptionService.decrypt(encryptedData, 'default-key');
          return {
            ...memory,
            content: decryptedContent.content
          };
        })
      );
      
      return decryptedMemories;
    } catch (error) {
      console.error('❌ Failed to get all memories:', error);
      throw error;
    }
  }

  async getStorageStats(): Promise<any> {
    return {
      totalMemories: this.memories.length,
      storageType: 'local',
      lastUpdated: new Date().toISOString()
    };
  }

  async clearAllMemories(): Promise<void> {
    try {
      this.memories = [];
      this.saveMemoriesToStorage();
      console.log('🗑️ All memories cleared');
    } catch (error) {
      console.error('❌ Failed to clear memories:', error);
      throw error;
    }
  }
}

// Factory function to create memory service
export function getMemoryService(): MemoryService {
  return new MemoryService();
}