import axios from 'axios';
import { Readable } from 'stream';

// Configure axios for Node.js environment
if (typeof window === 'undefined') {
  try {
    // Set default adapter to Node.js http adapter
    axios.defaults.adapter = require('axios/lib/adapters/http');
    console.log('✅ Axios configured with Node.js adapter for Walrus');
  } catch (error) {
    console.warn('⚠️ Failed to configure axios adapter:', error);
  }
}

// Types for Walrus storage
interface WalrusConfig {
  publisherUrl: string;
  aggregatorUrl: string;
  epochs: number;
}

interface WalrusStoreResponse {
  blobId: string;
  suiRef: string;
  newlyCreated: boolean;
  endEpoch: number;
}

interface WalrusUploadResult {
  blobId: string;
  suiRef: string;
  size: number;
  epochs: number;
  endEpoch: number;
  explorerUrl?: string;
}

export class WalrusStorageService {
  private config: WalrusConfig;
  private isInitialized = false;

  constructor(config: WalrusConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🔧 Initializing Walrus storage service...');
      console.log(`   Publisher: ${this.config.publisherUrl}`);
      console.log(`   Aggregator: ${this.config.aggregatorUrl}`);
      console.log(`   Storage epochs: ${this.config.epochs}`);

      // Test connectivity to both publisher and aggregator
      await this.testConnectivity();

      this.isInitialized = true;
      console.log('✅ Walrus storage service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Walrus storage service:', error);
      throw new Error(`Walrus initialization failed: ${error?.message}`);
    }
  }

  private async testConnectivity(): Promise<void> {
    try {
      // Test publisher connectivity (404 is expected for root path)
      const publisherResponse = await axios.head(this.config.publisherUrl, { timeout: 5000 });
      console.log(`✅ Publisher reachable (${publisherResponse.status} - expected for root path)`);
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log(`✅ Publisher reachable (404 expected for root path)`);
      } else {
        console.warn('⚠️ Publisher connectivity issue:', error?.message);
      }
    }

    try {
      // Test aggregator connectivity (404 is expected for root path)
      const aggregatorResponse = await axios.head(this.config.aggregatorUrl, { timeout: 5000 });
      console.log(`✅ Aggregator reachable (${aggregatorResponse.status} - expected for root path)`);
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log(`✅ Aggregator reachable (404 expected for root path)`);
      } else {
        console.warn('⚠️ Aggregator connectivity issue:', error?.message);
      }
    }
  }

  /**
   * Store a blob on Walrus network
   */
  async storeBlob(data: Buffer, metadata?: any): Promise<WalrusUploadResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      console.log(`📤 Storing ${data.length} bytes on Walrus network...`);

      // Create FormData with the blob (Node.js environment)
      const FormData = require('form-data');
      const formData = new FormData();
      
      // In Node.js, append the buffer directly
      formData.append('file', data, {
        filename: 'data.bin',
        contentType: 'application/octet-stream',
      });

      // Store the blob
      const response = await axios.put(
        `${this.config.publisherUrl}/v1/blobs?epochs=${this.config.epochs}`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
          timeout: 30000, // 30 second timeout
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
      );

      const result = response.data;

      console.log(`✅ Blob stored successfully on Walrus:`);
      console.log(`   Response:`, JSON.stringify(result, null, 2));

      // Handle both newlyCreated and alreadyCertified responses
      let blobInfo;
      if (result.newlyCreated) {
        blobInfo = result.newlyCreated;
      } else if (result.alreadyCertified) {
        blobInfo = result.alreadyCertified;
      } else {
        throw new Error('Unexpected response format from Walrus');
      }

      const blobId = blobInfo.blobId;
      const suiRef = blobInfo.blobObject?.id;
      const endEpoch = blobInfo.storage?.endEpoch || blobInfo.endEpoch;

      console.log(`   Blob ID: ${blobId}`);
      console.log(`   Sui Reference: ${suiRef}`);
      console.log(`   End Epoch: ${endEpoch}`);

      return {
        blobId: blobId || suiRef, // Use suiRef as fallback if blobId is missing
        suiRef: suiRef || '',
        size: data.length,
        epochs: this.config.epochs,
        endEpoch: endEpoch || 0,
        explorerUrl: suiRef ? `https://suiscan.xyz/testnet/object/${suiRef}` : undefined,
      };

    } catch (error: any) {
      console.error('❌ Failed to store blob on Walrus:', error);
      if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Data:', error.response.data);
      }
      throw new Error(`Walrus storage failed: ${error?.message}`);
    }
  }

  /**
   * Retrieve a blob from Walrus network
   */
  async retrieveBlob(blobId: string): Promise<Buffer> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      console.log(`📥 Retrieving blob from Walrus: ${blobId}`);

      const response = await axios.get(
        `${this.config.aggregatorUrl}/v1/blobs/${blobId}`,
        {
          responseType: 'arraybuffer',
          timeout: 30000, // 30 second timeout
        }
      );

      const data = Buffer.from(response.data);
      console.log(`✅ Blob retrieved successfully: ${data.length} bytes`);

      return data;

    } catch (error: any) {
      console.error('❌ Failed to retrieve blob from Walrus:', error);
      if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Data:', error.response.data);
      }
      throw new Error(`Walrus retrieval failed: ${error?.message}`);
    }
  }

  /**
   * Check if a blob exists on Walrus network
   */
  async blobExists(blobId: string): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      console.log(`🔍 Checking if blob exists: ${blobId}`);

      const response = await axios.head(
        `${this.config.aggregatorUrl}/v1/blobs/${blobId}`,
        { timeout: 10000 }
      );

      const exists = response.status === 200;
      console.log(`${exists ? '✅' : '❌'} Blob ${exists ? 'exists' : 'not found'}: ${blobId}`);

      return exists;

    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log(`❌ Blob not found: ${blobId}`);
        return false;
      }

      console.error('❌ Failed to check blob existence:', error);
      return false;
    }
  }

  /**
   * Get blob metadata/info
   */
  async getBlobInfo(blobId: string): Promise<any> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      console.log(`ℹ️ Getting blob info: ${blobId}`);

      // Walrus doesn't have a specific info endpoint, so we use HEAD to get headers
      const response = await axios.head(
        `${this.config.aggregatorUrl}/v1/blobs/${blobId}`,
        { timeout: 10000 }
      );

      const info = {
        blobId,
        exists: response.status === 200,
        contentLength: response.headers['content-length'],
        contentType: response.headers['content-type'],
        lastModified: response.headers['last-modified'],
        etag: response.headers['etag'],
      };

      console.log(`✅ Blob info retrieved:`, info);
      return info;

    } catch (error: any) {
      console.error('❌ Failed to get blob info:', error);
      throw new Error(`Failed to get blob info: ${error?.message}`);
    }
  }

  /**
   * Get storage stats
   */
  getStorageStats(): any {
    return {
      storageType: 'walrus',
      network: 'testnet', // or mainnet based on config
      publisher: this.config.publisherUrl,
      aggregator: this.config.aggregatorUrl,
      epochs: this.config.epochs,
      features: [
        'Decentralized blob storage',
        'Erasure coding (5x cost efficiency)',
        'Sui blockchain integration',
        'High availability',
        'Byzantine fault tolerance'
      ]
    };
  }
}

