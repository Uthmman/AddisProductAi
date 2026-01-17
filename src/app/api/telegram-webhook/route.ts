import { NextRequest, NextResponse } from 'next/server';
import { appCache } from '@/lib/cache';
import { processTelegramUpdate } from '@/lib/telegram-api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Log the incoming message for debugging
    const logs = appCache.get<any[]>('telegram_logs') || [];
    logs.unshift({
      timestamp: new Date().toISOString(),
      received_message: body,
    });
    appCache.set('telegram_logs', logs.slice(0, 50));

    // Process the update in the background without blocking the response.
    // This immediately sends a 200 OK back to Telegram.
    processTelegramUpdate(body).catch(err => {
        console.error("Background processing failed:", err);
    });

  } catch (error) {
    // Log any parsing errors to the server console
    console.error('!!! TELEGRAM WEBHOOK ERROR !!!:', error);
  } finally {
    // ALWAYS respond to Telegram immediately to prevent timeouts and retries
    return NextResponse.json({ status: 'ok' });
  }
}
