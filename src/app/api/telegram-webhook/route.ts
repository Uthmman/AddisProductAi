import { config } from 'dotenv';
config();

import { NextRequest, NextResponse } from 'next/server';
import { productBotFlow } from '@/ai/flows/product-bot-flow';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendTelegramMessage(chatId: number, text: string) {
    if (!TELEGRAM_BOT_TOKEN) {
        console.error("TELEGRAM_BOT_TOKEN is not configured.");
        return;
    }
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text }),
        });
    } catch (error) {
        console.error('Failed to send Telegram message:', error);
    }
}


export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        const chatId = body.message?.chat?.id;
        const text = body.message?.text;

        if (!chatId || !text) {
             // Respond to Telegram immediately with a 200 OK so it doesn't retry.
             return NextResponse.json({ status: 'ok' });
        }

        // Immediately respond to Telegram to prevent timeouts and retries
        // The actual processing will continue after this response is sent.
        setTimeout(async () => {
            try {
                const response = await productBotFlow({
                    chatId: String(chatId),
                    newMessage: text,
                });
                await sendTelegramMessage(chatId, response.text);
            } catch (flowError) {
                console.error('Error in productBotFlow or sending message:', flowError);
                await sendTelegramMessage(chatId, "I'm sorry, I encountered an internal error.");
            }
        }, 0);
        
        // Return a success status to Telegram right away.
        return NextResponse.json({ status: 'processing' });

    } catch (error: any) {
        console.error('!!! TELEGRAM WEBHOOK MAIN ERROR !!!:', error);
        // If the initial request parsing fails, we can't do much,
        // but we still tell Telegram everything is ok to prevent retries.
        return NextResponse.json({ status: 'error', message: error.message || 'Internal server error' }, { status: 200 });
    }
}
