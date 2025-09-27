import { NextRequest, NextResponse } from 'next/server';
import { getOGStorage } from '@/lib/0g-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    message: 'Memory Retrieval API',
    endpoints: {
      'POST /api/retrieve-memories': {
        description: 'Retrieve stored memories from Walrus/0G storage',
        parameters: {
          query: 'string (optional) - Search query for memories',
          topK: 'number (optional) - Number of results to return (default: 5)',
          blobId: 'string (optional) - Specific blob ID to retrieve',
        },
        examples: {
          search: {
            query: 'workout preferences',
            topK: 5,
          },
          direct: {
            blobId: 'UEf0bCmDlPRTerfzZlNeZRpZs6C6aloTYTkFWm_LKlQ',
          },
        },
      },
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, topK = 5, blobId } = body;

    const ogStorage = getOGStorage();
    await ogStorage.initialize();

    let result;

    if (blobId) {
      // Direct blob retrieval
      console.log(`📥 Retrieving specific blob: ${blobId}`);
      
      if (ogStorage.walrusStorage) {
        try {
          console.log(`🦭 Retrieving blob from Walrus: ${blobId}`);
          const blobData = await ogStorage.walrusStorage.retrieveBlob(blobId);
          const dataString = blobData.toString('utf-8');
          
          // Try to parse as JSON (it might be encrypted)
          let parsedData;
          try {
            parsedData = JSON.parse(dataString);
          } catch {
            parsedData = { rawData: dataString };
          }

          result = {
            method: 'direct_retrieval',
            storage: 'walrus',
            blobId,
            data: parsedData,
            size: blobData.length,
          };
        } catch (walrusError) {
          console.warn('⚠️ Failed to retrieve from Walrus:', walrusError);
          result = {
            method: 'direct_retrieval',
            storage: 'walrus',
            blobId,
            error: `Failed to retrieve blob: ${walrusError.message}`,
          };
        }
      } else {
        result = {
          method: 'direct_retrieval',
          storage: 'none',
          error: 'No storage service available',
        };
      }
    } else {
      // Query-based retrieval
      console.log(`🔍 Querying memories with query: "${query || 'all'}"`);
      
      // For demonstration, we'll simulate a query vector
      const dummyQueryVector = new Array(1536).fill(0).map(() => Math.random());
      
      const memories = await ogStorage.queryEmbedding(dummyQueryVector, topK);
      
      result = {
        method: 'query_search',
        query: query || 'all',
        topK,
        memories,
        count: memories.length,
        storage: ogStorage.walrusStorage ? 'walrus_primary' : 
                ogStorage.indexer ? '0g_fallback' : 'none',
      };
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });

  } catch (error: any) {
    console.error('❌ Memory retrieval API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Memory retrieval failed',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

