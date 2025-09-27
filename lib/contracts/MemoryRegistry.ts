/**
 * MemoryRegistry Contract ABI and Types
 * Generated from MemoryRegistry.sol
 */

export const MemoryRegistryABI = [
  // Constructor
  "constructor()",
  
  // Events
  "event MemoryHashCommitted(bytes32 indexed hash, address indexed agent, string metadata, string zgStorageId, string contentType, uint256 timestamp)",
  "event MemoryHashVerified(bytes32 indexed hash, address indexed verifier, uint256 timestamp)",
  "event MemoryHashRevoked(bytes32 indexed hash, address indexed agent, uint256 timestamp)",
  "event MemoryTagged(bytes32 indexed hash, string[] tags, uint256 timestamp)",
  "event MemoryIndexUpdated(bytes32 indexed hash, string zgStorageId, uint256 timestamp)",
  
  // Main functions
  "function commitMemoryHash(bytes32 hash, string calldata metadata, string calldata zgStorageId, string calldata contentType, uint256 size, string[] calldata tags) external returns (bytes32)",
  "function batchCommitMemoryHashes(bytes32[] calldata hashes, string[] calldata metadatas, string[] calldata zgStorageIds, string[] calldata contentTypes, uint256[] calldata sizes, string[][] calldata allTags) external",
  
  // Verification functions
  "function verifyMemoryHash(bytes32 hash) external",
  "function revokeMemoryHash(bytes32 hash) external",
  
  // Query functions
  "function getMemoryHash(bytes32 hash) external view returns (tuple(bytes32 hash, string metadata, address agent, uint256 timestamp, bool isActive, string zgStorageId, string contentType, uint256 size, string[] tags))",
  "function getAgentMemories(address agent) external view returns (bytes32[] memory)",
  "function isMemoryHashVerified(bytes32 hash) external view returns (bool)",
  
  // 0G-specific query functions
  "function getMemoryHashByZGStorageId(string calldata zgStorageId) external view returns (bytes32)",
  "function getMemoryHashesByTag(string calldata tag) external view returns (bytes32[] memory)",
  "function getMemoryHashesByContentType(string calldata contentType) external view returns (bytes32[] memory)",
  "function getAllTags() external view returns (string[] memory)",
  
  // Statistics and enumeration
  "function getTotalMemoryHashes() external view returns (uint256)",
  "function getMemoryHashByIndex(uint256 index) external view returns (bytes32)",
  "function getMemoryStats() external view returns (uint256 totalMemories, uint256 activeMemories, uint256 verifiedMemories, uint256 totalTags, uint256 totalSize)",
  
  // Update functions
  "function updateZGStorageId(bytes32 hash, string calldata newZgStorageId) external",
  
  // Access control (from Ownable)
  "function owner() external view returns (address)",
  "function transferOwnership(address newOwner) external"
] as const;

// TypeScript interfaces for better type safety
export interface MemoryHashStruct {
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

export interface MemoryStatsStruct {
  totalMemories: bigint;
  activeMemories: bigint;
  verifiedMemories: bigint;
  totalTags: bigint;
  totalSize: bigint;
}

export interface ContractEventLog {
  hash: string;
  agent: string;
  metadata: string;
  zgStorageId: string;
  contentType: string;
  timestamp: bigint;
  tags?: string[];
}

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
