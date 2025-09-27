import { NextRequest, NextResponse } from 'next/server';
import { getMemoryManager } from '@/lib/memory-manager';

interface MemoryVerificationRequest {
  memoryId: string;
  content: string;
}

interface MemoryVerificationResponse {
  verified: boolean;
  memoryId: string;
  storedHash: string;
  computedHash: string;
  matches: boolean;
  metadata: {
    agentId: string;
    timestamp: string;
    tags: string[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: MemoryVerificationRequest = await request.json();

    if (!body.memoryId || !body.content) {
      return NextResponse.json(
        { error: 'MemoryId and content are required' },
        { status: 400 }
      );
    }

    const { memoryId, content } = body;

    console.log(`🔍 Verifying memory: ${memoryId}`);

    // Initialize memory manager
    const memoryManager = getMemoryManager();
    await memoryManager.initialize();

    // Get memory by ID (this would need to be implemented in memory manager)
    // For now, we'll simulate the verification process
    try {
      // In a real implementation, this would:
      // 1. Retrieve the memory from 0G Storage
      // 2. Get the stored hash
      // 3. Compute hash of provided content
      // 4. Compare hashes
      // 5. Check on-chain verification if needed

      // Simulate verification process
      const computedHash = await memoryManager.generateContentHash(content);

      // Mock stored hash (in real implementation, this would come from 0G Storage)
      const storedHash = `mock_hash_${Date.now()}`;

      const matches = computedHash === storedHash;

      const response: MemoryVerificationResponse = {
        verified: matches,
        memoryId,
        storedHash,
        computedHash,
        matches,
        metadata: {
          agentId: 'verification-agent',
          timestamp: new Date().toISOString(),
          tags: ['verification', 'integrity-check']
        }
      };

      console.log(`✅ Memory verification completed: ${matches ? 'VERIFIED' : 'FAILED'}`);
      return NextResponse.json(response);

    } catch (verificationError) {
      console.error('❌ Memory verification failed:', verificationError);

      return NextResponse.json(
        {
          error: 'Failed to verify memory',
          details: verificationError?.message || 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('❌ Memory verification error:', error);

    return NextResponse.json(
      {
        error: 'Failed to process memory verification',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memoryId = searchParams.get('memoryId');
    const content = searchParams.get('content');

    if (!memoryId || !content) {
      return NextResponse.json(
        { error: 'MemoryId and content parameters are required' },
        { status: 400 }
      );
    }

    console.log(`🔍 GET Memory verification: ${memoryId}`);

    // Initialize memory manager
    const memoryManager = getMemoryManager();
    await memoryManager.initialize();

    // Simulate verification process
    try {
      const computedHash = await memoryManager.generateContentHash(content);
      const storedHash = `mock_hash_${Date.now()}`;
      const matches = computedHash === storedHash;

      const response: MemoryVerificationResponse = {
        verified: matches,
        memoryId,
        storedHash,
        computedHash,
        matches,
        metadata: {
          agentId: 'verification-agent',
          timestamp: new Date().toISOString(),
          tags: ['verification', 'integrity-check']
        }
      };

      console.log(`✅ GET Memory verification completed: ${matches ? 'VERIFIED' : 'FAILED'}`);
      return NextResponse.json(response);

    } catch (verificationError) {
      console.error('❌ GET Memory verification failed:', verificationError);

      return NextResponse.json(
        {
          error: 'Failed to verify memory',
          details: verificationError?.message || 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('❌ GET Memory verification error:', error);

    return NextResponse.json(
      {
        error: 'Failed to process memory verification',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
