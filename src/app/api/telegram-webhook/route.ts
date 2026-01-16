'use server';

import { config } from 'dotenv';
config();

import { NextRequest, NextResponse } from 'next/server';
// import { productBotFlow } from '@/ai/flows/product-bot-flow'; // Temporarily disabled for testing

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendTelegramMessage(chatId: number, text: string) {
    if (!TELEGRAM_BOT_TOKEN) {
        console.error("TELEGRAM_BOT_TOKEN is not configured.");
        return;
    }
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
        const telegramResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text }),
        });

        if (!telegramResponse.ok) {
            const errorData = await telegramResponse.json();
            console.error('Telegram API Error:', telegramResponse.status, errorData.description);
        }
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
             return NextResponse.json({ status: 'ok, no action' });
        }

        // ECHO TEST: Send the user's own message back to them.
        const echoText = `You said: "${text}"`;
        await sendTelegramMessage(chatId, echoText);
        
        // Always return OK to Telegram.
        return NextResponse.json({ status: 'ok' });

    } catch (error: any) {
        console.error('!!! TELEGRAM WEBHOOK MAIN ERROR !!!:', error);
        // It's crucial to still send a 200 OK response to Telegram to prevent it from retrying.
        return new NextResponse('Error', { status: 200 });
    }
}
