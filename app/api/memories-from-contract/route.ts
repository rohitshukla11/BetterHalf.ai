import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { MemoryEntry, MemoryType, AccessPolicy } from '@/types/memory';

/**
 * Direct contract memory retrieval endpoint
 * This bypasses the complex memory service and queries the contract directly
 */
export async function GET() {
  try {
    console.log('🔗 Direct contract memory retrieval started');
    
    // Contract configuration
    const contractAddress = process.env.NEXT_PUBLIC_MEMORY_REGISTRY_ADDRESS;
    const rpcUrl = process.env.NEXT_PUBLIC_0G_RPC_URL || 'https://evmrpc-testnet.0g.ai';
    const privateKey = process.env.PRIVATE_KEY || process.env.NEXT_PUBLIC_0G_PRIVATE_KEY;
    
    if (!contractAddress) {
      return NextResponse.json({ error: 'Contract address not configured' }, { status: 500 });
    }
    
    if (!privateKey) {
      return NextResponse.json({ error: 'Private key not available' }, { status: 500 });
    }

    // Load contract ABI
    const contractAbi = await import('@/artifacts/contracts/MemoryRegistry.sol/MemoryRegistry.json');
    
    // Setup provider and contract
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(contractAddress, contractAbi.default, signer);
    
    console.log('📊 Getting contract stats...');
    const stats = await contract.getMemoryStats();
    const totalMemories = Number(stats[0]);
    
    console.log(`📊 Contract has ${totalMemories} memories`);
    
    if (totalMemories === 0) {
      return NextResponse.json({
        memories: [],
        totalCount: 0,
        facets: { types: {}, categories: {}, tags: {} }
      });
    }

    // Get all memory hashes from all tags
    const memories: MemoryEntry[] = [];
    const allMemoryHashes = new Set<string>();
    
    try {
      console.log('🏷️ Getting all available tags...');
      const allTags = await contract.getAllTags();
      console.log(`🏷️ Available tags: ${allTags.join(', ')}`);
      
      // Collect memory hashes from all tags
      for (const tag of allTags) {
        try {
          const memoriesByTag = await contract.getMemoryHashesByTag(tag);
          console.log(`📊 Found ${memoriesByTag.length} memories with tag "${tag}"`);
          memoriesByTag.forEach((hash: string) => allMemoryHashes.add(hash));
        } catch (tagError) {
          console.warn(`⚠️ Failed to get memories for tag "${tag}":`, tagError);
        }
      }
      
      console.log(`📊 Total unique memory hashes found: ${allMemoryHashes.size}`);
      
      // Convert each unique memory hash to MemoryEntry
      for (const memoryHash of Array.from(allMemoryHashes).slice(0, 20)) { // Limit to 20
        try {
          console.log(`📖 Reading memory: ${memoryHash.slice(0, 8)}...`);
          const memoryData = await contract.getMemoryHash(memoryHash);
          
          const memory: MemoryEntry = {
            id: memoryHash,
            content: memoryData.metadata || `Memory stored on-chain (${memoryHash.slice(0, 8)}...)`,
            type: mapContentType(memoryData.contentType),
            category: 'conversation',
            tags: memoryData.tags || [],
            createdAt: new Date(Number(memoryData.timestamp) * 1000),
            updatedAt: new Date(Number(memoryData.timestamp) * 1000),
            encrypted: false,
            accessPolicy: {
              owner: memoryData.agent || 'system',
              permissions: []
            } as AccessPolicy,
            metadata: {
              size: Number(memoryData.size) || 0,
              checksum: memoryHash,
              version: 1,
              relatedMemories: [],
              encryptionKeyId: '',
              encryptionSalt: '',
              blobId: memoryData.zgStorageId,
              storageProvider: '0g-storage'
            },
            ipfsHash: memoryData.zgStorageId,
            transactionHash: memoryHash,
            explorerUrl: `${process.env.NEXT_PUBLIC_0G_EXPLORER_URL || 'https://chainscan-galileo.0g.ai'}/transaction/${memoryHash}`,
            walrusUrl: memoryData.zgStorageId ? `https://walruscan.com/testnet/blob/${memoryData.zgStorageId}` : undefined
          };
          
          memories.push(memory);
          console.log(`✅ Successfully converted memory: ${memoryHash.slice(0, 8)}...`);
          
        } catch (memoryError) {
          console.warn(`⚠️ Failed to read memory ${memoryHash}:`, memoryError);
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to retrieve memories from contract:', error);
    }
    
    console.log(`✅ Successfully retrieved ${memories.length} memories from contract`);
    
    // Calculate facets
    const facets = {
      types: {} as Record<MemoryType, number>,
      categories: {} as Record<string, number>,
      tags: {} as Record<string, number>
    };

    memories.forEach(memory => {
      facets.types[memory.type] = (facets.types[memory.type] || 0) + 1;
      facets.categories[memory.category] = (facets.categories[memory.category] || 0) + 1;
      memory.tags?.forEach(tag => {
        facets.tags[tag] = (facets.tags[tag] || 0) + 1;
      });
    });
    
    return NextResponse.json({
      memories,
      totalCount: memories.length,
      facets,
      contractStats: {
        totalMemories,
        retrievedMemories: memories.length
      }
    });

  } catch (error: any) {
    console.error('❌ Direct contract memory retrieval failed:', error);
    return NextResponse.json({
      error: 'Failed to retrieve memories from contract',
      details: error.message,
      memories: [],
      totalCount: 0,
      facets: { types: {}, categories: {}, tags: {} }
    }, { status: 500 });
  }
}

function mapContentType(contentType?: string): MemoryType {
  if (!contentType) return 'conversation';
  
  switch (contentType.toLowerCase()) {
    case 'conversation':
    case 'chat':
      return 'conversation';
    case 'profile_data':
    case 'profile':
      return 'profile_data';
    case 'learned_fact':
    case 'fact':
      return 'learned_fact';
    case 'user_preference':
    case 'preference':
      return 'user_preference';
    case 'task_outcome':
    case 'task':
      return 'task_outcome';
    case 'multimedia':
    case 'media':
      return 'multimedia';
    case 'workflow':
      return 'workflow';
    case 'agent_share':
    case 'share':
      return 'agent_share';
    default:
      return 'conversation';
  }
}
