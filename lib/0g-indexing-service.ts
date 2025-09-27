import { ethers } from 'ethers';
import { MemoryEntry, MemoryType } from '@/types/memory';
import { OGStorageService, getOGStorage } from './0g-storage';
import { MemoryRegistryABI } from './contracts/MemoryRegistry';

// Contract interface for type safety
interface MemoryHash {
  hash: string;
  metadata: string;
  agent: string;
  timestamp: bigint;
  isActive: boolean;
  zgStorageId: string;
  contentType: string;
  size: bigint;
  tags: string[];
}

interface ContractConfig {
  contractAddress: string;
  rpcUrl: string;
  privateKey: string;
  chainId: number;
}

interface IndexingResult {
  success: boolean;
  transactionHash?: string;
  contractHash?: string;
  error?: string;
}

/**
 * 0G Indexing Service - Bridges the MemoryRegistry contract with 0G Storage
 * Provides seamless indexing of memory entries both on-chain and in 0G Storage
 */
export class ZGIndexingService {
  private ogStorage: OGStorageService;
  private contract: ethers.Contract | null = null;
  private signer: ethers.Signer | null = null;
  private provider: ethers.Provider | null = null;
  private config: ContractConfig | null = null;

  constructor() {
    this.ogStorage = getOGStorage();
    console.log('🔗 0G Indexing Service initialized');
  }

