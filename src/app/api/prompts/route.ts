import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getPrompts, PROMPTS_CACHE_KEY } from '@/lib/prompts-api';
import { appCache } from '@/lib/cache';

const promptsFilePath = path.join(process.cwd(), 'src', 'lib', 'prompts.json');

export async function GET() {
  try {
    const prompts = await getPrompts();
    return NextResponse.json(prompts);
  } catch (error: any) {
    console.error('Failed to read prompts file:', error);
    return NextResponse.json({ message: 'Could not read prompts file.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const newPrompts = await request.json();
    
    if (!newPrompts || typeof newPrompts !== 'object') {
      return NextResponse.json({ message: 'Invalid prompts format' }, { status: 400 });
    }

    await fs.writeFile(promptsFilePath, JSON.stringify(newPrompts, null, 2), 'utf8');
    
    // Invalidate the cache
    appCache.del(PROMPTS_CACHE_KEY);
    
    return NextResponse.json({ message: 'Prompts saved successfully' });
  } catch (error) {
    console.error('Failed to save prompts file:', error);
    return NextResponse.json({ message: 'Failed to save prompts' }, { status: 500 });
  }
}
