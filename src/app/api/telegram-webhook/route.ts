'use server';

import { NextRequest, NextResponse } from 'next/server';
import { config } from 'dotenv';

// Explicitly load environment variables
config();

async function sendTelegramMessage(chatId: number, text: string) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        console.error("TELEGRAM_BOT_TOKEN is not defined.");
        return;
    }
    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.json();
            // Log the actual error from Telegram for debugging
            console.error('Telegram API Error:', errorBody.description || JSON.stringify(errorBody));
        }
    } catch (error: any) {
        console.error('Failed to send Telegram message:', error.message);
    }
}


export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const chatId = body.message?.chat?.id;
        const text = body.message?.text;

        if (chatId && text) {
            // Echo the received message back to the user.
            // We await this to ensure it completes. This is a quick operation.
            await sendTelegramMessage(chatId, `You said: ${text}`);
        }

        // Return a success response to Telegram.
        return NextResponse.json({ status: 'ok' });

    } catch (error: any) {
        console.error('!!! TELEGRAM WEBHOOK MAIN ERROR !!!:', error);
        // If the initial request parsing fails, return a 200 to prevent Telegram from retrying.
        return new NextResponse('Error', { status: 200 });
    }
}
