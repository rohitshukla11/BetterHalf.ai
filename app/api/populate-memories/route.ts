import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Populating memory index with stored Walrus memories...');

    // Known memories from server logs
    const knownMemories = [
      {
        blobId: 'UEf0bCmDlPRTerfzZlNeZRpZs6C6aloTYTkFWm_LKlQ',
        suiRef: '0x64f9aa32c3f5880ce0e076f12a9fb79c0b612ab96c8481272b8764d9d6eeb0de',
        conversationId: '30c62a4b-8ffe-465e-84f3-77c8d3d74779',
        content: 'User preferences and profile data'
      },
      {
        blobId: 'gXvnoSV4MhQUXqzESGgYrCHYfsnlF-_uwJNA093rWoo',
        suiRef: '0x3dd9492a4532b2d0a28a9417702dba359c883844556624b9d1b9726068b64440',
        conversationId: 'e69eaedf-a7ed-47b0-ada5-a660f0177767',
        content: 'Schedule and daily planning conversation'
      },
      {
        blobId: 'H-MYL6r4SBFxojjHhywDRNPd98mWO3l_2V-6UAzD-Z8',
        suiRef: '0xfe1e6314b596e3d058dd3f068e1b1daa680168681e8dc98f8963d0c1bd113941',
        conversationId: '5fc18f5f-28f5-4dba-8fac-b36d2daebb76',
        content: 'User interaction and learning data'
      },
      {
        blobId: 'JNcIk40d_v7p-OqQDjOAd5xHLOSeVNxUPdPH7Vylx9M',
        suiRef: '0x074c35a5522d1e86d7d246f099c9ae9569b159c95478f0f928fe34fc56d67a99',
        conversationId: 'de77d32e-f723-4b88-9334-ca4644fb529a',
        content: 'Recent conversation memory'
      }
    ];

    const memoryEntries = knownMemories.map((memory, index) => {
      const now = new Date();
      return {
        id: memory.conversationId,
        content: memory.content,
        type: 'conversation',
        category: 'Chat History',
        tags: ['walrus', 'stored', 'conversation'],
        encrypted: true,
        createdAt: new Date(now.getTime() - (index * 60000)),
        updatedAt: now,
        ipfsHash: memory.blobId,
        explorerUrl: `https://suiscan.xyz/testnet/object/${memory.suiRef}`,
        transactionHash: memory.suiRef,
        accessPolicy: {
          owner: 'local-user',
          permissions: ['read', 'write'],
          sharedWith: []
        },
        metadata: {
          size: 45000,
          checksum: '',
          version: 1,
          relatedMemories: [],
          encryptionKeyId: '',
          encryptionSalt: '',
          storageProvider: 'walrus',
          blobId: memory.blobId,
          suiReference: memory.suiRef
        }
      };
    });

    console.log(`✅ Created ${memoryEntries.length} memory entries`);

    return NextResponse.json({
      success: true,
      message: 'Memory index populated successfully',
      memoryCount: memoryEntries.length,
      memories: memoryEntries,
      instructions: {
        step1: 'Copy the memories array from this response',
        step2: 'Open browser developer tools (F12)',
        step3: 'Go to Console tab',
        step4: 'Run: localStorage.setItem("walrus_memory_index", JSON.stringify(memories))',
        step5: 'Refresh the page to see memories',
        automated: 'Or use the client-side script below'
      },
      clientScript: `
// Run this in browser console to populate memories
const memories = ${JSON.stringify(memoryEntries, null, 2)};
localStorage.setItem('walrus_memory_index', JSON.stringify(memories));
console.log('✅ Memory index populated with', memories.length, 'memories');
location.reload();
      `.trim(),
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('❌ Failed to populate memory index:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to populate memory index',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

