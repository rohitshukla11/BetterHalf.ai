import { NextResponse } from 'next/server';
import { createZGComputeService } from '@/lib/0g-compute';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('📋 Listing available AI services on 0G Compute Network...');

    const computeService = createZGComputeService();
    const services = await computeService.listServices();

    return NextResponse.json({
      success: true,
      count: services.length,
      services: services.map(service => ({
        provider: service.provider,
        name: service.name,
        model: service.model,
        serviceType: service.serviceType,
        url: service.url,
        inputPrice: service.inputPrice,
        outputPrice: service.outputPrice,
        updatedAt: new Date(service.updatedAt * 1000).toISOString(),
      })),
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('❌ Failed to list 0G Compute services:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to list 0G Compute services',
        details: error.message,
        success: false,
      },
      { status: 500 }
    );
  }
}
