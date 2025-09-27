import { ethers } from 'ethers';

// Types for 0G Compute integration
interface ZGComputeBroker {
  inference: {
    listService(): Promise<ZGService[]>;
    acknowledgeProviderSigner(providerAddress: string): Promise<void>;
    getServiceMetadata(providerAddress: string): Promise<{ endpoint: string; model: string }>;
    getRequestHeaders(providerAddress: string, content: string): Promise<Record<string, string>>;
    processResponse(providerAddress: string, content: string, chatID: string): Promise<boolean>;
  };
  ledger: {
    addLedger(initialBalance: number): Promise<void>;
    depositFund(amount: number): Promise<void>;
  };
}

interface ZGService {
  provider: string;
  name: string;
  serviceType: string;
  url: string;
  inputPrice: string;
  outputPrice: string;
  updatedAt: number;
  model: string;
}

interface InferenceRequest {
  input_text: string;
  model?: string;
  max_tokens?: number;
  temperature?: number;
}

interface InferenceResponse {
  output: string;
  model: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  provider: string;
  verified: boolean;
}

// Dynamic import for 0G Compute SDK (Node.js environment only)
let createZGComputeNetworkBroker: any;

if (typeof window === 'undefined') {
  try {
    const zgComputeModule = require('@0glabs/0g-serving-broker');
    createZGComputeNetworkBroker = zgComputeModule.createZGComputeNetworkBroker;
    console.log('✅ 0G Compute SDK loaded successfully');
  } catch (error) {
    console.warn('⚠️ 0G Compute SDK not available:', error);
  }
}

export class ZGComputeService {
  private broker: ZGComputeBroker | null = null;
  private provider: ethers.JsonRpcProvider | null = null;
  private signer: ethers.Wallet | null = null;
  private isInitialized = false;
  private config: {
    rpcUrl: string;
    privateKey: string;
    explorerUrl: string;
  };

  constructor(config: {
    rpcUrl: string;
    privateKey: string;
    explorerUrl: string;
  }) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🔧 Initializing 0G Compute Network broker...');

      if (!createZGComputeNetworkBroker) {
        throw new Error('0G Compute SDK not available - requires Node.js environment');
      }

      if (!this.config.privateKey || this.config.privateKey === 'your_0g_private_key_here') {
        throw new Error('0G private key not configured. Set NEXT_PUBLIC_0G_PRIVATE_KEY');
      }

      // Initialize provider and signer
      this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
      this.signer = new ethers.Wallet(this.config.privateKey, this.provider);

      // Create 0G Compute Network broker
      this.broker = await createZGComputeNetworkBroker(this.signer);

