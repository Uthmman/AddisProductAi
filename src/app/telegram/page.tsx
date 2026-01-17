'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, Paperclip, User, Bot } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { fileToBase64 } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

declare global {
  interface Window {
    Telegram: any;
  }
}

interface Message {
  role: 'user' | 'model';
  type: 'text' | 'image';
  content: string;
}

export default function TelegramMiniAppPage() {
  const { toast } = useToast();
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingImageId, setPendingImageId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.ready();
        const user = window.Telegram.WebApp.initDataUnsafe?.user;
        if (user && user.id) {
          setChatId(String(user.id));
        } else {
           // Fallback for development outside Telegram
           setChatId('dev_user_123');
        }
      } else {
        setChatId('dev_user_123');
      }
    } catch (error) {
       console.error("Failed to initialize Telegram WebApp:", error);
       setChatId('dev_user_123');
    }
  }, []);

  useEffect(() => {
    // Get initial welcome message from the bot
    if (chatId && messages.length === 0) {
        setIsLoading(true);
        fetch('/api/telegram/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId, newMessage: '' }),
        })
        .then(async (res) => {
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.text || 'Could not connect to the bot.');
            }
            return data;
        })
        .then(data => {
            setMessages([{ role: 'model', type: 'text', content: data.text }]);
        })
        .catch(err => {
            toast({ variant: 'destructive', title: 'Connection Error', description: err.message });
        })
        .finally(() => setIsLoading(false));
    }
  }, [chatId, messages.length, toast]);

 useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('div');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);


  const handleSendMessage = async (messageText = input) => {
    if ((!messageText && !pendingImageId) || isLoading || !chatId) return;

    const userMessage: Message = { role: 'user', type: 'text', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/telegram/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, newMessage: messageText, imageId: pendingImageId }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.text || 'Failed to get response from bot.');
      }

      const botMessage: Message = { role: 'model', type: 'text', content: data.text };
      setMessages(prev => [...prev, botMessage]);

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Could not communicate with the bot.',
      });
    } finally {
      setIsLoading(false);
      setPendingImageId(null); // Clear pending image after sending
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    toast({ description: "Uploading image..." });

    try {
      const image_data = await fileToBase64(file);
      const image_name = file.name;
      
      const uploadResponse = await fetch('/api/products/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_data, image_name }),
      });

      if (!uploadResponse.ok) throw new Error('Image upload failed.');
      
      const uploadedImage = await uploadResponse.json();
      
      setPendingImageId(uploadedImage.id);
      const imageMessage: Message = { role: 'user', type: 'image', content: uploadedImage.src };
      setMessages(prev => [...prev, imageMessage]);

      toast({ title: "Success!", description: "Image uploaded. You can now add name and price." });

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl py-4 h-screen flex flex-col">
       <Card className="flex-1 flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot /> Product Creation Bot
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
            <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
                 <div className="space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                            {msg.role === 'model' && (
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback><Bot size={18} /></AvatarFallback>
                                </Avatar>
                            )}
                            <div
                                className={`max-w-xs md:max-w-md rounded-lg p-3 text-sm whitespace-pre-wrap ${
                                msg.role === 'user'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                }`}
                            >
                                {msg.type === 'text' ? (
                                    msg.content
                                ) : (
                                    <Image src={msg.content} alt="Uploaded image" width={200} height={200} className="rounded-md" />
                                )}
                            </div>
                            {msg.role === 'user' && (
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback><User size={18} /></AvatarFallback>
                                </Avatar>
                            )}
                        </div>
                    ))}
                    {isLoading && messages[messages.length-1]?.role === 'user' && (
                         <div className="flex items-end gap-2">
                            <Avatar className="h-8 w-8">
                                <AvatarFallback><Bot size={18} /></AvatarFallback>
                            </Avatar>
                            <div className="max-w-xs md:max-w-md rounded-lg p-3 bg-muted flex items-center">
                                <Loader2 className="h-5 w-5 animate-spin" />
                            </div>
                        </div>
                    )}
                 </div>
            </ScrollArea>
            <div className="mt-auto pt-4 flex items-center gap-2">
                <Input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    className="hidden"
                />
                <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                    <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type name and price..."
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    disabled={isLoading}
                />
                <Button onClick={() => handleSendMessage()} disabled={isLoading || (!input && !pendingImageId)}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
            </div>
        </CardContent>
       </Card>
    </div>
  );
}
