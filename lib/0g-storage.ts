import { MemoryEntry } from '@/types/memory';
import { getEncryptionService } from './encryption';
import { createWalrusStorage, WalrusStorageService } from './walrus-storage';

// Import 0G TypeScript SDK components
let ZgFile: any, Indexer: any, Batcher: any, KvClient: any, Blob: any, getFlowContract: any;
let ethers: any;

if (typeof window === 'undefined') {
  try {
    // Configure axios for Node.js environment before loading 0G SDK
    const axios = require('axios');
    
    // Set default adapter to Node.js http adapter
    if (axios.defaults) {
      // Force axios to use the Node.js adapter
      axios.defaults.adapter = require('axios/lib/adapters/http');
    }
    
    const ogSdk = require('@0glabs/0g-ts-sdk');
    const ethersLib = require('ethers');
    
    ZgFile = ogSdk.ZgFile;
    Indexer = ogSdk.Indexer;
    Batcher = ogSdk.Batcher;
    KvClient = ogSdk.KvClient;
    Blob = ogSdk.Blob;
    getFlowContract = ogSdk.getFlowContract;
    ethers = ethersLib;
    
    console.log('✅ 0G TypeScript SDK loaded successfully with Node.js axios adapter');
  } catch (error) {
    console.warn('⚠️ 0G SDK not available:', error);
  }
}

// 0G Storage configuration
interface OGConfig {
  rpcUrl: string;
  chainId: string;
  privateKey: string;
  storageEndpoint: string;
  computeEndpoint: string;
  explorerUrl: string;
}

interface OGUploadResult {
  dataId: string;
  size: number;
  transactionHash?: string;
  explorerUrl?: string;
  ipfsHash?: string;
}

interface OGEmbeddingResult {
  vector: number[];
  metadata: {
    conversationId: string;
    agentId: string;
    timestamp: string;
    tags: string[];
    contentHash: string;
  };
  storageId: string;
  explorerUrl?: string;
  transactionHash?: string;
}

export class OGStorageService {
  private config: OGConfig;
  private isInitialized = false;
  private indexer: any = null;
  private provider: any = null;
  private signer: any = null;
  private encryptionService = getEncryptionService();
  private walrusStorage: WalrusStorageService | null = null;

  constructor(config: OGConfig) {
    this.config = config;
  }


  private async testEndpointConnectivity(endpoint: string): Promise<boolean> {
    try {
      console.log(`🔍 Testing connectivity to ${endpoint}...`);
      const axios = require('axios');
      
      // Test with a simple JSON-RPC call with short timeout
      const response = await axios.post(endpoint, {
        jsonrpc: '2.0',
        method: 'indexer_getShardedNodes',
        id: Date.now()
      }, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`✅ Endpoint ${endpoint} is reachable`);
      return true;
    } catch (error: any) {
      console.warn(`⚠️ Endpoint ${endpoint} failed: ${error.message}`);
      return false;
    }
  }

