import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // Import the MemoryIndexer
    const { MemoryIndexer } = await import('@/lib/memory-indexer');
    
    // Get comprehensive index statistics (now async with on-chain data)
    const stats = await MemoryIndexer.getIndexStats();
    const metadataIndex = MemoryIndexer.getMetadataIndex();
    const vectorIndex = MemoryIndexer.getVectorIndex();
    
    // Sample of memories for debugging
    const sampleMemories = metadataIndex.slice(0, 3).map(memory => ({
      id: memory.id,
      content: memory.content.slice(0, 100) + '...',
      type: memory.type,
      category: memory.category,
      tags: memory.tags,
      createdAt: memory.createdAt,
      explorerUrl: memory.explorerUrl,
      storageProvider: memory.metadata?.storageProvider,
      blobId: memory.metadata?.blobId
    }));
    
    // Sample of vectors for debugging
    const sampleVectors = vectorIndex.slice(0, 3).map(vector => ({
      id: vector.id,
      vectorDimensions: vector.vector.length,
      vectorSample: vector.vector.slice(0, 5), // First 5 dimensions
      metadata: {
        content: vector.metadata.content?.slice(0, 50) + '...',
        tags: vector.metadata.tags,
        category: vector.metadata.category
      }
    }));

    return NextResponse.json({
      success: true,
      indexing: {
        system: 'Enhanced MemoryIndexer v3.0',
        description: 'Hybrid indexing system with local caching and 0G Chain verification',
        features: [
          'Local metadata indexing for fast lookups',
          'Vector indexing for similarity search',
          'On-chain memory hash anchoring on 0G Chain',
          '0G Storage integration for decentralized storage',
          'Cross-agent memory verification',
          'Tag-based indexing and search',
          'Content type categorization',
          'Hybrid local + on-chain querying'
        ]
      },
      statistics: stats,
      storage: {
        metadataLocation: 'localStorage: og_memory_index',
        vectorLocation: 'localStorage: og_vector_index',
        configLocation: 'localStorage: og_index_config',
        onChainContract: 'MemoryRegistry on 0G Chain',
        decentralizedStorage: '0G Storage Network'
      },
      samples: {
        memories: sampleMemories,
        vectors: sampleVectors
      },
      status: {
        localIndexReady: stats.local.metadataCount > 0,
        vectorIndexReady: stats.local.vectorCount > 0,
        onChainIndexReady: stats.onChain ? stats.onChain.totalMemories > 0 : false,
        similaritySearchEnabled: stats.local.vectorCount > 0,
        contractIntegrationActive: !!stats.onChain,
        zgStorageActive: true,
        crossAgentVerificationEnabled: !!stats.onChain
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Failed to get memory index status:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get memory index status',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