      console.log('✅ 0G Compute Network broker initialized successfully');
      console.log(`   RPC URL: ${this.config.rpcUrl}`);
      console.log(`   Wallet Address: ${this.signer.address}`);

      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize 0G Compute Network broker:', error);
      throw new Error(`0G Compute initialization failed: ${error?.message}`);
    }
  }

  /**
   * List all available AI services on the 0G Compute Network
   */
  async listServices(): Promise<ZGService[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.broker) {
      throw new Error('0G Compute broker not initialized');
    }

    try {
      console.log('📋 Listing available AI services on 0G Compute Network...');
      const services = await this.broker.inference.listService();
      
      console.log(`✅ Found ${services.length} available AI services:`);
      services.forEach((service, index) => {
        console.log(`   ${index + 1}. ${service.name} (${service.model}) - Provider: ${service.provider.slice(0, 8)}...`);
      });

      return services;
    } catch (error) {
      console.error('❌ Failed to list AI services:', error);
      throw new Error(`Failed to list services: ${error?.message}`);
    }
  }

  /**
   * Get the first available service or a specific service by provider address
   */
  async getService(providerAddress?: string): Promise<ZGService> {
    const services = await this.listServices();
    
    if (services.length === 0) {
      throw new Error('No AI services available on 0G Compute Network');
    }

    if (providerAddress) {
      const service = services.find(s => s.provider.toLowerCase() === providerAddress.toLowerCase());
      if (!service) {
        throw new Error(`Service with provider address ${providerAddress} not found`);
      }
      return service;
    }

    // Return the first available service
    return services[0];
  }

  /**
   * Acknowledge a provider before using their service
   */
  async acknowledgeProvider(providerAddress: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.broker) {
      throw new Error('0G Compute broker not initialized');
    }

    try {
      console.log(`🤝 Acknowledging provider: ${providerAddress}`);
      await this.broker.inference.acknowledgeProviderSigner(providerAddress);
      console.log('✅ Provider acknowledged successfully');
    } catch (error) {
      console.error('❌ Failed to acknowledge provider:', error);
      throw new Error(`Failed to acknowledge provider: ${error?.message}`);
    }
  }

  /**
   * Main inference function - sends input_text to a deployed model and returns the result
   */
  async inference(request: InferenceRequest): Promise<InferenceResponse> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.broker) {
      throw new Error('0G Compute broker not initialized');
    }

    try {
      console.log(`🧠 Starting inference for input: "${request.input_text.slice(0, 50)}..."`);

      // Get an available service
      const service = await this.getService();
      const providerAddress = service.provider;

      console.log(`📡 Using service: ${service.name} (${service.model})`);
      console.log(`   Provider: ${providerAddress}`);
      console.log(`   Endpoint: ${service.url}`);

      // Acknowledge the provider (required before first use)
      try {
        await this.acknowledgeProvider(providerAddress);
      } catch (error) {
        // Provider might already be acknowledged, continue
        console.log('⚠️ Provider acknowledgment may have already been done');
      }

      // Get service metadata and request headers
      const { endpoint, model } = await this.broker.inference.getServiceMetadata(providerAddress);
      const headers = await this.broker.inference.getRequestHeaders(providerAddress, request.input_text);

      console.log(`📤 Sending request to endpoint: ${endpoint}`);

      // Prepare the request payload
      const payload = {
        messages: [
          {
            role: "user",
            content: request.input_text
          }
        ],
        model: request.model || model,
        max_tokens: request.max_tokens || 150,
        temperature: request.temperature || 0.7
      };

      // Send the inference request
      const response = await fetch(`${endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📥 Received inference response');

      // Generate a chat ID for verification
      const chatID = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Verify the response
      let verified = false;
      try {
        verified = await this.broker.inference.processResponse(
          providerAddress,
          request.input_text,
          chatID
        );
        console.log(`✅ Response verification: ${verified ? 'PASSED' : 'FAILED'}`);
      } catch (verificationError) {
        console.warn('⚠️ Response verification failed:', verificationError);
      }

      // Extract the output from the response
      const output = result.choices?.[0]?.message?.content || result.text || 'No output received';

      const inferenceResponse: InferenceResponse = {
        output,
        model: result.model || model,
        usage: result.usage ? {
          input_tokens: result.usage.prompt_tokens || 0,
          output_tokens: result.usage.completion_tokens || 0,
          total_tokens: result.usage.total_tokens || 0
        } : undefined,
        provider: providerAddress,
        verified
      };

      console.log(`✅ Inference completed successfully`);
      console.log(`   Output length: ${output.length} characters`);
      console.log(`   Model used: ${inferenceResponse.model}`);
      console.log(`   Verified: ${verified}`);

      return inferenceResponse;

    } catch (error) {
      console.error('❌ Inference failed:', error);
      throw new Error(`0G Compute inference failed: ${error?.message}`);
    }
  }

  /**
   * Setup account and add funds (if needed)
   */
  async setupAccount(initialBalance: number = 1): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.broker) {
      throw new Error('0G Compute broker not initialized');
    }

    try {
      console.log(`💰 Setting up account with initial balance: ${initialBalance} OG`);
      
      // Create ledger account
      await this.broker.ledger.addLedger(initialBalance);
      console.log('✅ Account created successfully');
      
    } catch (error) {
      console.error('❌ Failed to setup account:', error);
      throw new Error(`Account setup failed: ${error?.message}`);
    }
  }

  /**
   * Add funds to your account
   */
  async addFunds(amount: number): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.broker) {
      throw new Error('0G Compute broker not initialized');
    }

    try {
      console.log(`💸 Adding ${amount} OG to account...`);
      await this.broker.ledger.depositFund(amount);
      console.log('✅ Funds added successfully');
    } catch (error) {
      console.error('❌ Failed to add funds:', error);
      throw new Error(`Failed to add funds: ${error?.message}`);
    }
  }
}

// Factory function to create 0G Compute service
export function createZGComputeService(): ZGComputeService {
  const config = {
    rpcUrl: process.env.NEXT_PUBLIC_0G_RPC_URL || 'https://evmrpc-testnet.0g.ai',
    privateKey: process.env.NEXT_PUBLIC_0G_PRIVATE_KEY || '',
    explorerUrl: process.env.NEXT_PUBLIC_0G_EXPLORER_URL || 'https://chainscan-galileo.0g.ai'
  };

  return new ZGComputeService(config);
}

// Simple inference function for easy use
export async function callDeployedModel(input_text: string): Promise<string> {
  const computeService = createZGComputeService();
  
  try {
    const result = await computeService.inference({ input_text });
    return result.output;
  } catch (error) {
    console.error('❌ Failed to call deployed model:', error);
    throw error;
  }
}
