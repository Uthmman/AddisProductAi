import { config } from 'dotenv';
config(); // Load environment variables from .env.local

import { NextRequest, NextResponse } from 'next/server';
import { productBotFlow } from '@/ai/flows/product-bot-flow';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TELEGRAM_BOT_TOKEN) {
    console.warn("TELEGRAM_BOT_TOKEN is not set. The Telegram webhook will not work.");
}

async function sendTelegramMessage(chatId: number, text: string) {
    if (!TELEGRAM_BOT_TOKEN) {
        console.error("Cannot send message: TELEGRAM_BOT_TOKEN is not configured.");
        return;
    }
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
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
            console.error("Telegram API Error:", await response.json());
        }
    } catch (error) {
        console.error("Failed to send message to Telegram:", error);
    }
}


export async function POST(request: NextRequest) {
    if (!TELEGRAM_BOT_TOKEN) {
        return NextResponse.json({ message: "Telegram bot not configured on the server." }, { status: 500 });
    }
    
    let chatId: number | undefined;

    try {
        const body = await request.json();

        const message = body.message || body.edited_message;
        if (!message || !message.text) {
            return NextResponse.json({ status: 'ok' }); 
        }

        chatId = message.chat.id;

        // Immediately send a test message to isolate the issue.
        await sendTelegramMessage(chatId, "This is a test message.");
        return NextResponse.json({ status: 'ok' });


        // The rest of the logic is temporarily bypassed for this test.
        /*
        const userMessage = message.text;

        if (userMessage === '/start') {
            await sendTelegramMessage(chatId, "Welcome! I can help you create products. What's the name and price?");
            return NextResponse.json({ status: 'ok' });
        }
        
        const botResponse = await productBotFlow({
            chatId: String(chatId),
            newMessage: userMessage,
        });

        await sendTelegramMessage(chatId, botResponse.text);

        return NextResponse.json({ status: 'ok' });
        */

    } catch (error: any) {
        console.error('Telegram webhook error:', error);
        
        if (chatId) {
            await sendTelegramMessage(chatId, `I'm sorry, I encountered an internal error and couldn't process your request.`);
        }

        return NextResponse.json({ message: "An internal error occurred." }, { status: 500 });
    }
}
