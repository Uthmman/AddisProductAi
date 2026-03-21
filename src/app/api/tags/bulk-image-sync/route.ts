import { NextRequest, NextResponse } from 'next/server';
import { bulkImageSyncFlow } from '@/ai/flows/bulk-image-sync-flow';

export const maxDuration = 300; // Allow 5 minutes for large tag libraries

export async function POST(request: NextRequest) {
  try {
    const result = await bulkImageSyncFlow();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Bulk Image Sync failed:', error);
    return NextResponse.json({ message: 'An unexpected error occurred during bulk image synchronization.' }, { status: 500 });
  }
}
