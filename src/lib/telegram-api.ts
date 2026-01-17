import { productBotFlow } from '@/ai/flows/product-bot-flow';
import { uploadImage } from '@/lib/woocommerce-api';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Function to send a message back to the user
export async function sendMessage(chatId: number | string, text: string) {
    if (!BOT_TOKEN) {
        console.error("TELEGRAM_BOT_TOKEN is not configured. The bot cannot send replies.");
        return;
    }

    try {
        const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
            }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            console.error("Telegram API Error sending message:", errorData);
        }
    } catch (error) {
        console.error("Failed to send message via Telegram:", error);
    }
}


// Function to get file details from Telegram
async function getFile(fileId: string): Promise<any> {
    const response = await fetch(`${TELEGRAM_API_URL}/getFile?file_id=${fileId}`);
    if (!response.ok) throw new Error("Failed to get file info from Telegram.");
    return response.json();
}

// Function to download a file from Telegram and convert to a data URI
async function downloadFile(filePath: string): Promise<string> {
    const response = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`);
    if (!response.ok) throw new Error("Failed to download file from Telegram.");
    const buffer = Buffer.from(await response.arrayBuffer());
    const mimeType = response.headers.get('content-type') || 'image/jpeg';
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

// Main processing function for incoming Telegram updates
export async function processTelegramUpdate(update: any) {
    const message = update.message;
    if (!message) {
        console.log("Received an update without a message body.", update);
        return;
    };

    const chatId = message.chat.id;
    const text = message.text;
    const photos = message.photo;

    let uploadedImageInfo: Array<{ id: number; src: string }> | undefined = undefined;

    // 1. Handle Photo Uploads
    if (photos && photos.length > 0) {
        try {
            // Acknowledge receipt
            await sendMessage(chatId, "Processing your photo...");

            // Get the highest resolution photo
            const photo = photos[photos.length - 1];
            const fileId = photo.file_id;

            // Use Telegram API to get file path
            const fileInfo = await getFile(fileId);
            if (!fileInfo.ok) throw new Error(fileInfo.description || "Could not get file info.");

            // Download the file and convert to data URI
            const dataUri = await downloadFile(fileInfo.result.file_path);

            // Upload to WooCommerce
            const imageName = `telegram_upload_${chatId}_${Date.now()}.jpg`;
            const wooImage = await uploadImage(imageName, dataUri);

            uploadedImageInfo = [{ id: wooImage.id, src: wooImage.src }];
        } catch (error: any) {
            console.error("Error processing Telegram photo:", error);
            await sendMessage(chatId, `I'm sorry, I had trouble with that image. Error: ${error.message}`);
            return;
        }
    }

    // 2. Call the Product Bot Flow
    try {
        const botResponse = await productBotFlow({
            chatId: String(chatId),
            newMessage: text,
            images: uploadedImageInfo,
        });

        // 3. Send the response back to the user
        if (botResponse && botResponse.text) {
            await sendMessage(chatId, botResponse.text);
        }

    } catch (error: any) {
        console.error("Error in productBotFlow:", error);
        await sendMessage(chatId, "I'm sorry, I encountered an internal error. Please try again.");
    }
}
