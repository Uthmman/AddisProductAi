'use server';

import { NextRequest, NextResponse } from 'next/server';
import { config } from 'dotenv';
import { productBotFlow } from '@/ai/flows/product-bot-flow';

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

async function processMessage(body: any) {
    const chatId = body.message?.chat?.id;
    const text = body.message?.text;

    if (!chatId || !text) {
        console.log("Received a message without a chat ID or text. Ignoring.");
        return;
    }

    try {
        const botResponse = await productBotFlow({
            chatId: String(chatId),
            newMessage: text,
        });

        if (botResponse?.text) {
            await sendTelegramMessage(chatId, botResponse.text);
        }
    } catch (flowError: any) {
        console.error('Error in productBotFlow:', flowError);
        // Inform the user that an error occurred
        await sendTelegramMessage(chatId, "I'm sorry, I encountered an internal error and couldn't process your request.");
    }
}


export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Fire-and-forget the processing so we can respond to Telegram immediately.
        // Do NOT await this call.
        processMessage(body);

        // Immediately return a success response to Telegram to prevent timeouts.
        return NextResponse.json({ status: 'ok' });

    } catch (error: any) {
        console.error('!!! TELEGRAM WEBHOOK MAIN ERROR !!!:', error.message);
        // If the initial request parsing fails, return a 200 to prevent Telegram from retrying.
        return new NextResponse('Error', { status: 200 });
    }
}
