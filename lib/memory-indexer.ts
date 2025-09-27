import { MemoryEntry } from '@/types/memory';
import { getZGIndexingService, ZGIndexingService } from './0g-indexing-service';
import { getMemoryRegistryConfig } from './contracts/MemoryRegistry';

/**
 * Enhanced Memory Indexer - Handles indexing across local storage, 0G Storage, and 0G Chain
 * Provides hybrid indexing with local caching and on-chain verification
 */
export class MemoryIndexer {
  private static readonly MEMORY_INDEX_KEY = 'og_memory_index';
  private static readonly VECTOR_INDEX_KEY = 'og_vector_index';
  private static readonly INDEX_CONFIG_KEY = 'og_index_config';
  
  private static zgIndexingService: ZGIndexingService | null = null;
  private static initializationPromise: Promise<void> | null = null;
  
  /**
   * Initialize the indexing service
   */
  private static async ensureInitialized(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.initialize();
    return this.initializationPromise;
  }

  private static async initialize(): Promise<void> {
    try {
      // Allow server-side initialization when PRIVATE_KEY or NEXT_PUBLIC_0G_PRIVATE_KEY is set
      const serverSide = typeof window === 'undefined';
      const envPrivateKey = process.env.NEXT_PUBLIC_0G_PRIVATE_KEY || process.env.PRIVATE_KEY;
      if (serverSide && !envPrivateKey) {
        console.log('🔗 Server environment: 0G contract indexing disabled (no PRIVATE_KEY)');
        return;
      }

      this.zgIndexingService = getZGIndexingService();
      
      const config = getMemoryRegistryConfig();
      const privateKey = process.env.NEXT_PUBLIC_0G_PRIVATE_KEY || 
                        process.env.PRIVATE_KEY || 
                        (typeof window !== 'undefined' ? localStorage.getItem('0g_private_key') : null);
      
      if (!privateKey) {
        console.warn('⚠️ No private key found for 0G contract indexing');
        return;
      }

      if (!config.contractAddress) {
        console.warn('⚠️ No contract address configured for 0G indexing');
        return;
      }

      await this.zgIndexingService.initialize({
        contractAddress: config.contractAddress,
        rpcUrl: config.rpcUrl,
        chainId: config.chainId,
        privateKey: privateKey
      });

      console.log('✅ 0G Indexing Service initialized for MemoryIndexer');
    } catch (error) {
      console.error('❌ Failed to initialize 0G Indexing Service:', error);
      this.zgIndexingService = null;
    }
  }

  /**
   * Add memory to both local and on-chain indices
   */
  static async addToIndex(memory: MemoryEntry, vector?: number[]): Promise<void> {
    try {
      // Always update local indices first (fast)
      this.updateLocalMetadataIndex(memory);
      
      if (vector && vector.length > 0) {
        this.updateLocalVectorIndex(memory.id, vector, memory);
      }
      
      console.log(`📚 Added memory to local index: ${memory.id.slice(0, 8)}...`);

      // Try to add to 0G contract (async, non-blocking)
      this.addToOnChainIndex(memory, vector).catch(error => {
        console.warn('⚠️ Failed to add to on-chain index:', error);
      });

    } catch (error) {
      console.warn('⚠️ Failed to add memory to index:', error);
    }
  }

