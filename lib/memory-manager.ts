import { OpenAI } from 'openai';
import { getOGStorage, OGStorageService, OGEmbeddingResult } from './0g-storage';

interface EmbeddingMetadata {
  conversationId: string;
  agentId: string;
  timestamp: string;
  tags: string[];
  content: string;
  contentHash: string;
}

interface MemoryQuery {
  query: string;
  agentId?: string;
  tags?: string[];
  limit?: number;
  threshold?: number;
}

interface MemoryManagerConfig {
  openaiApiKey: string;
  embeddingModel: string;
  maxVectorSize: number;
  similarityThreshold: number;
}

export class MemoryManager {
  private ogStorage: OGStorageService;
  private openai: OpenAI | null = null;
  private config: MemoryManagerConfig;

  constructor(config: Partial<MemoryManagerConfig> = {}) {
    this.ogStorage = getOGStorage();

    this.config = {
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      embeddingModel: 'text-embedding-3-small',
      maxVectorSize: 1536,
      similarityThreshold: 0.7,
      ...config
    };
  }

  private getOpenAI(): OpenAI {
    if (!this.openai) {
      // Check if we're in a browser environment
      const isBrowser = typeof window !== 'undefined';
      
      this.openai = new OpenAI({
        apiKey: this.config.openaiApiKey,
        ...(isBrowser && { dangerouslyAllowBrowser: true })
      });
    }
    return this.openai;
  }

  async initialize(): Promise<void> {
    console.log('🧠 Initializing Memory Manager...');
    await this.ogStorage.initialize();
    console.log('✅ Memory Manager initialized successfully');
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      console.log(`🔄 Generating embedding for text: ${text.substring(0, 50)}...`);

      const response = await this.getOpenAI().embeddings.create({
        model: this.config.embeddingModel,
        input: text,
      });

      const embedding = response.data[0].embedding;

      // Ensure vector size matches expected dimensions
      if (embedding.length > this.config.maxVectorSize) {
        return embedding.slice(0, this.config.maxVectorSize);
      } else if (embedding.length < this.config.maxVectorSize) {
        return [...embedding, ...new Array(this.config.maxVectorSize - embedding.length).fill(0)];
      }

      console.log(`✅ Generated embedding with ${embedding.length} dimensions`);
      return embedding;
    } catch (error) {
      console.error('❌ Failed to generate embedding:', error);
      throw new Error(`Embedding generation failed: ${error?.message}`);
    }
  }

  async storeEmbedding(
    conversationId: string,
    content: string,
    metadata: {
      agentId: string;
      tags: string[];
    }
  ): Promise<OGEmbeddingResult> {
    try {
      console.log(`💾 Storing embedding for conversation: ${conversationId}`);

      // Generate embedding vector
      const vector = await this.generateEmbedding(content);

      // Create metadata
      const embeddingMetadata: EmbeddingMetadata = {
        conversationId,
        agentId: metadata.agentId,
        timestamp: new Date().toISOString(),
        tags: metadata.tags,
        content,
        contentHash: await this.generateContentHash(content)
      };

      // Store in 0G Storage
      const result = await this.ogStorage.storeEmbedding(
        conversationId,
        vector,
        embeddingMetadata
      );

      console.log(`✅ Embedding stored successfully:`, {
        conversationId,
        storageId: result.storageId,
        vectorSize: vector.length
      });

      return result;
    } catch (error) {
      console.error('❌ Failed to store embedding:', error);
      throw new Error(`Embedding storage failed: ${error?.message}`);
    }
  }

  async queryMemory(query: MemoryQuery): Promise<OGEmbeddingResult[]> {
    try {
      console.log(`🔍 Querying memory with: ${query.query}`);

      // Generate embedding for the query
      const queryVector = await this.generateEmbedding(query.query);

      // Query 0G Storage for similar embeddings
      const results = await this.ogStorage.queryEmbedding(
        queryVector,
        query.limit || 10
      );

      // Filter results based on agent ID and tags if specified
      let filteredResults = results;

      if (query.agentId) {
        filteredResults = filteredResults.filter(
          result => result.metadata.agentId === query.agentId
        );
      }

      if (query.tags && query.tags.length > 0) {
        filteredResults = filteredResults.filter(result =>
          query.tags!.some(tag => result.metadata.tags.includes(tag))
        );
      }

      // Sort by similarity (this would be done by 0G Storage in a real implementation)
      filteredResults.sort((a, b) => {
        // In a real implementation, 0G Storage would return similarity scores
        // For now, we'll use a simple heuristic
        return b.metadata.timestamp.localeCompare(a.metadata.timestamp);
      });

      console.log(`✅ Retrieved ${filteredResults.length} memory results`);
      return filteredResults;
    } catch (error) {
      console.error('❌ Failed to query memory:', error);
      throw new Error(`Memory query failed: ${error?.message}`);
    }
  }

  async getMemoryByConversation(conversationId: string): Promise<OGEmbeddingResult[]> {
    try {
      console.log(`📖 Retrieving memory for conversation: ${conversationId}`);

      // In a real implementation, this would query 0G Storage with conversation ID filter
      // For now, we'll return empty array as this would require indexing
      console.log('⚠️ Conversation-based retrieval requires indexing implementation');
      return [];
    } catch (error) {
      console.error('❌ Failed to get memory by conversation:', error);
      throw new Error(`Conversation memory retrieval failed: ${error?.message}`);
    }
  }

  async verifyMemoryIntegrity(embeddingResult: OGEmbeddingResult): Promise<boolean> {
    try {
      console.log(`🔍 Verifying memory integrity for: ${embeddingResult.storageId}`);

      // Generate hash of the content and compare with stored hash
      const currentHash = await this.generateContentHash(embeddingResult.metadata.content);
      const isValid = currentHash === embeddingResult.metadata.contentHash;

      if (!isValid) {
        console.warn(`⚠️ Memory integrity check failed for: ${embeddingResult.storageId}`);
      } else {
        console.log(`✅ Memory integrity verified for: ${embeddingResult.storageId}`);
      }

      return isValid;
    } catch (error) {
      console.error('❌ Failed to verify memory integrity:', error);
      throw new Error(`Memory integrity verification failed: ${error?.message}`);
    }
  }

  async generateContentHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async computeInference(model: string, prompt: string, context?: string): Promise<string> {
    try {
      console.log(`🧠 Computing inference with 0G: ${model}`);

      // Create enhanced prompt with context if available
      let fullPrompt = prompt;
      if (context) {
        fullPrompt = `Context: ${context}\n\nQuery: ${prompt}`;
      }

      const response = await this.ogStorage.computeInference(model, fullPrompt, {
        max_tokens: 1000,
        temperature: 0.7
      });

      console.log(`✅ Inference completed with ${response.length} characters`);
      return response;
    } catch (error) {
      console.error('❌ Failed to compute inference:', error);
      throw new Error(`0G Compute inference failed: ${error?.message}`);
    }
  }

  async getMemoryStats(): Promise<any> {
    try {
      const stats = await this.ogStorage.getStorageStats();
      return {
        ...stats,
        embeddingModel: this.config.embeddingModel,
        maxVectorSize: this.config.maxVectorSize,
        similarityThreshold: this.config.similarityThreshold,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Failed to get memory stats:', error);
      throw new Error(`Memory stats retrieval failed: ${error?.message}`);
    }
  }
}

// Factory function to create memory manager
export function getMemoryManager(config?: Partial<MemoryManagerConfig>): MemoryManager {
  return new MemoryManager(config);
}
