import { NextRequest, NextResponse } from 'next/server';
import { appCache } from '@/lib/cache';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Get existing logs or start a new array
    const logs = appCache.get<any[]>('telegram_logs') || [];
    
    // Add new log entry with a timestamp, putting the newest first
    logs.unshift({
      timestamp: new Date().toISOString(),
      received_message: body,
    });

    // Store the updated logs back in the cache, keeping only the last 50
    appCache.set('telegram_logs', logs.slice(0, 50));

  } catch (error) {
    // Log any errors to the server console
    console.error('!!! TELEGRAM WEBHOOK ERROR !!!:', error);
  } finally {
    // ALWAYS respond to Telegram immediately to prevent timeouts and retries
    return NextResponse.json({ status: 'ok' });
  }
}