  /**
   * Add memory to on-chain index (async)
   */
  private static async addToOnChainIndex(memory: MemoryEntry, vector?: number[]): Promise<void> {
    try {
      await this.ensureInitialized();
      
      if (!this.zgIndexingService?.isInitialized()) {
        console.log('🔗 0G indexing service not available, skipping on-chain indexing');
        return;
      }

      const result = await this.zgIndexingService.indexMemory(memory, vector);
      
      if (result.success) {
        console.log(`⛓️  Memory indexed on-chain: ${result.transactionHash?.slice(0, 10)}... (pending)`);
        
        // Update memory object with blockchain explorer URL (pending transaction)
        if (result.transactionHash) {
          memory.explorerUrl = `${process.env.NEXT_PUBLIC_0G_EXPLORER_URL || 'https://chainscan-testnet.0g.ai'}/tx/${result.transactionHash}`;
          memory.transactionHash = result.transactionHash;
          console.log(`🔗 0G Explorer URL: ${memory.explorerUrl}`);
        }
        
        // Update local config with transaction info
        this.updateIndexConfig(memory.id, {
          onChain: true,
          transactionHash: result.transactionHash,
          contractHash: result.contractHash,
          indexedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.warn('⚠️ On-chain indexing failed:', error);
    }
  }
  
  /**
   * Update local metadata index (localStorage-based or server-side fallback)
   */
  private static updateLocalMetadataIndex(memory: MemoryEntry): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      // In server environment, skip local indexing but log the action
      console.log(`📚 Server environment: Memory ${memory.id.slice(0, 8)}... would be indexed locally`);
      return;
    }
    
    const currentIndex = this.getMetadataIndex();
    const existingIndex = currentIndex.findIndex(m => m.id === memory.id);
    
    if (existingIndex >= 0) {
      currentIndex[existingIndex] = memory;
    } else {
      currentIndex.unshift(memory);
    }
    
    localStorage.setItem(this.MEMORY_INDEX_KEY, JSON.stringify(currentIndex));
    console.log(`📚 Updated metadata index: ${currentIndex.length} memories`);
  }
  
  /**
   * Update local vector index for similarity search
   */
  private static updateLocalVectorIndex(memoryId: string, vector: number[], metadata: MemoryEntry): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      console.log(`📊 Server environment: Vector for ${memoryId.slice(0, 8)}... would be indexed in vector DB`);
      return;
    }
    
    const vectorIndex = this.getVectorIndex();
    const existingIndex = vectorIndex.findIndex(v => v.id === memoryId);
    
    const vectorEntry = {
      id: memoryId,
      vector,
      metadata: {
        content: metadata.content,
        tags: metadata.tags,
        category: metadata.category,
        createdAt: metadata.createdAt,
        storageId: metadata.metadata?.blobId || metadata.ipfsHash
      }
    };
    
    if (existingIndex >= 0) {
      vectorIndex[existingIndex] = vectorEntry;
    } else {
      vectorIndex.push(vectorEntry);
    }
    
