import { NextRequest, NextResponse } from 'next/server';
import { getOGStorage } from '@/lib/0g-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { action, streamId, key, value } = await request.json();

    if (!action || !streamId || !key) {
      return NextResponse.json(
        { error: 'Missing required parameters: action, streamId, key' },
        { status: 400 }
      );
    }

    const ogStorage = getOGStorage();

    if (action === 'upload') {
      if (!value) {
        return NextResponse.json(
          { error: 'Value is required for upload action' },
          { status: 400 }
        );
      }

      console.log(`🧪 Testing 0G-KV Upload: streamId=${streamId}, key=${key}`);
      const txHash = await ogStorage.uploadToKV(streamId, key, value);
      
      return NextResponse.json({
        success: true,
        action: 'upload',
        streamId,
        key,
        value,
        transactionHash: txHash,
        explorerUrl: `https://chainscan-galileo.0g.ai/tx/${txHash}`
      });

    } else if (action === 'download') {
      console.log(`🧪 Testing 0G-KV Download: streamId=${streamId}, key=${key}`);
      const retrievedValue = await ogStorage.downloadFromKV(streamId, key);
      
      return NextResponse.json({
        success: true,
        action: 'download',
        streamId,
        key,
        value: retrievedValue
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "upload" or "download"' },
        { status: 400 }
      );
    }

  } catch (error: any) {
    console.error('0G-KV API error:', error);
    
    return NextResponse.json(
      { 
        error: '0G-KV operation failed', 
        details: error.message,
        success: false
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: '0G Key-Value Storage Test API',
    endpoints: {
      'POST /api/test-kv': {
        description: 'Test 0G-KV upload and download operations',
        parameters: {
          action: 'upload | download',
          streamId: 'string (required)',
          key: 'string (required)',
          value: 'string (required for upload)'
        },
        examples: {
          upload: {
            action: 'upload',
            streamId: 'test-stream-123',
            key: 'user-preference',
            value: '{"theme": "dark", "language": "en"}'
          },
          download: {
            action: 'download',
            streamId: 'test-stream-123',
            key: 'user-preference'
          }
        }
      }
    }
  });
}
