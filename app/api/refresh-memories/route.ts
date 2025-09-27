import { NextRequest, NextResponse } from 'next/server';
import { getMemoryService } from '@/lib/memory-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    message: 'Memory Refresh API',
    description: 'Refresh memories from Walrus storage',
    endpoints: {
      'POST /api/refresh-memories': {
        description: 'Refresh the memory list from Walrus storage',
      },
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Refreshing memories from storage...');

    const memoryService = getMemoryService();
    await memoryService.initialize();

    // Get all current memories
    const memories = await memoryService.getAllMemories();
    
    // Get search results to trigger memory loading
    const searchResult = await memoryService.searchMemories({
      query: '',
      limit: 50
    });

    console.log(`✅ Memory refresh complete:`);
    console.log(`   📚 Total memories: ${memories.length}`);
    console.log(`   🔍 Search results: ${searchResult.memories.length}`);

    return NextResponse.json({
      success: true,
      message: 'Memories refreshed successfully',
      totalMemories: memories.length,
      searchResults: searchResult.memories.length,
      memories: memories.slice(0, 10), // Return first 10 memories as preview
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('❌ Memory refresh failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Memory refresh failed',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

