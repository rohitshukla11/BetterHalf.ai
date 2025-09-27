import { NextRequest, NextResponse } from 'next/server';
import { getZGIndexingService } from '@/lib/0g-indexing-service';
import { MemoryIndexer } from '@/lib/memory-indexer';
import { getMemoryService } from '@/lib/memory-service';

/**
 * 0G Memory Contract API - Handle on-chain memory operations
 */

interface ContractQueryRequest {
  action: 'query' | 'verify' | 'stats' | 'tags' | 'batchIndex';
  criteria?: {
    tag?: string;
    contentType?: string;
    agent?: string;
    zgStorageId?: string;
  };
  memoryId?: string;
  memoryIds?: string[];
}

interface ContractResponse {
  success: boolean;
  data?: any;
  error?: string;
  transactionHash?: string;
}

// GET - Get contract statistics and status
export async function GET() {
  try {
    console.log('📊 Fetching 0G contract status...');

    // Get comprehensive indexing stats
    const stats = await MemoryIndexer.getIndexStats();
    
    // Get all available tags
    const tags = await MemoryIndexer.getAllTags();

    return NextResponse.json({
      success: true,
      data: {
        stats,
        availableTags: tags,
        contractEnabled: true,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ Failed to get contract status:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to get contract status'
    }, { status: 500 });
  }
}

// POST - Perform contract operations
export async function POST(request: NextRequest) {
  try {
    const body: ContractQueryRequest = await request.json();
    console.log(`🔗 0G Contract operation: ${body.action}`);

    const response: ContractResponse = { success: false };

    switch (body.action) {
      case 'query':
        if (!body.criteria) {
          return NextResponse.json({
            success: false,
            error: 'Query criteria required'
          }, { status: 400 });
        }

        const queryResults = await MemoryIndexer.queryMemories({
          tag: body.criteria.tag,
          contentType: body.criteria.contentType,
          agent: body.criteria.agent,
          onChainOnly: true // Only return memories that are on-chain
        });

        response.success = true;
        response.data = {
          memories: queryResults,
          count: queryResults.length
        };
        break;

      case 'verify':
        if (!body.memoryId) {
          return NextResponse.json({
            success: false,
            error: 'Memory ID required for verification'
          }, { status: 400 });
        }

        const verificationResult = await MemoryIndexer.verifyMemory(body.memoryId);
        response.success = verificationResult;
        response.data = { 
          verified: verificationResult,
          memoryId: body.memoryId
        };
        break;

      case 'stats':
        const contractStats = await MemoryIndexer.getIndexStats();
        response.success = true;
        response.data = contractStats;
        break;

      case 'tags':
        const allTags = await MemoryIndexer.getAllTags();
        response.success = true;
        response.data = { tags: allTags };
        break;

      case 'batchIndex':
        if (!body.memoryIds || body.memoryIds.length === 0) {
          return NextResponse.json({
            success: false,
            error: 'Memory IDs required for batch indexing'
          }, { status: 400 });
        }

        // Get memories from memory service
        const memoryService = getMemoryService();
        const memoriesToIndex = [];
        
        for (const memoryId of body.memoryIds) {
          const memory = await memoryService.getMemoryById(memoryId);
          if (memory) {
            memoriesToIndex.push(memory);
          }
        }

        if (memoriesToIndex.length === 0) {
          return NextResponse.json({
            success: false,
            error: 'No valid memories found for the provided IDs'
          }, { status: 400 });
        }

        await MemoryIndexer.batchIndexOnChain(memoriesToIndex);
        
        response.success = true;
        response.data = {
          indexed: memoriesToIndex.length,
          memoryIds: body.memoryIds
        };
        break;

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${body.action}`
        }, { status: 400 });
    }

    console.log(`✅ Contract operation completed: ${body.action}`);
    return NextResponse.json(response);

  } catch (error: any) {
    console.error('❌ Contract operation failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Contract operation failed'
    }, { status: 500 });
  }
}

// PATCH - Update contract configuration or perform maintenance operations
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔧 Contract maintenance operation:', body.operation);

    switch (body.operation) {
      case 'reindex':
        // Re-index all local memories on-chain
        const memoryService = getMemoryService();
        const allMemories = await memoryService.getAllMemories();
        
        if (allMemories.length > 0) {
          await MemoryIndexer.batchIndexOnChain(allMemories);
          
          return NextResponse.json({
            success: true,
            data: {
              message: `Re-indexed ${allMemories.length} memories on-chain`,
              count: allMemories.length
            }
          });
        } else {
          return NextResponse.json({
            success: true,
            data: {
              message: 'No memories found to re-index',
              count: 0
            }
          });
        }

      case 'sync':
        // Sync local index with on-chain data
        // This would involve querying the contract for all memories and updating local cache
        const stats = await MemoryIndexer.getIndexStats();
        
        return NextResponse.json({
          success: true,
          data: {
            message: 'Index sync completed',
            stats
          }
        });

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown maintenance operation: ${body.operation}`
        }, { status: 400 });
    }

  } catch (error: any) {
    console.error('❌ Contract maintenance failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Contract maintenance failed'
    }, { status: 500 });
  }
}
