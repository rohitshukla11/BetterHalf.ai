import { NextRequest, NextResponse } from 'next/server';
import { createWalrusStorage } from '@/lib/walrus-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    message: 'Walrus Storage Test API',
    endpoints: {
      'POST /api/walrus-test': {
        description: 'Test Walrus storage operations',
        parameters: {
          action: 'store | retrieve | exists | info',
          data: 'string (required for store action) - Data to store',
          blobId: 'string (required for retrieve/exists/info actions) - Blob ID to operate on',
        },
        examples: {
          store: {
            action: 'store',
            data: 'Hello, Walrus decentralized storage!'
          },
          retrieve: {
            action: 'retrieve',
            blobId: 'your_blob_id_here'
          },
          exists: {
            action: 'exists',
            blobId: 'your_blob_id_here'
          }
        }
      }
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data, blobId } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'action is required', success: false },
        { status: 400 }
      );
    }

    const walrusStorage = createWalrusStorage();

    let result;
    switch (action) {
      case 'store':
        if (!data) {
          return NextResponse.json(
            { error: 'data is required for store action', success: false },
            { status: 400 }
          );
        }

        console.log(`🧪 Testing Walrus store: "${data.slice(0, 50)}..."`);
        const buffer = Buffer.from(data, 'utf-8');
        result = await walrusStorage.storeBlob(buffer);

        return NextResponse.json({
          success: true,
          action: 'store',
          data: data.slice(0, 100) + (data.length > 100 ? '...' : ''),
          blobId: result.blobId,
          suiRef: result.suiRef,
          size: result.size,
          epochs: result.epochs,
          endEpoch: result.endEpoch,
          explorerUrl: result.explorerUrl,
          timestamp: new Date().toISOString()
        });

      case 'retrieve':
        if (!blobId) {
          return NextResponse.json(
            { error: 'blobId is required for retrieve action', success: false },
            { status: 400 }
          );
        }

        console.log(`🧪 Testing Walrus retrieve: ${blobId}`);
        const retrievedData = await walrusStorage.retrieveBlob(blobId);
        const retrievedText = retrievedData.toString('utf-8');

        return NextResponse.json({
          success: true,
          action: 'retrieve',
          blobId,
          data: retrievedText,
          size: retrievedData.length,
          timestamp: new Date().toISOString()
        });

      case 'exists':
        if (!blobId) {
          return NextResponse.json(
            { error: 'blobId is required for exists action', success: false },
            { status: 400 }
          );
        }

        console.log(`🧪 Testing Walrus exists: ${blobId}`);
        const exists = await walrusStorage.blobExists(blobId);

        return NextResponse.json({
          success: true,
          action: 'exists',
          blobId,
          exists,
          timestamp: new Date().toISOString()
        });

      case 'info':
        if (!blobId) {
          return NextResponse.json(
            { error: 'blobId is required for info action', success: false },
            { status: 400 }
          );
        }

        console.log(`🧪 Testing Walrus info: ${blobId}`);
        const info = await walrusStorage.getBlobInfo(blobId);

        return NextResponse.json({
          success: true,
          action: 'info',
          blobId,
          info,
          timestamp: new Date().toISOString()
        });

      case 'stats':
        console.log('🧪 Getting Walrus storage stats');
        const stats = walrusStorage.getStorageStats();

        return NextResponse.json({
          success: true,
          action: 'stats',
          ...stats,
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be "store", "retrieve", "exists", "info", or "stats"', success: false },
          { status: 400 }
        );
    }

  } catch (error: any) {
    console.error('❌ Walrus test API error:', error);
    
    return NextResponse.json(
      {
        error: 'Walrus operation failed',
        details: error.message,
        success: false
      },
      { status: 500 }
    );
  }
}
