'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, Paperclip, User, Bot } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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

  const sendBackendRequest = async (text?: string, imageId?: number, imageSrc?: string) => {
    if (!chatId) return;
    
    if(text) {
        const userMessage: Message = { role: 'user', type: 'text', content: text };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
    }
    
    setIsLoading(true);

    try {
      const response = await fetch('/api/telegram/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, newMessage: text, imageId, imageSrc }),
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
      // Add user message back to input if it fails
      if(text) setInput(text);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Get initial welcome message from the bot
    if (chatId && messages.length === 0) {
        sendBackendRequest();
    }
  }, [chatId]);

 useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('div');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);


  const handleSendMessage = async () => {
    if (!input || isLoading) return;
    await sendBackendRequest(input);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    toast({ description: "Uploading image..." });
    
    // Add visual placeholder for the user
    const tempImageSrc = await fileToBase64(file);
    const imageMessage: Message = { role: 'user', type: 'image', content: tempImageSrc };
    setMessages(prev => [...prev, imageMessage]);


    try {
      const image_data = tempImageSrc;
      const image_name = file.name;
      
      const uploadResponse = await fetch('/api/products/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_data, image_name }),
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.message || 'Image upload failed.');
      }
      
      const uploadedImage = await uploadResponse.json();
      
      toast({ title: "Success!", description: "Image uploaded." });
      
      // Now send the info to the bot flow
      await sendBackendRequest(undefined, uploadedImage.id, uploadedImage.src);

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: error.message,
      });
      // remove the placeholder on failure
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
      // Clear file input
      if(fileInputRef.current) fileInputRef.current.value = '';
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
                                    ? (msg.type === 'image' ? 'p-1 bg-transparent' : 'bg-primary text-primary-foreground')
                                    : 'bg-muted'
                                }`}
                            >
                                {msg.type === 'text' ? (
                                    <div dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                                ) : (
                                    <Image src={msg.content} alt="Uploaded image" width={200} height={200} className="rounded-md" />
                                )}
                            </div>
                            {msg.role === 'user' && msg.type === 'text' && (
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback><User size={18} /></AvatarFallback>
                                </Avatar>
                            )}
                        </div>
                    ))}
                    {isLoading && (
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
                    placeholder="Type product details..."
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    disabled={isLoading}
                />
                <Button onClick={handleSendMessage} disabled={isLoading || !input}>
                    <Send className="h-4 w-4" />
                </Button>
            </div>
        </CardContent>
       </Card>
    </div>
  );
}
