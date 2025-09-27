import { NextRequest, NextResponse } from 'next/server';
import { createZGComputeService, callDeployedModel } from '@/lib/0g-compute';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    message: '0G Compute Network API',
    endpoints: {
      'POST /api/0g-compute': {
        description: 'Call a deployed model on 0G Compute Network',
        parameters: {
          input_text: 'string (required) - Text to send to the model',
          model: 'string (optional) - Specific model to use',
          max_tokens: 'number (optional) - Maximum tokens to generate (default: 150)',
          temperature: 'number (optional) - Temperature for generation (default: 0.7)',
        },
        example: {
          input_text: 'What is the capital of France?',
          max_tokens: 100,
          temperature: 0.5,
        },
      },
      'GET /api/0g-compute/services': {
        description: 'List all available AI services on 0G Compute Network',
      },
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input_text, model, max_tokens, temperature } = body;

    if (!input_text) {
      return NextResponse.json(
        { error: 'input_text is required', success: false },
        { status: 400 }
      );
    }

    console.log(`🧠 0G Compute inference request: "${input_text.slice(0, 50)}..."`);

    const computeService = createZGComputeService();
    
    const result = await computeService.inference({
      input_text,
      model,
      max_tokens,
      temperature,
    });

    return NextResponse.json({
      success: true,
      input_text,
      output: result.output,
      model: result.model,
      provider: result.provider,
      verified: result.verified,
      usage: result.usage,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('❌ 0G Compute API error:', error);
    
    return NextResponse.json(
      {
        error: '0G Compute inference failed',
        details: error.message,
        success: false,
      },
      { status: 500 }
    );
  }
}
