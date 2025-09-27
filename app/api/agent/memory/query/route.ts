import { NextRequest, NextResponse } from 'next/server';
import { getMemoryManager } from '@/lib/memory-manager';

interface MemoryQueryRequest {
  query: string;
  agentId?: string;
  tags?: string[];
  limit?: number;
  threshold?: number;
}

interface MemoryQueryResponse {
  memories: Array<{
    id: string;
    content: string;
    similarity: number;
    metadata: {
      agentId: string;
      timestamp: string;
      tags: string[];
      contentHash: string;
    };
  }>;
  total: number;
  query: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: MemoryQueryRequest = await request.json();

    if (!body.query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    const { query, agentId, tags, limit = 10, threshold = 0.7 } = body;

    console.log(`🔍 Querying memory with: ${query.substring(0, 50)}...`);

    // Initialize memory manager
    const memoryManager = getMemoryManager();
    await memoryManager.initialize();

    // Query memories using 0G Storage
    const memoryResults = await memoryManager.queryMemory({
      query,
      agentId,
      tags,
      limit,
      threshold
    });

    // Format response
    const memories = memoryResults.map((result, index) => ({
      id: result.storageId,
      content: result.metadata.content,
      similarity: 0.8 - (index * 0.05), // Mock similarity score
      metadata: {
        agentId: result.metadata.agentId,
        timestamp: result.metadata.timestamp,
        tags: result.metadata.tags,
        contentHash: result.metadata.contentHash
      }
    }));

    const response: MemoryQueryResponse = {
      memories,
      total: memories.length,
      query
    };

    console.log(`✅ Memory query completed: ${memories.length} results`);
    return NextResponse.json(response);

  } catch (error: any) {
    console.error('❌ Memory query error:', error);

    return NextResponse.json(
      {
        error: 'Failed to query memory',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const agentId = searchParams.get('agentId');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);
    const limit = parseInt(searchParams.get('limit') || '10');
    const threshold = parseFloat(searchParams.get('threshold') || '0.7');

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 GET Memory query: ${query.substring(0, 50)}...`);

    // Initialize memory manager
    const memoryManager = getMemoryManager();
    await memoryManager.initialize();

    // Query memories using 0G Storage
    const memoryResults = await memoryManager.queryMemory({
      query,
      agentId: agentId || undefined,
      tags,
      limit,
      threshold
    });

    // Format response
    const memories = memoryResults.map((result, index) => ({
      id: result.storageId,
      content: result.metadata.content,
      similarity: 0.8 - (index * 0.05), // Mock similarity score
      metadata: {
        agentId: result.metadata.agentId,
        timestamp: result.metadata.timestamp,
        tags: result.metadata.tags,
        contentHash: result.metadata.contentHash
      }
    }));

    const response: MemoryQueryResponse = {
      memories,
      total: memories.length,
      query
    };

    console.log(`✅ GET Memory query completed: ${memories.length} results`);
    return NextResponse.json(response);

  } catch (error: any) {
    console.error('❌ GET Memory query error:', error);

    return NextResponse.json(
      {
        error: 'Failed to query memory',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