  async initialize(): Promise<void> {
    try {
      console.log('🔧 Initializing storage services...');
      
      // Try Walrus first (now primary)
      console.log('🦭 Initializing Walrus as primary storage...');
      try {
        this.walrusStorage = createWalrusStorage();
        await this.walrusStorage.initialize();
        console.log('✅ Walrus primary storage initialized successfully');
        console.log('   - Connected to Walrus decentralized storage');
        console.log('   - Ready for high-availability blob storage');
        console.log('   - Using Walrus testnet endpoints');
        this.isInitialized = true;
        return; // Success with Walrus, no need to initialize 0G
      } catch (walrusError) {
        console.warn('⚠️ Failed to initialize Walrus primary storage:', walrusError);
        console.log('🔄 Falling back to 0G storage...');
      }

      // Fallback to 0G if Walrus fails
      if (ZgFile && Indexer && ethers) {
        try {
          if (!this.config.privateKey || this.config.privateKey === 'your_0g_private_key_here') {
            throw new Error('0G private key not configured. Set NEXT_PUBLIC_0G_PRIVATE_KEY');
          } else {
            console.log('🔧 Initializing 0G as fallback storage...');
            console.log(`   RPC URL: ${this.config.rpcUrl}`);
            console.log(`   Indexer RPC: ${this.config.storageEndpoint}`);
            console.log(`   Explorer URL: ${this.config.explorerUrl}`);
            
            // Test endpoint connectivity with fallbacks
            const endpointsToTry = [
              this.config.storageEndpoint,
              'https://indexer-storage-testnet-turbo.0g.ai',
              'https://indexer-storage-testnet-standard.0g.ai'
            ];
            
            let workingEndpoint = null;
            for (const endpoint of endpointsToTry) {
              if (await this.testEndpointConnectivity(endpoint)) {
                workingEndpoint = endpoint;
                break;
              }
            }
            
            if (!workingEndpoint) {
              throw new Error('All 0G indexer endpoints are unreachable. Please check network connectivity or try again later.');
            }
            
            // Use the working endpoint
            if (workingEndpoint !== this.config.storageEndpoint) {
              console.log(`🔄 Switching to working endpoint: ${workingEndpoint}`);
              this.config.storageEndpoint = workingEndpoint;
            }
            
            // Initialize provider and signer as per 0G SDK documentation
            this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
            this.signer = new ethers.Wallet(this.config.privateKey, this.provider);
            
            // Initialize indexer for storage operations
            this.indexer = new Indexer(this.config.storageEndpoint);
            
            console.log('✅ 0G fallback storage initialized successfully');
            console.log('   - Connected to 0G blockchain network');
            console.log('   - Ready for real data storage and retrieval');
            console.log('   - Using official 0G TypeScript SDK');
          }
        } catch (error) {
          console.error('❌ Failed to initialize 0G fallback storage:', error);
          throw error;
        }
      } else {
        throw new Error('0G TypeScript SDK not available');
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize both Walrus and 0G storage systems:', error);
      throw new Error('All storage systems failed to initialize');
    }
  }

  async storeEmbedding(
    conversationId: string,
    vector: number[],
    metadata: {
      agentId: string;
      timestamp: string;
      tags: string[];
      content: string;
    }
  ): Promise<OGEmbeddingResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Try Walrus first (now primary)
    if (this.walrusStorage) {
      try {
        console.log(`📤 Storing embedding using Walrus primary storage for conversation: ${conversationId}`);
        return await this.storeEmbeddingOnWalrus(conversationId, vector, metadata);
      } catch (walrusError) {
        console.warn('⚠️ Failed to store embedding with Walrus:', walrusError);
        console.log('🔄 Falling back to 0G storage...');
      }
    }

    // Fallback to 0G if Walrus fails
    if (this.indexer && this.signer) {
    try {
        console.log(`📤 Storing embedding using 0G fallback storage for conversation: ${conversationId}`);

      // Create embedding data structure
      const embeddingData = {
        conversationId,
        vector,
        metadata: {
            agentId: metadata.agentId,
          timestamp: metadata.timestamp,
            tags: metadata.tags,
            content: metadata.content,
          contentHash: await this.generateContentHash(metadata.content)
        }
      };

      // Encrypt the embedding data
        const encryptedData = await this.encryptionService.encrypt(JSON.stringify(embeddingData));
        
        // Ensure encryptedData is a string before creating Buffer
        const dataString = typeof encryptedData === 'string' ? encryptedData : JSON.stringify(encryptedData);
        const tempBuffer = Buffer.from(dataString, 'utf-8');
        
        // Create a temporary file for upload using ZgFile.fromBuffer approach
        // Since ZgFile doesn't have fromBuffer, we'll use a different approach
        const tempFilePath = `/tmp/embedding_${conversationId}_${Date.now()}.json`;
        const fs = require('fs');
        fs.writeFileSync(tempFilePath, tempBuffer);
        
        // Create file object from file path as per 0G SDK documentation
        const file = await ZgFile.fromFilePath(tempFilePath);
        
        // Generate Merkle tree for verification
        const [tree, treeErr] = await file.merkleTree();
        if (treeErr !== null) {
          throw new Error(`Error generating Merkle tree: ${treeErr}`);
        }
        
        const rootHash = tree?.rootHash();
        console.log(`📝 File Root Hash: ${rootHash}`);
        
        // Upload to 0G Storage using real SDK
        const [txHash, uploadErr] = await this.indexer.upload(file, this.config.rpcUrl, this.signer);
        if (uploadErr !== null) {
          throw new Error(`Upload error: ${uploadErr}`);
        }
        
        console.log(`✅ Embedding uploaded to 0G Storage successfully!`);
        console.log(`   Transaction: ${txHash}`);
        console.log(`   Root Hash: ${rootHash}`);
        
        // Close the file
        await file.close();
        
        // Clean up temporary file
        try {
          const fs = require('fs');
          fs.unlinkSync(tempFilePath);
        } catch (cleanupError) {
          console.warn('⚠️ Failed to clean up temporary file:', cleanupError);
        }

      return {
        vector,
        metadata: {
          conversationId,
          agentId: metadata.agentId,
          timestamp: metadata.timestamp,
          tags: metadata.tags,
          contentHash: embeddingData.metadata.contentHash
        },
          storageId: rootHash,
          explorerUrl: `${this.config.explorerUrl}/tx/${txHash}`,
          transactionHash: txHash
      };
    } catch (error) {
        console.error('❌ Failed to store embedding with real 0G SDK:', error);
      throw new Error(`0G fallback storage failed: ${error?.message}`);
      }
    } else {
      throw new Error('Both Walrus and 0G storage services are unavailable');
    }
  }