    localStorage.setItem(this.VECTOR_INDEX_KEY, JSON.stringify(vectorIndex));
    console.log(`📊 Updated vector index: ${vectorIndex.length} vectors`);
  }
  
  /**
   * Get metadata index
   */
  static getMetadataIndex(): MemoryEntry[] {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return [];
      }
      
      const index = localStorage.getItem(this.MEMORY_INDEX_KEY);
      return index ? JSON.parse(index) : [];
    } catch (error) {
      console.warn('⚠️ Failed to load metadata index:', error);
      return [];
    }
  }
  
  /**
   * Get vector index
   */
  static getVectorIndex(): Array<{id: string, vector: number[], metadata: any}> {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return [];
      }
      
      const index = localStorage.getItem(this.VECTOR_INDEX_KEY);
      return index ? JSON.parse(index) : [];
    } catch (error) {
      console.warn('⚠️ Failed to load vector index:', error);
      return [];
    }
  }
  
  /**
   * Search memories by vector similarity
   */
  static searchByVector(queryVector: number[], topK: number = 10): MemoryEntry[] {
    try {
      const vectorIndex = this.getVectorIndex();
      
      if (vectorIndex.length === 0) {
        console.log('📊 No vectors in index for similarity search');
        return [];
      }
      
      // Calculate cosine similarity for each vector
      const similarities = vectorIndex.map(entry => ({
        ...entry,
        similarity: this.cosineSimilarity(queryVector, entry.vector)
      }));
      
      // Sort by similarity and take top K
      const topResults = similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);
      
      console.log(`📊 Vector search: ${topResults.length} results, top similarity: ${topResults[0]?.similarity.toFixed(3)}`);
      
      // Convert back to MemoryEntry format
      const metadataIndex = this.getMetadataIndex();
      return topResults
        .map(result => metadataIndex.find(m => m.id === result.id))
        .filter(Boolean) as MemoryEntry[];
        
    } catch (error) {
      console.warn('⚠️ Vector search failed:', error);
      return [];
    }
  }
  
  /**
   * Calculate cosine similarity between two vectors
   */
  private static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
  
  /**
   * Remove memory from indices
   */
  static removeFromIndex(memoryId: string): void {
    try {
      // Remove from metadata index
      const metadataIndex = this.getMetadataIndex();
      const filteredMetadata = metadataIndex.filter(m => m.id !== memoryId);
      
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem(this.MEMORY_INDEX_KEY, JSON.stringify(filteredMetadata));
      }
      
      // Remove from vector index
      const vectorIndex = this.getVectorIndex();
      const filteredVectors = vectorIndex.filter(v => v.id !== memoryId);
      
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem(this.VECTOR_INDEX_KEY, JSON.stringify(filteredVectors));
      }
      
      console.log(`📚 Removed memory from indices: ${memoryId.slice(0, 8)}...`);
    } catch (error) {
      console.warn('⚠️ Failed to remove from index:', error);
    }
  }
  
  /**
   * Update index configuration for a memory entry
   */
  private static updateIndexConfig(memoryId: string, config: {
    onChain?: boolean;
    transactionHash?: string;
    contractHash?: string;
    indexedAt?: string;
    verified?: boolean;
    verifiedAt?: string;
  }): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const currentConfig = this.getIndexConfig();
      currentConfig[memoryId] = { ...currentConfig[memoryId], ...config };
      localStorage.setItem(this.INDEX_CONFIG_KEY, JSON.stringify(currentConfig));
    } catch (error) {
      console.warn('⚠️ Failed to update index config:', error);
    }
  }

  /**
   * Get index configuration
   */
  private static getIndexConfig(): Record<string, any> {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return {};
      }
      
      const config = localStorage.getItem(this.INDEX_CONFIG_KEY);
      return config ? JSON.parse(config) : {};
    } catch (error) {
      console.warn('⚠️ Failed to load index config:', error);
      return {};
    }
  }

  /**
   * Query memories from both local and on-chain indices
   */
  static async queryMemories(criteria: {
    tag?: string;
    contentType?: string;
    agent?: string;
    onChainOnly?: boolean;
  }): Promise<MemoryEntry[]> {
    try {
      // Always get local results first
      let localResults = this.getMetadataIndex();
      
      // Apply local filters
      if (criteria.tag) {
        localResults = localResults.filter(m => 
          m.tags?.some(tag => tag.toLowerCase().includes(criteria.tag!.toLowerCase()))
        );
      }
      
      if (criteria.contentType) {
        localResults = localResults.filter(m => 
          m.type?.toString().toLowerCase() === criteria.contentType?.toLowerCase()
        );
      }

      if (criteria.agent) {
        localResults = localResults.filter(m => 
          m.accessPolicy?.owner === criteria.agent
        );
      }

      // If on-chain only or we want to augment with on-chain data
      if (criteria.onChainOnly || this.zgIndexingService?.isInitialized()) {
        try {
          await this.ensureInitialized();
          
          if (this.zgIndexingService?.isInitialized()) {
            const onChainResults = await this.zgIndexingService.queryMemories({
              tag: criteria.tag,
              contentType: criteria.contentType,
              agent: criteria.agent
            });

            if (criteria.onChainOnly) {
              // Return only memories that exist on-chain
              return localResults.filter(local => 
                onChainResults.some(onChain => 
                  onChain.zgStorageId === local.metadata?.blobId ||
                  onChain.zgStorageId === local.ipfsHash
                )
              );
            }
          }
        } catch (error) {
          console.warn('⚠️ On-chain query failed, using local results only:', error);
        }
      }

      return localResults;

    } catch (error) {
      console.warn('⚠️ Memory query failed:', error);
      return [];
    }
  }

  /**
   * Verify memory on-chain
   */
  static async verifyMemory(memoryId: string): Promise<boolean> {
    try {
      await this.ensureInitialized();
      
      if (!this.zgIndexingService?.isInitialized()) {
        console.log('🔗 0G indexing service not available');
        return false;
      }

      const config = this.getIndexConfig();
      const memoryConfig = config[memoryId];
      
      if (!memoryConfig?.contractHash) {
        console.log(`❓ No contract hash found for memory ${memoryId}`);
        return false;
      }

      const result = await this.zgIndexingService.verifyMemory(memoryConfig.contractHash);
      
      if (result.success) {
        this.updateIndexConfig(memoryId, { 
          verified: true, 
          verifiedAt: new Date().toISOString() 
        });
        console.log(`✅ Memory verified on-chain: ${memoryId.slice(0, 8)}...`);
        return true;
      }

      return false;
    } catch (error) {
      console.warn('⚠️ Memory verification failed:', error);
      return false;
    }
  }

  /**
   * Get comprehensive index statistics (local + on-chain)
   */
  static async getIndexStats(): Promise<{
    local: {
      metadataCount: number;
      vectorCount: number;
      totalSize: number;
    };
    onChain?: {
      totalMemories: number;
      activeMemories: number;
      verifiedMemories: number;
      totalTags: number;
      totalSize: number;
    };
    lastUpdated: string;
  }> {
    const metadataIndex = this.getMetadataIndex();
    const vectorIndex = this.getVectorIndex();
    
    const stats = {
      local: {
        metadataCount: metadataIndex.length,
        vectorCount: vectorIndex.length,
        totalSize: metadataIndex.reduce((sum, m) => sum + (m.metadata?.size || 0), 0),
      },
      lastUpdated: new Date().toISOString()
    };

    // Try to get on-chain stats
    try {
      await this.ensureInitialized();
      
      if (this.zgIndexingService?.isInitialized()) {
        const onChainStats = await this.zgIndexingService.getIndexingStats();
        return {
          ...stats,
          onChain: onChainStats
        };
      }
    } catch (error) {
      console.warn('⚠️ Failed to get on-chain stats:', error);
    }

    return stats;
  }

  /**
   * Batch index multiple memories on-chain
   */
  static async batchIndexOnChain(memories: MemoryEntry[]): Promise<void> {
    try {
      await this.ensureInitialized();
      
      if (!this.zgIndexingService?.isInitialized()) {
        console.log('🔗 0G indexing service not available for batch indexing');
        return;
      }

      console.log(`📦 Batch indexing ${memories.length} memories on-chain...`);
      
      const results = await this.zgIndexingService.batchIndexMemories(memories);
      
      // Update local configs with results
      results.forEach((result, index) => {
        if (result.success) {
          this.updateIndexConfig(memories[index].id, {
            onChain: true,
            transactionHash: result.transactionHash,
            contractHash: result.contractHash,
            indexedAt: new Date().toISOString()
          });
        }
      });

      const successCount = results.filter(r => r.success).length;
      console.log(`✅ Batch indexed ${successCount}/${memories.length} memories on-chain`);

    } catch (error) {
      console.error('❌ Batch indexing failed:', error);
    }
  }

  /**
   * Get all available tags from both local and on-chain
   */
  static async getAllTags(): Promise<string[]> {
    const localTags = new Set<string>();
    
    // Collect local tags
    const metadataIndex = this.getMetadataIndex();
    metadataIndex.forEach(memory => {
      memory.tags?.forEach(tag => localTags.add(tag));
    });

    // Try to get on-chain tags
    try {
      await this.ensureInitialized();
      
      if (this.zgIndexingService?.isInitialized()) {
        const onChainTags = await this.zgIndexingService.getAllTags();
        onChainTags.forEach(tag => localTags.add(tag));
      }
    } catch (error) {
      console.warn('⚠️ Failed to get on-chain tags:', error);
    }

    return Array.from(localTags).sort();
  }
}

