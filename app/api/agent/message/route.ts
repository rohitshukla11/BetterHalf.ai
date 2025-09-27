import { NextRequest, NextResponse } from 'next/server';
import { getMemoryService } from '@/lib/memory-service';
import { getMemoryManager } from '@/lib/memory-manager';
import { getInferenceClient } from '@/lib/inference-client';

interface AgentMessageRequest {
  message: string;
  agentId: string;
  conversationId?: string;
  model?: string;
  context?: string;
}

interface AgentMessageResponse {
  response: string;
  agentId: string;
  conversationId?: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  memoryStored: boolean;
  memoryRetrieved: {
    count: number;
    context: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: AgentMessageRequest = await request.json();

    if (!body.message || !body.agentId) {
      return NextResponse.json(
        { error: 'Message and agentId are required' },
        { status: 400 }
      );
    }

    const { message, agentId, conversationId, model = 'llama-2-7b', context } = body;

    console.log(`🤖 Agent ${agentId} sending message: ${message.substring(0, 50)}...`);

    // Initialize services
    const memoryService = getMemoryService();
    const memoryManager = getMemoryManager();
    const inferenceClient = getInferenceClient();

    // Initialize all services
    await Promise.all([
      memoryService.initialize(),
      memoryManager.initialize(),
      inferenceClient.initialize()
    ]);

    // Query relevant memories for context
    let memoryContext = '';
    let retrievedMemories = { count: 0, context: '' };

    try {
      const memoryResults = await memoryManager.queryMemory({
        query: message,
        agentId,
        limit: 5,
        threshold: 0.7
      });

      if (memoryResults.length > 0) {
        memoryContext = memoryResults
          .map(result => result.metadata.content)
          .join('\n\n');

        retrievedMemories = {
          count: memoryResults.length,
          context: memoryContext.substring(0, 500) + '...'
        };

        console.log(`📚 Retrieved ${memoryResults.length} relevant memories for context`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to retrieve memories for context:', error);
    }

    // Generate response using 0G Compute
    const inferenceRequest = {
      model,
      prompt: message,
      context: memoryContext,
      maxTokens: 1000,
      temperature: 0.7,
      agentId,
      conversationId
    };

    const inferenceResponse = await inferenceClient.generateResponse(inferenceRequest);

    // Store the conversation in memory with embeddings
    let memoryStored = false;
    try {
      await memoryService.createMemory({
        content: `User: ${message}\n\nAgent: ${inferenceResponse.response}`,
        type: 'conversation',
        category: 'chat',
        tags: ['agent-conversation', agentId, model],
        encrypted: true,
        accessPolicy: {
          owner: agentId,
          permissions: []
        },
        metadata: {
          size: 0,
          checksum: '',
          version: 1,
          relatedMemories: [],
          encryptionKeyId: '',
          encryptionSalt: ''
        }
      });

      memoryStored = true;
      console.log(`💾 Stored conversation in memory with 0G Storage`);
    } catch (error) {
      console.error('❌ Failed to store conversation in memory:', error);
    }

    const response: AgentMessageResponse = {
      response: inferenceResponse.response,
      agentId,
      conversationId,
      model: inferenceResponse.model,
      usage: inferenceResponse.usage,
      memoryStored,
      memoryRetrieved: retrievedMemories
    };

    console.log(`✅ Agent response generated successfully`);
    return NextResponse.json(response);

  } catch (error: any) {
    console.error('❌ Agent message error:', error);

    return NextResponse.json(
      {
        error: 'Failed to process agent message',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