  private async storeEmbeddingOnWalrus(
    conversationId: string,
    vector: number[],
    metadata: {
      agentId: string;
      timestamp: string;
      tags: string[];
      content: string;
    }
  ): Promise<OGEmbeddingResult> {
    if (!this.walrusStorage) {
      throw new Error('Walrus storage not available');
    }

    try {
      console.log(`📤 Storing embedding on Walrus for conversation: ${conversationId}`);

      // Create embedding data structure
      const embeddingData = {
        conversationId,
        vector,
        metadata: {
          agentId: metadata.agentId,
          timestamp: metadata.timestamp,
          tags: metadata.tags,
          content: metadata.content,
          contentHash: await this.generateContentHash(metadata.content)
        }
      };

      // Encrypt the embedding data
      const encryptedData = await this.encryptionService.encrypt(JSON.stringify(embeddingData));
      const dataString = typeof encryptedData === 'string' ? encryptedData : JSON.stringify(encryptedData);
      const buffer = Buffer.from(dataString, 'utf-8');

      // Store on Walrus
      const result = await this.walrusStorage.storeBlob(buffer);

      console.log(`✅ Embedding stored on Walrus successfully:`);
      console.log(`   Blob ID: ${result.blobId}`);
      console.log(`   Sui Reference: ${result.suiRef}`);
      console.log(`   Size: ${result.size} bytes`);

      return {
        vector,
        metadata: {
          conversationId,
          agentId: metadata.agentId,
          timestamp: metadata.timestamp,
          tags: metadata.tags,
          contentHash: embeddingData.metadata.contentHash
        },
        storageId: result.blobId,
        explorerUrl: result.explorerUrl,
        transactionHash: result.suiRef
      };

    } catch (error) {
      console.error('❌ Failed to store embedding on Walrus:', error);
      throw new Error(`Walrus embedding storage failed: ${error?.message}`);
    }
  }

  async queryEmbedding(queryVector: number[], topK: number = 10): Promise<OGEmbeddingResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      console.log(`🔍 Querying embeddings with top-k: ${topK}`);