// Factory function to create Walrus storage service
export function createWalrusStorage(): WalrusStorageService {
  // Use working public endpoints from Walrus documentation
  const config: WalrusConfig = {
    publisherUrl: process.env.NEXT_PUBLIC_WALRUS_PUBLISHER_URL || 'https://publisher.walrus-testnet.walrus.space',
    aggregatorUrl: process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL || 'https://aggregator.walrus-testnet.walrus.space',
    epochs: parseInt(process.env.NEXT_PUBLIC_WALRUS_EPOCHS || '5'),
  };

  return new WalrusStorageService(config);
}

// Simple storage function for easy use
export async function storeOnWalrus(data: Buffer): Promise<string> {
  const walrusStorage = createWalrusStorage();
  
  try {
    const result = await walrusStorage.storeBlob(data);
    return result.blobId;
  } catch (error) {
    console.error('❌ Failed to store on Walrus:', error);
    throw error;
  }
}

// Simple retrieval function for easy use
export async function retrieveFromWalrus(blobId: string): Promise<Buffer> {
  const walrusStorage = createWalrusStorage();
  
  try {
    return await walrusStorage.retrieveBlob(blobId);
  } catch (error) {
    console.error('❌ Failed to retrieve from Walrus:', error);
    throw error;
  }
}
