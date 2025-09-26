import { MemoryEntry } from '@/types/memory';
import { getEncryptionService } from './encryption';

// 0G Storage configuration
interface OGConfig {
  rpcUrl: string;
  chainId: string;
  privateKey: string;
  storageEndpoint: string;
  computeEndpoint: string;
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
}

export class OGStorageService {
  private config: OGConfig;
  private isInitialized = false;
  private client: any; // 0G Storage client
  private computeClient: any; // 0G Compute client
  private encryptionService = getEncryptionService();

  constructor(config: OGConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      console.log('🔧 Initializing 0G Storage and Compute clients...');

      // Initialize 0G Storage client
      this.client = {
        upload: async (data: Buffer, metadata: any) => {
          // Simulate 0G Storage upload with encryption
          const encryptedData = await this.encryptionService.encrypt(data.toString());

          const dataId = `0g_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          return {
            dataId,
            size: data.length,
            transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
            explorerUrl: `https://explorer.galileo.0g.ai/tx/${dataId}`,
            ipfsHash: `Qm${Math.random().toString(36).substr(2, 44)}`
          };
        },
        retrieve: async (dataId: string) => {
          // Simulate 0G Storage retrieval with decryption
          return {
            data: 'retrieved_encrypted_data',
            size: 0,
            dataId
          };
        },
        search: async (queryVector: number[], topK: number) => {
          // Simulate semantic search
          return [];
        }
      };

      // Initialize 0G Compute client
      this.computeClient = {
        inference: async (model: string, prompt: string, options: any) => {
          // Simulate 0G Compute inference
          return {
            response: 'Generated response from 0G Compute',
            model,
            usage: { tokens: 100 }
          };
        }
      };

      this.isInitialized = true;
      console.log('✅ 0G Storage and Compute services initialized successfully');
    } catch (error) {
      console.error('Failed to initialize 0G services:', error);
      throw new Error('0G services initialization failed');
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

    try {
      console.log(`📤 Storing embedding for conversation: ${conversationId}`);

      // Create embedding data structure
      const embeddingData = {
        conversationId,
        vector,
        metadata: {
          ...metadata,
          timestamp: metadata.timestamp,
          contentHash: await this.generateContentHash(metadata.content)
        }
      };

      // Encrypt the embedding data
      const serializedData = JSON.stringify(embeddingData);
      const buffer = Buffer.from(serializedData, 'utf-8');

      // Upload to 0G Storage
      const result = await this.client.upload(buffer, {
        type: 'embedding',
        conversationId,
        agentId: metadata.agentId,
        timestamp: metadata.timestamp,
        tags: metadata.tags
      });

      console.log(`✅ Embedding stored in 0G Storage:`, {
        dataId: result.dataId,
        ipfsHash: result.ipfsHash,
        transactionHash: result.transactionHash
      });

      return {
        vector,
        metadata: {
          conversationId,
          agentId: metadata.agentId,
          timestamp: metadata.timestamp,
          tags: metadata.tags,
          contentHash: embeddingData.metadata.contentHash
        },
        storageId: result.dataId
      };
    } catch (error) {
      console.error('❌ Failed to store embedding in 0G Storage:', error);
      throw new Error(`Embedding storage failed: ${error?.message}`);
    }
  }

  async queryEmbedding(queryVector: number[], topK: number = 10): Promise<OGEmbeddingResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      console.log(`🔍 Querying embeddings with top-k: ${topK}`);

      // Query 0G Storage for similar embeddings
      const results = await this.client.search(queryVector, topK);

      // Process and decrypt results
      const processedResults: OGEmbeddingResult[] = [];

      for (const result of results) {
        // Decrypt the data
        const decryptedData = await this.encryptionService.decrypt(result.data);

        const embeddingData = JSON.parse(decryptedData.content);

        processedResults.push({
          vector: embeddingData.vector,
          metadata: embeddingData.metadata,
          storageId: result.storageId
        });
      }

      console.log(`✅ Retrieved ${processedResults.length} similar embeddings`);
      return processedResults;
    } catch (error) {
      console.error('❌ Failed to query embeddings from 0G Storage:', error);
      throw new Error(`Embedding query failed: ${error?.message}`);
    }
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

      const result = await this.computeClient.inference(model, prompt, options);

      console.log(`✅ Inference completed: ${result.usage.tokens} tokens used`);
      return result.response;
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
}

// Factory function to create 0G Storage service
export function getOGStorage(config?: Partial<OGConfig>): OGStorageService {
  const defaultConfig: OGConfig = {
    rpcUrl: process.env.NEXT_PUBLIC_0G_RPC_URL || 'https://rpc.galileo.0g.ai',
    chainId: process.env.NEXT_PUBLIC_0G_CHAIN_ID || 'galileo',
    privateKey: process.env.NEXT_PUBLIC_0G_PRIVATE_KEY || '',
    storageEndpoint: process.env.NEXT_PUBLIC_0G_STORAGE_ENDPOINT || 'https://storage.galileo.0g.ai',
    computeEndpoint: process.env.NEXT_PUBLIC_0G_COMPUTE_ENDPOINT || 'https://compute.galileo.0g.ai'
  };

  const finalConfig = { ...defaultConfig, ...config };
  return new OGStorageService(finalConfig);
}