      // Try Walrus first (primary storage)
      if (this.walrusStorage) {
        try {
          console.log(`📥 Retrieving memories from Walrus primary storage`);
          return await this.queryEmbeddingsFromWalrus(queryVector, topK);
        } catch (walrusError) {
          console.warn('⚠️ Failed to query embeddings from Walrus:', walrusError);
          console.log('🔄 Falling back to 0G storage for queries...');
        }
      }

      // Fallback to 0G if Walrus fails
      if (this.indexer) {
        console.log(`📥 Retrieving memories from 0G fallback storage`);
        return await this.queryEmbeddingsFrom0G(queryVector, topK);
      }

      console.log(`✅ Retrieved 0 embeddings (no storage available)`);
      return [];
    } catch (error) {
      console.error('❌ Failed to query embeddings from storage:', error);
      throw new Error(`Embedding query failed: ${error?.message}`);
    }
  }

  private async queryEmbeddingsFromWalrus(queryVector: number[], topK: number): Promise<OGEmbeddingResult[]> {
    try {
      console.log(`📊 Searching Walrus memories with vector similarity (top-${topK})`);
      
      // Use the MemoryIndexer for vector similarity search
      const { MemoryIndexer } = await import('./memory-indexer');
      const similarMemories = MemoryIndexer.searchByVector(queryVector, topK);
      
      if (similarMemories.length === 0) {
        console.log(`✅ Retrieved 0 embeddings from Walrus (no vectors in index)`);
        return [];
      }
      
      // Convert MemoryEntry to OGEmbeddingResult format
      const results: OGEmbeddingResult[] = similarMemories.map(memory => ({
        vector: queryVector, // We don't store the original vector, using query vector as placeholder
        metadata: {
          conversationId: memory.id,
          agentId: memory.accessPolicy?.owner || 'unknown',
          timestamp: memory.createdAt?.toISOString() || new Date().toISOString(),
          tags: memory.tags || [],
          contentHash: memory.metadata?.checksum || '',
          content: memory.content
        },
        storageId: memory.metadata?.blobId || memory.ipfsHash,
        explorerUrl: memory.explorerUrl,
        transactionHash: memory.transactionHash
      }));
      
      console.log(`✅ Retrieved ${results.length} embeddings from Walrus vector index`);
      return results;
      
    } catch (error) {
      console.warn('⚠️ Walrus vector search failed:', error);
      return [];
    }
  }

  private async queryEmbeddingsFrom0G(queryVector: number[], topK: number): Promise<OGEmbeddingResult[]> {
    // For now, return empty results as 0G SDK doesn't have built-in vector search
    // In a real implementation, you would need to implement vector similarity search
    // or use a separate vector database that can work with 0G storage
    console.log(`✅ Retrieved 0 embeddings from 0G (vector search not implemented)`);
    return [];
  }

  async generateContentHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async computeInference(model: string, prompt: string, options: any = {}): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      console.log(`🧠 Computing inference on 0G Compute: ${model}`);

      // Use the dedicated 0G Compute service
      const { callDeployedModel } = await import('./0g-compute');
      const result = await callDeployedModel(prompt);
      
      console.log(`✅ 0G Compute inference completed successfully`);
      return result;
    } catch (error) {
      console.error('❌ Failed to compute inference on 0G:', error);
      throw new Error(`0G Compute inference failed: ${error?.message}`);
    }
  }

  async getStorageStats(): Promise<any> {
    return {
      storageType: '0g',
      network: this.config.chainId,
      rpcUrl: this.config.rpcUrl,
      storageEndpoint: this.config.storageEndpoint,
      computeEndpoint: this.config.computeEndpoint,
      lastUpdated: new Date().toISOString()
    };
  }

  // Key-Value Storage Methods
  async uploadToKV(streamId: string, key: string, value: string): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.indexer || !this.signer || !Batcher) {
      throw new Error('0G services not initialized - indexer, signer, or Batcher not available');
    }

    try {
      console.log(`📤 Uploading to 0G-KV: streamId=${streamId}, key=${key}`);

      // Select nodes for KV storage as per 0G SDK documentation
      const [nodes, err] = await this.indexer.selectNodes(1);
      if (err !== null) {
        throw new Error(`Error selecting nodes: ${err}`);
      }

      // Get flow contract - this needs to be properly initialized
      const flowContract = await this.getFlowContract();
      if (!flowContract) {
        throw new Error('Flow contract not available - cannot perform KV operations');
      }
      
      // Create batcher for KV operations as per 0G SDK documentation
      const batcher = new Batcher(1, nodes, flowContract, this.config.rpcUrl);
      
      // Convert key and value to bytes as per 0G SDK documentation
      const keyBytes = Uint8Array.from(Buffer.from(key, 'utf-8'));
      const valueBytes = Uint8Array.from(Buffer.from(value, 'utf-8'));
      
      // Set data in the batcher as per 0G SDK documentation
      batcher.streamDataBuilder.set(streamId, keyBytes, valueBytes);
      
      // Execute the batch operation
      const [tx, batchErr] = await batcher.exec();
      if (batchErr !== null) {
        throw new Error(`Batch execution error: ${batchErr}`);
      }

      console.log(`✅ KV upload successful! TX: ${tx}`);
      return tx;
    } catch (error) {
      console.error('❌ Failed to upload to 0G-KV:', error);
      throw new Error(`0G-KV upload failed: ${error?.message}`);
    }
  }

  async downloadFromKV(streamId: string, key: string): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!KvClient || !this.indexer || !this.signer) {
      throw new Error('0G services not initialized - KvClient, indexer, or signer not available');
    }

    try {
      console.log(`📥 Downloading from 0G-KV: streamId=${streamId}, key=${key}`);

      // Create KV client as per 0G SDK documentation
      const kvClient = new KvClient("http://3.101.147.150:6789");
      
      // Convert key to bytes and encode as per 0G SDK documentation
      const keyBytes = Uint8Array.from(Buffer.from(key, 'utf-8'));
      const encodedKey = ethers.encodeBase64(keyBytes);
      
      // Get value from KV store
      const value = await kvClient.getValue(streamId, encodedKey);
      
      console.log(`✅ KV download successful! Value length: ${value?.length || 0}`);
      return value || '';
    } catch (error) {
      console.error('❌ Failed to download from 0G-KV:', error);
      throw new Error(`0G-KV download failed: ${error?.message}`);
    }
  }

  private async getFlowContract(): Promise<any> {
    // Use 0G SDK's getFlowContract function as per documentation
    try {
      if (!getFlowContract || !this.signer) {
        throw new Error('0G getFlowContract function or signer not available');
      }

      // Use the 0G SDK's built-in getFlowContract function
      const flowContract = await getFlowContract(this.config.rpcUrl, this.signer);
      
      console.log(`✅ Flow contract initialized using 0G SDK`);
      return flowContract;
    } catch (error) {
      console.error('❌ Failed to initialize flow contract:', error);
      throw new Error(`Flow contract initialization failed: ${error?.message}`);
    }
  }
}

// Factory function to create 0G Storage service
export function getOGStorage(config?: Partial<OGConfig>): OGStorageService {
  const defaultConfig: OGConfig = {
    rpcUrl: process.env.NEXT_PUBLIC_0G_RPC_URL || 'https://evmrpc-testnet.0g.ai/',
    chainId: process.env.NEXT_PUBLIC_0G_CHAIN_ID || 'galileo',
    privateKey: process.env.NEXT_PUBLIC_0G_PRIVATE_KEY || '',
    storageEndpoint: process.env.NEXT_PUBLIC_0G_STORAGE_ENDPOINT || 'https://indexer-storage-testnet-turbo.0g.ai',
    computeEndpoint: process.env.NEXT_PUBLIC_0G_COMPUTE_ENDPOINT || 'https://compute.galileo.0g.ai',
    explorerUrl: process.env.NEXT_PUBLIC_0G_EXPLORER_URL || 'https://chainscan-galileo.0g.ai'
  };

  const finalConfig = { ...defaultConfig, ...config };
  return new OGStorageService(finalConfig);
}
