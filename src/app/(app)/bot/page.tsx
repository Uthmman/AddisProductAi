'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, MessageSquareText } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"


async function getLogs() {
    const logFilePath = path.join(process.cwd(), 'src', 'lib', 'telegram-log.json');
    try {
        const fileContent = await fs.readFile(logFilePath, 'utf8');
        const logs = JSON.parse(fileContent);
        // Ensure we always have an array, and reverse it to show newest first
        return Array.isArray(logs) ? logs.reverse() : [];
    } catch (error) {
        // If the file doesn't exist or is invalid JSON, return an empty array
        return [];
    }
}


export default async function BotPage() {
    const logs = await getLogs();

    return (
        <div className="container mx-auto py-10 max-w-4xl">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bot className="h-6 w-6" /> Telegram Bot Log
                    </CardTitle>
                    <CardDescription>
                        This page displays incoming messages received by the Telegram webhook. Send a message to your bot to see if it appears here. The log updates on page refresh.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {logs.length > 0 ? (
                         <Accordion type="single" collapsible className="w-full">
                            {logs.map((log, index) => (
                                <AccordionItem value={`item-${index}`} key={index}>
                                    <AccordionTrigger>
                                        <div className="flex items-center gap-3">
                                            <MessageSquareText className="h-4 w-4" />
                                            <span className="font-mono text-sm text-muted-foreground">
                                                {new Date(log.timestamp).toLocaleString()}
                                            </span>
                                            <span className="font-semibold">{log.received_message?.message?.text || 'Non-text event'}</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <pre className="p-4 bg-muted rounded-md text-xs overflow-x-auto">
                                            {JSON.stringify(log.received_message, null, 2)}
                                        </pre>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    ) : (
                        <div className="text-center text-muted-foreground py-12">
                            <p>No messages received yet.</p>
                            <p className="text-sm">Send a message to your bot in Telegram and refresh this page.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
