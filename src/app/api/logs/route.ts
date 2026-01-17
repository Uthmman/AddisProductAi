import { NextRequest, NextResponse } from 'next/server';
import { appCache } from '@/lib/cache';

export const dynamic = 'force-dynamic'; // Ensure this route is not cached by Next.js

export async function GET(request: NextRequest) {
  try {
    const logs = appCache.get<any[]>('telegram_logs') || [];
    return NextResponse.json(logs);
  } catch (error) {
    console.error('Failed to fetch logs from cache:', error);
    return NextResponse.json({ message: 'Could not fetch logs.' }, { status: 500 });
  }
}
