import { NextRequest, NextResponse } from 'next/server';
import { getMemoryService } from '@/lib/memory-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const memoryService = getMemoryService();
    await memoryService.initialize();
    
    const memory = await memoryService.getMemory(params.id);
    
    if (!memory) {
      return NextResponse.json(
        { error: 'Memory not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(memory);
  } catch (error: any) {
    console.error('Failed to get memory:', error);
    return NextResponse.json(
      { error: 'Failed to get memory', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const memoryService = getMemoryService();
    await memoryService.initialize();
    
    const updatedMemory = await memoryService.updateMemory(params.id, body);
    
    return NextResponse.json(updatedMemory);
  } catch (error: any) {
    console.error('Failed to update memory:', error);
    return NextResponse.json(
      { error: 'Failed to update memory', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const memoryService = getMemoryService();
    await memoryService.initialize();
    
    const success = await memoryService.deleteMemory(params.id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Memory not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Memory deleted successfully',
      id: params.id
    });
  } catch (error: any) {
    console.error('Failed to delete memory:', error);
    return NextResponse.json(
      { error: 'Failed to delete memory', details: error.message },
      { status: 500 }
    );
  }
}
