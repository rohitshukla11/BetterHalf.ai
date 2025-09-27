import { NextRequest, NextResponse } from 'next/server';
import { getMemoryService } from '@/lib/memory-service';
import { getMemoryManager } from '@/lib/memory-manager';
import { getInferenceClient } from '@/lib/inference-client';

interface DemoRequest {
  scenario: string;
  agent1Id: string;
  agent2Id: string;
  messages: string[];
}

interface DemoResponse {
  scenario: string;
  agents: {
    agent1: {
      id: string;
      messages: string[];
      memoryCount: number;
    };
    agent2: {
      id: string;
      messages: string[];
      memoryCount: number;
    };
  };
  memoryInteractions: Array<{
    type: 'store' | 'query' | 'verify';
    agentId: string;
    description: string;
    result: string;
  }>;
  summary: string;
}

const DEMO_SCENARIOS = {
  'memory_sharing': {
    name: 'Memory Sharing Between Agents',
    description: 'Two agents share and recall memories through 0G Storage'
  },
  'knowledge_transfer': {
    name: 'Knowledge Transfer',
    description: 'Agent 1 teaches Agent 2 through shared memory'
  },
  'collaborative_problem_solving': {
    name: 'Collaborative Problem Solving',
    description: 'Agents work together using shared context and memory'
  }
};

