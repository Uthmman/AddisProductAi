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
        await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
            }),
        });
    } catch (error) {
        console.error("Failed to send message to Telegram:", error);
    }
}


export async function POST(request: NextRequest) {
    if (!TELEGRAM_BOT_TOKEN) {
        return NextResponse.json({ message: "Telegram bot not configured on the server." }, { status: 500 });
    }
    
    try {
        const body = await request.json();

        // Extract message from Telegram update
        const message = body.message || body.edited_message;
        if (!message || !message.text) {
            return NextResponse.json({ status: 'ok' }); // Not a message we can handle
        }

        const chatId = message.chat.id;
        const userMessage = message.text;
        
        if (userMessage === '/start') {
            await sendTelegramMessage(chatId, "Welcome! I can help you create products. What's the name and price?");
            return NextResponse.json({ status: 'ok' });
        }
        
        // Call the Genkit flow with the chatId and message
        const botResponse = await productBotFlow({
            chatId: String(chatId),
            newMessage: userMessage,
        });

        // Send the bot's response back to the user
        await sendTelegramMessage(chatId, botResponse.text);

        return NextResponse.json({ status: 'ok' });

    } catch (error: any) {
        console.error('Telegram webhook error:', error);
        
        // Attempt to notify the user of an error if possible
        try {
            const body = await request.json();
            const chatId = body.message?.chat?.id;
            if (chatId) {
                await sendTelegramMessage(chatId, "I'm sorry, I encountered an internal error and couldn't process your request.");
            }
        } catch (e) {
            // Ignore if we can't even parse the body to get a chat ID
        }

        return NextResponse.json({ message: "An internal error occurred." }, { status: 500 });
    }
}