  /**
   * Initialize the service with contract configuration
   */
  async initialize(config: ContractConfig): Promise<void> {
    try {
      this.config = config;
      
      // Initialize provider and signer with connection timeout
      console.log(`🔗 Connecting to 0G RPC: ${config.rpcUrl}`);
      this.provider = new ethers.JsonRpcProvider(config.rpcUrl, {
        name: "0g-testnet",
        chainId: config.chainId
      });
      
      // Test connection with timeout
      const connectionTest = Promise.race([
        this.provider.getNetwork(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 10000)
        )
      ]);
      
      await connectionTest;
      console.log('✅ 0G RPC connection established');
      
      this.signer = new ethers.Wallet(config.privateKey, this.provider);
      
      // Initialize contract
      this.contract = new ethers.Contract(
        config.contractAddress,
        MemoryRegistryABI,
        this.signer
      );

      // Initialize 0G Storage
      await this.ogStorage.initialize();

      console.log('✅ 0G Indexing Service initialized successfully');
      console.log(`📍 Contract Address: ${config.contractAddress}`);
      console.log(`⛓️  Chain ID: ${config.chainId}`);
    } catch (error) {
      console.warn('⚠️  0G Contract connection failed, continuing with storage-only mode:', error.message);
      // Don't throw - allow the service to work in storage-only mode
      this.contract = null;
      this.provider = null;
      this.signer = null;
      
      // Still initialize 0G Storage
      try {
        await this.ogStorage.initialize();
        console.log('📦 0G Storage initialized (contract disabled)');
      } catch (storageError) {
        console.error('❌ Failed to initialize 0G Storage:', storageError);
        throw new Error(`Storage initialization failed: ${storageError?.message}`);
      }
    }
  }

  /**
   * Index a memory entry both in 0G Storage and on-chain
   */
  async indexMemory(memory: MemoryEntry, contentVector?: number[]): Promise<IndexingResult> {
    if (!this.config) {
      throw new Error('Service not initialized. Call initialize() first.');
    }

    try {
      console.log(`🔍 Indexing memory: ${memory.id.slice(0, 8)}...`);

      // 1. First store in 0G Storage and get the storage ID
      let zgStorageId = memory.metadata?.blobId || memory.ipfsHash;
      
      if (!zgStorageId || zgStorageId === memory.id) {
        // Store content in 0G Storage if not already stored
        console.log('📤 Storing content in 0G Storage...');
        const storageResult = await this.ogStorage.uploadContent(memory.content, {
          contentType: this.getContentType(memory),
          tags: memory.tags || [],
          agentId: memory.accessPolicy?.owner || 'unknown'
        });
        zgStorageId = storageResult.dataId;
      }

      // 2. If contract is available, also store on-chain
      if (this.contract) {
        try {
          // Create content hash for blockchain
          const contentHash = ethers.keccak256(ethers.toUtf8Bytes(memory.content));

          // Prepare contract parameters
          const metadata = JSON.stringify({
            title: memory.title || 'Untitled Memory',
            category: memory.category,
            agentId: memory.accessPolicy?.owner,
            createdAt: memory.createdAt?.toISOString(),
            encrypted: memory.encrypted
          });

          const contentType = this.getContentType(memory);
          const size = memory.content.length;
          const tags = memory.tags || [];

          // Commit to blockchain
          console.log('⛓️  Committing to blockchain...');
          const tx = await this.contract.commitMemoryHash(
            contentHash,
            metadata,
            zgStorageId,
            contentType,
            size,
            tags
          );

          const receipt = await tx.wait();
          
          console.log(`✅ Memory indexed successfully (storage + blockchain)!`);
          console.log(`📍 Transaction Hash: ${receipt.hash}`);
          console.log(`🔗 0G Storage ID: ${zgStorageId}`);

          return {
            success: true,
            transactionHash: receipt.hash,
            contractHash: contentHash,
          };
        } catch (contractError: any) {
          console.warn('⚠️  Blockchain indexing failed, but storage succeeded:', contractError.message);
          // Continue with storage-only success
        }
      }

      // Storage-only success
      console.log(`✅ Memory stored in 0G Storage (blockchain unavailable)`);
      console.log(`🔗 0G Storage ID: ${zgStorageId}`);

      return {
        success: true,
        contractHash: ethers.keccak256(ethers.toUtf8Bytes(memory.content)),
      };

    } catch (error: any) {
      console.error('❌ Failed to index memory:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Batch index multiple memory entries
   */
  async batchIndexMemories(memories: MemoryEntry[]): Promise<IndexingResult[]> {
    if (!this.contract) {
      console.warn('⚠️ Batch blockchain indexing not available, using storage-only mode');
      // Fall back to individual storage-only indexing
      const results: IndexingResult[] = [];
      for (const memory of memories) {
        const result = await this.indexMemory(memory);
        results.push(result);
      }
      return results;
    }

    try {
      console.log(`📦 Batch indexing ${memories.length} memories...`);

      // Prepare arrays for batch operation
      const hashes: string[] = [];
      const metadatas: string[] = [];
      const zgStorageIds: string[] = [];
      const contentTypes: string[] = [];
      const sizes: number[] = [];
      const allTags: string[][] = [];

      // Process each memory
      for (const memory of memories) {
        // Store in 0G Storage if needed
        let zgStorageId = memory.metadata?.blobId || memory.ipfsHash;
        
        if (!zgStorageId || zgStorageId === memory.id) {
          const storageResult = await this.ogStorage.uploadContent(memory.content, {
            contentType: this.getContentType(memory),
            tags: memory.tags || [],
            agentId: memory.accessPolicy?.owner || 'unknown'
          });
          zgStorageId = storageResult.dataId;
        }

        hashes.push(ethers.keccak256(ethers.toUtf8Bytes(memory.content)));
        metadatas.push(JSON.stringify({
          title: memory.title || 'Untitled Memory',
          category: memory.category,
          agentId: memory.accessPolicy?.owner,
          createdAt: memory.createdAt?.toISOString(),
        }));
        zgStorageIds.push(zgStorageId);
        contentTypes.push(this.getContentType(memory));
        sizes.push(memory.content.length);
        allTags.push(memory.tags || []);
      }

      // Execute batch commit
      const tx = await this.contract.batchCommitMemoryHashes(
        hashes,
        metadatas,
        zgStorageIds,
        contentTypes,
        sizes,
        allTags
      );

      const receipt = await tx.wait();

      console.log(`✅ Batch indexed ${memories.length} memories successfully!`);
      console.log(`📍 Transaction Hash: ${receipt.hash}`);

      // Return success result for all memories
      return memories.map((_, index) => ({
        success: true,
        transactionHash: receipt.hash,
        contractHash: hashes[index],
      }));

    } catch (error: any) {
      console.error('❌ Failed to batch index memories:', error);
      // Return error for all memories
      return memories.map(() => ({
        success: false,
        error: error.message || 'Batch indexing failed'
      }));
    }
  }

  /**
   * Query memories by various criteria
   */
  async queryMemories(criteria: {
    tag?: string;
    contentType?: string;
    agent?: string;
    zgStorageId?: string;
  }): Promise<MemoryHash[]> {
    if (!this.contract) {
      console.warn('⚠️ Blockchain querying not available, returning empty results');
      return [];
    }

    try {
      let hashes: string[] = [];

      if (criteria.tag) {
        hashes = await this.contract.getMemoryHashesByTag(criteria.tag);
      } else if (criteria.contentType) {
        hashes = await this.contract.getMemoryHashesByContentType(criteria.contentType);
      } else if (criteria.agent) {
        hashes = await this.contract.getAgentMemories(criteria.agent);
      } else if (criteria.zgStorageId) {
        const hash = await this.contract.getMemoryHashByZGStorageId(criteria.zgStorageId);
        hashes = hash !== '0x0000000000000000000000000000000000000000000000000000000000000000' ? [hash] : [];
      }

      // Fetch detailed information for each hash
      const memories: MemoryHash[] = [];
      for (const hash of hashes) {
        const memoryData = await this.contract.getMemoryHash(hash);
        memories.push({
          hash: memoryData.hash,
          metadata: memoryData.metadata,
          agent: memoryData.agent,
          timestamp: memoryData.timestamp,
          isActive: memoryData.isActive,
          zgStorageId: memoryData.zgStorageId,
          contentType: memoryData.contentType,
          size: memoryData.size,
          tags: memoryData.tags
        });
      }

      return memories;

    } catch (error: any) {
      console.error('❌ Failed to query memories:', error);
      throw new Error(`Query failed: ${error.message}`);
    }
  }

  /**
   * Get comprehensive indexing statistics
   */
  async getIndexingStats(): Promise<{
    totalMemories: number;
    activeMemories: number;
    verifiedMemories: number;
    totalTags: number;
    totalSize: number;
  }> {
    if (!this.contract) {
      console.warn('⚠️ Blockchain stats not available');
      return {
        totalMemories: 0,
        activeMemories: 0,
        verifiedMemories: 0,
        totalTags: 0,
        totalSize: 0
      };
    }

    try {
      const stats = await this.contract.getMemoryStats();
      return {
        totalMemories: Number(stats[0]),
        activeMemories: Number(stats[1]),
        verifiedMemories: Number(stats[2]),
        totalTags: Number(stats[3]),
        totalSize: Number(stats[4])
      };
    } catch (error: any) {
      console.error('❌ Failed to get stats:', error);
      return {
        totalMemories: 0,
        activeMemories: 0,
        verifiedMemories: 0,
        totalTags: 0,
        totalSize: 0
      };
    }
  }

  /**
   * Verify a memory hash on-chain
   */
  async verifyMemory(hash: string): Promise<IndexingResult> {
    if (!this.contract) {
      console.warn('⚠️ Memory verification not available (blockchain offline)');
      return {
        success: false,
        error: 'Blockchain verification not available'
      };
    }

    try {
      const tx = await this.contract.verifyMemoryHash(hash);
      const receipt = await tx.wait();

      console.log(`✅ Memory verified: ${hash.slice(0, 10)}...`);
      
      return {
        success: true,
        transactionHash: receipt.hash,
        contractHash: hash
      };

    } catch (error: any) {
      console.error('❌ Failed to verify memory:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all available tags from the contract
   */
  async getAllTags(): Promise<string[]> {
    if (!this.contract) {
      console.warn('⚠️ Tag querying not available (blockchain offline)');
      return [];
    }

    try {
      return await this.contract.getAllTags();
    } catch (error: any) {
      console.error('❌ Failed to get tags:', error);
      return [];
    }
  }

  /**
   * Private helper to determine content type
   */
  private getContentType(memory: MemoryEntry): string {
    if (memory.type) {
      switch (memory.type) {
        case MemoryType.CONVERSATION:
          return 'conversation';
        case MemoryType.DOCUMENT:
          return 'document';
        case MemoryType.IMAGE:
          return 'image';
        case MemoryType.PREFERENCE:
          return 'preference';
        default:
          return 'text';
      }
    }
    return 'text';
  }

  /**
   * Check if the service is properly initialized
   */
  isInitialized(): boolean {
    return this.config !== null; // Service can work with storage only
  }

  /**
   * Check if blockchain functionality is available
   */
  isBlockchainAvailable(): boolean {
    return this.contract !== null && this.provider !== null;
  }
}

// Singleton instance
let zgIndexingService: ZGIndexingService | null = null;

/**
 * Get the global 0G Indexing Service instance
 */
export function getZGIndexingService(): ZGIndexingService {
  if (!zgIndexingService) {
    zgIndexingService = new ZGIndexingService();
  }
  return zgIndexingService;
}
