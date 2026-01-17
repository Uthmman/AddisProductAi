'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, MessageSquareText } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from '@/components/ui/skeleton';

interface LogEntry {
  timestamp: string;
  received_message: any;
}

export default function BotPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const response = await fetch('/api/logs');
                if (response.ok) {
                    const data = await response.json();
                    setLogs(data);
                }
            } catch (error) {
                console.error("Failed to fetch logs:", error);
            } finally {
                // Only set loading to false on the first fetch
                if(isLoading) setIsLoading(false);
            }
        };

        fetchLogs(); // Initial fetch
        const intervalId = setInterval(fetchLogs, 3000); // Poll every 3 seconds

        return () => clearInterval(intervalId); // Cleanup on unmount
    }, [isLoading]);

    return (
        <div className="container mx-auto py-10 max-w-4xl">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bot className="h-6 w-6" /> Telegram Bot Log
                    </CardTitle>
                    <CardDescription>
                        This page displays incoming messages received by the Telegram webhook, updated every 3 seconds. Send a message to your bot to see if it appears here.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-4 pt-4">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    ) : logs.length > 0 ? (
                         <Accordion type="single" collapsible className="w-full">
                            {logs.map((log, index) => (
                                <AccordionItem value={`item-${index}`} key={log.timestamp}>
                                    <AccordionTrigger>
                                        <div className="flex items-center gap-3 text-left">
                                            <MessageSquareText className="h-4 w-4 flex-shrink-0" />
                                            <span className="font-mono text-sm text-muted-foreground">
                                                {new Date(log.timestamp).toLocaleString()}
                                            </span>
                                            <span className="font-semibold truncate">
                                                {log.received_message?.message?.text || 'Non-text event'}
                                            </span>
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
                            <p className="text-sm">Send a message to your bot in Telegram. This page will auto-refresh.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
