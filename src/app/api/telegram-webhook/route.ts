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
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text }),
        });
        if (!response.ok) {
            const errorBody = await response.json();
            console.error('Telegram API Error:', errorBody);
        }
    } catch (error) {
        console.error('Failed to send Telegram message:', error);
    }
}


export async function POST(request: NextRequest) {
    let chatId: number | undefined;
    try {
        const body = await request.json();
        
        console.log("--- TELEGRAM WEBHOOK RECEIVED ---");
        console.log(JSON.stringify(body, null, 2));
        console.log("---------------------------------");
        
        chatId = body.message?.chat?.id;
        const text = body.message?.text;

        if (!chatId || !text) {
             console.log("Webhook received a message without a chat ID or text.");
             // Respond to Telegram immediately with a 200 OK so it doesn't retry.
             return NextResponse.json({ status: 'ok' });
        }

        // Immediately respond to Telegram to prevent timeouts
        NextResponse.json({ status: 'ok' });

        // Process the message with the AI flow
        const response = await productBotFlow({
            chatId: String(chatId),
            newMessage: text,
        });

        // Send the AI's response back to the user
        await sendTelegramMessage(chatId, response.text);

        return new NextResponse(null, { status: 204 });

    } catch (error: any) {
        console.error('!!! TELEGRAM WEBHOOK ERROR !!!:', error);
        
        // If something goes wrong, try to notify the user.
        if (chatId) {
             await sendTelegramMessage(chatId, "I'm sorry, I encountered an internal error and couldn't process your request.");
        }
        
        // Return a success status to prevent Telegram from retrying.
        return NextResponse.json({ status: 'error', message: error.message || 'Internal server error' }, { status: 200 });
    }
}