export async function POST(request: NextRequest) {
  try {
    const body: DemoRequest = await request.json();

    if (!body.scenario || !body.agent1Id || !body.agent2Id || !body.messages) {
      return NextResponse.json(
        { error: 'Scenario, agent IDs, and messages are required' },
        { status: 400 }
      );
    }

    const { scenario, agent1Id, agent2Id, messages } = body;

    console.log(`🎭 Running demo scenario: ${scenario} with agents ${agent1Id} and ${agent2Id}`);

    // Initialize services
    const memoryService = getMemoryService();
    const memoryManager = getMemoryManager();
    const inferenceClient = getInferenceClient();

    await Promise.all([
      memoryService.initialize(),
      memoryManager.initialize(),
      inferenceClient.initialize()
    ]);

    const memoryInteractions: DemoResponse['memoryInteractions'] = [];

    // Demo scenario execution
    switch (scenario) {
      case 'memory_sharing':
        return await runMemorySharingDemo(
          agent1Id,
          agent2Id,
          messages,
          memoryService,
          memoryManager,
          inferenceClient,
          memoryInteractions
        );

      case 'knowledge_transfer':
        return await runKnowledgeTransferDemo(
          agent1Id,
          agent2Id,
          messages,
          memoryService,
          memoryManager,
          inferenceClient,
          memoryInteractions
        );

      case 'collaborative_problem_solving':
        return await runCollaborativeDemo(
          agent1Id,
          agent2Id,
          messages,
          memoryService,
          memoryManager,
          inferenceClient,
          memoryInteractions
        );

      default:
        return NextResponse.json(
          { error: 'Invalid scenario. Choose: memory_sharing, knowledge_transfer, or collaborative_problem_solving' },
          { status: 400 }
        );
    }

  } catch (error: any) {
    console.error('❌ Demo execution error:', error);

    return NextResponse.json(
      {
        error: 'Failed to run demo',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function runMemorySharingDemo(
  agent1Id: string,
  agent2Id: string,
  messages: string[],
  memoryService: any,
  memoryManager: any,
  inferenceClient: any,
  memoryInteractions: any[]
): Promise<NextResponse> {

  const agent1Messages: string[] = [];
  const agent2Messages: string[] = [];

  // Agent 1 stores initial knowledge
  try {
    await memoryManager.storeEmbedding('shared_knowledge_1', messages[0], {
      agentId: agent1Id,
      tags: ['shared', 'knowledge', 'demo']
    });

    memoryInteractions.push({
      type: 'store',
      agentId: agent1Id,
      description: 'Agent 1 stores initial knowledge',
      result: '✅ Stored in 0G Storage with embeddings'
    });

    agent1Messages.push(`I stored: ${messages[0]}`);
  } catch (error) {
    memoryInteractions.push({
      type: 'store',
      agentId: agent1Id,
      description: 'Agent 1 stores initial knowledge',
      result: `❌ Failed: ${error?.message}`
    });
  }

  // Agent 2 queries for knowledge
  try {
    const queryResults = await memoryManager.queryMemory({
      query: 'What do you know?',
      agentId: agent2Id,
      limit: 5
    });

    const foundKnowledge = queryResults.length > 0 ? queryResults[0].metadata.content : 'No knowledge found';

    memoryInteractions.push({
      type: 'query',
      agentId: agent2Id,
      description: 'Agent 2 queries for shared knowledge',
      result: `✅ Found: ${foundKnowledge.substring(0, 50)}...`
    });

    agent2Messages.push(`I found: ${foundKnowledge}`);
  } catch (error) {
    memoryInteractions.push({
      type: 'query',
      agentId: agent2Id,
      description: 'Agent 2 queries for shared knowledge',
      result: `❌ Failed: ${error?.message}`
    });
  }

  // Agent 2 stores additional knowledge
  try {
    await memoryManager.storeEmbedding('shared_knowledge_2', messages[1], {
      agentId: agent2Id,
      tags: ['shared', 'knowledge', 'demo']
    });

    memoryInteractions.push({
      type: 'store',
      agentId: agent2Id,
      description: 'Agent 2 stores additional knowledge',
      result: '✅ Stored in 0G Storage with embeddings'
    });

    agent2Messages.push(`I stored: ${messages[1]}`);
  } catch (error) {
    memoryInteractions.push({
      type: 'store',
      agentId: agent2Id,
      description: 'Agent 2 stores additional knowledge',
      result: `❌ Failed: ${error?.message}`
    });
  }

  // Agent 1 queries updated knowledge
  try {
    const queryResults = await memoryManager.queryMemory({
      query: 'Show me all knowledge',
      agentId: agent1Id,
      limit: 10
    });

    const knowledgeSummary = queryResults.map(r => r.metadata.content).join('; ');

    memoryInteractions.push({
      type: 'query',
      agentId: agent1Id,
      description: 'Agent 1 queries all shared knowledge',
      result: `✅ Found ${queryResults.length} pieces of knowledge`
    });

    agent1Messages.push(`I now see: ${knowledgeSummary.substring(0, 100)}...`);
  } catch (error) {
    memoryInteractions.push({
      type: 'query',
      agentId: agent1Id,
      description: 'Agent 1 queries all shared knowledge',
      result: `❌ Failed: ${error?.message}`
    });
  }

  return NextResponse.json({
    scenario: 'memory_sharing',
    agents: {
      agent1: {
        id: agent1Id,
        messages: agent1Messages,
        memoryCount: agent1Messages.length
      },
      agent2: {
        id: agent2Id,
        messages: agent2Messages,
        memoryCount: agent2Messages.length
      }
    },
    memoryInteractions,
    summary: `Demo completed: Two agents successfully shared and retrieved memories using 0G Storage. Total interactions: ${memoryInteractions.length}`
  });
}

async function runKnowledgeTransferDemo(
  agent1Id: string,
  agent2Id: string,
  messages: string[],
  memoryService: any,
  memoryManager: any,
  inferenceClient: any,
  memoryInteractions: any[]
): Promise<NextResponse> {

  // Teacher agent stores knowledge
  await memoryManager.storeEmbedding('lesson_1', messages[0], {
    agentId: agent1Id,
    tags: ['lesson', 'teaching', 'demo']
  });

  memoryInteractions.push({
    type: 'store',
    agentId: agent1Id,
    description: 'Teacher agent stores lesson',
    result: '✅ Lesson stored in 0G Storage'
  });

  // Student agent queries for lessons
  const queryResults = await memoryManager.queryMemory({
    query: 'Teach me something',
    agentId: agent2Id,
    limit: 5
  });

  memoryInteractions.push({
    type: 'query',
    agentId: agent2Id,
    description: 'Student agent queries for lessons',
    result: `✅ Found ${queryResults.length} lessons`
  });

  // Student stores what they learned
  await memoryManager.storeEmbedding('learned_lesson', 'I learned something new!', {
    agentId: agent2Id,
    tags: ['learning', 'demo', 'progress']
  });

  memoryInteractions.push({
    type: 'store',
    agentId: agent2Id,
    description: 'Student stores learning progress',
    result: '✅ Learning progress stored'
  });

  return NextResponse.json({
    scenario: 'knowledge_transfer',
    agents: {
      agent1: { id: agent1Id, messages: ['Taught: ' + messages[0]], memoryCount: 1 },
      agent2: { id: agent2Id, messages: ['Learned: I learned something new!'], memoryCount: 1 }
    },
    memoryInteractions,
    summary: 'Knowledge transfer demo: Teacher shared knowledge, student learned and stored progress'
  });
}

async function runCollaborativeDemo(
  agent1Id: string,
  agent2Id: string,
  messages: string[],
  memoryService: any,
  memoryManager: any,
  inferenceClient: any,
  memoryInteractions: any[]
): Promise<NextResponse> {

  // Store problem context
  await memoryManager.storeEmbedding('problem_context', messages[0], {
    agentId: agent1Id,
    tags: ['problem', 'collaboration', 'demo']
  });

  memoryInteractions.push({
    type: 'store',
    agentId: agent1Id,
    description: 'Agent 1 stores problem context',
    result: '✅ Problem context stored'
  });

  // Agent 2 queries for context
  const contextResults = await memoryManager.queryMemory({
    query: 'What problem are we solving?',
    agentId: agent2Id,
    limit: 5
  });

  memoryInteractions.push({
    type: 'query',
    agentId: agent2Id,
    description: 'Agent 2 retrieves problem context',
    result: `✅ Retrieved context: ${contextResults[0]?.metadata.content.substring(0, 50)}...`
  });

  // Store solution approach
  await memoryManager.storeEmbedding('solution_approach', messages[1], {
    agentId: agent2Id,
    tags: ['solution', 'approach', 'demo']
  });

  memoryInteractions.push({
    type: 'store',
    agentId: agent2Id,
    description: 'Agent 2 stores solution approach',
    result: '✅ Solution approach stored'
  });

  // Final collaboration
  const finalQuery = await memoryManager.queryMemory({
    query: 'Complete solution',
    limit: 10
  });

  memoryInteractions.push({
    type: 'query',
    agentId: 'both',
    description: 'Combined query for complete solution',
    result: `✅ Combined ${finalQuery.length} memory pieces for solution`
  });

  return NextResponse.json({
    scenario: 'collaborative_problem_solving',
    agents: {
      agent1: { id: agent1Id, messages: ['Defined problem: ' + messages[0]], memoryCount: 1 },
      agent2: { id: agent2Id, messages: ['Proposed solution: ' + messages[1]], memoryCount: 1 }
    },
    memoryInteractions,
    summary: 'Collaborative demo: Agents worked together using shared memory context'
  });
}
