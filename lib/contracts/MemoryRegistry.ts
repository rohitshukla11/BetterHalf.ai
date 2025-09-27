/**
 * MemoryRegistry Contract ABI - Generated from deployed contract
 */

// Import the compiled contract ABI directly (it's a JSON array)
import MemoryRegistryABI from '../../artifacts/contracts/MemoryRegistry.sol/MemoryRegistry.json';

export { MemoryRegistryABI };

// Contract deployment configuration
export interface MemoryRegistryConfig {
  contractAddress: string;
  rpcUrl: string;
  chainId: number;
  explorerUrl?: string;
}

// Default configurations for different networks
export const MEMORY_REGISTRY_CONFIGS: Record<string, MemoryRegistryConfig> = {
  '0g-testnet': {
    contractAddress: process.env.NEXT_PUBLIC_MEMORY_REGISTRY_ADDRESS || '0xe96fb286f36372effcf846f8a0d25773d63a3618',
    rpcUrl: 'https://evmrpc-testnet.0g.ai',
    chainId: 16602,
    explorerUrl: 'https://explorer-testnet.0g.ai'
  },
  '0g-mainnet': {
    contractAddress: process.env.NEXT_PUBLIC_MEMORY_REGISTRY_ADDRESS || '',
    rpcUrl: 'https://rpc.0g.ai',
    chainId: 16600,
    explorerUrl: 'https://explorer.0g.ai'
  },
  'hardhat': {
    contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3', // Default hardhat deployment
    rpcUrl: 'http://127.0.0.1:8545',
    chainId: 1337
  }
};

/**
 * Get contract configuration based on environment
 */
export function getMemoryRegistryConfig(network?: string): MemoryRegistryConfig {
  const env = network || process.env.NODE_ENV || 'development';
  
  if (env === 'production') {
    return MEMORY_REGISTRY_CONFIGS['0g-mainnet'];
  } else if (env === 'test' || env === 'development') {
    return MEMORY_REGISTRY_CONFIGS['0g-testnet'];
  } else {
    return MEMORY_REGISTRY_CONFIGS['hardhat'];
  }
}
