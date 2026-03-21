
import { NextRequest, NextResponse } from 'next/server';
import { syncTagImagesFlow } from '@/ai/flows/sync-tag-images-flow';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const tagId = parseInt(params.id, 10);
        if (isNaN(tagId)) {
            return NextResponse.json({ message: 'Invalid tag ID' }, { status: 400 });
        }

        const result = await syncTagImagesFlow(tagId);
        
        if (!result.success) {
            return NextResponse.json({ message: result.message }, { status: 404 });
        }

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('Individual Tag Image Sync failed:', error);
        return NextResponse.json({ message: error.message || 'An unexpected error occurred during synchronization.' }, { status: 500 });
    }
}
